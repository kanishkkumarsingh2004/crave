require('dotenv/config')

const { createServer } = require('http')
const { WebSocketServer } = require('ws')
const { v4: uuidv4 } = require('uuid')
const { TextEncoder } = require('util')

// ---------------------------------------------------------------------------
// Prisma client for ownership verification
// ws-server.js runs as plain Node.js (not Next.js), so we create a dedicated
// client here rather than reusing the Next.js singleton.
// Prisma 7+ requires a driver adapter — use @prisma/adapter-pg to match lib/prisma.ts
// ---------------------------------------------------------------------------
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    console.error('[ws-server] DATABASE_URL is not set — DB ownership checks will fail')
    return null
  }
  try {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    })
  } catch (e) {
    console.error('[ws-server] Failed to create Prisma client:', e.message)
    return null
  }
}

const prisma = createPrismaClient()

const WS_OPEN = 1
const PORT = process.env.WS_PORT || 8000
const INSTANCE_ID = `ws_inst_${process.pid}_${Math.random().toString(36).substring(2, 7)}`

const PING_INTERVAL_MS = 30000 // 30 seconds
const PONG_TIMEOUT_MS = 60000 // 60 seconds
const SLOW_CONSUMER_BUFFER_THRESHOLD = 1024 * 1024 // 1 MB (1048576 bytes)
const MAX_MESSAGE_SIZE = 64 * 1024 // 64 KB (65536 bytes)

// Server metrics tracking
const metrics = {
  activeConnections: 0,
  totalMessagesReceived: 0,
  totalMessagesSent: 0,
  totalBytesReceived: 0,
  totalBytesSent: 0,
  slowConsumerDisconnects: 0,
  droppedMessages: 0,
  gpsUpdatesCoalesced: 0,
  startTime: Date.now(),
}

const recordMetric = (name, val = 1) => {
  if (metrics[name] !== undefined) {
    metrics[name] += val
  }
}

// GPS Coalescing Buffer to avoid flooding clients with high-frequency driver coordinates
const GPS_COALESCE_INTERVAL_MS = 1000 // 1 second
const gpsCoalesceBuffer = new Map()

function coalesceGpsUpdate(driverId, lat, lng, orderId, now) {
  if (!driverId) return
  const existing = gpsCoalesceBuffer.get(driverId)
  if (existing) {
    existing.lat = lat
    existing.lng = lng
    existing.orderId = orderId
    existing.lastUpdated = now
    metrics.gpsUpdatesCoalesced++
    return
  }

  // Broadcast initial location immediately
  broadcast('driver_location', {
    driverId,
    orderId,
    lat,
    lng,
    ts: now,
  })

  // Buffer subsequent rapid updates within the coalesce window
  const timer = setTimeout(() => {
    const buffered = gpsCoalesceBuffer.get(driverId)
    if (buffered && (buffered.lat !== lat || buffered.lng !== lng)) {
      broadcast('driver_location', {
        driverId,
        orderId: buffered.orderId,
        lat: buffered.lat,
        lng: buffered.lng,
        ts: buffered.lastUpdated,
      })
    }
    gpsCoalesceBuffer.delete(driverId)
  }, GPS_COALESCE_INTERVAL_MS)

  gpsCoalesceBuffer.set(driverId, {
    driverId,
    orderId,
    lat,
    lng,
    lastUpdated: now,
    timer,
  })
}

// Primary Client Directory: ws -> client metadata
const connectedClients = new Map()

// High-Performance Inverted Index: channel -> Map<orderId, Set<ws>>
// For ownership channels (order_update, approval_update, driver_location), we track per-order subscriptions
// For non-ownership channels, orderId is 'global'
const channelSubscribers = new Map()

// Cross-instance subscription tracking: channel -> Set<instance_id>
const channelInstances = new Map()

// Message deduplication cache (prevents replay on reconnect)
const messageCache = new Map()
const MESSAGE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const MESSAGE_CACHE_MAX = 10000

/**
 * Broadcast an event to all locally connected clients subscribed to this channel.
 * For ownership channels (order_update, approval_update, driver_location),
 * filters by orderId so only authorized subscribers receive the event.
 */
const broadcastLocal = (channel, data, excludeSocket) => {
  const subscribers = channelSubscribers.get(channel)
  if (!subscribers || subscribers.size === 0) return

  // For ownership channels, filter by orderId
  const orderId = data?.orderId
  const isOwnershipChannel = ['order_update', 'approval_update', 'driver_location'].includes(
    channel
  )

  const payload = JSON.stringify({ channel, data, ts: Date.now() })

  if (isOwnershipChannel && orderId) {
    // Send only to subscribers of this specific order
    const orderSubscribers = subscribers.get(orderId)
    if (orderSubscribers) {
      orderSubscribers.forEach((ws) => {
        if (excludeSocket && ws === excludeSocket) return
        if (ws.readyState === WS_OPEN) {
          ws.send(payload)
        }
      })
    }
  } else {
    // Non-ownership channel or no orderId: send to all 'global' subscribers
    const globalSubscribers = subscribers.get('global')
    if (globalSubscribers) {
      globalSubscribers.forEach((ws) => {
        if (excludeSocket && ws === excludeSocket) return
        if (ws.readyState === WS_OPEN) {
          ws.send(payload)
        }
      })
    }
  }
}

// ----------------------------------------------------
// Redis Pub/Sub Cluster Integration (Multi-Pod Scaling)
// ----------------------------------------------------
let redisPub = null
let redisSub = null
// Dedicated client for JWT blacklist GET queries (separate from pub/sub clients).
let redisBlacklist = null
// CR-15: Dedicated client for driver-assignment Hash read/write.
let redisAssignments = null
const REDIS_URL = process.env.REDIS_URL
const REDIS_CHANNEL = 'crave:ws:events'
const SUBSCRIPTION_SYNC_CHANNEL = 'crave:ws:subscriptions'
// CR-15: Channel for cross-instance driver assignment synchronisation.
const DRIVER_ASSIGNMENT_CHANNEL = 'crave:ws:driver_assignments'
// CR-15: Redis Hash key — field = driverId, value = JSON-encoded Set (array) of orderIds.
const DRIVER_ASSIGNMENT_HASH = 'crave:ws:driver_assignment_map'

if (REDIS_URL && process.env.REDIS_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
  try {
    const Redis = require('ioredis')
    let warnLogged = false

    const redisOptions = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => {
        if (times > 3) return null // Stop retrying after 3 attempts
        return Math.min(times * 200, 2000)
      },
      lazyConnect: false,
    }

    redisPub = new Redis(REDIS_URL, redisOptions)
    redisSub = new Redis(REDIS_URL, redisOptions)
    redisBlacklist = new Redis(REDIS_URL, redisOptions)
    // CR-15: Separate client for driver-assignment Hash ops (no interference with pub/sub).
    redisAssignments = new Redis(REDIS_URL, redisOptions)

    const handleRedisError = (type, err) => {
      if (!warnLogged) {
        warnLogged = true
        console.log(
          `ℹ️ [ws-server] Local Redis not detected (${err.code || err.message}). Operating in fast in-memory WebSocket mode.`
        )
      }
    }

    redisPub.on('error', (err) => handleRedisError('Publisher', err))
    redisSub.on('error', (err) => handleRedisError('Subscriber', err))
    redisAssignments.on('error', (err) => handleRedisError('Assignments', err))

    // CR-15: When the assignments client reconnects, replay the Hash so the local
    // map is consistent with shared state again.
    redisAssignments.on('ready', async () => {
      try {
        const hash = await redisAssignments.hgetall(DRIVER_ASSIGNMENT_HASH)
        if (hash) {
          for (const [driverId, raw] of Object.entries(hash)) {
            try {
              const orderIds = JSON.parse(raw)
              if (Array.isArray(orderIds) && orderIds.length > 0) {
                driverOrderAssignments.set(driverId, new Set(orderIds))
              } else {
                driverOrderAssignments.delete(driverId)
              }
            } catch (_) {
              // Corrupt entry — ignore and let the next write fix it.
            }
          }
          console.log(
            `[ws-server] Replayed ${Object.keys(hash).length} driver assignment(s) from Redis.`
          )
        }
      } catch (err) {
        console.warn('[ws-server] Could not replay driver assignments from Redis:', err.message)
      }
    })

    redisSub.subscribe(REDIS_CHANNEL, (err) => {
      if (!err) {
        console.log(`🔌 [ws-server] Subscribed to Redis channel: ${REDIS_CHANNEL}`)
      }
    })

    redisSub.subscribe(SUBSCRIPTION_SYNC_CHANNEL, (err) => {
      if (!err) {
        console.log(
          `🔌 [ws-server] Subscribed to subscription sync channel: ${SUBSCRIPTION_SYNC_CHANNEL}`
        )
      }
    })

    // CR-15: Subscribe to cross-instance driver assignment events.
    redisSub.subscribe(DRIVER_ASSIGNMENT_CHANNEL, (err) => {
      if (!err) {
        console.log(
          `🔌 [ws-server] Subscribed to driver assignment channel: ${DRIVER_ASSIGNMENT_CHANNEL}`
        )
      }
    })

    redisSub.on('message', (_ch, message) => {
      try {
        const parsed = JSON.parse(message)

        if (_ch === REDIS_CHANNEL) {
          // Cross-instance broadcast message
          if (parsed.origin !== INSTANCE_ID && parsed.channel) {
            // Deduplicate using message ID
            if (parsed.msgId && messageCache.has(parsed.msgId)) {
              return // Already processed
            }
            if (parsed.msgId) {
              messageCache.set(parsed.msgId, Date.now())
              // Cleanup old cache entries
              if (messageCache.size > MESSAGE_CACHE_MAX) {
                const cutoff = Date.now() - MESSAGE_CACHE_TTL_MS
                for (const [id, ts] of messageCache.entries()) {
                  if (ts < cutoff) messageCache.delete(id)
                }
              }
            }
            broadcastLocal(parsed.channel, parsed.data)
          }
        } else if (_ch === SUBSCRIPTION_SYNC_CHANNEL) {
          // Subscription state sync
          if (parsed.origin !== INSTANCE_ID && parsed.channel && parsed.instanceId) {
            // Another instance subscribed/unsubscribed to a channel
            if (!channelInstances.has(parsed.channel)) {
              channelInstances.set(parsed.channel, new Set())
            }
            if (parsed.action === 'subscribe') {
              channelInstances.get(parsed.channel).add(parsed.instanceId)
            } else if (parsed.action === 'unsubscribe') {
              channelInstances.get(parsed.channel).delete(parsed.instanceId)
              if (channelInstances.get(parsed.channel).size === 0) {
                channelInstances.delete(parsed.channel)
              }
            }
          }
        } else if (_ch === DRIVER_ASSIGNMENT_CHANNEL) {
          // CR-15: Apply driver assignment / removal events from other instances.
          if (parsed.origin !== INSTANCE_ID && parsed.driverId) {
            if (parsed.action === 'assign' && parsed.orderId) {
              if (!driverOrderAssignments.has(parsed.driverId)) {
                driverOrderAssignments.set(parsed.driverId, new Set())
              }
              driverOrderAssignments.get(parsed.driverId).add(parsed.orderId)
            } else if (parsed.action === 'remove' && parsed.orderId) {
              const orders = driverOrderAssignments.get(parsed.driverId)
              if (orders) {
                orders.delete(parsed.orderId)
                if (orders.size === 0) driverOrderAssignments.delete(parsed.driverId)
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to parse Redis message:', err.message)
      }
    })
  } catch (err) {
    console.log('ℹ️ [ws-server] Redis initialization skipped:', err.message)
  }
}

/**
 * Universal broadcast: dispatches locally and replicates across Redis cluster.
 * Includes message ID for idempotency and deduplication.
 */
const broadcast = (channel, data, excludeSocket) => {
  // 1. Immediately notify local subscribers
  broadcastLocal(channel, data, excludeSocket)

  // 2. Publish to Redis so all other instances in the cluster broadcast to their clients
  if (redisPub && redisPub.status === 'ready') {
    const msgId = uuidv4()
    const clusterPayload = JSON.stringify({
      channel,
      data,
      origin: INSTANCE_ID,
      msgId,
      ts: Date.now(),
    })
    redisPub.publish(REDIS_CHANNEL, clusterPayload).catch(() => {})
  }
}

/**
 * Notify other instances about local subscription changes
 */
const syncSubscription = (channel, action) => {
  if (redisPub && redisPub.status === 'ready') {
    const payload = JSON.stringify({
      channel,
      action, // 'subscribe' or 'unsubscribe'
      instanceId: INSTANCE_ID,
      ts: Date.now(),
    })
    redisPub.publish(SUBSCRIPTION_SYNC_CHANNEL, payload).catch(() => {})
  }
}

const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET

if (!WS_INTERNAL_SECRET) {
  console.error('FATAL: WS_INTERNAL_SECRET environment variable is required')
  process.exit(1)
}

// JWT verification for WebSocket authentication using jose
const { jwtVerify } = require('jose')

async function verifyWSToken(token) {
  if (!token) return null
  const secret = process.env.JWT_SECRET
  if (!secret) return null
  try {
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
    })

    // Mirror the blacklist checks from lib/jwt.ts so that a server-side logout
    // also invalidates WebSocket connections.
    // CR-11 FIX: Match the HTTP token-verification policy exactly.
    //   - If Redis is configured AND ready: perform the blacklist check.
    //   - If Redis is configured BUT NOT ready (connecting / reconnecting / error):
    //     fail closed in production — we cannot confirm the token is not revoked.
    //   - If Redis is not configured at all: skip the check (no revocation store).
    if (redisBlacklist) {
      if (redisBlacklist.status !== 'ready') {
        // Redis is configured but unavailable.  We cannot verify revocation.
        // Fail closed in production to match lib/jwt.ts behaviour; allow in dev/test.
        if (process.env.NODE_ENV === 'production') {
          console.warn(
            '[ws-server] Redis blacklist unavailable (status: ' +
              redisBlacklist.status +
              ') — rejecting WS token in production (fail-closed)'
          )
          return null
        }
        // In development / test: log a warning but allow the connection so local
        // development without Redis is not broken.
        console.warn(
          '[ws-server] Redis blacklist unavailable (status: ' +
            redisBlacklist.status +
            ') — skipping revocation check in non-production environment'
        )
      } else {
        // Redis is ready — perform both per-token and per-user revocation checks.
        try {
          if (payload.jti) {
            const tokenRevoked = await redisBlacklist.get(`crave:jwt:blacklist:${payload.jti}`)
            if (tokenRevoked) return null
          }
          if (payload.id) {
            const userRevoked = await redisBlacklist.get(
              `crave:jwt:blacklist:user:${payload.id}`
            )
            if (userRevoked) return null
          }
        } catch (redisErr) {
          // Redis query failed mid-check — fail closed regardless of environment.
          console.warn(
            '[ws-server] Redis blacklist check failed, rejecting token:',
            redisErr.message
          )
          return null
        }
      }
    }

    return payload
  } catch {
    return null
  }
}

function extractTokenFromRequest(req) {
  // Check query parameter
  const url = new URL(req.url, `http://${req.headers.host}`)
  const queryToken = url.searchParams.get('token')
  if (queryToken) return queryToken

  // Check cookie
  const cookie = req.headers.cookie
  if (cookie) {
    const match = cookie.match(/crave_auth_token=([^;]+)/)
    if (match) return match[1]
    const match2 = cookie.match(/crave_token=([^;]+)/)
    if (match2) return match2[1]
  }
  return null
}

// Channel authorization rules
const CHANNEL_AUTH_RULES = {
  order_update: {
    roles: [
      'user',
      'customer',
      'restaurant_vendor',
      'cravexp_store_vendor',
      'vendor',
      'rider',
      'driver',
      'admin',
    ],
    requireOwnership: true,
  },
  admin_stats: { roles: ['admin'] },
  admin_orders: { roles: ['admin'] },
  admin_users: { roles: ['admin'] },
  approval_update: {
    roles: ['user', 'customer', 'restaurant_vendor', 'cravexp_store_vendor', 'vendor', 'admin'],
    requireOwnership: true,
  },
  driver_location: {
    roles: ['user', 'customer', 'rider', 'driver', 'admin'],
    requireOwnership: true,
  },
  control: {
    roles: [
      'user',
      'customer',
      'rider',
      'driver',
      'restaurant_vendor',
      'cravexp_store_vendor',
      'vendor',
      'admin',
    ],
  },
  map_live_analytics: { roles: ['admin'] },
}

// Track driver-order associations: driverId -> Set<orderId>
// Populated authoritatively from the /__ws/broadcast internal API (server-side only).
const driverOrderAssignments = new Map()

/**
 * Verify channel role eligibility (synchronous, no DB call).
 * Returns false immediately if the role is not permitted for this channel.
 */
function checkRoleForChannel(channel, clientInfo) {
  const rules = CHANNEL_AUTH_RULES[channel]
  if (!rules) return false
  return rules.roles.includes(clientInfo.role)
}

/**
 * Authorise an ownership-channel subscription by querying the database.
 *
 * - Admins: always permitted.
 * - Vendors: permitted for order_update / approval_update if the order belongs
 *   to their restaurant (restaurant_id match). Denied for driver_location.
 * - Customers: permitted only if Order.customer_id === clientInfo.userId.
 * - Drivers/riders: permitted only if Order.rider_id === clientInfo.userId.
 *
 * Fails CLOSED: any DB error or unexpected path returns false.
 *
 * @param {string} channel
 * @param {object} clientInfo
 * @param {string} orderId - client-supplied; treated as untrusted input.
 * @returns {Promise<boolean>}
 */
async function verifyOrderOwnership(channel, clientInfo, orderId) {
  if (!orderId || typeof orderId !== 'string' || orderId.trim() === '') return false

  // Admins may subscribe to any order on any ownership channel
  if (clientInfo.role === 'admin') return true

  // If Prisma client failed to initialise (no DATABASE_URL), fail closed
  if (!prisma) return false

  try {
    // Fetch only the ownership columns – never trust client-supplied identity
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        customer_id: true,
        rider_id: true,
        restaurant_id: true,
      },
    })

    if (!order) return false // Order does not exist

    if (channel === 'order_update' || channel === 'approval_update') {
      // Customer who placed the order
      if (
        (clientInfo.role === 'user' || clientInfo.role === 'customer') &&
        order.customer_id === clientInfo.userId
      ) {
        return true
      }

      // Driver/rider assigned to the order
      if (
        (clientInfo.role === 'rider' || clientInfo.role === 'driver') &&
        order.rider_id === clientInfo.userId
      ) {
        return true
      }

      // Vendor whose restaurant owns the order
      if (
        (clientInfo.role === 'restaurant_vendor' ||
          clientInfo.role === 'cravexp_store_vendor' ||
          clientInfo.role === 'vendor') &&
        clientInfo.restaurantId &&
        order.restaurant_id === clientInfo.restaurantId
      ) {
        return true
      }

      return false
    }

    if (channel === 'driver_location') {
      // Customers may only track an order they placed
      if (
        (clientInfo.role === 'user' || clientInfo.role === 'customer') &&
        order.customer_id === clientInfo.userId
      ) {
        return true
      }

      // Drivers may only track an order they are assigned to
      if (
        (clientInfo.role === 'rider' || clientInfo.role === 'driver') &&
        order.rider_id === clientInfo.userId
      ) {
        return true
      }

      return false
    }
  } catch (err) {
    console.error('[ws-server] DB ownership check failed, denying subscription:', err.message)
    return false // Fail closed
  }

  return false
}

/**
 * Full channel authorization (async).
 * For non-ownership channels: role check only.
 * For ownership channels: role check + DB ownership proof.
 *
 * @returns {Promise<boolean>}
 */
async function authorizeChannelAsync(channel, clientInfo, subscriptionData = {}) {
  if (!checkRoleForChannel(channel, clientInfo)) return false

  const rules = CHANNEL_AUTH_RULES[channel]
  if (!rules.requireOwnership) return true

  // All ownership channels require a DB-verified orderId
  const orderId = subscriptionData.orderId
  return verifyOrderOwnership(channel, clientInfo, orderId)
}

// Register driver-order assignment (called from internal broadcast API only)
// CR-15 FIX: Write-through to Redis Hash so all instances share the same state.
// Also publish an event on DRIVER_ASSIGNMENT_CHANNEL so peer instances update
// their local in-memory maps immediately without waiting for a Hash read.
function assignDriverToOrder(driverId, orderId) {
  if (!driverOrderAssignments.has(driverId)) {
    driverOrderAssignments.set(driverId, new Set())
  }
  driverOrderAssignments.get(driverId).add(orderId)

  // Persist to shared Redis Hash
  if (redisAssignments && redisAssignments.status === 'ready') {
    const orderIds = JSON.stringify([...driverOrderAssignments.get(driverId)])
    redisAssignments.hset(DRIVER_ASSIGNMENT_HASH, driverId, orderIds).catch((err) => {
      console.warn('[ws-server] Failed to persist driver assignment to Redis:', err.message)
    })
  }

  // Notify peer instances
  if (redisPub && redisPub.status === 'ready') {
    redisPub
      .publish(
        DRIVER_ASSIGNMENT_CHANNEL,
        JSON.stringify({ action: 'assign', driverId, orderId, origin: INSTANCE_ID })
      )
      .catch(() => {})
  }
}

// Remove driver-order assignment (on delivery complete)
// CR-15 FIX: Mirror removal to Redis Hash and notify peer instances.
function removeDriverFromOrder(driverId, orderId) {
  const assignedOrders = driverOrderAssignments.get(driverId)
  if (assignedOrders) {
    assignedOrders.delete(orderId)
    if (assignedOrders.size === 0) {
      driverOrderAssignments.delete(driverId)
      // Remove the Hash field entirely when the driver has no more assignments.
      if (redisAssignments && redisAssignments.status === 'ready') {
        redisAssignments.hdel(DRIVER_ASSIGNMENT_HASH, driverId).catch((err) => {
          console.warn('[ws-server] Failed to remove driver assignment from Redis:', err.message)
        })
      }
    } else {
      // Update the Hash with the remaining order set.
      if (redisAssignments && redisAssignments.status === 'ready') {
        const remaining = JSON.stringify([...assignedOrders])
        redisAssignments.hset(DRIVER_ASSIGNMENT_HASH, driverId, remaining).catch((err) => {
          console.warn('[ws-server] Failed to update driver assignment in Redis:', err.message)
        })
      }
    }
  }

  // Notify peer instances
  if (redisPub && redisPub.status === 'ready') {
    redisPub
      .publish(
        DRIVER_ASSIGNMENT_CHANNEL,
        JSON.stringify({ action: 'remove', driverId, orderId, origin: INSTANCE_ID })
      )
      .catch(() => {})
  }
}

const server = createServer((req, res) => {
  if (req.url && req.url.startsWith('/__ws/broadcast')) {
    if (req.method === 'POST') {
      const incomingSecret = req.headers['x-internal-secret']
      if (incomingSecret !== WS_INTERNAL_SECRET) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Forbidden' }))
        return
      }
      let body = ''
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > 64 * 1024) {
          // 64KB max payload
          res.writeHead(413, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Payload Too Large' }))
          req.destroy()
          return
        }
        body += chunk
      })
      req.on('end', () => {
        try {
          const msg = JSON.parse(body)

          // Strict channel allowlist
          const ALLOWED_CHANNELS = new Set([
            'order_update',
            'admin_stats',
            'admin_orders',
            'admin_users',
            'approval_update',
            'driver_location',
            'control',
            'map_live_analytics',
            '__internal_assign_driver',
            '__internal_remove_driver',
          ])

          // Internal channels for driver-order assignment management (require x-internal-secret)
          const INTERNAL_CHANNELS = new Set([
            '__internal_assign_driver',
            '__internal_remove_driver',
          ])

          if (!msg.channel || !ALLOWED_CHANNELS.has(msg.channel)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid or unauthorized channel' }))
            return
          }

          // Handle internal ownership management channels
          if (INTERNAL_CHANNELS.has(msg.channel)) {
            if (!msg.data || typeof msg.data !== 'object') {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Invalid internal payload' }))
              return
            }

            let result = false
            switch (msg.channel) {
              // __internal_register_order is intentionally removed:
              // customer ownership is now proven via DB lookup, not pre-registration.
              case '__internal_assign_driver':
                if (msg.data.driverId && msg.data.orderId) {
                  assignDriverToOrder(msg.data.driverId, msg.data.orderId)
                  result = true
                }
                break
              case '__internal_remove_driver':
                if (msg.data.driverId && msg.data.orderId) {
                  removeDriverFromOrder(msg.data.driverId, msg.data.orderId)
                  result = true
                }
                break
            }

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ success: result }))
            return
          }

          // Validate data schema per channel
          if (!validateBroadcastPayload(msg.channel, msg.data)) {
            res.writeHead(400, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Invalid payload schema for channel' }))
            return
          }

          broadcast(msg.channel, msg.data)
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ success: true }))
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Invalid JSON' }))
        }
      })
    } else {
      res.writeHead(405)
      res.end()
    }
    return
  }
  res.writeHead(404)
  res.end()
})

function validateBroadcastPayload(channel, data) {
  if (!data || typeof data !== 'object') return false

  switch (channel) {
    case 'order_update':
      return data.type && typeof data.type === 'string' && (data.order || data.orders)
    case 'admin_stats':
    case 'admin_orders':
    case 'admin_users':
      return data.type && typeof data.type === 'string'
    case 'approval_update':
      return data.status && typeof data.status === 'string' && data.orderId
    case 'driver_location':
      return typeof data.lat === 'number' && typeof data.lng === 'number' && data.driverId
    case 'map_live_analytics':
      return data.type && typeof data.type === 'string'
    case 'control':
      return data.type && typeof data.type === 'string'
    default:
      return false
  }
}

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', async (ws, req) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  // Authenticate the connection using JWT
  const token = extractTokenFromRequest(req)
  const payload = await verifyWSToken(token)

  let authenticatedRole = 'anonymous'
  let authenticatedUserId = null
  let authenticatedRestaurantId = null

  if (payload) {
    authenticatedUserId = payload.id
    authenticatedRole = payload.role
    authenticatedRestaurantId = payload.restaurantId || null
  }

  const clientInfo = {
    id: clientId,
    subscribed: new Set(),
    customerId:
      authenticatedRole === 'user' || authenticatedRole === 'customer' ? authenticatedUserId : null,
    driverId:
      authenticatedRole === 'rider' || authenticatedRole === 'driver' ? authenticatedUserId : null,
    role: authenticatedRole,
    userId: authenticatedUserId,
    restaurantId: authenticatedRestaurantId,
  }
  connectedClients.set(ws, clientInfo)
  metrics.activeConnections = connectedClients.size
  recordMetric('totalMessagesReceived') // Track connection as a message event

  ws.on('message', (raw) => {
    if (raw && raw.length > MAX_MESSAGE_SIZE) {
      ws.close(1009, 'Payload too large')
      return
    }
    recordMetric('totalBytesReceived', raw.length)
    recordMetric('totalMessagesReceived')
    try {
      const msg = JSON.parse(raw.toString())
      const info = connectedClients.get(ws)
      if (!info) return

      switch (msg.type) {
        case 'subscribe':
          if (Array.isArray(msg.channels)) {
            // Each ownership channel requires a DB round-trip; process sequentially
            // to avoid sending the subscribed ACK before all checks complete.
            ;(async () => {
              for (const ch of msg.channels) {
                const subscriptionData = {
                  orderId: msg.orderId, // untrusted – verified against DB in authorizeChannelAsync
                }

                let authorized = false
                try {
                  authorized = await authorizeChannelAsync(ch, info, subscriptionData)
                } catch (err) {
                  console.error(
                    '[ws-server] authorizeChannelAsync threw unexpectedly:',
                    err.message
                  )
                  authorized = false // fail closed
                }

                if (!authorized) {
                  ws.send(
                    JSON.stringify({
                      channel: 'control',
                      data: { type: 'error', message: `Unauthorized to subscribe to ${ch}` },
                      ts: Date.now(),
                    })
                  )
                  continue // deny this channel, try next
                }

                info.subscribed.add(ch)

                // Initialize channel map if needed
                if (!channelSubscribers.has(ch)) {
                  channelSubscribers.set(ch, new Map())
                }
                const channelMap = channelSubscribers.get(ch)

                // For ownership channels, track per-order; otherwise use 'global'
                const isOwnershipChannel = [
                  'order_update',
                  'approval_update',
                  'driver_location',
                ].includes(ch)
                const orderKey =
                  isOwnershipChannel && subscriptionData.orderId
                    ? subscriptionData.orderId
                    : 'global'

                if (!channelMap.has(orderKey)) {
                  channelMap.set(orderKey, new Set())
                }
                channelMap.get(orderKey).add(ws)

                // Sync subscription state across instances
                syncSubscription(ch, 'subscribe')
              }

              // ACK after all channels have been processed
              if (ws.readyState === WS_OPEN) {
                ws.send(
                  JSON.stringify({
                    channel: 'control',
                    data: { type: 'subscribed', clientId },
                    ts: Date.now(),
                  })
                )
              }
            })()
          }
          break

        case 'unsubscribe':
          if (Array.isArray(msg.channels)) {
            msg.channels.forEach((ch) => {
              info.subscribed.delete(ch)
              const channelMap = channelSubscribers.get(ch)
              if (channelMap) {
                // Remove from all order keys for this channel
                channelMap.forEach((wsSet, orderKey) => {
                  wsSet.delete(ws)
                  if (wsSet.size === 0) {
                    channelMap.delete(orderKey)
                  }
                })
                if (channelMap.size === 0) {
                  channelSubscribers.delete(ch)
                }
              }
              // Sync subscription state across instances
              syncSubscription(ch, 'unsubscribe')
            })
          }
          break

        case 'driver_update':
          // Only authenticated drivers can publish their location
          if (info.role !== 'rider' && info.role !== 'driver') {
            ws.send(
              JSON.stringify({
                channel: 'control',
                data: { type: 'error', message: 'Only drivers can publish location updates' },
                ts: Date.now(),
              })
            )
            break
          }
          // Use authenticated driver ID, not client-supplied
          // CR-14 FIX: Use typeof + Number.isFinite instead of truthiness so that
          // valid zero-valued coordinates (equator / prime meridian) are not rejected.
          if (
            typeof msg.lat === 'number' &&
            Number.isFinite(msg.lat) &&
            typeof msg.lng === 'number' &&
            Number.isFinite(msg.lng) &&
            msg.orderId
          ) {
            // Verify driver is assigned to this order
            const assignedOrders = driverOrderAssignments.get(info.userId)
            if (!assignedOrders || !assignedOrders.has(msg.orderId)) {
              ws.send(
                JSON.stringify({
                  channel: 'control',
                  data: { type: 'error', message: 'Not assigned to this order' },
                  ts: Date.now(),
                })
              )
              break
            }
            // Validate coordinate ranges
            if (msg.lat < -90 || msg.lat > 90 || msg.lng < -180 || msg.lng > 180) {
              ws.send(
                JSON.stringify({
                  channel: 'control',
                  data: { type: 'error', message: 'Invalid coordinates' },
                  ts: Date.now(),
                })
              )
              break
            }
            // Validate timestamp freshness (max 30 seconds old)
            const now = Date.now()
            if (msg.ts && now - msg.ts > 30000) {
              ws.send(
                JSON.stringify({
                  channel: 'control',
                  data: { type: 'error', message: 'Stale location update rejected' },
                  ts: Date.now(),
                })
              )
              break
            }
            // Coalesce GPS updates to reduce broadcast frequency
            coalesceGpsUpdate(info.userId, msg.lat, msg.lng, msg.orderId, now)
            recordMetric('totalMessagesReceived')
          }
          break

        case 'pong':
          ws.lastPong = Date.now()
          break
      }
    } catch (e) {
      console.error('WS message parse error:', e)
    }
  })

  ws.on('close', () => {
    const info = connectedClients.get(ws)
    if (info) {
      info.subscribed.forEach((ch) => {
        const channelMap = channelSubscribers.get(ch)
        if (channelMap) {
          // Remove from all order keys for this channel
          channelMap.forEach((wsSet, orderKey) => {
            wsSet.delete(ws)
            if (wsSet.size === 0) {
              channelMap.delete(orderKey)
            }
          })
          if (channelMap.size === 0) {
            channelSubscribers.delete(ch)
          }
        }
      })
      // Clean up GPS coalescing buffer for this driver
      if (info.driverId && gpsCoalesceBuffer.has(info.driverId)) {
        const buffered = gpsCoalesceBuffer.get(info.driverId)
        if (buffered.timer) clearTimeout(buffered.timer)
        gpsCoalesceBuffer.delete(info.driverId)
      }
    }
    connectedClients.delete(ws)
    metrics.activeConnections = connectedClients.size
  })
})

server.on('upgrade', async (req, socket, head) => {
  if (!req.headers || !req.url) {
    socket.destroy()
    return
  }
  if (req.url.startsWith('/api/ws')) {
    // Authenticate during WebSocket handshake
    const token = extractTokenFromRequest(req)
    const payload = await verifyWSToken(token)

    if (!payload) {
      // Allow unauthenticated connections for development, but require auth in production
      if (process.env.NODE_ENV === 'production') {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n')
        socket.destroy()
        return
      }
      // In development, allow but mark as anonymous
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

const pingInterval = setInterval(() => {
  const now = Date.now()
  connectedClients.forEach((info, ws) => {
    if (ws.readyState === WS_OPEN) {
      // If last pong was more than 60s ago, terminate as zombie
      if (ws.lastPong && now - ws.lastPong > PONG_TIMEOUT_MS) {
        ws.terminate()
        return
      }
      // Check for slow consumer based on buffered amount
      const bufferedAmount = ws.bufferedAmount || 0
      if (bufferedAmount > SLOW_CONSUMER_BUFFER_THRESHOLD) {
        console.warn(
          `[ws-server] Slow consumer detected during ping check: ${bufferedAmount} bytes buffered`
        )
        ws.close(1013, 'Slow consumer - buffer overflow')
        recordMetric('slowConsumerDisconnects')
        return
      }
      ws.send(
        JSON.stringify({
          channel: 'control',
          data: { type: 'ping' },
          ts: now,
        })
      )
    }
  })

  // Log metrics every 5 minutes
  if (Math.floor(now / 300000) !== Math.floor((now - PING_INTERVAL_MS) / 300000)) {
    console.log(
      `[ws-server] Metrics: connections=${metrics.activeConnections}, msgsRecv=${metrics.totalMessagesReceived}, msgsSent=${metrics.totalMessagesSent}, bytesRecv=${metrics.totalBytesReceived}, bytesSent=${metrics.totalBytesSent}, slowDisc=${metrics.slowConsumerDisconnects}, dropped=${metrics.droppedMessages}, gpsCoalesced=${metrics.gpsUpdatesCoalesced}, uptime=${Math.floor((now - metrics.startTime) / 1000)}s`
    )
  }
}, PING_INTERVAL_MS)

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error('WebSocket server error:', err)
  }
})

server.listen(PORT, () => {
  console.log(`🚀 [ws-server] Running on port ${PORT} (Instance ID: ${INSTANCE_ID})`)
})

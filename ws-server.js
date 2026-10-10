require('dotenv/config')

const { createServer } = require('http')
const { WebSocketServer } = require('ws')
const { v4: uuidv4 } = require('uuid')
const { TextEncoder } = require('util')

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
const REDIS_URL = process.env.REDIS_URL
const REDIS_CHANNEL = 'crave:ws:events'
const SUBSCRIPTION_SYNC_CHANNEL = 'crave:ws:subscriptions'

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
    roles: [
      'user',
      'customer',
      'restaurant_vendor',
      'cravexp_store_vendor',
      'vendor',
      'admin',
    ],
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

// Track allowed order subscriptions per customer: customerId -> Set<orderId>
const customerOrderSubscriptions = new Map()

// Track driver-order associations: driverId -> Set<orderId>
const driverOrderAssignments = new Map()

function authorizeChannel(channel, clientInfo, subscriptionData = {}) {
  const rules = CHANNEL_AUTH_RULES[channel]
  if (!rules) return false

  // Check role
  if (!rules.roles.includes(clientInfo.role)) return false

  // Check ownership if required
  if (rules.requireOwnership) {
    if (channel === 'order_update' || channel === 'approval_update') {
      // Admin and vendors can subscribe globally to their kitchen orders
      if (
        clientInfo.role === 'admin' ||
        clientInfo.role === 'restaurant_vendor' ||
        clientInfo.role === 'cravexp_store_vendor' ||
        clientInfo.role === 'vendor'
      ) {
        return true
      }

      const orderId = subscriptionData.orderId
      if (!orderId) return false // Must specify orderId for customer/driver ownership channels

      // Check if customer owns this order
      const allowedOrders = customerOrderSubscriptions.get(clientInfo.customerId)
      if (allowedOrders && allowedOrders.has(orderId)) {
        return true
      }

      // Dynamic registration for authenticated customer/rider session
      if (clientInfo.customerId || clientInfo.driverId) {
        registerCustomerOrder(clientInfo.customerId || clientInfo.driverId, orderId)
        return true
      }

      return false
    } else if (channel === 'driver_location') {
      if (clientInfo.role === 'admin') return true

      const orderId = subscriptionData.orderId
      if (!orderId) return false

      if (clientInfo.role === 'user' || clientInfo.role === 'customer') {
        return Boolean(clientInfo.customerId)
      } else if (clientInfo.role === 'rider' || clientInfo.role === 'driver') {
        return Boolean(clientInfo.driverId)
      }
    }
  }

  return true
}

// Register a customer's order for subscription access
function registerCustomerOrder(customerId, orderId) {
  if (!customerOrderSubscriptions.has(customerId)) {
    customerOrderSubscriptions.set(customerId, new Set())
  }
  customerOrderSubscriptions.get(customerId).add(orderId)
}

// Register driver-order assignment
function assignDriverToOrder(driverId, orderId) {
  if (!driverOrderAssignments.has(driverId)) {
    driverOrderAssignments.set(driverId, new Set())
  }
  driverOrderAssignments.get(driverId).add(orderId)
}

// Remove driver-order assignment (on delivery complete)
function removeDriverFromOrder(driverId, orderId) {
  const assignedOrders = driverOrderAssignments.get(driverId)
  if (assignedOrders) {
    assignedOrders.delete(orderId)
    if (assignedOrders.size === 0) {
      driverOrderAssignments.delete(driverId)
    }
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
            '__internal_register_order',
            '__internal_assign_driver',
            '__internal_remove_driver',
          ])

          // Internal channels for ownership management (require x-internal-secret)
          const INTERNAL_CHANNELS = new Set([
            '__internal_register_order',
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
              case '__internal_register_order':
                if (msg.data.customerId && msg.data.orderId) {
                  registerCustomerOrder(msg.data.customerId, msg.data.orderId)
                  result = true
                }
                break
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
            msg.channels.forEach((ch) => {
              // Authorize channel subscription with ownership data
              const subscriptionData = {
                orderId: msg.orderId, // Client must provide orderId for ownership channels
              }
              if (!authorizeChannel(ch, info, subscriptionData)) {
                ws.send(
                  JSON.stringify({
                    channel: 'control',
                    data: { type: 'error', message: `Unauthorized to subscribe to ${ch}` },
                    ts: Date.now(),
                  })
                )
                return
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
                isOwnershipChannel && subscriptionData.orderId ? subscriptionData.orderId : 'global'

              if (!channelMap.has(orderKey)) {
                channelMap.set(orderKey, new Set())
              }
              channelMap.get(orderKey).add(ws)

              // Sync subscription state across instances
              syncSubscription(ch, 'subscribe')
            })
          }
          // Use authenticated identity, not client-supplied
          // Client-supplied customerId/driverId are ignored for security
          ws.send(
            JSON.stringify({
              channel: 'control',
              data: { type: 'subscribed', clientId },
              ts: Date.now(),
            })
          )
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
          if (msg.lat && msg.lng && msg.orderId) {
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

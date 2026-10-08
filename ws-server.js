require('dotenv/config')

const { createServer } = require('http')
const { WebSocketServer } = require('ws')

const WS_OPEN = 1
const PORT = process.env.WS_PORT || 8000
const INSTANCE_ID = `ws_inst_${process.pid}_${Math.random().toString(36).substring(2, 7)}`

// Primary Client Directory: ws -> client metadata
const connectedClients = new Map()

// High-Performance Inverted Channel Index: channel -> Set<ws>
// Provides O(subscribers) broadcast instead of O(total connected clients)
const channelSubscribers = new Map()

/**
 * Broadcast an event to all locally connected clients subscribed to this channel.
 */
const broadcastLocal = (channel, data, excludeSocket) => {
  const subscribers = channelSubscribers.get(channel)
  if (!subscribers || subscribers.size === 0) return

  const payload = JSON.stringify({ channel, data, ts: Date.now() })
  subscribers.forEach((ws) => {
    if (excludeSocket && ws === excludeSocket) return
    if (ws.readyState === WS_OPEN) {
      ws.send(payload)
    }
  })
}

// ----------------------------------------------------
// Redis Pub/Sub Cluster Integration (Multi-Pod Scaling)
// ----------------------------------------------------
let redisPub = null
let redisSub = null
const REDIS_URL = process.env.REDIS_URL
const REDIS_CHANNEL = 'crave:ws:events'

if (REDIS_URL && process.env.REDIS_DISABLED !== 'true' && process.env.NODE_ENV !== 'test') {
  try {
    const Redis = require('ioredis')
    const redisOptions = {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 1500)),
      lazyConnect: false,
    }

    redisPub = new Redis(REDIS_URL, redisOptions)
    redisSub = new Redis(REDIS_URL, redisOptions)

    redisPub.on('error', (err) => {
      console.warn('⚠️ [ws-server] Redis Publisher notice:', err.message)
    })

    redisSub.on('error', (err) => {
      console.warn('⚠️ [ws-server] Redis Subscriber notice:', err.message)
    })

    redisSub.subscribe(REDIS_CHANNEL, (err) => {
      if (!err) {
        console.log(`🔌 [ws-server] Subscribed to Redis channel: ${REDIS_CHANNEL}`)
      }
    })

    redisSub.on('message', (_ch, message) => {
      try {
        const parsed = JSON.parse(message)
        // If message was published by another server instance, fan out to local subscribers
        if (parsed.origin !== INSTANCE_ID && parsed.channel) {
          broadcastLocal(parsed.channel, parsed.data)
        }
      } catch (err) {
        console.error('Failed to parse Redis broadcast message:', err.message)
      }
    })
  } catch (err) {
    console.warn('⚠️ [ws-server] Redis initialization skipped:', err.message)
  }
}

/**
 * Universal broadcast: dispatches locally and replicates across Redis cluster.
 */
const broadcast = (channel, data, excludeSocket) => {
  // 1. Immediately notify local subscribers
  broadcastLocal(channel, data, excludeSocket)

  // 2. Publish to Redis so all other instances in the cluster broadcast to their clients
  if (redisPub && redisPub.status === 'ready') {
    const clusterPayload = JSON.stringify({
      channel,
      data,
      origin: INSTANCE_ID,
      ts: Date.now(),
    })
    redisPub.publish(REDIS_CHANNEL, clusterPayload).catch(() => {})
  }
}

const WS_INTERNAL_SECRET =
  process.env.WS_INTERNAL_SECRET || process.env.JWT_SECRET || 'crave_internal_secret_default'

const server = createServer((req, res) => {
  if (req.url && req.url.startsWith('/__ws/broadcast')) {
    if (req.method === 'POST') {
      const incomingSecret = req.headers['x-internal-secret']
      if (
        process.env.NODE_ENV !== 'test' &&
        WS_INTERNAL_SECRET &&
        incomingSecret !== WS_INTERNAL_SECRET
      ) {
        res.writeHead(403, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Forbidden' }))
        return
      }
      let body = ''
      let size = 0
      req.on('data', (chunk) => {
        size += chunk.length
        if (size > 1024 * 1024) {
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

const wss = new WebSocketServer({ noServer: true })

wss.on('connection', (ws, req) => {
  const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

  const clientInfo = {
    id: clientId,
    subscribed: new Set(),
    customerId: null,
    driverId: null,
  }
  connectedClients.set(ws, clientInfo)

  ws.on('message', (raw) => {
    if (raw && raw.length > 65536) {
      ws.close(1009, 'Payload too large')
      return
    }
    try {
      const msg = JSON.parse(raw.toString())
      const info = connectedClients.get(ws)
      if (!info) return

      switch (msg.type) {
        case 'subscribe':
          if (Array.isArray(msg.channels)) {
            msg.channels.forEach((ch) => {
              info.subscribed.add(ch)
              if (!channelSubscribers.has(ch)) {
                channelSubscribers.set(ch, new Set())
              }
              channelSubscribers.get(ch).add(ws)
            })
          }
          if (msg.customerId) info.customerId = msg.customerId
          if (msg.driverId) info.driverId = msg.driverId
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
              const set = channelSubscribers.get(ch)
              if (set) {
                set.delete(ws)
                if (set.size === 0) channelSubscribers.delete(ch)
              }
            })
          }
          break

        case 'driver_update':
          if (msg.driverId && msg.lat && msg.lng) {
            broadcast('driver_location', {
              driverId: msg.driverId,
              orderId: msg.orderId,
              lat: msg.lat,
              lng: msg.lng,
            })
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
        const set = channelSubscribers.get(ch)
        if (set) {
          set.delete(ws)
          if (set.size === 0) channelSubscribers.delete(ch)
        }
      })
    }
    connectedClients.delete(ws)
  })
})

server.on('upgrade', (req, socket, head) => {
  if (!req.headers || !req.url) {
    socket.destroy()
    return
  }
  if (req.url.startsWith('/api/ws')) {
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
      if (ws.lastPong && now - ws.lastPong > 60000) {
        ws.terminate()
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
}, 30000)

server.on('error', (err) => {
  if (err.code !== 'EADDRINUSE') {
    console.error('WebSocket server error:', err)
  }
})

server.listen(PORT, () => {
  console.log(`🚀 [ws-server] Running on port ${PORT} (Instance ID: ${INSTANCE_ID})`)
})

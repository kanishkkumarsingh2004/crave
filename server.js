require('dotenv/config')

const { createServer } = require('http')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const connectedClients = new Map()
const driverPositions = new Map()

const WS_OPEN = 1

const broadcast = (channel, data, excludeSocket) => {
  const now = Date.now()
  connectedClients.forEach((info, ws) => {
    if (info.subscribed.has(channel) && ws.readyState === WS_OPEN) {
      if (excludeSocket && ws === excludeSocket) return
      ws.send(JSON.stringify({ channel, data, ts: now }))
    }
  })
}

const INTERNAL_BROADCAST_PORT = process.env.WS_BROADCAST_PORT || 3002

app.prepare().then(() => {
  const server = createServer((req, res) => {
    if (req.url && req.url.startsWith('/__ws/broadcast')) {
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (chunk) => (body += chunk))
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
    handle(req, res)
  })

  let wss

  try {
    const { WebSocketServer } = require('ws')
    wss = new WebSocketServer({ server, path: '/api/ws', noServer: false })
  } catch {
    wss = {
      clients: new Set(),
      on: () => wss,
      close: () => {},
    }
  }

  wss.on('connection', (ws, req) => {
    const clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`

    connectedClients.set(ws, {
      id: clientId,
      subscribed: new Set(),
      customerId: null,
      driverId: null,
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString())
        const info = connectedClients.get(ws)

        switch (msg.type) {
          case 'subscribe':
            msg.channels?.forEach((ch) => info.subscribed.add(ch))
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
            msg.channels?.forEach((ch) => info.subscribed.delete(ch))
            break

          case 'driver_update':
            if (msg.driverId && msg.lat && msg.lng) {
              driverPositions.set(msg.driverId, {
                lat: msg.lat,
                lng: msg.lng,
                orderId: msg.orderId || null,
              })
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
      if (info && info.driverId) {
        driverPositions.delete(info.driverId)
      }
      connectedClients.delete(ws)
    })
  })

  const pingInterval = setInterval(() => {
    if (!wss) return
    wss.clients.forEach((ws) => {
      if (ws.readyState === WS_OPEN) {
        ws.send(
          JSON.stringify({
            channel: 'control',
            data: { type: 'ping' },
            ts: Date.now(),
          })
        )
      }
    })
  }, 30000)

  server.listen(process.env.PORT || 3000, () => {
    console.log('> Ready on http://localhost:' + (process.env.PORT || 3000))
    console.log('> WebSocket server ready at /api/ws')
  })
})

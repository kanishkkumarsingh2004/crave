require('dotenv/config')

const { createServer } = require('http')

const WS_OPEN = 1
const PORT = process.env.WS_PORT || 8000

const connectedClients = new Map()

const broadcast = (channel, data, excludeSocket) => {
  const now = Date.now()
  connectedClients.forEach((info, ws) => {
    if (info.subscribed.has(channel) && ws.readyState === WS_OPEN) {
      if (excludeSocket && ws === excludeSocket) return
      ws.send(JSON.stringify({ channel, data, ts: now }))
    }
  })
}

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
  res.writeHead(404)
  res.end()
})

const { WebSocketServer } = require('ws')
const wss = new WebSocketServer({ noServer: true })

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
    connectedClients.delete(ws)
  })
})

server.on('upgrade', (req, socket, head) => {
  if (!req.headers || !req.url) {
    socket.destroy()
    return
  }
  if (req.url.startsWith('/api/ws')) {
    wss.handleUpgrade({ url: '/api/ws', headers: req.headers }, socket, head, (ws) => {
      wss.emit('connection', ws, req)
    })
  } else {
    socket.destroy()
  }
})

const pingInterval = setInterval(() => {
  connectedClients.forEach((info, ws) => {
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

server.listen(PORT, () => {
  console.log('> WebSocket backend ready at http://localhost:' + PORT + '/api/ws')
  console.log('> Broadcast endpoint ready at http://localhost:' + PORT + '/__ws/broadcast')
})

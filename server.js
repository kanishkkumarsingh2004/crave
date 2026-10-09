require('dotenv/config')

const { createServer } = require('http')
const next = require('next')
const net = require('net')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  // Proxy WebSocket upgrade requests (/api/ws) to backend container
  server.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.startsWith('/api/ws')) {
      const targetPort = process.env.WS_PORT || 8000
      const targetHost = process.env.WS_HOST || 'backend'
      const targetSocket = net.connect(targetPort, targetHost, () => {
        let rawReq = `${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`
        if (req.rawHeaders) {
          for (let i = 0; i < req.rawHeaders.length; i += 2) {
            rawReq += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`
          }
        }
        rawReq += '\r\n'
        targetSocket.write(rawReq)
        if (head && head.length) targetSocket.write(head)

        socket.pipe(targetSocket)
        targetSocket.pipe(socket)
      })

      targetSocket.on('error', () => {
        try {
          socket.destroy()
        } catch (e) {}
      })
      socket.on('error', () => {
        try {
          targetSocket.destroy()
        } catch (e) {}
      })
    }
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {})
})

require('dotenv/config')

const { createServer } = require('http')
const next = require('next')
const { fork } = require('child_process')
const net = require('net')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

// Start WebSocket broadcast server process alongside Next.js server
let wsProcess = null
try {
  wsProcess = fork('./ws-server.js', [], { stdio: 'inherit' })
} catch (err) {
  console.warn('Could not spawn ws-server:', err.message)
}

process.on('SIGINT', () => {
  if (wsProcess) wsProcess.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  if (wsProcess) wsProcess.kill()
  process.exit(0)
})

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  // Proxy WebSocket upgrade requests (/api/ws) seamlessly on the same HTTP port
  server.on('upgrade', (req, socket, head) => {
    if (req.url && req.url.startsWith('/api/ws')) {
      const targetPort = process.env.WS_PORT || 8000
      const targetSocket = net.connect(targetPort, '127.0.0.1', () => {
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
  server.listen(PORT, () => {
    console.log('> Ready on http://localhost:' + PORT)
  })
})

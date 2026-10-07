require('dotenv/config')

const { createServer } = require('http')
const next = require('next')
const { fork } = require('child_process')

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

  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log('> Ready on http://localhost:' + PORT)
  })
})

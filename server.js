require('dotenv/config')

const { createServer } = require('http')
const next = require('next')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res)
  })

  const PORT = process.env.PORT || 3000
  server.listen(PORT, () => {
    console.log('> Ready on http://localhost:' + PORT)
  })
})

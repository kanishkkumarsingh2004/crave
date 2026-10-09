/**
 * @jest-environment node
 */
import http from 'http'

describe('WebSocket Server Broadcast', () => {
  describe('WS_BROADCAST_ENDPOINT constant', () => {
    it('exports the correct broadcast endpoint path', () => {
      const { WS_BROADCAST_ENDPOINT } = require('@/lib/ws-server')
      expect(WS_BROADCAST_ENDPOINT).toBe('/__ws/broadcast')
    })
  })

  describe('broadcast() on server', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        WS_BROADCAST_HOST: 'localhost',
        WS_INTERNAL_SECRET: 'test-secret-key-for-testing',
        NODE_ENV: 'test',
      }
      jest.resetModules()
    })

    afterEach(() => {
      process.env = originalEnv
    })

    it('sends HTTP POST to broadcast endpoint on server', async () => {
      let serverRequest: http.IncomingMessage | null = null
      let serverRequestBody = ''

      const server = http.createServer((req, res) => {
        serverRequest = req
        let body = ''
        req.on('data', (chunk) => (body += chunk))
        req.on('end', () => {
          serverRequestBody = body
          res.writeHead(200)
          res.end()
        })
      })

      await new Promise((resolve) => {
        server.listen(0, () => resolve(true))
      })

      const port = (server.address() as any).port
      process.env.WS_BROADCAST_PORT = String(port)

      const { broadcast } = require('@/lib/ws-server')
      const result = await broadcast('order_update', { orderId: 'ord_1', status: 'preparing' })
      expect(result).toBe(true)

      await new Promise((resolve) => {
        const check = setInterval(() => {
          if (serverRequestBody) {
            clearInterval(check)
            resolve(true)
          }
        }, 50)
      })

      expect(serverRequest).not.toBeNull()
      expect(serverRequest!.url).toBe('/__ws/broadcast')
      expect(serverRequest!.method).toBe('POST')
      expect(serverRequest!.headers['content-type']).toBe('application/json')

      const parsed = JSON.parse(serverRequestBody)
      expect(parsed.channel).toBe('order_update')
      expect(parsed.data).toEqual({ orderId: 'ord_1', status: 'preparing' })
      expect(parsed.ts).toBeDefined()

      await new Promise((resolve) => server.close(() => resolve(true)))
    })
  })

  describe('broadcast() returns false in browser context', () => {
    it('returns false when window is defined', async () => {
      jest.resetModules()
      ;(global as any).window = {}
      const { broadcast } = require('@/lib/ws-server')
      const result = await broadcast('order_update', { test: true })
      expect(result).toBe(false)
      delete (global as any).window
    })
  })
})

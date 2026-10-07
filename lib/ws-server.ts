export const WS_BROADCAST_ENDPOINT = '/__ws/broadcast'
export const WS_BROADCAST_PORT = process.env.WS_BROADCAST_PORT || 8000
export const WS_BROADCAST_HOST = process.env.WS_BROADCAST_HOST || 'localhost'

export const broadcast = async (
  channel: string,
  data: unknown,
  _excludeSocket?: unknown
): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    return false
  }

  try {
    const http = require('http')
    const payload = JSON.stringify({ channel, data, ts: Date.now() })

    return new Promise<boolean>((resolve) => {
      const req = http.request(
        {
          hostname: WS_BROADCAST_HOST,
          port: WS_BROADCAST_PORT,
          path: WS_BROADCAST_ENDPOINT,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res: any) => {
          res.on('data', () => {})
          res.on('end', () => resolve(true))
        }
      )

      req.on('error', (err: any) => {
        if (err.code !== 'ECONNREFUSED') {
          console.error('Broadcast HTTP error:', err.message)
        }
        resolve(false)
      })

      req.write(payload)
      req.end()
    })
  } catch (e) {
    console.error('Broadcast error:', e)
    return false
  }
}

export const getWSS = () => null

export function getClients() {
  return new Map()
}

export function getDrivers() {
  return new Map()
}

export const initWebSocketServer = (_server: any) => null

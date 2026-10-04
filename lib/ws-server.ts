export const WS_BROADCAST_ENDPOINT = '/__ws/broadcast'

export const broadcast = (channel: string, data: unknown, _excludeSocket?: unknown): boolean => {
  if (typeof window !== 'undefined') {
    return false
  }

  try {
    const http = require('http')
    const payload = JSON.stringify({ channel, data, ts: Date.now() })

    const req = http.request(
      {
        hostname: 'localhost',
        port: process.env.PORT || 3000,
        path: WS_BROADCAST_ENDPOINT,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      () => {}
    )

    req.on('error', (err: any) => {
      console.error('Broadcast HTTP error:', err.message)
    })

    req.write(payload)
    req.end()
    return true
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

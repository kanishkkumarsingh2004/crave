import { redis, isRedisAvailable } from '@/lib/redis'

export const WS_BROADCAST_ENDPOINT = '/__ws/broadcast'
export const WS_BROADCAST_PORT = process.env.WS_BROADCAST_PORT || 8000
export const WS_BROADCAST_HOST = process.env.WS_BROADCAST_HOST || 'localhost'
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'crave_internal_ws_secret_default_key'

function ensureInternalSecret() {
  if (!process.env.WS_INTERNAL_SECRET && process.env.NODE_ENV === 'production') {
    console.warn('Notice: WS_INTERNAL_SECRET not set in env, using default broadcast secret.')
  }
}

export const broadcast = async (
  channel: string,
  data: unknown,
  _excludeSocket?: unknown
): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    return false
  }
  ensureInternalSecret()

  const msgId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  const payload = JSON.stringify({
    channel,
    data,
    origin: 'crave_app',
    msgId,
    ts: Date.now(),
  })

  // High-performance Redis Pub/Sub broadcast across cluster nodes
  if (isRedisAvailable() && redis) {
    try {
      await redis.publish('crave:ws:events', payload)
      return true
    } catch {
      // Fall through to HTTP broadcast on Redis error
    }
  }

  try {
    const http = require('http')

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
            'x-internal-secret': WS_INTERNAL_SECRET,
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

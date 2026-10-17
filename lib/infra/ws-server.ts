import http from 'http'
import { redis, isRedisAvailable } from '@/lib/redis'

export const WS_BROADCAST_ENDPOINT = '/__ws/broadcast'
export const WS_BROADCAST_PORT = process.env.WS_BROADCAST_PORT || 8000
export const WS_BROADCAST_HOST = process.env.WS_BROADCAST_HOST || 'localhost'

function getInternalSecret(): string | null {
  const secret = process.env.WS_INTERNAL_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('FATAL: WS_INTERNAL_SECRET must be set in production environment.')
  }
  return secret || null
}

export const broadcast = async (
  channel: string,
  data: unknown,
  _excludeSocket?: unknown
): Promise<boolean> => {
  if (typeof window !== 'undefined') {
    return false
  }
  const internalSecret = getInternalSecret()
  if (!internalSecret) return false

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
            'x-internal-secret': internalSecret,
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

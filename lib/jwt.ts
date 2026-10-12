import { SignJWT, jwtVerify } from 'jose'
import { redis, isRedisAvailable } from '@/lib/redis'

// In-memory fallback sets for single-process resiliency when Redis is unavailable or unconfigured
const inMemoryBlacklist = new Set<string>()
const inMemoryUserBlacklist = new Set<string>()
let redisAuthWarnLogged = false

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET environment variable is missing in production environment.'
      )
    }
    // Development fallback - should never be used in production
    return new TextEncoder().encode('dev-secret-change-in-production')
  }
  return new TextEncoder().encode(secret)
}

export type JWTRole = 'user' | 'restaurant_vendor' | 'cravexp_store_vendor' | 'rider' | 'admin'

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: JWTRole
  phone?: string
  address?: string
  avatar?: string
  restaurantName?: string
  restaurantId?: string
  restaurant_id?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
  vehicleNo?: string
  /** ISO 639-1 locale code stored on the user row, e.g. 'en' | 'kn' */
  locale?: string
  /** JWT ID for token revocation */
  jti?: string
  iat?: number
  exp?: number
}

export async function createToken(payload: JWTPayload): Promise<string> {
  const jti = payload.jti || crypto.randomUUID()
  const token = await new SignJWT({ ...payload, jti })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getJwtSecretKey())

  return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ['HS256'],
    })
    const payloadWithJti = payload as unknown as JWTPayload & { jti?: string }

    // Fast zero-latency in-memory check first
    if (payloadWithJti.jti && inMemoryBlacklist.has(payloadWithJti.jti)) {
      return null
    }
    if (payloadWithJti.id && inMemoryUserBlacklist.has(payloadWithJti.id)) {
      return null
    }

    const redisCurrentlyUp = isRedisAvailable() && !!redis

    if (redisCurrentlyUp) {
      try {
        // Fast timeout check (500ms max) so Redis network latency never hangs auth
        const checkRedisRevocation = async () => {
          if (payloadWithJti.jti) {
            const blacklisted = await redis!.get(`crave:jwt:blacklist:${payloadWithJti.jti}`)
            if (blacklisted) return true
          }
          if (payloadWithJti.id) {
            const userBlacklisted = await redis!.get(`crave:jwt:blacklist:user:${payloadWithJti.id}`)
            if (userBlacklisted) return true
          }
          return false
        }

        const isRevoked = await Promise.race([
          checkRedisRevocation(),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 500)),
        ])

        if (isRevoked) {
          return null
        }
      } catch (redisErr) {
        // Redis error: rely safely on in-memory blacklist
      }
    } else {
      // Redis is unavailable or unconfigured: Check in-memory fallback blacklist
      if (!redisAuthWarnLogged && process.env.REDIS_URL && process.env.REDIS_DISABLED !== 'true') {
        redisAuthWarnLogged = true
        console.warn(
          '[jwt] NOTICE: Redis endpoint unreachable. Operating with in-memory revocation fallback.'
        )
      }
    }

    return payloadWithJti as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Add a token to the blacklist (revoke token)
 * Uses the token's JTI and sets TTL to token's remaining lifetime
 */
export async function blacklistToken(token: string): Promise<boolean> {
  try {
    const payload = (await verifyToken(token)) || (await decodeToken(token))
    if (!payload || !payload.jti) return false

    // Get token expiration to calculate TTL
    const exp = payload.exp || Math.floor(Date.now() / 1000) + 7 * 86400
    const ttlSeconds = Math.max(0, exp - Math.floor(Date.now() / 1000))
    if (ttlSeconds <= 0) return false

    // Always maintain in-memory blacklist
    inMemoryBlacklist.add(payload.jti)
    const timer = setTimeout(() => inMemoryBlacklist.delete(payload.jti!), ttlSeconds * 1000)
    timer?.unref?.()

    if (isRedisAvailable() && redis) {
      try {
        await Promise.race([
          redis.set(`crave:jwt:blacklist:${payload.jti}`, '1', 'EX', ttlSeconds),
          new Promise((resolve) => setTimeout(resolve, 500)),
        ])
      } catch {}
      return true
    }
    return true
  } catch (error) {
    return false
  }
}

/**
 * Blacklist all tokens for a user (logout all sessions)
 */
export async function blacklistAllUserTokens(userId: string): Promise<boolean> {
  inMemoryUserBlacklist.add(userId)
  const userTimer = setTimeout(() => inMemoryUserBlacklist.delete(userId), 7 * 24 * 60 * 60 * 1000)
  userTimer?.unref?.()

  if (isRedisAvailable() && redis) {
    try {
      await Promise.race([
        redis.set(`crave:jwt:blacklist:user:${userId}`, '1', 'EX', 7 * 24 * 60 * 60),
        new Promise((resolve) => setTimeout(resolve, 500)),
      ])
    } catch {}
  }
  return true
}

/**
 * Check if a user has been globally logged out
 */
export async function isUserBlacklisted(userId: string): Promise<boolean> {
  if (inMemoryUserBlacklist.has(userId)) return true
  if (!isRedisAvailable() || !redis) return false
  const blacklisted = await redis.get(`crave:jwt:blacklist:user:${userId}`)
  return !!blacklisted
}

/**
 * Decode a JWT without verification (for extracting claims)
 */
export async function decodeToken(token: string): Promise<JWTPayload | null> {
  try {
    const { decodeJwt } = await import('jose')
    const decoded = decodeJwt(token)
    return decoded as unknown as JWTPayload
  } catch (error) {
    return null
  }
}

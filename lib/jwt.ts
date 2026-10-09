import { SignJWT, jwtVerify } from 'jose'
import { redis, isRedisAvailable } from '@/lib/redis'

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

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: 'user' | 'restaurant_vendor' | 'cravexp_store_vendor' | 'rider' | 'admin'
  phone?: string
  address?: string
  avatar?: string
  restaurantName?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
  /** ISO 639-1 locale code stored on the user row, e.g. 'en' | 'kn' */
  locale?: string
  /** JWT ID for token revocation */
  jti?: string
  [key: string]: any
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
    const payloadWithJti = payload as JWTPayload & { jti?: string }

    // Check if token is blacklisted
    if (payloadWithJti.jti && isRedisAvailable() && redis) {
      const blacklisted = await redis.get(`crave:jwt:blacklist:${payloadWithJti.jti}`)
      if (blacklisted) return null
    }

    // Check if user is blacklisted (logout all sessions)
    if (payloadWithJti.id && isRedisAvailable() && redis) {
      const userBlacklisted = await redis.get(`crave:jwt:blacklist:user:${payloadWithJti.id}`)
      if (userBlacklisted) return null
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
    const payload = await verifyToken(token)
    if (!payload || !payload.jti) return false

    // Get token expiration to calculate TTL
    const { payload: unverified } = await import('jose').then((m) => m.decodeJwt(token))
    const exp = (unverified as any).exp
    if (!exp) return false

    const ttlSeconds = Math.max(0, exp - Math.floor(Date.now() / 1000))
    if (ttlSeconds <= 0) return false

    if (isRedisAvailable() && redis) {
      await redis.set(`crave:jwt:blacklist:${payload.jti}`, '1', 'EX', ttlSeconds)
      return true
    }
    return false
  } catch (error) {
    return false
  }
}

/**
 * Blacklist all tokens for a user (logout all sessions)
 */
export async function blacklistAllUserTokens(userId: string): Promise<boolean> {
  if (!isRedisAvailable() || !redis) return false

  // We use a user-level blacklist key to track all tokens for a user
  await redis.set(`crave:jwt:blacklist:user:${userId}`, '1', 'EX', 7 * 24 * 60 * 60) // 7 days
  return true
}

/**
 * Check if a user has been globally logged out
 */
export async function isUserBlacklisted(userId: string): Promise<boolean> {
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
    return decoded as JWTPayload
  } catch (error) {
    return null
  }
}

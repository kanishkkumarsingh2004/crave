import { NextResponse } from 'next/server'
import { redis, isRedisAvailable } from '@/lib/redis'

// ─── Rate Limit Tiers ─────────────────────────────────────────
export const RateLimitTier = {
  // Public endpoints - generous limits
  PUBLIC: { limit: 100, windowMs: 60000 }, // 100 req/min

  // Authenticated user endpoints
  USER: { limit: 60, windowMs: 60000 }, // 60 req/min

  // Sensitive endpoints - strict limits
  AUTH_LOGIN: { limit: 5, windowMs: 300000 }, // 5 req/5min
  AUTH_SIGNUP: { limit: 3, windowMs: 300000 }, // 3 req/5min
  AUTH_OTP: { limit: 3, windowMs: 300000 }, // 3 req/5min
  ORDER_CREATE: { limit: 10, windowMs: 60000 }, // 10 req/min
  PAYMENT_VERIFY: { limit: 20, windowMs: 60000 }, // 20 req/min
  DISPATCH_ACCEPT: { limit: 30, windowMs: 60000 }, // 30 req/min

  // Admin endpoints - moderate limits
  ADMIN: { limit: 120, windowMs: 60000 }, // 120 req/min
} as const

export type RateLimitTierKey = keyof typeof RateLimitTier

// ─── Distributed Rate Limiter with Redis ──────────────────────
const memoryStore = new Map<string, { count: number; resetTime: number }>()

// Clean up expired records every 60 seconds
if (typeof window === 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now()
    memoryStore.forEach((val, key) => {
      if (now > val.resetTime) memoryStore.delete(key)
    })
  }, 60000)
  if (cleanup.unref) cleanup.unref()
}

/**
 * Check rate limit using Redis (distributed) with in-memory fallback
 */
export async function checkRateLimit(
  key: string,
  tier: RateLimitTierKey = 'USER'
): Promise<{ allowed: boolean; remaining: number; resetTime: number; retryAfter?: number }> {
  const { limit, windowMs } = RateLimitTier[tier]
  const now = Date.now()
  const redisKey = `crave:ratelimit:${tier}:${key}`

  // Try Redis first (distributed)
  if (isRedisAvailable() && redis) {
    try {
      const pipeline = redis.pipeline()
      pipeline.incr(redisKey)
      pipeline.pttl(redisKey)
      const results = await pipeline.exec()

      if (results && results[0] && results[1]) {
        const count = results[0][1] as number
        let ttl = results[1][1] as number

        if (ttl === -1 || ttl < 0) {
          await redis.pexpire(redisKey, windowMs)
          ttl = windowMs
        }

        const resetTime = now + (ttl > 0 ? ttl : windowMs)

        if (count > limit) {
          return {
            allowed: false,
            remaining: 0,
            resetTime,
            retryAfter: Math.ceil((resetTime - now) / 1000),
          }
        }

        return {
          allowed: true,
          remaining: Math.max(0, limit - count),
          resetTime,
        }
      }
    } catch {
      // Fall through to memory store
    }
  }

  // In-memory fallback
  return checkRateLimitMemory(key, limit, windowMs, now)
}

/**
 * In-memory rate limit check (single-instance fallback)
 */
function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
  now: number
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const record = memoryStore.get(key)

  if (!record || now > record.resetTime) {
    memoryStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  try {
    const headers = request.headers

    // Cloudflare
    const cfIp = headers.get('cf-connecting-ip')
    if (cfIp) return cfIp.trim().replace(/[^a-zA-Z0-9.:_-]/g, '')

    // Nginx/Proxy
    const realIp = headers.get('x-real-ip')
    if (realIp) return realIp.trim().replace(/[^a-zA-Z0-9.:_-]/g, '')

    // X-Forwarded-For
    const xff = headers.get('x-forwarded-for')
    if (xff) {
      const parts = xff
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
      if (parts.length > 0) return parts[0].replace(/[^a-zA-Z0-9.:_-]/g, '')
    }
  } catch {}
  return '127.0.0.1'
}

/**
 * Create 429 response with Retry-After header
 */
export function rateLimitResponse(resetTime: number, retryAfter?: number) {
  const seconds = retryAfter ?? Math.ceil((resetTime - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.max(1, seconds)),
        'X-RateLimit-Reset': String(Math.ceil(resetTime / 1000)),
      },
    }
  )
}

/**
 * Higher-order function to apply rate limiting to an API route
 */
export function withRateLimit(tier: RateLimitTierKey, getKey?: (request: Request) => string) {
  return function (handler: (request: Request) => Promise<NextResponse>) {
    return async function (request: Request) {
      const key = getKey ? getKey(request) : `${tier}:${getClientIp(request)}`

      const result = await checkRateLimit(key, tier)

      if (!result.allowed) {
        return rateLimitResponse(result.resetTime, result.retryAfter)
      }

      // Add rate limit headers to successful response
      const response = await handler(request)
      response.headers.set('X-RateLimit-Limit', String(RateLimitTier[tier].limit))
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)))
      return response
    }
  }
}

import { NextResponse } from 'next/server'

interface RateLimitRecord {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitRecord>()

// Clean up expired rate-limit records every 60 seconds
if (typeof window === 'undefined') {
  const cleanup = setInterval(() => {
    const now = Date.now()
    store.forEach((val, key) => {
      if (now > val.resetTime) {
        store.delete(key)
      }
    })
  }, 60000)
  if (cleanup.unref) cleanup.unref()
}

import { redis, isRedisAvailable } from '@/lib/redis'

/**
 * In-memory sliding window rate limiter fallback to protect endpoints against DDoS / brute force.
 * @param ip Client IP address or key
 * @param limit Max requests allowed within window (default: 60)
 * @param windowMs Time window in milliseconds (default: 60000 ms)
 */
export function checkRateLimit(
  ip: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = store.get(ip)

  if (!record || now > record.resetTime) {
    store.set(ip, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs }
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  return { allowed: true, remaining: limit - record.count, resetTime: record.resetTime }
}

/**
 * Async distributed rate limiter using Redis atomic counter + PEXPIRE when available,
 * falling back to in-memory store if Redis is unavailable or unconfigured.
 */
export async function checkRateLimitAsync(
  ip: string,
  limit: number = 60,
  windowMs: number = 60000
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  if (isRedisAvailable() && redis) {
    try {
      const key = `crave:ratelimit:${ip}`
      const pipeline = redis.pipeline()
      pipeline.incr(key)
      pipeline.pttl(key)
      const results = await pipeline.exec()

      if (results && results[0] && results[1]) {
        const count = results[0][1] as number
        let ttl = results[1][1] as number

        if (ttl === -1 || ttl < 0) {
          await redis.pexpire(key, windowMs)
          ttl = windowMs
        }

        const now = Date.now()
        const resetTime = now + (ttl > 0 ? ttl : windowMs)

        if (count > limit) {
          return { allowed: false, remaining: 0, resetTime }
        }

        return { allowed: true, remaining: Math.max(0, limit - count), resetTime }
      }
    } catch {
      // Redis command failure: safely fall through to in-memory check
    }
  }

  return checkRateLimit(ip, limit, windowMs)
}

export function getClientIp(request: Request): string {
  try {
    const cfConnectingIp = request.headers?.get ? request.headers.get('cf-connecting-ip') : null
    if (cfConnectingIp) {
      return cfConnectingIp.trim().replace(/[^a-zA-Z0-9.:_-]/g, '')
    }

    const realIp = request.headers?.get ? request.headers.get('x-real-ip') : null
    if (realIp) {
      return realIp.trim().replace(/[^a-zA-Z0-9.:_-]/g, '')
    }

    const xff = request.headers?.get ? request.headers.get('x-forwarded-for') : null
    if (xff) {
      const parts = xff.split(',').map((p) => p.trim()).filter(Boolean)
      if (parts.length > 0) {
        return parts[0].replace(/[^a-zA-Z0-9.:_-]/g, '')
      }
    }
  } catch {}
  return '127.0.0.1'
}

export function rateLimitResponse(resetTime: number) {
  const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
  return NextResponse.json(
    { error: 'Too many requests. Please slow down and try again later.' },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter > 0 ? retryAfter : 1),
      },
    }
  )
}

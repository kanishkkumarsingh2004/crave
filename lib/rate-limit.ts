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

/**
 * In-memory sliding window rate limiter to protect endpoints against DDoS / brute force.
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

export function getClientIp(request: Request): string {
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    return xff.split(',')[0].trim()
  }
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
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

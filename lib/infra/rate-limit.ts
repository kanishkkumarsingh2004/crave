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
  DISPATCH_REQUEST: { limit: 20, windowMs: 60000 }, // 20 dispatch requests/min per vendor
  GPS_UPDATE: { limit: 60, windowMs: 60000 }, // 1 update/second max

  // Admin endpoints - moderate limits
  ADMIN: { limit: 120, windowMs: 60000 }, // 120 req/min
} as const

export type RateLimitTierKey = keyof typeof RateLimitTier

// ─── Distributed Rate Limiter with Redis ──────────────────────
const memoryStore = new Map<string, { count: number; resetTime: number }>()
const DISTRIBUTED_REQUIRED_TIERS = new Set<RateLimitTierKey>([
  'AUTH_LOGIN',
  'AUTH_SIGNUP',
  'AUTH_OTP',
  'ORDER_CREATE',
  'PAYMENT_VERIFY',
  'DISPATCH_ACCEPT',
  'DISPATCH_REQUEST',
  'GPS_UPDATE',
])

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
  const isLocalhost = key.includes('127.0.0.1') || key.includes('::1') || key.includes('localhost')
  const effectiveLimit =
    process.env.NODE_ENV === 'development' && isLocalhost ? Math.max(limit, 100) : limit
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

        if (count > effectiveLimit) {
          return {
            allowed: false,
            remaining: 0,
            resetTime,
            retryAfter: Math.ceil((resetTime - now) / 1000),
          }
        }

        return {
          allowed: true,
          remaining: Math.max(0, effectiveLimit - count),
          resetTime,
        }
      }
    } catch (redisErr) {
      console.error(
        `[rate-limit] Redis error on tier ${tier} for key ${key}:`,
        redisErr instanceof Error ? redisErr.message : redisErr
      )
      // For security-critical tiers, fail closed
      if (DISTRIBUTED_REQUIRED_TIERS.has(tier)) {
        return {
          allowed: false,
          remaining: 0,
          resetTime: now + windowMs,
          retryAfter: Math.ceil(windowMs / 1000),
        }
      }
      // For non-critical tiers, fall through to memory store
    }
  }

  if (
    DISTRIBUTED_REQUIRED_TIERS.has(tier) &&
    process.env.NODE_ENV === 'production' &&
    process.env.REDIS_DISABLED !== 'true'
  ) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: now + windowMs,
      retryAfter: Math.ceil(windowMs / 1000),
    }
  }

  // In-memory fallback
  return checkRateLimitMemory(key, effectiveLimit, windowMs, now)
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
 * Get client IP from request headers.
 *
 * CR-06 FIX: Only trust forwarded headers (x-forwarded-for, x-real-ip,
 * cf-connecting-ip) when the request is known to come from a trusted proxy.
 * If TRUSTED_PROXY_RANGES is not set, we fall back to the direct
 * connection IP (request.socket.remoteAddress) and ignore potentially
 * spoofable headers. This prevents an attacker from bypassing IP-based
 * rate limiting by supplying arbitrary X-Forwarded-For values.
 *
 * For authenticated operations, prefer account-based rate limiting
 * (see withAccountRateLimit below) which cannot be bypassed by IP rotation.
 */

/** Set of CIDR ranges that are trusted to set forwarding headers. */
const TRUSTED_PROXY_RANGES = (process.env.TRUSTED_PROXY_RANGES || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

/** Whether we are behind a reverse proxy (e.g. nginx, Caddy, Cloudflare). */
const BEHIND_PROXY = process.env.BEHIND_PROXY === 'true'

function ipInCidr(ip: string, cidr: string): boolean {
  // Simple IPv4 CIDR check. For production use a library like ip-regex;
  // this is a minimal implementation sufficient for common deployments.
  const [range, bitsStr] = cidr.split('/')
  const bits = parseInt(bitsStr, 10)
  if (!range || !Number.isInteger(bits) || bits < 0 || bits > 32) return false
  const ipNum = ipToNum(ip)
  const rangeNum = ipToNum(range)
  if (ipNum === null || rangeNum === null) return false
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0
  return (ipNum & mask) === (rangeNum & mask)
}

function ipToNum(ip: string): number | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  let num = 0
  for (let i = 0; i < 4; i++) {
    const octet = parseInt(parts[i], 10)
    if (isNaN(octet) || octet < 0 || octet > 255) return null
    num = (num << 8) | octet
  }
  return num >>> 0
}

function isTrustedIp(ip: string, trustedProxyRanges = TRUSTED_PROXY_RANGES): boolean {
  if (trustedProxyRanges.length === 0) return false
  return trustedProxyRanges.some((cidr) => ipInCidr(ip, cidr))
}

function sanitizeIp(ip: string | null): string {
  if (!ip) return '127.0.0.1'
  // Strip any non-IP characters (basic sanitization)
  const cleaned = ip.trim().replace(/[^a-zA-Z0-9.:_-]/g, '')
  // IPv6 localhost fallback
  if (cleaned === '' || cleaned === '::') return '127.0.0.1'
  return cleaned
}

export function resolveClientIp(
  request: Request,
  options: { behindProxy?: boolean; trustedProxyRanges?: string[] } = {}
): string {
  try {
    const headers = request.headers
    // @ts-expect-error - socket may not exist on all Request implementations
    const directIp = request.socket?.remoteAddress
      ? // @ts-expect-error - guarded above
        sanitizeIp(request.socket.remoteAddress)
      : null
    const behindProxy = options.behindProxy ?? BEHIND_PROXY
    const trustedProxyRanges = options.trustedProxyRanges ?? TRUSTED_PROXY_RANGES

    // Forwarded headers are attacker-controlled unless the direct peer is a
    // configured reverse proxy. This rule applies to Cloudflare headers too.
    if (behindProxy && directIp && isTrustedIp(directIp, trustedProxyRanges)) {
      const cfIp = headers.get('cf-connecting-ip')
      if (cfIp) return sanitizeIp(cfIp)

      // X-Real-Ip is typically set by nginx/caddy reverse proxy.
      const realIp = headers.get('x-real-ip')
      if (realIp) return sanitizeIp(realIp)

      // X-Forwarded-For: take the leftmost (original client) entry.
      // Only trust it if we have configured trusted proxy ranges.
      const xff = headers.get('x-forwarded-for')
      if (xff) {
        const parts = xff
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean)
        if (parts.length > 0) return sanitizeIp(parts[0])
      }
    }

    // Next.js Web Request objects do not always expose the peer socket. In that
    // case, accept proxy headers only when the deployment explicitly enabled
    // proxy mode and configured at least one trusted proxy range. Reverse
    // proxies must overwrite (not append to) these headers at the edge.
    if (behindProxy && !directIp && trustedProxyRanges.length > 0) {
      const cfIp = headers.get('cf-connecting-ip')
      if (cfIp) return sanitizeIp(cfIp)
      const realIp = headers.get('x-real-ip')
      if (realIp) return sanitizeIp(realIp)
      const xff = headers.get('x-forwarded-for')
      if (xff) return sanitizeIp(xff.split(',')[0]?.trim() || null)
    }

    if (directIp) return directIp
  } catch {}
  return '127.0.0.1'
}

export function getClientIp(request: Request): string {
  return resolveClientIp(request)
}

/**
 * CR-06 FIX: Account-based rate limiting for authenticated operations.
 * Uses the authenticated actor's ID as the rate-limit key, so IP rotation
 * cannot bypass the limit. Falls back to IP-based key when no actor is
 * available (e.g. pre-auth endpoints).
 */
export function getRateLimitKey(
  request: Request,
  actorId?: string | null,
  prefix?: string
): string {
  if (actorId) {
    return `${prefix || 'account'}:${actorId}`
  }
  return `${prefix || 'ip'}:${getClientIp(request)}`
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

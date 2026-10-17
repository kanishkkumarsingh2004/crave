import { prisma } from '@/lib/prisma'
import { isRedisAvailable, resolveRedisConfig } from '@/lib/redis'
import { NextResponse } from 'next/server'

/**
 * GET /api/health/ready — Readiness probe
 * P1-B: Tests database connectivity and Redis availability.
 * Returns HTTP 200 when all critical dependencies are ready, HTTP 503 otherwise.
 */
export async function GET() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatency = -1

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    dbStatus = 'ok'
  } catch {
    // Keep dependency errors out of the public readiness response.
  }

  const redisConfig = resolveRedisConfig()
  const redisAvailable = isRedisAvailable()
  const redisRequired = process.env.REDIS_REQUIRED === 'true'

  let redisCheckStatus: 'ok' | 'degraded' | 'disabled' = 'ok'
  if (redisConfig.mode === 'disabled' || redisConfig.mode === 'test') {
    redisCheckStatus = 'disabled'
  } else if (!redisAvailable) {
    redisCheckStatus = 'degraded'
  }

  // If Redis is strictly required for production correctness and offline, mark unhealthy
  const isRedisCritical = redisRequired && redisCheckStatus === 'degraded'
  const isHealthy = dbStatus === 'ok' && !isRedisCritical
  const overall = isHealthy ? (redisCheckStatus === 'degraded' ? 'degraded' : 'ok') : 'unhealthy'

  return NextResponse.json(
    {
      status: overall,
      timestamp,
      uptime: process.uptime(),
      responseTimeMs: Date.now() - startTime,
      checks: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
        redis: {
          status: redisCheckStatus,
          required: redisRequired,
        },
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  )
}

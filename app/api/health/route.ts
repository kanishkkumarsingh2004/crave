import { prisma } from '@/lib/prisma'
import { isRedisAvailable, resolveRedisConfig } from '@/lib/redis'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  let dbStatus: 'ok' | 'error' = 'error'
  let dbLatency = -1
  let dbError: string | null = null

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    dbStatus = 'ok'
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'Database connection failed'
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
          error: dbError,
        },
        redis: {
          status: redisCheckStatus,
          mode: redisConfig.mode,
          isDistributed: redisAvailable,
          required: redisRequired,
        },
      },
      env: {
        nodeVersion: process.version,
        nextVersion: process.env.__NEXT_VERSION || 'unknown',
        environment: process.env.NODE_ENV,
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

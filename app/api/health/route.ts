import { prisma } from '@/lib/prisma'
import { isRedisAvailable, redis, resolveRedisConfig } from '@/lib/redis'
import { getWebPushPublicKey, isWebPushConfigured } from '@/lib/web-push'
import { handleAuthError, requireRole } from '@/lib/auth-helpers'
import { NextResponse } from 'next/server'

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

/**
 * GET /api/health — lightweight public liveness probe.
 *
 * Detailed operational telemetry is restricted to administrators and requires
 * `?details=true`; this prevents public infrastructure and error disclosure.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  if (searchParams.get('details') !== 'true') {
    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    )
  }

  try {
    await requireRole(request, 'admin')
  } catch (error) {
    return handleAuthError(error)
  }

  const startTime = Date.now()
  const uptimeSeconds = process.uptime()
  const startedAt = new Date(Date.now() - uptimeSeconds * 1000).toISOString()

  // 1. Database Health & Metric Queries
  let dbStatus: 'operational' | 'error' = 'error'
  let dbLatency = -1
  let dbError: string | null = null
  let activeWebPushSubs = 0
  let activeDriverPushTokens = 0

  try {
    if (!prisma) {
      throw new Error('Database client not initialized (DATABASE_URL may be missing)')
    }
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatency = Date.now() - dbStart
    dbStatus = 'operational'

    // Fetch active notification counts safely
    try {
      activeWebPushSubs = await prisma.webPushSubscription.count({ where: { is_active: true } })
      activeDriverPushTokens = await prisma.driverPushToken.count({ where: { is_active: true } })
    } catch {}
  } catch (err: any) {
    dbStatus = 'error'
    dbError = err instanceof Error ? err.message : 'Database ping query failed'
  }

  // 2. Redis Telemetry
  const redisConfig = resolveRedisConfig()
  const redisAvailable = isRedisAvailable()
  const redisRequired = process.env.REDIS_REQUIRED === 'true'
  let redisLatency = -1
  let redisStatus: 'connected' | 'degraded' | 'disabled' = 'disabled'

  if (redisConfig.mode === 'disabled' || redisConfig.mode === 'test') {
    redisStatus = 'disabled'
  } else if (!redisAvailable || !redis) {
    redisStatus = 'degraded'
  } else {
    try {
      const rStart = Date.now()
      const pingResult = await Promise.race([
        redis.ping(),
        new Promise<string>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500)),
      ])
      if (pingResult === 'PONG') {
        redisLatency = Date.now() - rStart
        redisStatus = 'connected'
      } else {
        redisStatus = 'degraded'
      }
    } catch {
      redisStatus = 'degraded'
    }
  }

  // 3. Realtime WebSocket Server Health
  let wsStatus: 'operational' | 'offline' = 'offline'
  let wsLatency = -1
  const wsHost = process.env.WS_HOST || '127.0.0.1'
  const wsPort = process.env.WS_PORT || '8000'

  try {
    const wsStart = Date.now()
    const wsRes = await fetch(`http://${wsHost}:${wsPort}/health`, {
      signal: AbortSignal?.timeout ? AbortSignal.timeout(1500) : undefined,
    })
    if (wsRes.ok) {
      wsStatus = 'operational'
      wsLatency = Date.now() - wsStart
    }
  } catch {
    wsStatus = 'offline'
  }

  // 4. Notification Parameters
  const webPushConfigured = isWebPushConfigured()
  const webPushPublicKey = getWebPushPublicKey()

  // 5. Memory Footprint
  const mem = process.memoryUsage()
  const memory = {
    rssMb: Math.round(mem.rss / (1024 * 1024)),
    heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
    heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
  }

  // 6. Overall Platform Status Assessment
  const isHealthy = dbStatus === 'operational'
  const isDegraded =
    (redisRequired && redisStatus !== 'connected') ||
    wsStatus === 'offline' ||
    redisStatus === 'degraded'

  const overallStatus = !isHealthy ? 'unhealthy' : isDegraded ? 'degraded' : 'operational'

  const responsePayload = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    executionDurationMs: Date.now() - startTime,
    website: {
      name: 'Crave Multi-Vendor Delivery & CraveXP 10-Minute Dark Store',
      status: overallStatus,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    },
    uptimes: {
      processUptimeSeconds: Math.floor(uptimeSeconds),
      formatted: formatUptime(uptimeSeconds),
      startedAt,
      memory,
    },
    services: {
      database: {
        status: dbStatus,
        engine: 'PostgreSQL 16 (Neon / Prisma)',
        latencyMs: dbLatency,
        error: dbError,
      },
      redis: {
        status: redisStatus,
        mode: redisConfig.mode,
        isDistributed: redisAvailable,
        latencyMs: redisLatency,
        required: redisRequired,
      },
      websocketServer: {
        status: wsStatus,
        port: Number(wsPort),
        latencyMs: wsLatency,
      },
      notifications: {
        webPush: {
          status: webPushConfigured ? 'active' : 'unconfigured',
          configured: webPushConfigured,
          publicKey: webPushPublicKey,
          activeSubscriptionsCount: activeWebPushSubs,
        },
        driverPush: {
          status: activeDriverPushTokens > 0 ? 'active' : 'idle',
          activeTokensCount: activeDriverPushTokens,
        },
      },
    },
  }

  return NextResponse.json(responsePayload, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'application/json',
    },
  })
}

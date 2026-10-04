import { prisma } from '@/lib/prisma'
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

  const overall = dbStatus === 'ok' ? 'ok' : 'degraded'

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
      },
      env: {
        nodeVersion: process.version,
        nextVersion: process.env.__NEXT_VERSION || 'unknown',
        environment: process.env.NODE_ENV,
      },
    },
    {
      status: dbStatus === 'ok' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  )
}

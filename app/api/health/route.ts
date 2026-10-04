import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  const timestamp = new Date().toISOString()

  try {
    const dbStart = Date.now()
    const { data, error } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)

    const dbLatency = Date.now() - dbStart

    const status = {
      status: error ? 'degraded' : 'ok',
      timestamp,
      uptime: process.uptime(),
      responseTimeMs: Date.now() - startTime,
      checks: {
        database: {
          status: error ? 'error' : 'ok',
          latencyMs: dbLatency,
          error: error?.message ?? null,
        },
      },
      env: {
        nodeVersion: process.version,
        nextVersion: process.env.__NEXT_VERSION || 'unknown',
        environment: process.env.NODE_ENV,
      },
    }

    return NextResponse.json(status, {
      status: error ? 503 : 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp,
        uptime: process.uptime(),
        responseTimeMs: Date.now() - startTime,
        checks: {
          database: {
            status: 'error',
            latencyMs: -1,
            error: err instanceof Error ? err.message : 'Database connection failed',
          },
        },
        env: {
          nodeVersion: process.version,
          nextVersion: process.env.__NEXT_VERSION || 'unknown',
          environment: process.env.NODE_ENV,
        },
      },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Content-Type': 'application/json',
        },
      }
    )
  }
}

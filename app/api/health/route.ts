import { NextResponse } from 'next/server'

/**
 * GET /api/health — Liveness probe
 * P1-B: Pure process liveness check. Does NOT query the database or Redis.
 * Returns HTTP 200 in < 5 ms for load balancers and Kubernetes liveness probes.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  )
}

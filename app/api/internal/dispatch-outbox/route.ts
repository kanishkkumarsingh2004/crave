import crypto from 'node:crypto'
import { dispatchPendingOutboxEvents } from '@/lib/dal/orders'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(request: Request) {
  const expected = (process.env.CRON_SECRET || process.env.WS_INTERNAL_SECRET || '').trim()
  const received = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (!expected || !received) return false
  const expectedBytes = Buffer.from(expected)
  const receivedBytes = Buffer.from(received)
  return (
    expectedBytes.length === receivedBytes.length &&
    crypto.timingSafeEqual(expectedBytes, receivedBytes)
  )
}

export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'Unauthorized scheduler request' }, { status: 401 })
  }

  const processed = await dispatchPendingOutboxEvents(100)
  return NextResponse.json({ success: true, processed, ranAt: new Date().toISOString() })
}

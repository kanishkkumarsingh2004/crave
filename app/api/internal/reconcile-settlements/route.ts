import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { reconcileStaleTransfers } from '@/lib/payments/razorpay-split'
import { createRouteSplits } from '@/lib/payments/razorpay-split'
import { prisma } from '@/lib/prisma'

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

  try {
    const result = await reconcileStaleTransfers()
    const safelyReleasedIds = result.results
      .filter((entry: any) => entry.reconciled === 'safe_to_retry_not_submitted')
      .map((entry: any) => String(entry.transferId))
    const recoverable = safelyReleasedIds.length
      ? await prisma.razorpayTransfer.findMany({
          where: { id: { in: safelyReleasedIds }, status: 'pending' },
          select: { order_id: true },
          distinct: ['order_id'],
        })
      : []
    const retries: Array<{ orderId: string; success: boolean; error?: string }> = []
    for (const row of recoverable) {
      try {
        await createRouteSplits({ orderId: row.order_id })
        retries.push({ orderId: row.order_id, success: true })
      } catch (error: any) {
        console.error(
          `[settlement-reconciliation] Safe retry failed for order ${row.order_id}:`,
          error?.message
        )
        retries.push({ orderId: row.order_id, success: false, error: error?.message })
      }
    }
    const unresolvedCount =
      result.results.filter(
        (entry: any) =>
          Boolean(entry.error) ||
          ['missing_payment_id_kept_unknown', 'not_found_kept_unknown'].includes(
            String(entry.reconciled)
          )
      ).length + retries.filter((retry) => !retry.success).length
    return NextResponse.json({
      success: true,
      checked: result.results.length,
      unresolvedCount,
      safelyRetried: retries.filter((retry) => retry.success).length,
      ranAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[settlement-reconciliation] Scheduled run failed:', error)
    return NextResponse.json({ error: 'Settlement reconciliation failed' }, { status: 500 })
  }
}

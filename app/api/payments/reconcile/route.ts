import { NextResponse } from 'next/server'
import { reconcilePendingOrders } from '@/lib/finance/payment-service'
import { getAuthActor } from '@/lib/auth/auth-helpers'

/**
 * POST /api/payments/reconcile
 *
 * Automated Payment Reconciliation Endpoint
 *
 * Scans for abandoned/pending orders past the expiration threshold (default: 30 mins),
 * reconciles their financial records, marks them expired/cancelled, and safely releases
 * held inventory back into stock.
 *
 * Auth: Admin JWT or Cron Secret (Bearer token matching CRON_SECRET or WS_INTERNAL_SECRET).
 */
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    const cronSecret = process.env.CRON_SECRET || process.env.WS_INTERNAL_SECRET
    const isCronAuthorized = cronSecret && token === cronSecret

    let actor = null
    if (!isCronAuthorized) {
      actor = await getAuthActor(request)
      if (!actor || actor.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized: Admin role or Cron Secret required' },
          { status: 403 }
        )
      }
    }

    const { searchParams } = new URL(request.url)
    const staleMinutes = parseInt(searchParams.get('staleMinutes') || '30', 10)

    const result = await reconcilePendingOrders(isNaN(staleMinutes) ? 30 : staleMinutes)

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    })
  } catch (error: any) {
    console.error('[payments/reconcile] Error during reconciliation:', error)
    return NextResponse.json({ error: error?.message || 'Reconciliation failed' }, { status: 500 })
  }
}

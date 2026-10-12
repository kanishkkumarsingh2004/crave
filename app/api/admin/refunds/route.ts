import { NextResponse } from 'next/server'
import { requireRole, handleAuthError } from '@/lib/auth-helpers'
import { processRefundTx } from '@/lib/finance/payment-service'
import { withTiming } from '@/lib/instrumentation'

export async function POST(request: Request) {
  return withTiming('POST /api/admin/refunds', async () => {
    try {
      const actor = await requireRole(request, 'admin')
      const body = await request.json()
      const {
        orderId,
        amount,
        reason = 'Customer refund requested',
        idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotencyKey || null,
        gatewayRefundId,
      } = body

      if (!orderId || typeof orderId !== 'string') {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
      }

      const numericAmount = Number(amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return NextResponse.json({ error: 'Valid positive refund amount is required' }, { status: 400 })
      }

      const result = await processRefundTx({
        orderId,
        amount: Math.round(numericAmount),
        reason,
        idempotencyKey: idempotencyKey || `refund_${orderId}_${numericAmount}_${Date.now()}`,
        gatewayRefundId,
        actorId: actor.id,
      })

      return NextResponse.json({
        success: true,
        message: result.alreadyProcessed ? 'Refund already processed (idempotent)' : 'Refund processed successfully',
        refund: result.refund,
        alreadyProcessed: result.alreadyProcessed || false,
      })
    } catch (error: any) {
      if (error?.message?.includes('exceeds order total') || error?.message?.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return handleAuthError(error)
    }
  })
}

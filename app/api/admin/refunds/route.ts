import { NextResponse } from 'next/server'
import { requireRole, handleAuthError } from '@/lib/auth/auth-helpers'
import { processRefundTx } from '@/lib/finance/payment-service'
import { withTiming } from '@/lib/instrumentation'
import { verifyManualRazorpayRefund } from '@/lib/payments/razorpay-refunds'

export async function POST(request: Request) {
  return withTiming('POST /api/admin/refunds', async () => {
    try {
      const actor = await requireRole(request, 'admin')
      const body = await request.json()
      const {
        orderId,
        refundId,
        amount,
        reason = 'Customer refund requested',
        idempotencyKey = request.headers.get('x-idempotency-key') || body.idempotencyKey || null,
        gatewayRefundId,
      } = body

      if (!orderId || typeof orderId !== 'string') {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
      }

      if (gatewayRefundId) {
        if (typeof refundId !== 'string' || !refundId.trim()) {
          return NextResponse.json(
            { error: 'refundId is required to verify a provider refund' },
            { status: 400 }
          )
        }
        const result = await verifyManualRazorpayRefund({
          refundId: refundId.trim(),
          gatewayRefundId: String(gatewayRefundId).trim(),
          actorId: actor.id,
        })
        return NextResponse.json({
          success: true,
          message:
            result.providerStatus === 'processed'
              ? 'Razorpay confirmed the refund and the ledger was completed.'
              : result.providerStatus === 'failed'
                ? 'Razorpay reports that this refund failed.'
                : 'Razorpay confirms that this refund is still pending.',
          refund: result.refund,
          providerStatus: result.providerStatus,
          alreadyProcessed: result.alreadyProcessed || false,
        })
      }

      const numericAmount = Number(amount)
      if (isNaN(numericAmount) || numericAmount <= 0) {
        return NextResponse.json(
          { error: 'Valid positive refund amount is required' },
          { status: 400 }
        )
      }
      if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) {
        return NextResponse.json(
          { error: 'x-idempotency-key header is required for refund creation' },
          { status: 400 }
        )
      }

      const result = await processRefundTx({
        orderId,
        amount: Math.round(numericAmount),
        reason,
        idempotencyKey: idempotencyKey.trim(),
        actorId: actor.id,
      })

      return NextResponse.json({
        success: true,
        message:
          result.refund.status === 'completed'
            ? result.alreadyProcessed
              ? 'Refund already processed (idempotent)'
              : 'Provider-confirmed refund processed successfully'
            : 'Refund request recorded and awaiting provider confirmation',
        refund: result.refund,
        alreadyProcessed: result.alreadyProcessed || false,
      })
    } catch (error: any) {
      if (
        error?.message?.includes('exceeds order total') ||
        error?.message?.includes('not found')
      ) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return handleAuthError(error)
    }
  })
}

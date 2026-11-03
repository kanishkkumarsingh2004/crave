import { NextResponse } from 'next/server'
import {
  processPaymentVerificationTx,
  processPaymentRejectionTx,
  processRefundTx,
} from '@/lib/finance/payment-service'
import {
  acquireIdempotency,
  completeIdempotency,
  hashPayload,
  releaseIdempotency,
} from '@/lib/idempotency'
import { broadcast } from '@/lib/ws-server'
import crypto from 'crypto'

/**
 * POST /api/webhooks/payment
 *
 * Transaction-safe, idempotent webhook handler for external payment gateways
 * (Razorpay, Cashfree, UPI Gateway, Stripe, BBPS).
 *
 * Guarantees:
 * - Replay protection: Duplicate webhooks with the same event ID are acknowledged immediately
 *   without re-executing state changes or duplicate financial records.
 * - Atomic database execution: Order state, payment transaction, vendor settlement, and
 *   double-entry ledger journals succeed or fail together.
 * - Never marks an order as paid without authoritative payload validation.
 */
export async function POST(request: Request) {
  let idempotencyKey = ''
  let webhookFencingToken: string | undefined
  let webhookRequestHash = ''

  try {
    const rawBody = await request.text()
    let payload: any = {}
    try {
      payload = rawBody ? JSON.parse(rawBody) : {}
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    // 1. Signature Verification — fail closed. A webhook that can flip an order
    // to "paid" must always be authenticated. If a secret is configured, a valid
    // signature is mandatory (missing or invalid -> reject). If no secret is
    // configured at all, unverified payment events are unsafe to process in
    // production, so we refuse them; the dedicated /api/webhooks/razorpay route
    // is the strict, secret-authenticated path for Razorpay.
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET
    const signature =
      request.headers.get('x-webhook-signature') ||
      request.headers.get('x-razorpay-signature') ||
      request.headers.get('x-signature')

    if (secret) {
      if (!signature) {
        console.warn('[webhook/payment] Missing signature header — rejecting')
        return NextResponse.json({ error: 'Missing webhook signature' }, { status: 401 })
      }
      const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      const isValid =
        signature.length === expectedSignature.length &&
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))

      if (!isValid) {
        console.warn('[webhook/payment] Invalid webhook signature rejected')
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      console.error('[webhook/payment] No webhook secret configured — refusing unverified event')
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 503 })
    }

    // 2. Extract Event Data
    const eventType = String(payload.event || payload.type || '')
      .trim()
      .toLowerCase()
    if (!eventType) {
      return NextResponse.json({ error: 'Webhook event type is required' }, { status: 400 })
    }

    const gateway = String(payload.gateway || '')
      .trim()
      .toUpperCase()
    if (!gateway) {
      return NextResponse.json({ error: 'Webhook gateway is required' }, { status: 400 })
    }
    if (gateway === 'RAZORPAY') {
      return NextResponse.json(
        { error: 'Razorpay events must use /api/webhooks/razorpay' },
        { status: 400 }
      )
    }
    const eventId =
      payload.event_id ||
      payload.id ||
      request.headers.get('x-webhook-idempotency-key') ||
      request.headers.get('idempotency-key') ||
      crypto.createHash('sha256').update(rawBody).digest('hex').slice(0, 32)

    idempotencyKey = `webhook_${eventId}`
    webhookRequestHash = hashPayload(payload)
    if (!webhookRequestHash) {
      return NextResponse.json({ error: 'Webhook payload cannot be hashed' }, { status: 400 })
    }

    // 3. Idempotency Lock Check
    const lock = await acquireIdempotency(idempotencyKey, 'payment_webhook', payload, 300)
    webhookFencingToken = lock.fencingToken
    if (lock.status === 'completed') {
      return NextResponse.json(
        lock.body || { success: true, message: 'Webhook event already processed (idempotent)' },
        { status: lock.statusCode || 200 }
      )
    }
    // Reject key reuse with a different payload — do not allow the webhook to
    // bypass payload-integrity protection.
    if (lock.status === 'conflict') {
      return NextResponse.json(
        {
          error:
            'Idempotency key reused with a different payload. Do not reuse idempotency keys for different requests.',
        },
        { status: 422 }
      )
    }
    if (lock.status === 'processing') {
      return NextResponse.json({ error: 'Webhook event currently processing' }, { status: 409 })
    }

    // Extract Order & Payment metadata
    const data = payload.payload?.payment?.entity || payload.data || payload
    const orderId =
      data.order_id || data.orderId || data.notes?.order_id || payload.order_id || payload.orderId

    if (!orderId) {
      await releaseIdempotency(idempotencyKey, 'payment_webhook', webhookFencingToken)
      return NextResponse.json({ error: 'order_id missing from webhook payload' }, { status: 400 })
    }

    const gatewayPaymentId = data.id || data.payment_id || data.transaction_id || eventId
    const amountPaise = Number(data.amount_paise ?? data.amountPaise)
    const currency = String(data.currency ?? payload.currency ?? '').toUpperCase()

    let resultResponse: any = {}

    // 4. Dispatch Event Types
    const capturedEvents = new Set([
      'payment.captured',
      'payment.succeeded',
      'payment.verified',
      'payment.successful',
    ])
    const failedEvents = new Set(['payment.failed', 'payment.cancelled'])
    const refundEvents = new Set(['refund.processed', 'refund.succeeded', 'payment.refunded'])

    if (capturedEvents.has(eventType)) {
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || currency !== 'INR') {
        await releaseIdempotency(idempotencyKey, 'payment_webhook', webhookFencingToken)
        return NextResponse.json(
          { error: 'Captured payment requires a positive integer amount_paise and INR currency' },
          { status: 400 }
        )
      }
      const outcome = await processPaymentVerificationTx({
        orderId,
        gatewayPaymentId,
        gateway,
        amountPaise,
        actorId: 'GATEWAY_WEBHOOK',
        idempotencyKey,
        rawPayload: payload,
      })

      resultResponse = {
        success: true,
        event: eventType,
        orderId,
        paymentStatus: 'verified',
        alreadyVerified: outcome.alreadyVerified,
      }

      // Real-time broadcasts
      await broadcast('approval_update', { status: 'verified', orderId })
      await broadcast('order_update', { order: outcome.order, orderId })
    } else if (failedEvents.has(eventType)) {
      const outcome = await processPaymentRejectionTx({
        orderId,
        reason: data.error_description || data.failure_reason || 'Gateway payment declined',
        actorId: 'GATEWAY_WEBHOOK',
        idempotencyKey,
      })

      resultResponse = {
        success: true,
        event: eventType,
        orderId,
        paymentStatus: 'failed',
      }

      await broadcast('order_update', { order: outcome.order, orderId })
    } else if (refundEvents.has(eventType)) {
      if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0 || currency !== 'INR') {
        await releaseIdempotency(idempotencyKey, 'payment_webhook', webhookFencingToken)
        return NextResponse.json(
          { error: 'Refund requires a positive integer amount_paise and INR currency' },
          { status: 400 }
        )
      }
      const refundOutcome = await processRefundTx({
        orderId,
        amountPaise,
        reason: data.refund_reason || 'Gateway refund event',
        idempotencyKey: `webhook_refund_${eventId}`,
        gatewayRefundId: data.refund_id || eventId,
        providerConfirmed: true,
        actorId: 'GATEWAY_WEBHOOK',
      })

      resultResponse = {
        success: true,
        event: eventType,
        orderId,
        refund: refundOutcome.refund,
        alreadyProcessed: refundOutcome.alreadyProcessed,
      }
    } else {
      resultResponse = {
        success: true,
        event: eventType,
        message: 'Event acknowledged without state mutation',
      }
    }

    // 5. Complete Idempotency Record
    if (!webhookFencingToken) throw new Error('Webhook idempotency lease ownership was lost')
    const completed = await completeIdempotency(
      idempotencyKey,
      'payment_webhook',
      200,
      resultResponse,
      webhookFencingToken,
      webhookRequestHash
    )
    if (!completed) throw new Error('Webhook idempotency completion was rejected')

    return NextResponse.json(resultResponse)
  } catch (err: any) {
    if (idempotencyKey) {
      await releaseIdempotency(idempotencyKey, 'payment_webhook', webhookFencingToken)
    }
    console.error('[webhook/payment] Webhook processing failure:', err)
    return NextResponse.json(
      { error: err?.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * app/api/webhooks/razorpay/route.ts
 *
 * Dedicated Razorpay webhook handler with durable idempotency.
 *
 * Razorpay signs the RAW request body using HMAC-SHA256 and the configured webhook
 * secret. Missing secret/signature always fails closed (401). Event replay is
 * prevented via the durable WebhookEvent model — never an in-memory cache.
 */

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/infra/prisma'
import { processPaymentVerificationTx } from '@/lib/finance/payment-service'

export const runtime = 'nodejs'

function verifyRawBody(raw: string, signature: string, secret: string) {
  if (!signature || !secret || !/^[a-f0-9]{64}$/i.test(signature)) return false
  const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest()
  const received = Buffer.from(signature, 'hex')
  return received.length === expected.length && crypto.timingSafeEqual(received, expected)
}

export async function POST(request: Request) {
  const raw = await request.text()
  const signature = request.headers.get('x-razorpay-signature') ?? ''
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET ?? ''

  // Fail closed if secret or signature is missing.
  if (!verifyRawBody(raw, signature, secret)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventId = String(
    event.id ??
      request.headers.get('x-razorpay-event-id') ??
      crypto.createHash('sha256').update(raw).digest('hex')
  )
  const type = String(event.event ?? '')
  if (!eventId || !type) {
    return NextResponse.json({ error: 'Missing event ID/type' }, { status: 400 })
  }

  // Durable idempotency via WebhookEvent model.
  const receipt = await beginWebhookEvent('RAZORPAY', eventId, type, event)
  if (receipt.status === 'completed') {
    return NextResponse.json({ received: true })
  }
  if (receipt.status === 'processing') {
    return NextResponse.json({ error: 'Webhook event already processing' }, { status: 409 })
  }

  const payment = event.payload?.payment?.entity

  if (type === 'payment.captured' || type === 'order.paid') {
    const paymentId = String(payment?.id ?? '')
    const rzpOrderId = String(payment?.order_id ?? '')
    const amountPaise = Number(payment?.amount)

    if (!paymentId || !rzpOrderId || !Number.isSafeInteger(amountPaise)) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        'Invalid payment payload'
      )
      return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 })
    }

    const attempt = await prisma.paymentTransaction.findFirst({
      where: { gateway: 'RAZORPAY', razorpay_order_id: rzpOrderId },
      include: { order: true },
    })
    if (!attempt) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        'Unknown Razorpay order'
      )
      return NextResponse.json({ error: 'Unknown Razorpay order' }, { status: 500 })
    }

    const snapshot = attempt.order.financial_snapshot as {
      customerPayablePaise?: number
    } | null
    const expectedPaise = attempt.order.total_amount_paise ?? snapshot?.customerPayablePaise
    if (
      amountPaise !== expectedPaise ||
      amountPaise !== attempt.amount_paise ||
      payment.currency !== 'INR' ||
      (payment.status && payment.status !== 'captured')
    ) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        'Payment does not match order'
      )
      return NextResponse.json({ error: 'Payment does not match order' }, { status: 409 })
    }

    try {
      await processPaymentVerificationTx({
        orderId: attempt.order_id,
        gatewayPaymentId: paymentId,
        gateway: 'RAZORPAY',
        amountPaise,
        actorId: 'RAZORPAY_WEBHOOK',
        idempotencyKey: `razorpay_event_${eventId}`,
        rawPayload: event,
      } as any)
    } catch (err: any) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        err?.message ?? 'verification error'
      )
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
    }

    await markWebhookEventProcessed('RAZORPAY', eventId, receipt.leaseToken)
    return NextResponse.json({ received: true })
  } else if (type === 'payment.failed') {
    const rzpOrderId = String(payment?.order_id ?? '')
    if (rzpOrderId) {
      await prisma.paymentTransaction.updateMany({
        where: {
          gateway: 'RAZORPAY',
          razorpay_order_id: rzpOrderId,
          status: { in: ['pending', 'processing'] },
        },
        data: {
          status: 'failed',
          gateway_payment_id: payment?.id ? String(payment.id) : undefined,
          failure_reason: String(payment?.error_description ?? 'Payment failed'),
        } as any,
      })
    }
    await markWebhookEventProcessed('RAZORPAY', eventId, receipt.leaseToken)
    return NextResponse.json({ received: true })
  } else if (type === 'refund.created' || type === 'refund.processed' || type === 'refund.failed') {
    const refundEntity = event.payload?.refund?.entity
    try {
      const expectedStatus: Record<string, string> = {
        'refund.created': 'pending',
        'refund.processed': 'processed',
        'refund.failed': 'failed',
      }
      if (String(refundEntity?.status ?? '').toLowerCase() !== expectedStatus[type]) {
        throw new Error('Razorpay refund event type and entity status do not match')
      }
      const { applySignedRazorpayRefundEvent } = await import('@/lib/payments/razorpay-refunds')
      await applySignedRazorpayRefundEvent({
        entity: refundEntity,
        actorId: 'RAZORPAY_WEBHOOK',
      })
    } catch (err: any) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        err?.message ?? 'refund webhook error'
      )
      return NextResponse.json({ error: 'Refund webhook failed' }, { status: 500 })
    }
    await markWebhookEventProcessed('RAZORPAY', eventId, receipt.leaseToken)
    return NextResponse.json({ received: true })
  } else if (
    type === 'transfer.processed' ||
    type === 'transfer.failed' ||
    type === 'transfer.reversed' ||
    type === 'transfer.partially_reversed'
  ) {
    // Route transfer webhooks — delegate to the split service
    const { handleRouteTransferWebhook } = await import('@/lib/payments/razorpay-split')
    try {
      await handleRouteTransferWebhook(event)
    } catch (err: any) {
      await markWebhookEventFailed(
        'RAZORPAY',
        eventId,
        receipt.leaseToken,
        err?.message ?? 'transfer webhook error'
      )
      return NextResponse.json({ error: 'Transfer webhook failed' }, { status: 500 })
    }
    await markWebhookEventProcessed('RAZORPAY', eventId, receipt.leaseToken)
    return NextResponse.json({ received: true })
  } else {
    await markWebhookEventProcessed('RAZORPAY', eventId, receipt.leaseToken)
    return NextResponse.json({ received: true })
  }
}

// ─── Durable WebhookEvent helpers ─────────────────────────────────────────

interface BeginResult {
  status: 'new' | 'processing' | 'completed'
  leaseToken?: string
}

/**
 * CR-08 FIX: Atomically claim a webhook event for processing.
 *
 * The previous implementation had a race condition: when a previously-failed
 * event was retried, it attempted to create a new record with the same
 * provider/event_id. The database rejected the insertion (unique constraint),
 * and the catch block returned 'processing' without actually transitioning
 * the failed event back to a recoverable state. The event became permanently
 * stuck in 'failed' state, requiring manual intervention.
 *
 * This implementation uses a single atomic database operation:
 *   1. Try to insert a new 'processing' record (fast path for first delivery).
 *   2. If the unique constraint fires, atomically claim an existing
 *      'failed' record by transitioning it back to 'processing' with
 *      incremented attempt count and a lease timestamp.
 *   3. If the existing record is already 'processed', return 'completed'.
 *   4. If the existing record is already 'processing' (claimed by another
 *      worker), check for staleness. If stale (worker crashed mid-processing),
 *      reclaim the lease. Otherwise return 'processing' to reject the duplicate.
 *
 * The atomic claim uses a conditional updateMany with status='failed' so
 * that only one concurrent worker can win the lease. Workers that lose the
 * race see 0 rows updated and treat the event as already in-flight.
 *
 * Stale-lease recovery: if an event has been 'processing' for longer than
 * PROCESSING_LEASE_MS, we atomically reclaim it. This handles worker crashes
 * without requiring manual intervention.
 */
const PROCESSING_LEASE_MS = 5 * 60 * 1000 // 5 minutes

async function beginWebhookEvent(
  provider: string,
  eventId: string,
  type: string,
  payload: unknown
): Promise<BeginResult> {
  const leaseToken = crypto.randomUUID()
  // ── Fast path: insert a brand-new event record ──
  try {
    await prisma.webhookEvent.create({
      data: {
        provider,
        provider_event_id: eventId,
        event_type: type,
        status: 'processing',
        payload: payload as any,
        attempts: 1,
        received_at: new Date(),
        lease_token: leaseToken,
      },
    })
    return { status: 'new', leaseToken }
  } catch (err: any) {
    if (err?.code !== 'P2002') throw err
  }

  // ── Slow path: an event with this provider+eventId already exists ──
  const existing = await prisma.webhookEvent.findFirst({
    where: { provider, provider_event_id: eventId },
  })
  if (!existing) {
    // Unique constraint fired but no record found — retry the insert.
    return beginWebhookEvent(provider, eventId, type, payload)
  }

  if (existing.status === 'processed') return { status: 'completed' }

  if (existing.status === 'processing') {
    // Check for stale lease (worker crashed mid-processing).
    const leaseExpired =
      existing.received_at &&
      Date.now() - new Date(existing.received_at).getTime() > PROCESSING_LEASE_MS

    if (leaseExpired) {
      // Atomically reclaim the stale lease.
      const reclaimed = await prisma.webhookEvent.updateMany({
        where: {
          provider,
          provider_event_id: eventId,
          status: 'processing',
          received_at: { lt: new Date(Date.now() - PROCESSING_LEASE_MS) },
        },
        data: {
          attempts: { increment: 1 },
          received_at: new Date(),
          lease_token: leaseToken,
        },
      })
      if (reclaimed.count > 0) {
        return { status: 'new', leaseToken }
      }
      // Another worker reclaimed it first — fall through to 'processing'.
    }
    return { status: 'processing' }
  }

  // ── CR-08 FIX: Atomically claim a failed event for retry ──
  // The conditional updateMany with status='failed' ensures only one
  // concurrent worker can win the lease. The lease is established by
  // transitioning status → 'processing' and incrementing attempts.
  const claimed = await prisma.webhookEvent.updateMany({
    where: {
      provider,
      provider_event_id: eventId,
      status: 'failed',
    },
    data: {
      status: 'processing',
      attempts: { increment: 1 },
      last_error: null,
      received_at: new Date(),
      lease_token: leaseToken,
    },
  })

  if (claimed.count === 0) {
    // Another worker claimed it between our read and this update.
    // Re-read to determine the winner's state.
    const winner = await prisma.webhookEvent.findFirst({
      where: { provider, provider_event_id: eventId },
    })
    if (winner?.status === 'processed') return { status: 'completed' }
    return { status: 'processing' }
  }

  return { status: 'new', leaseToken }
}

async function markWebhookEventProcessed(provider: string, eventId: string, leaseToken?: string) {
  if (!leaseToken) throw new Error('Webhook lease token missing')
  const result = await prisma.webhookEvent.updateMany({
    where: { provider, provider_event_id: eventId, status: 'processing', lease_token: leaseToken },
    data: {
      status: 'processed',
      processed_at: new Date(),
    },
  })
  if (result.count !== 1) throw new Error('Webhook lease completion rejected')
}

async function markWebhookEventFailed(
  provider: string,
  eventId: string,
  leaseToken: string | undefined,
  lastError: string
) {
  if (!leaseToken) throw new Error('Webhook lease token missing')
  const result = await prisma.webhookEvent.updateMany({
    where: { provider, provider_event_id: eventId, status: 'processing', lease_token: leaseToken },
    data: {
      status: 'failed',
      last_error: lastError,
      processed_at: new Date(),
    },
  })
  if (result.count !== 1) throw new Error('Webhook lease failure update rejected')
}

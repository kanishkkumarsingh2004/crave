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
import { prisma } from '@/lib/prisma'
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

  const eventId = String(event.id ?? '')
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
      await markWebhookEventFailed('RAZORPAY', eventId, 'Invalid payment payload')
      return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 })
    }

    const attempt = await prisma.paymentTransaction.findFirst({
      where: { gateway: 'RAZORPAY', razorpay_order_id: rzpOrderId },
      include: { order: true },
    })
    if (!attempt) {
      await markWebhookEventFailed('RAZORPAY', eventId, 'Unknown Razorpay order')
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
      await markWebhookEventFailed('RAZORPAY', eventId, 'Payment does not match order')
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
      await markWebhookEventFailed('RAZORPAY', eventId, err?.message ?? 'verification error')
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
    }

    await markWebhookEventProcessed('RAZORPAY', eventId)
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
    await markWebhookEventProcessed('RAZORPAY', eventId)
    return NextResponse.json({ received: true })
  } else if (
    type === 'transfer.processed' ||
    type === 'transfer.failed' ||
    type === 'transfer.reversed'
  ) {
    // Route transfer webhooks — delegate to the split service
    const { handleRouteTransferWebhook } = await import('@/lib/payments/razorpay-split')
    try {
      await handleRouteTransferWebhook(event)
    } catch (err: any) {
      await markWebhookEventFailed('RAZORPAY', eventId, err?.message ?? 'transfer webhook error')
      return NextResponse.json({ error: 'Transfer webhook failed' }, { status: 500 })
    }
    await markWebhookEventProcessed('RAZORPAY', eventId)
    return NextResponse.json({ received: true })
  } else {
    await markWebhookEventProcessed('RAZORPAY', eventId)
    return NextResponse.json({ received: true })
  }
}

// ─── Durable WebhookEvent helpers ─────────────────────────────────────────

interface BeginResult {
  status: 'new' | 'processing' | 'completed'
}

async function beginWebhookEvent(
  provider: string,
  eventId: string,
  type: string,
  payload: unknown
): Promise<BeginResult> {
  try {
    const existing = await prisma.webhookEvent.findFirst({
      where: { provider, provider_event_id: eventId },
    })

    if (existing) {
      if (existing.status === 'processed') return { status: 'completed' }
      if (existing.status === 'processing') return { status: 'processing' }
      // Failed — allow retry
    }

    await prisma.webhookEvent.create({
      data: {
        provider,
        provider_event_id: eventId,
        event_type: type,
        status: 'processing',
        payload: payload as any,
        attempts: 1,
        received_at: new Date(),
      },
    })

    return { status: 'new' }
  } catch (err: any) {
    if (err?.code === 'P2002') {
      const raceWinner = await prisma.webhookEvent.findFirst({
        where: { provider, provider_event_id: eventId },
      })
      if (raceWinner?.status === 'processed') return { status: 'completed' }
      return { status: 'processing' }
    }
    throw err
  }
}

async function markWebhookEventProcessed(provider: string, eventId: string) {
  await prisma.webhookEvent.updateMany({
    where: { provider, provider_event_id: eventId },
    data: {
      status: 'processed',
      processed_at: new Date(),
    },
  })
}

async function markWebhookEventFailed(
  provider: string,
  eventId: string,
  lastError: string
) {
  await prisma.webhookEvent.updateMany({
    where: { provider, provider_event_id: eventId },
    data: {
      status: 'failed',
      last_error: lastError,
      processed_at: new Date(),
    },
  })
}
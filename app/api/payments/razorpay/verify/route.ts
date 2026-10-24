/**
 * app/api/payments/razorpay/verify/route.ts
 *
 * POST — verify a Razorpay Checkout callback.
 *
 * Signature formula: HMAC-SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)
 *
 * Signature alone is not enough: the route fetches the payment from Razorpay and
 * verifies provider order ID, exact amount in paise, currency, and captured status.
 */

import crypto from 'node:crypto'
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { getRazorpayClient } from '@/lib/payments/razorpay-client'
import { processPaymentVerificationTx } from '@/lib/finance/payment-service'

export const runtime = 'nodejs'

function signatureMatches(expectedHex: string, receivedHex: string) {
  if (!/^[a-f0-9]+$/i.test(expectedHex) || !/^[a-f0-9]+$/i.test(receivedHex)) return false
  const a = Buffer.from(expectedHex, 'hex')
  const b = Buffer.from(receivedHex, 'hex')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request)
    const body = await request.json()
    const orderId = String(body.orderId ?? '')
    const rzpOrderId = String(body.razorpay_order_id ?? '')
    const paymentId = String(body.razorpay_payment_id ?? '')
    const signature = String(body.razorpay_signature ?? '')
    if (!orderId || !rzpOrderId || !paymentId || !signature) {
      return NextResponse.json({ error: 'Missing verification fields' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.customer_id !== actor.id && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const attempt = await prisma.paymentTransaction.findFirst({
      where: { order_id: orderId, gateway: 'RAZORPAY', razorpay_order_id: rzpOrderId },
    })
    if (!attempt) {
      return NextResponse.json({ error: 'Payment attempt/order mismatch' }, { status: 409 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) throw new Error('Razorpay secret missing')
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${rzpOrderId}|${paymentId}`)
      .digest('hex')
    if (!signatureMatches(expected, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payment: any = await getRazorpayClient().payments.fetch(paymentId)
    const snapshot = order.financial_snapshot as { customerPayablePaise?: number } | null
    const expectedPaise = order.total_amount_paise ?? snapshot?.customerPayablePaise

    if (
      payment.order_id !== rzpOrderId ||
      payment.currency !== 'INR' ||
      Number(payment.amount) !== expectedPaise ||
      Number(attempt.amount_paise) !== expectedPaise
    ) {
      return NextResponse.json({ error: 'Payment does not match Crave order' }, { status: 409 })
    }
    if (payment.status !== 'captured' || payment.captured !== true) {
      return NextResponse.json({ error: 'Payment is not captured' }, { status: 409 })
    }

    const result = await processPaymentVerificationTx({
      orderId,
      gatewayPaymentId: paymentId,
      gateway: 'RAZORPAY',
      amountPaise: Number(payment.amount),
      actorId: 'RAZORPAY_CHECKOUT_VERIFIED',
      idempotencyKey: `razorpay_verify_${paymentId}`,
      rawPayload: {
        id: payment.id,
        order_id: payment.order_id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        captured: payment.captured,
      },
    } as any)

    return NextResponse.json({
      success: true,
      orderId,
      paymentStatus: 'verified',
      alreadyVerified: result.alreadyVerified,
    })
  } catch (error) {
    console.error('[razorpay/verify] Failed', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}
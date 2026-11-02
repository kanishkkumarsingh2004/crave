/**
 * app/api/payments/razorpay/order/route.ts
 *
 * POST — create a Razorpay checkout order for an existing Crave order.
 *
 * Rules:
 * - Accepts only Crave's internal order ID. The client cannot supply amount or
 *   recipient allocations — the server derives them from the persisted snapshot.
 * - Amount is read from order.total_amount_paise (canonical paise), falling back
 *   to financial_snapshot.customerPayablePaise.
 * - Reuses only a valid existing Razorpay attempt for this exact order + amount.
 * - If Razorpay API is not configured (invalid keys / Route not enabled), the
 *   order is still created locally with status 'pending' and a clear error is
 *   returned so the frontend can inform the customer.
 */

import { NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { getRazorpayClient } from '@/lib/payments/razorpay-client'
import { CRAVEXP_DARK_STORE_ID } from '@/lib/cravexp-grocery-catalog'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const actor = await requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const orderId = typeof body.orderId === 'string' ? body.orderId : ''
    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.customer_id !== actor.id && actor.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (['cancelled', 'delivered', 'completed'].includes(order.status)) {
      return NextResponse.json({ error: 'Order is not payable' }, { status: 409 })
    }
    if (order.payment_status === 'verified') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 409 })
    }

    // Strict Invariant: Check that the restaurant exists in the database and is open
    if (!order.restaurant_id) {
      return NextResponse.json(
        { error: 'Payment rejected: Order is not associated with a valid restaurant.' },
        { status: 400 }
      )
    }

    const rest = await prisma.restaurant.findUnique({
      where: { id: order.restaurant_id },
      select: { id: true, name: true, is_open: true },
    })
    if (!rest) {
      return NextResponse.json(
        {
          error: `Payment rejected: Restaurant "${order.restaurant_id}" does not exist in the database.`,
        },
        { status: 404 }
      )
    }
    if (rest.is_open === false) {
      return NextResponse.json(
        {
          error: `Payment rejected: Restaurant "${rest.name}" is currently closed and not accepting payments.`,
        },
        { status: 400 }
      )
    }

    // Strict Invariant: Check that all items in the order exist in the database
    const rawOrderItems: any[] = Array.isArray(order.items)
      ? (order.items as any[])
      : typeof order.items === 'string'
        ? JSON.parse(order.items)
        : []

    if (rawOrderItems.length === 0) {
      return NextResponse.json(
        { error: 'Payment rejected: Order contains no items.' },
        { status: 400 }
      )
    }

    const itemIds = rawOrderItems
      .map((it: any) => it.id || it.itemId || it.menuItemId)
      .filter(Boolean)

    if (order.order_type === 'cravexp_grocery' || order.restaurant_id === CRAVEXP_DARK_STORE_ID) {
      const dbItems = await prisma.craveXPProduct.findMany({
        where: { id: { in: itemIds } },
        select: { id: true },
      })
      if (dbItems.length !== itemIds.length) {
        return NextResponse.json(
          { error: 'Payment rejected: One or more CraveXP items do not exist in the database.' },
          { status: 404 }
        )
      }
    } else {
      const dbItems = await prisma.menuItem.findMany({
        where: { id: { in: itemIds }, restaurant_id: order.restaurant_id },
        select: { id: true },
      })
      if (dbItems.length !== itemIds.length) {
        return NextResponse.json(
          {
            error:
              'Payment rejected: One or more items do not exist in the database or do not belong to the restaurant.',
          },
          { status: 404 }
        )
      }
    }

    const snapshot = order.financial_snapshot as {
      customerPayablePaise?: number
      snapshotId?: string
    } | null
    const amountPaise = order.total_amount_paise ?? snapshot?.customerPayablePaise

    if (!Number.isSafeInteger(amountPaise) || !amountPaise || amountPaise < 100) {
      return NextResponse.json({ error: 'Invalid canonical payable amount' }, { status: 409 })
    }
    if (snapshot?.customerPayablePaise != null && amountPaise !== snapshot.customerPayablePaise) {
      return NextResponse.json({ error: 'Snapshot amount mismatch' }, { status: 409 })
    }

    // Check for an existing pending/processing transaction for this exact order + amount.
    // Allows safe retry without duplicate idempotency key conflicts.
    const existing = await prisma.paymentTransaction.findFirst({
      where: {
        order_id: orderId,
        gateway: 'RAZORPAY',
        amount_paise: amountPaise,
        status: { in: ['pending', 'processing'] },
      },
      orderBy: { created_at: 'desc' },
    })
    if (existing?.razorpay_order_id) {
      return NextResponse.json({
        keyId: process.env.RAZORPAY_KEY_ID,
        razorpayOrderId: existing.razorpay_order_id,
        amount: amountPaise,
        currency: 'INR',
        internalOrderId: order.id,
        alreadyExists: true,
      })
    }

    // Attempt to create a Razorpay order. If Razorpay credentials are invalid
    // or Route is not enabled, fall back to creating a local pending intent so
    // the order can still be placed and retried once credentials are fixed.
    let rzpOrder: any = null
    let razorpayError: string | null = null

    try {
      const client = getRazorpayClient()
      rzpOrder = await client.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `crave_${order.id}`.slice(0, 40),
        notes: {
          crave_order_id: order.id,
          snapshot_id: String(snapshot?.snapshotId ?? '').slice(0, 200),
        },
      })
    } catch (err: any) {
      razorpayError =
        err?.status === 403 || err?.message?.includes('Forbidden')
          ? 'Razorpay credentials are invalid or Route is not enabled for this merchant account.'
          : err?.message || 'Unable to create Razorpay order'
      console.error('[razorpay/order] Razorpay API error:', razorpayError)
    }

    const razorpayOrderId = rzpOrder?.id ?? `local_${orderId}`
    const keyId = process.env.RAZORPAY_KEY_ID ?? null
    const uniqueIdempotencyKey = `razorpay_order_${razorpayOrderId}_${Date.now()}`

    await prisma.paymentTransaction.create({
      data: {
        idempotency_key: uniqueIdempotencyKey,
        order_id: order.id,
        gateway: 'RAZORPAY',
        razorpay_order_id: razorpayOrderId,
        amount: Math.round(amountPaise / 100), // legacy compatibility only
        amount_paise: amountPaise,
        currency: 'INR',
        status: rzpOrder ? 'pending' : 'processing',
        raw_payload: {
          razorpayError,
          rzpOrder: rzpOrder ?? null,
        },
      } as any,
    })

    if (razorpayError) {
      return NextResponse.json(
        {
          error: razorpayError,
          razorpayConfigured: false,
          internalOrderId: order.id,
          amount: amountPaise,
          currency: 'INR',
        },
        { status: 200 }
      )
    }

    return NextResponse.json({
      keyId,
      razorpayOrderId: rzpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      internalOrderId: order.id,
    })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if (authResponse) return authResponse
    console.error('[razorpay/order] Failed', error)
    return NextResponse.json({ error: 'Unable to start payment' }, { status: 500 })
  }
}

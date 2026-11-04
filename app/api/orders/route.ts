/**
 * HTTP adapter for the Orders API.
 *
 * Thin layer: authentication, rate limiting, request parsing, and NextResponse
 * handling only. All business logic lives in @/features/orders.
 */

import {
  AuthError,
  getAuthActor,
  handleAuthError,
  requireAuth,
  requireRole,
} from '@/lib/auth/auth-helpers'
import {
  createOrder,
  getOrder,
  listOrdersUseCase,
  updateOrder,
  cancelOrder,
} from '@/features/orders'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'
import { NextResponse } from 'next/server'

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json()
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function GET(request: Request) {
  return handleAuthError(async () => {
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')
    const customerId = searchParams.get('customerId')
    const vendorId = searchParams.get('vendorId')
    const vendorName = searchParams.get('vendorName')
    const driverId = searchParams.get('driverId') || searchParams.get('riderId')
    const since = searchParams.get('since')
    const available = searchParams.get('available')

    // Single order access
    if (orderId) {
      const actor = await requireAuth(request)
      const result = await getOrder({
        actor,
        orderId,
        since: since || undefined,
      })
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
      }
      return NextResponse.json({
        success: true,
        serverTime: new Date().toISOString(),
        order: result.order,
        orders: result.order ? [result.order] : [],
        driverLocation: result.driverLocation || null,
        missedEvents: result.missedEvents || [],
      })
    }

    // List orders
    const actor = await getAuthActor(request)
    const isVendorActor =
      actor?.role === 'restaurant_vendor' ||
      actor?.role === 'cravexp_store_vendor' ||
      (actor?.role as string) === 'vendor'

    if (!actor && !isVendorActor) {
      throw new AuthError('Authentication required', 401)
    }

    const result = await listOrdersUseCase({
      actor,
      customerId: customerId || undefined,
      vendorId: vendorId || undefined,
      vendorName: vendorName || undefined,
      driverId: driverId || undefined,
      available,
    })
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }
    return NextResponse.json({ success: true, orders: result.orders })
  })
}

export async function POST(request: Request) {
  return handleAuthError(async () => {
    const actor = await requireRole(request, ['user', 'admin'])

    // Account-based rate limiting
    const accountKey = getRateLimitKey(request, actor.id, 'order_create')
    const accountResult = await checkRateLimit(accountKey, 'ORDER_CREATE')
    if (!accountResult.allowed) {
      return rateLimitResponse(accountResult.resetTime, accountResult.retryAfter)
    }

    // Secondary IP-based check
    const ipResult = await checkRateLimit(
      getRateLimitKey(request, null, 'order_ip'),
      'ORDER_CREATE'
    )
    if (!ipResult.allowed) {
      return rateLimitResponse(ipResult.resetTime, ipResult.retryAfter)
    }

    const body = await parseBody(request)
    const idempotencyKey =
      request.headers.get('x-idempotency-key') ||
      request.headers.get('idempotency-key') ||
      (body.idempotency_key as string) ||
      (body.idempotencyKey as string) ||
      null

    const result = await createOrder({
      actor,
      body,
      idempotencyKey,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    const responseData = {
      success: true,
      message: 'Order created successfully!',
      order: result.order,
      orderId: result.orderId,
      billing: result.billing,
    }

    return NextResponse.json(responseData, { status: 201 })
  })
}

export async function PATCH(request: Request) {
  return handleAuthError(async () => {
    const actor = await requireAuth(request)
    const body = await parseBody(request)

    const result = await updateOrder({
      actor,
      body: {
        ...body,
        actor_ip:
          request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      },
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 500 })
    }

    return NextResponse.json({ success: true, order: result.order })
  })
}

export async function DELETE(request: Request) {
  return handleAuthError(async () => {
    const actor = await requireAuth(request)
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId') || searchParams.get('id')

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    const result = await cancelOrder({
      actor,
      orderId,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 400 })
    }

    return NextResponse.json({
      success: true,
      message: result.refundQueued
        ? 'Order cancelled within 15-second window. Refund queued for admin review.'
        : 'Order successfully cancelled.',
      refundQueued: result.refundQueued,
    })
  })
}

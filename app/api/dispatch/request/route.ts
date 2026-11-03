import { createDispatchOffers, DispatchRequestError } from '@/lib/dispatch/create-dispatch-offers'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'
import { verifyToken } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const cookieStore = await cookies()
        token =
          cookieStore.get('crave_auth_token')?.value ||
          cookieStore.get('drop_auth_token')?.value ||
          ''
      } catch {}
    }

    let actor = token ? await verifyToken(token) : null
    if (!actor && process.env.NODE_ENV === 'test' && isTestRequest(request)) {
      actor = getTestUser(request) || MOCK_TEST_VENDOR
    }
    if (!actor) {
      return NextResponse.json(
        { error: 'Authentication required for dispatch requests' },
        { status: 401 }
      )
    }

    const rateLimitKey = getRateLimitKey(request, actor.id, 'dispatch_request')
    const rateLimitResult = await checkRateLimit(rateLimitKey, 'DISPATCH_REQUEST')
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, rateLimitResult.retryAfter)
    }

    const isAllowed =
      actor.role === 'admin' ||
      actor.role === 'restaurant_vendor' ||
      actor.role === 'cravexp_store_vendor' ||
      (actor.role as string) === 'vendor'
    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Forbidden: Only vendors and administrators can initiate dispatch requests' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { orderId, vehicleType, batchSize = 3, offerTtlSeconds = 15 } = body
    if (typeof orderId !== 'string' || !orderId.trim()) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 })
    }

    const ownership = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      select: { restaurant: { select: { owner_id: true } } },
    })
    if (!ownership) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (actor.role !== 'admin' && ownership.restaurant?.owner_id !== actor.id) {
      return NextResponse.json(
        { error: 'Forbidden: order does not belong to this vendor' },
        { status: 403 }
      )
    }

    const result = await createDispatchOffers({
      orderId,
      vehicleType,
      batchSize,
      offerTtlSeconds,
    })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof DispatchRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    const message = error instanceof Error ? error.message : 'Failed to dispatch request'
    console.error('[POST /api/dispatch/request]', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

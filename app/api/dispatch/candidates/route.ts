import { NextResponse } from 'next/server'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'
import { prisma } from '@/lib/infra/prisma'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers?.get ? request.headers.get('authorization') : null
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const c = await cookies()
        token = c.get('crave_auth_token')?.value || ''
      } catch {}
    }

    let actor = token ? await verifyToken(token) : null
    if (!actor && process.env.NODE_ENV === 'test' && isTestRequest(request)) {
      actor = getTestUser(request) || MOCK_TEST_VENDOR
    }

    if (!actor) {
      return NextResponse.json(
        { error: 'Authentication required to query driver candidates' },
        { status: 401 }
      )
    }

    if (
      actor.role !== 'admin' &&
      actor.role !== 'restaurant_vendor' &&
      actor.role !== 'cravexp_store_vendor'
    ) {
      return NextResponse.json(
        { error: 'Unauthorized to query driver candidates' },
        { status: 403 }
      )
    }
    const rateLimitResult = await checkRateLimit(
      getRateLimitKey(request, actor.id, 'dispatch_candidates'),
      'DISPATCH_REQUEST'
    )
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, rateLimitResult.retryAfter)
    }
    const { searchParams } = new URL(request.url)
    const orderId = searchParams.get('orderId')?.trim()
    const vehicleType = searchParams.get('vehicleType') || undefined
    const maxRadiusKm = parseFloat(searchParams.get('maxRadiusKm') || '15')
    const minCandidates = parseInt(searchParams.get('minCandidates') || '3', 10)

    if (
      !orderId ||
      !Number.isFinite(maxRadiusKm) ||
      maxRadiusKm <= 0 ||
      maxRadiusKm > 50 ||
      !Number.isInteger(minCandidates) ||
      minCandidates <= 0 ||
      minCandidates > 20
    ) {
      return NextResponse.json(
        { error: 'A valid orderId and bounded candidate limits are required' },
        { status: 400 }
      )
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        payment_status: true,
        rider_id: true,
        restaurant: {
          select: { owner_id: true, latitude: true, longitude: true },
        },
      },
    })
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (actor.role !== 'admin' && order.restaurant?.owner_id !== actor.id) {
      return NextResponse.json(
        { error: 'Forbidden: order does not belong to this vendor' },
        { status: 403 }
      )
    }
    if (
      order.payment_status !== 'verified' ||
      order.status !== 'ready_for_pickup' ||
      order.rider_id
    ) {
      return NextResponse.json(
        { error: 'Dispatch requires a verified order that is ready for pickup and unassigned' },
        { status: 409 }
      )
    }

    const storedLatitude = order.restaurant?.latitude
    const storedLongitude = order.restaurant?.longitude
    const lat = Number(storedLatitude)
    const lng = Number(storedLongitude)
    if (
      storedLatitude == null ||
      storedLongitude == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return NextResponse.json(
        { error: 'The order restaurant does not have dispatch coordinates' },
        { status: 409 }
      )
    }

    const searchResult = await findGeofencedCandidateDrivers({
      requestId: order.id,
      pickupLat: lat,
      pickupLng: lng,
      requiredVehicleType: vehicleType,
      maxSearchRadiusKm: maxRadiusKm,
      minCandidatesRequired: minCandidates,
      acquireOfferLocks: false,
    })

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        pickupH3Cell: searchResult.pickupH3Cell,
        stageFound: searchResult.stageFound,
        candidateCount: searchResult.eligibleCandidates.length,
      },
    })
  } catch (err: any) {
    console.error('[GET /api/dispatch/candidates]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to search candidates' },
      { status: 500 }
    )
  }
}

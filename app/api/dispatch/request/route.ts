import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { verifyToken } from '@/lib/jwt'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'
import { sendDriverPushToUsers } from '@/lib/notifications/driver-push'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import crypto from 'node:crypto'

// Hard ceilings so a vendor cannot hold driver locks excessively long
// or request an unreasonably large candidate batch.
const MAX_OFFER_TTL_SECONDS = 300 // 5 minutes
const MAX_BATCH_SIZE = 20

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      try {
        const c = await cookies()
        token = c.get('crave_auth_token')?.value || c.get('drop_auth_token')?.value || ''
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

    // Rate-limit dispatch requests per authenticated vendor/actor.
    const rateLimitKey = getRateLimitKey(request, actor.id, 'dispatch_request')
    const rateLimitResult = await checkRateLimit(rateLimitKey, 'DISPATCH_REQUEST')
    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult.resetTime, rateLimitResult.retryAfter)
    }

    const roleStr = actor.role as string
    const isAllowed =
      actor.role === 'admin' ||
      actor.role === 'restaurant_vendor' ||
      actor.role === 'cravexp_store_vendor' ||
      roleStr === 'vendor'
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

    const order = await prisma.order.findUnique({
      where: { id: orderId.trim() },
      select: {
        id: true,
        restaurant_id: true,
        restaurant_name: true,
        status: true,
        payment_status: true,
        rider_id: true,
        restaurant: { select: { owner_id: true, latitude: true, longitude: true } },
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

    // Dispatch always originates from the persisted restaurant coordinates;
    // vendor-supplied coordinates are not trusted for candidate selection.
    const storedLatitude = order.restaurant?.latitude
    const storedLongitude = order.restaurant?.longitude
    const pickupLat = Number(storedLatitude)
    const pickupLng = Number(storedLongitude)
    if (
      storedLatitude == null ||
      storedLongitude == null ||
      !Number.isFinite(pickupLat) ||
      pickupLat < -90 ||
      pickupLat > 90 ||
      !Number.isFinite(pickupLng) ||
      pickupLng < -180 ||
      pickupLng > 180
    ) {
      return NextResponse.json(
        { error: 'Invalid coordinates: pickupLat must be -90..90 and pickupLng -180..180' },
        { status: 400 }
      )
    }

    // Coerce and clamp batchSize / offerTtlSeconds to hard ceilings.
    const parsedBatchSize = Number.isInteger(batchSize) && batchSize > 0 ? batchSize : 3
    const clampedBatchSize = Math.min(parsedBatchSize, MAX_BATCH_SIZE)

    const parsedTtl =
      Number.isInteger(offerTtlSeconds) && offerTtlSeconds > 0 ? offerTtlSeconds : 15
    const clampedTtl = Math.min(parsedTtl, MAX_OFFER_TTL_SECONDS)

    // The offer identifier is the canonical order ID consumed by the accept
    // endpoint. A synthetic dispatch ID cannot be claimed as an order.
    const requestId = order.id

    // 1. Perform H3 Geofenced Candidate Selection.
    //
    // CR-12: H3 owns lock acquisition, so pass offerTtlSeconds through so the
    // acquired lock TTL matches the offerExpiresAt reported below.
    const searchResult = await findGeofencedCandidateDrivers({
      requestId,
      pickupLat,
      pickupLng,
      requiredVehicleType: vehicleType,
      minCandidatesRequired: clampedBatchSize,
      offerTtlSeconds: clampedTtl,
    })

    if (searchResult.eligibleCandidates.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No eligible candidate drivers found in H3 search radius',
        requestId,
        pickupH3Cell: searchResult.pickupH3Cell,
        stageFound: searchResult.stageFound,
        alertsSentCount: 0,
        candidates: [],
      })
    }

    // 2. Alert Top N candidates.
    //
    // CR-12: The H3 candidate search (findGeofencedCandidateDrivers) already
    // atomically acquired the driver offer lock for every candidate it
    // returned. Re-acquiring here with a different TTL fails in production:
    // Redis SET NX rejects the second acquisition because the key already
    // exists, so alertedCandidates is always empty even though H3 found
    // eligible drivers.
    //
    // The in-memory dev fallback masks this: acquireDriverOfferLock returns
    // true when existingLock.requestId === requestId (atomic-lock.ts:58-60),
    // so the same code path succeeds in dev and fails in prod.
    //
    // Fix: H3 owns lock acquisition. The API route consumes the already-locked
    // results and only records the offer expiry — it does NOT re-acquire.
    const alertedCandidates = []
    const topCandidates = searchResult.eligibleCandidates.slice(0, clampedBatchSize)

    for (const candidate of topCandidates) {
      // The lock was acquired by H3 with the default TTL. Record the offer
      // expiry for the response payload; do not re-acquire.
      alertedCandidates.push({
        ...candidate,
        offerLocked: true,
        offerExpiresAt: Date.now() + clampedTtl * 1000,
      })
    }

    const candidateIds = alertedCandidates.map((candidate) => candidate.driverId)
    const dispatchAttemptId = crypto.randomUUID()
    const offerExpiresAt = new Date(Date.now() + clampedTtl * 1000)

    await prisma.$transaction([
      prisma.dispatchOffer.updateMany({
        where: { order_id: order.id, status: 'pending' },
        data: { status: 'cancelled' },
      }),
      prisma.dispatchOffer.createMany({
        data: candidateIds.map((driverId) => ({
          id: crypto.randomUUID(),
          order_id: order.id,
          driver_id: driverId,
          dispatch_attempt_id: dispatchAttemptId,
          status: 'pending',
          expires_at: offerExpiresAt,
        })),
      }),
    ])

    const safeOffer = {
      id: order.id,
      orderId: order.id,
      restaurantName: order.restaurant_name,
      status: order.status,
      offerExpiresAt: offerExpiresAt.getTime(),
    }
    await broadcast('driver_offers', {
      type: 'dispatch_offer',
      offer: safeOffer,
      recipientDriverIds: candidateIds,
    }).catch(() => {})
    await sendDriverPushToUsers(candidateIds, {
      title: 'New delivery offer',
      body: `Pickup available from ${order.restaurant_name}`,
      orderId: order.id,
      type: 'dispatch_offer',
      route: 'offers',
    }).catch((error) => console.warn('[dispatch/request] Driver push failed:', error))

    return NextResponse.json({
      success: true,
      message: `Pickup dispatch alert routed to ${alertedCandidates.length} H3 candidates`,
      requestId,
      pickupH3Cell: searchResult.pickupH3Cell,
      stageFound: searchResult.stageFound,
      alertsSentCount: alertedCandidates.length,
      dispatchAttemptId,
    })
  } catch (err: any) {
    console.error('[POST /api/dispatch/request]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to dispatch request' },
      { status: 500 }
    )
  }
}

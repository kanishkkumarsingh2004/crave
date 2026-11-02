import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { verifyToken } from '@/lib/jwt'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const {
      pickupLat,
      pickupLng,
      vehicleType,
      batchSize = 3,
      offerTtlSeconds = 15,
    } = body

    // Validate required coordinates and their ranges.
    if (typeof pickupLat !== 'number' || typeof pickupLng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required coordinates: pickupLat, pickupLng' },
        { status: 400 }
      )
    }
    if (
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

    const parsedTtl = Number.isInteger(offerTtlSeconds) && offerTtlSeconds > 0 ? offerTtlSeconds : 15
    const clampedTtl = Math.min(parsedTtl, MAX_OFFER_TTL_SECONDS)

    const requestId = `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

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

    return NextResponse.json({
      success: true,
      message: `Pickup dispatch alert routed to ${alertedCandidates.length} H3 candidates`,
      requestId,
      pickupH3Cell: searchResult.pickupH3Cell,
      stageFound: searchResult.stageFound,
      alertsSentCount: alertedCandidates.length,
      alertedCandidates,
    })
  } catch (err: any) {
    console.error('[POST /api/dispatch/request]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to dispatch request' },
      { status: 500 }
    )
  }
}

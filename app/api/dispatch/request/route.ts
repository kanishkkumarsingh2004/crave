import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { verifyToken } from '@/lib/jwt'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const { pickupLat, pickupLng, vehicleType, batchSize = 3, offerTtlSeconds = 15 } = body

    if (typeof pickupLat !== 'number' || typeof pickupLng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required coordinates: pickupLat, pickupLng' },
        { status: 400 }
      )
    }

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
      minCandidatesRequired: batchSize,
      offerTtlSeconds,
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
    const topCandidates = searchResult.eligibleCandidates.slice(0, batchSize)

    for (const candidate of topCandidates) {
      // The lock was acquired by H3 with the default TTL. Record the offer
      // expiry for the response payload; do not re-acquire.
      alertedCandidates.push({
        ...candidate,
        offerLocked: true,
        offerExpiresAt: Date.now() + offerTtlSeconds * 1000,
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

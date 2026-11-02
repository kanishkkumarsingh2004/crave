import { NextResponse } from 'next/server'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { getTestUser, isTestRequest, MOCK_TEST_VENDOR } from '@/lib/test-auth'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/infra/rate-limit'

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
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const requestId = searchParams.get('requestId') || `req_${Date.now()}`
    const vehicleType = searchParams.get('vehicleType') || undefined
    const maxRadiusKm = parseFloat(searchParams.get('maxRadiusKm') || '15')
    const minCandidates = parseInt(searchParams.get('minCandidates') || '3', 10)

    if (
      !Number.isFinite(lat) ||
      lat < -90 ||
      lat > 90 ||
      !Number.isFinite(lng) ||
      lng < -180 ||
      lng > 180 ||
      !Number.isFinite(maxRadiusKm) ||
      maxRadiusKm <= 0 ||
      maxRadiusKm > 50 ||
      !Number.isInteger(minCandidates) ||
      minCandidates <= 0 ||
      minCandidates > 20
    ) {
      return NextResponse.json(
        { error: 'Invalid or missing query parameters: lat, lng required' },
        { status: 400 }
      )
    }

    const searchResult = await findGeofencedCandidateDrivers({
      requestId,
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
        ...searchResult,
        eligibleCandidates: searchResult.eligibleCandidates.map(
          ({ name: _name, phone: _phone, ...candidate }) => candidate
        ),
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

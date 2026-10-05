import { NextResponse } from 'next/server'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'
import { tryLockDriverForOffer } from '@/lib/dispatch/atomic-lock'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      pickupLat,
      pickupLng,
      serviceType,
      vehicleType,
      batchSize = 3,
      offerTtlSeconds = 15,
    } = body

    if (typeof pickupLat !== 'number' || typeof pickupLng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required coordinates: pickupLat, pickupLng' },
        { status: 400 }
      )
    }

    const requestId = `dsp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // 1. Perform H3 Geofenced Candidate Selection
    const searchResult = findGeofencedCandidateDrivers({
      requestId,
      pickupLat,
      pickupLng,
      requiredVehicleType: vehicleType,
      minCandidatesRequired: batchSize,
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

    // 2. Alert Top N candidates with Atomic Lock
    const alertedCandidates = []
    const topCandidates = searchResult.eligibleCandidates.slice(0, batchSize)

    for (const candidate of topCandidates) {
      const locked = tryLockDriverForOffer(candidate.driverId, requestId, offerTtlSeconds * 1000)
      if (locked) {
        alertedCandidates.push({
          ...candidate,
          offerLocked: true,
          offerExpiresAt: Date.now() + offerTtlSeconds * 1000,
        })
      }
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

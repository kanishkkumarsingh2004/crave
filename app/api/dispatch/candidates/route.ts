import { NextResponse } from 'next/server'
import { findGeofencedCandidateDrivers } from '@/lib/dispatch/h3-dispatch'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const lat = parseFloat(searchParams.get('lat') || '')
    const lng = parseFloat(searchParams.get('lng') || '')
    const requestId = searchParams.get('requestId') || `req_${Date.now()}`
    const vehicleType = searchParams.get('vehicleType') || undefined
    const maxRadiusKm = parseFloat(searchParams.get('maxRadiusKm') || '15')
    const minCandidates = parseInt(searchParams.get('minCandidates') || '3', 10)

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: 'Invalid or missing query parameters: lat, lng required' },
        { status: 400 }
      )
    }

    const searchResult = findGeofencedCandidateDrivers({
      requestId,
      pickupLat: lat,
      pickupLng: lng,
      requiredVehicleType: vehicleType,
      maxSearchRadiusKm: maxRadiusKm,
      minCandidatesRequired: minCandidates,
    })

    return NextResponse.json({
      success: true,
      data: searchResult,
    })
  } catch (err: any) {
    console.error('[GET /api/dispatch/candidates]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to search candidates' },
      { status: 500 }
    )
  }
}

import { NextResponse } from 'next/server'
import { updateDriverLocation, getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'
import { requireAuthApi } from '@/lib/api-auth'

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)

    const body = await request.json()
    const { driverId: bodyDriverId, isOnline, status } = body
    const driverId = bodyDriverId || actor.id || 'driver_partner'

    const currentLoc = getDriverLocation(driverId)
    const dutyStatus = status || (isOnline ? 'ONLINE' : 'OFFLINE')

    if (currentLoc && typeof currentLoc.lat === 'number' && typeof currentLoc.lng === 'number') {
      await updateDriverLocation({
        driverId,
        lat: currentLoc.lat,
        lng: currentLoc.lng,
        status: dutyStatus,
        available: Boolean(isOnline),
        vehicleType: currentLoc.vehicleType || 'EV_SCOOTER',
      })

      await broadcast('driver_location', {
        driverId,
        lat: currentLoc.lat,
        lng: currentLoc.lng,
        status: dutyStatus,
        available: Boolean(isOnline),
        timestamp: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      success: true,
      driverId,
      isOnline: Boolean(isOnline),
      status: dutyStatus,
      updatedAt: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[POST /api/driver/status]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to update duty status' },
      { status: 500 }
    )
  }
}

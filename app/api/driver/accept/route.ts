import { NextResponse } from 'next/server'
import { isDriverLocked, releaseDriverLock } from '@/lib/dispatch/atomic-lock'
import { updateDriverLocation, getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { driverId, requestId } = body

    if (!driverId || !requestId) {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, requestId' },
        { status: 400 }
      )
    }

    // Verify driver holds valid atomic offer lock for this request
    const isLocked = isDriverLocked(driverId)
    if (!isLocked) {
      return NextResponse.json(
        { error: 'Dispatch offer expired or not assigned to this driver' },
        { status: 409 }
      )
    }

    // Release lock and mark driver ON_TRIP
    releaseDriverLock(driverId, requestId)

    const currentLocation = getDriverLocation(driverId)
    if (currentLocation) {
      await updateDriverLocation({
        driverId,
        lat: currentLocation.lat,
        lng: currentLocation.lng,
        status: 'ON_TRIP',
        available: false,
        vehicleType: currentLocation.vehicleType,
      })
    }

    // Broadcast driver acceptance to order and driver WebSocket channels
    broadcast('order_update', {
      orderId: requestId,
      driverId,
      status: 'picked_up',
      timestamp: new Date().toISOString(),
    })
    broadcast('driver_location', {
      driverId,
      status: 'ON_TRIP',
      available: false,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Dispatch offer successfully accepted',
      driverId,
      requestId,
      assignedAt: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[POST /api/driver/accept]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to accept dispatch offer' },
      { status: 500 }
    )
  }
}

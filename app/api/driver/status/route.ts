import { NextResponse } from 'next/server'
import { updateDriverLocation, getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || (await cookies()).get('drop_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null

    if (process.env.NODE_ENV !== 'test' && !actor) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { driverId: bodyDriverId, isOnline, status } = body
    const driverId =
      actor?.role === 'admin'
        ? bodyDriverId || actor?.id || 'driver_partner'
        : actor?.id || bodyDriverId || 'driver_partner'

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

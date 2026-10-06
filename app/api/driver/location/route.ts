import { NextResponse } from 'next/server'
import { updateDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const actor = token ? await verifyToken(token) : null
    if (!actor) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 })
    }

    const body = await request.json()
    const { driverId, lat, lng, status, available, vehicleType, resolution } = body

    if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, lat, lng' },
        { status: 400 }
      )
    }

    // Authorization check: Ensure requesting user is a rider (or admin) and matching driverId
    if (actor.role !== 'admin' && (actor.role !== 'rider' || actor.id !== driverId)) {
      return NextResponse.json({ error: 'Unauthorized driver location update' }, { status: 403 })
    }

    const result = await updateDriverLocation({
      driverId,
      lat,
      lng,
      status: status || 'ONLINE',
      available: available !== undefined ? Boolean(available) : true,
      vehicleType: vehicleType || 'EV_SCOOTER',
      resolution: resolution || 8,
    })

    // Broadcast driver location update to WebSocket clients (e.g. Admin Map Analytics)
    await broadcast('driver_location', {
      driverId,
      lat,
      lng,
      status: status || 'ONLINE',
      available: available !== undefined ? Boolean(available) : true,
      vehicleType: vehicleType || 'EV_SCOOTER',
      h3Cell: result.state.h3Cell,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: result.state,
      h3CellChanged: result.cellChanged,
      previousCell: result.previousCell,
    })
  } catch (err: any) {
    console.error('[POST /api/driver/location]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to update location' },
      { status: 500 }
    )
  }
}

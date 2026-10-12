import { NextResponse } from 'next/server'
import { updateDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

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
    const { driverId, orderId, lat, lng, status, available, vehicleType, resolution } = body

    if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, lat, lng' },
        { status: 400 }
      )
    }

    // P1-A FIX: Validate coordinate ranges
    const LAT_MIN = -90,
      LAT_MAX = 90,
      LNG_MIN = -180,
      LNG_MAX = 180
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
      return NextResponse.json({ error: 'Coordinates out of valid range' }, { status: 400 })
    }

    // P1-A FIX: Per-driver rate limit (max 60 updates/minute)
    const rlResult = await checkRateLimit(`gps_${driverId}`, 'GPS_UPDATE')
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.resetTime, rlResult.retryAfter)
    }

    // Authorization check: Ensure requesting user is updating their own location or is admin
    const roleStr = actor.role as string
    const isSelf = actor.id === driverId
    const isAuthorizedRider = (actor.role === 'rider' || roleStr === 'driver') && isSelf
    const isAdmin = actor.role === 'admin'

    if (!isAuthorizedRider && !isAdmin) {
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

    // Broadcast driver location update to WebSocket clients (e.g. Admin Map Analytics & Customer Track Map)
    await broadcast('driver_location', {
      driverId,
      orderId: orderId || body.orderId,
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

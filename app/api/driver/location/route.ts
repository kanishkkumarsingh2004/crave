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
      timestamp: body.timestamp || body.ts,
      orderId: orderId || body.orderId,
      status: status || 'ONLINE',
      available: available !== undefined ? Boolean(available) : true,
      vehicleType: vehicleType || 'EV_SCOOTER',
      resolution: resolution || 8,
    })

    // Broadcast driver location update to WebSocket clients (e.g. Admin Map Analytics & Customer Track Map)
    await broadcast('driver_location', {
      driverId,
      orderId: orderId || body.orderId,
      lat: result.state.lat,
      lng: result.state.lng,
      status: result.state.status,
      available: result.state.available,
      vehicleType: result.state.vehicleType,
      h3Cell: result.state.h3Cell,
      isStale: result.state.isStale || false,
      staleDurationSeconds: result.state.staleDurationSeconds || 0,
      timestamp: new Date(result.state.lastUpdated).toISOString(),
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      data: result.state,
      h3CellChanged: result.cellChanged,
      previousCell: result.previousCell,
      coalesced: result.coalesced,
      outOfOrder: result.outOfOrder || false,
      stale: result.stale || false,
      reason: result.reason,
    })
  } catch (err: any) {
    console.error('[POST /api/driver/location]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to update location' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const driverId = url.searchParams.get('driverId')
    const orderId = url.searchParams.get('orderId')

    if (!driverId && !orderId) {
      return NextResponse.json(
        { error: 'driverId or orderId parameter required' },
        { status: 400 }
      )
    }

    const { getDriverLocation } = await import('@/lib/dispatch/driver-tracker')
    let location = driverId ? getDriverLocation(driverId) : undefined

    // If not found in spatial cache or orderId provided, recover from authoritative PostgreSQL
    if (!location && (orderId || driverId)) {
      const { prisma } = await import('@/lib/prisma')
      const order = await prisma.order.findFirst({
        where: {
          ...(orderId && { id: orderId }),
          ...(driverId && { rider_id: driverId }),
        },
        select: {
          id: true,
          rider_id: true,
          driver_name: true,
          driver_phone: true,
          delivery_latitude: true,
          delivery_longitude: true,
          created_at: true,
          status: true,
        },
      })

      if (order && order.delivery_latitude && order.delivery_longitude) {
        const lastUpdated = order.created_at ? new Date(order.created_at).getTime() : Date.now()
        const ageMs = Date.now() - lastUpdated
        location = {
          driverId: order.rider_id || 'unknown',
          name: order.driver_name || 'Assigned Driver',
          phone: order.driver_phone || '',
          vehicleType: 'EV_SCOOTER',
          status: 'ON_TRIP',
          available: false,
          lat: Number(order.delivery_latitude),
          lng: Number(order.delivery_longitude),
          h3Cell: '',
          resolution: 8,
          lastUpdated,
          isStale: ageMs > 45000,
          staleDurationSeconds: Math.floor(ageMs / 1000),
        }
      }
    }

    if (!location) {
      return NextResponse.json({ success: false, error: 'Driver location unavailable' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: location })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get location' }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { updateDriverLocation } from '@/lib/dispatch/driver-tracker'
import { broadcast } from '@/lib/ws-server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    // Step 1: authenticate — resolve actor before touching any untrusted body field.
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const actor = token ? await verifyToken(token) : null
    if (!actor) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 })
    }

    // Step 2: parse body.
    const body = await request.json()
    const { driverId, orderId, lat, lng, status, available, vehicleType, resolution } = body

    if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, lat, lng' },
        { status: 400 }
      )
    }

    // Step 3: authorize — verify ownership *before* any rate-limit call so that
    // an attacker cannot consume another driver's quota by supplying a foreign
    // driverId. The rate-limit key is derived from the authenticated actor, not
    // the caller-supplied identifier.
    // CR-02 FIX: auth check moved before rate-limiting; key uses actor.id.
    const roleStr = actor.role as string
    const isSelf = actor.id === driverId
    const isAuthorizedRider = (actor.role === 'rider' || roleStr === 'driver') && isSelf
    const isAdmin = actor.role === 'admin'

    if (!isAuthorizedRider && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized driver location update' }, { status: 403 })
    }

    // Step 4: rate-limit on the authenticated actor identity (never on the
    // body-supplied driverId which is untrusted at this point).
    const rlResult = await checkRateLimit(`gps_${actor.id}`, 'GPS_UPDATE')
    if (!rlResult.allowed) {
      return rateLimitResponse(rlResult.resetTime, rlResult.retryAfter)
    }

    // Step 5: validate coordinate ranges.
    const LAT_MIN = -90,
      LAT_MAX = 90,
      LNG_MIN = -180,
      LNG_MAX = 180
    if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
      return NextResponse.json({ error: 'Coordinates out of valid range' }, { status: 400 })
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
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null
    if (!actor) {
      return NextResponse.json({ error: 'Authentication token required' }, { status: 401 })
    }

    const url = new URL(request.url)
    const driverId = url.searchParams.get('driverId')
    const orderId = url.searchParams.get('orderId')

    if (!driverId && !orderId) {
      return NextResponse.json({ error: 'driverId or orderId parameter required' }, { status: 400 })
    }

    const { prisma } = await import('@/lib/prisma')
    let order = orderId
      ? await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            customer_id: true,
            rider_id: true,
            driver_name: true,
            driver_phone: true,
            delivery_latitude: true,
            delivery_longitude: true,
            created_at: true,
            status: true,
            restaurant: { select: { owner_id: true } },
          },
        })
      : null

    if (orderId && !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (order) {
      const canRead =
        actor.role === 'admin' ||
        ((actor.role === 'rider' || actor.role === 'driver') && order.rider_id === actor.id) ||
        (actor.role === 'user' && order.customer_id === actor.id) ||
        ((actor.role === 'restaurant_vendor' || actor.role === 'cravexp_store_vendor') &&
          order.restaurant?.owner_id === actor.id)
      if (!canRead) {
        return NextResponse.json({ error: 'Forbidden: order access denied' }, { status: 403 })
      }
    } else if (
      actor.role !== 'admin' &&
      ((actor.role !== 'rider' && actor.role !== 'driver') || driverId !== actor.id)
    ) {
      return NextResponse.json(
        { error: 'Forbidden: driver location access denied' },
        { status: 403 }
      )
    }

    const effectiveDriverId = order?.rider_id || driverId
    if (driverId && order?.rider_id && driverId !== order.rider_id && actor.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: driver does not match this order' },
        { status: 403 }
      )
    }

    const { getDriverLocationDistributed } = await import('@/lib/dispatch/driver-tracker')
    let location = effectiveDriverId
      ? await getDriverLocationDistributed(effectiveDriverId)
      : undefined

    // If no current location exists, recover the assigned-order metadata before
    // attempting the older location-history fallback.
    if (!location && !order && effectiveDriverId) {
      order = await prisma.order.findFirst({
        where: {
          rider_id: effectiveDriverId,
        },
        select: {
          id: true,
          customer_id: true,
          rider_id: true,
          driver_name: true,
          driver_phone: true,
          delivery_latitude: true,
          delivery_longitude: true,
          created_at: true,
          status: true,
          restaurant: { select: { owner_id: true } },
        },
      })
    }

    const persistedLocation =
      !location && effectiveDriverId
        ? await prisma.driverLocationHistory.findFirst({
            where: { driver_id: effectiveDriverId },
            orderBy: { timestamp: 'desc' },
          })
        : null

    if (!location && persistedLocation) {
      const lastUpdated = persistedLocation.timestamp.getTime()
      const ageMs = Date.now() - lastUpdated
      location = {
        driverId: effectiveDriverId || 'unknown',
        name: order?.driver_name || 'Assigned Driver',
        phone: order?.driver_phone || '',
        vehicleType: 'EV_SCOOTER',
        status: 'ON_TRIP',
        available: false,
        lat: Number(persistedLocation.latitude),
        lng: Number(persistedLocation.longitude),
        h3Cell: persistedLocation.h3_cell,
        resolution: 8,
        lastUpdated,
        isStale: ageMs > 45000,
        staleDurationSeconds: Math.floor(ageMs / 1000),
      }
    }

    if (!location) {
      return NextResponse.json(
        { success: false, error: 'Driver location unavailable' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: location })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to get location' }, { status: 500 })
  }
}

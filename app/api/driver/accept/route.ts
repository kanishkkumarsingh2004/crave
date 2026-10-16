import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { claimOrderForDriverAtomic, dispatchPendingOutboxEvents } from '@/lib/dal'
import { acquireDriverOfferLock, releaseDriverLock } from '@/lib/dispatch/atomic-lock'
import { getDriverLocation, updateDriverLocation } from '@/lib/dispatch/driver-tracker'
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`dispatch_${clientIp}`, 'DISPATCH_ACCEPT')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const actor = await requireAuthApi(request)
    const roleStr = actor.role as string
    const isRiderRole = actor.role === 'rider' || roleStr === 'driver' || actor.role === 'admin'
    if (!isRiderRole) {
      return NextResponse.json({ error: 'Rider or driver access required' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const requestId = body.requestId || body.orderId || body.id
    const driverId =
      actor.role === 'admin' && (body.driverId || body.driver_id)
        ? body.driverId || body.driver_id
        : actor.id
    const driverName =
      actor.role === 'admin' && (body.driver_name || body.driverName)
        ? body.driver_name || body.driverName
        : actor.name || 'Verified Delivery Partner'
    const driverPhone =
      actor.role === 'admin' && (body.driver_phone || body.driverPhone)
        ? body.driver_phone || body.driverPhone
        : (actor as any)?.phone || '+91 98765 43210'

    if (!driverId || !requestId) {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, requestId' },
        { status: 400 }
      )
    }

    // Distributed advisory lock for offer acceptance
    await acquireDriverOfferLock(driverId, requestId).catch(() => true)

    try {
      const currentLocation = getDriverLocation(driverId)
      const lat = typeof body.lat === 'number' ? body.lat : currentLocation?.lat
      const lng = typeof body.lng === 'number' ? body.lng : currentLocation?.lng

      // Authoritative PostgreSQL conditional atomic claim
      const claimResult = await claimOrderForDriverAtomic({
        orderId: requestId,
        driverId,
        driverName,
        driverPhone,
        lat: typeof lat === 'number' ? lat : undefined,
        lng: typeof lng === 'number' ? lng : undefined,
      })

      if (!claimResult.success) {
        if (claimResult.conflict) {
          return NextResponse.json(
            { error: claimResult.error || 'Order has already been assigned to another driver' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: claimResult.error || 'Failed to accept dispatch offer' },
          { status: 500 }
        )
      }

      const updatedOrder = claimResult.order

      // Update in-memory & Redis spatial index to ON_TRIP
      if (typeof lat === 'number' && typeof lng === 'number') {
        await updateDriverLocation({
          driverId,
          lat,
          lng,
          status: 'ON_TRIP',
          available: false,
          vehicleType: currentLocation?.vehicleType || 'EV_SCOOTER',
        })
      }

      // Register driver assignment with internal WebSocket server
      await broadcast('__internal_assign_driver', {
        driverId,
        orderId: requestId,
      }).catch(() => {})

      // Broadcast driver acceptance to order and driver WebSocket channels
      await broadcast('order_update', {
        orderId: requestId,
        order: updatedOrder,
        driverId,
        driver_name: driverName,
        driver_phone: driverPhone,
        status: 'rider_assigned',
        timestamp: new Date().toISOString(),
      }).catch(() => {})

      await broadcast('driver_location', {
        orderId: requestId,
        driverId,
        lat,
        lng,
        status: 'ON_TRIP',
        available: false,
        timestamp: new Date().toISOString(),
      }).catch(() => {})

      // Flush transactional outbox events asynchronously
      dispatchPendingOutboxEvents().catch((outboxErr) => {
        console.warn('[POST /api/driver/accept] Outbox dispatch notice:', outboxErr)
      })

      return NextResponse.json({
        success: true,
        message: 'Dispatch offer successfully accepted',
        driverId,
        requestId,
        order: updatedOrder,
        assignedAt: new Date().toISOString(),
      })
    } finally {
      // Ensure advisory lock is released
      await releaseDriverLock(driverId, requestId).catch(() => {})
    }
  } catch (err: any) {
    const authRes = handleApiAuthError(err)
    if (authRes) return authRes
    console.error('[POST /api/driver/accept]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to accept dispatch offer' },
      { status: 500 }
    )
  }
}

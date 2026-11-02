import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { sanitizeOrderForActor, stripOrderSecrets } from '@/lib/auth/order-access'
import { claimOrderForDriverAtomic, dispatchPendingOutboxEvents } from '@/lib/dal'
import { acquireDriverOfferLock, releaseDriverLock } from '@/lib/dispatch/atomic-lock'
import { getDriverLocation, updateDriverLocation } from '@/lib/dispatch/driver-tracker'
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/lib/rate-limit'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const roleStr = actor.role as string
    const isRiderRole = actor.role === 'rider' || roleStr === 'driver' || actor.role === 'admin'
    if (!isRiderRole) {
      return NextResponse.json({ error: 'Rider or driver access required' }, { status: 403 })
    }

    // CR-06 FIX: Rate limit by authenticated driver ID, not IP.
    // An attacker rotating IPs cannot bypass dispatch rate limiting.
    const accountKey = getRateLimitKey(request, actor.id, 'dispatch_accept')
    const result = await checkRateLimit(accountKey, 'DISPATCH_ACCEPT')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
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

    // CR-13: Require successful lock ownership before accepting.
    //
    // The previous code did:
    //   await acquireDriverOfferLock(driverId, requestId).catch(() => true)
    //
    // This swallows every failure mode — lock acquired, lock already held by
    // another order, and Redis operation failed — and treats all three as
    // permission to continue. The PostgreSQL order claim below only prevents
    // two drivers claiming the *same* order; it does NOT prevent one driver
    // from accepting two *different* orders simultaneously.
    //
    // Fix: inspect the returned boolean. A false result means either the
    // driver is already locked by another request or Redis is unavailable —
    // in both cases the driver must NOT proceed.
    const lockAcquired = await acquireDriverOfferLock(driverId, requestId)
    if (!lockAcquired) {
      return NextResponse.json(
        {
          error:
            'Driver is already engaged with another dispatch offer or lock is unavailable. Please try again.',
        },
        { status: 409 }
      )
    }

    try {
      const currentLocation = getDriverLocation(driverId)

      // CR-13: Verify the driver is currently available before claiming.
      // A driver who is already ON_TRIP must not accept a second order,
      // even if the lock was somehow acquired.
      if (currentLocation && currentLocation.available === false) {
        return NextResponse.json(
          { error: 'Driver is currently on an active trip and cannot accept another order' },
          { status: 409 }
        )
      }

      const lat = typeof body.lat === 'number' ? body.lat : currentLocation?.lat
      const lng = typeof body.lng === 'number' ? body.lng : currentLocation?.lng

      // Authoritative PostgreSQL conditional atomic claim.
      // CR-13: The claim enforces one active assignment per driver via a
      // conditional update that checks no other order is currently assigned
      // to this driver (see claimOrderForDriverAtomic in lib/dal/orders.ts).
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
      // The customer's handover code is stripped — only the customer may read it.
      await broadcast('order_update', {
        type: 'rider_assigned',
        orderId: requestId,
        order: stripOrderSecrets(updatedOrder as any),
        driverId,
        driver_name: driverName,
        driver_phone: driverPhone,
        status: 'rider_assigned',
        timestamp: new Date().toISOString(),
      }).catch(() => {})

      // Remove the claimed offer from every other rider immediately. The database
      // claim above remains the source of truth if two devices accept concurrently.
      await broadcast('driver_offers', {
        type: 'offer_claimed',
        orderId: requestId,
        driverId,
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

      // CR-01 FIX: sanitize per-actor so drivers never receive delivery_otp
      // or otp_consumed_at, matching the protection already applied to the
      // WebSocket broadcast path above.
      return NextResponse.json({
        success: true,
        message: 'Dispatch offer successfully accepted',
        driverId,
        requestId,
        order: sanitizeOrderForActor(actor, updatedOrder as any),
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

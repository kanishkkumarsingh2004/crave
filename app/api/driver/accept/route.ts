import { NextResponse } from 'next/server'
import {
  isDriverLocked,
  releaseDriverLock,
  tryLockDriverForOffer,
  tryLockDriverOfferDistributed,
} from '@/lib/dispatch/atomic-lock'
import { updateDriverLocation, getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { updateOrder, findOrderById } from '@/lib/dal'
import { broadcast } from '@/lib/ws-server'
import { getApiActor, requireAuthApi } from '@/lib/api-auth'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const result = await checkRateLimit(`dispatch_${clientIp}`, 'DISPATCH_ACCEPT')
    if (!result.allowed) {
      return rateLimitResponse(result.resetTime, result.retryAfter)
    }

    const actor = await requireAuthApi(request)

    const body = await request.json().catch(() => ({}))
    const requestId = body.requestId || body.orderId || body.id
    const driverId = body.driverId || body.driver_id || actor.id || 'driver_partner'
    const driverName =
      body.driver_name || body.driverName || actor.name || 'Verified Delivery Partner'
    const driverPhone =
      body.driver_phone || body.driverPhone || (actor as any)?.phone || '+91 98765 43210'

    if (!driverId || !requestId) {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, requestId' },
        { status: 400 }
      )
    }

    // CR-018: Atomic distributed lock for offer acceptance
    // Use distributed lock to prevent race conditions across instances
    const lockAcquired = await tryLockDriverOfferDistributed(driverId, requestId)
    if (!lockAcquired) {
      return NextResponse.json(
        { error: 'Offer no longer available or already accepted by another driver' },
        { status: 409 }
      )
    }

    try {
      // Release offer lock and mark driver ON_TRIP
      releaseDriverLock(driverId, requestId)

      const currentLocation = getDriverLocation(driverId)
      const lat = typeof body.lat === 'number' ? body.lat : currentLocation?.lat
      const lng = typeof body.lng === 'number' ? body.lng : currentLocation?.lng

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

      // Persist order update in DB with conditional check
      let updatedOrder = null
      try {
        const existing = await findOrderById(requestId)
        if (existing) {
          if (
            existing.driver_name &&
            existing.driver_name !== 'Unassigned' &&
            existing.driver_name !== driverName
          ) {
            return NextResponse.json(
              { error: 'Order has already been assigned to another driver' },
              { status: 409 }
            )
          }
          updatedOrder = await updateOrder(requestId, {
            status: 'rider_assigned',
            driver_name: driverName,
            driver_phone: driverPhone,
          })
        }
      } catch (dbErr) {
        console.warn('[POST /api/driver/accept] DB update notice:', dbErr)
      }

      // Broadcast driver acceptance to order and driver WebSocket channels
      await broadcast('order_update', {
        orderId: requestId,
        order: updatedOrder,
        driverId,
        driver_name: driverName,
        driver_phone: driverPhone,
        status: 'rider_assigned',
        timestamp: new Date().toISOString(),
      })

      await broadcast('driver_location', {
        orderId: requestId,
        driverId,
        lat,
        lng,
        status: 'ON_TRIP',
        available: false,
        timestamp: new Date().toISOString(),
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
      // Ensure lock is released even if an error occurs
      releaseDriverLock(driverId, requestId)
    }
  } catch (err: any) {
    console.error('[POST /api/driver/accept]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to accept dispatch offer' },
      { status: 500 }
    )
  }
}

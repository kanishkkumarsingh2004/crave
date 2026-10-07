import { NextResponse } from 'next/server'
import {
  isDriverLocked,
  releaseDriverLock,
  tryLockDriverForOffer,
} from '@/lib/dispatch/atomic-lock'
import { updateDriverLocation, getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { updateOrder, findOrderById } from '@/lib/dal'
import { broadcast } from '@/lib/ws-server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''
    const actor = token ? await verifyToken(token) : null

    const body = await request.json().catch(() => ({}))
    const requestId = body.requestId || body.orderId || body.id
    const driverId = body.driverId || body.driver_id || actor?.id || 'driver_partner'
    const driverName =
      body.driver_name || body.driverName || actor?.name || 'Verified Delivery Partner'
    const driverPhone =
      body.driver_phone || body.driverPhone || (actor as any)?.phone || '+91 98765 43210'

    if (!driverId || !requestId) {
      return NextResponse.json(
        { error: 'Missing required parameters: driverId, requestId' },
        { status: 400 }
      )
    }

    // Ensure driver is locked for this offer request
    if (!isDriverLocked(driverId)) {
      tryLockDriverForOffer(driverId, requestId)
    }

    // Release offer lock and mark driver ON_TRIP
    releaseDriverLock(driverId, requestId)

    const currentLocation = getDriverLocation(driverId)
    const lat = typeof body.lat === 'number' ? body.lat : (currentLocation?.lat ?? 12.679898)
    const lng = typeof body.lng === 'number' ? body.lng : (currentLocation?.lng ?? 77.469493)

    await updateDriverLocation({
      driverId,
      lat,
      lng,
      status: 'ON_TRIP',
      available: false,
      vehicleType: currentLocation?.vehicleType || 'EV_SCOOTER',
    })

    // Persist order update in DB
    let updatedOrder = null
    try {
      const existing = await findOrderById(requestId)
      if (existing) {
        if (existing.driver_name && existing.driver_name !== 'Unassigned' && existing.driver_name !== driverName) {
          return NextResponse.json({ error: 'Order has already been assigned to another driver' }, { status: 409 })
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
  } catch (err: any) {
    console.error('[POST /api/driver/accept]', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to accept dispatch offer' },
      { status: 500 }
    )
  }
}

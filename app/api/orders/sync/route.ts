import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { handleAuthError, requireAuth } from '@/lib/auth-helpers'
import { canReadOrder, getCustomerOrderScope, sanitizeOrderForActor } from '@/lib/auth/order-access'

export async function GET(request: Request) {
  try {
    const actor = await requireAuth(request)
    const url = new URL(request.url)
    const orderId = url.searchParams.get('orderId')
    const customerId = url.searchParams.get('customerId')
    const sinceParam = url.searchParams.get('since')

    if (!orderId && !customerId) {
      return NextResponse.json(
        { error: 'orderId or customerId required for state recovery' },
        { status: 400 }
      )
    }

    let sinceDate: Date | null = null
    if (sinceParam) {
      const parsed = isNaN(Number(sinceParam)) ? new Date(sinceParam) : new Date(Number(sinceParam))
      if (!isNaN(parsed.getTime())) {
        sinceDate = parsed
      }
    }

    if (orderId) {
      // Authoritative PostgreSQL Order fetch
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      })

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 })
      }
      if (!canReadOrder(actor, order)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Authoritative Driver Location (In-memory spatial index + PostgreSQL fallback)
      let driverLocation = order.rider_id ? getDriverLocation(order.rider_id) : undefined

      if (!driverLocation && order.delivery_latitude && order.delivery_longitude) {
        const lastUpdated = order.created_at ? new Date(order.created_at).getTime() : Date.now()
        const ageMs = Date.now() - lastUpdated
        driverLocation = {
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

      // Recover missed events from Transactional Outbox
      const missedEvents = await prisma.orderOutbox.findMany({
        where: {
          order_id: orderId,
          ...(sinceDate && { created_at: { gt: sinceDate } }),
        },
        orderBy: { created_at: 'asc' },
        take: 50,
      })

      return NextResponse.json({
        success: true,
        serverTime: new Date().toISOString(),
        order: sanitizeOrderForActor(actor, order),
        driverLocation: driverLocation || null,
        missedEvents: missedEvents.map((evt) => ({
          id: evt.id,
          eventType: evt.event_type,
          payload: typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload,
          createdAt: evt.created_at.toISOString(),
        })),
      })
    }

    const scopedCustomerId = getCustomerOrderScope(actor, customerId)
    if (!scopedCustomerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Customer-level sync: customers are always scoped to their authenticated identity.
    const orders = await prisma.order.findMany({
      where: {
        customer_id: scopedCustomerId,
      },
      orderBy: { created_at: 'desc' },
      take: 10,
    })

    return NextResponse.json({
      success: true,
      serverTime: new Date().toISOString(),
      orders: orders.map((order) => sanitizeOrderForActor(actor, order)),
    })
  } catch (err: unknown) {
    console.error('[GET /api/orders/sync]', err)
    return handleAuthError(err)
  }
}

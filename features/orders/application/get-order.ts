/**
 * Application use case: Get a single order by ID.
 * Pure business orchestration — no HTTP response handling.
 */

import { prisma } from '@/lib/infra/prisma'
import { findOrderById } from '@/lib/dal'
import { getDriverLocation } from '@/lib/dispatch/driver-tracker'
import { sanitizeOrderForActor } from '@/lib/auth/order-access'
import type { JWTPayload } from '@/lib/jwt'
import type { OrderActor, GetOrderResult } from '../domain/order.types'
import {
  canReadOrder,
  isVendorRole,
  isAdminRole,
  DELIVERY_CONFIRMATION_STATUSES,
} from '../domain/order-rules'

export interface GetOrderInput {
  actor: OrderActor
  orderId: string
  since?: string | null
}

export async function getOrder(input: GetOrderInput): Promise<GetOrderResult> {
  const { actor, orderId, since } = input

  let order: any = null
  try {
    order = await findOrderById(orderId)
  } catch {
    order = null
  }
  if (!order) {
    return { success: true, order: null }
  }

  // Authorization check
  if (!canReadOrder(actor, order)) {
    return {
      success: false,
      error: 'Unauthorized to view this order',
      statusCode: 403,
    }
  }

  // For vendor queries, only show approved orders
  const isVendorActor = isVendorRole(actor.role)
  const isApproved =
    order.payment_status === 'verified' ||
    !['payment_pending', 'payment_submitted'].includes(order.status)

  if (isVendorActor && !isApproved) {
    return { success: true, order: null }
  }

  // Missed outbox events (since param)
  let missedEvents: any[] = []
  if (since) {
    try {
      const parsedSince = isNaN(Number(since)) ? new Date(since) : new Date(Number(since))
      if (!isNaN(parsedSince.getTime())) {
        missedEvents = await prisma.orderOutbox.findMany({
          where: { order_id: orderId, created_at: { gt: parsedSince } },
          orderBy: { created_at: 'asc' },
          take: 50,
        })
      }
    } catch (e) {
      console.error('[getOrder] Failed to fetch missed outbox events:', e)
    }
  }

  // Driver location
  let driverLocation: any = null
  if (order.rider_id) {
    try {
      driverLocation = (await getDriverLocation(order.rider_id)) || null
    } catch {}
  }

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

  return {
    success: true,
    order: sanitizeOrderForActor(actor as unknown as JWTPayload, order),
    driverLocation: driverLocation || null,
    missedEvents: missedEvents.map((evt) => ({
      id: evt.id,
      eventType: evt.event_type,
      payload: typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload,
      createdAt: evt.created_at.toISOString(),
    })),
  }
}

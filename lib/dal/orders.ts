/**
 * Database Access Layer — Orders
 * Requires Prisma PostgreSQL connection to be available.
 */
import { prisma } from '@/lib/prisma'
import type { OrderStatus } from '@prisma/client'
import { isValidTransition } from '@/lib/order-state-machine'
import { broadcast } from '@/lib/ws-server'

// ─── Queries ─────────────────────────────────────────────

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: { customer: true, restaurant: true },
  })
}

// In-memory short-lived cache to deduplicate simultaneous requests and cache owner mappings
const restOwnerCache = new Map<string, { ids: string[]; expiresAt: number }>()
const listOrdersCache = new Map<string, { data: any[]; expiresAt: number }>()

export function invalidateOrdersCache() {
  listOrdersCache.clear()
  restOwnerCache.clear()
}

export async function listOrders(filters?: {
  customerId?: string
  restaurantId?: string
  restaurantName?: string
  driverId?: string
  riderId?: string
  status?: OrderStatus
  onlyApprovedForVendor?: boolean
  includeAvailableForRider?: boolean
  limit?: number
}) {
  const cacheKey = JSON.stringify(filters || {})
  const cached = listOrdersCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data
  }

  const where: any = {}

  if (filters?.customerId) {
    where.customer_id = filters.customerId
  }

  if (filters?.driverId || filters?.riderId) {
    const driverId = filters.driverId || filters.riderId
    if (filters?.includeAvailableForRider) {
      where.OR = [
        { rider_id: driverId },
        {
          rider_id: null,
          status: {
            in: ['ready_for_pickup', 'sent_to_vendor', 'preparing', 'packing'] as OrderStatus[],
          },
          payment_status: 'verified',
        },
      ]
    } else {
      where.rider_id = driverId
    }
  }

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.restaurantId || filters?.restaurantName) {
    let restIds: string[] = filters?.restaurantId ? [filters.restaurantId] : []
    const ownerCacheKey = `${filters?.restaurantId || ''}_${filters?.restaurantName || ''}`
    const cachedOwner = restOwnerCache.get(ownerCacheKey)

    if (cachedOwner && cachedOwner.expiresAt > Date.now()) {
      restIds = cachedOwner.ids
    } else if (filters?.restaurantId) {
      try {
        const owned = await prisma.restaurant.findMany({
          where: {
            OR: [
              { id: filters.restaurantId },
              { owner_id: filters.restaurantId },
              ...(filters.restaurantName ? [{ name: filters.restaurantName }] : []),
            ],
          },
          select: { id: true },
        })
        const found = owned.map((r) => r.id)
        restIds = Array.from(new Set([...restIds, ...found]))
        restOwnerCache.set(ownerCacheKey, { ids: restIds, expiresAt: Date.now() + 60000 })
      } catch (e) {
        // P1.3 FIX: Log the DB error rather than silently swallowing it.
        // We fall through with the original restaurantId so the orders
        // query is still scoped correctly even if owner-expansion fails.
        console.error(
          '[listOrders] restaurant owner expansion failed:',
          e instanceof Error ? e.message : e
        )
      }
    }

    const vendorConditions: any[] = []
    if (restIds.length > 0) {
      vendorConditions.push({ restaurant_id: { in: restIds } })
    }
    if (filters?.restaurantName) {
      vendorConditions.push({
        restaurant_name: { contains: filters.restaurantName, mode: 'insensitive' },
      })
    }

    if (where.OR) {
      where.AND = [{ OR: where.OR }, { OR: vendorConditions }]
      delete where.OR
    } else if (vendorConditions.length === 1 && restIds.length === 1 && !filters?.restaurantName) {
      where.restaurant_id = restIds[0]
    } else if (vendorConditions.length > 0) {
      where.OR = vendorConditions
    }
  }

  if (filters?.onlyApprovedForVendor) {
    const approvedCondition = {
      OR: [
        { payment_status: 'verified' },
        {
          status: {
            in: [
              'sent_to_vendor',
              'preparing',
              'packing',
              'ready_for_pickup',
              'rider_assigned',
              'picked_up',
              'out_for_delivery',
              'delivered',
              'completed',
            ] as OrderStatus[],
          },
        },
      ],
    }

    if (where.AND) {
      where.AND.push(approvedCondition)
    } else if (where.OR) {
      where.AND = [{ OR: where.OR }, approvedCondition]
      delete where.OR
    } else {
      where.AND = [approvedCondition]
    }
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: Math.min(filters?.limit ?? 50, 100), // Max 100, default 50
  })

  listOrdersCache.set(cacheKey, { data: orders, expiresAt: Date.now() + 3000 })
  return orders
}

export async function countOrders(filters?: {
  customerId?: string
  restaurantId?: string
  status?: OrderStatus
}) {
  try {
    return await prisma.order.count({
      where: {
        ...(filters?.customerId && { customer_id: filters.customerId }),
        ...(filters?.restaurantId && { restaurant_id: filters.restaurantId }),
        ...(filters?.status && { status: filters.status }),
      },
    })
  } catch {
    const list = await listOrders(filters)
    return list.length
  }
}

// ─── Mutations ───────────────────────────────────────────

export async function createOrder(data: {
  id: string
  customer_id?: string
  customer_name: string
  customer_phone?: string
  customer_address?: string
  restaurant_id?: string
  restaurant_name: string
  order_type?: string
  items: any
  subtotal: number
  packaging_fee?: number
  delivery_fee?: number
  platform_fee?: number
  handling_fee?: number
  gst?: number
  total_amount: number
  status: OrderStatus
  payment_method?: string
  delivery_otp?: string
  tip?: number
  discount_amount?: number
  coupon_code?: string
  commission_amount?: number
  markup_amount?: number
  restaurant_payout?: number
  platform_revenue?: number
  utr_ref?: string
  customer_vpa?: string
  // CR-004: Immutable canonical financial snapshot
  financial_snapshot?: any
}) {
  const { utr_ref, customer_vpa, ...prismaData } = data
  const created = await prisma.order.create({ data: prismaData as any })
  invalidateOrdersCache()
  return created
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const result = await transitionOrderStatusAtomic({ orderId: id, toStatus: status })
  if (!result.success) {
    if (result.conflict) {
      throw Object.assign(new Error(result.error || 'Concurrent order modification conflict'), {
        statusCode: 409,
      })
    }
    throw new Error(result.error || `Failed to transition order status to ${status}`)
  }
  return result.order
}

export async function updateOrder(
  id: string,
  data: {
    status?: OrderStatus
    rider_id?: string
    driver_name?: string
    driver_phone?: string
    delivery_latitude?: number
    delivery_longitude?: number
    delivered_at?: Date
    picker_name?: string
    items?: any
  }
) {
  const updated = await prisma.order.update({ where: { id }, data })
  invalidateOrdersCache()
  return updated
}

// ─── Concurrency-Safe Mutations & Transactional Outbox ────────────────────────

export interface ClaimOrderResult {
  success: boolean
  order?: any
  error?: string
  conflict?: boolean
}

/**
 * Concurrency-safe driver assignment using atomic PostgreSQL conditional updates.
 * - Enforces rider_id IS NULL or rider_id IS driverId (idempotent).
 * - Enforces order is in an assignable fulfillment state.
 * - Writes an OrderOutbox event within the exact same database transaction.
 * - Prevents multiple drivers from claiming the same order.
 */
export async function claimOrderForDriverAtomic(params: {
  orderId: string
  driverId: string
  driverName: string
  driverPhone: string
  lat?: number
  lng?: number
}): Promise<ClaimOrderResult> {
  const { orderId, driverId, driverName, driverPhone, lat, lng } = params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
        include: { customer: true, restaurant: true },
      })

      if (!existing) {
        return { success: false, error: 'Order not found', conflict: false }
      }

      // Check if another driver already claimed this order
      if (existing.rider_id && existing.rider_id !== driverId) {
        return {
          success: false,
          conflict: true,
          error: 'Order has already been claimed by another driver',
        }
      }

      // If already claimed by this exact driver (idempotent re-acceptance)
      if (existing.rider_id === driverId) {
        return { success: true, order: existing, conflict: false }
      }

      // Verify eligible status for assignment
      const validStatusesForClaim: OrderStatus[] = [
        'sent_to_vendor',
        'preparing',
        'packing',
        'ready_for_pickup',
        'rider_assigned',
      ]
      if (!validStatusesForClaim.includes(existing.status as OrderStatus)) {
        return {
          success: false,
          conflict: true,
          error: `Order in state "${existing.status}" cannot be claimed by a driver`,
        }
      }

      // Atomic conditional update
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          OR: [{ rider_id: null }, { rider_id: driverId }],
          status: { in: validStatusesForClaim },
        },
        data: {
          status: 'rider_assigned',
          rider_id: driverId,
          driver_name: driverName,
          driver_phone: driverPhone,
          ...(lat != null && { delivery_latitude: lat }),
          ...(lng != null && { delivery_longitude: lng }),
        },
      })

      if (updated.count === 0) {
        // Race condition lost to a concurrent driver
        return {
          success: false,
          conflict: true,
          error: 'Order has already been claimed by another driver',
        }
      }

      const assignedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { customer: true, restaurant: true },
      })

      // Transactional Outbox: Persist durable event in PostgreSQL
      await tx.orderOutbox.create({
        data: {
          order_id: orderId,
          event_type: 'order_update',
          payload: {
            orderId,
            driverId,
            driver_name: driverName,
            driver_phone: driverPhone,
            status: 'rider_assigned',
            timestamp: new Date().toISOString(),
          },
          status: 'pending',
        },
      })

      return { success: true, order: assignedOrder, conflict: false }
    })

    invalidateOrdersCache()
    return result
  } catch (err: any) {
    console.error('[claimOrderForDriverAtomic] DB Transaction error:', err)
    return {
      success: false,
      error: err?.message || 'Database transaction failed during driver assignment',
      conflict: false,
    }
  }
}

export interface TransitionOrderResult {
  success: boolean
  order?: any
  error?: string
  conflict?: boolean
}

/**
 * Concurrency-safe validated order status transition with optimistic locking
 * and transactional outbox recording.
 */
export async function transitionOrderStatusAtomic(params: {
  orderId: string
  toStatus: OrderStatus
  expectedFromStatus?: OrderStatus
  actorId?: string
  actorRole?: string
  extraData?: {
    driver_name?: string
    driver_phone?: string
    rider_id?: string
    delivery_latitude?: number
    delivery_longitude?: number
    delivered_at?: Date
    otp_consumed_at?: Date
    items?: any
  }
}): Promise<TransitionOrderResult> {
  const { orderId, toStatus, expectedFromStatus, actorId, actorRole, extraData } = params

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({
        where: { id: orderId },
      })

      if (!existing) {
        return { success: false, error: 'Order not found', conflict: false }
      }

      const currentStatus = existing.status as OrderStatus

      // Validate status match if expected from status is specified
      if (expectedFromStatus && currentStatus !== expectedFromStatus) {
        return {
          success: false,
          conflict: true,
          error: `Order status mismatch: expected "${expectedFromStatus}" but was "${currentStatus}"`,
        }
      }

      // Reject illegal transitions using state machine
      if (!isValidTransition(currentStatus, toStatus)) {
        return {
          success: false,
          error: `Illegal order status transition: "${currentStatus}" → "${toStatus}"`,
          conflict: false,
        }
      }

      // Idempotent no-op check
      if (currentStatus === toStatus && !extraData) {
        return { success: true, order: existing, conflict: false }
      }

      const updateData: any = {
        status: toStatus,
        ...(toStatus === 'completed' || toStatus === 'delivered'
          ? { delivered_at: new Date() }
          : {}),
        ...(extraData || {}),
      }

      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: currentStatus,
        },
        data: updateData,
      })

      if (updated.count === 0) {
        return {
          success: false,
          conflict: true,
          error: 'Order was updated by a concurrent request. Please retry.',
        }
      }

      const updatedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { customer: true, restaurant: true },
      })

      // Transactional outbox event
      await tx.orderOutbox.create({
        data: {
          order_id: orderId,
          event_type: 'order_update',
          payload: {
            orderId,
            status: toStatus,
            previousStatus: currentStatus,
            actorId: actorId || null,
            actorRole: actorRole || null,
            timestamp: new Date().toISOString(),
          },
          status: 'pending',
        },
      })

      return { success: true, order: updatedOrder, conflict: false }
    })

    invalidateOrdersCache()
    return result
  } catch (err: any) {
    console.error('[transitionOrderStatusAtomic] DB Error:', err)
    return {
      success: false,
      error: err?.message || 'Database error during order transition',
      conflict: false,
    }
  }
}

/**
 * Dispatches pending outbox events across WebSocket & Redis Pub/Sub,
 * updating outbox statuses atomically in PostgreSQL.
 */
export async function dispatchPendingOutboxEvents(batchSize: number = 25): Promise<number> {
  try {
    const pendingEvents = await prisma.orderOutbox.findMany({
      where: { status: 'pending' },
      orderBy: { created_at: 'asc' },
      take: batchSize,
    })

    if (pendingEvents.length === 0) return 0

    let dispatchedCount = 0

    for (const evt of pendingEvents) {
      try {
        const payload = typeof evt.payload === 'string' ? JSON.parse(evt.payload) : evt.payload
        await broadcast(evt.event_type, payload)

        await prisma.orderOutbox.update({
          where: { id: evt.id },
          data: {
            status: 'sent',
            processed_at: new Date(),
          },
        })
        dispatchedCount++
      } catch (sendErr: any) {
        await prisma.orderOutbox.update({
          where: { id: evt.id },
          data: {
            attempts: { increment: 1 },
            last_error: sendErr?.message || String(sendErr),
            status: evt.attempts >= 5 ? 'failed' : 'pending',
          },
        })
      }
    }

    return dispatchedCount
  } catch (err) {
    console.warn('[dispatchPendingOutboxEvents] Warning:', err)
    return 0
  }
}

// ─── Aggregations ────────────────────────────────────────

export async function getOrdersRevenue(restaurantId?: string) {
  try {
    const result = await prisma.order.aggregate({
      where: {
        status: { in: ['completed'] },
        ...(restaurantId && { restaurant_id: restaurantId }),
      },
      _sum: { total_amount: true, subtotal: true },
      _count: true,
    })
    return {
      totalRevenue: result._sum.total_amount || 0,
      foodRevenue: result._sum.subtotal || 0,
      orderCount: result._count,
    }
  } catch {
    const orders = await listOrders({ restaurantId, status: 'completed' as OrderStatus })
    const totalRevenue = orders.reduce(
      (sum: number, o: any) => sum + (Number(o.total_amount) || 0),
      0
    )
    const foodRevenue = orders.reduce((sum: number, o: any) => sum + (Number(o.subtotal) || 0), 0)
    return { totalRevenue, foodRevenue, orderCount: orders.length }
  }
}

export async function deleteOrder(
  orderId: string,
  actorId?: string,
  actorRole?: string
): Promise<{ success: boolean; error?: string; deletedOrder?: any }> {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: orderId },
    })

    if (!existing) {
      return { success: false, error: 'Order not found' }
    }

    if (actorRole && actorRole !== 'admin') {
      if (actorRole === 'user' || actorRole === 'customer') {
        if (existing.customer_id && existing.customer_id !== actorId) {
          return { success: false, error: 'Unauthorized to delete this order' }
        }

        // Strict 30-second cancellation window restriction
        if (existing.created_at) {
          const orderAgeMs = Date.now() - new Date(existing.created_at).getTime()
          const MAX_CANCELLATION_WINDOW_MS = 30 * 1000 // 30 seconds
          if (orderAgeMs > MAX_CANCELLATION_WINDOW_MS) {
            return {
              success: false,
              error:
                'Order cancellation window expired. Orders can only be cancelled within 30 seconds of placement.',
            }
          }
        }
      }
    }

    // Clean up related non-cascading or outbox records in transaction
    await prisma.$transaction(async (tx) => {
      await tx.paymentReview.deleteMany({
        where: { order_id: orderId },
      })
      await tx.orderOutbox.deleteMany({
        where: { order_id: orderId },
      })
      await tx.adminOverrideLog.deleteMany({
        where: { order_id: orderId },
      })
      await tx.order.delete({
        where: { id: orderId },
      })
    })

    listOrdersCache.clear()
    return { success: true, deletedOrder: existing }
  } catch (err: any) {
    console.error('[deleteOrder] Error deleting order:', err)
    return { success: false, error: err?.message || 'Failed to delete order' }
  }
}

/**
 * Database Access Layer — Orders
 * Requires Prisma PostgreSQL connection to be available.
 */
import { prisma } from '@/lib/infra/prisma'
import type { Prisma, OrderStatus } from '@prisma/client'
import { isValidTransition } from '@/lib/catalog/order-state-machine'

// ─── Queries ─────────────────────────────────────────────

export const SAFE_ORDER_CUSTOMER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
} satisfies Prisma.UserSelect

export const SAFE_ORDER_RESTAURANT_SELECT = {
  id: true,
  name: true,
  cuisine: true,
  rating: true,
  address: true,
  image: true,
  is_open: true,
  is_dark_store: true,
  delivery_minutes: true,
  latitude: true,
  longitude: true,
  phone: true,
} satisfies Prisma.RestaurantSelect

export async function findOrderById(id: string) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      customer: { select: SAFE_ORDER_CUSTOMER_SELECT },
      restaurant: { select: SAFE_ORDER_RESTAURANT_SELECT },
      refunds: {
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          amount_paise: true,
          created_at: true,
          processed_at: true,
          provider_confirmed_at: true,
        },
      },
    },
  })
}

// In-memory short-lived cache to deduplicate simultaneous non-offer requests.
const listOrdersCache = new Map<string, { data: any[]; expiresAt: number }>()

export function invalidateOrdersCache() {
  listOrdersCache.clear()
}

/**
 * A driver may read assigned orders and only the unassigned orders that were
 * explicitly offered to that driver and are still within their offer window.
 * The database relation is part of the authorization predicate; Redis locks
 * and broadcast payloads are coordination/UI mechanisms, not read grants.
 */
export function buildDriverOrderVisibilityFilter(
  driverId: string,
  now = new Date()
): Prisma.OrderWhereInput {
  return {
    OR: [
      { rider_id: driverId },
      {
        rider_id: null,
        status: {
          in: ['ready_for_pickup', 'sent_to_vendor', 'preparing', 'packing'] as OrderStatus[],
        },
        payment_status: 'verified',
        dispatch_offers: {
          some: {
            driver_id: driverId,
            status: 'pending',
            expires_at: { gt: now },
          },
        },
      },
    ],
  }
}

/**
 * Restaurant IDs are authoritative for scoped vendor reads. Name matching is
 * retained only for admin discovery when no exact ID was supplied.
 */
export function buildRestaurantOrderFilter(filters: {
  restaurantId?: string
  restaurantName?: string
}): Prisma.OrderWhereInput | null {
  if (filters.restaurantId) {
    return { restaurant_id: filters.restaurantId }
  }
  if (filters.restaurantName) {
    return {
      restaurant_name: { contains: filters.restaurantName, mode: 'insensitive' },
    }
  }
  return null
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
  // Offer visibility depends on the current time. Do not serve an offer-based
  // driver result from the cache after its durable offer has expired.
  const cacheable = !filters?.includeAvailableForRider
  if (cacheable) {
    const cached = listOrdersCache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data
    }
  }

  const where: any = {}

  if (filters?.customerId) {
    where.customer_id = filters.customerId
  }

  if (filters?.driverId || filters?.riderId) {
    const driverId = filters.driverId || filters.riderId
    if (driverId) {
      if (filters?.includeAvailableForRider) {
        where.OR = buildDriverOrderVisibilityFilter(driverId).OR
      } else {
        where.rider_id = driverId
      }
    }
  }

  if (filters?.status) {
    where.status = filters.status
  }

  if (filters?.restaurantId || filters?.restaurantName) {
    const restaurantFilter = buildRestaurantOrderFilter(filters)

    if (where.OR && restaurantFilter) {
      where.AND = [{ OR: where.OR }, restaurantFilter]
      delete where.OR
    } else if (restaurantFilter) {
      Object.assign(where, restaurantFilter)
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
    include: {
      restaurant: { select: SAFE_ORDER_RESTAURANT_SELECT },
      refunds: {
        orderBy: { created_at: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          amount: true,
          amount_paise: true,
          created_at: true,
          processed_at: true,
          provider_confirmed_at: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: Math.min(filters?.limit ?? 50, 100), // Max 100, default 50
  })

  if (cacheable) {
    listOrdersCache.set(cacheKey, { data: orders, expiresAt: Date.now() + 3000 })
  }
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
  const { customer_vpa, ...prismaData } = data
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
  unauthorized?: boolean
  offerRecipientIds?: string[]
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
        include: {
          customer: { select: SAFE_ORDER_CUSTOMER_SELECT },
          restaurant: { select: SAFE_ORDER_RESTAURANT_SELECT },
        },
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

      // If already claimed by this exact driver (idempotent re-acceptance) —
      // must be checked BEFORE the one-active-assignment guard below, otherwise
      // a driver re-accepting their own order would be incorrectly rejected.
      if (existing.rider_id === driverId) {
        return { success: true, order: existing, conflict: false }
      }

      const now = new Date()
      const validOffer = await tx.dispatchOffer.findFirst({
        where: {
          order_id: orderId,
          driver_id: driverId,
          status: 'pending',
          expires_at: { gt: now },
        },
        orderBy: { created_at: 'desc' },
      })
      if (!validOffer) {
        return {
          success: false,
          conflict: false,
          unauthorized: true,
          error: 'No valid dispatch offer exists for this driver and order',
        }
      }

      const offerRecipients = await tx.dispatchOffer.findMany({
        where: { order_id: orderId, status: 'pending', expires_at: { gt: now } },
        select: { driver_id: true },
      })

      // CR-13: Enforce one active assignment per driver at the database level.
      // The PostgreSQL order claim only prevents two drivers claiming the same
      // order. It does NOT, by itself, prevent one driver from accepting two
      // different orders simultaneously. Check whether this driver already has
      // an active assignment (excluding the current order) before allowing the
      // claim. The idempotent case above is already handled, so any active
      // order found here is a *different* order.
      const driverActiveOrder = await tx.order.findFirst({
        where: {
          rider_id: driverId,
          status: {
            in: [
              'sent_to_vendor',
              'preparing',
              'packing',
              'ready_for_pickup',
              'rider_assigned',
              'picked_up',
              'out_for_delivery',
            ],
          },
          id: { not: orderId },
        },
        select: { id: true, status: true },
      })

      if (driverActiveOrder) {
        return {
          success: false,
          conflict: true,
          error: `Driver already has an active order "${driverActiveOrder.id}" (status: ${driverActiveOrder.status}). One active assignment per driver is enforced.`,
        }
      }

      // Verify eligible status for assignment
      const validStatusesForClaim: OrderStatus[] = ['ready_for_pickup']
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

      const acceptedOffer = await tx.dispatchOffer.updateMany({
        where: {
          id: validOffer.id,
          driver_id: driverId,
          status: 'pending',
          expires_at: { gt: now },
        },
        data: { status: 'accepted', accepted_at: now },
      })
      if (acceptedOffer.count !== 1) {
        throw new Error('Dispatch offer expired or was consumed during assignment')
      }
      await tx.dispatchOffer.updateMany({
        where: { order_id: orderId, id: { not: validOffer.id }, status: 'pending' },
        data: { status: 'cancelled' },
      })

      const assignedOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          customer: { select: SAFE_ORDER_CUSTOMER_SELECT },
          restaurant: { select: SAFE_ORDER_RESTAURANT_SELECT },
        },
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
      return {
        success: true,
        order: assignedOrder,
        conflict: false,
        offerRecipientIds: offerRecipients.map((offer) => offer.driver_id),
      }
    })

    invalidateOrdersCache()
    return result
  } catch (err: any) {
    console.error('[claimOrderForDriverAtomic] DB Transaction error:', err)
    if (err?.code === 'P2002') {
      return {
        success: false,
        error: 'Driver already has an active order',
        conflict: true,
      }
    }
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
        include: {
          customer: { select: SAFE_ORDER_CUSTOMER_SELECT },
          restaurant: { select: SAFE_ORDER_RESTAURANT_SELECT },
        },
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
      if (toStatus === 'ready_for_pickup') {
        await tx.orderOutbox.create({
          data: {
            order_id: orderId,
            event_type: 'dispatch_requested',
            payload: {
              orderId,
              actorId: actorId || null,
              actorRole: actorRole || null,
              timestamp: new Date().toISOString(),
            },
            status: 'pending',
          },
        })
      }

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

export { dispatchPendingOutboxEvents } from '@/features/orders/infrastructure/order-event-publisher'

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
): Promise<{ success: boolean; error?: string; deletedOrder?: any; refundQueued?: boolean }> {
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

        // Strict 15-second cancellation window restriction: no cancellations after 15 seconds
        if (existing.created_at) {
          const orderAgeMs = Date.now() - new Date(existing.created_at).getTime()
          const MAX_CANCELLATION_WINDOW_MS = 15 * 1000 // 15 seconds
          if (orderAgeMs > MAX_CANCELLATION_WINDOW_MS) {
            return {
              success: false,
              error:
                'Order cancellation window expired. Orders can only be cancelled within 15 seconds of placement.',
            }
          }
        }
      }
    }

    // Determine if refund should be placed in the review queue
    const amountPaise = existing.total_amount_paise || existing.total_amount * 100
    const isPaid =
      existing.payment_status === 'verified' ||
      existing.payment_method?.toLowerCase().includes('online') ||
      existing.payment_method?.toLowerCase().includes('upi') ||
      Boolean(existing.utr_ref)

    // Preserve the cancelled order in DB for audit trail & financial queue
    await prisma.$transaction(async (tx) => {
      // 1. Update order status to cancelled
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'cancelled' as OrderStatus,
        },
      })

      // 2. Cancel any scheduled vendor settlements so vendor is not credited
      await tx.vendorSettlement.updateMany({
        where: { transaction_ref: orderId, status: 'scheduled' },
        data: { status: 'cancelled' },
      })

      // 3. Put refund into the admin review queue if order was paid or has payment intent
      if (isPaid && amountPaise > 0) {
        const existingRefund = await tx.refund.findFirst({
          where: { order_id: orderId },
        })

        if (!existingRefund) {
          await tx.refund.create({
            data: {
              order_id: orderId,
              idempotency_key: `refund_cancel_${orderId}_${Date.now()}`,
              amount: Math.round(amountPaise / 100),
              amount_paise: amountPaise,
              reason: 'Customer cancelled within 15-second window',
              status: 'pending',
            },
          })
        }
      }

      // 4. Log event in outbox
      await tx.orderOutbox.create({
        data: {
          order_id: orderId,
          event_type: 'ORDER_CANCELLED',
          payload: {
            orderId,
            refundQueued: isPaid,
            refundAmountPaise: isPaid ? amountPaise : 0,
            cancelledBy: actorRole || 'user',
          },
          status: 'pending',
        },
      })
    })

    listOrdersCache.clear()
    return { success: true, deletedOrder: existing, refundQueued: isPaid }
  } catch (err: any) {
    console.error('[deleteOrder] Error cancelling order:', err)
    return { success: false, error: err?.message || 'Failed to cancel order' }
  }
}

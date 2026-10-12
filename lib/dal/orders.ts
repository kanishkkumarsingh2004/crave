/**
 * Database Access Layer — Orders
 * Requires Prisma PostgreSQL connection to be available.
 */
import { prisma } from '@/lib/prisma'
import type { OrderStatus } from '@prisma/client'

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
    // Only match rider_id — matching customer_id for a driver ID risks leaking other users' orders
    where.rider_id = driverId
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
  const updated = await prisma.order.update({
    where: { id },
    data: { status, ...(status === 'completed' ? { delivered_at: new Date() } : {}) },
  })
  invalidateOrdersCache()
  return updated
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

/**
 * Database Access Layer — Orders
 * Requires Prisma or Supabase to be available; no silent local file fallback.
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
    if (filters?.restaurantId) {
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
      } catch (e) {}
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

  return prisma.order.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: filters?.limit,
  })
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
}) {
  const { utr_ref, customer_vpa, ...prismaData } = data
  return prisma.order.create({ data: prismaData as any })
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  return prisma.order.update({
    where: { id },
    data: { status, ...(status === 'completed' ? { delivered_at: new Date() } : {}) },
  })
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
  return prisma.order.update({ where: { id }, data })
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

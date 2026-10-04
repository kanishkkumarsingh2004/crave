/**
 * Database Access Layer — Orders
 * Requires Prisma or Supabase to be available; no silent local file fallback.
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import type { OrderStatus } from '@prisma/client'

// ─── Queries ─────────────────────────────────────────────

export async function findOrderById(id: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { customer: true, restaurant: true },
    })
    if (order) return order
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).maybeSingle()
    if (!error && data) return data
  } catch {}

  // Return null when not found instead of throwing — callers already handle null.
  return null
}

export async function listOrders(filters?: {
  customerId?: string
  restaurantId?: string
  status?: OrderStatus
  limit?: number
}) {
  try {
    const orders = await prisma.order.findMany({
      where: {
        ...(filters?.customerId && { customer_id: filters.customerId }),
        ...(filters?.restaurantId && { restaurant_id: filters.restaurantId }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { created_at: 'desc' },
      take: filters?.limit,
    })
    // Return whatever Prisma gives — even an empty array is valid.
    return orders
  } catch (e) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    let query = supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (filters?.customerId) query = query.eq('customer_id', filters.customerId)
    if (filters?.restaurantId) query = query.eq('restaurant_id', filters.restaurantId)
    if (filters?.status) query = query.eq('status', filters.status)
    if (filters?.limit) query = query.limit(filters.limit)
    const { data, error } = await query
    if (!error && data) return data
  } catch {}

  // Both backends failed — return empty array so routes don't crash.
  return []
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
  items: any
  subtotal: number
  packaging_fee?: number
  gst?: number
  total_amount: number
  status: OrderStatus
  payment_method?: string
  delivery_otp?: string
  tip?: number
  discount_amount?: number
  coupon_code?: string
  utr_ref?: string
  customer_vpa?: string
}) {
  try {
    // utr_ref and customer_vpa are not Order model fields — strip before inserting.
    const { utr_ref, customer_vpa, ...prismaData } = data
    return await prisma.order.create({ data: prismaData })
  } catch (prismaErr: any) {
    // Prisma unavailable; continue to Supabase.
  }

  try {
    const { utr_ref, customer_vpa, ...insertData } = data
    const { data: created, error } = await supabase
      .from('orders')
      .insert([insertData])
      .select()
      .single()
    if (!error && created) return created
  } catch (sbErr) {
    // Supabase unavailable; fail loudly instead of claiming a successful order write.
  }

  throw new Error(`Unable to create order for customer: ${data.customer_name}`)
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  try {
    return await prisma.order.update({
      where: { id },
      data: { status, ...(status === 'completed' ? { delivered_at: new Date() } : {}) },
    })
  } catch {
    try {
      const { data } = await supabase
        .from('orders')
        .update({
          status,
          ...(status === 'completed' ? { delivered_at: new Date().toISOString() } : {}),
        })
        .eq('id', id)
        .select()
        .single()
      if (data) return data
    } catch {}

    throw new Error(`Unable to update order status for id: ${id}`)
  }
}

export async function updateOrder(
  id: string,
  data: {
    status?: OrderStatus
    driver_name?: string
    driver_phone?: string
    delivery_latitude?: number
    delivery_longitude?: number
    delivered_at?: Date
    picker_name?: string
  }
) {
  try {
    return await prisma.order.update({ where: { id }, data })
  } catch (e) {
    try {
      const { data: updated } = await supabase
        .from('orders')
        .update(data as any)
        .eq('id', id)
        .select()
        .single()
      if (updated) return updated
    } catch {}

    throw new Error(`Unable to update order: ${id}`)
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

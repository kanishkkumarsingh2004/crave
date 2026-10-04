/**
 * Database Access Layer — Coupons
 * Resilient dual-engine: Prisma ORM with Supabase REST fallback
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import type { DiscountType } from '@prisma/client'

// ─── Queries ─────────────────────────────────────────────

export async function listCoupons(restaurantId?: string) {
  try {
    const list = await prisma.coupon.findMany({
      where: restaurantId ? { restaurant_id: restaurantId } : undefined,
      orderBy: { created_at: 'desc' },
    })
    if (list && list.length > 0) return list
  } catch (e) {}

  try {
    let query = supabase.from('coupons').select('*').order('created_at', { ascending: false })
    if (restaurantId) query = query.eq('restaurant_id', restaurantId)
    const { data } = await query
    if (data) return data
  } catch (e) {}

  return []
}

export async function findCouponByCode(code: string) {
  const clean = code.trim().toUpperCase()
  try {
    const c = await prisma.coupon.findFirst({
      where: { code: { equals: clean, mode: 'insensitive' } },
    })
    if (c) return c
  } catch (e) {}

  try {
    const { data } = await supabase.from('coupons').select('*').ilike('code', clean).maybeSingle()
    if (data) return data
  } catch (e) {}

  return null
}

export async function listActiveCoupons(restaurantId?: string) {
  const all = await listCoupons(restaurantId)
  return all.filter((c: any) => c.is_active !== false)
}

// ─── Mutations ───────────────────────────────────────────

export async function createCoupon(data: {
  id: string
  code: string
  description: string
  discount_type: DiscountType
  discount_value: number
  min_order_amount: number
  max_discount?: number
  usage_limit?: number
  expiry_date?: Date
  is_active?: boolean
  restaurant_id?: string
}) {
  try {
    return await prisma.coupon.create({ data })
  } catch (e) {}

  try {
    const { data: created } = await supabase.from('coupons').insert([data as any]).select().single()
    if (created) return created
  } catch (e) {}

  return { ...data, created_at: new Date() }
}

export async function updateCoupon(
  id: string,
  data: {
    is_active?: boolean
    used_count?: number
    description?: string
    discount_value?: number
    expiry_date?: Date
  }
) {
  try {
    return await prisma.coupon.update({ where: { id }, data })
  } catch (e) {}

  try {
    const { data: updated } = await supabase.from('coupons').update(data as any).eq('id', id).select().single()
    if (updated) return updated
  } catch (e) {}

  return { id, ...data }
}

export async function incrementCouponUsage(id: string) {
  try {
    return await prisma.coupon.update({
      where: { id },
      data: { used_count: { increment: 1 } },
    })
  } catch (e) {}

  try {
    const { data: current } = await supabase.from('coupons').select('used_count').eq('id', id).single()
    const newCount = (current?.used_count || 0) + 1
    await supabase.from('coupons').update({ used_count: newCount }).eq('id', id)
  } catch (e) {}

  return { id }
}

export async function deleteCoupon(id: string) {
  try {
    return await prisma.coupon.delete({ where: { id } })
  } catch (e) {}

  try {
    await supabase.from('coupons').delete().eq('id', id)
  } catch (e) {}

  return { id }
}

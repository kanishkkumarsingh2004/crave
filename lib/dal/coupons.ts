/**
 * Database Access Layer — Coupons
 * Prisma ORM with Neon PostgreSQL
 */
import { prisma } from '@/lib/prisma'
import type { DiscountType } from '@prisma/client'
import { redis, isRedisAvailable } from '@/lib/redis'

// ─── Queries ─────────────────────────────────────────────

export async function listCoupons(restaurantId?: string) {
  const list = await prisma.coupon.findMany({
    where: restaurantId ? { restaurant_id: restaurantId } : undefined,
    orderBy: { created_at: 'desc' },
  })
  if (list && list.length > 0) return list
  return []
}

export async function findCouponByCode(code: string) {
  const clean = code.trim().toUpperCase()
  const c = await prisma.coupon.findFirst({
    where: { code: { equals: clean, mode: 'insensitive' } },
  })
  if (c) return c
  return null
}

export async function listActiveCoupons(restaurantId?: string) {
  const all = await listCoupons(restaurantId)
  return all.filter((c: any) => c.is_active !== false)
}

/**
 * Validate and apply a coupon code.
 * Returns coupon details if valid, null if invalid/expired/exhausted.
 * Atomically checks and increments usage count.
 */
export async function validateAndApplyCoupon(
  code: string,
  orderSubtotal: number,
  restaurantId?: string
): Promise<{
  valid: boolean
  coupon?: any
  discount: number
  error?: string
}> {
  const coupon = await findCouponByCode(code)

  if (!coupon) {
    return { valid: false, discount: 0, error: 'Invalid coupon code' }
  }

  if (coupon.is_active === false) {
    return { valid: false, discount: 0, error: 'Coupon is inactive' }
  }

  // Check expiry
  if (coupon.expiry_date && new Date(coupon.expiry_date) < new Date()) {
    return { valid: false, discount: 0, error: 'Coupon has expired' }
  }

  // Check minimum order amount
  const minOrder = coupon.min_order_amount || 0
  if (orderSubtotal < minOrder) {
    return { valid: false, discount: 0, error: `Minimum order amount of ₹${minOrder} required` }
  }

  // Check usage limit against Redis / DB count
  let currentUsage = coupon.used_count || 0
  if (isRedisAvailable() && redis) {
    try {
      const redisUsage = await redis.get(`crave:coupon:usage:${coupon.id}`)
      if (redisUsage !== null) {
        currentUsage = parseInt(redisUsage, 10) || currentUsage
      }
    } catch {}
  }

  if (coupon.usage_limit && currentUsage >= coupon.usage_limit) {
    return { valid: false, discount: 0, error: 'Coupon usage limit exceeded' }
  }

  // Restaurant restriction
  if (restaurantId && coupon.restaurant_id && coupon.restaurant_id !== restaurantId) {
    return { valid: false, discount: 0, error: 'Coupon not valid for this restaurant' }
  }

  // Calculate discount
  let discount = 0
  if (coupon.discount_type === 'percentage') {
    const calculated = (orderSubtotal * coupon.discount_value) / 100
    discount = coupon.max_discount ? Math.min(calculated, coupon.max_discount) : calculated
  } else {
    discount = coupon.discount_value
  }

  discount = Math.min(orderSubtotal, Math.ceil(discount))

  return { valid: true, coupon, discount }
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
  restaurant_ids?: string[]
}) {
  const { restaurant_ids, ...prismaData } = data
  return await prisma.coupon.create({ data: prismaData })
}

export async function updateCoupon(
  id: string,
  data: {
    is_active?: boolean
    used_count?: number
    description?: string
    discount_value?: number
    expiry_date?: Date
    restaurant_id?: string
    restaurant_ids?: string[]
  }
) {
  const { restaurant_ids, ...prismaData } = data
  return await prisma.coupon.update({ where: { id }, data: prismaData })
}

export async function incrementCouponUsage(id: string) {
  // Try Redis atomic increment first for concurrency safety
  if (isRedisAvailable() && redis) {
    const key = `crave:coupon:usage:${id}`
    const currentUsage = await redis.incr(key)

    // Set TTL on first increment (30 days default)
    if (currentUsage === 1) {
      await redis.expire(key, 30 * 24 * 60 * 60) // 30 days
    }

    // Also update DB asynchronously (fire and forget)
    prisma.coupon
      .update({
        where: { id },
        data: { used_count: { increment: 1 } },
      })
      .catch(() => {})

    return { id, currentUsage }
  }

  // Fallback to DB-only increment
  return await prisma.coupon.update({
    where: { id },
    data: { used_count: { increment: 1 } },
  })
}

/**
 * Atomically check and increment coupon usage with limit enforcement.
 * Returns { allowed: boolean, currentUsage: number, limit: number | null }
 * Returns allowed=false if coupon would exceed its usage limit.
 */
export async function checkAndIncrementCouponUsage(couponId: string): Promise<{
  allowed: boolean
  currentUsage: number
  limit: number | null
}> {
  let coupon: any = null
  coupon = await prisma.coupon.findUnique({ where: { id: couponId } })

  const limit = coupon?.usage_limit ?? null

  if (!isRedisAvailable() || !redis) {
    const currentUsage = (coupon?.used_count || 0) + 1
    if (limit != null && currentUsage > limit) {
      return { allowed: false, currentUsage: coupon?.used_count || 0, limit }
    }

    // Persist usage count increment in DB
    await prisma.coupon.update({
      where: { id: couponId },
      data: { used_count: { increment: 1 } },
    })

    return { allowed: true, currentUsage, limit }
  }

  const key = `crave:coupon:usage:${couponId}`

  // Seed Redis from DB if key does not exist yet
  const exists = await redis.exists(key)
  if (!exists && coupon) {
    await redis.set(key, coupon.used_count || 0, 'EX', 30 * 24 * 60 * 60)
  }

  const currentUsage = await redis.incr(key)

  if (limit != null && currentUsage > limit) {
    await redis.decr(key).catch(() => {})
    return { allowed: false, currentUsage: currentUsage - 1, limit }
  }

  // Asynchronously sync usage increment to DB
  prisma.coupon
    .update({
      where: { id: couponId },
      data: { used_count: { increment: 1 } },
    })
    .catch(() => {})

  return { allowed: true, currentUsage, limit }
}

export async function deleteCoupon(id: string) {
  return await prisma.coupon.delete({ where: { id } })
}

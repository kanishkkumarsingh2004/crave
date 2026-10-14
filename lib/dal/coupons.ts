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
    where: restaurantId
      ? {
          OR: [
            { restaurant_id: restaurantId },
            { applicable_restaurants: { some: { restaurant_id: restaurantId } } },
            { restaurant_id: null, applicable_restaurants: { none: {} } },
          ],
        }
      : undefined,
    include: {
      applicable_restaurants: { select: { restaurant_id: true } },
    },
    orderBy: { created_at: 'desc' },
  })
  return list.map(({ applicable_restaurants, ...coupon }) => ({
    ...coupon,
    restaurant_ids: applicable_restaurants.map((item) => item.restaurant_id),
  }))
}

export async function findCouponByCode(code: string) {
  const clean = code.trim().toUpperCase()
  const c = await prisma.coupon.findFirst({
    where: { code: { equals: clean, mode: 'insensitive' } },
    include: {
      applicable_restaurants: { select: { restaurant_id: true } },
    },
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
  if (restaurantId) {
    const applicableRestaurantIds = coupon.applicable_restaurants.map((item) => item.restaurant_id)
    if (
      (applicableRestaurantIds.length > 0 && !applicableRestaurantIds.includes(restaurantId)) ||
      (applicableRestaurantIds.length === 0 &&
        coupon.restaurant_id &&
        coupon.restaurant_id !== restaurantId)
    ) {
      return { valid: false, discount: 0, error: 'Coupon not valid for this restaurant' }
    }
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
  funding_source?: string
  restaurant_share?: number
  restaurant_id?: string
  restaurant_ids?: string[]
}) {
  const { restaurant_ids, ...prismaData } = data
  const restaurantIds = [...new Set((restaurant_ids || []).filter(Boolean))]
  const primaryRestaurantId = restaurantIds.length === 1 ? restaurantIds[0] : null

  return prisma.$transaction(async (tx) => {
    const created = await tx.coupon.create({
      data: {
        ...prismaData,
        restaurant_id: primaryRestaurantId,
      },
    })
    if (restaurantIds.length > 0) {
      await tx.couponRestaurant.createMany({
        data: restaurantIds.map((restaurant_id) => ({
          coupon_id: created.id,
          restaurant_id,
        })),
      })
    }
    return { ...created, restaurant_ids: restaurantIds }
  })
}

export async function updateCoupon(
  id: string,
  data: {
    is_active?: boolean
    used_count?: number
    description?: string
    code?: string
    discount_type?: DiscountType
    discount_value?: number
    min_order_amount?: number
    max_discount?: number | null
    usage_limit?: number | null
    expiry_date?: Date
    funding_source?: string
    restaurant_share?: number
    restaurant_id?: string | null
    restaurant_ids?: string[]
  }
) {
  const { restaurant_ids, ...prismaData } = data
  const restaurantIds =
    restaurant_ids === undefined
      ? undefined
      : [...new Set(restaurant_ids.filter((restaurantId) => Boolean(restaurantId)))]

  return prisma.$transaction(async (tx) => {
    if (restaurantIds !== undefined) {
      await tx.couponRestaurant.deleteMany({ where: { coupon_id: id } })
      if (restaurantIds.length > 0) {
        await tx.couponRestaurant.createMany({
          data: restaurantIds.map((restaurant_id) => ({ coupon_id: id, restaurant_id })),
        })
      }
    }

    const updated = await tx.coupon.update({
      where: { id },
      data: {
        ...prismaData,
        ...(restaurantIds !== undefined && {
          restaurant_id: restaurantIds.length === 1 ? restaurantIds[0] : null,
        }),
      },
    })
    const links = await tx.couponRestaurant.findMany({
      where: { coupon_id: id },
      select: { restaurant_id: true },
    })
    return { ...updated, restaurant_ids: links.map((item) => item.restaurant_id) }
  })
}

export async function incrementCouponUsage(id: string) {
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
  const rows = await prisma.$queryRaw<Array<{ used_count: number; usage_limit: number | null }>>`
    UPDATE coupons
    SET used_count = COALESCE(used_count, 0) + 1
    WHERE id = ${couponId}
      AND is_active IS NOT FALSE
      AND (usage_limit IS NULL OR COALESCE(used_count, 0) < usage_limit)
    RETURNING used_count, usage_limit
  `
  if (rows.length === 1) {
    return {
      allowed: true,
      currentUsage: Number(rows[0].used_count),
      limit: rows[0].usage_limit == null ? null : Number(rows[0].usage_limit),
    }
  }

  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { used_count: true, usage_limit: true },
  })
  return {
    allowed: false,
    currentUsage: Number(coupon?.used_count || 0),
    limit: coupon?.usage_limit == null ? null : Number(coupon.usage_limit),
  }
}

export async function deleteCoupon(id: string) {
  return await prisma.coupon.delete({ where: { id } })
}

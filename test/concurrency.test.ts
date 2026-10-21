import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { prisma } from '../lib/prisma'
import { checkAndIncrementCouponUsage } from '../lib/dal/coupons'
import { hashPassword } from '../lib/password'

/**
 * Concurrency and abuse tests that need the database.
 *
 * These cover the races the HTTP layer cannot prove on its own: the final
 * state of the stock counter, the number of rows that were really written, and
 * the locks that only exist inside a transaction.
 *
 * Run with:  ALLOW_DATABASE_TESTS=true pnpm test
 */

// The database tests need both the opt-in flag and a reachable database.
const dbEnabled = process.env.ALLOW_DATABASE_TESTS === 'true' && Boolean(prisma)

/** Creates a customer, a restaurant and a menu item with a known stock. */
async function seedOrderFixture(options: { stock?: number; suffix: string }) {
  const { suffix } = options
  const stock = options.stock ?? 3
  const userId = `race_user_${suffix}`
  const restaurantId = `race_rest_${suffix}`
  const menuItemId = `race_item_${suffix}`

  await prisma.user.create({
    data: {
      id: userId,
      name: 'Race Tester',
      email: `race-${suffix}@example.invalid`,
      role: 'user',
      password_hash: hashPassword('RaceTester@123'),
    },
  })
  await prisma.restaurant.create({
    data: { id: restaurantId, name: 'Race Kitchen', cuisine: 'Test' },
  })
  await prisma.menuItem.create({
    data: {
      id: menuItemId,
      restaurant_id: restaurantId,
      name: 'Race Item',
      description: 'Concurrency fixture',
      price: 100,
      category: 'Main Course',
      is_veg: true,
      in_stock: true,
      stock_count: stock,
    },
  })

  return { userId, restaurantId, menuItemId, stock }
}

/** The order row a fixture needs — the model has a few mandatory columns. */
function orderData(fixture: { userId: string; restaurantId: string; menuItemId: string }) {
  return {
    customer_id: fixture.userId,
    customer_name: 'Race Tester',
    restaurant_id: fixture.restaurantId,
    restaurant_name: 'Race Kitchen',
    items: [{ id: fixture.menuItemId, quantity: 1, price: 100 }],
    subtotal: 100,
    total_amount: 100,
  }
}

/** Removes everything a fixture created. */
async function clearFixture(fixture: { userId: string; restaurantId: string; menuItemId: string }) {
  await prisma.order.deleteMany({ where: { customer_id: fixture.userId } })
  await prisma.menuItem.deleteMany({ where: { id: fixture.menuItemId } })
  await prisma.restaurant.deleteMany({ where: { id: fixture.restaurantId } })
  await prisma.user.deleteMany({ where: { id: fixture.userId } })
}

/** The atomic decrement the order route uses, in isolation. */
async function claimStock(itemId: string, quantity: number) {
  const updated = await prisma.menuItem.updateMany({
    where: { id: itemId, in_stock: true, stock_count: { gte: quantity } },
    data: { stock_count: { decrement: quantity } },
  })
  return updated.count === 1
}

test('concurrent claims never oversell a menu item', { skip: !dbEnabled }, async () => {
  const suffix = crypto.randomUUID()
  const fixture = await seedOrderFixture({ stock: 3, suffix })
  try {
    const attempts = await Promise.all(
      Array.from({ length: 12 }, () => claimStock(fixture.menuItemId, 1))
    )

    const winners = attempts.filter(Boolean).length
    const item = await prisma.menuItem.findUniqueOrThrow({
      where: { id: fixture.menuItemId },
    })

    assert.equal(winners, fixture.stock, 'exactly the available stock may be sold')
    assert.equal(item.stock_count, 0, 'the stock counter must land on zero')
    assert.ok(item.stock_count >= 0, 'the stock counter must never go negative')
  } finally {
    await clearFixture(fixture)
  }
})

test('a coupon with a usage limit is only ever claimed once', { skip: !dbEnabled }, async () => {
  const suffix = crypto.randomUUID()
  const couponId = `race_coupon_${suffix}`
  const restaurantId = `race_crest_${suffix}`
  try {
    await prisma.restaurant.create({
      data: { id: restaurantId, name: 'Race Coupon Kitchen', cuisine: 'Test' },
    })
    await prisma.coupon.create({
      data: {
        id: couponId,
        code: `RACE-${suffix}`.slice(0, 24),
        description: 'Concurrency coupon',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 100,
        usage_limit: 1,
        funding_source: 'SHARED',
        restaurant_share: 35,
        is_active: true,
      },
    })

    const attempts = await Promise.all(
      Array.from({ length: 10 }, () => checkAndIncrementCouponUsage(couponId))
    )
    const allowed = attempts.filter((attempt) => attempt.allowed).length
    const coupon = await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } })

    assert.equal(allowed, 1, 'only one request may use the single remaining use')
    assert.equal(coupon.used_count, 1, 'the coupon counter must be incremented once')
  } finally {
    await prisma.coupon.deleteMany({ where: { id: couponId } })
    await prisma.restaurant.deleteMany({ where: { id: restaurantId } })
  }
})

test('the same idempotency key can only create one order', { skip: !dbEnabled }, async () => {
  const suffix = crypto.randomUUID()
  const fixture = await seedOrderFixture({ stock: 100, suffix })
  const key = `race_idem_${suffix}`
  try {
    const create = () =>
      prisma.order.create({
        data: {
          ...orderData(fixture),
          id: `race_order_${crypto.randomUUID()}`,
          status: 'sent_to_vendor',
          idempotency_key: key,
        },
      })

    const attempts = await Promise.allSettled(Array.from({ length: 8 }, create))
    const fulfilled = attempts.filter((attempt) => attempt.status === 'fulfilled')
    const orders = await prisma.order.findMany({
      where: { customer_id: fixture.userId, idempotency_key: key },
    })

    assert.equal(orders.length, 1, 'the unique constraint must collapse the duplicates')
    assert.equal(fulfilled.length, 1, 'only one insert may succeed')
  } finally {
    await clearFixture(fixture)
  }
})

test('only one rider can claim an order', { skip: !dbEnabled }, async () => {
  const suffix = crypto.randomUUID()
  const fixture = await seedOrderFixture({ stock: 100, suffix })
  const orderId = `race_claim_${suffix}`
  try {
    await prisma.order.create({
      data: { ...orderData(fixture), id: orderId, status: 'ready_for_pickup' },
    })

    // The same conditional update the accept route performs.
    const claim = (riderId: string) =>
      prisma.order.updateMany({
        where: {
          id: orderId,
          OR: [{ rider_id: null }, { rider_id: riderId }],
          status: { in: ['ready_for_pickup', 'rider_assigned'] },
        },
        data: { status: 'rider_assigned', rider_id: riderId },
      })

    const claims = await Promise.all([claim('rider_a'), claim('rider_b'), claim('rider_c')])
    const winners = claims.filter((result) => result.count === 1).length
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })

    assert.equal(winners, 1, 'only one rider may take the order')
    assert.ok(order.rider_id, 'the order must be assigned')
  } finally {
    await clearFixture(fixture)
  }
})

test(
  'a delivery OTP can only be consumed once, even under a concurrent race',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_otp_${suffix}`
    try {
      await prisma.order.create({
        data: {
          ...orderData(fixture),
          id: orderId,
          status: 'out_for_delivery',
          delivery_otp: '482913',
          otp_consumed_at: null,
        },
      })

      // The conditional write the delivery confirmation performs.
      const consume = () =>
        prisma.order.updateMany({
          where: { id: orderId, otp_consumed_at: null },
          data: { status: 'delivered', delivered_at: new Date(), otp_consumed_at: new Date() },
        })

      const results = await Promise.all(Array.from({ length: 6 }, consume))
      const winners = results.filter((result) => result.count === 1).length
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })

      assert.equal(winners, 1, 'the OTP may only be spent once')
      assert.ok(order.otp_consumed_at, 'the consumption must be recorded')
    } finally {
      await clearFixture(fixture)
    }
  }
)

test(
  'a concurrent status transition lets exactly one writer through',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_status_${suffix}`
    try {
      await prisma.order.create({
        data: { ...orderData(fixture), id: orderId, status: 'preparing' },
      })

      // The optimistic lock the order route relies on.
      const advance = (target: 'packing' | 'ready_for_pickup') =>
        prisma.order.updateMany({
          where: { id: orderId, status: 'preparing' },
          data: { status: target },
        })

      const results = await Promise.all([advance('packing'), advance('ready_for_pickup')])
      const winners = results.filter((result) => result.count === 1).length

      assert.equal(winners, 1, 'only the writer that saw the original state may win')
    } finally {
      await clearFixture(fixture)
    }
  }
)

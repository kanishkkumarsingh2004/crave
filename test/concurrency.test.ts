import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test, { after } from 'node:test'
import { prisma } from '../lib/prisma'
import { checkAndIncrementCouponUsage } from '../lib/dal/coupons'
import { acquireIdempotency, releaseIdempotency } from '../lib/idempotency'
import { hashPassword } from '../lib/password'
import { processRefundTx } from '../lib/finance/payment-service'
import { claimOrderForDriverAtomic } from '../lib/dal/orders'
import { clearDriverSpatialIndex, updateDriverLocation } from '../lib/dispatch/driver-tracker'
import { reconcileStaleTransfers } from '../lib/payments/razorpay-split'

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

after(async () => {
  if (dbEnabled) await prisma.$disconnect()
})

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

test(
  'idempotency isolates scopes and rejects mismatched payloads',
  { skip: !dbEnabled },
  async () => {
    const key = `scope_idem_${crypto.randomUUID()}`
    try {
      const checkout = await acquireIdempotency(key, 'order_checkout', { totalPaise: 5000 })
      assert.equal(checkout.status, 'new')
      assert.ok(checkout.fencingToken)

      const mismatch = await acquireIdempotency(key, 'order_checkout', { totalPaise: 100 })
      assert.equal(mismatch.status, 'conflict')

      const webhook = await acquireIdempotency(key, 'payment_webhook', { amountPaise: 5000 })
      assert.equal(webhook.status, 'new')
      assert.ok(webhook.fencingToken)

      await releaseIdempotency(key, 'order_checkout', checkout.fencingToken)
      await releaseIdempotency(key, 'payment_webhook', webhook.fencingToken)
    } finally {
      await prisma.idempotencyRecord.deleteMany({ where: { key } })
    }
  }
)

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
  'a driver cannot claim an order without a durable unexpired dispatch offer',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_offer_${suffix}`
    const driverId = `race_driver_${suffix}`
    try {
      await prisma.user.create({
        data: {
          id: driverId,
          name: 'Dispatch Driver',
          email: `driver-${suffix}@example.invalid`,
          role: 'rider',
          phone: '+919999999999',
          password_hash: hashPassword('RaceDriver@123'),
        },
      })
      await prisma.order.create({
        data: {
          ...orderData(fixture),
          id: orderId,
          status: 'ready_for_pickup',
          payment_status: 'verified',
        },
      })

      const unauthorized = await claimOrderForDriverAtomic({
        orderId,
        driverId,
        driverName: 'Dispatch Driver',
        driverPhone: '+919999999999',
      })
      assert.equal(unauthorized.success, false)
      assert.equal(unauthorized.unauthorized, true)

      await prisma.dispatchOffer.create({
        data: {
          order_id: orderId,
          driver_id: driverId,
          dispatch_attempt_id: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 60_000),
        },
      })
      const authorized = await claimOrderForDriverAtomic({
        orderId,
        driverId,
        driverName: 'Dispatch Driver',
        driverPhone: '+919999999999',
      })
      assert.equal(authorized.success, true)

      const acceptedOffer = await prisma.dispatchOffer.findFirstOrThrow({
        where: { order_id: orderId, driver_id: driverId },
      })
      assert.equal(acceptedOffer.status, 'accepted')
      assert.ok(acceptedOffer.accepted_at)
    } finally {
      await clearFixture(fixture)
      await prisma.user.deleteMany({ where: { id: driverId } })
    }
  }
)

test(
  'concurrent provider-confirmed refunds cannot exceed the order total',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_refund_${suffix}`
    try {
      await prisma.order.create({
        data: {
          ...orderData(fixture),
          id: orderId,
          status: 'delivered',
          payment_status: 'verified',
          total_amount_paise: 10_000,
        },
      })

      const attempts = await Promise.allSettled([
        processRefundTx({
          orderId,
          amountPaise: 7_000,
          reason: 'Concurrent refund A',
          idempotencyKey: `refund_a_${suffix}`,
          gatewayRefundId: `rfnd_a_${suffix}`,
          providerConfirmed: true,
        }),
        processRefundTx({
          orderId,
          amountPaise: 7_000,
          reason: 'Concurrent refund B',
          idempotencyKey: `refund_b_${suffix}`,
          gatewayRefundId: `rfnd_b_${suffix}`,
          providerConfirmed: true,
        }),
      ])
      assert.equal(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 1)

      const refunds = await prisma.refund.findMany({ where: { order_id: orderId } })
      assert.equal(
        refunds.reduce((sum, refund) => sum + (refund.amount_paise || 0), 0),
        7_000
      )
      assert.equal(refunds[0]?.status, 'completed')
    } finally {
      await clearFixture(fixture)
    }
  }
)

test(
  'a refund completion rolls back when a required ledger line cannot be inserted',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_refund_ledger_${suffix}`
    try {
      await prisma.order.create({
        data: {
          ...orderData(fixture),
          id: orderId,
          status: 'delivered',
          payment_status: 'verified',
          total_amount_paise: 10_000,
        },
      })
      await prisma.$executeRawUnsafe(`
        CREATE OR REPLACE FUNCTION reject_test_refund_ledger() RETURNS trigger AS $$
        BEGIN
          IF NEW.event_type = 'REFUND_INITIATED' THEN
            RAISE EXCEPTION 'forced refund ledger failure';
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `)
      await prisma.$executeRawUnsafe(`
        CREATE TRIGGER reject_test_refund_ledger_trigger
        BEFORE INSERT ON ledger_entries
        FOR EACH ROW EXECUTE FUNCTION reject_test_refund_ledger()
      `)

      await assert.rejects(
        processRefundTx({
          orderId,
          amountPaise: 10_000,
          reason: 'Forced rollback test',
          idempotencyKey: `refund_rollback_${suffix}`,
          gatewayRefundId: `rfnd_rollback_${suffix}`,
          providerConfirmed: true,
        }),
        /forced refund ledger failure/
      )

      assert.equal(await prisma.refund.count({ where: { order_id: orderId } }), 0)
      const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
      assert.equal(order.status, 'delivered')
      assert.equal(order.payment_status, 'verified')
    } finally {
      await prisma.$executeRawUnsafe(
        'DROP TRIGGER IF EXISTS reject_test_refund_ledger_trigger ON ledger_entries'
      )
      await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS reject_test_refund_ledger()')
      await clearFixture(fixture)
    }
  }
)

test(
  'a refund request remains pending until the provider confirms it',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const orderId = `race_refund_pending_${suffix}`
    try {
      await prisma.order.create({
        data: {
          ...orderData(fixture),
          id: orderId,
          status: 'delivered',
          payment_status: 'verified',
          total_amount_paise: 10_000,
        },
      })

      const requested = await processRefundTx({
        orderId,
        amountPaise: 4_000,
        reason: 'Admin requested refund',
        idempotencyKey: `refund_request_${suffix}`,
      })
      assert.equal(requested.refund.status, 'pending')
      assert.equal(requested.refund.provider_confirmed_at, null)
      assert.equal(await prisma.ledgerEntry.count({ where: { order_id: orderId } }), 0)

      const confirmed = await processRefundTx({
        orderId,
        amountPaise: 4_000,
        reason: 'Provider confirmed refund',
        idempotencyKey: `refund_webhook_${suffix}`,
        gatewayRefundId: `rfnd_confirmed_${suffix}`,
        providerConfirmed: true,
      })
      assert.equal(confirmed.refund.id, requested.refund.id)
      assert.equal(confirmed.refund.status, 'completed')
      assert.ok(confirmed.refund.provider_confirmed_at)
      assert.equal(await prisma.refund.count({ where: { order_id: orderId } }), 1)
      assert.ok(await prisma.ledgerEntry.count({ where: { order_id: orderId } }))
    } finally {
      await clearFixture(fixture)
    }
  }
)

test(
  'one driver accepting two different offered orders concurrently gets exactly one assignment',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const fixture = await seedOrderFixture({ stock: 100, suffix })
    const driverId = `race_double_driver_${suffix}`
    const orderIds = [`race_double_a_${suffix}`, `race_double_b_${suffix}`]
    try {
      await prisma.user.create({
        data: {
          id: driverId,
          name: 'Double Claim Driver',
          email: `double-driver-${suffix}@example.invalid`,
          role: 'rider',
          phone: '+919999999998',
          password_hash: hashPassword('RaceDriver@123'),
        },
      })
      await prisma.order.createMany({
        data: orderIds.map((id) => ({
          ...orderData(fixture),
          id,
          status: 'ready_for_pickup' as const,
          payment_status: 'verified' as const,
        })),
      })
      await prisma.dispatchOffer.createMany({
        data: orderIds.map((orderId) => ({
          order_id: orderId,
          driver_id: driverId,
          dispatch_attempt_id: crypto.randomUUID(),
          expires_at: new Date(Date.now() + 60_000),
        })),
      })

      const results = await Promise.all(
        orderIds.map((orderId) =>
          claimOrderForDriverAtomic({
            orderId,
            driverId,
            driverName: 'Double Claim Driver',
            driverPhone: '+919999999998',
          })
        )
      )
      assert.equal(results.filter((result) => result.success).length, 1)
      assert.equal(results.filter((result) => result.conflict).length, 1)
      assert.equal(
        await prisma.order.count({
          where: { id: { in: orderIds }, rider_id: driverId, status: 'rider_assigned' },
        }),
        1
      )
    } finally {
      await clearFixture(fixture)
      await prisma.user.deleteMany({ where: { id: driverId } })
    }
  }
)

test(
  'equal GPS timestamps cannot overwrite an accepted position',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const driverId = `race_gps_${suffix}`
    const timestamp = Date.now()
    try {
      await prisma.user.create({
        data: {
          id: driverId,
          name: 'GPS Driver',
          email: `gps-${suffix}@example.invalid`,
          role: 'rider',
          password_hash: hashPassword('RaceGps@123'),
        },
      })
      const first = await updateDriverLocation({
        driverId,
        lat: 12.9716,
        lng: 77.5946,
        timestamp,
      })
      const tied = await updateDriverLocation({
        driverId,
        lat: 13.0827,
        lng: 80.2707,
        timestamp,
      })

      assert.equal(tied.outOfOrder, true)
      assert.equal(tied.state.lat, first.state.lat)
      assert.equal(tied.state.lng, first.state.lng)
      assert.equal(await prisma.driverLocationHistory.count({ where: { driver_id: driverId } }), 1)
    } finally {
      clearDriverSpatialIndex()
      await prisma.driverLocationHistory.deleteMany({ where: { driver_id: driverId } })
      await prisma.driverCurrentLocation.deleteMany({ where: { driver_id: driverId } })
      await prisma.user.deleteMany({ where: { id: driverId } })
    }
  }
)

test(
  'stale settlement claims are retryable only when provider submission never started',
  { skip: !dbEnabled },
  async () => {
    const idempotencyKey = `route_recovery_${crypto.randomUUID()}`
    try {
      const transfer = await prisma.razorpayTransfer.create({
        data: {
          order_id: `order_${crypto.randomUUID()}`,
          recipient_type: 'RESTAURANT',
          recipient_id: `restaurant_${crypto.randomUUID()}`,
          linked_account_id: 'acc_test_recovery',
          razorpay_payment_id: 'pay_test_recovery',
          idempotency_key: idempotencyKey,
          amount_paise: 1_000,
          status: 'processing',
          claim_token: crypto.randomUUID(),
          claimed_at: new Date(Date.now() - 60 * 60 * 1000),
          provider_request_started_at: null,
          last_attempt_at: new Date(Date.now() - 60 * 60 * 1000),
          attempt_count: 1,
          reconciliation_status: 'claimed_not_submitted',
          updated_at: new Date(Date.now() - 60 * 60 * 1000),
        },
      })

      const result = await reconcileStaleTransfers()
      assert.ok(
        result.results.some(
          (entry) =>
            entry.transferId === transfer.id && entry.reconciled === 'safe_to_retry_not_submitted'
        )
      )
      const recovered = await prisma.razorpayTransfer.findUniqueOrThrow({
        where: { id: transfer.id },
      })
      assert.equal(recovered.status, 'pending')
      assert.equal(recovered.claim_token, null)
      assert.equal(recovered.reconciliation_status, 'safe_to_retry_not_submitted')
    } finally {
      await prisma.razorpayTransfer.deleteMany({ where: { idempotency_key: idempotencyKey } })
    }
  }
)

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

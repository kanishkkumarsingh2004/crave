import 'dotenv/config'

import assert from 'node:assert/strict'
import { after, test } from 'node:test'

import { checkAndIncrementCouponUsage, createCoupon } from '../lib/dal/coupons'
import { createCustomerAddress, setDefaultAddress } from '../lib/dal/addresses'
import { normalizeEmail } from '../lib/email'
import { calculateOrderPrice } from '../lib/finance/pricing-engine'
import { Money } from '../lib/finance/money'
import { processPaymentVerificationTx } from '../lib/finance/payment-service'
import { OrderStatus, assertValidTransition, isValidTransition } from '../lib/order-state-machine'
import { hashPassword, validatePassword, verifyPassword } from '../lib/password'
import { prisma } from '../lib/prisma'

after(async () => {
  if (prisma) await prisma.$disconnect()
})

test('money allocation preserves every paise', () => {
  const parts = Money.fromPaise(101).allocate([1, 1, 1])
  assert.deepEqual(
    parts.map((part) => part.paise),
    [35, 33, 33]
  )
  assert.equal(
    parts.reduce((sum, part) => sum + part.paise, 0),
    101
  )
})

test('pricing snapshot balances discounts and passes the complete tip to the rider', () => {
  const price = calculateOrderPrice({
    orderId: 'test-order',
    orderType: 'restaurant_food',
    restaurantName: 'Test Kitchen',
    items: [{ name: 'Meal', quantity: 2, unitPricePaise: 10_000 }],
    delivery: {
      baseDeliveryFeePaise: 3_000,
      baseDistanceKm: 3,
      perKmRatePaise: 1_000,
      roadDistanceKm: 5,
    },
    couponDiscountPaise: 2_000,
    restaurantDiscountSharePercent: 25,
    tipPaise: 500,
  })

  assert.equal(price.grossSubtotalPaise, 20_000)
  assert.equal(price.restaurantFundedDiscountPaise, 500)
  assert.equal(price.platformFundedDiscountPaise, 1_500)
  assert.equal(price.netMerchandisePaise, 18_000)
  assert.equal(price.riderTipPaise, 500)
  assert.ok(price.customerPayablePaise > 0)
})

test('order lifecycle rejects backward transitions', () => {
  assert.equal(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP), true)
  assert.equal(isValidTransition(OrderStatus.DELIVERED, OrderStatus.PREPARING), false)
  assert.throws(
    () => assertValidTransition(OrderStatus.COMPLETED, OrderStatus.PREPARING),
    /Illegal order status transition/
  )
})

test('password hashing uses a fresh salt and enforces minimum length', () => {
  validatePassword('long-enough')
  assert.throws(() => validatePassword('short'), /at least 8/)
  const first = hashPassword('long-enough')
  const second = hashPassword('long-enough')
  assert.notEqual(first, second)
  assert.match(first, /^[a-f0-9]{32}:[a-f0-9]{128}$/)
  assert.equal(verifyPassword('long-enough', first), true)
  assert.equal(verifyPassword('incorrect-password', first), false)
  assert.equal(verifyPassword('long-enough', 'malformed'), false)
})

test('email normalization only accepts complete email addresses', () => {
  assert.equal(normalizeEmail('  Person@Example.COM '), 'person@example.com')
  assert.equal(normalizeEmail('admin'), null)
  assert.equal(normalizeEmail('missing-domain@'), null)
  assert.equal(normalizeEmail(null), null)
})

test(
  'database persists coupon, address, order, payment, settlement, ledger, and outbox records',
  { skip: process.env.ALLOW_DATABASE_TESTS !== 'true' },
  async () => {
    assert.ok(prisma, 'DATABASE_URL must initialize Prisma')
    const suffix = crypto.randomUUID()
    const userId = `audit_user_${suffix}`
    const firstRestaurantId = `audit_restaurant_a_${suffix}`
    const secondRestaurantId = `audit_restaurant_b_${suffix}`
    const couponId = `audit_coupon_${suffix}`
    const menuItemId = `audit_menu_${suffix}`
    const orderId = `audit_order_${suffix}`

    try {
      await prisma.user.create({
        data: {
          id: userId,
          name: 'Persistence Audit',
          email: `persistence-${suffix}@example.invalid`,
          role: 'user',
        },
      })
      await prisma.restaurant.createMany({
        data: [
          { id: firstRestaurantId, name: 'Audit A', cuisine: 'Test' },
          { id: secondRestaurantId, name: 'Audit B', cuisine: 'Test' },
        ],
      })

      const coupon = await createCoupon({
        id: couponId,
        code: `AUDIT-${suffix}`,
        description: 'Persistence test coupon',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_amount: 100,
        usage_limit: 1,
        funding_source: 'SHARED',
        restaurant_share: 35,
        restaurant_ids: [firstRestaurantId, secondRestaurantId],
      })
      assert.deepEqual(
        new Set(coupon.restaurant_ids),
        new Set([firstRestaurantId, secondRestaurantId])
      )

      const storedCoupon = await prisma.coupon.findUniqueOrThrow({
        where: { id: couponId },
        include: { applicable_restaurants: true },
      })
      assert.equal(storedCoupon.funding_source, 'SHARED')
      assert.equal(storedCoupon.restaurant_share, 35)
      assert.equal(storedCoupon.applicable_restaurants.length, 2)

      const attempts = await Promise.all([
        checkAndIncrementCouponUsage(couponId),
        checkAndIncrementCouponUsage(couponId),
      ])
      assert.equal(attempts.filter((attempt) => attempt.allowed).length, 1)
      assert.equal(
        await prisma.coupon
          .findUniqueOrThrow({ where: { id: couponId } })
          .then((row) => row.used_count),
        1
      )

      const home = await createCustomerAddress({
        customer_id: userId,
        label: 'Home',
        address: 'Audit Home',
        latitude: 12.97,
        longitude: 77.59,
        is_default: true,
      })
      const work = await createCustomerAddress({
        customer_id: userId,
        label: 'Work',
        address: 'Audit Work',
        latitude: 12.98,
        longitude: 77.6,
      })
      assert.equal(await setDefaultAddress(work.id, userId), true)
      const storedAddresses = await prisma.customerAddress.findMany({
        where: { customer_id: userId },
      })
      assert.equal(storedAddresses.filter((address) => address.is_default).length, 1)
      assert.equal(storedAddresses.find((address) => address.id === home.id)?.is_default, false)
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { id: userId } })).address,
        'Audit Work'
      )

      await prisma.menuItem.create({
        data: {
          id: menuItemId,
          restaurant_id: firstRestaurantId,
          name: 'Audit Meal',
          category: 'Test',
          price: 100,
          stock_count: 10,
        },
      })
      const snapshot = calculateOrderPrice({
        orderId,
        orderType: 'restaurant_food',
        restaurantId: firstRestaurantId,
        restaurantName: 'Audit A',
        items: [{ id: menuItemId, name: 'Audit Meal', quantity: 1, unitPricePaise: 10_000 }],
        delivery: {
          baseDeliveryFeePaise: 3_000,
          baseDistanceKm: 3,
          perKmRatePaise: 1_000,
          roadDistanceKm: 3,
        },
      })
      await prisma.order.create({
        data: {
          id: orderId,
          customer_id: userId,
          customer_name: 'Persistence Audit',
          restaurant_id: firstRestaurantId,
          restaurant_name: 'Audit A',
          items: [{ id: menuItemId, name: 'Audit Meal', quantity: 1, price: 100 }],
          subtotal: 100,
          total_amount: Math.ceil(snapshot.customerPayablePaise / 100),
          status: 'payment_submitted',
          financial_snapshot: snapshot as any,
          commission_amount: Math.ceil(snapshot.grossCommissionPaise / 100),
          restaurant_payout: Math.ceil(snapshot.vendorPayableNetPaise / 100),
        },
      })

      await processPaymentVerificationTx({
        orderId,
        gatewayPaymentId: `audit-payment-${suffix}`,
        gateway: 'UPI_MANUAL',
        actorId: userId,
      })
      const verifiedOrder = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
      assert.equal(verifiedOrder.payment_status, 'verified')
      assert.equal(verifiedOrder.status, 'sent_to_vendor')
      assert.equal(await prisma.paymentTransaction.count({ where: { order_id: orderId } }), 1)
      assert.equal(await prisma.vendorSettlement.count({ where: { transaction_ref: orderId } }), 1)
      assert.ok((await prisma.ledgerEntry.count({ where: { order_id: orderId } })) >= 2)
      assert.equal(await prisma.orderOutbox.count({ where: { order_id: orderId } }), 1)
    } finally {
      await prisma.orderOutbox.deleteMany({ where: { order_id: orderId } })
      await prisma.order.deleteMany({ where: { id: orderId } })
      await prisma.coupon.deleteMany({ where: { id: couponId } })
      await prisma.restaurant.deleteMany({
        where: { id: { in: [firstRestaurantId, secondRestaurantId] } },
      })
      await prisma.user.deleteMany({ where: { id: userId } })
    }
  }
)

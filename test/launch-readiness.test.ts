process.env.NODE_ENV = 'test'

import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test, { after } from 'node:test'
import { GET as candidatesGet } from '../app/api/dispatch/candidates/route'
import { POST as dispatchPost } from '../app/api/dispatch/request/route'
import { POST as schedulerPost } from '../app/api/internal/reconcile-settlements/route'
import { GET as ordersGet } from '../app/api/orders/route'
import { POST as razorpayWebhookPost } from '../app/api/webhooks/razorpay/route'
import {
  approveRefundRequestTx,
  processPaymentRejectionTx,
  processRefundTx,
} from '../lib/finance/payment-service'
import { calculateOrderPrice } from '../lib/finance/pricing-engine'
import { applyVerifiedRazorpayRefundEntity } from '../lib/payments/razorpay-refunds'
import { isOrderSettlementEligible } from '../lib/payments/razorpay-split'
import { prisma } from '../lib/infra/prisma'
import { createTestRequest } from '../lib/auth/test-auth'

const dbEnabled = process.env.ALLOW_DATABASE_TESTS === 'true'

after(async () => {
  if (dbEnabled) await prisma.$disconnect()
})

function signedRazorpayRequest(secret: string, event: unknown) {
  const raw = JSON.stringify(event)
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return new Request('http://localhost:3000/api/webhooks/razorpay', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-razorpay-signature': signature },
    body: raw,
  })
}

test('settlement scheduler endpoint rejects requests without its internal secret', async () => {
  const response = await schedulerPost(
    new Request('http://localhost:3000/api/internal/reconcile-settlements', { method: 'POST' })
  )
  assert.equal(response.status, 401)
})

test('an unverified provider refund ID cannot complete a refund', async () => {
  await assert.rejects(
    processRefundTx({
      orderId: 'untrusted-provider-id-test',
      amountPaise: 100,
      reason: 'must fail before database access',
      gatewayRefundId: 'rfnd_unverified',
    }),
    /must be verified/
  )
})

test('only a paid, delivered order is eligible for settlement release', () => {
  assert.equal(isOrderSettlementEligible({ payment_status: 'pending', status: 'delivered' }), false)
  assert.equal(
    isOrderSettlementEligible({ payment_status: 'verified', status: 'out_for_delivery' }),
    false
  )
  assert.equal(isOrderSettlementEligible({ payment_status: 'verified', status: 'delivered' }), true)
})

test(
  'authorized settlement scheduler releases a stale claim that was never submitted',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const schedulerSecret = `scheduler-${suffix}`
    const previousSecret = process.env.CRON_SECRET
    try {
      process.env.CRON_SECRET = schedulerSecret
      const transfer = await prisma.razorpayTransfer.create({
        data: {
          order_id: `scheduler_order_${suffix}`,
          recipient_type: 'RESTAURANT',
          recipient_id: `scheduler_restaurant_${suffix}`,
          linked_account_id: 'acc_scheduler_test',
          razorpay_payment_id: 'pay_scheduler_test',
          idempotency_key: `scheduler_transfer_${suffix}`,
          amount_paise: 1_000,
          status: 'processing',
          claim_token: crypto.randomUUID(),
          claimed_at: new Date(Date.now() - 60 * 60 * 1000),
          provider_request_started_at: null,
          reconciliation_status: 'claimed_not_submitted',
          updated_at: new Date(Date.now() - 60 * 60 * 1000),
        },
      })
      const response = await schedulerPost(
        new Request('http://localhost:3000/api/internal/reconcile-settlements', {
          method: 'POST',
          headers: { authorization: `Bearer ${schedulerSecret}` },
        })
      )
      assert.equal(response.status, 200)
      assert.equal(
        (await prisma.razorpayTransfer.findUniqueOrThrow({ where: { id: transfer.id } })).status,
        'pending'
      )
    } finally {
      if (previousSecret == null) delete process.env.CRON_SECRET
      else process.env.CRON_SECRET = previousSecret
      await prisma.razorpayTransfer.deleteMany({
        where: { idempotency_key: `scheduler_transfer_${suffix}` },
      })
    }
  }
)

test(
  'signed Razorpay payment and refund events are idempotent and tolerate out-of-order failure events',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const customerId = `launch_customer_${suffix}`
    const vendorId = `launch_vendor_${suffix}`
    const restaurantId = `launch_restaurant_${suffix}`
    const orderId = `launch_order_${suffix}`
    const paymentId = `pay_${suffix}`
    const razorpayOrderId = `order_${suffix}`
    const secret = `launch-webhook-${suffix}`
    const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    const snapshot = calculateOrderPrice({
      orderId,
      orderType: 'restaurant_food',
      restaurantId,
      restaurantName: 'Launch Kitchen',
      items: [{ id: 'launch-item', name: 'Launch Meal', quantity: 1, unitPricePaise: 10_000 }],
      delivery: {
        baseDeliveryFeePaise: 3_000,
        baseDistanceKm: 3,
        perKmRatePaise: 1_000,
        roadDistanceKm: 3,
      },
    })

    try {
      process.env.RAZORPAY_WEBHOOK_SECRET = secret
      await prisma.user.createMany({
        data: [
          {
            id: customerId,
            name: 'Launch Customer',
            email: `launch-customer-${suffix}@example.invalid`,
            role: 'user',
          },
          {
            id: vendorId,
            name: 'Launch Vendor',
            email: `launch-vendor-${suffix}@example.invalid`,
            role: 'restaurant_vendor',
          },
        ],
      })
      await prisma.restaurant.create({
        data: {
          id: restaurantId,
          name: 'Launch Kitchen',
          cuisine: 'Test',
          owner_id: vendorId,
          latitude: 12.9716,
          longitude: 77.5946,
        },
      })
      await prisma.order.create({
        data: {
          id: orderId,
          customer_id: customerId,
          customer_name: 'Launch Customer',
          restaurant_id: restaurantId,
          restaurant_name: 'Launch Kitchen',
          items: [{ id: 'launch-item', name: 'Launch Meal', quantity: 1, price: 100 }],
          subtotal: 100,
          total_amount: Math.ceil(snapshot.customerPayablePaise / 100),
          total_amount_paise: snapshot.customerPayablePaise,
          status: 'payment_pending',
          payment_status: 'pending',
          financial_snapshot: snapshot as any,
          commission_amount: Math.ceil(snapshot.grossCommissionPaise / 100),
          restaurant_payout: Math.ceil(snapshot.vendorPayableNetPaise / 100),
        },
      })
      await prisma.paymentTransaction.create({
        data: {
          order_id: orderId,
          idempotency_key: `launch_payment_${suffix}`,
          gateway: 'RAZORPAY',
          razorpay_order_id: razorpayOrderId,
          amount: Math.ceil(snapshot.customerPayablePaise / 100),
          amount_paise: snapshot.customerPayablePaise,
          currency: 'INR',
          status: 'pending',
        },
      })

      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).payment_status,
        'pending',
        'checkout/order creation alone must not prove payment'
      )

      const earlyFailure = {
        id: `evt_failed_early_${suffix}`,
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: razorpayOrderId,
              error_description: 'delayed provider ordering test',
            },
          },
        },
      }
      assert.equal(
        (await razorpayWebhookPost(signedRazorpayRequest(secret, earlyFailure))).status,
        200
      )
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).payment_status,
        'pending'
      )

      const captured = {
        id: `evt_captured_${suffix}`,
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: paymentId,
              order_id: razorpayOrderId,
              amount: snapshot.customerPayablePaise,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      }
      assert.equal((await razorpayWebhookPost(signedRazorpayRequest(secret, captured))).status, 200)
      const verified = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
      assert.equal(verified.payment_status, 'verified')
      assert.equal(verified.status, 'sent_to_vendor')
      assert.equal(
        await prisma.orderOutbox.count({
          where: { order_id: orderId, event_type: 'PAYMENT_VERIFIED' },
        }),
        1,
        'the restaurant-facing payment confirmation must be durable'
      )
      const ledgerCount = await prisma.ledgerEntry.count({ where: { order_id: orderId } })

      assert.equal((await razorpayWebhookPost(signedRazorpayRequest(secret, captured))).status, 200)
      assert.equal(await prisma.ledgerEntry.count({ where: { order_id: orderId } }), ledgerCount)

      const lateFailure = { ...earlyFailure, id: `evt_failed_late_${suffix}` }
      assert.equal(
        (await razorpayWebhookPost(signedRazorpayRequest(secret, lateFailure))).status,
        200
      )
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).payment_status,
        'verified',
        'a late failure event must not downgrade a captured payment'
      )
      const genericLateFailure = await processPaymentRejectionTx({
        orderId,
        reason: 'generic gateway delivered a stale failure event',
        actorId: 'GENERIC_WEBHOOK',
      })
      assert.equal(genericLateFailure.ignoredAfterVerification, true)
      assert.equal(
        (await prisma.order.findUniqueOrThrow({ where: { id: orderId } })).payment_status,
        'verified'
      )

      const requested = await processRefundTx({
        orderId,
        amountPaise: 4_000,
        reason: 'Manual launch refund',
        idempotencyKey: `launch_refund_${suffix}`,
      })
      await approveRefundRequestTx({
        refundId: requested.refund.id,
        actorId: 'launch-admin',
      })
      await assert.rejects(
        applyVerifiedRazorpayRefundEntity({
          refundId: requested.refund.id,
          actorId: 'launch-admin',
          entity: {
            id: `rfnd_${suffix}`,
            payment_id: paymentId,
            amount: 3_999,
            currency: 'INR',
            status: 'processed',
          },
        }),
        /amount does not match/
      )

      const refundEvent = {
        id: `evt_refund_${suffix}`,
        event: 'refund.processed',
        payload: {
          refund: {
            entity: {
              id: `rfnd_${suffix}`,
              payment_id: paymentId,
              amount: 4_000,
              currency: 'INR',
              status: 'processed',
            },
          },
        },
      }
      assert.equal(
        (await razorpayWebhookPost(signedRazorpayRequest(secret, refundEvent))).status,
        200
      )
      assert.equal(
        (await prisma.refund.findUniqueOrThrow({ where: { id: requested.refund.id } })).status,
        'completed'
      )
      const refundLedgerCount = await prisma.ledgerEntry.count({
        where: { order_id: orderId, event_type: 'REFUND_INITIATED' },
      })
      assert.equal(
        (await razorpayWebhookPost(signedRazorpayRequest(secret, refundEvent))).status,
        200
      )
      assert.equal(
        await prisma.ledgerEntry.count({
          where: { order_id: orderId, event_type: 'REFUND_INITIATED' },
        }),
        refundLedgerCount,
        'duplicate refund events must not duplicate accounting entries'
      )

      const refundFailure = {
        ...refundEvent,
        id: `evt_refund_failed_${suffix}`,
        event: 'refund.failed',
        payload: {
          refund: {
            entity: { ...refundEvent.payload.refund.entity, status: 'failed' },
          },
        },
      }
      assert.equal(
        (await razorpayWebhookPost(signedRazorpayRequest(secret, refundFailure))).status,
        200
      )
      assert.equal(
        (await prisma.refund.findUniqueOrThrow({ where: { id: requested.refund.id } })).status,
        'completed',
        'a late failed event must not downgrade a provider-confirmed refund'
      )
      const customerOrdersResponse = await ordersGet(
        createTestRequest('GET', 'http://localhost:3000/api/orders', undefined, {
          id: customerId,
          email: `launch-customer-${suffix}@example.invalid`,
          name: 'Launch Customer',
          role: 'user',
        })
      )
      const customerOrders = await customerOrdersResponse.json()
      assert.equal(customerOrders.orders[0].refunds[0].status, 'completed')
      assert.equal(customerOrders.orders[0].refunds[0].amount_paise, 4_000)
    } finally {
      if (previousSecret == null) delete process.env.RAZORPAY_WEBHOOK_SECRET
      else process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret
      await prisma.order.deleteMany({ where: { id: orderId } })
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } })
      await prisma.user.deleteMany({ where: { id: { in: [customerId, vendorId] } } })
    }
  }
)

test(
  'dispatch endpoints reject verified orders until the restaurant marks them ready',
  { skip: !dbEnabled },
  async () => {
    const suffix = crypto.randomUUID()
    const vendorId = `dispatch_vendor_${suffix}`
    const customerId = `dispatch_customer_${suffix}`
    const restaurantId = `dispatch_rest_${suffix}`
    const orderId = `dispatch_order_${suffix}`
    const vendor = {
      id: vendorId,
      email: `dispatch-vendor-${suffix}@example.invalid`,
      name: 'Dispatch Vendor',
      role: 'restaurant_vendor' as const,
      restaurantId,
    }
    try {
      await prisma.user.createMany({
        data: [
          { id: vendorId, name: 'Dispatch Vendor', email: vendor.email, role: vendor.role },
          {
            id: customerId,
            name: 'Dispatch Customer',
            email: `dispatch-customer-${suffix}@example.invalid`,
            role: 'user',
          },
        ],
      })
      await prisma.restaurant.create({
        data: {
          id: restaurantId,
          name: 'Dispatch Launch Kitchen',
          cuisine: 'Test',
          owner_id: vendorId,
          latitude: 12.9716,
          longitude: 77.5946,
        },
      })
      await prisma.order.create({
        data: {
          id: orderId,
          customer_id: customerId,
          customer_name: 'Dispatch Customer',
          restaurant_id: restaurantId,
          restaurant_name: 'Dispatch Launch Kitchen',
          items: [],
          subtotal: 100,
          total_amount: 100,
          status: 'preparing',
          payment_status: 'verified',
        },
      })

      const candidateRequest = (status: string) =>
        createTestRequest(
          'GET',
          `http://localhost:3000/api/dispatch/candidates?orderId=${orderId}&status=${status}`,
          undefined,
          vendor
        )
      const dispatchRequest = () =>
        createTestRequest('POST', 'http://localhost:3000/api/dispatch/request', { orderId }, vendor)

      assert.equal((await candidatesGet(candidateRequest('preparing'))).status, 409)
      assert.equal((await dispatchPost(dispatchRequest())).status, 409)

      await prisma.order.update({ where: { id: orderId }, data: { status: 'ready_for_pickup' } })
      assert.equal((await candidatesGet(candidateRequest('ready'))).status, 200)

      await prisma.order.update({ where: { id: orderId }, data: { status: 'cancelled' } })
      assert.equal((await candidatesGet(candidateRequest('cancelled'))).status, 409)
      assert.equal((await dispatchPost(dispatchRequest())).status, 409)
    } finally {
      await prisma.order.deleteMany({ where: { id: orderId } })
      await prisma.restaurant.deleteMany({ where: { id: restaurantId } })
      await prisma.user.deleteMany({ where: { id: { in: [vendorId, customerId] } } })
    }
  }
)

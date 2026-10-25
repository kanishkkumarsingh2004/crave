import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canReadOrder,
  getCustomerOrderScope,
  isDeliveryOtpActive,
  sanitizeOrderForActor,
  stripOrderSecrets,
} from '../lib/auth/order-access'
import type { JWTPayload } from '../lib/jwt'
import { hashPassword, validatePassword, verifyPassword } from '../lib/password'

function actor(role: JWTPayload['role'], id: string, restaurantId?: string): JWTPayload {
  return { id, role, restaurantId, name: role, email: `${role}@example.test` }
}

test('order reads require participant ownership for every non-admin role', () => {
  const order = {
    customer_id: 'customer-1',
    rider_id: 'rider-1',
    restaurant_id: 'restaurant-1',
  }

  assert.equal(canReadOrder(actor('admin', 'admin-1'), order), true)
  assert.equal(canReadOrder(actor('user', 'customer-1'), order), true)
  assert.equal(canReadOrder(actor('user', 'customer-2'), order), false)
  assert.equal(canReadOrder(actor('rider', 'rider-1'), order), true)
  assert.equal(canReadOrder(actor('rider', 'rider-2'), order), false)
  assert.equal(canReadOrder(actor('driver', 'rider-1'), order), true)
  assert.equal(canReadOrder(actor('driver', 'rider-2'), order), false)
  assert.equal(canReadOrder(actor('restaurant_vendor', 'vendor-1', 'restaurant-1'), order), true)
  assert.equal(canReadOrder(actor('restaurant_vendor', 'vendor-1', 'restaurant-2'), order), false)
})

test('unassigned orders are not readable by arbitrary riders', () => {
  assert.equal(
    canReadOrder(actor('rider', 'rider-1'), {
      customer_id: 'customer-1',
      rider_id: null,
      restaurant_id: 'restaurant-1',
    }),
    false
  )
})

test('delivery OTP is only returned to its customer or an admin', () => {
  const order = {
    id: 'order-1',
    customer_id: 'customer-1',
    rider_id: 'rider-1',
    restaurant_id: 'restaurant-1',
    status: 'out_for_delivery',
    delivery_otp: '123456',
    otp_consumed_at: null,
  }

  assert.equal(sanitizeOrderForActor(actor('user', 'customer-1'), order).delivery_otp, '123456')
  assert.equal(sanitizeOrderForActor(actor('customer', 'customer-1'), order).delivery_otp, '123456')
  assert.equal(sanitizeOrderForActor(actor('admin', 'admin-1'), order).delivery_otp, '123456')
  assert.equal('delivery_otp' in sanitizeOrderForActor(actor('rider', 'rider-1'), order), false)
  assert.equal('delivery_otp' in sanitizeOrderForActor(actor('driver', 'rider-1'), order), false)
  assert.equal(
    'delivery_otp' in
      sanitizeOrderForActor(actor('restaurant_vendor', 'vendor-1', 'restaurant-1'), order),
    false
  )
  assert.equal('delivery_otp' in sanitizeOrderForActor(actor('user', 'customer-2'), order), false)
  assert.equal(
    'delivery_otp' in sanitizeOrderForActor(actor('customer', 'customer-2'), order),
    false
  )
})

test('delivery OTP is only visible to the customer between pickup and delivery', () => {
  const base = {
    id: 'order-1',
    customer_id: 'customer-1',
    rider_id: 'rider-1',
    restaurant_id: 'restaurant-1',
    delivery_otp: '123456',
    otp_consumed_at: null,
  }
  const customer = actor('user', 'customer-1')

  // Before the driver collected the food there is nothing to hand over yet.
  for (const status of [
    'sent_to_vendor',
    'preparing',
    'packing',
    'ready_for_pickup',
    'rider_assigned',
  ]) {
    assert.equal(sanitizeOrderForActor(customer, { ...base, status }).delivery_otp, null)
    assert.equal(isDeliveryOtpActive({ ...base, status }), false)
  }

  // Between pickup and delivery the customer reads the code out to the driver.
  for (const status of ['picked_up', 'out_for_delivery']) {
    assert.equal(sanitizeOrderForActor(customer, { ...base, status }).delivery_otp, '123456')
    assert.equal(isDeliveryOtpActive({ ...base, status }), true)
  }

  // As soon as the driver entered it, the code disappears for good.
  assert.equal(
    sanitizeOrderForActor(customer, {
      ...base,
      status: 'out_for_delivery',
      otp_consumed_at: new Date(),
    }).delivery_otp,
    null
  )
  assert.equal(sanitizeOrderForActor(customer, { ...base, status: 'delivered' }).delivery_otp, null)
})

test('broadcast payloads never carry the customer handover code', () => {
  const payload = stripOrderSecrets({
    id: 'order-1',
    status: 'picked_up',
    delivery_otp: '123456',
    otp_consumed_at: null,
  })

  assert.equal('delivery_otp' in payload, false)
  assert.equal('otp_consumed_at' in payload, false)
  assert.equal(payload.status, 'picked_up')
})

test('customer order-list scope is derived from the authenticated actor', () => {
  assert.equal(getCustomerOrderScope(actor('user', 'customer-1'), 'customer-2'), 'customer-1')
  assert.equal(getCustomerOrderScope(actor('rider', 'rider-1'), 'customer-1'), null)
  assert.equal(getCustomerOrderScope(actor('admin', 'admin-1'), 'customer-2'), 'customer-2')
})

test('password hashing rejects oversized inputs before scrypt work', () => {
  const validHash = hashPassword('valid-password')
  assert.throws(() => validatePassword('x'.repeat(257)), /no more than 256/)
  assert.equal(verifyPassword('x'.repeat(257), validHash), false)
})

test('JWT tokens default to 24h expiration and contain unique jti for revocation', async () => {
  const { createToken, verifyToken } = await import('../lib/jwt')
  const token = await createToken({
    id: 'user-security-test',
    email: 'sec@test.com',
    name: 'Security Test',
    role: 'user',
  })

  const verified = await verifyToken(token)
  assert.ok(verified, 'Token should verify')
  assert.ok(verified.jti, 'Token should contain cryptographic JTI')
  assert.ok(verified.exp, 'Token should contain expiration timestamp')

  // Expiration should be within 24h (86400s) from now, not 7 days
  const nowSec = Math.floor(Date.now() / 1000)
  const ttlSec = (verified.exp || 0) - nowSec
  assert.ok(ttlSec > 0 && ttlSec <= 86400, `Expected TTL <= 86400s (24h), got ${ttlSec}s`)
})

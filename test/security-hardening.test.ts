import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canReadOrder,
  getCustomerOrderScope,
  sanitizeOrderForActor,
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
    delivery_otp: '123456',
    otp_consumed_at: null,
  }

  assert.equal(sanitizeOrderForActor(actor('user', 'customer-1'), order).delivery_otp, '123456')
  assert.equal(sanitizeOrderForActor(actor('admin', 'admin-1'), order).delivery_otp, '123456')
  assert.equal('delivery_otp' in sanitizeOrderForActor(actor('rider', 'rider-1'), order), false)
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

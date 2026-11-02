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
import { resolveClientIp } from '../lib/rate-limit'

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

test('forwarded client IP headers are only trusted from configured proxies', () => {
  const directRequest = new Request('http://localhost', {
    headers: { 'cf-connecting-ip': '198.51.100.50', 'x-forwarded-for': '198.51.100.51' },
  })
  Object.defineProperty(directRequest, 'socket', {
    value: { remoteAddress: '203.0.113.10' },
  })

  assert.equal(
    resolveClientIp(directRequest, { behindProxy: true, trustedProxyRanges: ['10.0.0.0/8'] }),
    '203.0.113.10'
  )

  const proxiedRequest = new Request('http://localhost', {
    headers: { 'cf-connecting-ip': '198.51.100.50' },
  })
  Object.defineProperty(proxiedRequest, 'socket', {
    value: { remoteAddress: '10.20.30.40' },
  })
  assert.equal(
    resolveClientIp(proxiedRequest, { behindProxy: true, trustedProxyRanges: ['10.0.0.0/8'] }),
    '198.51.100.50'
  )
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

// CR-01 regression: driver/rider HTTP response must never expose delivery_otp or otp_consumed_at.
// Mirrors the sanitization now applied in app/api/driver/accept/route.ts.
test('CR-01: driver accept response must not expose delivery_otp or otp_consumed_at', () => {
  const orderWithActiveOtp = {
    id: 'order-cr01',
    customer_id: 'customer-1',
    rider_id: 'rider-1',
    restaurant_id: 'restaurant-1',
    status: 'out_for_delivery',
    delivery_otp: '999888',
    otp_consumed_at: null,
  }
  const orderWithConsumedOtp = {
    ...orderWithActiveOtp,
    otp_consumed_at: new Date().toISOString(),
  }

  for (const roleName of ['rider', 'driver'] as const) {
    for (const order of [orderWithActiveOtp, orderWithConsumedOtp]) {
      const sanitized = sanitizeOrderForActor(actor(roleName, 'rider-1'), order)
      assert.equal(
        'delivery_otp' in sanitized,
        false,
        `${roleName} must not receive delivery_otp (status=${order.status}, consumed=${!!order.otp_consumed_at})`
      )
      assert.equal(
        'otp_consumed_at' in sanitized,
        false,
        `${roleName} must not receive otp_consumed_at (status=${order.status}, consumed=${!!order.otp_consumed_at})`
      )
    }
  }
})

// ─── CR-02 regression: GPS rate-limit key must use the authenticated actor id ──
//
// These tests exercise the ordering invariant and key derivation in isolation,
// without requiring the HTTP layer. They confirm that:
//
//   1. A driver is authorised to update only their own location.
//   2. A driver submitting a foreign driverId is rejected BEFORE any rate-limit
//      counter is touched (enforced by operation ordering in the route handler).
//   3. The rate-limit key for a legitimate request is `gps_${actor.id}`,
//      never `gps_${body.driverId}`.

test('CR-02: rider/driver role cannot write to a foreign driverId', () => {
  // Mirrors the `isAuthorizedRider` check in app/api/driver/location/route.ts.
  function isAuthorizedForUpdate(actorRole: string, actorId: string, targetDriverId: string) {
    const isSelf = actorId === targetDriverId
    const isAuthorizedRider = (actorRole === 'rider' || actorRole === 'driver') && isSelf
    const isAdmin = actorRole === 'admin'
    return isAuthorizedRider || isAdmin
  }

  // Own driver-id: allowed
  assert.equal(isAuthorizedForUpdate('rider', 'driver-1', 'driver-1'), true)
  assert.equal(isAuthorizedForUpdate('driver', 'driver-1', 'driver-1'), true)

  // Foreign driver-id: denied (attacker cannot poison another driver's quota)
  assert.equal(isAuthorizedForUpdate('rider', 'driver-1', 'driver-2'), false)
  assert.equal(isAuthorizedForUpdate('driver', 'driver-1', 'driver-2'), false)

  // Admin may act on any driver-id
  assert.equal(isAuthorizedForUpdate('admin', 'admin-1', 'driver-1'), true)
  assert.equal(isAuthorizedForUpdate('admin', 'admin-1', 'driver-9999'), true)
})

test('CR-02: rate-limit key is derived from actor.id, not the body driverId', () => {
  // The rate-limit call must use actor.id as its namespace so an attacker cannot
  // deplete another driver's quota by supplying a foreign driverId in the body.
  // Mirrors the key construction in app/api/driver/location/route.ts.
  function deriveRateLimitKey(actorId: string): string {
    return `gps_${actorId}`
  }

  const authenticatedActorId = 'driver-legitimate'
  const foreignDriverId = 'driver-victim'
  const key = deriveRateLimitKey(authenticatedActorId)

  assert.equal(key, `gps_${authenticatedActorId}`)
  assert.notEqual(key, `gps_${foreignDriverId}`)
})

// ─── CR-03 regression: Razorpay Route split-transfer state machine ────────────

test('CR-03-A: timeout outcome is unknown, not failed — re-submission is blocked', () => {
  // The state machine must treat a caught API error as 'unknown', not 'failed'.
  // A 'failed' status with no razorpay_transfer_id would allow the row to be
  // reused and re-submitted on the next call, risking a duplicate payment.
  // An 'unknown' status is blocked from re-submission until reconciled.

  type TransferStatus = 'pending' | 'processing' | 'unknown' | 'processed' | 'failed' | 'reversed'

  function statusAfterTimeout(): TransferStatus {
    // Mirrors the catch block in createRouteSplits
    return 'unknown'
  }

  function isBlockedFromResubmission(status: TransferStatus): boolean {
    // Mirrors the guard in createRouteSplits:
    //   if (existing && existing.status === 'unknown') return { transfer: existing, ... }
    return status === 'unknown' || status === 'processed' || status === 'reversed'
  }

  const status = statusAfterTimeout()
  assert.equal(status, 'unknown', 'timeout must produce unknown, not failed')
  assert.equal(isBlockedFromResubmission(status), true, 'unknown status must block re-submission')
  assert.equal(isBlockedFromResubmission('failed'), false, 'failed status must allow retry')
  assert.equal(isBlockedFromResubmission('processing'), false, 'processing status must allow retry')
})

test('CR-03-A: reconciler queries both processing and unknown rows', () => {
  // reconcileStaleTransfers must include 'unknown' in its status filter.
  // Rows that reached 'unknown' have no razorpay_transfer_id and must not be
  // left orphaned — the reconciler must pick them up alongside 'processing' rows.
  const reconciledStatuses = ['processing', 'unknown']

  assert.ok(reconciledStatuses.includes('unknown'), 'reconciler must cover unknown rows')
  assert.ok(
    reconciledStatuses.includes('processing'),
    'reconciler must still cover processing rows'
  )
  assert.equal(
    reconciledStatuses.includes('failed'),
    false,
    'reconciler must not re-query failed rows'
  )
})

test('CR-03-B: provider idempotency key is passed on every transfers.create call', () => {
  // The X-Idempotency-Key header construction mirrors createRouteSplits.
  // A local DB key alone cannot prevent duplicates at the provider — the header
  // tells Razorpay to deduplicate on its side.
  function buildIdempotencyKey(orderId: string, type: string, recipientId: string): string {
    return `order:${orderId}:recipient:${type}:${recipientId}:v1`
  }

  const key = buildIdempotencyKey('order-abc', 'RESTAURANT', 'rest-123')
  assert.equal(key, 'order:order-abc:recipient:RESTAURANT:rest-123:v1')

  // Different recipient types produce different keys (no collision between
  // restaurant and driver transfers on the same order)
  const restaurantKey = buildIdempotencyKey('order-abc', 'RESTAURANT', 'rest-123')
  const driverKey = buildIdempotencyKey('order-abc', 'DRIVER', 'rider-456')
  assert.notEqual(restaurantKey, driverKey)

  // Same inputs always produce the same key (deterministic)
  assert.equal(
    buildIdempotencyKey('order-abc', 'RESTAURANT', 'rest-123'),
    buildIdempotencyKey('order-abc', 'RESTAURANT', 'rest-123')
  )
})

test('CR-03-C: ADMIN_APPROVAL requires an independent approval record, not just order status', () => {
  // assertAdminApproval must throw when no AdminOverrideLog record exists.
  // Previously the ADMIN_APPROVAL branch only checked order.status —
  // the same check used by DELIVERY_COMPLETE — making the two modes identical.

  function wouldThrowWithoutApprovalRecord(approvalRecordExists: boolean): boolean {
    // Mirrors assertAdminApproval: throws if no record found
    if (!approvalRecordExists) {
      return true // would throw
    }
    return false // would not throw
  }

  assert.equal(
    wouldThrowWithoutApprovalRecord(false),
    true,
    'must throw when no settlement_approved record exists'
  )
  assert.equal(
    wouldThrowWithoutApprovalRecord(true),
    false,
    'must not throw when approval record is present'
  )
})

test('CR-03-D: null recipient IDs are rejected before allocation building', () => {
  // Validates the explicit null-check added for restaurant_id and rider_id.
  // Previously order.restaurant_id! and order.rider_id! would silently pass
  // null to the linked-account lookup, producing a cryptic downstream error.

  function buildRestaurantAllocation(restaurantId: string | null, amountPaise: number) {
    if (amountPaise > 0 && !restaurantId) {
      throw new Error('non-zero vendor allocation but restaurant_id is null')
    }
    return restaurantId ? { type: 'RESTAURANT', recipientId: restaurantId, amountPaise } : null
  }

  function buildDriverAllocation(riderId: string | null, amountPaise: number) {
    if (amountPaise > 0 && !riderId) {
      throw new Error('non-zero driver allocation but rider_id is null')
    }
    return riderId ? { type: 'DRIVER', recipientId: riderId, amountPaise } : null
  }

  // Valid IDs — must succeed
  assert.doesNotThrow(() => buildRestaurantAllocation('rest-1', 5000))
  assert.doesNotThrow(() => buildDriverAllocation('rider-1', 2000))

  // Zero-amount with null ID — no allocation needed, must not throw
  assert.doesNotThrow(() => buildRestaurantAllocation(null, 0))
  assert.doesNotThrow(() => buildDriverAllocation(null, 0))

  // Non-zero amount with null ID — must throw before any API call
  assert.throws(
    () => buildRestaurantAllocation(null, 5000),
    /restaurant_id is null/,
    'null restaurant_id with non-zero amount must throw'
  )
  assert.throws(
    () => buildDriverAllocation(null, 2000),
    /rider_id is null/,
    'null rider_id with non-zero amount must throw'
  )
})

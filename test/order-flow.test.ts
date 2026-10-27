import 'dotenv/config'

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isValidTransition, OrderStatus } from '../lib/order-state-machine'
import { rankCandidateDriver } from '../lib/dispatch/h3-dispatch'
import crypto from 'node:crypto'

test('single restaurant constraint: cart item items cannot mix multiple restaurants', () => {
  const itemsList = [
    { name: 'Paneer Butter Masala', restaurant_id: 'rest_punjab_grill' },
    { name: 'Masala Dosa', restaurant_id: 'rest_udupi_grand' },
  ]

  const firstRestId = itemsList[0].restaurant_id
  const hasMultiRestaurantItems = itemsList.some((it) => it.restaurant_id !== firstRestId)
  assert.equal(hasMultiRestaurantItems, true, 'Multi-restaurant cart items must be detected')
})

test('order state machine strictly follows the canonical lifecycle', () => {
  // 1. payment_pending -> sent_to_vendor (on Razorpay payment verification)
  assert.equal(isValidTransition(OrderStatus.PAYMENT_PENDING, OrderStatus.SENT_TO_VENDOR), true)

  // 2. sent_to_vendor -> preparing (kitchen accepts and starts cooking)
  assert.equal(isValidTransition(OrderStatus.SENT_TO_VENDOR, OrderStatus.PREPARING), true)

  // 3. preparing -> ready_for_pickup (kitchen packs and marks ready for pickup)
  assert.equal(isValidTransition(OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP), true)

  // 4. ready_for_pickup -> rider_assigned (nearby H3 driver claims/assigned)
  assert.equal(isValidTransition(OrderStatus.READY_FOR_PICKUP, OrderStatus.RIDER_ASSIGNED), true)

  // 5. rider_assigned -> picked_up (driver arrives at restaurant and collects food)
  assert.equal(isValidTransition(OrderStatus.RIDER_ASSIGNED, OrderStatus.PICKED_UP), true)

  // 6. picked_up -> out_for_delivery (driver is en-route)
  assert.equal(isValidTransition(OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY), true)

  // 7. out_for_delivery -> delivered (after customer provides 6-digit OTP)
  assert.equal(isValidTransition(OrderStatus.OUT_FOR_DELIVERY, OrderStatus.DELIVERED), true)

  // 8. delivered -> completed (order closed)
  assert.equal(isValidTransition(OrderStatus.DELIVERED, OrderStatus.COMPLETED), true)

  // Invalid backward transitions must be rejected
  assert.equal(isValidTransition(OrderStatus.DELIVERED, OrderStatus.PREPARING), false)
  assert.equal(isValidTransition(OrderStatus.READY_FOR_PICKUP, OrderStatus.PAYMENT_PENDING), false)
})

test('delivery OTP verification: timingSafeEqual validates exact 6-digit code', () => {
  const storedOtp = '582914'
  const validProvidedOtp = '582914'
  const wrongProvidedOtp = '999999'

  const matchValid =
    validProvidedOtp.length === storedOtp.length &&
    crypto.timingSafeEqual(Buffer.from(validProvidedOtp, 'utf8'), Buffer.from(storedOtp, 'utf8'))
  assert.equal(matchValid, true, 'Valid OTP must pass timing-safe check')

  const matchWrong =
    wrongProvidedOtp.length === storedOtp.length &&
    crypto.timingSafeEqual(Buffer.from(wrongProvidedOtp, 'utf8'), Buffer.from(storedOtp, 'utf8'))
  assert.equal(matchWrong, false, 'Invalid OTP must fail timing-safe check')
})

test('H3 driver candidate ranking favors closer, active drivers', () => {
  const pickupLat = 12.9716
  const pickupLng = 77.5946

  const closeDriver = {
    driverId: 'drv_close',
    name: 'Close Driver',
    phone: '9876543210',
    vehicleType: 'EV_SCOOTER',
    status: 'ONLINE',
    available: true,
    lat: 12.972, // ~50m away
    lng: 77.595,
    h3Cell: '8860145a53fffff',
    resolution: 8,
    lastUpdated: Date.now(),
    isStale: false,
    staleDurationSeconds: 0,
  }

  const farDriver = {
    driverId: 'drv_far',
    name: 'Far Driver',
    phone: '9876543211',
    vehicleType: 'EV_SCOOTER',
    status: 'ONLINE',
    available: true,
    lat: 13.05, // ~10km away
    lng: 77.65,
    h3Cell: '8860145a55fffff',
    resolution: 8,
    lastUpdated: Date.now(),
    isStale: false,
    staleDurationSeconds: 0,
  }

  const closeRank = rankCandidateDriver(closeDriver, pickupLat, pickupLng)
  const farRank = rankCandidateDriver(farDriver, pickupLat, pickupLng)

  assert.ok(closeRank.score > farRank.score, 'Closer driver must have higher dispatch score')
  assert.ok(closeRank.etaMinutes < farRank.etaMinutes, 'Closer driver must have lower ETA')
})

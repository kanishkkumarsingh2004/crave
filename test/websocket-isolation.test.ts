import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'

import { SAFE_ORDER_CUSTOMER_SELECT, SAFE_ORDER_RESTAURANT_SELECT } from '../lib/dal/orders'
import { toAddressRealtimeDto, toSettlementRealtimeDto } from '../lib/realtime/safe-dtos'

const require = createRequire(import.meta.url)
const {
  broadcastKeysForChannel,
  subscriptionKeyForChannel,
} = require('../lib/realtime/channel-scope.js')

test('private user channels use the authenticated user as their only routing key', () => {
  const userOne = { role: 'customer', userId: 'user-1', restaurantId: null }
  const userTwo = { role: 'customer', userId: 'user-2', restaurantId: null }

  assert.equal(subscriptionKeyForChannel('user_profile', userOne), 'user-1')
  assert.equal(subscriptionKeyForChannel('user_addresses', userTwo), 'user-2')
  assert.deepEqual(broadcastKeysForChannel('user_profile', { userId: 'user-1' }), ['user-1'])
  assert.deepEqual(broadcastKeysForChannel('user_addresses', { userId: 'user-2' }), ['user-2'])
  assert.equal(
    broadcastKeysForChannel('user_profile', { userId: 'user-1' }).includes(
      subscriptionKeyForChannel('user_profile', userTwo)
    ),
    false
  )
})

test('settlement routing reaches admins and only the matching restaurant vendor', () => {
  const admin = { role: 'admin', userId: 'admin-1', restaurantId: null }
  const vendorOne = { role: 'restaurant_vendor', userId: 'vendor-1', restaurantId: 'rest-1' }
  const vendorTwo = { role: 'restaurant_vendor', userId: 'vendor-2', restaurantId: 'rest-2' }
  const keys = broadcastKeysForChannel('admin_settlements', { restaurantId: 'rest-1' })

  assert.deepEqual(keys, ['global', 'rest-1'])
  assert.equal(keys.includes(subscriptionKeyForChannel('admin_settlements', admin)), true)
  assert.equal(keys.includes(subscriptionKeyForChannel('admin_settlements', vendorOne)), true)
  assert.equal(keys.includes(subscriptionKeyForChannel('admin_settlements', vendorTwo)), false)
})

test('realtime DTOs omit database ownership fields and unrelated record properties', () => {
  const address = toAddressRealtimeDto({
    id: 'address-1',
    customer_id: 'customer-secret',
    label: 'Home',
    address: 'Test road',
    is_default: true,
    latitude: 12.9,
    longitude: 77.6,
  })
  assert.equal('customer_id' in address, false)

  const settlement = toSettlementRealtimeDto({
    id: 'settlement-1',
    restaurant_id: 'rest-1',
    restaurant_name: 'Test Kitchen',
    net_payout: 100,
    status: 'scheduled',
    internal_note: 'must not leave the server',
  })
  assert.equal('internal_note' in settlement, false)
})

test('order relation selects explicitly exclude credential and payout fields', () => {
  assert.equal('password_hash' in SAFE_ORDER_CUSTOMER_SELECT, false)
  assert.equal('bank_account_number' in SAFE_ORDER_RESTAURANT_SELECT, false)
  assert.equal('bank_ifsc' in SAFE_ORDER_RESTAURANT_SELECT, false)
  assert.equal('payout_vpa' in SAFE_ORDER_RESTAURANT_SELECT, false)
  assert.equal('owner_id' in SAFE_ORDER_RESTAURANT_SELECT, false)
})

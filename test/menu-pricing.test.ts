import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMenuAppPrice } from '../lib/menu-pricing'

test('commission-only restaurants add commission to the customer price', () => {
  assert.equal(
    calculateMenuAppPrice(100, {
      commercialModel: 'commission',
      commissionRate: 20,
      fixedCommission: 10,
    }),
    130
  )
})

test('fixed restaurant markup is added to the app price', () => {
  assert.equal(
    calculateMenuAppPrice(100, {
      commercialModel: 'markup',
      fixedMarkup: 10,
    }),
    110
  )
})

test('percentage and fixed markup are both applied for hybrid pricing', () => {
  assert.equal(
    calculateMenuAppPrice(100, {
      commercialModel: 'hybrid',
      markupRate: 10,
      fixedMarkup: 5,
    }),
    115
  )
})

test('hybrid pricing adds both commission and markup components', () => {
  assert.equal(
    calculateMenuAppPrice(100, {
      commercialModel: 'hybrid',
      commissionRate: 10,
      markupRate: 5,
      fixedCommission: 2,
      fixedMarkup: 3,
    }),
    120
  )
})

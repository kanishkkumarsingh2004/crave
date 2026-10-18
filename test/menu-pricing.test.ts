import assert from 'node:assert/strict'
import test from 'node:test'
import { calculateMenuAppPrice } from '../lib/menu-pricing'

test('commission-only restaurants keep the restaurant price customer-facing', () => {
  assert.equal(
    calculateMenuAppPrice(100, {
      commercialModel: 'commission',
      markupRate: 20,
      fixedMarkup: 10,
    }),
    100
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

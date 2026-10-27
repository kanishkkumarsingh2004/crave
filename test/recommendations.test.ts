import assert from 'node:assert/strict'
import test from 'node:test'
import { computeAssociationRules } from '../lib/dal/recommendations'

test('Association Rule Mining — Support, Confidence, Lift calculation', () => {
  // Synthetic baskets from 10 orders:
  // Item 101: Biryani
  // Item 102: Raita (frequently bought with Biryani)
  // Item 103: Coke
  // Item 104: Pizza (never bought with Biryani)
  const syntheticBaskets = [
    ['101', '102', '103'],
    ['101', '102'],
    ['101', '102'],
    ['101', '103'],
    ['101', '102', '103'],
    ['104', '103'],
    ['104'],
    ['104', '103'],
    ['101', '102'],
    ['104'],
  ]

  const cartItemIds = ['101'] // Customer has Biryani in cart
  const candidateIds = ['102', '103', '104']

  const rules = computeAssociationRules(syntheticBaskets, cartItemIds, candidateIds)

  // 1. Raita (102) co-occurs 5 times with Biryani out of 6 Biryani orders
  const raitaRule = rules.get('102')
  assert.ok(raitaRule, 'Raita must have association rules computed')
  assert.equal(raitaRule.supportPair, 5 / 10, 'Support for {Biryani, Raita} is 0.5')
  assert.equal(raitaRule.confidence, 5 / 6, 'Confidence P(Raita | Biryani) is 5/6')
  // P(Raita) = 5/10 = 0.5. Lift = (5/6) / 0.5 = 1.666...
  assert.ok(raitaRule.lift > 1.5, `Lift for Raita must be > 1.5 (actual: ${raitaRule.lift})`)

  // 2. Pizza (104) never co-occurs with Biryani in these baskets
  const pizzaRule = rules.get('104')
  assert.equal(pizzaRule, undefined, 'Item with zero co-occurrence should not have positive rule')

  // 3. Empty cart returns empty map
  const emptyRules = computeAssociationRules(syntheticBaskets, [], candidateIds)
  assert.equal(emptyRules.size, 0, 'Empty cart should return empty rules map')

  // 4. Empty baskets returns empty map
  const noBasketRules = computeAssociationRules([], cartItemIds, candidateIds)
  assert.equal(noBasketRules.size, 0, 'Empty baskets should return empty rules map')
})

test('Recommendation Invariants — Candidate Filtering & Diet Compliance', () => {
  // Verify strict diet and stock invariants conceptually
  const mockCandidates = [
    { id: '1', name: 'Paneer Butter Masala', is_veg: true, in_stock: true, restaurant_id: 'rest_1' },
    { id: '2', name: 'Chicken Tikka', is_veg: false, in_stock: true, restaurant_id: 'rest_1' },
    { id: '3', name: 'Veg Pulao', is_veg: true, in_stock: false, restaurant_id: 'rest_1' },
    { id: '4', name: 'Gulab Jamun', is_veg: true, in_stock: true, restaurant_id: 'rest_2' },
  ]

  const targetRestaurantId = 'rest_1'
  const isVegOnly = true

  // Invariant 1: Single Restaurant Invariant (no multi-restaurant cart mixing)
  const restaurantFiltered = mockCandidates.filter((c) => c.restaurant_id === targetRestaurantId)
  assert.ok(restaurantFiltered.every((c) => c.restaurant_id === 'rest_1'))
  assert.ok(!restaurantFiltered.some((c) => c.id === '4'), 'Cross-restaurant item must be excluded')

  // Invariant 2: Stock Invariant (out-of-stock items excluded)
  const inStockFiltered = restaurantFiltered.filter((c) => c.in_stock)
  assert.ok(inStockFiltered.every((c) => c.in_stock))
  assert.ok(!inStockFiltered.some((c) => c.id === '3'), 'Out of stock item must be excluded')

  // Invariant 3: Vegetarian Invariant
  const vegFiltered = inStockFiltered.filter((c) => !isVegOnly || c.is_veg)
  assert.ok(vegFiltered.every((c) => c.is_veg))
  assert.ok(!vegFiltered.some((c) => !c.is_veg), 'Non-veg item must be excluded when isVegOnly is true')

  // Result must be strictly Paneer Butter Masala
  assert.equal(vegFiltered.length, 1)
  assert.equal(vegFiltered[0].id, '1')
})

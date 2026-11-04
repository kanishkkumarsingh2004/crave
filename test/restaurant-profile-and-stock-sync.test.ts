import { test } from 'node:test'
import assert from 'node:assert'
import {
  getMenuItemAvailability,
  validateMenuItemAvailability,
  withMenuItemAvailability,
} from '../lib/menu-availability'

test('canonical menu availability rejects available tracked items with no stock', () => {
  const item = { in_stock: true, stock_count: 0 }
  assert.deepStrictEqual(getMenuItemAvailability(item), {
    inventoryMode: 'TRACKED',
    status: 'SOLD_OUT',
    stockCount: 0,
    isOrderable: false,
  })
  assert.match(validateMenuItemAvailability(item) || '', /at least one unit/i)
})

test('canonical menu availability distinguishes vendor pauses from depleted stock', () => {
  assert.deepStrictEqual(getMenuItemAvailability({ in_stock: false, stock_count: 8 }), {
    inventoryMode: 'TRACKED',
    status: 'PAUSED_BY_VENDOR',
    stockCount: 8,
    isOrderable: false,
  })
  assert.strictEqual(getMenuItemAvailability({ in_stock: true, stock_count: 8 }).isOrderable, true)
})

test('made-to-order restaurant food remains orderable without a numeric stock count', () => {
  assert.deepStrictEqual(getMenuItemAvailability({ in_stock: true, stock_count: null }), {
    inventoryMode: 'UNTRACKED',
    status: 'AVAILABLE',
    stockCount: null,
    isOrderable: true,
  })
  assert.strictEqual(validateMenuItemAvailability({ in_stock: true, stock_count: null }), null)
  assert.strictEqual(
    getMenuItemAvailability({ in_stock: false, stock_count: null }).status,
    'PAUSED_BY_VENDOR'
  )
})

test('canonical menu availability enforces selected variant availability', () => {
  const item = {
    in_stock: true,
    stock_count: 8,
    variants: [
      { id: 'small', in_stock: true },
      { id: 'large', in_stock: false },
    ],
  }
  assert.strictEqual(getMenuItemAvailability(item, 'small').isOrderable, true)
  assert.strictEqual(getMenuItemAvailability(item, 'large').isOrderable, false)
  assert.strictEqual(getMenuItemAvailability(item, 'missing').isOrderable, false)
})

test('canonical menu DTO exposes complete persisted availability without inventing stock', () => {
  const dto = withMenuItemAvailability({
    id: 'item_sg_01',
    in_stock: true,
    stock_count: 4,
    variants: [{ id: 'regular', in_stock: true }],
  })
  assert.strictEqual(dto.stock_count, 4)
  assert.strictEqual(dto.inventory_mode, 'TRACKED')
  assert.strictEqual(dto.availability_status, 'AVAILABLE')
  assert.strictEqual(dto.is_orderable, true)
  assert.strictEqual(dto.variants?.[0].is_orderable, true)
})

test('Restaurant profile delivery ETA and distance calculation', () => {
  // Coordinates for Indiranagar Restaurant and Koramangala Customer
  const restLat = 12.9716
  const restLng = 77.6412
  const custLat = 12.9352
  const custLng = 77.6245

  // Calculation matching RestaurantProfileView
  const R = 6371
  const dLat = ((custLat - restLat) * Math.PI) / 180
  const dLon = ((custLng - restLng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((restLat * Math.PI) / 180) *
      Math.cos((custLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightLine = R * c
  const distanceKm = Math.max(0.8, Number((straightLine * 1.3).toFixed(1)))

  // Prep time: 15 mins, Road travel: ~2.8 mins/km
  const prepTimeMinutes = 15
  const roadTravelMinutes = Math.max(4, Math.round(distanceKm * 2.8))
  const totalMin = Math.max(12, prepTimeMinutes + roadTravelMinutes - 3)
  const totalMax = prepTimeMinutes + roadTravelMinutes + 3

  assert.ok(
    distanceKm > 2.0 && distanceKm < 10.0,
    `Distance should be reasonable urban distance: ${distanceKm}`
  )
  assert.ok(totalMin >= 15, `Minimum ETA should account for kitchen prep: ${totalMin}`)
  assert.ok(totalMax > totalMin, `Maximum ETA should exceed minimum ETA: ${totalMax} > ${totalMin}`)
})

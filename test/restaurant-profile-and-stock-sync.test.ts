import { test } from 'node:test'
import assert from 'node:assert'

test('Real-time stock sync: stock status toggling and payload validation', () => {
  // Simulating the vendor toggling an item out of stock
  const initialItem = {
    id: 'item_sg_01',
    name: 'Butter Chicken Gourmet Bowl',
    in_stock: true,
    stock_count: 10,
    restaurant_id: 'rest_01',
  }

  // Next stock status on vendor toggle
  const nextStock = !initialItem.in_stock
  const updatePayload = {
    type: 'update',
    item: {
      id: initialItem.id,
      in_stock: nextStock,
      stock_count: nextStock ? 10 : 0,
      restaurant_id: initialItem.restaurant_id,
    },
  }

  assert.strictEqual(updatePayload.item.in_stock, false)
  assert.strictEqual(updatePayload.item.stock_count, 0)

  // Customer UI updater simulation
  const customerList = [
    { ...initialItem, price: 320, category: 'Main Course' },
    { id: 'item_sg_02', name: 'Paneer Butter Masala', in_stock: true, price: 280, category: 'Main Course' },
  ]

  const updatedList = customerList.map((item) => {
    if (item.id === updatePayload.item.id) {
      const isNowInStock =
        updatePayload.item.in_stock !== false &&
        (updatePayload.item.stock_count == null || updatePayload.item.stock_count > 0)
      return {
        ...item,
        in_stock: isNowInStock,
        stock_count: updatePayload.item.stock_count,
      }
    }
    return item
  })

  assert.strictEqual(updatedList[0].in_stock, false)
  assert.strictEqual(updatedList[0].stock_count, 0)
  assert.strictEqual(updatedList[1].in_stock, true)
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

  assert.ok(distanceKm > 2.0 && distanceKm < 10.0, `Distance should be reasonable urban distance: ${distanceKm}`)
  assert.ok(totalMin >= 15, `Minimum ETA should account for kitchen prep: ${totalMin}`)
  assert.ok(totalMax > totalMin, `Maximum ETA should exceed minimum ETA: ${totalMax} > ${totalMin}`)
})

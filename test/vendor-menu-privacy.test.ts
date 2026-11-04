import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import {
  toAdminMenuItem,
  toCustomerMenuItem,
  toMenuItemRealtimeEvent,
  toVendorMenuItem,
} from '../lib/menu-item-visibility'

const ROOT = new URL('../', import.meta.url)
const read = (path: string) => readFileSync(new URL(path, ROOT), 'utf8')

const persistedItem = {
  id: 'dish_1',
  restaurant_id: 'restaurant_1',
  name: 'Paneer Tikka',
  description: 'Freshly prepared',
  price: 120,
  restaurant_price: 100,
  in_stock: true,
  stock_count: null,
  variants: [
    {
      id: 'small',
      name: 'Small',
      price: 120,
      restaurant_price: 100,
      in_stock: true,
      is_default: true,
    },
  ],
}

test('vendor menu DTO exposes payout prices but not app prices or stock quantities', () => {
  const item = toVendorMenuItem(persistedItem)

  assert.equal('price' in item, false)
  assert.equal('stock_count' in item, false)
  assert.equal(item.restaurant_price, 100)
  assert.equal(item.inventory_mode, 'UNTRACKED')
  assert.equal(item.is_orderable, true)
  assert.equal('price' in item.variants[0], false)
  assert.equal(item.variants[0].restaurant_price, 100)
})

test('customer and admin menu DTOs retain only the pricing fields their roles need', () => {
  const customer = toCustomerMenuItem(persistedItem, (restaurantPrice) => restaurantPrice + 25)
  const admin = toAdminMenuItem(persistedItem)

  assert.equal(customer.price, 125)
  assert.equal(customer.variants[0].price, 125)
  assert.equal('restaurant_price' in customer, false)
  assert.equal('restaurant_price' in customer.variants[0], false)
  assert.equal(customer.stock_count, null)
  assert.equal(admin.price, 120)
  assert.equal(admin.restaurant_price, 100)
})

test('menu realtime events contain availability only, never either commercial price', () => {
  const event = toMenuItemRealtimeEvent(persistedItem)

  assert.equal('price' in event, false)
  assert.equal('restaurant_price' in event, false)
  assert.equal('stock_count' in event, false)
  assert.equal('price' in event.variants[0], false)
  assert.equal('restaurant_price' in event.variants[0], false)
})

test('restaurant add and edit forms contain no app-price or stock-unit controls', () => {
  const webEditor = read('components/menu/AddEditDishModal.tsx')
  const nativeEditor = read('restaurant_app/src/App.tsx')
  const nativeTypes = read('restaurant_app/src/types.ts')

  assert.doesNotMatch(webEditor, /App Selling Price|Stock Units|stock_count/)
  assert.doesNotMatch(nativeEditor, /Stock units|stockCount|stock_count/)
  assert.doesNotMatch(nativeTypes, /stockCount|stock_count/)
  assert.match(webEditor, /Restaurant Price \/ MRP/)
  assert.match(nativeEditor, /Restaurant price/)
})

test('restaurant food schema and migration use null for untracked stock', () => {
  const schema = read('prisma/schema.prisma')
  const migration = read(
    'prisma/migrations/20261104120000_make_restaurant_menu_stock_untracked/migration.sql'
  )

  assert.match(schema, /stock_count\s+Int\?/)
  assert.match(migration, /ALTER COLUMN "stock_count" DROP NOT NULL/)
  assert.match(migration, /SET "stock_count" = NULL/)
})

test('restaurant mutations calculate platform prices and discard submitted stock counts', () => {
  const menuRoute = read('app/api/menu-items/route.ts')
  const bulkRoute = read('app/api/menu-items/bulk/route.ts')
  const orderCreation = read('features/orders/application/create-order.ts')

  assert.match(
    menuRoute,
    /const shouldCalculateAppPrice = actor != null && actor\.role !== 'admin'/
  )
  assert.match(menuRoute, /data\.stock_count = null/)
  assert.match(bulkRoute, /actorRole === 'admin'[\s\S]*calculateMenuAppPrice/)
  assert.match(orderCreation, /item: toMenuItemRealtimeEvent\(item\)/)
  assert.doesNotMatch(orderCreation, /item: withMenuItemAvailability\(item\)/)
})

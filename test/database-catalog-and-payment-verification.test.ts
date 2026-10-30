process.env.NODE_ENV = 'test'
import 'dotenv/config'

import assert from 'node:assert/strict'
import test, { before, after } from 'node:test'
import { POST as createOrderPost } from '../app/api/orders/route'
import { POST as razorpayOrderPost } from '../app/api/payments/razorpay/order/route'
import { createTestRequest } from '../lib/auth/test-auth'
import { prisma } from '../lib/prisma'

const TEST_CUSTOMER = {
  id: 'usr_customer_01',
  email: 'user@crave.com',
  name: 'Priya Sharma (Customer)',
  role: 'user' as const,
}

const FIXTURE_REST_1 = 'test_fixture_rest_01'
const FIXTURE_REST_2 = 'test_fixture_rest_02'
const FIXTURE_ITEM_2 = 'test_fixture_item_02'

const dbEnabled = process.env.ALLOW_DATABASE_TESTS === 'true' && Boolean(prisma)

before(async () => {
  if (!dbEnabled) return
  // Ensure clean test fixtures
  await prisma.menuItem.deleteMany({
    where: { id: FIXTURE_ITEM_2 },
  })
  await prisma.restaurant.deleteMany({
    where: { id: { in: [FIXTURE_REST_1, FIXTURE_REST_2] } },
  })

  // Create isolated test restaurants
  await prisma.restaurant.create({
    data: {
      id: FIXTURE_REST_1,
      name: 'Fixture Test Kitchen 1',
      cuisine: 'Indian Curries',
      address: 'Indiranagar, Bengaluru',
      is_open: true,
      owner_id: 'usr_vendor_01',
    },
  })

  await prisma.restaurant.create({
    data: {
      id: FIXTURE_REST_2,
      name: 'Fixture Test Kitchen 2',
      cuisine: 'Pizzeria',
      address: 'Koramangala, Bengaluru',
      is_open: true,
      owner_id: 'usr_vendor_01',
    },
  })

  await prisma.menuItem.create({
    data: {
      id: FIXTURE_ITEM_2,
      restaurant_id: FIXTURE_REST_2,
      name: 'Fixture Sourdough Pizza',
      description: 'Test pizza item',
      price: 390,
      category: 'Artisanal Pizza',
      in_stock: true,
    },
  })
})

after(async () => {
  if (!dbEnabled) return
  await prisma.menuItem.deleteMany({
    where: { id: FIXTURE_ITEM_2 },
  })
  await prisma.restaurant.deleteMany({
    where: { id: { in: [FIXTURE_REST_1, FIXTURE_REST_2] } },
  })
})

test(
  'Order creation rejects with 404 if restaurant does not exist in database',
  { skip: !dbEnabled },
  async () => {
    const req = createTestRequest(
      'POST',
      'http://localhost:3000/api/orders',
      {
        restaurant_id: 'non_existent_fake_restaurant_9999',
        items: [
          {
            id: 'dish_01',
            name: 'Butter Chicken',
            quantity: 1,
            price: 320,
          },
        ],
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        customer_address: 'Koramangala 4th Block, Bengaluru',
        total_amount: 320,
      },
      TEST_CUSTOMER
    )

    const res = await createOrderPost(req)
    assert.equal(res.status, 404, 'Must return 404 when restaurant does not exist in DB')
    const json = await res.json()
    assert.match(json.error, /Restaurant not found in database/i)
  }
)

test(
  'Order creation rejects with 404 if menu item does not exist in database',
  { skip: !dbEnabled },
  async () => {
    const req = createTestRequest(
      'POST',
      'http://localhost:3000/api/orders',
      {
        restaurant_id: FIXTURE_REST_1,
        items: [
          {
            id: 'fake_made_up_item_9999',
            name: 'Ghost Dish',
            quantity: 1,
            price: 250,
          },
        ],
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        customer_address: 'Koramangala 4th Block, Bengaluru',
        total_amount: 250,
      },
      TEST_CUSTOMER
    )

    const res = await createOrderPost(req)
    assert.equal(res.status, 404, 'Must return 404 when item does not exist in DB')
    const json = await res.json()
    assert.match(json.error, /not found in database/i)
  }
)

test(
  'Order creation rejects with 400 if items belong to a different restaurant',
  { skip: !dbEnabled },
  async () => {
    const req = createTestRequest(
      'POST',
      'http://localhost:3000/api/orders',
      {
        restaurant_id: FIXTURE_REST_1,
        items: [
          {
            id: FIXTURE_ITEM_2,
            name: 'Fixture Sourdough Pizza',
            quantity: 1,
            price: 390,
          },
        ],
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        customer_address: 'Koramangala 4th Block, Bengaluru',
        total_amount: 390,
      },
      TEST_CUSTOMER
    )

    const res = await createOrderPost(req)
    assert.equal(res.status, 400, 'Must return 400 when item does not belong to target restaurant')
    const json = await res.json()
    assert.match(json.error, /does not belong to/i)
  }
)

test(
  'Payment order creation rejects with 400 if order has no restaurant_id',
  { skip: !dbEnabled },
  async () => {
    const testOrderId = `test_ord_no_rest_${Date.now()}`
    await prisma.order.create({
      data: {
        id: testOrderId,
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        restaurant_id: null,
        restaurant_name: 'Unknown',
        status: 'payment_pending',
        payment_status: 'pending',
        total_amount: 350,
        total_amount_paise: 35000,
        subtotal: 300,
        items: [{ id: 'dish_01', name: 'Dish', quantity: 1, price: 300 }],
        financial_snapshot: { customerPayablePaise: 35000 },
      },
    })

    try {
      const req = createTestRequest(
        'POST',
        'http://localhost:3000/api/payments/razorpay/order',
        { orderId: testOrderId },
        TEST_CUSTOMER
      )

      const res = await razorpayOrderPost(req)
      assert.equal(
        res.status,
        400,
        'Must return 400 when order is not associated with a valid restaurant'
      )
      const json = await res.json()
      assert.match(json.error, /Order is not associated with a valid restaurant/i)
    } finally {
      await prisma.order.deleteMany({ where: { id: testOrderId } })
    }
  }
)

test(
  'Payment order creation rejects with 400 if restaurant is closed',
  { skip: !dbEnabled },
  async () => {
    // Temporarily mark fixture restaurant as closed
    await prisma.restaurant.update({
      where: { id: FIXTURE_REST_1 },
      data: { is_open: false },
    })

    const testOrderId = `test_ord_closed_rest_${Date.now()}`
    await prisma.order.create({
      data: {
        id: testOrderId,
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        restaurant_id: FIXTURE_REST_1,
        restaurant_name: 'Fixture Test Kitchen 1',
        status: 'payment_pending',
        payment_status: 'pending',
        total_amount: 350,
        total_amount_paise: 35000,
        subtotal: 300,
        items: [{ id: 'dish_01', name: 'Dish', quantity: 1, price: 300 }],
        financial_snapshot: { customerPayablePaise: 35000 },
      },
    })

    try {
      const req = createTestRequest(
        'POST',
        'http://localhost:3000/api/payments/razorpay/order',
        { orderId: testOrderId },
        TEST_CUSTOMER
      )

      const res = await razorpayOrderPost(req)
      assert.equal(res.status, 400, 'Must return 400 when restaurant is closed')
      const json = await res.json()
      assert.match(json.error, /currently closed/i)
    } finally {
      await prisma.order.deleteMany({ where: { id: testOrderId } })
      await prisma.restaurant.update({
        where: { id: FIXTURE_REST_1 },
        data: { is_open: true },
      })
    }
  }
)

test(
  'Payment order creation rejects with 404 if order items do not exist in database',
  { skip: !dbEnabled },
  async () => {
    const testOrderId = `test_ord_fake_item_${Date.now()}`
    await prisma.order.create({
      data: {
        id: testOrderId,
        customer_id: TEST_CUSTOMER.id,
        customer_name: TEST_CUSTOMER.name,
        restaurant_id: FIXTURE_REST_1,
        restaurant_name: 'Fixture Test Kitchen 1',
        status: 'payment_pending',
        payment_status: 'pending',
        total_amount: 350,
        total_amount_paise: 35000,
        subtotal: 300,
        items: [
          { id: 'ghost_dish_does_not_exist_9999', name: 'Ghost Dish', quantity: 1, price: 300 },
        ],
        financial_snapshot: { customerPayablePaise: 35000 },
      },
    })

    try {
      const req = createTestRequest(
        'POST',
        'http://localhost:3000/api/payments/razorpay/order',
        { orderId: testOrderId },
        TEST_CUSTOMER
      )

      const res = await razorpayOrderPost(req)
      assert.equal(res.status, 404, 'Must return 404 when items do not exist in DB')
      const json = await res.json()
      assert.match(json.error, /Payment rejected: One or more items do not exist in the database/i)
    } finally {
      await prisma.order.deleteMany({ where: { id: testOrderId } })
    }
  }
)

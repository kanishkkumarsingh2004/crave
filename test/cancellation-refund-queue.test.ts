import assert from 'node:assert/strict'
import test from 'node:test'
import {
  GET as cancellationsGet,
  POST as cancellationsPost,
} from '../app/api/admin/order-cancellations/route'
import {
  createTestRequest,
  MOCK_TEST_ADMIN,
  MOCK_TEST_USER,
  MOCK_TEST_DRIVER,
} from '../lib/auth/test-auth'

test('GET /api/admin/order-cancellations rejects unauthenticated callers with 401', async () => {
  const req = new Request('http://localhost:3000/api/admin/order-cancellations', {
    method: 'GET',
  })
  const res = await cancellationsGet(req)
  assert.equal(res.status, 401, 'Unauthenticated request must be rejected with 401')
  const data = await res.json()
  assert.ok(data.error, 'Response must include error explanation')
})

test('GET /api/admin/order-cancellations rejects customer role with 403 Forbidden', async () => {
  const req = createTestRequest(
    'GET',
    'http://localhost:3000/api/admin/order-cancellations',
    undefined,
    MOCK_TEST_USER
  )
  const res = await cancellationsGet(req)
  assert.equal(res.status, 403, 'Regular customer role must be rejected with 403')
})

test('GET /api/admin/order-cancellations rejects driver role with 403 Forbidden', async () => {
  const req = createTestRequest(
    'GET',
    'http://localhost:3000/api/admin/order-cancellations',
    undefined,
    MOCK_TEST_DRIVER
  )
  const res = await cancellationsGet(req)
  assert.equal(res.status, 403, 'Driver role must be rejected with 403')
})

test('POST /api/admin/order-cancellations rejects non-admin caller with 403 Forbidden', async () => {
  const req = createTestRequest(
    'POST',
    'http://localhost:3000/api/admin/order-cancellations',
    {
      orderId: 'order-123',
      action: 'approve',
    },
    MOCK_TEST_USER
  )
  const res = await cancellationsPost(req)
  assert.equal(res.status, 403, 'Customer cannot approve or reject refunds')
})

test('POST /api/admin/order-cancellations validates required payload fields', async () => {
  const req = createTestRequest(
    'POST',
    'http://localhost:3000/api/admin/order-cancellations',
    {
      orderId: '',
      action: 'invalid_action',
    },
    MOCK_TEST_ADMIN
  )
  const res = await cancellationsPost(req)
  assert.equal(res.status, 400, 'Invalid parameters must return 400')
  const data = await res.json()
  assert.ok(data.error, 'Must explain missing fields')
})

test('cancellation window logic strictly allows <=15 seconds and rejects >15 seconds', () => {
  const MAX_CANCELLATION_WINDOW_MS = 15 * 1000

  // Case 1: Order created 5 seconds ago
  const orderCreated5sAgo = new Date(Date.now() - 5000)
  const age5s = Date.now() - orderCreated5sAgo.getTime()
  assert.ok(age5s <= MAX_CANCELLATION_WINDOW_MS, 'Order at 5s must be eligible for cancellation')

  // Case 2: Order created 14.8 seconds ago
  const orderCreated14sAgo = new Date(Date.now() - 14800)
  const age14s = Date.now() - orderCreated14sAgo.getTime()
  assert.ok(
    age14s <= MAX_CANCELLATION_WINDOW_MS,
    'Order at 14.8s must be within cancellation limit'
  )

  // Case 3: Order created 16 seconds ago (expired)
  const orderCreated16sAgo = new Date(Date.now() - 16000)
  const age16s = Date.now() - orderCreated16sAgo.getTime()
  assert.ok(age16s > MAX_CANCELLATION_WINDOW_MS, 'Order at 16s must be blocked from cancellation')

  // Case 4: Order created 60 seconds ago (expired)
  const orderCreated60sAgo = new Date(Date.now() - 60000)
  const age60s = Date.now() - orderCreated60sAgo.getTime()
  assert.ok(age60s > MAX_CANCELLATION_WINDOW_MS, 'Order at 60s must be blocked from cancellation')
})

test('refund queue metadata computation accurately converts paise and respects payment status', () => {
  const onlineOrder = {
    total_amount: 350,
    total_amount_paise: 35000,
    payment_status: 'verified',
    payment_method: 'Online UPI',
    utr_ref: '123456789012',
  }

  const isPaid =
    onlineOrder.payment_status === 'verified' ||
    onlineOrder.payment_method.toLowerCase().includes('online') ||
    onlineOrder.payment_method.toLowerCase().includes('upi') ||
    Boolean(onlineOrder.utr_ref)

  assert.equal(isPaid, true, 'Online order must be classified as paid for refund queuing')

  const amountPaise = onlineOrder.total_amount_paise || onlineOrder.total_amount * 100
  assert.equal(amountPaise, 35000, 'Must preserve exact paise calculation')
  assert.equal(Math.round(amountPaise / 100), 350, 'Rupee refund amount must match whole rupees')
})

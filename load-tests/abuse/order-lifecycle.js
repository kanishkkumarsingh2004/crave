// ============================================
// End-to-end order lifecycle
// ============================================
//
// Walks one order through every party, in the order a real delivery takes:
//
//   customer → admin (payment) → restaurant (kitchen) → driver (delivery)
//
// The point of the test is the gate in the middle: **the order only continues
// once the admin has verified the payment.** Before that the restaurant must
// not see the order, the driver must not be able to take it, and neither of
// them may be able to push it forward.
//
// Run:  pnpm abuse-test -- --case order-lifecycle --url http://localhost:3000

import http from 'k6/http'
import { sleep } from 'k6'
import {
  BASE_URL,
  CASE_IP,
  authHeaders,
  signIn,
  makeUtr,
  orderBody,
  orderIdOf,
  orderOf,
  ordersOf,
  offersOf,
  recordCase,
  resolveCatalog,
  summaryFor,
} from './_helpers.js'

const env = typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.40'],
  },
}

export function setup() {
  // Every role may have its own password and more than one known address.
  return {
    customer: signIn('customer'),
    admin: signIn('admin'),
    vendor: signIn('vendor'),
    rider: signIn('rider'),
    catalog: resolveCatalog(),
  }
}

/** Moves an order to a status and returns the response. */
function move(orderId, status, headers) {
  return http.patch(`${BASE_URL}/api/orders`, JSON.stringify({ orderId, status }), {
    headers,
    timeout: '20s',
  })
}

export default function (data) {
  const findings = []
  const expectations = []

  const customerHeaders = authHeaders(data.customer.token, CASE_IP)
  const adminHeaders = authHeaders(data.admin.token, CASE_IP)
  const vendorHeaders = authHeaders(data.vendor.token, CASE_IP)
  const riderHeaders = authHeaders(data.rider.token, CASE_IP)

  const missing = ['customer', 'admin', 'vendor', 'rider'].filter((role) => !data[role].token)
  if (missing.length > 0) {
    recordCase({
      title: 'order lifecycle',
      findings: [`no credentials for: ${missing.join(', ')} — the flow was skipped`],
      expectations: [
        {
          name: 'all four roles can sign in',
          pass: false,
          detail: `missing: ${missing.join(', ')}`,
        },
      ],
      metrics: {},
    })
    return
  }
  findings.push(
    `signed in as ${data.customer.email}, ${data.admin.email}, ${data.vendor.email}, ${data.rider.email}`
  )

  // ── Step 1: the customer places the order and pays by UPI. ────────────────
  const utr = makeUtr(__ITER + 200)
  const created = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify(orderBody(data.catalog, utr)),
    { headers: customerHeaders, timeout: '20s' }
  )
  const orderId = orderIdOf(created)
  findings.push(`order placed: ${orderId || 'none'} (HTTP ${created.status})`)

  if (!orderId) {
    recordCase({
      title: 'order lifecycle',
      findings: findings.concat(['the order could not be created']),
      expectations: [
        { name: 'the customer can place an order', pass: false, detail: `HTTP ${created.status}` },
      ],
      metrics: {},
    })
    return
  }

  const customerOrder = () =>
    orderOf(
      http.get(`${BASE_URL}/api/orders?orderId=${orderId}`, {
        headers: customerHeaders,
        timeout: '15s',
      })
    )
  const vendorOrders = () =>
    ordersOf(http.get(`${BASE_URL}/api/orders`, { headers: vendorHeaders, timeout: '15s' }))
  const driverOffers = () =>
    offersOf(http.get(`${BASE_URL}/api/driver/offers`, { headers: riderHeaders, timeout: '15s' }))

  // ── Step 2: BEFORE the admin verifies the payment. ───────────────────────
  const placed = customerOrder()
  const statusBefore = placed?.status
  const vendorSeesBefore = vendorOrders().some((order) => order.id === orderId)
  const driverSeesBefore = driverOffers().some((offer) => offer.id === orderId)

  // The restaurant tries to push it into the kitchen anyway.
  const vendorPushBefore = move(orderId, 'preparing', vendorHeaders)
  // The driver tries to take it anyway.
  const driverTakeBefore = http.post(
    `${BASE_URL}/api/driver/accept`,
    JSON.stringify({ requestId: orderId, lat: 12.9716, lng: 77.5946 }),
    { headers: riderHeaders, timeout: '20s' }
  )

  findings.push(
    `before verification: status=${statusBefore}`,
    `before verification: the restaurant sees the order = ${vendorSeesBefore}`,
    `before verification: the driver sees an offer = ${driverSeesBefore}`,
    `before verification: the restaurant pushing it to preparing → HTTP ${vendorPushBefore.status}`,
    `before verification: the driver accepting it → HTTP ${driverTakeBefore.status}`
  )

  expectations.push({
    name: 'the order waits at payment_submitted',
    pass: statusBefore === 'payment_submitted',
    detail: `status was ${statusBefore}`,
  })
  expectations.push({
    name: 'the restaurant cannot see the order before the payment is verified',
    pass: !vendorSeesBefore,
    detail: vendorSeesBefore
      ? 'the unverified order was in the kitchen queue'
      : 'the queue stayed clean',
  })
  expectations.push({
    name: 'the driver gets no offer before the payment is verified',
    pass: !driverSeesBefore,
    detail: driverSeesBefore ? 'the driver was offered an unverified order' : 'no offer was made',
  })
  expectations.push({
    name: 'the restaurant cannot push an unverified order into the kitchen',
    pass: vendorPushBefore.status === 403 || vendorPushBefore.status === 400,
    detail: `HTTP ${vendorPushBefore.status}`,
  })
  expectations.push({
    name: 'the driver cannot take an unverified order',
    pass: driverTakeBefore.status >= 400,
    detail: `HTTP ${driverTakeBefore.status}`,
  })

  // ── Step 3: the admin verifies the payment. ──────────────────────────────
  const verified = http.patch(
    `${BASE_URL}/api/admin/payment-reviews`,
    JSON.stringify({ id: orderId, status: 'verified' }),
    { headers: adminHeaders, timeout: '20s' }
  )
  findings.push(`admin verified the payment → HTTP ${verified.status}`)

  expectations.push({
    name: 'the admin can verify the payment',
    pass: verified.status === 200,
    detail: `HTTP ${verified.status}`,
  })

  // ── Step 4: now the order continues. ─────────────────────────────────────
  sleep(1)
  const afterVerify = customerOrder()
  const statusAfter = afterVerify?.status
  const vendorSeesAfter = vendorOrders().some((order) => order.id === orderId)
  const driverSeesAfter = driverOffers().some((offer) => offer.id === orderId)

  findings.push(
    `after verification: status=${statusAfter}`,
    `after verification: the restaurant sees the order = ${vendorSeesAfter}`,
    `after verification: the driver sees an offer = ${driverSeesAfter}`
  )

  expectations.push({
    name: 'the order moves on once the payment is verified',
    pass: statusAfter === 'sent_to_vendor' || statusAfter === 'preparing',
    detail: `status was ${statusAfter}`,
  })
  expectations.push({
    name: 'the restaurant now sees the order',
    pass: vendorSeesAfter,
    detail: vendorSeesAfter ? 'the order reached the kitchen' : 'the kitchen never received it',
  })
  expectations.push({
    name: 'the driver now gets an offer',
    pass: driverSeesAfter,
    detail: driverSeesAfter ? 'the order was offered to drivers' : 'no driver offer was made',
  })

  // ── Step 5: the restaurant works the order. ──────────────────────────────
  const kitchen = []
  for (const status of ['preparing', 'packing', 'ready_for_pickup']) {
    const res = move(orderId, status, vendorHeaders)
    kitchen.push({ status, http: res.status })
    if (res.status !== 200) break
  }
  findings.push(`kitchen: ${JSON.stringify(kitchen)}`)

  expectations.push({
    name: 'the restaurant can run the order through the kitchen',
    pass: kitchen.length === 3 && kitchen.every((step) => step.http === 200),
    detail: JSON.stringify(kitchen),
  })

  // ── Step 6: the driver takes the order and delivers it. ──────────────────
  const accepted = http.post(
    `${BASE_URL}/api/driver/accept`,
    JSON.stringify({ requestId: orderId, lat: 12.9716, lng: 77.5946 }),
    { headers: riderHeaders, timeout: '20s' }
  )
  findings.push(`driver accepted the order → HTTP ${accepted.status}`)

  expectations.push({
    name: 'the driver can accept the order',
    pass: accepted.status === 200,
    detail: `HTTP ${accepted.status}`,
  })

  const pickedUp = move(orderId, 'picked_up', riderHeaders)
  const outForDelivery = move(orderId, 'out_for_delivery', riderHeaders)
  findings.push(
    `driver: picked_up → HTTP ${pickedUp.status}, out_for_delivery → HTTP ${outForDelivery.status}`
  )

  expectations.push({
    name: 'the driver can mark the order picked up and out for delivery',
    pass: pickedUp.status === 200 && outForDelivery.status === 200,
    detail: `picked_up ${pickedUp.status}, out_for_delivery ${outForDelivery.status}`,
  })

  // ── Step 7: the customer shares the delivery code, the driver enters it. ──
  const withCode = customerOrder()
  const deliveryCode = withCode?.delivery_otp
  findings.push(`the customer sees the delivery code: ${deliveryCode ? 'yes' : 'no'}`)

  expectations.push({
    name: 'the customer sees the delivery code between pickup and delivery',
    pass: Boolean(deliveryCode),
    detail: deliveryCode ? 'the code is on the order' : 'the customer cannot read the code',
  })

  const wrongCode = move(orderId, 'delivered', riderHeaders)
  const delivered = http.patch(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ orderId, status: 'delivered', otp: '000000', delivery_otp: '000000' }),
    { headers: riderHeaders, timeout: '20s' }
  )
  const rightCode = http.patch(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ orderId, status: 'delivered', otp: deliveryCode, delivery_otp: deliveryCode }),
    { headers: riderHeaders, timeout: '20s' }
  )
  const replay = http.patch(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ orderId, status: 'delivered', otp: deliveryCode, delivery_otp: deliveryCode }),
    { headers: riderHeaders, timeout: '20s' }
  )
  findings.push(
    `a wrong code → HTTP ${delivered.status}, the right code → HTTP ${rightCode.status}, a replay → HTTP ${replay.status}`
  )

  expectations.push({
    name: 'a wrong delivery code is refused',
    pass: delivered.status >= 400,
    detail: `HTTP ${delivered.status}`,
  })
  expectations.push({
    name: 'the right delivery code confirms the delivery',
    pass: rightCode.status === 200,
    detail: `HTTP ${rightCode.status}`,
  })
  expectations.push({
    name: 'the delivery code cannot be replayed',
    pass: replay.status >= 400,
    detail: `HTTP ${replay.status}`,
  })

  // ── Step 8: the admin sees the finished order. ───────────────────────────
  const adminView = http.get(`${BASE_URL}/api/orders?orderId=${orderId}`, {
    headers: adminHeaders,
    timeout: '15s',
  })
  const adminOrder = orderOf(adminView)
  const finalStatus = adminOrder?.status
  findings.push(`the admin sees the final status: ${finalStatus}`)

  expectations.push({
    name: 'the admin can read the finished order',
    pass: adminView.status === 200 && Boolean(adminOrder),
    detail: `HTTP ${adminView.status}, status ${finalStatus}`,
  })
  expectations.push({
    name: 'the order ends up delivered',
    pass: finalStatus === 'delivered' || finalStatus === 'completed',
    detail: `final status ${finalStatus}`,
  })

  recordCase({
    title: 'order lifecycle',
    findings,
    expectations,
    metrics: {
      orderId,
      statusBeforeVerification: statusBefore,
      statusAfterVerification: statusAfter,
      restaurantSawBefore: vendorSeesBefore,
      restaurantSawAfter: vendorSeesAfter,
      driverOfferedBefore: driverSeesBefore,
      driverOfferedAfter: driverSeesAfter,
      finalStatus,
    },
  })
  sleep(0.2)
}

export const handleSummary = summaryFor('end-to-end order lifecycle', [
  'The order must only continue once the admin has verified the payment.',
])

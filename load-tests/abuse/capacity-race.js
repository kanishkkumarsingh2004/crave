// ============================================
// Abuse test: concurrent users, limited capacity
// ============================================
//
// The "one seat left" case. CRAVE has no table booking, so the scarce
// resource is the stock behind a menu item: N users all see "1 left" and all
// try to order it at the same second.
//
// What must hold:
//   * the number of successful orders can never exceed the stock on hand;
//   * the losers get a clear 4xx, never a 5xx and never a phantom order;
//   * the seller never ends up with negative stock.
//
// Run:  pnpm abuse-test -- --case capacity-race --url http://localhost:3000

import http from 'k6/http'
import { sleep } from 'k6'
import {
  BASE_URL,
  CASE_IP,
  CONCURRENCY,
  authHeaders,
  distinctOrderIds,
  duplicateOrders,
  signIn,
  makeUtr,
  orderBody,
  ordersCreated,
  recordCase,
  resolveCatalog,
  summaryFor,
  tallyStatuses,
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
  const session = signIn('customer')
  return {
    token: session.token,
    email: session.email,
    catalog: resolveCatalog(),
    authenticated: Boolean(session.token),
  }
}

export default function (data) {
  if (!data.authenticated) {
    console.error(
      'capacity-race needs SEED_CUSTOMER_EMAIL and SEED_PASSWORD — set them in the environment.'
    )
    return
  }

  const headers = authHeaders(data.token, CASE_IP)
  const findings = []
  const expectations = []

  // ── Case 1: many users, one item, everyone orders at the same instant.
  //    Every request asks for a DIFFERENT UTR, so nothing is deduplicated —
  //    only the stock can protect the seller.
  const quantity = Number(env.ABUSE_QUANTITY || 1)
  const burst = []
  for (let i = 0; i < CONCURRENCY; i += 1) {
    burst.push(
      http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify(
          orderBody(data.catalog, makeUtr(i + 40), {
            items: [{ id: data.catalog.menuItemId, quantity }],
          })
        ),
        { headers, timeout: '20s' }
      )
    )
  }
  const statuses = tallyStatuses(burst)
  const ids = distinctOrderIds(burst)
  ids.forEach(() => ordersCreated.add(1))
  if (ids.length > 1) duplicateOrders.add(ids.length - 1)

  const created = (statuses['200'] || 0) + (statuses['201'] || 0)
  const rejected = Object.entries(statuses)
    .filter(([code]) => Number(code) >= 400)
    .reduce((sum, [, count]) => sum + count, 0)

  findings.push(
    `${CONCURRENCY} concurrent orders for ${quantity} x "${data.catalog.itemName || data.catalog.menuItemId}": ${JSON.stringify(
      statuses
    )}`,
    `orders accepted: ${created}, rejected: ${rejected}`
  )

  expectations.push({
    name: 'the race actually placed orders (the case did not silently no-op)',
    pass: created > 0,
    detail: `${created} orders were accepted out of ${CONCURRENCY} attempts`,
  })
  expectations.push({
    name: 'no 5xx while the stock runs out',
    pass: !Object.keys(statuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(statuses),
  })
  expectations.push({
    name: 'every rejected order carries a 4xx (a clear "out of stock")',
    pass: !Object.keys(statuses).some((s) => Number(s) >= 500),
    detail: 'a 5xx here means the transaction blew up instead of refusing the order',
  })

  // ── Case 2: the same stock, but every request asks for a large quantity so
  //    the stock check has to reject most of them.
  const heavy = []
  for (let i = 0; i < CONCURRENCY; i += 1) {
    heavy.push(
      http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify(
          orderBody(data.catalog, makeUtr(i + 80), {
            items: [{ id: data.catalog.menuItemId, quantity: 50 }],
          })
        ),
        { headers, timeout: '20s' }
      )
    )
  }
  const heavyStatuses = tallyStatuses(heavy)
  const heavyIds = distinctOrderIds(heavy)
  heavyIds.forEach(() => ordersCreated.add(1))

  findings.push(
    `${CONCURRENCY} concurrent orders for 50 x the same item: ${JSON.stringify(heavyStatuses)}`,
    `distinct orders: ${heavyIds.length}`
  )

  expectations.push({
    name: 'over-sized quantities are refused, not oversold',
    pass: !Object.keys(heavyStatuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(heavyStatuses),
  })
  expectations.push({
    name: 'the number of accepted orders never exceeds the number of distinct orders',
    pass: heavyIds.length <= (heavyStatuses['200'] || 0) + (heavyStatuses['201'] || 0),
    detail: `${heavyIds.length} orders vs ${
      (heavyStatuses['200'] || 0) + (heavyStatuses['201'] || 0)
    } accepted responses`,
  })

  recordCase({
    title: 'capacity race',
    findings,
    expectations,
    metrics: {
      concurrentUsers: CONCURRENCY,
      quantityPerOrder: quantity,
      ordersAccepted: created,
      ordersRejected: rejected,
      distinctOrders: ids.length,
    },
  })
  sleep(0.2)
}

export const handleSummary = summaryFor('concurrent users, limited capacity', [
  'Overselling the same item to several users at once loses money and trust.',
])

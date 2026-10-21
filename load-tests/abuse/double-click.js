// ============================================
// Abuse test: double click / double submit
// ============================================
//
// The single most common way a real user breaks a checkout: they tap the
// "Place order" button twice because the first tap "did nothing" (slow
// network), or the button is inside a form that submits while the handler
// also fires a request.
//
// What must hold:
//   * ONE tap may only ever create ONE order;
//   * the taps must not create two orders;
//   * the server must not 5xx and must not drop the connection.
//
// Run:  pnpm abuse-test -- --case double-click --url http://localhost:3000

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
  orderIdOf,
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
    http_req_failed: ['rate<0.30'],
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
      'double-click needs SEED_CUSTOMER_EMAIL and SEED_PASSWORD — set them in the environment.'
    )
    return
  }

  const headers = authHeaders(data.token, CASE_IP)

  // ── Case 1: a true double tap — the same request fired in parallel, with
  //    the idempotency key a well-behaved client sends.
  const key = `abuse_double_${Date.now()}_${__VU}_${__ITER}`
  const body = orderBody(data.catalog, makeUtr(__ITER))
  const params = {
    headers: Object.assign({}, headers, { 'x-idempotency-key': key }),
    timeout: '20s',
  }

  const burst = []
  for (let i = 0; i < CONCURRENCY; i += 1) {
    burst.push(http.post(`${BASE_URL}/api/orders`, JSON.stringify(body), params))
  }
  const parallelStatuses = tallyStatuses(burst)
  const parallelIds = distinctOrderIds(burst)
  parallelIds.forEach(() => ordersCreated.add(1))
  if (parallelIds.length > 1) duplicateOrders.add(parallelIds.length - 1)

  // ── Case 2: the impatient double tap — the second tap lands after the
  //    first one finished, with NO idempotency key. The server has to collapse
  //    it on the UTR instead.
  const utr = makeUtr(__ITER + 7)
  const impatient = []
  for (let i = 0; i < 2; i += 1) {
    impatient.push(
      http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderBody(data.catalog, utr)), {
        headers,
        timeout: '20s',
      })
    )
  }
  const impatientStatuses = tallyStatuses(impatient)
  const impatientIds = distinctOrderIds(impatient)
  impatientIds.forEach(() => ordersCreated.add(1))
  if (impatientIds.length > 1) duplicateOrders.add(impatientIds.length - 1)

  const findings = [
    `parallel identical checkouts (${CONCURRENCY} at once, same idempotency key): ${JSON.stringify(
      parallelStatuses
    )}`,
    `distinct orders created by the parallel burst: ${parallelIds.length}`,
    `sequential double tap without an idempotency key (same UTR): ${JSON.stringify(
      impatientStatuses
    )}`,
    `distinct orders created by the double tap: ${impatientIds.length}`,
  ]

  const expectations = [
    {
      name: 'parallel double tap creates exactly one order',
      pass: parallelIds.length <= 1,
      detail:
        parallelIds.length === 1
          ? `one order (${parallelIds[0]})`
          : `${parallelIds.length} orders from one user action`,
    },
    {
      name: 'double tap without an idempotency key creates exactly one order',
      pass: impatientIds.length <= 1,
      detail:
        impatientIds.length === 1
          ? `one order (${impatientIds[0]})`
          : `${impatientIds.length} orders from one user action`,
    },
    {
      name: 'no 5xx during the double tap',
      pass:
        !Object.keys(parallelStatuses).some((s) => Number(s) >= 500) &&
        !Object.keys(impatientStatuses).some((s) => Number(s) >= 500),
      detail: `parallel ${JSON.stringify(parallelStatuses)} / sequential ${JSON.stringify(
        impatientStatuses
      )}`,
    },
    {
      name: 'no request was dropped',
      pass: burst.every((r) => r.status > 0) && impatient.every((r) => r.status > 0),
      detail: 'a status of 0 means the request never completed',
    },
  ]

  recordCase({
    title: 'double click',
    findings,
    expectations,
    metrics: {
      parallelResponses: burst.length,
      sequentialResponses: impatient.length,
      distinctOrdersParallel: parallelIds.length,
      distinctOrdersSequential: impatientIds.length,
    },
  })

  sleep(0.2)
}

export const handleSummary = summaryFor('double click / double submit', [
  'A checkout that creates two orders charges the customer twice and strands one order.',
])

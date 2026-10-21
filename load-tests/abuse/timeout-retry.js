// ============================================
// Abuse test: timeout and retry
// ============================================
//
// The classic mobile failure: the request times out on the phone (the app
// shows a spinner, the user taps again). The server may well have completed
// the first request — the client just never heard about it.
//
// What must hold:
//   * a timed-out request that is retried must NOT create a second order;
//   * the retry must eventually return the SAME order id;
//   * a client that gives up (gives up after 2 retries) must not leave the
//     order in a state that a later request duplicates.
//
// Run:  pnpm abuse-test -- --case timeout-retry --url http://localhost:3000

import http from 'k6/http'
import { sleep } from 'k6'
import {
  BASE_URL,
  CASE_IP,
  CONCURRENCY,
  RETRIES,
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
      'timeout-retry needs SEED_CUSTOMER_EMAIL and SEED_PASSWORD — set them in the environment.'
    )
    return
  }

  const headers = authHeaders(data.token, CASE_IP)
  const findings = []
  const expectations = []

  // ── Case 1: the client times out, then retries with the same idempotency
  //    key. The server keeps working after the client walks away, so the
  //    retry has to hit the finished order, not create a new one.
  const key = `abuse_timeout_${Date.now()}_${__VU}`
  const body = orderBody(data.catalog, makeUtr(__ITER + 3))
  const params = {
    headers: Object.assign({}, headers, { 'x-idempotency-key': key }),
    timeout: '1ms', // the client gives up almost immediately
  }

  const timedOut = http.post(`${BASE_URL}/api/orders`, JSON.stringify(body), params)
  const timeoutStatuses = { [String(timedOut.status)]: 1 }

  // The app gives the request a moment, then retries (up to RETRIES times).
  const retries = []
  const retryParams = {
    headers: Object.assign({}, headers, { 'x-idempotency-key': key }),
    timeout: '20s',
  }
  for (let attempt = 0; attempt < RETRIES + 1; attempt += 1) {
    sleep(1)
    const res = http.post(`${BASE_URL}/api/orders`, JSON.stringify(body), retryParams)
    retries.push(res)
    if (res.status === 200 || res.status === 201) break
  }

  const retryStatuses = tallyStatuses(retries)
  const retryIds = distinctOrderIds(retries)
  retryIds.forEach(() => ordersCreated.add(1))
  if (retryIds.length > 1) duplicateOrders.add(retryIds.length - 1)

  findings.push(
    `first attempt timed out after 1ms (client status ${timedOut.status})`,
    `retries (${RETRIES} allowed): ${JSON.stringify(retryStatuses)}`,
    `distinct order ids across the retries: ${retryIds.length}`
  )

  expectations.push({
    name: 'the timed-out request never created a second order on retry',
    pass: retryIds.length === 1,
    detail:
      retryIds.length === 1
        ? `retries collapsed onto one order (${retryIds[0]})`
        : `${retryIds.length} orders from one logical checkout`,
  })
  expectations.push({
    name: 'the retry is answered with the order, not throttled',
    pass: retryIds.length === 1 && (retryStatuses['200'] || 0) + (retryStatuses['201'] || 0) >= 1,
    detail:
      retryStatuses['429'] > 0
        ? `the retry was throttled (${retryStatuses['429']} x 429) — the timed-out request already used up the customer's checkout quota`
        : `statuses ${JSON.stringify(retryStatuses)}`,
    kind: 'usability',
  })
  expectations.push({
    name: 'no 5xx while retrying',
    pass: !Object.keys(retryStatuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(retryStatuses),
  })

  // ── Case 2: every VU times out at the same time and then retries in
  //    parallel — the "flaky network" pattern that produces duplicate orders
  //    in apps that do not send an idempotency key.
  const noKey = []
  const sharedUtr = makeUtr(__ITER + 11)
  const burstSize = Math.min(CONCURRENCY, 4)
  for (let i = 0; i < burstSize; i += 1) {
    noKey.push(
      http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderBody(data.catalog, sharedUtr)), {
        headers,
        timeout: '1ms',
      })
    )
  }
  sleep(2)
  const afterTimeout = []
  for (let i = 0; i < burstSize; i += 1) {
    afterTimeout.push(
      http.post(`${BASE_URL}/api/orders`, JSON.stringify(orderBody(data.catalog, sharedUtr)), {
        headers,
        timeout: '20s',
      })
    )
  }
  const parallelStatuses = tallyStatuses(afterTimeout)
  const parallelIds = distinctOrderIds(afterTimeout)
  parallelIds.forEach(() => ordersCreated.add(1))
  if (parallelIds.length > 1) duplicateOrders.add(parallelIds.length - 1)

  findings.push(
    `${burstSize} concurrent timed-out requests then retried without an idempotency key: ${JSON.stringify(
      parallelStatuses
    )}`,
    `distinct order ids: ${parallelIds.length}`
  )

  expectations.push({
    name: 'a timed-out burst retried without an idempotency key creates one order',
    pass: parallelIds.length <= 1,
    detail:
      parallelIds.length === 1
        ? `one order (${parallelIds[0]})`
        : `${parallelIds.length} orders from one logical checkout`,
  })
  expectations.push({
    name: 'no 5xx during the timeout burst',
    pass: !Object.keys(parallelStatuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(parallelStatuses),
  })

  recordCase({
    title: 'timeout and retry',
    findings,
    expectations,
    metrics: {
      timeoutRetries: retries.length,
      parallelBurst: afterTimeout.length,
      distinctOrdersFromRetries: retryIds.length,
      distinctOrdersFromBurst: parallelIds.length,
    },
  })
}

export const handleSummary = summaryFor('timeout and retry', [
  'A client that times out and retries must not place the order twice.',
])

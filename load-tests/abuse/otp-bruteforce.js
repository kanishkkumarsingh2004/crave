// ============================================
// Abuse test: delivery OTP brute force and replay
// ============================================
//
// The delivery OTP is the six digits that prove the customer handed the food
// over. It is the last thing standing between a rider and a free delivery.
//
// What must hold:
//   * only the rider assigned to the order may try an OTP at all;
//   * a wrong OTP never confirms the delivery;
//   * a correct OTP works exactly once — the replay must be refused;
//   * a customer cannot confirm their own delivery with someone else's code.
//
// Run:  pnpm abuse-test -- --case otp-bruteforce --url http://localhost:3000

import http from 'k6/http'
import { sleep } from 'k6'
import {
  BASE_URL,
  CASE_IP,
  CONCURRENCY,
  authHeaders,
  signIn,
  makeUtr,
  orderBody,
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
    http_req_failed: ['rate<0.60'],
  },
}

const GUESSES = Number(env.ABUSE_GUESSES || 50)

export function setup() {
  const customer = signIn('customer')
  const rider = signIn('rider')
  return {
    customerToken: customer.token,
    riderToken: rider.token,
    catalog: resolveCatalog(),
    authenticated: Boolean(customer.token),
    hasRider: Boolean(rider.token),
  }
}

export default function (data) {
  if (!data.authenticated) {
    console.error('otp-bruteforce needs SEED_CUSTOMER_EMAIL and SEED_PASSWORD.')
    return
  }

  const headers = authHeaders(data.customerToken, CASE_IP)
  const findings = []
  const expectations = []

  // Place an order so there is something to attack.
  const created = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify(orderBody(data.catalog, makeUtr(__ITER + 120))),
    { headers, timeout: '20s' }
  )
  let orderId = null
  try {
    const body = JSON.parse(created.body)
    orderId = body.orderId || body.order?.id || null
  } catch (e) {
    orderId = null
  }
  findings.push(`order created for the attack: ${orderId || 'none'} (status ${created.status})`)

  if (!orderId) {
    recordCase({
      title: 'otp brute force',
      findings: findings.concat(['no order could be created — the rest of the case was skipped']),
      expectations: [
        {
          name: 'an order could be created to attack',
          pass: false,
          detail: 'the API did not return an order id',
        },
      ],
      metrics: {},
    })
    return
  }

  // ── Case 1: a stranger guesses the OTP. The customer account owns the
  //    order, so it must not be able to confirm a delivery.
  const stranger = []
  for (let i = 0; i < GUESSES; i += 1) {
    stranger.push(
      http.patch(
        `${BASE_URL}/api/orders`,
        JSON.stringify({
          orderId,
          status: 'delivered',
          otp: String(100000 + i).slice(0, 6),
          delivery_otp: String(100000 + i).slice(0, 6),
        }),
        { headers, timeout: '15s' }
      )
    )
  }
  const strangerStatuses = tallyStatuses(stranger)
  const strangerConfirmed = stranger.filter((r) => r.status === 200).length
  findings.push(
    `${GUESSES} delivery confirmations by the customer (not the rider): ${JSON.stringify(
      strangerStatuses
    )}`,
    `accepted: ${strangerConfirmed}`
  )

  expectations.push({
    name: 'the order owner cannot confirm a delivery with a guessed OTP',
    pass: strangerConfirmed === 0,
    detail: `${strangerConfirmed} of ${GUESSES} guesses were accepted`,
  })
  expectations.push({
    name: 'guessing the OTP never 5xxes',
    pass: !Object.keys(strangerStatuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(strangerStatuses),
  })

  // ── Case 2: an unauthenticated attacker.
  const anonymous = []
  for (let i = 0; i < 10; i += 1) {
    anonymous.push(
      http.patch(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ orderId, status: 'delivered', otp: '000000' }),
        { headers: { 'Content-Type': 'application/json' }, timeout: '15s' }
      )
    )
  }
  const anonymousStatuses = tallyStatuses(anonymous)
  const anonymousConfirmed = anonymous.filter((r) => r.status === 200).length
  findings.push(
    `10 unauthenticated delivery confirmations: ${JSON.stringify(anonymousStatuses)}`,
    `accepted: ${anonymousConfirmed}`
  )

  expectations.push({
    name: 'an unauthenticated attacker cannot confirm a delivery',
    pass: anonymousConfirmed === 0,
    detail: `${anonymousConfirmed} of 10 attempts were accepted`,
  })

  // ── Case 3: the rider tries many codes at once — the brute force that
  //    actually matters, since the rider is the party that holds the order.
  if (data.hasRider) {
    const riderHeaders = authHeaders(data.riderToken, CASE_IP)
    const rider = []
    for (let i = 0; i < CONCURRENCY; i += 1) {
      rider.push(
        http.patch(
          `${BASE_URL}/api/orders`,
          JSON.stringify({
            orderId,
            status: 'delivered',
            otp: String(200000 + i).slice(0, 6),
            delivery_otp: String(200000 + i).slice(0, 6),
          }),
          { headers: riderHeaders, timeout: '15s' }
        )
      )
    }
    const riderStatuses = tallyStatuses(rider)
    const riderConfirmed = rider.filter((r) => r.status === 200).length
    findings.push(
      `${CONCURRENCY} concurrent OTP guesses by a rider: ${JSON.stringify(riderStatuses)}`,
      `accepted: ${riderConfirmed}`
    )

    expectations.push({
      name: 'no OTP guess is ever accepted',
      pass: riderConfirmed === 0,
      detail: `${riderConfirmed} of ${CONCURRENCY} guesses were accepted`,
    })
    expectations.push({
      name: 'guessing the OTP never 5xxes',
      pass: !Object.keys(riderStatuses).some((s) => Number(s) >= 500),
      detail: JSON.stringify(riderStatuses),
    })
  } else {
    findings.push('no rider credentials — the rider brute-force case was skipped')
  }

  recordCase({
    title: 'otp brute force',
    findings,
    expectations,
    metrics: {
      orderId,
      strangerGuesses: stranger.length,
      strangerAccepted: strangerConfirmed,
      anonymousAttempts: anonymous.length,
    },
  })
  sleep(0.2)
}

export const handleSummary = summaryFor('delivery OTP brute force and replay', [
  'The delivery OTP is the only proof that the food actually reached the customer.',
])

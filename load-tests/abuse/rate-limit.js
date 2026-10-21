// ============================================
// Abuse test: rate limiting and credential stuffing
// ============================================
//
// What a bored person does: point a script at the login form and try
// passwords until one works.
//
// What must hold:
//   * repeated logins from one address are throttled (429);
//   * the throttle must survive a client that rotates the forwarding headers;
//   * a wrong password must never be answered with "no such user" (that is
//     user enumeration).
//
// Run:  pnpm abuse-test -- --case rate-limit --url http://localhost:3000

import http from 'k6/http'
import { sleep } from 'k6'
import {
  BASE_URL,
  CONCURRENCY,
  optionalSetting,
  rateLimited,
  recordCase,
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

const ATTEMPTS = Number(env.ABUSE_ATTEMPTS || 20)
// One fixed client, so the limiter sees a single source.
const FIXED_IP = env.ABUSE_FIXED_IP || '198.51.100.42'

export function setup() {
  return {
    email: optionalSetting('SEED_CUSTOMER_EMAIL') || 'nobody@example.test',
    password: optionalSetting('SEED_PASSWORD') || 'wrong-password',
  }
}

export default function (data) {
  const findings = []
  const expectations = []

  // ── Case 1: a straight credential-stuffing run from one address.
  const straight = []
  for (let i = 0; i < ATTEMPTS; i += 1) {
    straight.push(
      http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: data.email, password: `wrong-${i}` }),
        {
          headers: { 'Content-Type': 'application/json', 'x-forwarded-for': FIXED_IP },
          timeout: '15s',
        }
      )
    )
  }
  const straightStatuses = tallyStatuses(straight)
  const straightLimited = straightStatuses['429'] || 0
  findings.push(`${ATTEMPTS} login attempts from one address: ${JSON.stringify(straightStatuses)}`)

  expectations.push({
    name: 'repeated logins from one address are throttled',
    pass: straightLimited > 0,
    detail:
      straightLimited > 0
        ? `${straightLimited} of ${ATTEMPTS} were rejected with 429`
        : `no request was throttled — the login form is unprotected`,
  })
  expectations.push({
    name: 'a wrong password never 5xxes',
    pass: !Object.keys(straightStatuses).some((s) => Number(s) >= 500),
    detail: JSON.stringify(straightStatuses),
  })

  // ── Case 2: the same run, but the client rotates the forwarding header on
  //    every request. A limiter keyed on a header the client controls is not
  //    a limiter.
  const spoofed = []
  for (let i = 0; i < ATTEMPTS; i += 1) {
    spoofed.push(
      http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email: data.email, password: `wrong-${i}` }),
        {
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': `203.0.113.${(i % 250) + 1}`,
            'x-real-ip': `203.0.113.${(i % 250) + 1}`,
          },
          timeout: '15s',
        }
      )
    )
  }
  const spoofedStatuses = tallyStatuses(spoofed)
  const spoofedLimited = spoofedStatuses['429'] || 0
  findings.push(
    `${ATTEMPTS} login attempts with a rotated forwarding header: ${JSON.stringify(
      spoofedStatuses
    )}`
  )

  expectations.push({
    name: 'rotating the forwarding header does not defeat the limiter',
    pass: spoofedLimited >= straightLimited,
    detail:
      spoofedLimited < straightLimited
        ? `the limiter answered ${straightLimited} of ${ATTEMPTS} straight attempts but only ${spoofedLimited} of ${ATTEMPTS} spoofed ones — the key comes from a client-controlled header`
        : `the limiter held (${spoofedLimited} of ${ATTEMPTS} rejected)`,
    kind: 'usability',
  })

  // ── Case 3: the error message must not say whether the account exists.
  const unknown = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: 'definitely-not-a-user@example.test', password: 'x' }),
    {
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': FIXED_IP },
      timeout: '15s',
    }
  )
  const known = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: data.email, password: 'definitely-wrong' }),
    {
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': FIXED_IP },
      timeout: '15s',
    }
  )
  let unknownBody = ''
  let knownBody = ''
  try {
    unknownBody = (JSON.parse(unknown.body) || {}).error || ''
  } catch (e) {
    unknownBody = ''
  }
  try {
    knownBody = (JSON.parse(known.body) || {}).error || ''
  } catch (e) {
    knownBody = ''
  }
  findings.push(`unknown account → ${unknown.status} "${unknownBody}"`)
  findings.push(`known account, wrong password → ${known.status} "${knownBody}"`)

  expectations.push({
    name: 'the login error does not reveal whether the account exists',
    pass: !unknownBody || !knownBody || unknownBody.toLowerCase() === knownBody.toLowerCase(),
    detail: `unknown: "${unknownBody}" / known: "${knownBody}"`,
  })

  recordCase({
    title: 'rate limit',
    findings,
    expectations,
    metrics: {
      attempts: ATTEMPTS,
      throttledStraight: straightLimited,
      throttledSpoofed: spoofedLimited,
    },
  })
  sleep(0.2)
}

export const handleSummary = summaryFor('rate limiting and credential stuffing', [
  'A limiter keyed on a client-supplied forwarding header is not a limiter.',
])

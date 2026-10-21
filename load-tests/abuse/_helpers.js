// ============================================
// Shared helpers for the abuse / concurrency suite
// ============================================
//
// Every abuse script answers one question: "if a real user (or someone
// pretending to be one) hammers this path, does the system stay correct?"
//
// The rules the whole suite follows:
//   * an abuse test never asserts that abuse succeeds — it asserts the system
//     stays CONSISTENT (no duplicate orders, no oversell, no crash);
//   * a known weakness is asserted as an explicit, named expectation so the
//     report says "this is exploitable today" instead of silently passing;
//   * every script is self-contained: it can be run on its own.
//
// Results travel from the VU to the report through custom metrics, because
// k6 only hands `handleSummary` the metric values.

import http from 'k6/http'
import { check } from 'k6'
import { Counter, Gauge, Rate } from 'k6/metrics'

export const env =
  typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}

export const BASE_URL = (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
export const WS_URL = env.WS_URL || 'ws://localhost:8000/api/ws'
export const APP_ENV = env.APP_ENV || 'staging'

/** How many parallel copies of a request an abuse script fires. */
export const CONCURRENCY = Number(env.ABUSE_CONCURRENCY || 8)
/** How many times a failed request is retried. */
export const RETRIES = Number(env.ABUSE_RETRIES || 2)
/**
 * The client address a case presents. Each case gets its own bucket so the
 * 10-orders-per-minute checkout limit does not bleed between cases — the
 * rate-limit case pins its own address on purpose.
 */
export const CASE_IP = env.ABUSE_IP || '198.51.100.10'

// ── Shared metrics ───────────────────────────────────────────────────────────
export const caseResult = new Gauge('abuse_case_result') // 1 = all expectations met
export const expectationsRun = new Counter('abuse_expectations_run')
export const expectationsFailed = new Counter('abuse_expectations_failed')
export const integrityFailures = new Counter('abuse_integrity_failures')
export const usabilityFailures = new Counter('abuse_usability_failures')
export const ordersCreated = new Counter('abuse_orders_created')
export const duplicateOrders = new Counter('abuse_duplicate_orders')
export const rateLimited = new Counter('abuse_rate_limited')
export const serverErrors = new Counter('abuse_server_errors')
export const status2xx = new Counter('abuse_status_2xx')
export const status4xx = new Counter('abuse_status_4xx')
export const status5xx = new Counter('abuse_status_5xx')
export const statusDropped = new Counter('abuse_status_dropped')
export const survived = new Rate('abuse_server_survived')

export function optionalSetting(name) {
  const value = env[name]
  return value ? String(value) : ''
}

export function hasSettings(...names) {
  return names.every((name) => Boolean(env[name]))
}

/**
 * Signs in and returns the bearer token.
 *
 * The login route only puts the token in the response body when the request
 * identifies as one of the native apps — without this header it answers with
 * a cookie only and every authenticated call would fail with 401.
 */
export function login(email, password, app = 'customer', ip) {
  if (!email || !password) return ''
  // The login limiter is keyed on the forwarding header, so a per-call address
  // keeps the setup from tripping it. The rate-limit case passes a FIXED
  // address on purpose — that is the behaviour under test.
  const address = ip || `198.51.100.${1 + Math.floor(Math.random() * 250)}`
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
    headers: {
      'Content-Type': 'application/json',
      'x-crave-native-app': app,
      'x-forwarded-for': address,
    },
    timeout: '10s',
  })
  if (res.status === 200 && res.body) {
    try {
      return JSON.parse(res.body).token || ''
    } catch (e) {
      return ''
    }
  }
  return ''
}

/**
 * The seed accounts. Every role may have its own password and more than one
 * address, because the accounts move around between environments.
 */
export const ROLE_ACCOUNTS = {
  customer: {
    emails: ['SEED_CUSTOMER_EMAIL', 'kanishkkumar2004@gmail.com'],
    app: 'customer',
  },
  admin: { emails: ['SEED_ADMIN_EMAIL', 'admin@crave.com'], app: 'admin' },
  vendor: { emails: ['SEED_VENDOR_EMAIL', 'momobar@crave.com'], app: 'restaurant' },
  rider: { emails: ['SEED_RIDER_EMAIL', 'test@crave.com', 'test@gmail.com'], app: 'driver' },
}

/** The password for a role: its own, or the shared one. */
export function rolePassword(role) {
  return optionalSetting(`SEED_${role.toUpperCase()}_PASSWORD`) || optionalSetting('SEED_PASSWORD')
}

/**
 * Signs a role in, trying every known address with that role's password.
 * Returns the token and the address that worked.
 */
export function signIn(role) {
  const config = ROLE_ACCOUNTS[role]
  if (!config) return { token: '', email: '' }
  const password = rolePassword(role)
  const candidates = [
    ...config.emails.map((name) => optionalSetting(name)),
    ...config.emails.filter((name) => !name.startsWith('SEED_')),
  ]
  return loginFirst(candidates, password, config.app)
}

/**
 * Signs in with the first address that works. The seed accounts move around
 * between environments, so a role may be reachable under more than one address.
 */
export function loginFirst(emails, password, app = 'customer') {
  const list = Array.isArray(emails) ? emails : [emails]
  for (const email of list) {
    if (!email) continue
    const token = login(email, password, app)
    if (token) return { token, email }
  }
  return { token: '', email: list[0] || '' }
}

/** The orders a list response carries. */
export function ordersOf(res) {
  try {
    const body = JSON.parse(res.body)
    const orders = body?.orders || body?.data || (Array.isArray(body) ? body : [])
    return Array.isArray(orders) ? orders : []
  } catch (e) {
    return []
  }
}

/** The delivery offers a list response carries. */
export function offersOf(res) {
  try {
    const body = JSON.parse(res.body)
    const offers = body?.offers || body?.data || (Array.isArray(body) ? body : [])
    return Array.isArray(offers) ? offers : []
  } catch (e) {
    return []
  }
}

/** The single order a response carries. */
export function orderOf(res) {
  try {
    const body = JSON.parse(res.body)
    return body?.order || body?.data || null
  } catch (e) {
    return null
  }
}

export function authHeaders(token, ip) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    ...(ip ? { 'x-forwarded-for': ip } : {}),
  }
}

/** Finds a restaurant and a menu item that the target database actually has. */
export function resolveCatalog() {
  const fallback = { restaurantId: 'rest_01', menuItemId: 'mi_01', resolved: false }
  const res = http.get(`${BASE_URL}/api/restaurants`, { timeout: '15s' })
  if (res.status !== 200 || !res.body) return fallback
  let payload
  try {
    payload = JSON.parse(res.body)
  } catch (e) {
    return fallback
  }
  const restaurants =
    payload?.restaurants || payload?.data || (Array.isArray(payload) ? payload : [])
  const restaurant = restaurants[0]
  if (!restaurant?.id) return fallback

  const menuRes = http.get(
    `${BASE_URL}/api/menu-items?restaurantId=${encodeURIComponent(restaurant.id)}`,
    { timeout: '15s' }
  )
  if (menuRes.status !== 200 || !menuRes.body) {
    return { restaurantId: restaurant.id, menuItemId: 'mi_01', resolved: true }
  }
  let menuPayload
  try {
    menuPayload = JSON.parse(menuRes.body)
  } catch (e) {
    return { restaurantId: restaurant.id, menuItemId: 'mi_01', resolved: true }
  }
  const items =
    menuPayload?.items || menuPayload?.data || (Array.isArray(menuPayload) ? menuPayload : [])
  return {
    restaurantId: restaurant.id,
    menuItemId: items[0]?.id || 'mi_01',
    itemName: items[0]?.name || '',
    resolved: true,
  }
}

/**
 * The order body the customer app sends. `utr_ref` is included because the
 * API requires it — a missing UTR is rejected with 400 before the interesting
 * code paths run.
 */
export function orderBody(catalog, utr, overrides) {
  return Object.assign(
    {
      restaurant_id: catalog.restaurantId,
      items: [{ id: catalog.menuItemId, quantity: 1 }],
      address: 'Abuse Test Address, Bengaluru',
      payment_method: 'UPI Online',
      utr_ref: utr,
    },
    overrides || {}
  )
}

/** A unique-enough UTR (the API enforces a minimum length). */
export function makeUtr(tag) {
  const random = Math.floor(Math.random() * 1e9)
    .toString()
    .padStart(9, '0')
  return `9${String(tag).padStart(3, '0')}${random}`.slice(0, 12)
}

/** Reads the order id out of a create-order response, if there is one. */
export function orderIdOf(res) {
  try {
    const body = JSON.parse(res.body)
    return body.orderId || body.order?.id || null
  } catch (e) {
    return null
  }
}

/** Records a burst of responses into the shared status counters. */
export function tallyStatuses(responses) {
  const tally = {}
  for (const res of responses) {
    const key = String(res.status)
    tally[key] = (tally[key] || 0) + 1
    if (res.status === 0) statusDropped.add(1)
    else if (res.status >= 500) status5xx.add(1)
    else if (res.status >= 400) status4xx.add(1)
    else status2xx.add(1)
    if (res.status >= 500) serverErrors.add(1)
    if (res.status === 429) rateLimited.add(1)
  }
  return tally
}

/** The distinct order ids a burst of responses produced. */
export function distinctOrderIds(responses) {
  const ids = new Set()
  for (const res of responses) {
    const id = orderIdOf(res)
    if (id) ids.add(id)
  }
  return Array.from(ids)
}

/**
 * Records one case: logs the findings, checks the expectations and feeds the
 * shared metrics that `handleSummary` turns into the report.
 */
export function recordCase({ title, findings, expectations, metrics }) {
  for (const finding of findings || []) console.log(`[${title}] ${finding}`)

  for (const expectation of expectations || []) {
    expectationsRun.add(1)
    if (!expectation.pass) {
      expectationsFailed.add(1)
      // "correctness" = the system must never be inconsistent (duplicate
      // orders, oversell, a crash). "usability" = the flow may still work but
      // degrades for the customer.
      if (expectation.kind === 'usability') usabilityFailures.add(1)
      else integrityFailures.add(1)
    }
  }
  const failed = (expectations || []).filter((e) => !e.pass).length
  caseResult.add(failed === 0 ? 1 : 0)

  check(null, {
    [`${title}: all expectations met`]: () => failed === 0,
  })

  for (const [key, value] of Object.entries(metrics || {})) {
    console.log(`[${title}] ${key}: ${value}`)
  }
}

/**
 * Renders the report every abuse script shares, so a run of the whole suite
 * reads like one document.
 */
export function renderReport({ title, target, notes, data }) {
  const metrics = () => {
    const m = data?.metrics || {}
    const value = (name, fallback = 0) => {
      const values = m[name]?.values
      if (!values) return fallback
      return values.count ?? values.value ?? values.avg ?? fallback
    }
    const rate = (name) => {
      const v = m[name]?.values
      if (!v) return 'n/a'
      return `${(((v.passes || 0) / Math.max(1, (v.passes || 0) + (v.fails || 0))) * 100).toFixed(1)}%`
    }
    return {
      'expectations run': value('abuse_expectations_run'),
      'expectations failed': value('abuse_expectations_failed'),
      'integrity failures': value('abuse_integrity_failures'),
      'usability failures': value('abuse_usability_failures'),
      'orders created': value('abuse_orders_created'),
      'duplicate orders': value('abuse_duplicate_orders'),
      'rate limited (429)': value('abuse_rate_limited'),
      'server errors (5xx)': value('abuse_server_errors'),
      'dropped responses': value('abuse_status_dropped'),
      '2xx responses': value('abuse_status_2xx'),
      '4xx responses': value('abuse_status_4xx'),
      '5xx responses': value('abuse_status_5xx'),
      'case result (1 = held)': value('abuse_case_result'),
    }
  }

  const lines = []
  lines.push('')
  lines.push('='.repeat(62))
  lines.push(`ABUSE TEST — ${title}`)
  lines.push('='.repeat(62))
  lines.push(`Target:  ${target}`)
  lines.push(`When:    ${new Date().toISOString()}`)
  if (notes) {
    lines.push('')
    lines.push('Notes:')
    for (const note of notes) lines.push(`  ${note}`)
  }
  lines.push('')
  lines.push('Measurements:')
  const m = metrics()
  for (const [key, value] of Object.entries(m)) {
    lines.push(`  ${String(key).padEnd(30)} ${value}`)
  }
  const failed = m['expectations failed'] || 0
  lines.push('')
  lines.push(
    failed === 0
      ? 'RESULT: all expectations met — the system held.'
      : `RESULT: ${failed} expectation(s) NOT met — the behaviour above is exploitable.`
  )
  lines.push('='.repeat(62))
  lines.push('')
  return lines.join('\n')
}

/** Builds the k6 `handleSummary` export for a case. */
export function summaryFor(title, notes) {
  return function handleSummary(data) {
    const failed = data?.metrics?.abuse_expectations_failed?.values?.count || 0
    const ran = data?.metrics?.abuse_expectations_run?.values?.count || 0
    const fileName = `${env.ABUSE_CASE || 'abuse'}.json`
    return {
      stdout: renderReport({ title, target: BASE_URL, notes, data }),
      [fileName]: JSON.stringify(
        {
          suite: title,
          target: BASE_URL,
          timestamp: new Date().toISOString(),
          environment: APP_ENV,
          expectationsRun: ran,
          expectationsFailed: failed,
          allPassed: failed === 0 && ran > 0,
          metrics: data?.metrics || {},
        },
        null,
        2
      ),
    }
  }
}

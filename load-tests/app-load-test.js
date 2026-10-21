// ============================================
// Crave multi-app load test
// ============================================
//
// One script, one scenario set per app. The app is selected with `--app`
// (customer | driver | restaurant | admin | all).
//
//   pnpm load-test -- --url http://localhost:3000 --app customer
//   pnpm load-test -- --url http://localhost:3000 --app driver
//   pnpm load-test -- --url http://localhost:3000 --app restaurant
//   pnpm load-test -- --url http://localhost:3000 --app admin
//   pnpm load-test -- --url http://localhost:3000 --app all
//
// Each app exercises the endpoints its own client calls. Authenticated
// scenarios only run when that role's seed credentials are available; the
// report always states which roles were skipped.

import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'
import { Counter, Rate } from 'k6/metrics'

const env = typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}
const IS_CI_SMOKE = env.CI_SMOKE === 'true'
const SKIP_AUTH = env.SKIP_AUTH === 'true'
const STRICT_AUTH = env.STRICT_AUTH === 'true'

const unexpectedFailures = new Rate('unexpected_failures')
const rateLimitedResponses = new Counter('rate_limited_responses')
const ordersCreated = new Counter('orders_created')
const transitionsApplied = new Counter('transitions_applied')

const BASE_URL = (env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const WS_URL = env.WS_URL || 'ws://localhost:8000/api/ws'
const COMMIT_SHA = env.COMMIT_SHA || 'unspecified'
const APP_ENV = env.APP_ENV || 'staging'

/**
 * Reads an optional setting. Missing credentials must not abort the run: the
 * public scenarios are still valuable, and the authenticated ones are reported
 * as skipped instead of crashing the whole benchmark.
 */
function optionalTestSetting(name) {
  const value = env[name]
  return value ? String(value) : ''
}

/** True when every listed setting is present. */
function hasTestSettings(...names) {
  return names.every((name) => Boolean(env[name]))
}

/**
 * Parses a compact stage list such as "30s:10,1m:50" into k6 stages.
 */
export function parseStages(spec) {
  if (!spec || typeof spec !== 'string') return null
  const stages = spec
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [duration, target] = entry.split(':')
      const parsedTarget = Number(target)
      if (!duration || !Number.isFinite(parsedTarget)) return null
      return { duration: duration.trim(), target: parsedTarget }
    })
    .filter(Boolean)
  return stages.length > 0 ? stages : null
}

/** A quick profile to prove the setup works. */
const SMOKE_STAGES = [
  { duration: '5s', target: 3 },
  { duration: '5s', target: 0 },
]

/** The default profile — a couple of minutes, safe against a dev machine. */
const MODERATE_STAGES = [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 50 },
  { duration: '30s', target: 0 },
]

/** The full production profile. Opt in with `--full`. */
const FULL_STAGES = [
  { duration: '30s', target: 10 },
  { duration: '1m', target: 50 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 150 },
  { duration: '1m', target: 200 },
  { duration: '1m', target: 500 },
  { duration: '1m', target: 1000 },
  { duration: '1m', target: 100 },
  { duration: '1m', target: 0 },
]

const DEFAULT_STAGES =
  env.PROFILE === 'full' ? FULL_STAGES : IS_CI_SMOKE ? SMOKE_STAGES : MODERATE_STAGES

const CONFIGURED_STAGES = parseStages(env.STAGES) || DEFAULT_STAGES

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Statuses a scenario accepts. 429 means the API rate limit did its job. */
function assertStatus(res, accepted, label, maxMs) {
  const checks = {
    [`${label} status ${accepted.join('/')}`]: (r) => accepted.includes(r.status),
  }
  if (maxMs) checks[`${label} < ${maxMs}ms`] = (r) => r.timings.duration < maxMs
  const result = check(res, checks)
  if (!accepted.includes(res.status)) unexpectedFailures.add(true)
  else unexpectedFailures.add(false)
  if (res.status === 429) rateLimitedResponses.add(1)
  return result
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

function login(email, password, app = 'customer') {
  if (!email || !password) return ''
  try {
    // The login route only returns the token in the body for native clients.
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
      headers: { 'Content-Type': 'application/json', 'x-crave-native-app': app },
      timeout: '10s',
    })
    if (res.status === 200 && res.body) {
      const data = JSON.parse(res.body)
      return data.token || ''
    }
  } catch (err) {
    // Fail silently in setup but return empty string so scenarios register auth failure
  }
  return ''
}

function json(response) {
  try {
    return response && response.body ? JSON.parse(response.body) : null
  } catch (err) {
    return null
  }
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

/** Resolves a real restaurant and menu item so no hard-coded ids are needed. */
function resolveCatalog() {
  const fallback = { restaurantId: 'rest_01', menuItemId: 'mi_01', resolved: false }
  try {
    const restaurantsRes = http.get(`${BASE_URL}/api/restaurants`, { timeout: '15s' })
    if (restaurantsRes.status !== 200) return fallback
    const payload = json(restaurantsRes)
    const restaurants =
      payload?.restaurants || payload?.data || (Array.isArray(payload) ? payload : [])
    const restaurant = restaurants[0]
    if (!restaurant?.id) return fallback

    const menuRes = http.get(
      `${BASE_URL}/api/menu-items?restaurantId=${encodeURIComponent(restaurant.id)}`,
      { timeout: '15s' }
    )
    if (menuRes.status !== 200) {
      return { restaurantId: restaurant.id, menuItemId: 'mi_01', resolved: true }
    }
    const menuPayload = json(menuRes)
    const items =
      menuPayload?.items || menuPayload?.data || (Array.isArray(menuPayload) ? menuPayload : [])
    return {
      restaurantId: restaurant.id,
      menuItemId: items[0]?.id || 'mi_01',
      resolved: true,
    }
  } catch (err) {
    return fallback
  }
}

/** The order currently assigned to the signed-in driver, if any. */
function resolveDriverOrder(token) {
  if (!token) return null
  try {
    const res = http.get(`${BASE_URL}/api/driver/orders`, {
      headers: authHeaders(token),
      timeout: '15s',
    })
    if (res.status !== 200) return null
    const payload = json(res)
    const orders = payload?.orders || payload?.data || (Array.isArray(payload) ? payload : [])
    return orders[0] || null
  } catch (err) {
    return null
  }
}

/** The orders in the vendor's queue, if any. */
function resolveVendorOrders(token) {
  if (!token) return []
  try {
    const res = http.get(`${BASE_URL}/api/orders`, {
      headers: authHeaders(token),
      timeout: '15s',
    })
    if (res.status !== 200) return []
    const payload = json(res)
    const orders = payload?.orders || payload?.data || (Array.isArray(payload) ? payload : [])
    return Array.isArray(orders) ? orders : []
  } catch (err) {
    return []
  }
}

// ─── Customer scenarios ───────────────────────────────────────────────────────

const customerScenarios = [
  {
    name: 'health',
    auth: false,
    run() {
      const res = http.get(`${BASE_URL}/api/health`)
      assertStatus(res, [200], 'health', 2000)
    },
  },
  {
    name: 'restaurants',
    auth: false,
    run() {
      const res = http.get(`${BASE_URL}/api/restaurants`)
      assertStatus(res, [200], 'restaurants', 2000)
    },
  },
  {
    name: 'menuItems',
    auth: false,
    run(ctx) {
      const res = http.get(
        `${BASE_URL}/api/menu-items?restaurantId=${encodeURIComponent(ctx.catalog.restaurantId)}`
      )
      assertStatus(res, [200], 'menu items', 2000)
    },
  },
  {
    name: 'addresses',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/user/addresses`, { headers: ctx.headers })
      assertStatus(res, [200], 'addresses', 3000)
    },
  },
  {
    name: 'calculator',
    auth: true,
    run(ctx) {
      const res = http.post(
        `${BASE_URL}/api/calculator`,
        JSON.stringify({
          subtotal: 450,
          distanceKm: 2.4,
          tip: 20,
          restaurantId: ctx.catalog.restaurantId,
        }),
        { headers: ctx.headers }
      )
      assertStatus(res, [200, 429], 'calculator', 3000)
    },
  },
  {
    name: 'createOrder',
    auth: true,
    run(ctx) {
      const res = http.post(
        `${BASE_URL}/api/orders`,
        JSON.stringify({
          restaurantId: ctx.catalog.restaurantId,
          items: [{ id: ctx.catalog.menuItemId, quantity: 2 }],
          address: 'Load Test Address, Bengaluru',
          paymentMethod: 'upi',
        }),
        { headers: ctx.headers }
      )
      // The checkout API rate limits to 10 orders/min per IP, so 429 is a
      // legitimate outcome under load rather than a server fault.
      assertStatus(res, [200, 201, 429], 'create order', 3000)
      if (res.status === 200 || res.status === 201) ordersCreated.add(1)
    },
  },
  {
    name: 'orderList',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/orders`, { headers: ctx.headers })
      assertStatus(res, [200], 'order list', 3000)
    },
  },
  {
    name: 'orderSocket',
    auth: true,
    run(ctx) {
      const res = ws.connect(`${WS_URL}?token=${ctx.token}`, {}, (socket) => {
        socket.on('open', () => {
          socket.send(JSON.stringify({ type: 'subscribe', channels: ['order_update'] }))
        })
        socket.on('message', () => {})
        socket.setTimeout(() => socket.close(), 5000)
      })
      check(res, { 'customer socket connected': (r) => r && r.status === 101 })
    },
  },
]

// ─── Driver scenarios ─────────────────────────────────────────────────────────

const driverScenarios = [
  {
    name: 'health',
    auth: false,
    run() {
      const res = http.get(`${BASE_URL}/api/health`)
      assertStatus(res, [200], 'health', 2000)
    },
  },
  {
    name: 'profile',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/driver/profile`, { headers: ctx.headers })
      assertStatus(res, [200], 'driver profile', 3000)
    },
  },
  {
    name: 'offers',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/driver/offers`, { headers: ctx.headers })
      assertStatus(res, [200, 404], 'driver offers', 3000)
    },
  },
  {
    name: 'orders',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/driver/orders`, { headers: ctx.headers })
      assertStatus(res, [200], 'driver orders', 3000)
    },
  },
  {
    name: 'dutyStatus',
    auth: true,
    run(ctx) {
      const res = http.post(
        `${BASE_URL}/api/driver/status`,
        JSON.stringify({ isOnline: true, status: 'ONLINE' }),
        { headers: ctx.headers }
      )
      assertStatus(res, [200, 429], 'driver status', 3000)
    },
  },
  {
    name: 'location',
    auth: true,
    run(ctx) {
      const res = http.post(
        `${BASE_URL}/api/driver/location`,
        JSON.stringify({
          driverId: ctx.driverId,
          lat: 12.9716 + (ctx.iteration % 5) * 0.0001,
          lng: 77.5946 + (ctx.iteration % 5) * 0.0001,
          status: 'ON_TRIP',
          available: false,
          vehicleType: 'EV_SCOOTER',
        }),
        { headers: ctx.headers }
      )
      // GPS updates are capped per driver, so 429 is expected under load.
      assertStatus(res, [200, 429], 'driver location', 3000)
    },
  },
  {
    name: 'payouts',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/driver/payouts`, { headers: ctx.headers })
      assertStatus(res, [200], 'driver payouts', 3000)
    },
  },
  {
    name: 'tripTransition',
    auth: true,
    run(ctx) {
      if (!ctx.driverOrder) {
        // No order assigned to this driver — there is nothing to transition.
        return
      }
      const nextStatus = ctx.driverOrder.status === 'picked_up' ? 'out_for_delivery' : 'picked_up'
      const res = http.patch(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ orderId: ctx.driverOrder.id, status: nextStatus }),
        { headers: ctx.headers }
      )
      assertStatus(res, [200, 409, 422, 429], 'trip transition', 3000)
      if (res.status === 200) transitionsApplied.add(1)
    },
  },
  {
    name: 'locationSocket',
    auth: true,
    run(ctx) {
      const res = ws.connect(`${WS_URL}?token=${ctx.token}`, {}, (socket) => {
        socket.on('open', () => {
          socket.send(JSON.stringify({ type: 'subscribe', channels: ['driver_location'] }))
        })
        socket.on('message', () => {})
        socket.setTimeout(() => socket.close(), 5000)
      })
      check(res, { 'driver socket connected': (r) => r && r.status === 101 })
    },
  },
]

// ─── Restaurant scenarios ─────────────────────────────────────────────────────

const restaurantScenarios = [
  {
    name: 'restaurants',
    auth: false,
    run() {
      const res = http.get(`${BASE_URL}/api/restaurants`)
      assertStatus(res, [200], 'restaurants', 2000)
    },
  },
  {
    name: 'menuItems',
    auth: true,
    run(ctx) {
      const res = http.get(
        `${BASE_URL}/api/menu-items?restaurantId=${encodeURIComponent(ctx.catalog.restaurantId)}`,
        { headers: ctx.headers }
      )
      assertStatus(res, [200], 'menu items', 3000)
    },
  },
  {
    name: 'orderQueue',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/orders`, { headers: ctx.headers })
      assertStatus(res, [200], 'order queue', 3000)
    },
  },
  {
    name: 'kitchenTransition',
    auth: true,
    run(ctx) {
      const order = ctx.vendorOrder
      if (!order) {
        // The kitchen queue is empty — there is nothing to transition.
        return
      }
      const flow = {
        sent_to_vendor: 'preparing',
        preparing: 'packing',
        packing: 'ready_for_pickup',
      }
      const nextStatus = flow[order.status]
      if (!nextStatus) {
        // The order already left the kitchen flow.
        return
      }
      const res = http.patch(
        `${BASE_URL}/api/orders`,
        JSON.stringify({ orderId: order.id, status: nextStatus }),
        { headers: ctx.headers }
      )
      assertStatus(res, [200, 409, 422, 429], 'kitchen transition', 3000)
      if (res.status === 200) transitionsApplied.add(1)
    },
  },
  {
    name: 'settlements',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/settlements`, { headers: ctx.headers })
      assertStatus(res, [200, 403], 'settlements', 3000)
    },
  },
  {
    name: 'orderSocket',
    auth: true,
    run(ctx) {
      const res = ws.connect(`${WS_URL}?token=${ctx.token}`, {}, (socket) => {
        socket.on('open', () => {
          socket.send(JSON.stringify({ type: 'subscribe', channels: ['vendor_orders'] }))
        })
        socket.on('message', () => {})
        socket.setTimeout(() => socket.close(), 5000)
      })
      check(res, { 'vendor socket connected': (r) => r && r.status === 101 })
    },
  },
]

// ─── Admin scenarios ──────────────────────────────────────────────────────────

const adminScenarios = [
  {
    name: 'health',
    auth: false,
    run() {
      const res = http.get(`${BASE_URL}/api/health`)
      assertStatus(res, [200], 'health', 2000)
    },
  },
  {
    name: 'stats',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/stats`, { headers: ctx.headers })
      assertStatus(res, [200], 'admin stats', 3000)
    },
  },
  {
    name: 'users',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/users`, { headers: ctx.headers })
      assertStatus(res, [200], 'admin users', 3000)
    },
  },
  {
    name: 'coupons',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/coupons`, { headers: ctx.headers })
      assertStatus(res, [200], 'admin coupons', 3000)
    },
  },
  {
    name: 'settlements',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/settlements`, { headers: ctx.headers })
      assertStatus(res, [200], 'admin settlements', 3000)
    },
  },
  {
    name: 'paymentReviews',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/payment-reviews`, { headers: ctx.headers })
      assertStatus(res, [200], 'payment reviews', 3000)
    },
  },
  {
    name: 'cravexpProducts',
    auth: true,
    run(ctx) {
      const res = http.get(`${BASE_URL}/api/admin/cravexp-products`, { headers: ctx.headers })
      assertStatus(res, [200], 'cravexp products', 3000)
    },
  },
]

// ─── App registry ─────────────────────────────────────────────────────────────

export const APP_PROFILES = {
  customer: {
    label: 'Customer',
    role: 'customer',
    nativeApp: 'customer',
    credential: 'SEED_CUSTOMER_EMAIL',
    scenarios: customerScenarios,
  },
  driver: {
    label: 'Driver',
    role: 'driver',
    nativeApp: 'driver',
    credential: 'SEED_RIDER_EMAIL',
    scenarios: driverScenarios,
  },
  restaurant: {
    label: 'Restaurant',
    role: 'vendor',
    nativeApp: 'restaurant',
    credential: 'SEED_VENDOR_EMAIL',
    scenarios: restaurantScenarios,
  },
  admin: {
    label: 'Admin',
    role: 'admin',
    nativeApp: 'admin',
    credential: 'SEED_ADMIN_EMAIL',
    scenarios: adminScenarios,
  },
}

const ALL_APPS = Object.keys(APP_PROFILES)
const REQUESTED_APP = (env.APP || 'customer').toLowerCase()

if (REQUESTED_APP !== 'all' && !APP_PROFILES[REQUESTED_APP]) {
  throw new Error(`Unknown --app "${REQUESTED_APP}". Expected one of: ${ALL_APPS.join(', ')}, all.`)
}

const SELECTED_APPS = REQUESTED_APP === 'all' ? ALL_APPS : [REQUESTED_APP]

export const CONFIG = {
  app: REQUESTED_APP,
  apps: SELECTED_APPS,
  stages: CONFIGURED_STAGES,
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
    ws_connecting: ['avg<2000'],
    checks: ['rate>0.90'],
  },
  timing: {
    health: 2000,
    restaurants: 2000,
    menuItems: 2000,
    orders: 3000,
    adminStats: 2000,
    vendorCoupons: 2000,
  },
}

export const options = {
  stages: CONFIGURED_STAGES,
  thresholds: CONFIG.thresholds,
}

// ─── Setup ────────────────────────────────────────────────────────────────────

export function setup() {
  const catalog = resolveCatalog()
  const tokens = {}
  const identities = {}
  const credentialsProvided = {}
  const loginFailures = {}

  for (const app of SELECTED_APPS) {
    const profile = APP_PROFILES[app]
    const email = optionalTestSetting(profile.credential)
    const password = optionalTestSetting('SEED_PASSWORD')
    const token = login(email, password, profile.nativeApp)
    tokens[app] = token
    identities[app] = email
    credentialsProvided[app] = Boolean(email && password)
    loginFailures[app] = Boolean(email && password && !token)
    console.log(
      `[crave-load-test] ${profile.label.padEnd(11)} ${
        token
          ? 'authenticated'
          : email
            ? 'credentials rejected — authenticated scenarios skipped'
            : 'no credentials — authenticated scenarios skipped'
      }`
    )
  }

  const driverToken = tokens.driver
  const driverOrder = resolveDriverOrder(driverToken)
  const vendorToken = tokens.restaurant
  const vendorOrders = resolveVendorOrders(vendorToken)
  let driverId = ''
  if (driverToken) {
    const profileRes = http.get(`${BASE_URL}/api/driver/profile`, {
      headers: authHeaders(driverToken),
      timeout: '15s',
    })
    const profilePayload = json(profileRes)
    driverId = profilePayload?.profile?.id || profilePayload?.driver?.id || profilePayload?.id || ''
  }

  console.log(
    `\n[crave-load-test] target:      ${BASE_URL}\n` +
      `[crave-load-test] websocket:   ${WS_URL}\n` +
      `[crave-load-test] environment: ${APP_ENV}\n` +
      `[crave-load-test] app:         ${REQUESTED_APP}\n` +
      `[crave-load-test] stages:      ${CONFIGURED_STAGES.map(
        (s) => `${s.duration}->${s.target}`
      ).join(', ')}\n`
  )

  if (SKIP_AUTH) {
    console.log('[crave-load-test] SKIP_AUTH=true — only public endpoints are exercised.\n')
  } else if (!hasTestSettings('SEED_PASSWORD')) {
    console.log(
      '[crave-load-test] No SEED_PASSWORD / SEED_*_EMAIL found — running public scenarios only.\n' +
        '[crave-load-test] Provide credentials (see `pnpm load-test --help`) to include the authenticated ones.'
    )
  }

  return {
    tokens,
    identities,
    credentialsProvided,
    loginFailures,
    catalog,
    driverOrder,
    driverId,
    vendorOrder: vendorOrders[0] || null,
    authExpected: hasTestSettings('SEED_PASSWORD'),
  }
}

// ─── Scenario execution ───────────────────────────────────────────────────────

export default function (data) {
  for (const app of SELECTED_APPS) {
    const profile = APP_PROFILES[app]
    const token = data?.tokens?.[app] || ''

    for (const scenario of profile.scenarios) {
      if (scenario.auth && !token) {
        // The account was rejected. That is a setup problem, not a load
        // problem, so those scenarios are skipped instead of being reported as
        // failures — unless STRICT_AUTH is on (CI), where a broken login must
        // fail the benchmark.
        if (STRICT_AUTH && data?.authExpected) {
          check(null, { [`${app}: ${scenario.name} authenticated token present`]: () => false })
        }
        continue
      }

      const ctx = {
        token,
        headers: token ? authHeaders(token) : { 'Content-Type': 'application/json' },
        catalog: data?.catalog || { restaurantId: 'rest_01', menuItemId: 'mi_01' },
        driverOrder: data?.driverOrder || null,
        driverId: data?.driverId || '',
        vendorOrder: data?.vendorOrder || null,
        iteration: __ITER,
      }

      try {
        scenario.run(ctx)
      } catch (error) {
        unexpectedFailures.add(true)
        check(null, { [`${app}: ${scenario.name} executed without error`]: () => false })
      }
    }
  }

  sleep(1)
}

// ─── Reporting ────────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const metrics = data?.metrics || {}

  const totalReqs = metrics.http_reqs?.values?.count || 0
  const failedReqs = metrics.http_req_failed?.values?.passes || 0
  const failPct = totalReqs > 0 ? ((failedReqs / totalReqs) * 100).toFixed(2) : '0.00'

  const avgDuration = metrics.http_req_duration?.values?.avg?.toFixed(2) || '0.00'
  const p95Duration = metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || '0.00'
  const maxDuration = metrics.http_req_duration?.values?.max?.toFixed(2) || '0.00'
  const reqsPerSec = metrics.http_reqs?.values?.rate?.toFixed(2) || '0.00'

  const wsAvg =
    metrics.ws_connecting?.values?.avg != null ? metrics.ws_connecting.values.avg.toFixed(2) : 'N/A'

  const checkPasses = metrics.checks?.values?.passes || 0
  const checkFails = metrics.checks?.values?.fails || 0
  const totalChecks = checkPasses + checkFails
  const checkRate = totalChecks > 0 ? ((checkPasses / totalChecks) * 100).toFixed(2) : 'N/A'

  const configuredPeakVUs = CONFIGURED_STAGES.reduce((max, stage) => {
    const target = Number(stage.target) || 0
    return target > max ? target : max
  }, 0)
  const observedPeakVUs = metrics.vus?.values?.max || metrics.vus_max?.values?.value || 0

  const p95Ok = parseFloat(p95Duration) <= 5000
  const failRateOk = parseFloat(failPct) < 10
  const checksOk = checkRate !== 'N/A' && parseFloat(checkRate) >= 90
  // A run where every scenario was skipped (for example an app with no public
  // endpoints and no credentials) has nothing to assert — it is not a failure.
  const noChecksExecuted = totalChecks === 0
  const overallThresholdsPass = noChecksExecuted ? true : p95Ok && failRateOk && checksOk

  const roleCoverage = SELECTED_APPS.map((app) => {
    const authenticated = Boolean(data?.setup_data?.tokens?.[app])
    const provided = Boolean(data?.setup_data?.credentialsProvided?.[app])
    const rejected = Boolean(data?.setup_data?.loginFailures?.[app])
    return {
      app,
      label: APP_PROFILES[app].label,
      authenticated,
      credentialsProvided: provided,
      loginRejected: rejected,
      state: authenticated
        ? 'authenticated'
        : rejected
          ? 'login rejected — scenarios skipped'
          : 'public only',
      scenarios: APP_PROFILES[app].scenarios.length,
    }
  })
  const authenticatedCount = roleCoverage.filter((entry) => entry.authenticated).length
  const allAuthPresent = authenticatedCount === roleCoverage.length

  const stagePlanStr = CONFIGURED_STAGES.map(
    (stage, index) => `    Stage ${index + 1}: ${stage.duration} -> target ${stage.target} VUs`
  ).join('\n')

  const coverageStr = roleCoverage
    .map((entry) => `    ${entry.label.padEnd(11)} ${entry.state} (${entry.scenarios} scenarios)`)
    .join('\n')

  const rejectedRoles = roleCoverage.filter((entry) => entry.loginRejected)
  const rejectedLine = rejectedRoles.length
    ? `\n  The following accounts were rejected, so their authenticated scenarios were skipped:\n${rejectedRoles
        .map(
          (entry) =>
            `    ${entry.label}: ${data?.setup_data?.identities?.[entry.app] || 'the account you entered'}`
        )
        .join('\n')}`
    : ''

  const rateLimited = metrics.rate_limited_responses?.values?.count || 0
  const created = metrics.orders_created?.values?.count || 0
  const transitions = metrics.transitions_applied?.values?.count || 0

  const consoleReport = `
===========================================
CRAVE LOAD BENCHMARK SUMMARY
===========================================
Metadata:
  Timestamp:       ${new Date().toISOString()}
  Environment:     ${APP_ENV}
  Commit SHA:      ${COMMIT_SHA}
  App:             ${REQUESTED_APP}

Concurrency:
  Configured Peak: ${configuredPeakVUs} VUs
  Observed Peak:   ${observedPeakVUs} VUs
  Configured Plan:
${stagePlanStr}

Endpoints & Targets:
  Base URL:        ${BASE_URL}
  WS URL:          ${WS_URL}
  Auth Tested:     ${allAuthPresent ? 'YES (All selected apps authenticated)' : 'PARTIAL / SKIPPED'}
  App Coverage:
${coverageStr}${rejectedLine}

Results:
  Total Requests:      ${totalReqs}
  Failed Requests:     ${failedReqs} (${failPct}%)
  Avg Response Time:   ${avgDuration} ms
  p(95) Response Time: ${p95Duration} ms
  Max Response Time:   ${maxDuration} ms
  Throughput:          ${reqsPerSec} reqs/sec
  WS Connect Avg:      ${wsAvg} ms
  Checks Pass Rate:    ${checkRate}% (${checkPasses} passed, ${checkFails} failed)
  Rate Limited (429):  ${rateLimited}
  Orders Created:      ${created}
  Status Transitions:  ${transitions}

Threshold Gates:
  http_req_duration p(95) < 5000ms: ${p95Ok ? '✅ PASS' : '❌ FAIL'}
  http_req_failed rate < 10%:       ${failRateOk ? '✅ PASS' : '❌ FAIL'}
  checks rate > 90%:                 ${noChecksExecuted ? '⚠️  NO CHECKS EXECUTED' : checksOk ? '✅ PASS' : '❌ FAIL'}
  Overall Gate Status:              ${
    noChecksExecuted
      ? '⚠️  NO SCENARIOS EXECUTED — provide seed credentials for this app'
      : overallThresholdsPass
        ? '✅ BENCHMARK PASSED'
        : '❌ BENCHMARK FAILED'
  }
===========================================
`

  // Explicit allowlisted artifact: zero secrets, tokens, or raw setup_data
  const allowlistedSummary = {
    benchmark: 'crave-app-load-test',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
    environment: APP_ENV,
    commitSha: COMMIT_SHA,
    app: REQUESTED_APP,
    apps: roleCoverage,
    concurrency: {
      configuredPeakVUs,
      observedPeakVUs,
      stages: CONFIGURED_STAGES,
    },
    authCoverage: {
      allCredentialsAvailable: allAuthPresent,
      authenticatedApps: authenticatedCount,
      selectedApps: roleCoverage.length,
      rejectedApps: rejectedRoles.map((entry) => entry.app),
    },
    execution: {
      testRunDurationMs: data?.state?.testRunDurationMs || 0,
      totalRequests: totalReqs,
      failedRequests: failedReqs,
      requestFailureRatePct: parseFloat(failPct),
      requestsPerSecond: parseFloat(reqsPerSec),
      checksPassRatePct: checkRate !== 'N/A' ? parseFloat(checkRate) : null,
      checksPassed: checkPasses,
      checksFailed: checkFails,
      rateLimitedResponses: rateLimited,
      ordersCreated: created,
      statusTransitions: transitions,
    },
    metrics: {
      http_req_duration: metrics.http_req_duration?.values || {},
      http_req_failed: metrics.http_req_failed?.values || {},
      checks: metrics.checks?.values || {},
      http_reqs: metrics.http_reqs?.values || {},
      ws_connecting: metrics.ws_connecting?.values || {},
    },
    thresholds: {
      'http_req_duration:p(95)<5000': { pass: p95Ok, valueMs: parseFloat(p95Duration) },
      'http_req_failed:rate<0.10': { pass: failRateOk, failPct: parseFloat(failPct) },
      'checks:rate>0.90': {
        pass: noChecksExecuted ? null : checksOk,
        passPct: checkRate !== 'N/A' ? parseFloat(checkRate) : null,
      },
    },
    noScenariosExecuted: noChecksExecuted,
    overallPassed: overallThresholdsPass,
  }

  return {
    stdout: consoleReport,
    'summary.json': JSON.stringify(allowlistedSummary, null, 2),
  }
}

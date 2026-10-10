// ============================================
// Load Test Configuration & Benchmarking Script
// ============================================
import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'

export const CONFIG = {
  // Target VUs per stage
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 150 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 0 },
  ],

  // Thresholds
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.10'],
    ws_connecting: ['avg<2000'],
    checks: ['rate>0.90'],
  },

  // Test endpoints
  endpoints: {
    health: '/api/health',
    restaurants: '/api/restaurants',
    menuItems: '/api/menu-items?restaurantId=rest_01',
    orders: '/api/orders',
    adminStats: '/api/admin/stats',
    vendorCoupons: '/api/admin/coupons',
  },

  // Demo credentials (used strictly in test environments)
  users: {
    admin: { email: 'admin@crave.com', password: '1234567890' },
    user: { email: 'user@crave.com', password: '1234567890' },
    vendor: { email: 'vendor@crave.com', password: '1234567890' },
    rider: { email: 'rider@crave.com', password: '1234567890' },
  },

  // Timing expectations (ms)
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
  stages: CONFIG.stages,
  thresholds: CONFIG.thresholds,
}

const env = typeof __ENV !== 'undefined' ? __ENV : typeof process !== 'undefined' ? process.env : {}
const BASE_URL = env.BASE_URL || 'http://localhost:3000'
const WS_URL = env.WS_URL || 'ws://localhost:8000/api/ws'
const COMMIT_SHA = env.COMMIT_SHA || 'unspecified'
const APP_ENV = env.APP_ENV || 'staging'

/**
 * Derives peak virtual users configured across all stages dynamically.
 */
export function calculateConfiguredPeakVUs(stages) {
  if (!Array.isArray(stages) || stages.length === 0) return 0
  return stages.reduce((max, stage) => {
    const target = Number(stage.target) || 0
    return target > max ? target : max
  }, 0)
}

function login(email, password) {
  try {
    const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({ email, password }), {
      headers: { 'Content-Type': 'application/json' },
      timeout: '5s',
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

export function setup() {
  return {
    adminToken: login(CONFIG.users.admin.email, CONFIG.users.admin.password),
    userToken: login(CONFIG.users.user.email, CONFIG.users.user.password),
    vendorToken: login(CONFIG.users.vendor.email, CONFIG.users.vendor.password),
    riderToken: login(CONFIG.users.rider.email, CONFIG.users.rider.password),
  }
}

export default function (data) {
  const authHeaders = (token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  })

  // Test 1: Health check (public)
  const healthRes = http.get(`${BASE_URL}${CONFIG.endpoints.health}`)
  check(healthRes, {
    'health check status 200': (r) => r.status === 200,
    'health check < 2000ms': (r) => r.timings.duration < CONFIG.timing.health,
  })

  // Test 2: Restaurant listing (public)
  const restaurantsRes = http.get(`${BASE_URL}${CONFIG.endpoints.restaurants}`)
  check(restaurantsRes, {
    'restaurants list status 200': (r) => r.status === 200,
    'restaurants list < 2000ms': (r) => r.timings.duration < CONFIG.timing.restaurants,
  })

  // Test 3: Menu items (public)
  const menuRes = http.get(`${BASE_URL}${CONFIG.endpoints.menuItems}`)
  check(menuRes, {
    'menu items status 200': (r) => r.status === 200,
    'menu items < 2000ms': (r) => r.timings.duration < CONFIG.timing.menuItems,
  })

  // Test 4: Create order as USER (requires auth)
  if (data && data.userToken) {
    const orderPayload = JSON.stringify({
      restaurantId: 'rest_01',
      items: [{ id: 'mi_01', quantity: 2 }],
      address: 'Test Address, Bengaluru',
      paymentMethod: 'upi',
    })
    const orderRes = http.post(`${BASE_URL}${CONFIG.endpoints.orders}`, orderPayload, {
      headers: authHeaders(data.userToken),
    })
    check(orderRes, {
      'create order as user success': (r) => r.status === 200 || r.status === 201,
      'create order < 3000ms': (r) => r.timings.duration < CONFIG.timing.orders,
    })
  } else {
    // Surface failure explicitly rather than silently skipping authenticated test
    check(null, {
      'user authentication token present': () => false,
    })
  }

  // Test 5: Admin stats as ADMIN
  if (data && data.adminToken) {
    const statsRes = http.get(`${BASE_URL}${CONFIG.endpoints.adminStats}`, {
      headers: authHeaders(data.adminToken),
    })
    check(statsRes, {
      'admin stats status 200': (r) => r.status === 200,
      'admin stats < 2000ms': (r) => r.timings.duration < CONFIG.timing.adminStats,
    })
  }

  // Test 6: Vendor coupons as VENDOR
  if (data && data.vendorToken) {
    const couponsRes = http.get(`${BASE_URL}${CONFIG.endpoints.vendorCoupons}`, {
      headers: authHeaders(data.vendorToken),
    })
    check(couponsRes, {
      'vendor coupons status 200': (r) => r.status === 200,
      'vendor coupons < 2000ms': (r) => r.timings.duration < CONFIG.timing.vendorCoupons,
    })
  }

  // Test 7: WebSocket as USER
  if (data && data.userToken) {
    const wsUrlWithToken = `${WS_URL}?token=${data.userToken}`
    ws.connect(wsUrlWithToken, {}, function (socket) {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'subscribe', channels: ['order_update'] }))
      })
      socket.on('message', () => {})
      socket.setTimeout(() => socket.close(), 5000)
    })
  }

  // Test 8: WebSocket as RIDER (driver location)
  if (data && data.riderToken) {
    const wsUrlWithToken = `${WS_URL}?token=${data.riderToken}`
    ws.connect(wsUrlWithToken, {}, function (socket) {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'subscribe', channels: ['driver_location'] }))
      })
      socket.on('message', () => {})
      socket.setTimeout(() => socket.close(), 5000)
    })
  }

  sleep(1)
}

/**
 * Builds a secure allowlisted summary artifact and console report.
 * Ensures zero credentials, tokens, cookies, or secrets are ever persisted.
 */
export function handleSummary(data) {
  const metrics = data?.metrics || {}

  // Safe metric extraction
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

  // Dynamic peak and plan calculation
  const configuredPeakVUs = calculateConfiguredPeakVUs(CONFIG.stages)
  const observedPeakVUs = metrics.vus?.values?.max || metrics.vus_max?.values?.value || 0

  // Threshold evaluations
  const p95Ok = parseFloat(p95Duration) <= 5000
  const failRateOk = parseFloat(failPct) < 10
  const checksOk = checkRate !== 'N/A' && parseFloat(checkRate) >= 90
  const overallThresholdsPass = p95Ok && failRateOk && checksOk

  // Auth availability audit
  const hasUserAuth = Boolean(data?.setup_data?.userToken)
  const hasAdminAuth = Boolean(data?.setup_data?.adminToken)
  const hasVendorAuth = Boolean(data?.setup_data?.vendorToken)
  const hasRiderAuth = Boolean(data?.setup_data?.riderToken)
  const allAuthPresent = hasUserAuth && hasAdminAuth && hasVendorAuth && hasRiderAuth

  const stagePlanStr = CONFIG.stages
    .map((s, idx) => `    Stage ${idx + 1}: ${s.duration} -> target ${s.target} VUs`)
    .join('\n')

  const consoleReport = `
===========================================
CRAVE PRODUCTION LOAD BENCHMARK SUMMARY
===========================================
Metadata:
  Timestamp:       ${new Date().toISOString()}
  Environment:     ${APP_ENV}
  Commit SHA:      ${COMMIT_SHA}

Concurrency:
  Configured Peak: ${configuredPeakVUs} VUs
  Observed Peak:   ${observedPeakVUs} VUs
  Configured Plan:
${stagePlanStr}

Endpoints & Targets:
  Base URL:        ${BASE_URL}
  WS URL:          ${WS_URL}
  Auth Tested:     ${allAuthPresent ? 'YES (All roles configured)' : 'PARTIAL / SKIPPED'}

Results:
  Total Requests:      ${totalReqs}
  Failed Requests:     ${failedReqs} (${failPct}%)
  Avg Response Time:   ${avgDuration} ms
  p(95) Response Time: ${p95Duration} ms
  Max Response Time:   ${maxDuration} ms
  Throughput:          ${reqsPerSec} reqs/sec
  WS Connect Avg:      ${wsAvg} ms
  Checks Pass Rate:    ${checkRate}% (${checkPasses} passed, ${checkFails} failed)

Threshold Gates:
  http_req_duration p(95) < 5000ms: ${p95Ok ? '✅ PASS' : '❌ FAIL'}
  http_req_failed rate < 10%:       ${failRateOk ? '✅ PASS' : '❌ FAIL'}
  checks rate > 90%:                 ${checksOk ? '✅ PASS' : '❌ FAIL'}
  Overall Gate Status:              ${overallThresholdsPass ? '✅ BENCHMARK PASSED' : '❌ BENCHMARK FAILED'}
===========================================
`

  // Explicit allowlisted artifact: zero secrets, tokens, or raw setup_data
  const allowlistedSummary = {
    benchmark: 'crave-checkout-load-test',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: APP_ENV,
    commitSha: COMMIT_SHA,
    concurrency: {
      configuredPeakVUs,
      observedPeakVUs,
      stages: CONFIG.stages,
    },
    authCoverage: {
      userScenarioAvailable: hasUserAuth,
      adminScenarioAvailable: hasAdminAuth,
      vendorScenarioAvailable: hasVendorAuth,
      riderScenarioAvailable: hasRiderAuth,
      allCredentialsAvailable: allAuthPresent,
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
        pass: checksOk,
        passPct: checkRate !== 'N/A' ? parseFloat(checkRate) : null,
      },
    },
    overallPassed: overallThresholdsPass,
  }

  return {
    stdout: consoleReport,
    'summary.json': JSON.stringify(allowlistedSummary, null, 2),
  }
}

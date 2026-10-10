// ============================================
// Load Test Configuration
// ============================================
import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep } from 'k6'

const CONFIG = {
  // Target VUs per stage
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '1m', target: 150 },
    { duration: '1m', target: 200 },
    { duration: '1m', target: 500 },
    { duration: '1m', target: 1000 },
    { duration: '1m', target: 100 },
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

  // Demo credentials
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

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const WS_URL = __ENV.WS_URL || 'ws://localhost:8000/api/ws'

function login(email, password) {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({
      email,
      password,
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  )
  if (res.status === 200) {
    const data = JSON.parse(res.body)
    return data.token
  }
  return ''
}

export function setup() {
  // Login as different roles for authenticated tests
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

  // Test 4: Create order as USER (should work)
  if (data.userToken) {
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
  }

  // Test 5: Admin stats as ADMIN
  if (data.adminToken) {
    const statsRes = http.get(`${BASE_URL}${CONFIG.endpoints.adminStats}`, {
      headers: authHeaders(data.adminToken),
    })
    check(statsRes, {
      'admin stats status 200': (r) => r.status === 200,
      'admin stats < 2000ms': (r) => r.timings.duration < CONFIG.timing.adminStats,
    })
  }

  // Test 6: Vendor coupons as VENDOR
  if (data.vendorToken) {
    const couponsRes = http.get(`${BASE_URL}${CONFIG.endpoints.vendorCoupons}`, {
      headers: authHeaders(data.vendorToken),
    })
    check(couponsRes, {
      'vendor coupons status 200': (r) => r.status === 200,
      'vendor coupons < 2000ms': (r) => r.timings.duration < CONFIG.timing.vendorCoupons,
    })
  }

  // Test 7: WebSocket as USER
  if (data.userToken) {
    const wsUrlWithToken = `${WS_URL}?token=${data.userToken}`
    ws.connect(wsUrlWithToken, {}, function (socket) {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'subscribe', channels: ['order_update'] }))
      })
      socket.on('message', (msg) => {})
      socket.setTimeout(function () {
        socket.close()
      }, 5000)
    })
  }

  // Test 8: WebSocket as RIDER (driver location)
  if (data.riderToken) {
    const wsUrlWithToken = `${WS_URL}?token=${data.riderToken}`
    ws.connect(wsUrlWithToken, {}, function (socket) {
      socket.on('open', () => {
        socket.send(JSON.stringify({ type: 'subscribe', channels: ['driver_location'] }))
      })
      socket.on('message', (msg) => {})
      socket.setTimeout(function () {
        socket.close()
      }, 5000)
    })
  }

  sleep(1)
}

export function handleSummary(data) {
  const totalReqs = data.metrics.http_reqs.values.count
  const failedReqs = data.metrics.http_req_failed.values.passes
  const failPct = totalReqs > 0 ? ((failedReqs / totalReqs) * 100).toFixed(2) : '0.00'
  const avgDuration = data.metrics.http_req_duration.values.avg.toFixed(2)
  const p95Duration = data.metrics.http_req_duration.values['p(95)'].toFixed(2)
  const maxDuration = data.metrics.http_req_duration.values.max.toFixed(2)
  const reqsPerSec = data.metrics.http_reqs.values.rate.toFixed(2)
  const wsAvg = data.metrics.ws_connecting
    ? data.metrics.ws_connecting.values.avg.toFixed(2)
    : 'N/A'

  const checkRate = data.metrics.checks
    ? (
        (data.metrics.checks.values.passes /
          (data.metrics.checks.values.passes + data.metrics.checks.values.fails)) *
        100
      ).toFixed(2)
    : 'N/A'

  const summary = `
===========================================
LOAD TEST SUMMARY
===========================================
Configuration:
  Target VUs (peak): ${CONFIG.stages[3].target}
  Stages: ${CONFIG.stages.length}
  Base URL: ${BASE_URL}
  WS URL: ${WS_URL}

Results:
  Total Requests:      ${totalReqs}
  Failed Requests:     ${failedReqs} (${failPct}%)
  Avg Response Time:   ${avgDuration} ms
  p(95) Response Time: ${p95Duration} ms
  Max Response Time:   ${maxDuration} ms
  Requests/sec:        ${reqsPerSec}
  WS Connect Avg:      ${wsAvg} ms
  Checks Pass Rate:    ${checkRate}%

Thresholds:
  http_req_duration p(95) < 5000ms: ${p95Duration <= 5000 ? '✅ PASS' : '❌ FAIL'}
  http_req_failed rate < 10%:       ${failPct < 10 ? '✅ PASS' : '❌ FAIL'}
  checks rate > 90%:                 ${checkRate >= 90 ? '✅ PASS' : '❌ FAIL'}
===========================================
`

  return {
    stdout: summary,
    'summary.json': JSON.stringify(data),
  }
}

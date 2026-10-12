// ============================================
// Comprehensive Load Test Suite - All Test Types
// ============================================
import http from 'k6/http'
import ws from 'k6/ws'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter, Gauge } from 'k6/metrics'

// Custom metrics for detailed tracking
const restErrors = new Rate('rest_errors')
const wsErrors = new Rate('ws_errors')
const authErrors = new Rate('auth_errors')
const orderLatency = new Trend('order_latency')
const wsConnectTime = new Trend('ws_connect_time')
const activeUsers = new Gauge('active_users')
const totalOrders = new Counter('total_orders_created')

// ============================================
// TEST CONFIGURATIONS - All Test Types
// ============================================
export const TEST_CONFIGS = {
  // 1. SMOKE TEST - Minimal load, verify basic functionality
  smoke: {
    name: 'Smoke Test',
    stages: [
      { duration: '30s', target: 1 },
      { duration: '30s', target: 2 },
      { duration: '30s', target: 1 },
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.01'],
      checks: ['rate>0.99'],
    },
    description: 'Verify system works under minimal load',
  },

  // 2. LOAD TEST - Average expected traffic
  load: {
    name: 'Load Test (Average Traffic)',
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 100 },
      { duration: '5m', target: 150 },
      { duration: '2m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000', 'p(99)<10000'],
      http_req_failed: ['rate<0.05'],
      checks: ['rate>0.95'],
    },
    description: 'Normal production traffic simulation',
  },

  // 3. STRESS TEST - Heavy load beyond normal
  stress: {
    name: 'Stress Test (Beyond Normal)',
    stages: [
      { duration: '2m', target: 200 },
      { duration: '5m', target: 500 },
      { duration: '5m', target: 800 },
      { duration: '3m', target: 1000 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<15000', 'p(99)<30000'],
      http_req_failed: ['rate<0.15'],
      checks: ['rate>0.85'],
    },
    description: 'Identify bottlenecks under peak load',
  },

  // 4. SPIKE TEST - Sudden massive surge
  spike: {
    name: 'Spike Test (Flash Sale Simulation)',
    stages: [
      { duration: '1m', target: 50 },
      { duration: '10s', target: 1000 },
      { duration: '30s', target: 1000 },
      { duration: '10s', target: 50 },
      { duration: '2m', target: 50 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<20000', 'p(99)<50000'],
      http_req_failed: ['rate<0.20'],
      checks: ['rate>0.80'],
    },
    description: 'Survive sudden viral traffic surge',
  },

  // 5. SOAK/ENDURANCE TEST - Long sustained load
  soak: {
    name: 'Soak Test (Endurance - 2 hours)',
    stages: [
      { duration: '10m', target: 100 },
      { duration: '1h 40m', target: 150 },
      { duration: '10m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<8000'],
      http_req_failed: ['rate<0.03'],
      checks: ['rate>0.97'],
      // Memory/leak detection: no growing trend
    },
    description: 'Find memory leaks, resource exhaustion over time',
  },

  // 6. BREAKPOINT TEST - Ramp until failure
  breakpoint: {
    name: 'Breakpoint Test (Find Limits)',
    stages: [
      { duration: '1m', target: 100 },
      { duration: '2m', target: 300 },
      { duration: '2m', target: 600 },
      { duration: '2m', target: 1000 },
      { duration: '2m', target: 1500 },
      { duration: '2m', target: 2000 },
      { duration: '2m', target: 3000 },
      { duration: '2m', target: 4000 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<60000'],
      http_req_failed: ['rate<0.50'],
      checks: ['rate>0.50'],
    },
    description: 'Find absolute breaking point',
  },

  // 7. WEBSOCKET FOCUSED TEST
  websocket: {
    name: 'WebSocket Real-time Test',
    stages: [
      { duration: '1m', target: 50 },
      { duration: '3m', target: 200 },
      { duration: '3m', target: 500 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      ws_connecting: ['avg<3000', 'p(95)<10000'],
      ws_session_duration: ['avg>10000'],
      ws_errors: ['rate<0.05'],
      checks: ['rate>0.90'],
    },
    description: 'Test WebSocket connections at scale',
  },

  // 8. BROWSER/E2E TEST (requires k6 browser)
  browser: {
    name: 'Browser E2E Test',
    stages: [
      { duration: '2m', target: 5 },
      { duration: '5m', target: 10 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      browser_web_vital_lcp: ['p(95)<4000'],
      browser_web_vital_fid: ['p(95)<100'],
      browser_web_vital_cls: ['p(95)<0.1'],
      checks: ['rate>0.95'],
    },
    description: 'Real browser performance metrics',
  },
}

// ============================================
// SELECT ACTIVE TEST TYPE via ENV
// ============================================
const TEST_TYPE = __ENV.TEST_TYPE || 'load'
const config = TEST_CONFIGS[TEST_TYPE] || TEST_CONFIGS.load

export const options = {
  stages: config.stages,
  thresholds: config.thresholds,
  // Enable browser module if needed
  ...(TEST_TYPE === 'browser' && { browser: { type: 'chromium' } }),
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const WS_URL = __ENV.WS_URL || 'ws://localhost:8000/api/ws'
const COMMIT_SHA = __ENV.COMMIT_SHA || 'local'
const APP_ENV = __ENV.APP_ENV || 'staging'

// ============================================
// AUTH & USER MANAGEMENT
// ============================================
const USERS = {
  admin: { email: 'admin@crave.com', password: '1234567890', role: 'admin' },
  user: { email: 'user@crave.com', password: '1234567890', role: 'user' },
  vendor: { email: 'vendor@crave.com', password: '1234567890', role: 'vendor' },
  rider: { email: 'rider@crave.com', password: '1234567890', role: 'rider' },
}

const ENDPOINTS = {
  health: '/api/health',
  auth: {
    login: '/api/auth/login',
    register: '/api/auth/register',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
  },
  restaurants: '/api/restaurants',
  menuItems: (restaurantId) => `/api/menu-items?restaurantId=${restaurantId}`,
  orders: '/api/orders',
  orderDetail: (id) => `/api/orders/${id}`,
  admin: {
    stats: '/api/admin/stats',
    coupons: '/api/admin/coupons',
    users: '/api/admin/users',
    restaurants: '/api/admin/restaurants',
  },
  vendor: {
    coupons: '/api/vendor/coupons',
    orders: '/api/vendor/orders',
    menu: '/api/vendor/menu',
    analytics: '/api/vendor/analytics',
  },
  rider: {
    availableOrders: '/api/rider/orders/available',
    myOrders: '/api/rider/orders/mine',
    location: '/api/rider/location',
    earnings: '/api/rider/earnings',
  },
  ws: {
    connect: '/api/ws',
    subscribe: (token) => `${WS_URL}?token=${token}`,
  },
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function login(email, password) {
  const res = http.post(`${BASE_URL}${ENDPOINTS.auth.login}`, JSON.stringify({ email, password }), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '10s',
  })
  authErrors.add(res.status !== 200)
  if (res.status === 200 && res.body) {
    const data = JSON.parse(res.body)
    return data.token || ''
  }
  return ''
}

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// ============================================
// SETUP - Login all roles
// ============================================
export function setup() {
  console.log(`[SETUP] Starting ${config.name} - ${config.description}`)
  console.log(`[SETUP] Base URL: ${BASE_URL}`)
  console.log(`[SETUP] WS URL: ${WS_URL}`)

  const tokens = {}
  for (const [role, creds] of Object.entries(USERS)) {
    tokens[`${role}Token`] = login(creds.email, creds.password)
    console.log(`[SETUP] ${role}: ${tokens[`${role}Token`] ? 'OK' : 'FAILED'}`)
  }

  // Create test restaurant/menu data if needed
  if (tokens.adminToken) {
    // Could seed data here
  }

  return {
    ...tokens,
    testType: TEST_TYPE,
    startTime: Date.now(),
  }
}

// ============================================
// TEARDOWN - Cleanup
// ============================================
export function teardown(data) {
  const duration = (Date.now() - data.startTime) / 1000
  console.log(`[TEARDOWN] ${config.name} completed in ${duration.toFixed(1)}s`)
}

// ============================================
// MAIN TEST SCENARIOS
// ============================================
export default function (data) {
  activeUsers.add(1)

  const hasUserAuth = Boolean(data?.userToken)
  const hasAdminAuth = Boolean(data?.adminToken)
  const hasVendorAuth = Boolean(data?.vendorToken)
  const hasRiderAuth = Boolean(data?.riderToken)

  // Run scenario based on test type
  switch (TEST_TYPE) {
    case 'smoke':
      runSmokeTests(data)
      break
    case 'load':
      runLoadTests(data)
      break
    case 'stress':
      runStressTests(data)
      break
    case 'spike':
      runSpikeTests(data)
      break
    case 'soak':
      runSoakTests(data)
      break
    case 'breakpoint':
      runBreakpointTests(data)
      break
    case 'websocket':
      runWebSocketTests(data)
      break
    case 'browser':
      runBrowserTests(data)
      break
    default:
      runLoadTests(data)
  }

  activeUsers.add(-1)
  sleep(1)
}

// ============================================
// INDIVIDUAL TEST SCENARIOS
// ============================================

function runSmokeTests(data) {
  group('Smoke: Health & Public APIs', () => {
    // Health check
    let res = http.get(`${BASE_URL}${ENDPOINTS.health}`, { timeout: '5s' })
    restErrors.add(res.status !== 200)
    check(res, { 'health: status 200': (r) => r.status === 200 })

    // Public endpoints
    res = http.get(`${BASE_URL}${ENDPOINTS.restaurants}`, { timeout: '5s' })
    restErrors.add(res.status !== 200)
    check(res, { 'restaurants: status 200': (r) => r.status === 200 })

    if (res.status === 200 && res.body) {
      try {
        const restaurants = JSON.parse(res.body)
        if (Array.isArray(restaurants) && restaurants.length > 0) {
          const firstId = restaurants[0].id || 'rest_01'
          res = http.get(`${BASE_URL}${ENDPOINTS.menuItems(firstId)}`, { timeout: '5s' })
          restErrors.add(res.status !== 200)
          check(res, { 'menu-items: status 200': (r) => r.status === 200 })
        }
      } catch (e) {
        // ignore parse errors
      }
    }
  })

  group('Smoke: Auth Flow', () => {
    if (data?.userToken) {
      const res = http.get(`${BASE_URL}${ENDPOINTS.auth.me}`, {
        headers: authHeaders(data.userToken),
        timeout: '5s',
      })
      restErrors.add(res.status !== 200)
      check(res, { 'auth/me: status 200': (r) => r.status === 200 })
    }
  })
}

function runLoadTests(data) {
  group('Load: Public Read APIs', () => {
    // Health
    let res = http.get(`${BASE_URL}${ENDPOINTS.health}`, { timeout: '5s' })
    restErrors.add(res.status !== 200)
    check(res, { 'health: 200': (r) => r.status === 200 })

    // Restaurants list
    res = http.get(`${BASE_URL}${ENDPOINTS.restaurants}`, { timeout: '5s' })
    restErrors.add(res.status !== 200)
    check(res, { 'restaurants: 200': (r) => r.status === 200 })

    // Menu items
    res = http.get(`${BASE_URL}${ENDPOINTS.menuItems('rest_01')}`, { timeout: '5s' })
    restErrors.add(res.status !== 200)
    check(res, { 'menu-items: 200': (r) => r.status === 200 })
  })

  group('Load: User Order Flow', () => {
    if (!data?.userToken) return

    // Create order
    const orderPayload = JSON.stringify({
      restaurantId: 'rest_01',
      items: [{ id: 'mi_01', quantity: Math.floor(Math.random() * 3) + 1 }],
      address: `Test Address ${__VU}-${__ITER}, Bengaluru`,
      paymentMethod: 'upi',
    })

    const startTime = Date.now()
    const res = http.post(`${BASE_URL}${ENDPOINTS.orders}`, orderPayload, {
      headers: authHeaders(data.userToken),
      timeout: '10s',
    })
    orderLatency.add(Date.now() - startTime)

    restErrors.add(!(res.status === 200 || res.status === 201))
    check(res, {
      'create order: 200/201': (r) => r.status === 200 || r.status === 201,
      'create order: < 5000ms': (r) => r.timings.duration < 5000,
    })

    if (res.status === 200 || res.status === 201) {
      totalOrders.add(1)
      try {
        const order = JSON.parse(res.body)
        if (order.id) {
          // Fetch order detail
          res = http.get(`${BASE_URL}${ENDPOINTS.orderDetail(order.id)}`, {
            headers: authHeaders(data.userToken),
            timeout: '5s',
          })
          restErrors.add(res.status !== 200)
          check(res, { 'get order detail: 200': (r) => r.status === 200 })
        }
      } catch (e) {
        // ignore
      }
    }
  })

  group('Load: Admin APIs', () => {
    if (!data?.adminToken) return

    const endpoints = [
      { name: 'admin/stats', url: ENDPOINTS.admin.stats },
      { name: 'admin/coupons', url: ENDPOINTS.admin.coupons },
      { name: 'admin/users', url: ENDPOINTS.admin.users },
    ]

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep.url}`, {
        headers: authHeaders(data.adminToken),
        timeout: '5s',
      })
      restErrors.add(res.status !== 200)
      check(res, { [`${ep.name}: 200`]: (r) => r.status === 200 })
    }
  })

  group('Load: Vendor APIs', () => {
    if (!data?.vendorToken) return

    const endpoints = [
      { name: 'vendor/coupons', url: ENDPOINTS.vendor.coupons },
      { name: 'vendor/orders', url: ENDPOINTS.vendor.orders },
      { name: 'vendor/menu', url: ENDPOINTS.vendor.menu },
    ]

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep.url}`, {
        headers: authHeaders(data.vendorToken),
        timeout: '5s',
      })
      restErrors.add(res.status !== 200)
      check(res, { [`${ep.name}: 200`]: (r) => r.status === 200 })
    }
  })

  group('Load: Rider APIs', () => {
    if (!data?.riderToken) return

    const endpoints = [
      { name: 'rider/available', url: ENDPOINTS.rider.availableOrders },
      { name: 'rider/mine', url: ENDPOINTS.rider.myOrders },
      { name: 'rider/earnings', url: ENDPOINTS.rider.earnings },
    ]

    for (const ep of endpoints) {
      const res = http.get(`${BASE_URL}${ep.url}`, {
        headers: authHeaders(data.riderToken),
        timeout: '5s',
      })
      restErrors.add(res.status !== 200)
      check(res, { [`${ep.name}: 200`]: (r) => r.status === 200 })
    }
  })
}

function runStressTests(data) {
  // Same as load but with more aggressive timing
  runLoadTests(data)

  group('Stress: Concurrent Writes', () => {
    if (!data?.userToken) return

    // Multiple rapid orders
    for (let i = 0; i < 3; i++) {
      const res = http.post(
        `${BASE_URL}${ENDPOINTS.orders}`,
        JSON.stringify({
          restaurantId: 'rest_01',
          items: [{ id: 'mi_01', quantity: 1 }],
          address: `Stress ${__VU}-${__ITER}-${i}`,
          paymentMethod: 'cod',
        }),
        {
          headers: authHeaders(data.userToken),
          timeout: '15s',
        }
      )
      restErrors.add(!(res.status === 200 || res.status === 201))
      check(res, { 'rapid order: 200/201': (r) => r.status === 200 || r.status === 201 })
    }
  })
}

function runSpikeTests(data) {
  // Public APIs only - spike focuses on read resilience
  group('Spike: Public Endpoints Under Surge', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.health}`, { timeout: '10s' })
    restErrors.add(res.status !== 200)
    check(res, { 'spike health: 200': (r) => r.status === 200 })

    const res2 = http.get(`${BASE_URL}${ENDPOINTS.restaurants}`, { timeout: '10s' })
    restErrors.add(res2.status !== 200)
    check(res2, { 'spike restaurants: 200': (r) => r.status === 200 })
  })
}

function runSoakTests(data) {
  // Sustained load with all operations
  runLoadTests(data)

  // Periodic health checks
  if (__ITER % 10 === 0) {
    group('Soak: Periodic Deep Check', () => {
      if (data?.userToken) {
        const res = http.get(`${BASE_URL}${ENDPOINTS.auth.me}`, {
          headers: authHeaders(data.userToken),
          timeout: '10s',
        })
        restErrors.add(res.status !== 200)
        check(res, { 'soak auth/me: 200': (r) => r.status === 200 })
      }
    })
  }
}

function runBreakpointTests(data) {
  // Minimal checks, focus on system survival
  group('Breakpoint: Survival Check', () => {
    const res = http.get(`${BASE_URL}${ENDPOINTS.health}`, { timeout: '30s' })
    restErrors.add(res.status !== 200)
    check(res, { 'breakpoint health: responds': (r) => r.status !== 0 })
  })
}

function runWebSocketTests(data) {
  group('WebSocket: Connection Tests', () => {
    if (!data?.userToken) return

    const wsUrl = ENDPOINTS.ws.subscribe(data.userToken)
    const startTime = Date.now()

    ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        wsConnectTime.add(Date.now() - startTime)
        check(socket, { 'ws: connected': () => true })

        // Subscribe to multiple channels
        socket.send(
          JSON.stringify({
            type: 'subscribe',
            channels: ['order_update', 'driver_location', 'notifications'],
          })
        )

        // Send periodic pings
        const pingInterval = setInterval(() => {
          socket.send(JSON.stringify({ type: 'ping' }))
        }, 5000)

        socket.setTimeout(() => {
          clearInterval(pingInterval)
          socket.close()
        }, 30000)
      })

      socket.on('message', (msg) => {
        check(msg, { 'ws: received message': () => true })
      })

      socket.on('close', () => {
        wsErrors.add(false)
      })

      socket.on('error', (err) => {
        wsErrors.add(true)
        console.error(`WS Error: ${err}`)
      })
    })
  })

  group('WebSocket: Rider Location Updates', () => {
    if (!data?.riderToken) return

    const wsUrl = ENDPOINTS.ws.subscribe(data.riderToken)

    ws.connect(wsUrl, {}, function (socket) {
      socket.on('open', () => {
        // Simulate location updates every 2 seconds
        const locInterval = setInterval(() => {
          socket.send(
            JSON.stringify({
              type: 'location_update',
              lat: 12.9716 + (Math.random() - 0.5) * 0.01,
              lng: 77.5946 + (Math.random() - 0.5) * 0.01,
              heading: Math.random() * 360,
            })
          )
        }, 2000)

        socket.setTimeout(() => {
          clearInterval(locInterval)
          socket.close()
        }, 20000)
      })

      socket.on('error', () => wsErrors.add(true))
    })
  })
}

function runBrowserTests(data) {
  // Browser tests require k6 browser module (k6 v0.47+)
  // This is a placeholder - actual browser tests need different syntax
  group('Browser: Page Load', () => {
    // Would use browser module:
    // const page = browser.newPage()
    // page.goto(`${BASE_URL}/restaurants`)
    // page.waitForSelector('[data-testid="restaurant-list"]')
    // const lcp = page.evaluate(() => performance.getEntriesByType('largest-contentful-paint')[0]?.startTime)
    // check(lcp, { 'LCP < 4000': (v) => v < 4000 })
    // page.close()
    check(true, { 'browser test placeholder': () => true })
  })
}

// ============================================
// SUMMARY REPORT
// ============================================
export function handleSummary(data) {
  const metrics = data?.metrics || {}

  // Extract key metrics
  const totalReqs = metrics.http_reqs?.values?.count || 0
  const failedReqs = metrics.http_req_failed?.values?.passes || 0
  const failPct = totalReqs > 0 ? ((failedReqs / totalReqs) * 100).toFixed(2) : '0.00'

  const avgDuration = metrics.http_req_duration?.values?.avg?.toFixed(2) || '0.00'
  const p95Duration = metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) || '0.00'
  const maxDuration = metrics.http_req_duration?.values?.max?.toFixed(2) || '0.00'
  const reqsPerSec = metrics.http_reqs?.values?.rate?.toFixed(2) || '0.00'

  const wsAvg = metrics.ws_connecting?.values?.avg?.toFixed(2) || 'N/A'
  const wsErrorRate = metrics.ws_errors?.values?.rate || 0

  const checkPasses = metrics.checks?.values?.passes || 0
  const checkFails = metrics.checks?.values?.fails || 0
  const totalChecks = checkPasses + checkFails
  const checkRate = totalChecks > 0 ? ((checkPasses / totalChecks) * 100).toFixed(2) : 'N/A'

  const stagePlanStr = config.stages
    .map((s, idx) => `    Stage ${idx + 1}: ${s.duration} -> target ${s.target} VUs`)
    .join('\n')

  const consoleReport = `
===========================================
CRAVE ${config.name.toUpperCase()} SUMMARY
===========================================
Test Type:        ${TEST_TYPE}
Description:      ${config.description}
Timestamp:        ${new Date().toISOString()}
Environment:      ${APP_ENV}
Commit SHA:       ${COMMIT_SHA}
Base URL:         ${BASE_URL}

Concurrency Plan:
${stagePlanStr}

Results:
  Total Requests:      ${totalReqs}
  Failed Requests:     ${failedReqs} (${failPct}%)
  Avg Response Time:   ${avgDuration} ms
  p(95) Response Time: ${p95Duration} ms
  Max Response Time:   ${maxDuration} ms
  Throughput:          ${reqsPerSec} reqs/sec
  WS Connect Avg:      ${wsAvg} ms
  WS Error Rate:       ${(wsErrorRate * 100).toFixed(2)}%
  Checks Pass Rate:    ${checkRate}% (${checkPasses} passed, ${checkFails} failed)

Threshold Gates:
  ${Object.entries(config.thresholds)
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n  ')}

===========================================
`

  const summary = {
    testType: TEST_TYPE,
    testName: config.name,
    description: config.description,
    timestamp: new Date().toISOString(),
    environment: APP_ENV,
    commitSha: COMMIT_SHA,
    baseUrl: BASE_URL,
    concurrency: {
      stages: config.stages,
    },
    results: {
      totalRequests: totalReqs,
      failedRequests: failedReqs,
      failureRatePct: parseFloat(failPct),
      avgResponseTimeMs: parseFloat(avgDuration),
      p95ResponseTimeMs: parseFloat(p95Duration),
      maxResponseTimeMs: parseFloat(maxDuration),
      throughputRps: parseFloat(reqsPerSec),
      wsConnectAvgMs: wsAvg !== 'N/A' ? parseFloat(wsAvg) : null,
      wsErrorRatePct: (wsErrorRate * 100).toFixed(2),
      checksPassRatePct: checkRate !== 'N/A' ? parseFloat(checkRate) : null,
      checksPassed: checkPasses,
      checksFailed: checkFails,
    },
    customMetrics: {
      restErrors: metrics.rest_errors?.values?.rate || 0,
      authErrors: metrics.auth_errors?.values?.rate || 0,
      totalOrdersCreated: metrics.total_orders_created?.values?.count || 0,
    },
  }

  return {
    stdout: consoleReport,
    'summary.json': JSON.stringify(summary, null, 2),
    // JUnit XML for CI integration
    'junit.xml': generateJUnitXML(summary),
  }
}

function generateJUnitXML(summary) {
  const testSuite = {
    testsuite: {
      '@name': `Crave ${summary.testName}`,
      '@tests': 1,
      '@failures': summary.results.checksPassRatePct < 90 ? 1 : 0,
      '@time': summary.results.avgResponseTimeMs / 1000,
      testcase: {
        '@name': summary.testType,
        '@classname': 'CraveLoadTest',
        '@time': summary.results.avgResponseTimeMs / 1000,
        ...(summary.results.checksPassRatePct < 90 && {
          failure: {
            '@message': `Check pass rate ${summary.results.checksPassRatePct}% below 90%`,
            '#text': JSON.stringify(summary, null, 2),
          },
        }),
      },
    },
  }

  // Simple XML generation (in production use a proper XML library)
  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuite name="${summary.testName}" tests="1" failures="${testSuite.testsuite['@failures']}" time="${testSuite.testsuite['@time']}">
  <testcase name="${summary.testType}" classname="CraveLoadTest" time="${testSuite.testsuite['@time']}">
    ${testSuite.testsuite['@failures'] ? `<failure message="Check pass rate ${summary.results.checksPassRatePct}% below 90%">${JSON.stringify(summary)}</failure>` : ''}
  </testcase>
</testsuite>`
}

import { SignJWT } from 'jose'
import WebSocket from 'ws'

const BASE_URL = 'http://localhost:3000'
const WS_URL = 'ws://localhost:3000/api/ws'
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

async function makeToken(role, id = `test_${role}_01`) {
  const secretKey = new TextEncoder().encode(JWT_SECRET)
  return new SignJWT({
    id,
    name: `Test ${role}`,
    email: `${role}@example.test`,
    role,
    jti: `jti_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    issuedAtMs: Date.now(),
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secretKey)
}

let passed = 0
let failed = 0

function logPass(desc) {
  passed++
  console.log(`  ✔ [PASS] ${desc}`)
}

function logFail(desc, details) {
  failed++
  console.error(`  ✖ [FAIL] ${desc} - ${details}`)
}

async function testRoute(urlPath, options = {}) {
  const { expectedStatus = 200, cookie = null, expectedLocation = null, desc = urlPath } = options
  const headers = {}
  if (cookie) {
    headers['Cookie'] = cookie
  }
  try {
    const res = await fetch(`${BASE_URL}${urlPath}`, {
      headers,
      redirect: 'manual',
    })

    if (res.status === expectedStatus) {
      if (expectedLocation) {
        const loc = res.headers.get('location')
        if (loc && loc.includes(expectedLocation)) {
          logPass(`${desc} (Status ${res.status} redirecting to ${expectedLocation})`)
        } else {
          logFail(
            desc,
            `Status matches ${res.status} but Location is '${loc}', expected to include '${expectedLocation}'`
          )
        }
      } else {
        logPass(`${desc} (Status ${res.status})`)
      }
    } else {
      logFail(desc, `Expected status ${expectedStatus}, received ${res.status}`)
    }
  } catch (err) {
    logFail(desc, `Network/Fetch error: ${err.message}`)
  }
}

async function testWebSocket(token) {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS_URL}?token=${token}`)
    const timer = setTimeout(() => {
      logFail('WebSocket /api/ws Proxy Connection', 'Timed out waiting for response')
      try {
        ws.terminate()
      } catch (e) {}
      resolve(false)
    }, 5000)

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', channels: ['restaurants'] }))
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.channel === 'control' && msg.data?.type === 'subscribed') {
          clearTimeout(timer)
          logPass('WebSocket /api/ws (Proxied upgrade & subscribed to restaurants channel)')
          ws.close()
          resolve(true)
        }
      } catch (e) {
        // Continue waiting
      }
    })

    ws.on('error', (err) => {
      clearTimeout(timer)
      logFail('WebSocket /api/ws Proxy Connection', err.message)
      resolve(false)
    })
  })
}

async function run() {
  console.log('\n=======================================================')
  console.log('   CRAVE WEB APPLICATION SUITE END-TO-END VERIFICATION')
  console.log('=======================================================\n')

  // 1. Generate Auth Tokens
  const customerToken = await makeToken('user')
  const vendorToken = await makeToken('restaurant_vendor')
  const driverToken = await makeToken('rider')
  const adminToken = await makeToken('admin')

  const customerCookie = `crave_auth_token=${customerToken}`
  const vendorCookie = `crave_auth_token=${vendorToken}`
  const driverCookie = `crave_auth_token=${driverToken}`
  const adminCookie = `crave_auth_token=${adminToken}`

  // 2. Public Pages
  console.log('--- 1. Public Pages (Unauthenticated) ---')
  await testRoute('/', { desc: 'Landing Page (/)' })
  await testRoute('/login', { desc: 'Login Page (/login)' })
  await testRoute('/signup', { desc: 'Signup Page (/signup)' })
  await testRoute('/policies', { desc: 'Policies Hub (/policies)' })
  await testRoute('/policies/terms-of-service', {
    desc: 'Terms of Service (/policies/terms-of-service)',
  })
  await testRoute('/policies/privacy', { desc: 'Privacy Policy (/policies/privacy)' })
  await testRoute('/policies/fssai', { desc: 'FSSAI License (/policies/fssai)' })
  await testRoute('/policies/cookies', { desc: 'Cookie Policy (/policies/cookies)' })
  await testRoute('/policies/security', { desc: 'Security Policy (/policies/security)' })

  // 3. Unauthenticated Access Protection
  console.log('\n--- 2. Unauthenticated Access Protection (Gated by proxy.ts) ---')
  await testRoute('/user/explore', {
    expectedStatus: 307,
    expectedLocation: '/login',
    desc: 'Unauthenticated /user/explore -> /login',
  })
  await testRoute('/vendor/dashboard', {
    expectedStatus: 307,
    expectedLocation: '/login',
    desc: 'Unauthenticated /vendor/dashboard -> /login',
  })
  await testRoute('/driver/dashboard', {
    expectedStatus: 307,
    expectedLocation: '/login',
    desc: 'Unauthenticated /driver/dashboard -> /login',
  })
  await testRoute('/admin/dashboard', {
    expectedStatus: 307,
    expectedLocation: '/login',
    desc: 'Unauthenticated /admin/dashboard -> /login',
  })

  // 4. Role Cross-Boundary Isolation
  console.log('\n--- 3. Role Boundary & Cross-Portal Access Isolation ---')
  await testRoute('/admin/dashboard', {
    cookie: customerCookie,
    expectedStatus: 307,
    expectedLocation: '/forbidden',
    desc: 'Customer accessing /admin/dashboard -> /forbidden',
  })
  await testRoute('/vendor/dashboard', {
    cookie: customerCookie,
    expectedStatus: 307,
    expectedLocation: '/forbidden',
    desc: 'Customer accessing /vendor/dashboard -> /forbidden',
  })
  await testRoute('/driver/dashboard', {
    cookie: customerCookie,
    expectedStatus: 307,
    expectedLocation: '/forbidden',
    desc: 'Customer accessing /driver/dashboard -> /forbidden',
  })
  await testRoute('/admin/dashboard', {
    cookie: driverCookie,
    expectedStatus: 307,
    expectedLocation: '/forbidden',
    desc: 'Driver accessing /admin/dashboard -> /forbidden',
  })
  await testRoute('/admin/dashboard', {
    cookie: vendorCookie,
    expectedStatus: 307,
    expectedLocation: '/forbidden',
    desc: 'Vendor accessing /admin/dashboard -> /forbidden',
  })

  // 5. Customer Web App Portal
  console.log('\n--- 4. Customer Portal (/user/*) ---')
  await testRoute('/user/explore', {
    cookie: customerCookie,
    desc: 'Customer Explore (/user/explore)',
  })
  await testRoute('/user/cart', { cookie: customerCookie, desc: 'Customer Cart (/user/cart)' })
  await testRoute('/user/cravexp', {
    cookie: customerCookie,
    desc: 'Customer CraveXP Grocery (/user/cravexp)',
  })
  await testRoute('/user/orders', {
    cookie: customerCookie,
    desc: 'Customer Orders (/user/orders)',
  })
  await testRoute('/user/profile', {
    cookie: customerCookie,
    desc: 'Customer Profile (/user/profile)',
  })
  await testRoute('/user/help', { cookie: customerCookie, desc: 'Customer Help (/user/help)' })

  // 6. Vendor Web App Portal
  console.log('\n--- 5. Vendor / Kitchen Portal (/vendor/*) ---')
  await testRoute('/vendor/dashboard', {
    cookie: vendorCookie,
    desc: 'Vendor Kitchen Dashboard (/vendor/dashboard)',
  })
  await testRoute('/vendor/menu', {
    cookie: vendorCookie,
    desc: 'Vendor Menu Management (/vendor/menu)',
  })
  await testRoute('/vendor/sales', {
    cookie: vendorCookie,
    desc: 'Vendor Sales Analytics (/vendor/sales)',
  })
  await testRoute('/vendor/settings', {
    cookie: vendorCookie,
    desc: 'Vendor Settings (/vendor/settings)',
  })

  // 7. Driver Web App Portal
  console.log('\n--- 6. Driver / Rider Portal (/driver/*) ---')
  await testRoute('/driver/dashboard', {
    cookie: driverCookie,
    desc: 'Driver Dashboard (/driver/dashboard)',
  })
  await testRoute('/driver/history', {
    cookie: driverCookie,
    desc: 'Driver History (/driver/history)',
  })
  await testRoute('/driver/incentives', {
    cookie: driverCookie,
    desc: 'Driver Incentives (/driver/incentives)',
  })
  await testRoute('/driver/orders', {
    cookie: driverCookie,
    desc: 'Driver Orders (/driver/orders)',
  })
  await testRoute('/driver/profile', {
    cookie: driverCookie,
    desc: 'Driver Profile (/driver/profile)',
  })
  await testRoute('/driver/settings', {
    cookie: driverCookie,
    desc: 'Driver Settings (/driver/settings)',
  })
  await testRoute('/driver/wallet', {
    cookie: driverCookie,
    desc: 'Driver Wallet (/driver/wallet)',
  })

  // 8. Admin Web App Portal
  console.log('\n--- 7. Admin Operations & Analytics Portal (/admin/*) ---')
  await testRoute('/admin/dashboard', {
    cookie: adminCookie,
    desc: 'Admin Dashboard (/admin/dashboard)',
  })
  await testRoute('/admin/analytics', {
    cookie: adminCookie,
    desc: 'Admin Analytics (/admin/analytics)',
  })
  await testRoute('/admin/ai-analytics', {
    cookie: adminCookie,
    desc: 'Admin AI Analytics (/admin/ai-analytics)',
  })
  await testRoute('/admin/calculator', {
    cookie: adminCookie,
    desc: 'Admin Calculator Preview (/admin/calculator)',
  })
  await testRoute('/admin/coupons', { cookie: adminCookie, desc: 'Admin Coupons (/admin/coupons)' })
  await testRoute('/admin/cravexp', {
    cookie: adminCookie,
    desc: 'Admin CraveXP Hub (/admin/cravexp)',
  })
  await testRoute('/admin/map-live-analytics', {
    cookie: adminCookie,
    desc: 'Admin Live H3 Map (/admin/map-live-analytics)',
  })
  await testRoute('/admin/order-cancellations', {
    cookie: adminCookie,
    desc: 'Admin Order Cancellations (/admin/order-cancellations)',
  })
  await testRoute('/admin/payment-config', {
    cookie: adminCookie,
    desc: 'Admin Payment Config (/admin/payment-config)',
  })
  await testRoute('/admin/payments', {
    cookie: adminCookie,
    desc: 'Admin Payment Reviews (/admin/payments)',
  })
  await testRoute('/admin/settings', {
    cookie: adminCookie,
    desc: 'Admin Settings (/admin/settings)',
  })
  await testRoute('/admin/users', {
    cookie: adminCookie,
    desc: 'Admin User Management (/admin/users)',
  })
  await testRoute('/admin/vendor-settlements', {
    cookie: adminCookie,
    desc: 'Admin Vendor Settlements (/admin/vendor-settlements)',
  })

  // 9. Health & WebSocket
  console.log('\n--- 8. Realtime WebSocket & Health Probes ---')
  await testRoute('/api/health', {
    expectedStatus: 503,
    desc: 'Liveness Probe (/api/health degraded when DB is offline)',
  })
  await testRoute('/api/health/ready', {
    expectedStatus: 503,
    desc: 'Readiness Probe (/api/health/ready unready when DB is offline)',
  })
  await testWebSocket(customerToken)

  console.log('\n=======================================================')
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`)
  console.log('=======================================================\n')

  process.exit(failed > 0 ? 1 : 0)
}

run()

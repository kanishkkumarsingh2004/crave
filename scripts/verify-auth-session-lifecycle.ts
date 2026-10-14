import {
  createToken,
  verifyToken,
  blacklistToken,
  blacklistAllUserTokens,
  unblacklistUser,
  JWTPayload,
} from '../lib/jwt'
import { NextRequest } from 'next/server'
import { proxy } from '../proxy'
import { POST as logoutPost } from '../app/api/auth/logout/route'
import { GET as meGet } from '../app/api/auth/me/route'

async function runAuthVerification() {
  console.log('🧪 Starting Auth & Session Lifecycle Verification Suite...\n')

  // TEST 1: Token Creation & Verification
  console.log('--- TEST 1: Token Creation and Initial Verification ---')
  const testPayload: JWTPayload = {
    id: 'usr_test_' + Date.now(),
    name: 'Test Customer',
    email: 'test@example.com',
    role: 'user',
  }

  const token = await createToken(testPayload)
  if (!token || typeof token !== 'string') {
    throw new Error('TEST 1 FAILED: Failed to create JWT token.')
  }

  const verified = await verifyToken(token)
  if (!verified || verified.id !== testPayload.id || verified.role !== 'user') {
    throw new Error('TEST 1 FAILED: Token could not be verified.')
  }
  console.log('✅ TEST 1 PASSED: Token successfully created and verified.\n')

  // TEST 2: Single-Token Revocation via Blacklist
  console.log('--- TEST 2: Single-Token Revocation (In-Memory & Redis Fallback) ---')
  const blacklisted = await blacklistToken(token)
  if (!blacklisted) {
    throw new Error('TEST 2 FAILED: blacklistToken returned false.')
  }

  const verifiedAfterBlacklist = await verifyToken(token)
  if (verifiedAfterBlacklist !== null) {
    throw new Error('TEST 2 FAILED: Revoked token was still accepted!')
  }
  console.log('✅ TEST 2 PASSED: Revoked token was immediately rejected.\n')

  // TEST 3: User-Level Global Logout (All Sessions)
  console.log('--- TEST 3: User-Level Revocation ---')
  const userTokenPayload: JWTPayload = {
    id: 'usr_multi_' + Date.now(),
    name: 'Multi Device User',
    email: 'multidevice@example.com',
    role: 'user',
  }

  const tokenDevice1 = await createToken(userTokenPayload)
  const tokenDevice2 = await createToken(userTokenPayload)

  const verifyDevice1Before = await verifyToken(tokenDevice1)
  const verifyDevice2Before = await verifyToken(tokenDevice2)
  if (!verifyDevice1Before || !verifyDevice2Before) {
    throw new Error('TEST 3 FAILED: Multi-device tokens failed initial verification.')
  }

  await blacklistAllUserTokens(userTokenPayload.id)

  const verifyDevice1After = await verifyToken(tokenDevice1)
  const verifyDevice2After = await verifyToken(tokenDevice2)
  if (verifyDevice1After !== null || verifyDevice2After !== null) {
    throw new Error('TEST 3 FAILED: User-level revoked tokens were not rejected.')
  }

  // Restore user via unblacklistUser (simulating new login)
  await unblacklistUser(userTokenPayload.id)
  const freshToken = await createToken(userTokenPayload)
  const verifyFreshToken = await verifyToken(freshToken)
  if (!verifyFreshToken) {
    throw new Error('TEST 3 FAILED: Unblacklisted user fresh token was rejected.')
  }
  console.log(
    '✅ TEST 3 PASSED: All user session tokens revoked synchronously and restored upon unblacklist.\n'
  )

  // TEST 4: /api/auth/logout Purges All 3 Auth Cookies
  console.log('--- TEST 4: /api/auth/logout Cookie Deletion ---')
  const logoutReq = new Request('http://localhost:3000/api/auth/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'crave_auth_token=tok1; drop_auth_token=tok2; crave_token=tok3',
    },
    body: JSON.stringify({ token: 'tok1' }),
  })

  const logoutRes = await logoutPost(logoutReq)
  const setCookieHeaders = logoutRes.headers.getSetCookie()

  const isCleared = (h: string, name: string) =>
    h.includes(`${name}=`) &&
    (h.includes('Max-Age=0') ||
      h.includes('Expires=Thu, 01 Jan 1970 00:00:00 GMT') ||
      h.includes('expires=Thu, 01 Jan 1970 00:00:00 GMT'))

  const clearedCraveAuth = setCookieHeaders.some((h) => isCleared(h, 'crave_auth_token'))
  const clearedDropAuth = setCookieHeaders.some((h) => isCleared(h, 'drop_auth_token'))
  const clearedCraveToken = setCookieHeaders.some((h) => isCleared(h, 'crave_token'))

  if (!clearedCraveAuth || !clearedDropAuth || !clearedCraveToken) {
    throw new Error(
      `TEST 4 FAILED: Logout did not clear all 3 cookies! Got: ${JSON.stringify(setCookieHeaders)}`
    )
  }
  console.log(
    '✅ TEST 4 PASSED: Logout response issued Max-Age=0 deletion for all 3 auth cookies.\n'
  )

  // TEST 5: Proxy / Middleware Respects ?logout=1
  console.log('--- TEST 5: Proxy Middleware Bouncing Guard ---')
  const activeUserToken = await createToken({
    id: 'usr_bounce_check',
    name: 'Active User',
    email: 'bounce@example.com',
    role: 'user',
  })

  // Case 5A: Normal visit to /login while authenticated -> Redirects to /user/dashboard
  const normalLoginReq = new NextRequest('http://localhost:3000/login', {
    headers: {
      Cookie: `crave_token=${activeUserToken}`,
    },
  })
  const normalLoginRes = await proxy(normalLoginReq)
  if (
    normalLoginRes.status !== 307 &&
    normalLoginRes.status !== 302 &&
    normalLoginRes.status !== 308
  ) {
    throw new Error(
      `TEST 5A FAILED: Expected redirect from /login for active session, got ${normalLoginRes.status}`
    )
  }

  // Case 5B: Explicit logout visit to /login?logout=1 -> MUST NOT redirect to dashboard!
  const logoutLoginReq = new NextRequest('http://localhost:3000/login?logout=1', {
    headers: {
      Cookie: `crave_token=${activeUserToken}`,
    },
  })
  const logoutLoginRes = await proxy(logoutLoginReq)
  if (
    logoutLoginRes.status === 307 ||
    logoutLoginRes.status === 302 ||
    logoutLoginRes.status === 308
  ) {
    throw new Error(
      `TEST 5B FAILED: Proxy incorrectly redirected /login?logout=1 back to dashboard!`
    )
  }
  console.log(
    '✅ TEST 5 PASSED: Proxy correctly prevents redirect loop when explicit logout is requested.\n'
  )

  console.log('🎉 ALL AUTH & SESSION LIFECYCLE TESTS PASSED PERFECTLY!')
  process.exit(0)
}

runAuthVerification().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err)
  process.exit(1)
})

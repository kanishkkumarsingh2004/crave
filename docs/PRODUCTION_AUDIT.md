# 🔍 Crave Platform — 100% Production Readiness Audit

**Audit Date:** October 11, 2026  
**Audited By:** Antigravity Code Audit Engine  
**Project:** `crave` — Food & Grocery Delivery Platform  
**Stack:** Next.js 16.4, Prisma 7, Neon PostgreSQL, Redis (optional), WebSocket, Docker  
**Audit Scope:** Security · TypeScript · Database · Infrastructure · Performance · Testing

---

## 📊 Executive Summary

| Category             | Status         | Critical | High   | Medium | Low    |
| -------------------- | -------------- | -------- | ------ | ------ | ------ |
| 🔴 Security          | ⚠️ Needs Fixes | 3        | 4      | 3      | 2      |
| 🟠 TypeScript        | ❌ Failing     | 1        | 3      | 5      | —      |
| 🟡 Database / Schema | ⚠️ Needs Fixes | 1        | 2      | 3      | 2      |
| 🟡 Infrastructure    | ⚠️ Needs Fixes | 1        | 3      | 2      | 2      |
| 🟢 Performance       | ⚠️ Needs Fixes | 0        | 2      | 4      | 3      |
| 🟢 Testing           | ⚠️ Incomplete  | 0        | 1      | 3      | 2      |
| **Total**            | —              | **6**    | **15** | **20** | **11** |

> **⚠️ CAUTION: 6 CRITICAL issues must be fixed before any production deployment.**  
> The app currently fails TypeScript compilation (`tsc --noEmit`) and has real production credentials stored in `.env`.

---

## 🗂️ Table of Contents

1. [CRITICAL Issues (Fix First)](#-section-1--critical-issues-fix-immediately)
2. [Security Issues](#-section-2--security-issues)
3. [TypeScript / Type Safety](#-section-3--typescript--type-safety-errors)
4. [Database & Schema](#-section-4--database--schema-issues)
5. [Infrastructure & DevOps](#-section-5--infrastructure--devops-issues)
6. [Performance & Caching](#-section-6--performance--caching)
7. [Code Quality](#-section-7--code-quality)
8. [Testing Gaps](#-section-8--testing-coverage-gaps)
9. [Fix Priority Roadmap](#-section-9--fix-priority-roadmap)

---

## 🚨 Section 1 — CRITICAL Issues (Fix Immediately)

---

### CRIT-01 · Real Production Credentials in `.env`

| Field        | Value         |
| ------------ | ------------- |
| **File**     | `.env`        |
| **Lines**    | 13, 16, 21–22 |
| **Severity** | 🔴 CRITICAL   |

**What's wrong:**
The `.env` file contains live production secrets:

- `JWT_SECRET` — 32-char hex string (also too short; see CRIT-06)
- `DATABASE_URL` — Full Neon PostgreSQL connection string with password `npg_Uze0LoxIBW5b`
- `DATABASE_URL_UNPOOLED` — Same credentials for direct connection
- `WS_INTERNAL_SECRET` — Internal broadcast secret

While `.env` is in `.gitignore`, the file **exists on disk** with all real secrets visible to anyone with filesystem access.

**How to fix:**

```bash
# Step 1: Rotate ALL secrets immediately — assume compromise
# Step 2: Generate a proper JWT secret
openssl rand -base64 48

# Step 3: Rotate Neon DB password via https://console.neon.tech
# Step 4: Use a secrets manager (Doppler, Vercel Env, etc.) in production
# Step 5: Ensure .env is never tracked in git
git rm --cached .env 2>/dev/null || true
```

---

### CRIT-02 · TypeScript Compilation Fails — Prisma Client Not Generated

| Field        | Value                                     |
| ------------ | ----------------------------------------- |
| **File**     | All files importing from `@prisma/client` |
| **Severity** | 🔴 CRITICAL                               |

**What's wrong:**
`npx tsc --noEmit` outputs **26+ errors**. The root cause is that `prisma generate` has not been run — the generated client (`node_modules/.prisma/client/`) does not exist. All imports of Prisma-generated types fail.

**Affected files and errors:**

| File                                        | Line | Error                               |
| ------------------------------------------- | ---- | ----------------------------------- |
| `lib/prisma.ts`                             | 1    | `PrismaClient` not found            |
| `lib/dal/orders.ts`                         | 6    | `OrderStatus` not found             |
| `lib/dal/users.ts`                          | 7    | `User`, `UserRole` not found        |
| `lib/dal/addresses.ts`                      | 5    | `Prisma` not found                  |
| `lib/dal/coupons.ts`                        | 6    | `DiscountType` not found            |
| `lib/dal/restaurants.ts`                    | 2    | `Restaurant` not found              |
| `app/api/orders/route.ts`                   | 23   | `Prisma`, `OrderStatus` not found   |
| `app/api/admin/coupons/route.ts`            | 5    | `DiscountType` not found            |
| `app/api/admin/map-live-analytics/route.ts` | 5    | `OrderStatus`, `UserRole` not found |
| `app/api/admin/payment-reviews/route.ts`    | 6    | `PaymentStatus` not found           |
| `app/api/admin/settlements/route.ts`        | 11   | `VendorSettlementStatus` not found  |
| `app/api/admin/edit-account/route.ts`       | 133  | implicit `any` on `tx` param        |
| `test/dal/orders.test.ts`                   | 11   | `OrderStatus` not found             |

**How to fix:**

```bash
# Run prisma generate to create the typed client
pnpm db:generate
# Verify all TS errors are resolved
pnpm typecheck
```

Add `prisma generate` as a pre-step in your CI/CD pipeline before `tsc` or `next build`.

---

### CRIT-03 · Missing Next.js Route Pages Referenced in Type Validator

| Field        | Value                                                      |
| ------------ | ---------------------------------------------------------- |
| **Files**    | `.next/dev/types/validator.ts`, `.next/types/validator.ts` |
| **Severity** | 🔴 CRITICAL                                                |

**What's wrong:**
The Next.js type validator references two page modules that **do not exist**:

- `app/admin/commercial-contracts/page.js` — directory missing
- `app/admin/system/page.js` — directory missing

These pages are registered in the router type system from a previous build but the files were deleted, causing `TS2307` errors.

**How to fix:**

```bash
# Option A: Delete stale .next cache and rebuild fresh
rm -rf .next && pnpm build

# Option B: Create stub pages if they should exist
mkdir -p app/admin/commercial-contracts app/admin/system
echo "export default function Page() { return null }" > app/admin/commercial-contracts/page.tsx
echo "export default function Page() { return null }" > app/admin/system/page.tsx
```

---

### CRIT-04 · `prisma/schema.prisma` Missing `url` in datasource

| Field        | Value                  |
| ------------ | ---------------------- |
| **File**     | `prisma/schema.prisma` |
| **Lines**    | 5–7                    |
| **Severity** | 🔴 CRITICAL            |

**What's wrong:**

```prisma
datasource db {
  provider = "postgresql"
  // ← NO url field!
}
```

Without `url`, Prisma cannot resolve the connection string from the standard schema. This may work locally via `prisma.config.ts` but is fragile and non-standard.

**How to fix:**

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_UNPOOLED")
}
```

---

### CRIT-05 · `WS_INTERNAL_SECRET` Uses Hardcoded Fallback in Production

| Field        | Value              |
| ------------ | ------------------ |
| **File**     | `lib/ws-server.ts` |
| **Lines**    | 6, 8–12            |
| **Severity** | 🔴 CRITICAL        |

**What's wrong:**

```typescript
// lib/ws-server.ts — line 6
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'crave_internal_ws_secret_default_key'
```

If `WS_INTERNAL_SECRET` is missing in production, the code **silently falls back to a known default**. Anyone who reads this source code can forge authenticated internal broadcast messages. The `ensureInternalSecret()` function only **warns** — it never throws.

**How to fix:**

```typescript
// lib/ws-server.ts — replace lines 6-12
if (!process.env.WS_INTERNAL_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: WS_INTERNAL_SECRET must be set in production. App will not start.')
}
const WS_INTERNAL_SECRET = process.env.WS_INTERNAL_SECRET || 'crave_internal_ws_secret_default_key'
```

---

### CRIT-06 · `JWT_SECRET` Is Too Short

| Field        | Value       |
| ------------ | ----------- |
| **File**     | `.env`      |
| **Line**     | 13          |
| **Severity** | 🔴 CRITICAL |

**What's wrong:**

```
JWT_SECRET="2cfdde6668ea17b19464d58dfa31496e"
```

This is a 32-character hex string = **128 bits of entropy**. NIST recommends at least **256 bits** for HMAC-SHA256. Additionally, this secret was potentially exposed (see CRIT-01) and must be rotated.

**How to fix:**

```bash
# Generate a strong 384-bit secret
openssl rand -base64 48
# Output example: lYT5xKz+8jMpQrNvDsHfWe2bXcA1uGY0nEoLmPiZhRs=
# Set this as JWT_SECRET in your secrets manager
```

After rotating, all existing JWTs will be invalidated — users will need to log in again.

---

## 🔐 Section 2 — Security Issues

---

### SEC-01 · No Next.js Security Headers Configured

| Field        | Value             |
| ------------ | ----------------- |
| **File**     | `next.config.mjs` |
| **Severity** | 🟠 HIGH           |

**What's wrong:**
The app ships **without any HTTP security headers** — no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy.

**How to fix:**

```javascript
// next.config.mjs
const nextConfig = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' wss: https:",
              "font-src 'self' https://fonts.gstatic.com",
            ].join('; '),
          },
        ],
      },
    ]
  },
}
```

---

### SEC-02 · `NODE_ENV !== 'test'` Auth Bypass in Driver + Dispatch Routes

| Field        | Value                                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------------- |
| **Files**    | `app/api/driver/orders/route.ts`, `app/api/dispatch/request/route.ts`, `app/api/dispatch/candidates/route.ts` |
| **Severity** | 🟠 HIGH                                                                                                       |

**What's wrong:**

```typescript
// Multiple routes — dangerous pattern
if (process.env.NODE_ENV !== 'test' && !actor) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
}
```

If `NODE_ENV=test` in any production-like environment, these routes are **publicly accessible without authentication**.

**How to fix:**
Use the `requireAuth()` from `lib/auth-helpers.ts` which handles test mode correctly via `x-test-auth` headers:

```typescript
import { requireAuth } from '@/lib/auth-helpers'

// Replaces the NODE_ENV check
const actor = await requireAuth(request) // throws AuthError(401) if not authenticated
```

---

### SEC-03 · `images.unoptimized: true` Disables Image Security

| Field        | Value             |
| ------------ | ----------------- |
| **File**     | `next.config.mjs` |
| **Lines**    | 3–5               |
| **Severity** | 🟠 HIGH           |

**What's wrong:**
`unoptimized: true` disables Next.js Image Optimization. No remote domain allowlisting means any external URL can be rendered as an image. Also causes larger payloads to clients.

**How to fix:**

```javascript
images: {
  formats: ['image/avif', 'image/webp'],
  remotePatterns: [
    { protocol: 'https', hostname: '**.neon.tech' },
    { protocol: 'https', hostname: '**.amazonaws.com' },
    // Add your actual CDN / storage domains
  ],
},
```

---

### SEC-04 · Two Duplicate Auth Helper Modules

| Field        | Value                                    |
| ------------ | ---------------------------------------- |
| **Files**    | `lib/auth-helpers.ts`, `lib/api-auth.ts` |
| **Severity** | 🟠 HIGH                                  |

**What's wrong:**
Two separate modules implement overlapping auth logic with slightly different cookie names and error types checked. Different API routes use different helpers, causing inconsistent session behavior.

- `lib/auth-helpers.ts` — checks `crave_auth_token` cookie
- `lib/api-auth.ts` — checks `crave_auth_token`, `crave_token`, AND `drop_auth_token` cookies

**How to fix:**
Consolidate into one `lib/auth.ts` module. Migrate all imports. Delete the redundant module.

---

### SEC-05 · Auth Token Stored in `localStorage` (XSS Risk)

| Field        | Value                  |
| ------------ | ---------------------- |
| **File**     | `lib/auth-context.tsx` |
| **Lines**    | 54–65, 131–132         |
| **Severity** | 🟡 MEDIUM              |

**What's wrong:**

```typescript
localStorage.setItem('crave_token', result.token ?? '')
```

JWT stored in `localStorage` is accessible to any XSS payload. The login route already sets an `httpOnly` cookie — the `localStorage` copy is redundant and dangerous.

**How to fix:**
Remove all `localStorage.setItem('crave_token', ...)` calls. Store only the non-sensitive user profile in localStorage for UI state. Rely on the `httpOnly` cookie for API authentication.

---

### SEC-06 · Hardcoded Demo Credentials in Login Route

| Field        | Value                         |
| ------------ | ----------------------------- |
| **File**     | `app/api/auth/login/route.ts` |
| **Lines**    | 47–110                        |
| **Severity** | 🟡 MEDIUM                     |

**What's wrong:**
A block of hardcoded demo accounts (`admin@crave.com`, `vendor@crave.com`, etc.) with password `1234567890` exists in the login route, guarded by `NODE_ENV !== 'production'`. The well-known credentials are visible in source code.

**How to fix:**
Remove the in-code demo user block. Seed demo users into the database using `scripts/seed-local-db.ts`. This keeps the login route clean and demo accounts manageable.

---

### SEC-07 · `UserRole` Type Has Aliases Not in Prisma Schema

| Field        | Value                  |
| ------------ | ---------------------- |
| **File**     | `lib/auth-context.tsx` |
| **Lines**    | 5–14                   |
| **Severity** | 🟡 MEDIUM              |

**What's wrong:**

```typescript
export type UserRole =
  | 'user'
  | 'restaurant_vendor'
  | 'cravexp_store_vendor'
  | 'rider'
  | 'admin'
  | 'customer' // ← alias not in DB enum
  | 'vendor' // ← alias not in DB enum
  | 'driver' // ← alias not in DB enum
```

A JWT with `role: 'rider'` won't match UI code that checks `role === 'driver'`.

**How to fix:**
Remove the aliases. Use only the canonical enum values from `prisma/schema.prisma`.

---

## 🔷 Section 3 — TypeScript / Type Safety Errors

---

### TS-01 · Prisma Client Not Generated (Root Cause of 15+ Errors)

See **CRIT-02** above. Run `pnpm db:generate`.

---

### TS-02 · Implicit `any` Parameters (Compiler Errors)

| File                                        | Line    | Param    | Fix                                |
| ------------------------------------------- | ------- | -------- | ---------------------------------- |
| `app/api/admin/edit-account/route.ts`       | 133     | `tx`     | Type as `Prisma.TransactionClient` |
| `app/api/admin/map-live-analytics/route.ts` | 99, 118 | `r`, `d` | Type based on Prisma return        |
| `lib/dal/addresses.ts`                      | 24      | `addr`   | Define `AddressRow` interface      |
| `lib/dal/orders.ts`                         | 57      | `r`      | Use Prisma generated `Order` type  |

---

### TS-03 · 250+ Uses of `as any` / `: any`

The codebase has **250+ occurrences** of `any` type. Most will resolve after running `prisma generate`. Key remaining spots:

- `lib/dal/orders.ts:27` — `const where: any = {}` → use `Prisma.OrderWhereInput`
- `app/api/auth/login/route.ts:39` — `let profile: any` → define a proper interface
- `lib/prisma.ts:13,19,35` — `return null as any` → acceptable in null-guard pattern but document it

---

### TS-04 · `tsconfig.json` Uses Legacy `target: "ES6"`

| File            | Line | Fix                                              |
| --------------- | ---- | ------------------------------------------------ |
| `tsconfig.json` | 5    | Change `"target": "ES6"` to `"target": "ES2022"` |

Node 20 supports ES2022+. ES6 target causes unnecessary downcompilation.

---

### TS-05 · `JWTPayload` Has Open Index Signature

| File         | Line | Fix                                                     |
| ------------ | ---- | ------------------------------------------------------- |
| `lib/jwt.ts` | 34   | Remove `[key: string]: any` from `JWTPayload` interface |

```typescript
// Before — defeats TypeScript entirely
export interface JWTPayload {
  id: string
  // ...
  [key: string]: any
}

// After — strict, discoverable
export interface JWTPayload {
  id: string
  name: string
  email: string
  role: 'user' | 'restaurant_vendor' | 'cravexp_store_vendor' | 'rider' | 'admin'
  phone?: string
  address?: string
  avatar?: string
  restaurantName?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
  locale?: string
  jti?: string
  restaurantId?: string
}
```

---

## 🗄️ Section 4 — Database & Schema Issues

---

### DB-01 · Prisma Schema Missing `url` in datasource

See **CRIT-04** above.

---

### DB-02 · Duplicate GST Rate Fields on `PaymentConfig`

| File                   | Lines   | Fix                                              |
| ---------------------- | ------- | ------------------------------------------------ |
| `prisma/schema.prisma` | 304–305 | Remove `gst_rate`, migrate to `gst_rate_percent` |
| `lib/dal/payments.ts`  | 47, 108 | Remove dual-write sync logic                     |

**What's wrong:**

```prisma
gst_rate             Decimal? @db.Decimal(5, 2)
gst_rate_percent     Decimal? @db.Decimal(5, 2)  // Alias; use this field in new code
```

Two fields store the same datum. The DAL manually syncs them — any code path that updates one without the other creates a silent inconsistency.

---

### DB-03 · `CommercialModel` and `CommissionModel` Enums Overlap

| File                   | Lines   | Fix                          |
| ---------------------- | ------- | ---------------------------- |
| `prisma/schema.prisma` | 437–447 | Consolidate into single enum |

```prisma
enum CommercialModel { commission  markup  hybrid }
enum CommissionModel { commission  markup  fixed  }
```

`Restaurant` uses both. Semantic distinction is unclear. Leads to confusion in the commercial engine.

---

### DB-04 · `Order.items` is Untyped `Json`

| File                   | Line | Fix                              |
| ---------------------- | ---- | -------------------------------- |
| `prisma/schema.prisma` | 153  | Add Zod validation at write time |

```typescript
// lib/finance/order-item-schema.ts — add this
import { z } from 'zod'
export const OrderItemSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    price: z.number().int().positive(),
    quantity: z.number().int().positive(),
    restaurantId: z.string().optional(),
  })
)
// Validate before writing to DB:
const items = OrderItemSchema.parse(body.items)
```

---

### DB-05 · No Database Migration Files (Using `db push`)

| Directory                           | Fix                                                      |
| ----------------------------------- | -------------------------------------------------------- |
| `prisma/` (no `migrations/` folder) | Switch to `prisma migrate dev` / `prisma migrate deploy` |

`prisma db push` cannot be rolled back and does not maintain a migration history. Any production schema change is irreversible if it causes issues.

```bash
# Create initial migration from current schema
npx prisma migrate dev --name init

# For production deployments
npx prisma migrate deploy
```

---

### DB-06 · Missing Indexes for High-Traffic Queries (Low)

| Table            | Missing Index          | Query Pattern                 |
| ---------------- | ---------------------- | ----------------------------- |
| `orders`         | `(status, created_at)` | Admin order listing by status |
| `ledger_entries` | `(reference_id)`       | Settlement lookups            |

---

## 🏗️ Section 5 — Infrastructure & DevOps Issues

---

### INF-01 · 121 MB `load-test-results.json` on Disk

| File                              | Fix                                            |
| --------------------------------- | ---------------------------------------------- |
| `load-test-results.json` (121 MB) | Verify it's excluded from Docker build context |

The file is in `.gitignore` but physically exists. Ensure `.dockerignore` excludes it:

```
load-test-results.json
load-tests/results/
*.local.json
```

---

### INF-02 · Docker Runner Stage Copies Raw Source `lib/`

| File         | Line | Fix                                         |
| ------------ | ---- | ------------------------------------------- |
| `Dockerfile` | 32   | Remove `COPY --from=builder /app/lib ./lib` |

**What's wrong:**

```dockerfile
COPY --from=builder /app/lib ./lib
```

The runner stage copies raw TypeScript source (`lib/`) into the production image. Next.js compiles all server code into `.next/`. This:

1. Increases image size
2. Exposes source code in production containers
3. Ships `lib/test-auth.ts` to production

---

### INF-03 · WS Backend Healthcheck Uses Write Endpoint

| File                 | Lines | Fix                                       |
| -------------------- | ----- | ----------------------------------------- |
| `docker-compose.yml` | 41–51 | Add dedicated `GET /__ws/health` endpoint |

The backend healthcheck calls `/__ws/broadcast` (a write endpoint) to verify health. Add a proper read-only health endpoint to `ws-server.js`.

---

### INF-04 · `NEXT_PUBLIC_APP_URL` is `localhost` in Production `.env`

| File   | Line | Fix                                        |
| ------ | ---- | ------------------------------------------ |
| `.env` | 10   | Set to real production domain before build |

```env
# ❌ Current (wrong for production)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ✅ Should be
NEXT_PUBLIC_APP_URL=https://crave.yourdomain.com
```

`NEXT_PUBLIC_` vars are baked into the client bundle at build time.

---

### INF-05 · `NEXT_PUBLIC_WS_URL` Not Defined Anywhere

| File                | Fix                                              |
| ------------------- | ------------------------------------------------ |
| `lib/websocket.tsx` | Align variable name with what's actually defined |

`lib/websocket.tsx` reads `process.env.NEXT_PUBLIC_WS_URL` but `.env`, `.env.example`, and Docker Compose only define `NEXT_PUBLIC_WS_HOST` and `NEXT_PUBLIC_WS_PORT`. This mismatch causes WebSocket to silently fall back to a wrong URL.

---

### INF-06 · `server.js` Has Empty Listen Callback, No Error Handler

| File        | Line | Fix                                              |
| ----------- | ---- | ------------------------------------------------ |
| `server.js` | 50   | Add startup log and `server.on('error')` handler |

```javascript
server.listen(PORT, () => {
  console.log(`> Ready on http://localhost:${PORT}`)
})
server.on('error', (err) => {
  console.error('Server failed to start:', err.message)
  process.exit(1)
})
```

---

## ⚡ Section 6 — Performance & Caching

---

### PERF-01 · `cacheDelPattern` Uses Blocking `redis.keys()`

| File           | Lines | Fix                        |
| -------------- | ----- | -------------------------- |
| `lib/cache.ts` | 74–86 | Replace `KEYS` with `SCAN` |

**What's wrong:**

```typescript
const keys = await redis.keys(patternKey) // O(N) blocking — dangerous in production
```

**Fix:**

```typescript
async function cacheDelPattern(pattern: string, namespace?: string): Promise<number> {
  if (!isRedisAvailable() || !redis) return 0
  const patternKey = buildKey(pattern, namespace)
  let cursor = '0'
  let deleted = 0
  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', patternKey, 'COUNT', 100)
    cursor = nextCursor
    if (keys.length > 0) deleted += await redis.del(...keys)
  } while (cursor !== '0')
  return deleted
}
```

---

### PERF-02 · `listOrders()` Called Without Limit in Driver Orders Route

| File                             | Fix                                |
| -------------------------------- | ---------------------------------- |
| `app/api/driver/orders/route.ts` | Add `riderId` and `limit` to query |

**What's wrong:**

```typescript
const allOrders = await listOrders() // Fetches ENTIRE orders table
```

All orders are fetched then filtered in memory. As the table grows, this causes OOM and timeouts.

**Fix:**

```typescript
const orders = await listOrders({
  riderId: driverId,
  status: 'out_for_delivery', // or relevant statuses
  limit: 50,
})
```

---

### PERF-03 · `app/api/orders/route.ts` is 1,350 Lines (God File)

| File                      | Fix                           |
| ------------------------- | ----------------------------- |
| `app/api/orders/route.ts` | Split into focused sub-routes |

A 1,350-line handler increases Next.js cold-start time and makes the codebase untestable. Recommended split:

```
app/api/orders/
  route.ts              (GET list, POST create)
  [id]/route.ts         (GET single)
  [id]/status/route.ts  (PATCH status)
  [id]/payment/route.ts (PATCH payment verification)
```

---

### PERF-04 · All Images Are Unoptimized

See SEC-03. `unoptimized: true` means restaurant food images (typically 200–800KB) are served without compression or format conversion. This directly impacts LCP (Largest Contentful Paint) scores.

---

### PERF-05 · Restaurant Cache TTL Is Only 30 Seconds

| File           | Line | Fix                                           |
| -------------- | ---- | --------------------------------------------- |
| `lib/cache.ts` | 159  | Increase TTL, implement invalidation on write |

```typescript
RESTAURANTS: 120,  // 2 minutes — invalidate on write instead of relying on TTL
```

Implement cache invalidation when restaurant data changes:

```typescript
// After updating a restaurant:
await cacheDel(CacheKeys.restaurants.byId(restaurantId))
await cacheDel(CacheKeys.restaurants.all())
```

---

## 🔧 Section 7 — Code Quality

---

### CQ-01 · Duplicate Auth Modules

See SEC-04. Two auth modules create maintenance overhead.

---

### CQ-02 · 54 Unstructured `console.*` Calls in API Routes

Replace with a structured logger. Example using `pino`:

```typescript
// lib/logger.ts
import pino from 'pino'
export const logger = pino({ level: process.env.LOG_LEVEL || 'info' })
// In API routes:
logger.error({ orderId, error: err.message }, 'Order creation failed')
```

---

### CQ-03 · `require()` Inside Async Function in `lib/ws-server.ts`

| File               | Line | Fix                                                |
| ------------------ | ---- | -------------------------------------------------- |
| `lib/ws-server.ts` | 47   | Move `const http = require('http')` to top of file |

Using `require()` inside an async function is a CJS-in-ESM anti-pattern that forces a synchronous require on every broadcast call that misses Redis.

---

### CQ-04 · `gst_rate` Field Is Documented as Deprecated But Not Removed

| File                   | Lines   | Fix                                     |
| ---------------------- | ------- | --------------------------------------- |
| `prisma/schema.prisma` | 304–305 | Run migration to drop `gst_rate` column |

The comment says "use `gst_rate_percent` in new code" but the deprecated field is still present, causing confusion and dual-write complexity.

---

## 🧪 Section 8 — Testing Coverage Gaps

---

### TEST-01 · No API Integration Tests for Payment / Order Flows

| Directory                                    | Fix                                      |
| -------------------------------------------- | ---------------------------------------- |
| `test/` (no order/payment integration tests) | Add integration tests for critical paths |

The test suite has 20 files but **no integration tests** for:

- `POST /api/orders` — order creation
- `PATCH /api/orders` with UTR — payment verification
- Coupon application
- Vendor settlement calculation

These are the highest-value financial code paths. Add at minimum:

```typescript
// test/api/orders.integration.test.ts
describe('Order Creation', () => {
  it('creates order and returns payment details', async () => { ... })
  it('rejects order with invalid coupon code', async () => { ... })
  it('blocks duplicate UTR submission', async () => { ... })
})
```

---

### TEST-02 · Tests Use `NODE_ENV !== 'test'` Bypass Instead of Mock Auth

Multiple API routes skip authentication when `NODE_ENV === 'test'` instead of using `isTestRequest()` + `x-test-auth` header. This means tests do not exercise the real authentication code path.

---

### TEST-03 · No End-to-End (E2E) Tests

Add Playwright tests for:

- Login → browse restaurants → add to cart → checkout
- Driver acceptance → delivery confirmation
- Admin payment review workflow

---

### TEST-04 · `test/load-test-summary.test.ts` Reads 121 MB File

| File                             | Fix                                        |
| -------------------------------- | ------------------------------------------ |
| `test/load-test-summary.test.ts` | Guard with `fs.existsSync()` or skip in CI |

This test reads `load-test-results.json` which is in `.gitignore` and won't exist in CI. The test will fail silently or with `ENOENT`.

---

## 🗺️ Section 9 — Fix Priority Roadmap

---

### 🔴 Phase 1 — Pre-Deployment Blockers (Fix Today)

| Priority | Issue   | File                   | Action                                                              |
| -------- | ------- | ---------------------- | ------------------------------------------------------------------- |
| 1        | CRIT-01 | `.env`                 | Rotate ALL secrets immediately. Set up proper secret management.    |
| 2        | CRIT-06 | `.env`                 | Generate new 384-bit JWT secret: `openssl rand -base64 48`          |
| 3        | CRIT-04 | `prisma/schema.prisma` | Add `url = env("DATABASE_URL")` to datasource block                 |
| 4        | CRIT-02 | All DAL + API files    | Run `pnpm db:generate` to generate Prisma client                    |
| 5        | CRIT-03 | `.next/` cache         | Delete `.next/` and rebuild fresh; create missing page stubs        |
| 6        | CRIT-05 | `lib/ws-server.ts`     | Throw on missing `WS_INTERNAL_SECRET` in production (not just warn) |

---

### 🟠 Phase 2 — Security Hardening (This Week)

| Priority | Issue  | File                     | Action                                                           |
| -------- | ------ | ------------------------ | ---------------------------------------------------------------- |
| 7        | SEC-01 | `next.config.mjs`        | Add CSP, HSTS, X-Frame-Options, X-Content-Type-Options headers   |
| 8        | SEC-02 | Driver + dispatch routes | Replace `NODE_ENV !== 'test'` auth bypass with `requireAuth()`   |
| 9        | SEC-03 | `next.config.mjs`        | Remove `images.unoptimized: true`; add `remotePatterns`          |
| 10       | SEC-04 | `lib/api-auth.ts`        | Consolidate both auth helpers into single `lib/auth.ts`          |
| 11       | SEC-05 | `lib/auth-context.tsx`   | Remove `localStorage` token storage; use `httpOnly` cookie only  |
| 12       | INF-04 | `.env`                   | Set `NEXT_PUBLIC_APP_URL` to real production domain before build |
| 13       | INF-05 | `lib/websocket.tsx`      | Align WebSocket URL env variable names                           |

---

### 🟡 Phase 3 — Stability & Performance (Next Sprint)

| Priority | Issue   | File                   | Action                                                        |
| -------- | ------- | ---------------------- | ------------------------------------------------------------- |
| 14       | DB-02   | `prisma/schema.prisma` | Deprecate `gst_rate`; run migration; remove dual-write in DAL |
| 15       | DB-05   | `prisma/`              | Switch from `db push` to `prisma migrate deploy`              |
| 16       | PERF-01 | `lib/cache.ts`         | Replace `KEYS` with `SCAN` in `cacheDelPattern`               |
| 17       | PERF-02 | Driver orders route    | Add `riderId` + `limit` filters to `listOrders()` call        |
| 18       | INF-02  | `Dockerfile`           | Remove `COPY --from=builder /app/lib ./lib` from runner stage |
| 19       | INF-03  | `ws-server.js`         | Add `GET /__ws/health` endpoint; update Docker healthcheck    |
| 20       | TS-02   | Multiple files         | Fix all implicit `any` parameters after `prisma generate`     |

---

### 🟢 Phase 4 — Polish & Long-Term (Ongoing)

| Priority | Issue   | Action                                                              |
| -------- | ------- | ------------------------------------------------------------------- |
| 21       | SEC-06  | Remove hardcoded demo users from login route; seed DB instead       |
| 22       | SEC-07  | Remove `'customer'`, `'vendor'`, `'driver'` aliases from `UserRole` |
| 23       | TS-04   | Upgrade `tsconfig.json` `"target"` to `"ES2022"`                    |
| 24       | TS-05   | Remove `[key: string]: any` open index signature from `JWTPayload`  |
| 25       | DB-04   | Add Zod validation for `Order.items` JSON field before writes       |
| 26       | PERF-03 | Refactor 1,350-line `app/api/orders/route.ts` into sub-routes       |
| 27       | PERF-05 | Increase restaurant cache TTL; implement invalidation-on-write      |
| 28       | CQ-02   | Replace 54 `console.*` calls with structured pino logger            |
| 29       | CQ-03   | Move `require('http')` to top-level import in `lib/ws-server.ts`    |
| 30       | TEST-01 | Write API integration tests for order creation and payment flows    |
| 31       | TEST-03 | Add Playwright E2E tests for critical user journeys                 |
| 32       | INF-06  | Add `server.on('error')` handler in `server.js`                     |

---

## ✅ What's Already Production-Ready (No Changes Needed)

| Area                             | Details                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------- |
| ✅ JWT Blacklisting              | JTI-based token revocation with Redis TTL in `lib/jwt.ts`                       |
| ✅ Rate Limiting                 | Redis-backed distributed limiter with in-memory fallback in `lib/rate-limit.ts` |
| ✅ Atomic Dispatch Locks         | Redis `SET NX EX` atomic driver locks in `lib/dispatch/atomic-lock.ts`          |
| ✅ Password Hashing              | `crypto.scrypt` + `timingSafeEqual` constant-time comparison                    |
| ✅ OTP Replay Prevention         | `otp_consumed_at` + unique UTR constraint prevents double-delivery              |
| ✅ Admin Override Audit Log      | Append-only `AdminOverrideLog` model with actor IP tracking                     |
| ✅ Double-Entry Ledger           | `LedgerEntry` with `idempotency_key` prevents duplicate journal postings        |
| ✅ Docker Health Checks          | Frontend `/api/health` health check correctly implemented                       |
| ✅ Redis Graceful Degradation    | Redis unavailability falls back to in-memory without crashing                   |
| ✅ Test Auth Isolation           | `isTestRequest()` only permits test headers in `NODE_ENV === 'test'`            |
| ✅ H3 Geospatial Dispatch        | Geofenced driver assignment with H3 hexagonal grid indexing                     |
| ✅ Financial Snapshot            | `financial_snapshot` JSON on orders — immutable price audit trail               |
| ✅ fail-closed JWT in production | Revoked-token replay blocked when Redis is configured but down                  |

---

## 📁 Full File Reference Index

| File                                        | Issues Found                               |
| ------------------------------------------- | ------------------------------------------ |
| `.env`                                      | CRIT-01, CRIT-06, INF-04                   |
| `prisma/schema.prisma`                      | CRIT-04, DB-02, DB-03, DB-04, DB-05, DB-06 |
| `next.config.mjs`                           | SEC-01, SEC-03, PERF-04                    |
| `Dockerfile`                                | INF-02                                     |
| `docker-compose.yml`                        | INF-03                                     |
| `server.js`                                 | INF-06                                     |
| `lib/jwt.ts`                                | TS-05                                      |
| `lib/ws-server.ts`                          | CRIT-05, CQ-03                             |
| `lib/auth-context.tsx`                      | SEC-05, SEC-07                             |
| `lib/auth-helpers.ts`                       | SEC-04                                     |
| `lib/api-auth.ts`                           | SEC-04                                     |
| `lib/cache.ts`                              | PERF-01, PERF-05                           |
| `lib/prisma.ts`                             | CRIT-02, TS-03                             |
| `lib/redis.ts`                              | ✅ No issues                               |
| `lib/rate-limit.ts`                         | ✅ No issues                               |
| `lib/websocket.tsx`                         | INF-05                                     |
| `lib/dal/orders.ts`                         | CRIT-02, TS-02, TS-03                      |
| `lib/dal/addresses.ts`                      | CRIT-02, TS-02                             |
| `lib/dal/users.ts`                          | CRIT-02                                    |
| `lib/dal/restaurants.ts`                    | CRIT-02                                    |
| `lib/dal/coupons.ts`                        | CRIT-02                                    |
| `lib/dal/payments.ts`                       | DB-02                                      |
| `app/api/auth/login/route.ts`               | SEC-06, TS-03                              |
| `app/api/orders/route.ts`                   | CRIT-02, PERF-03                           |
| `app/api/driver/orders/route.ts`            | SEC-02, PERF-02                            |
| `app/api/driver/location/route.ts`          | ✅ No issues                               |
| `app/api/dispatch/request/route.ts`         | SEC-02                                     |
| `app/api/dispatch/candidates/route.ts`      | SEC-02                                     |
| `app/api/admin/edit-account/route.ts`       | TS-02                                      |
| `app/api/admin/map-live-analytics/route.ts` | CRIT-02, TS-02                             |
| `app/api/admin/coupons/route.ts`            | CRIT-02                                    |
| `app/api/admin/payment-reviews/route.ts`    | CRIT-02                                    |
| `app/api/admin/settlements/route.ts`        | CRIT-02                                    |
| `tsconfig.json`                             | TS-04                                      |
| `load-test-results.json`                    | INF-01 (121 MB artifact on disk)           |

---

_Audit generated by Antigravity Code Audit Engine — October 11, 2026_

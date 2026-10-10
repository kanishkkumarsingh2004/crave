# CRAVE Forensic Audit & Architectural Assessment

## 1. Executive Summary

- **Audit Date:** 2026-10-11
- **Target Repository:** Crave Food Delivery Platform (`kanishkkumarsingh2004/crave`)
- **Technology Stack:** Next.js 16.4.0 (Turbopack, App Router), React 19.3.0, Prisma ORM 7.10.0, PostgreSQL (pg adapter), Redis (ioredis 6.0.0), WebSockets (ws 8.22.0), H3 Spatial Index (h3-js 4.5.0), Tailwind CSS.
- **Baseline Verification:**
  - TypeScript Typecheck (`tsc --noEmit`): **PASSED** (0 errors)
  - Unit & Integration Test Suites (`turbo run test:jest`): **50 passed, 50 total (281 tests)**
  - Production Build (`turbo run build:next`): **PASSED** (85/85 static & dynamic routes compiled)
- **Production Readiness Score:** **5.5 / 10** (Prior to remediation)
- **Verdict:** **NOT PRODUCTION READY**. Multiple high-severity functional, security, and concurrency flaws exist that disrupt real-time tracking, checkout for non-default addresses, password security, admin mutations, and driver assignment.

---

## 2. Architecture & Component Dependency Map

```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                                │
│  Customer Web (App Router)  │  Vendor Console  │  Driver PWA  │ Admin  │
└──────────────────┬────────────────────┬─────────────────┬──────────────┘
                   │ HTTP / JSON        │ WebSocket       │ HTTP / JSON
                   ▼                    ▼                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 APPLICATION SERVER                   │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │   Authentication & RBAC │  │         API Route Controllers       │  │
│  │   (lib/jwt, lib/auth)   │  │   /api/orders, /api/auth, /api/admin│  │
│  └───────────┬─────────────┘  └──────────────────┬──────────────────┘  │
│              │                                   │                     │
│              ▼                                   ▼                     │
│  ┌─────────────────────────┐  ┌─────────────────────────────────────┐  │
│  │  Authoritative Pricing  │  │        H3 Spatial Dispatcher        │  │
│  │  lib/finance/pricing    │  │    (lib/dispatch/h3-dispatch.ts)    │  │
│  └───────────┬─────────────┘  └──────────────────┬──────────────────┘  │
└──────────────┼───────────────────────────────────┼─────────────────────┘
               │                                   │
               ▼                                   ▼
┌────────────────────────────────┐  ┌────────────────────────────────────┐
│      PERSISTENCE (Prisma)      │  │        REALTIME & CACHE            │
│  PostgreSQL (Order, Ledger,    │  │  Redis 7 (Pub/Sub, locks, rate lim)│
│  Restaurant, User, Payout)     │  │  WebSocket Server (ws-server.js)   │
└────────────────────────────────┘  └────────────────────────────────────┘
```

### Component Ownership

1. **Orders & Checkout:** `app/api/orders/route.ts`, `app/user/cart/page.tsx`, `lib/dal/orders.ts`
2. **Pricing & Finance:** `lib/finance/pricing-engine.ts`, `lib/finance/tax-engine.ts`, `lib/finance/money.ts`
3. **Authentication & Authorization:** `lib/jwt.ts`, `lib/auth-helpers.ts`, `lib/api-auth.ts`, `proxy.ts`, `app/api/auth/*`
4. **Driver Dispatch & GPS Tracking:** `lib/dispatch/h3-dispatch.ts`, `lib/dispatch/driver-tracker.ts`, `lib/dispatch/atomic-lock.ts`, `app/api/driver/*`
5. **Real-time Event Distribution:** `ws-server.js`, `lib/ws-server.ts`, `lib/websocket.tsx`
6. **Data Storage & Schema:** `prisma/schema.prisma`, `lib/prisma.ts`, `lib/dal/*`

---

## 3. Confirmed Defects, Vulnerabilities & Risks

### Finding F-01: WebSocket Ownership Gate Rejects All Client Subscriptions

- **Classification:** Confirmed Defect & Usability Failure
- **Severity:** Critical (9.5 / 10)
- **File / Function:** `ws-server.js` (`authorizeChannel`, `wss.on('connection')`), `lib/websocket.tsx` (`useWebSocket`)
- **Root Cause:**
  1. `ws-server.js` mandates an `orderId` for ownership channels (`order_update`, `approval_update`, `driver_location`) and verifies it against an in-memory map `customerOrderSubscriptions`.
  2. The function `registerCustomerOrder` is never invoked upon order creation.
  3. `lib/websocket.tsx` does not accept or send `orderId` during subscription.
  4. `CHANNEL_AUTH_RULES.order_update` allows only `['user', 'admin']`, omitting vendor roles (`restaurant_vendor`, `cravexp_store_vendor`).
- **Impact:** Real-time order tracking at `/user/track/[orderId]` fails with error `Unauthorized to subscribe to order_update`. Tracking UI remains permanently stuck on "Connecting...".
- **Reproduction:**
  1. Connect WebSocket client with valid user token.
  2. Send `{"type":"subscribe","channels":["order_update"]}`.
  3. Server immediately returns error: `Unauthorized to subscribe to order_update`.

---

### Finding F-02: Checkout Blocked for Addresses Lacking Coordinates or Non-Default Addresses

- **Classification:** Confirmed Defect
- **Severity:** High (9.0 / 10)
- **File / Function:** `app/api/orders/route.ts` (`POST`), `app/user/cart/page.tsx` (`handleSaveNewAddress`)
- **Root Cause:**
  1. `app/api/orders/route.ts` resolves customer coordinates solely by querying `prisma.customerAddress.findFirst({ where: { customer_id, is_default: true } })`.
  2. If `latitude` or `longitude` are null, the API aborts with `400: "No valid delivery address found. Please add a default address in your profile."`
  3. When customers create a new address in `app/user/cart/page.tsx`, `latitude` and `longitude` are not provided, defaulting to `null` in PostgreSQL.
  4. If a customer chooses a secondary address in the cart, the server ignores the selected address and checks only `is_default: true`.
- **Impact:** New customers or customers ordering to alternative addresses are unable to place orders.
- **Reproduction:**
  1. Register a new user and add an address without coordinates.
  2. Attempt to POST `/api/orders`.
  3. Server responds with 400 Bad Request.

---

### Finding F-03: Authentication Bypass Backdoor via Test Headers

- **Classification:** Confirmed Security Weakness
- **Severity:** High (8.5 / 10)
- **File / Function:** `lib/auth-helpers.ts` (`getAuthActor`), `lib/test-auth.ts` (`isTestRequest`)
- **Root Cause:**
  `isTestRequest` checks `process.env.NODE_ENV !== 'production'`. In any non-production deployment (staging, preview, dev, Docker containers where `NODE_ENV` is unset), sending `x-test-auth: true` with `x-test-role: admin` grants instantaneous, full administrator privileges.
- **Impact:** Complete authorization bypass in non-production environments; risk of accidental exposure if production configurations omit `NODE_ENV=production`.
- **Reproduction:**
  1. Set `NODE_ENV=development`.
  2. Send request with header `x-test-auth: true`, `x-test-role: admin` to `/api/admin/users`.
  3. Access is granted without authentication.

---

### Finding F-04: Predictable Salt for Password Hashing & Lack of Password Validation

- **Classification:** Confirmed Security Weakness
- **Severity:** High (8.0 / 10)
- **File / Function:** `app/api/auth/login/route.ts`, `app/api/auth/signup/route.ts`, `app/api/admin/create-vendor/route.ts`
- **Root Cause:**
  Passwords are salted with the user's email address: `await scrypt(password, cleanEmail, 64)`. Because email addresses are public, known identifiers, this fails cryptographic salting requirements. Furthermore, `signup/route.ts` has no minimum length or complexity validation.
- **Impact:** Vulnerability to precomputed dictionary and rainbow-table attacks; risk of weak or trivial user passwords.

---

### Finding F-05: Admin Vendor Account Editing Crashes Due to ID Mismatch

- **Classification:** Confirmed Defect
- **Severity:** High (8.0 / 10)
- **File / Function:** `app/api/admin/edit-account/route.ts` (`POST`)
- **Root Cause:**
  When editing a vendor account, the client passes `User.id` (`usr_...`). The route executes:
  `await tx.restaurant.update({ where: { id }, data: restUpdateData })`.
  In the Prisma schema, `Restaurant.id` is the restaurant ID (`vnd_...`), while the user is referenced by `owner_id`. Querying `where: { id: "usr_..." }` throws Prisma error P2025 (`Record to update not found`).
- **Impact:** Admin portal fails to update vendor restaurants, returning 500 error.
- **Reproduction:**
  1. Create a vendor with distinct `User.id` and `Restaurant.id`.
  2. Invoke `POST /api/admin/edit-account` with vendor user ID and updated restaurant name.
  3. Mutation throws P2025 error.

---

### Finding F-06: Unhandled Foreign Key Constraints Break Vendor Deletion

- **Classification:** Confirmed Defect & Integrity Risk
- **Severity:** Medium-High (7.5 / 10)
- **File / Function:** `app/api/admin/delete-vendor/route.ts`, `prisma/schema.prisma`
- **Root Cause:**
  `Order.restaurant_id` and `Order.customer_id` lack `onDelete: Cascade` or `onDelete: SetNull` (defaulting to PostgreSQL `RESTRICT`). Deleting a vendor with past orders throws a foreign key constraint violation. The route catches the exception, logs a warning, and returns `{ success: true }`, falsely confirming deletion while the records remain.
- **Impact:** Data inconsistency and silent operation failure in the administrative backoffice.

---

### Finding F-07: Incomplete Driver Assignment & Unrestricted Dispatch Triggers

- **Classification:** Confirmed Concurrency & Security Weakness
- **Severity:** High (8.0 / 10)
- **File / Function:** `app/api/driver/accept/route.ts`, `app/api/dispatch/request/route.ts`, `app/api/driver/location/route.ts`
- **Root Cause:**
  1. `app/api/driver/accept/route.ts` uses `requireAuthApi` without checking roles, allowing any user to accept delivery trips.
  2. It accepts `driverId` and `driverName` from request body without binding them to session `actor.id`.
  3. `updateOrder` sets `driver_name` but omits `rider_id`. As a result, driver payouts fail at order completion (`createDriverPayout` looks for `rider_id`).
  4. In `app/api/driver/location/route.ts`, regular customers (`role: 'user'`) are permitted to update driver locations.
  5. In `app/api/dispatch/request/route.ts`, any authenticated user can trigger dispatch requests and lock candidate drivers.
- **Impact:** Unauthorized dispatch actions, driver impersonation, denial of service through candidate driver locking, and failed driver compensation.

---

### Finding F-08: Reliance on Public Demo OSRM Server for Real-Time Distance

- **Classification:** Reliability Risk
- **Severity:** Medium-High (7.5 / 10)
- **File / Function:** `lib/distance-pricing.ts` (`fetchOSRMDrivingDistanceKm`)
- **Root Cause:**
  Calculations query `https://router.project-osrm.org/`. The public OSRM demo server has strict rate limits, no SLA, and strictly bans production use.
- **Impact:** IP throttling or timeouts under production volume, causing fluctuating delivery fee fallbacks.

---

### Finding F-09: In-Memory Spatial State Desynchronization Across Cluster Pods

- **Classification:** Maintainability & Scalability Risk
- **Severity:** High (8.0 / 10)
- **File / Function:** `lib/dispatch/driver-tracker.ts`, `lib/dispatch/atomic-lock.ts`
- **Root Cause:**
  `driverSpatialIndex` and `cellToDriverMap` are maintained in Node.js process memory (`new Map()`). Read operations in `findGeofencedCandidateDrivers` inspect local memory. In multi-pod or serverless deployments, drivers connected to Pod A are invisible to dispatch operations on Pod B.
- **Impact:** Dispatch failures ("No eligible candidate drivers found") in horizontally scaled deployments.

---

### Finding F-10: Unbounded Connection Pooling in Prisma Database Adapter

- **Classification:** Reliability Risk
- **Severity:** Medium (7.0 / 10)
- **File / Function:** `lib/prisma.ts`
- **Root Cause:**
  `PrismaPg` is initialized directly with a connection string without configuring an underlying `pg.Pool` limit. Under high concurrency, worker threads can exhaust PostgreSQL's `max_connections`.
- **Impact:** Database connection saturation and `503 Service Unavailable` errors during traffic spikes.

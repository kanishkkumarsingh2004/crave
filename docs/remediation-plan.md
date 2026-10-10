# CRAVE Remediation Plan & Execution Roadmap

## 1. Overview & Prioritized Backlog

This plan specifies the implementation order, dependencies, acceptance criteria, and rollback contingencies for resolving the findings identified in `docs/forensic-audit.md`.

---

## 2. Priority 0 — Critical Fixes (Security, Auth, Financial Correctness)

### P0-1: Test Authentication Header Lockout
- **Target:** `lib/auth-helpers.ts`, `lib/test-auth.ts`, `lib/api-auth.ts`
- **Objective:** Ensure mock test authentication headers can only be processed when explicitly executing inside test runners (`NODE_ENV === 'test'`).
- **Acceptance Criteria:**
  - Requests containing `x-test-auth: true` return `401 Unauthorized` or standard JWT validation in development, staging, and production environments.
  - Jest test suites continue to pass without regression.

### P0-2: Cryptographically Secure Password Hashing & Schema Validation
- **Target:** `app/api/auth/signup/route.ts`, `app/api/auth/login/route.ts`, `app/api/admin/create-vendor/route.ts`
- **Objective:** Replace deterministic email-based salt with random per-user salt while supporting backward-compatible login verification for existing legacy hashes.
- **Acceptance Criteria:**
  - New users are hashed using 16 bytes of cryptographically secure random salt stored in format `${salt}:${hash}`.
  - Existing legacy hashes (`scrypt(password, email)`) continue to verify successfully on login.
  - Sign-up enforces a minimum of 8 characters for passwords.

### P0-3: Resilient Order Checkout Address Resolution & Safe Geocoding
- **Target:** `app/api/orders/route.ts`, `app/user/cart/page.tsx`
- **Objective:** Eliminate hard-blocking 400 errors during order placement when coordinates are missing or when ordering to a non-default address.
- **Acceptance Criteria:**
  - Order endpoint accepts `address_id` and looks up the chosen address first.
  - If coordinates are absent on the address record, the endpoint applies a safe city-center coordinate fallback or standard base delivery radius without rejecting the order.
  - The cart page passes the active `selectedAddressId`.

### P0-4: Admin Vendor Account Editing ID Resolution
- **Target:** `app/api/admin/edit-account/route.ts`
- **Objective:** Fix Prisma P2025 crash when editing vendor accounts by resolving the restaurant via `owner_id`.
- **Acceptance Criteria:**
  - Admin can update vendor restaurant details (name, cuisine, commission rate, address) without error.
  - Updates succeed whether the ID provided is the user ID or the restaurant ID.

### P0-5: Driver Assignment Integrity & Authorization Enforcement
- **Target:** `app/api/driver/accept/route.ts`, `app/api/driver/location/route.ts`, `app/api/dispatch/request/route.ts`
- **Objective:** Require proper roles, bind driver assignments to authenticated sessions, and ensure `rider_id` is set on the order.
- **Acceptance Criteria:**
  - Only authenticated riders/drivers can accept orders or publish driver GPS coordinates.
  - `driverId` is strictly derived from `actor.id`.
  - Accepting an order sets `rider_id: actor.id` in the database, enabling proper completion payouts.
  - Dispatch triggers require vendor or admin privileges.

---

## 3. Priority 1 — Reliability & Real-Time Fixes

### P1-1: WebSocket Authorization & Client Tracking Synchronization
- **Target:** `ws-server.js`, `lib/websocket.tsx`, `lib/ws-server.ts`, `app/api/orders/route.ts`
- **Objective:** Enable clients to subscribe to `order_update` and `driver_location` with proper `orderId` validation and vendor role permissions.
- **Acceptance Criteria:**
  - `useWebSocket` hook in `lib/websocket.tsx` accepts and passes `orderId` in the subscribe payload.
  - Order creation in `app/api/orders/route.ts` notifies the WebSocket server via internal channel `__internal_register_order`.
  - `CHANNEL_AUTH_RULES.order_update` permits vendor roles (`restaurant_vendor`, `cravexp_store_vendor`).
  - `/user/track/[orderId]` successfully receives real-time status and driver coordinates.

### P1-2: Safe Vendor Deletion with Foreign Key Handling
- **Target:** `app/api/admin/delete-vendor/route.ts`
- **Objective:** Handle existing orders gracefully during vendor removal without database constraint failures.
- **Acceptance Criteria:**
  - Deletion wraps associated records safely or marks the restaurant as deactivated/closed.
  - The admin receives a truthful response regarding the deletion outcome.

### P1-3: Prisma Connection Pool Bounds
- **Target:** `lib/prisma.ts`
- **Objective:** Configure connection pool ceiling on `PrismaPg` to prevent database connection exhaustion under load.
- **Acceptance Criteria:**
  - `PrismaPg` uses a configured `pg.Pool` with bounded connections (`max: 20`, `idleTimeoutMillis: 30000`).

---

## 4. Dependencies & Implementation Order

```
[Phase 1: P0 Security & Auth]
  ├── P0-1: Test Header Auth Lockout
  ├── P0-2: Random Salt Password Hashing
  └── Regression Tests for Auth

[Phase 2: P0 Orders & Admin]
  ├── P0-3: Address Resolution & Checkout Fix
  ├── P0-4: Admin Vendor Account ID Resolution
  ├── P0-5: Driver Assignment Integrity
  └── Regression Tests for Orders, Driver, & Admin

[Phase 3: P1 Real-Time & Infra]
  ├── P1-1: WebSocket Ownership & Client Hook Fix
  ├── P1-2: Safe Vendor Deletion Handling
  ├── P1-3: Prisma Connection Pooling
  └── WebSocket & Integration Tests

[Phase 4: Verification & Docs]
  ├── Full Test Suite & Build Verification
  └── Deliverable Documentation (security-review, financial-integrity, deployment-and-recovery)
```

---

## 5. Acceptance & Verification Gates

1. **TypeScript Typecheck:** `npx tsc --noEmit` must pass with 0 errors.
2. **Jest Test Suite:** All existing tests plus new regression tests must pass cleanly.
3. **Turbopack Build:** `npm run build` must complete successfully for all 85 routes.
4. **Zero Secret Exposure:** Git diff must contain no credentials or test tokens.

# CRAVE — Security Review & Threat Analysis

**Date:** October 2026  
**Auditor:** Principal Security & Software Systems Engineer  
**Classification:** Internal Production Engineering  
**Scope:** Authentication, Authorization, Session Lifecycle, Data Isolation, WebSocket Security, and Privilege Escalation Vectors

---

## 1. Executive Summary

A comprehensive source-code forensic security review was executed across Crave's Next.js 16 full-stack architecture, API routes (`/api/*`), Next.js proxy middleware, and standalone WebSocket cluster (`ws-server.js`).

The system incorporates robust foundational primitives (argon2 password hashing, dual jwt/jose signature verification, role-based database schemas, and structured error responses). However, our audit revealed critical authentication backdoors, missing authorization gates on operational endpoints, unconstrained test bypasses, and state-synchronization vulnerabilities across WebSocket channels.

This review details the threat scenarios identified, the technical fixes implemented in the remediation cycle, and the remaining residual risks requiring business or infrastructure decisions.

---

## 2. Authentication & Authorization Architecture

### 2.1 Identity Hierarchy & Role Model

Crave defines five primary roles stored on the `User` model:

- `customer`: End-consumer placing food/commerce orders.
- `rider` / `driver`: Delivery partners updating GPS, accepting order runs, and fulfilling deliveries.
- `restaurant_vendor`: Merchant managing food items, stock, kitchen queue, and menu pricing.
- `cravexp_store_vendor`: Merchant managing instant commerce grocery items.
- `admin`: Platform operator managing platform accounts, drivers, settlements, and live ops.

### 2.2 Token Lifecycle & Verification

- **Dual Verification Engine (`lib/auth-helpers.ts` & `lib/jwt.ts`):** Employs standard HS256 JWT tokens. Uses `jose` for Edge Runtime compatibility in middleware and `jsonwebtoken` for Node.js API routes.
- **Cookie Mechanics:** Tokens are securely dispatched using HTTP-only, `SameSite=Lax` cookies named `crave_token`, with fallback Bearer token extraction in `Authorization` headers.
- **Session Resolution:** The unified `getAuthActor(req)` helper inspects headers and cookies, validating JWT claims, expiration, and actor identity against the persistence layer.

---

## 3. Threat Scenarios & Forensic Findings

### Threat Scenario 1: Non-Production Test Auth Bypass in Live Environments (Critical)

- **Vector:** The test bypass header `x-test-auth: true` permitted arbitrary caller identity injection with custom `x-test-role` and `x-test-user-id`.
- **Root Cause:** In `lib/test-auth.ts`, `isTestRequest()` allowed headers whenever `NODE_ENV !== 'production'`. In staging, preview, or improperly configured deployments, this allowed complete authentication bypass.
- **Remediation Implemented:** Modified `lib/test-auth.ts` and `lib/auth-helpers.ts` to strictly require `process.env.NODE_ENV === 'test'`. In `development`, `staging`, and `production`, all `x-test-*` headers are disregarded.

### Threat Scenario 2: Weak Account Credentials & Credential Stuffing (High)

- **Vector:** `app/api/auth/signup/route.ts` permitted arbitrary single-character passwords during registration without length or entropy bounds.
- **Root Cause:** Missing schema validation before invoking hashing functions.
- **Remediation Implemented:** Enforced minimum 8-character password constraint in `signup/route.ts`. Returns HTTP 400 Bad Request if criteria are not satisfied.

### Threat Scenario 3: Broken Object Level Authorization (BOLA) in Driver Dispatch (High)

- **Vector:** `app/api/driver/accept/route.ts` allowed unauthenticated or customer-role users to accept dispatch offers and bind arbitrary `driverId` payloads.
- **Root Cause:** Absence of role verification on driver assignment and blind acceptance of client-supplied `driverId`.
- **Remediation Implemented:**
  1. Mandated role validation: caller must be `rider`, `driver`, or `admin`.
  2. Bounded driver identity strictly to the authenticated `actor.id`.
  3. Ensured atomic updates to `Order.rider_id` in database and triggered real-time dispatch synchronization.

### Threat Scenario 4: Driver GPS Coordinate Spoofing & Stalking (High)

- **Vector:** `app/api/driver/location/route.ts` allowed any authenticated user (including customers) to push arbitrary GPS locations to the driver tracker.
- **Root Cause:** Missing role authorization on `/api/driver/location`.
- **Remediation Implemented:** Restricted `/api/driver/location` strictly to users possessing `rider`, `driver`, or `admin` roles. Rejected customer location injection with HTTP 403.

### Threat Scenario 5: Unauthorized Driver Dispatch Triggers (Medium-High)

- **Vector:** `app/api/dispatch/request/route.ts` accepted unauthenticated or customer-originated dispatch triggers, enabling denial of service and dispatch queue starvation.
- **Root Cause:** Missing authentication guard on the dispatch request API.
- **Remediation Implemented:** Enforced authentication and authorized only `admin` and vendor roles (`restaurant_vendor`, `cravexp_store_vendor`).

### Threat Scenario 6: Unauthorized WebSocket Subscription & Broadcast Eavesdropping (High)

- **Vector:** `ws-server.js` lacked permissions for vendor roles to access `order_update` channels and permitted unbounded room subscriptions.
- **Root Cause:** Strict channel rules omitted merchant roles; room ownership validation did not support dynamic session verification for order tracking.
- **Remediation Implemented:**
  1. Updated `CHANNEL_AUTH_RULES` to allow vendor roles (`restaurant_vendor`, `cravexp_store_vendor`, `rider`) on `order_update` and `approval_update`.
  2. Implemented dynamic order ownership mapping upon subscription request validation.
  3. Added `orderId` payload parameter to client subscription requests in `lib/websocket.tsx`.

---

## 4. Summary of Hardened Components

| Component              | Target File                               | Security Protection Added                                                  |
| :--------------------- | :---------------------------------------- | :------------------------------------------------------------------------- |
| **Test Auth Guard**    | `lib/test-auth.ts`, `lib/auth-helpers.ts` | Locked bypass strictly to `NODE_ENV === 'test'`.                           |
| **Signup Validation**  | `app/api/auth/signup/route.ts`            | Enforced password minimum length `>= 8`.                                   |
| **Login Verification** | `app/api/auth/login/route.ts`             | Dual password verification: `${salt}:${hash}` and legacy format.           |
| **Driver Accept**      | `app/api/driver/accept/route.ts`          | Role verification (`rider`/`driver`), identity bound to session actor.     |
| **Driver Location**    | `app/api/driver/location/route.ts`        | Role verification (`rider`/`driver`/`admin`), rejects customer spoofing.   |
| **Dispatch Request**   | `app/api/dispatch/request/route.ts`       | Role verification (admin/vendor), rejects unauthorized triggers.           |
| **WebSocket Server**   | `ws-server.js`                            | Vendor channel authorization, dynamic order subscription registration.     |
| **Admin Vendor Ops**   | `app/api/admin/delete-vendor/route.ts`    | Referential integrity & order retention checks to prevent cascade crashes. |

---

## 5. Remaining Risks & Recommendations

1. **CSRF Protection on SameSite Cookies:** While `SameSite=Lax` provides baseline protection against cross-origin GET requests, state-changing POST requests originating from top-level navigations or cross-site subrequests should be fortified with Double Submit Cookie or custom CSRF tokens (`X-CSRF-Token`).
2. **API Rate Limiting:** While an in-memory sliding window rate limiter exists in `lib/rate-limiter.ts`, distributed deployments across multiple containers require Redis-backed distributed rate limiting (e.g., Upstash or Redis Token Bucket) to prevent brute-force attacks across clustered instances.
3. **Session Revocation & Blacklisting:** JWT tokens are stateless. To facilitate instantaneous revocation upon password change or account compromise, implement a Redis-backed token revocation list (JTI check).

# Crave API Review Report

**Date:** 12 October 2026  
**Scope:** All Next.js route handlers under `app/api/`, supporting libraries, and the 12 Oct 2026 k6 smoke run against `http://localhost:3000`  
**Verdict:** Public read APIs are healthy at low load. The smoke **gate failed** because setup authentication failed for three of four roles — **not** because of latency. Checkout, dispatch, and payment APIs were **not exercised**. Several handlers have clear performance and maintainability issues before real load.

---

## 1. Executive status

| Area                                           | Status                 | Evidence                                                             |
| ---------------------------------------------- | ---------------------- | -------------------------------------------------------------------- |
| Public GET (`/api/health`, `/api/restaurants`) | **Healthy**            | `rest_errors = 0`; checks 240/240; p95 **186 ms**                    |
| Latency at 1–2 VUs                             | **Healthy**            | avg **126 ms**, max **599 ms**, well under `p(95)<3000`              |
| Smoke threshold `http_req_failed < 1%`         | **Failed**             | 3/244 = **1.23%** → k6 exit **99**                                   |
| Auth under staging/Docker                      | **Broken for tests**   | `auth_errors` rate **0.75** (3 of 4 setup logins)                    |
| Order create                                   | **Not measured**       | `total_orders_created = 0`; smoke scenario never POSTs `/api/orders` |
| WebSocket                                      | **Not measured**       | `wsConnectAvg = N/A`; smoke does not open WS                         |
| Checkout / dispatch / UTR                      | **Code-reviewed only** | Hot path is large, sequential, and DB-heavy                          |

Overall: **conditional pass on performance of public reads**, **fail on smoke gate**, **incomplete coverage of the money path**.

---

## 2. Smoke test reconstruction (12 Oct 2026)

Source: `summary.json` + `load-tests/comprehensive-load-test.js` (`TEST_TYPE=smoke`).

| Metric          | Value                    | Gate                         |
| --------------- | ------------------------ | ---------------------------- |
| Duration        | 2m 00.8s                 | —                            |
| VUs             | 1 → 2 → 1 → 0 (30s each) | —                            |
| Total HTTP      | 244                      | —                            |
| Failed HTTP     | 3 (1.23%)                | `rate<0.01` **FAIL**         |
| Throughput      | 2.02 req/s               | —                            |
| avg / p95 / max | 126 / 186 / 599 ms       | `p(95)<3000` **PASS**        |
| Checks          | 240 passed, 0 failed     | `rate>0.99` **PASS**         |
| `rest_errors`   | 0                        | public APIs returned 200     |
| `auth_errors`   | 0.75                     | 3 of 4 role logins failed    |
| Orders created  | 0                        | smoke does not create orders |

### Why the numbers add up

Smoke `setup()` logs in **four** roles (`admin`, `user`, `vendor`, `rider`) against `POST /api/auth/login`.

Each of **120** iterations then calls:

1. `GET /api/health`
2. `GET /api/restaurants`

= **240** iteration requests + **4** setup logins = **244**.

The three failures are almost certainly **three 401s on login**, not health or restaurant timeouts.

### Root cause of the 401s

Load-test credentials (`load-tests/comprehensive-load-test.js`):

```
admin@crave.com / 1234567890
user@crave.com  / 1234567890
vendor@crave.com / 1234567890
rider@crave.com / 1234567890
```

What the repo actually seeds:

| Script                      | File                            | Users          | Password                              |
| --------------------------- | ------------------------------- | -------------- | ------------------------------------- |
| `pnpm db:seed` / `db:admin` | `scripts/seed-local-db.ts`      | **admin only** | `1234567890`                          |
| `pnpm db:seed:full`         | `scripts/seed-complete-data.ts` | all five roles | **`Password123!`** (not `1234567890`) |

Demo login that accepts `1234567890` without a DB row lives in `app/api/auth/login/route.ts` and is **disabled when `NODE_ENV === 'production'`** (Docker frontend).

Likely local staging: only admin exists with `1234567890` → admin login OK, other three 401 → `auth_errors = 0.75`. Matches the run.

### Load-test client bugs (false negatives later)

`runSmokeTests` in `load-tests/comprehensive-load-test.js`:

- Treats `GET /api/restaurants` body as a **raw array**. The API returns `{ success: true, restaurants: [...] }` (`app/api/restaurants/route.ts`). Menu fetch is **never** called.
- Hits non-existent paths in other scenarios: `/api/auth/register`, `/api/orders/:id`, `/api/vendor/*`, `/api/rider/*`, `/api/admin/restaurants`. Real order fetch is `GET /api/orders?orderId=`.
- `checkout-load-test.js` calls `GET /api/admin/coupons` with a **vendor** token; that GET is currently public, but POST/PATCH require `admin` or `restaurant_vendor` (`app/api/admin/coupons/route.ts`).

Fix the seed/password mismatch and the JSON shape **before** treating another k6 run as an API performance result.

---

## 3. Inventory — 41 route files

Handlers live only as `app/api/**/route.ts`. There is no `/api/orders/[id]` dynamic segment.

### Auth

| Method | Path                   | File                               | Auth   | Rate limit              | Status                                                                 |
| ------ | ---------------------- | ---------------------------------- | ------ | ----------------------- | ---------------------------------------------------------------------- |
| POST   | `/api/auth/login`      | `app/api/auth/login/route.ts`      | public | `AUTH_LOGIN` 5 / 5 min  | **Fragile** — demo bypass, dual hash formats, extra Gmail/Crave lookup |
| POST   | `/api/auth/signup`     | `app/api/auth/signup/route.ts`     | public | `AUTH_SIGNUP` 3 / 5 min | OK                                                                     |
| GET    | `/api/auth/me`         | `app/api/auth/me/route.ts`         | JWT    | none                    | Extra restaurant lookup for vendors                                    |
| POST   | `/api/auth/logout`     | `app/api/auth/logout/route.ts`     | cookie | none                    | Redis JTI blacklist `lib/jwt.ts`                                       |
| POST   | `/api/auth/logout-all` | `app/api/auth/logout-all/route.ts` | cookie | none                    | User-level blacklist                                                   |

Page routes also gated by `proxy.ts` (cookie JWT).

### Catalog / public

| Method                | Path                    | File                                | Notes                                 | Perf                                                                                      |
| --------------------- | ----------------------- | ----------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- |
| GET                   | `/api/health`           | `app/api/health/route.ts`           | `SELECT 1` + Redis probe every call   | Fine at 2 rps; will dominate if probed too often                                          |
| GET/POST/PATCH        | `/api/restaurants`      | `app/api/restaurants/route.ts`      | GET uses `listRestaurants()`          | **Hot:** `include: { menu_items: true }`, cap 50, Redis cache in `lib/dal/restaurants.ts` |
| GET/POST/PATCH/DELETE | `/api/menu-items`       | `app/api/menu-items/route.ts`       | GET requires `restaurantId`           | OK; mutations broadcast WS                                                                |
| GET/POST              | `/api/cravexp/catalog`  | `app/api/cravexp/catalog/route.ts`  | **upsert store on every GET**         | **Hot**                                                                                   |
| GET/POST              | `/api/calculator`       | `app/api/calculator/route.ts`       | Preview only; dual legacy + canonical | OK if not called per keystroke without debounce                                           |
| GET                   | `/api/admin/calculator` | `app/api/admin/calculator/route.ts` | Admin playground                      | —                                                                                         |
| GET/POST              | `/api/distance-pricing` | `app/api/distance-pricing/route.ts` | Haversine + 1.30×                     | CPU cheap                                                                                 |
| GET                   | `/api/geocode/search`   | `app/api/geocode/search/route.ts`   | Nominatim, 4.5s abort                 | External latency / rate limits                                                            |
| GET                   | `/api/geocode/reverse`  | `app/api/geocode/reverse/route.ts`  | Nominatim                             | Same                                                                                      |
| GET/POST              | `/api/payment-config`   | `app/api/payment-config/route.ts`   | GET used at checkout; POST admin      | Cache if hot                                                                              |

### Orders / money

| Method    | Path                         | File                                     | Auth                           | Notes                                |
| --------- | ---------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------ |
| GET       | `/api/orders`                | `app/api/orders/route.ts` (~1349 lines)  | JWT; scoped by role            | `?orderId=` not a nested route       |
| POST      | `/api/orders`                | same                                     | `user` + `ORDER_CREATE` 10/min | Canonical snapshot; N+1 menu fetches |
| PATCH     | `/api/orders`                | same                                     | JWT + state machine            | Kitchen / UTR / OTP                  |
| GET/PATCH | `/api/admin/payment-reviews` | `app/api/admin/payment-reviews/route.ts` | admin                          | PATCH posts ledger `lib/finance`     |
| GET/POST  | `/api/admin/settlements`     | `app/api/admin/settlements/route.ts`     | admin                          | Vendor payouts                       |

### Dispatch / driver

| Method          | Path                       | File                                   | Notes                                        |
| --------------- | -------------------------- | -------------------------------------- | -------------------------------------------- |
| POST            | `/api/dispatch/request`    | `app/api/dispatch/request/route.ts`    | Vendor/admin; H3 k-ring + Redis locks        |
| GET             | `/api/dispatch/candidates` | `app/api/dispatch/candidates/route.ts` | Read-only candidate search                   |
| POST            | `/api/driver/accept`       | `app/api/driver/accept/route.ts`       | Atomic lock + order update + WS              |
| POST            | `/api/driver/location`     | `app/api/driver/location/route.ts`     | Redis H3 index + WS broadcast **every ping** |
| POST            | `/api/driver/status`       | `app/api/driver/status/route.ts`       | Online/offline                               |
| GET             | `/api/driver/orders`       | `app/api/driver/orders/route.ts`       | Assigned orders                              |
| GET/PUT         | `/api/driver/profile`      | `app/api/driver/profile/route.ts`      | —                                            |
| GET/POST        | `/api/driver/payouts`      | `app/api/driver/payouts/route.ts`      | —                                            |
| GET             | `/api/driver/incentives`   | `app/api/driver/incentives/route.ts`   | —                                            |
| GET/POST/DELETE | `/api/driver/upi`          | `app/api/driver/upi/route.ts`          | —                                            |
| GET             | `/api/drivers`             | `app/api/drivers/route.ts`             | Admin list                                   |

### User / admin

| Method                    | Path                            | File                                        |
| ------------------------- | ------------------------------- | ------------------------------------------- |
| GET/POST/PUT/PATCH/DELETE | `/api/user/addresses`           | `app/api/user/addresses/route.ts`           |
| PATCH                     | `/api/user/update`              | `app/api/user/update/route.ts`              |
| POST                      | `/api/user/change-password`     | `app/api/user/change-password/route.ts`     |
| GET/PATCH                 | `/api/user/language`            | `app/api/user/language/route.ts`            |
| GET                       | `/api/admin/stats`              | `app/api/admin/stats/route.ts`              |
| GET                       | `/api/admin/users`              | `app/api/admin/users/route.ts`              |
| GET                       | `/api/admin/map-live-analytics` | `app/api/admin/map-live-analytics/route.ts` |
| GET/POST/PATCH/DELETE     | `/api/admin/coupons`            | `app/api/admin/coupons/route.ts`            |
| POST                      | `/api/admin/create-vendor`      | `app/api/admin/create-vendor/route.ts`      |
| POST                      | `/api/admin/create-driver`      | `app/api/admin/create-driver/route.ts`      |
| POST                      | `/api/admin/delete-vendor`      | `app/api/admin/delete-vendor/route.ts`      |
| POST                      | `/api/admin/edit-account`       | `app/api/admin/edit-account/route.ts`       |

Realtime fan-out: `lib/ws-server.ts` → Redis `crave:ws:events` or `POST /__ws/broadcast` on `ws-server.js`. JWT verify on every authenticated call: `lib/jwt.ts` (Redis blacklist GET).

---

## 4. Optimized product flows (with file locations)

These are the **intended** call graphs. Bold steps are the ones the smoke test actually hit.

### 4.1 Customer checkout (money path)

```mermaid
sequenceDiagram
  participant C as Client
  participant API as Next route handlers
  participant DAL as lib/dal + lib/finance
  participant DB as Postgres
  participant R as Redis
  participant WS as ws-server.js

  C->>API: POST /api/auth/login
  API->>DAL: findUserByEmail (lib/dal/users.ts)
  API->>R: rate limit AUTH_LOGIN
  API-->>C: JWT cookie + body.token

  C->>API: GET /api/restaurants
  API->>DAL: listRestaurants (cached)
  C->>API: GET /api/menu-items?restaurantId=
  C->>API: POST /api/calculator (preview only)
  API->>DAL: getActivePaymentConfig + calculateOrderPrice

  C->>API: GET /api/user/addresses
  C->>API: POST /api/orders
  Note over API: requireRole user; N+1 findMenuItemById today
  API->>DAL: calculateOrderPrice → financial_snapshot
  API->>DB: insert Order
  API->>WS: broadcast order_update

  C->>API: PATCH /api/orders (utr_ref, payment_submitted)
  Note over API: Admin later PATCH /api/admin/payment-reviews
  API->>DAL: persistJournalTransaction (lib/finance/ledger-service.ts)
```

| Step                | File                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| Login               | `app/api/auth/login/route.ts`, `lib/dal/users.ts`, `lib/jwt.ts`, `lib/rate-limit.ts`                          |
| Catalog             | `app/api/restaurants/route.ts`, `lib/dal/restaurants.ts`, `lib/cache.ts`                                      |
| Menu                | `app/api/menu-items/route.ts`                                                                                 |
| Quote               | `app/api/calculator/route.ts`, `lib/finance/pricing-engine.ts`, `lib/finance/tax-engine.ts`                   |
| Address             | `app/api/user/addresses/route.ts`, `lib/dal/addresses.ts`                                                     |
| Place order         | `app/api/orders/route.ts` `POST`, `lib/dal/menu-items.ts`, `lib/dal/coupons.ts`, `lib/order-state-machine.ts` |
| UTR / kitchen / OTP | `app/api/orders/route.ts` `PATCH`                                                                             |
| Verify pay + ledger | `app/api/admin/payment-reviews/route.ts`, `lib/finance/ledger-service.ts`                                     |
| Live UI             | `lib/websocket.tsx`, `ws-server.js`                                                                           |

**Checkout optimizations (code, not yet done):**

1. Replace the per-item `findMenuItemById` loop in `POST /api/orders` with one `findMany({ where: { id: { in: ids } } })`.
2. Stop embedding full `menu_items` on restaurant list; explore should use `/api/menu-items`.
3. Persist `financial_snapshot` once; never re-run `calculateOrderPrice` on settlement (already the intended contract in `lib/finance/pricing-engine.ts`).
4. Require `x-idempotency-key` from the client so retries do not create duplicates under load.
5. Debounce `/api/calculator` on the cart UI; it is preview-only.

### 4.2 Vendor kitchen

```
PATCH /api/orders  (sent_to_vendor → preparing → packing → ready_for_pickup)
  app/api/orders/route.ts
  lib/order-state-machine.ts  (VALID_TRANSITIONS)
  lib/ws-server.ts            broadcast order_update
```

Menu edits: `app/api/menu-items/route.ts` → broadcast `menu_items`.

Dispatch after ready: `POST /api/dispatch/request` → `lib/dispatch/h3-dispatch.ts` + `lib/dispatch/atomic-lock.ts`.

### 4.3 Driver trip

```
POST /api/driver/status          online
POST /api/driver/location        GPS → lib/dispatch/driver-tracker.ts (H3 Redis)
POST /api/driver/accept          lock + rider_id on order
POST /api/driver/location        every ~5s (GPS_CONFIG.UPDATE_INTERVAL_MS)
PATCH /api/orders                picked_up → out_for_delivery → delivered + OTP
GET  /api/driver/payouts
```

**Driver optimizations:** coalesce HTTP location posts to ≥5s (tracker already ignores <20 m); do not broadcast `driver_location` to the whole admin map on every ping without the WS GPS coalesce in `ws-server.js` (already 1s). Avoid writing `DriverLocationHistory` on every request if history is batched (check `lib/dispatch/driver-tracker.ts`).

### 4.4 Admin command center

```
GET /api/admin/stats                 lib/cache AdminStatsCache (daily TTL)
GET /api/admin/payment-reviews
PATCH /api/admin/payment-reviews     verify UTR → ledger
GET /api/admin/map-live-analytics    H3 grid lib/h3-grid.ts
POST /api/admin/settlements
```

**Stats hotspot:** `app/api/admin/stats/route.ts` runs `listOrders()` (up to 50 rows but still heavy JSON) plus three `listUsersByRole` and full restaurant list, then caches **for the calendar day**. First request after midnight is expensive; cache key should include a shorter TTL (60–120s) for “live” KPIs.

---

## 5. Performance findings (code)

### P0 — will fail the next real load test

| ID   | Issue                                             | Location                                                 | Fix                                                                                          |
| ---- | ------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| P0.1 | Smoke/auth seed/password mismatch                 | `scripts/seed-*.ts`, `load-tests/*.js`, login demo gate  | Align passwords; seed all roles before k6; or use `NODE_ENV=development` only for demo login |
| P0.2 | `POST /api/orders` N+1 menu reads                 | `app/api/orders/route.ts` (~362–390)                     | Batch `findMany` by IDs                                                                      |
| P0.3 | Restaurant list hydrates every menu row           | `lib/dal/restaurants.ts` `include: { menu_items: true }` | Select store fields only; menus via `/api/menu-items`                                        |
| P0.4 | CraveXP catalog upserts on every GET              | `app/api/cravexp/catalog/route.ts` `ensureStore()`       | Upsert once at seed; GET is select-only                                                      |
| P0.5 | `orders/route.ts` is ~1349 lines (GET+POST+PATCH) | `app/api/orders/route.ts`                                | Split into `get.ts` / `create.ts` / `patch.ts` modules                                       |

### P1 — cost and correctness under growth

| ID   | Issue                                                                                                                                                           | Location                                                 |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P1.1 | JWT verify hits Redis twice (JTI + user blacklist) on **every** authenticated request                                                                           | `lib/jwt.ts`                                             |
| P1.2 | Health `SELECT 1` on every probe; 120 smoke iterations = 120 extra DB round-trips                                                                               | `app/api/health/route.ts`                                |
| P1.3 | Admin stats serializes settlements + restaurants + orders in one payload                                                                                        | `app/api/admin/stats/route.ts`                           |
| P1.4 | Coupons **GET is unauthenticated**                                                                                                                              | `app/api/admin/coupons/route.ts`                         |
| P1.5 | Calculator POST accepts client `subtotal` / `distanceKm` for preview (OK) but must never be copied into `POST /api/orders` (already ignored — keep it that way) | `app/api/calculator/route.ts`, `app/api/orders/route.ts` |
| P1.6 | Geocode depends on public Nominatim (no cache, 4.5s timeout)                                                                                                    | `app/api/geocode/*`                                      |
| P1.7 | Rate limits missing on most GETs and on `POST /api/driver/location` (GPS flood)                                                                                 | `lib/rate-limit.ts` usage                                |
| P1.8 | Duplicate auth helpers (`getActor` copied in restaurants/menu-items vs `lib/api-auth.ts`)                                                                       | several routes                                           |
| P1.9 | `findRestaurantById` includes `owner` (password_hash risk if serialized)                                                                                        | `lib/dal/restaurants.ts` — confirm responses strip hash  |

### P2 — hardening already present (keep)

- Server-owned prices and `financial_snapshot` (`app/api/orders/route.ts`, `lib/finance/pricing-engine.ts`)
- Coupon two-phase Redis INCR (`lib/dal/coupons.ts`)
- Order state machine (`lib/order-state-machine.ts`)
- Unique UTR (`prisma/schema.prisma` `PaymentReview.utr_ref`)
- H3 dispatch + Redis offer locks (`lib/dispatch/*`)
- WS ownership checks (`ws-server.js` `verifyOrderOwnership`)
- Login rate limit 5 / 5 min (will also **block** k6 if setup is retried from one IP)

---

## 6. Recommended optimized request sequence (for the next k6)

Use this instead of phantom `/api/vendor/*` and `/api/rider/*` paths.

**Setup (once):** `pnpm db:seed:full` **and** set k6 passwords to `Password123!`, **or** extend `seed-local-db.ts` to all roles with `1234567890`. Confirm `NODE_ENV` vs demo login.

Per VU, checkout:

1. `GET /api/health` (optional, 10% sample — do not ping every iteration)
2. `GET /api/restaurants`
3. `GET /api/menu-items?restaurantId=<real id from step 2>`
4. `POST /api/calculator` with items in paise / rupees as the UI does
5. `POST /api/orders` with `restaurant_id`, `items[].id` from DB, `address_id` of a geocoded customer address, header `x-idempotency-key`
6. `GET /api/orders?orderId=<id>`
7. `PATCH /api/orders` payment submitted (UTR)
8. Admin `PATCH /api/admin/payment-reviews`
9. `POST /api/dispatch/request` (vendor token)
10. `POST /api/driver/accept` (rider token)
11. `POST /api/driver/location` at most 1/5s
12. WS `ws://localhost:3000/api/ws?token=` (via frontend proxy) subscribe `order_update` with `orderId`

Parse `{ success, restaurants }` / `{ success, items }` / `{ success, order }`.

Suggested smoke gates after auth is fixed: `http_req_failed < 1%`, `p(95)<500` for GET catalog, `p(95)<1500` for `POST /api/orders`, `checks>99%`, `total_orders_created > 0`.

---

## 7. Auth and tenancy notes (API status)

| Check                                    | Result                                        |
| ---------------------------------------- | --------------------------------------------- |
| Customer cannot set prices on POST order | Pass — body financial fields ignored          |
| Customer scoped to own orders            | Pass — `GET` forces `customer_id = actor.id`  |
| Vendor cannot see unpaid orders          | Pass — `onlyApprovedForVendor`                |
| Driver location spoof                    | Pass — `actor.id === driverId` unless admin   |
| Coupons list public                      | **Fail / gap** — GET has no JWT               |
| Restaurant POST `owner_id` from body     | **Gap** — should force `actor.id` for vendors |
| Test headers in production               | Pass — `lib/api-auth.ts` throws unless `CI`   |

---

## 8. Scorecard

| Capability        | Implementation                           | Runtime (this smoke)                        | Grade                                      |
| ----------------- | ---------------------------------------- | ------------------------------------------- | ------------------------------------------ |
| Health            | `app/api/health/route.ts`                | 200, ~100ms class                           | A                                          |
| Restaurant list   | `app/api/restaurants/route.ts`           | 200, over-fetch menus                       | B                                          |
| Login             | `app/api/auth/login/route.ts`            | 3/4 failed in staging                       | D (env/seed)                               |
| Order create      | `app/api/orders/route.ts` POST           | not hit                                     | B− (N+1, 1.3k LOC)                         |
| Calculator        | `app/api/calculator/route.ts`            | not hit                                     | B+ (preview vs canonical split is correct) |
| Dispatch          | `app/api/dispatch/*`, `lib/dispatch/*`   | not hit                                     | B+ design                                  |
| Driver GPS        | `app/api/driver/location/route.ts`       | not hit                                     | B (needs rate limit)                       |
| Payment review    | `app/api/admin/payment-reviews/route.ts` | not hit                                     | B+                                         |
| Geocode           | `app/api/geocode/*`                      | not hit                                     | C (third party, no cache)                  |
| Load-test harness | `load-tests/comprehensive-load-test.js`  | wrong JSON, wrong passwords, missing routes | D                                          |

**Platform API grade after this review: B−** for code quality of the money path, **C** for production-readiness of automated performance evidence.

---

## 9. Action list (priority)

1. Seed all four k6 users with the password the test uses, or change k6 to `Password123!` after `pnpm db:seed:full`. Re-run smoke; expect `http_req_failed = 0` if public GETs stay green.
2. Fix k6 parse of `{ restaurants }` / `{ items }` / `{ order }` and drop URLs that do not exist.
3. Batch menu-item reads in `POST /api/orders`.
4. Drop `menu_items` from `listRestaurants`; add a slim select.
5. Remove `ensureStore()` from CraveXP GET.
6. Split `app/api/orders/route.ts`.
7. Rate-limit `POST /api/driver/location` and coupon GET (or move public coupons to `/api/coupons`).
8. Re-run smoke, then `TEST_TYPE=load`, only after (1)–(2). Treat the 12 Oct run as **auth/setup failure**, not an API latency failure.

---

## 10. Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [REALTIME_API_ARCHITECTURE.md](./REALTIME_API_ARCHITECTURE.md)
- [billing/BILLING_ARCHITECTURE.md](./billing/BILLING_ARCHITECTURE.md)
- [app_flow_documentation/APP_FLOW_AND_RULES.md](./app_flow_documentation/APP_FLOW_AND_RULES.md)
- Load scripts: `load-tests/comprehensive-load-test.js`, `load-tests/checkout-load-test.js`
- Last smoke artifact: repo-root `summary.json` (2026-10-12T00:40:54.824Z)

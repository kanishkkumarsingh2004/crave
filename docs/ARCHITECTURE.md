# Technical Architecture Specification

# Crave — Multi-Vendor Food Delivery & CraveXP Dark-Store Grocery Platform

**Version:** 4.0
**Last Updated:** 21 October 2026
**Status:** Production Ready — 31/31 test suites pass (`pnpm test:db`; `pnpm test` runs the 24
that need no database and skips the other 7)

**What changed in 4.0** — the platform grew three layers that did not exist in 3.0:

- **Four native applications** (Admin, Driver, Restaurant, Customer) as standalone Capacitor React
  apps, built and released from the repository root, not remote website wrappers.
- **A translations layer** — `dictionary/` with the React bindings the web portal and all four
  apps share.
- **A device-caching layer** — a service worker plus a per-account data cache, so the customer
  app opens instantly and keeps working without a network.

---

## 1. System Overview

Crave is a multi-role food delivery and 10-minute dark-store grocery platform. One Next.js 16 App
Router application serves the web portal and every REST handler; a standalone WebSocket process
carries realtime; four Capacitor applications are the native clients. PostgreSQL holds the truth,
Redis holds the locks, the caches and the pub/sub.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│  CLIENTS                                                                           │
│                                                                                    │
│  ┌─────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Web portal     │  │  Customer    │  │  Restaurant  │  │  Driver / Admin      │ │
│  │  Next.js pages  │  │  Capacitor   │  │  Capacitor   │  │  Capacitor           │ │
│  │  /user /vendor  │  │  app         │  │  app         │  │  apps                │ │
│  │  /driver /admin │  │              │  │              │  │                      │ │
│  └────────┬────────┘  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘ │
└───────────┼──────────────────┼─────────────────┼─────────────────────┼─────────────┘
            │ HTTPS / REST     │                 │                     │
┌───────────▼──────────────────▼─────────────────▼─────────────────────▼─────────────┐
│  L1  EDGE — server.js (Next.js custom server, :3000)                               │
│      · serves the web portal and every /api route handler                          │
│      · proxies WS upgrades on /api/ws  ─────────────────►  WS_HOST:WS_PORT         │
│      · holds the HTTP-only JWT cookie, the role guard lives in proxy.ts            │
└───────────┬──────────────────────────────────────────────────────────┬─────────────┘
            │                                                          │ publish
┌───────────▼──────────────────────────────┐        ┌──────────────────▼───────────┐
│  L2  API SURFACE — app/api/*             │        │  L3  REALTIME — ws-server.js │
│      auth/  orders/  driver/  admin/     │        │   :8000, native `ws`         │
│      restaurants/  menu-items/  payments/│        │   · JWT on connect           │
│      dispatch/  calculator/  push/  …    │        │   · role + order ownership   │
└───────────┬──────────────────────────────┘        │   · GPS coalescing (~1s)     │
            │                                       │   · ping/pong, slow-consumer │
            │                                       └──────────────┬───────────────┘
            │                                                      │
            │  ┌───────────────────────────────────────────────────┼──────────────┐
            │  │ L4  DOMAIN ENGINES                                │              │
            │  │  lib/dispatch/  H3 search, driver tracker, locks  │              │
            │  │  lib/finance/   paise maths, tax, pricing, ledger │              │
            │  │  lib/catalog/   order state machine, menu, coupons│              │
            │  │  lib/auth/      JWT, password, order access       │              │
            │  │  lib/notifications/  web push, driver push, email │              │
            │  │  lib/geo/       H3 grid, distance, routes         │              │
            │  └───────────────────────────┬───────────────────────┘              │
            │                              │                                      │
            │  ┌───────────────────────────▼───────────────────────┐              │
            │  │  L5  DATA ACCESS — lib/dal/ (Prisma)              │              │
            │  │      orders · restaurants · menu-items · payments │              │
            │  │      coupons · addresses · users                  │              │
            │  └───────────────────────────┬───────────────────────┘              │
            └──────────────────────────────┼──────────────────────────────────────┘
                                           │
        ┌──────────────────────────────────┴───────────────────┐
        │  L6  STORES                                          │
        │      PostgreSQL 16 (Neon or self-hosted) — the truth │
        │      Redis 7 — locks, rate limits, JWT blacklist,    │
        │                 dispatch cells, pub/sub, GPS index   │
        └──────────────────────────────────────────────────────┘
```

**Docker Compose** runs three services: `frontend` (Next.js, published on `:3000`), `backend`
(the WebSocket process, internal `:8000`) and `crave-network` (Redis). **Postgres is not in
Compose** — point `DATABASE_URL` at Neon or a local instance.

---

## 2. Technology Matrix

| Layer                  | Technology                                                      | Notes                                                        |
| :--------------------- | :-------------------------------------------------------------- | :----------------------------------------------------------- |
| Web portal             | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict  | Route handlers under `app/api/`                              |
| Native clients        | Capacitor 6 + Vite 7 + React 19                                 | Four apps, each with its own bundle and native plugins        |
| Styling & icons        | Tailwind CSS 4 (portal), plain CSS + Lucide React (native apps) | One icon language across the product                         |
| Database & ORM         | PostgreSQL 16, Prisma 7 with `@prisma/adapter-pg`              | Integer-paise money columns                                  |
| Cache, locks, pub/sub  | Redis 7 (`ioredis`)                                             | Atomic offer locks, rate limits, JWT revocation, WS fan-out  |
| Geospatial dispatch    | `h3-js` (Uber H3), MapLibre GL                                  | H3 resolution 8, hex radar for rider search                  |
| Realtime               | Node `ws` server, `ws-server.js`                                | Native WebSocket, no socket.io                               |
| Authentication         | `jose` JWT (7-day), `scrypt` password hashing                   | HTTP-only cookie **or** bearer token for the native apps     |
| Money                  | `lib/finance/` — integer paise, `Money` type                    | Canonical pricing, tax, double-entry ledger                  |
| Translations           | `dictionary/` (en, kn)                                          | Typed against `Dictionary`, so a missing key fails the build |
| Caching                | Service worker + per-account device cache                        | Static assets cache-first, API reads network-first            |
| Testing                | `node:test` through `tsx`, `k6` for load and abuse             | 31 suites, 24 of them needing no database                   |
| Task runner            | Turborepo (`build`, `typecheck`, `test`)                         | Single package at the root                                   |
| Package manager        | pnpm 12.3.4 (pinned)                                            | Workspace projects for the four native apps                  |
| Node                   | 20+                                                              | 22 in CI                                                     |

---

## 3. The Layers

### 3.1 L1 — Edge and transport

`server.js` is a custom Next.js HTTP server. It does two things the Next runtime cannot: it
**proxies WebSocket upgrades** on `/api/ws` to the WS process, and it holds the cookie that the
role guard reads.

`proxy.ts` is the edge page guard. It resolves the JWT from the `crave_auth_token` cookie and
blocks a portal path that the role cannot open (`/admin/*` needs `admin`, `/driver/*` needs
`rider`, `/vendor/*` needs a vendor role, `/user/*` needs a customer).

**Broadcast plumbing.** A mutation in Next cannot talk to the WS process directly, so it
**publishes to Redis** (`crave:ws:events`) and the WS process fans it out. If Redis is
unreachable the caller falls back to `POST /__ws/broadcast` on the WS process, which is
authenticated with `WS_INTERNAL_SECRET`.

### 3.2 L2 — API surface

| Area                | Routes                                                        | What it owns                                       |
| :------------------- | :------------------------------------------------------------ | :------------------------------------------------- |
| `auth/`              | login, signup, logout, session, language                       | Identity, sessions, the saved locale               |
| `orders/`            | create, list, patch, `sync/`                                   | The order lifecycle and its status transitions      |
| `restaurants/`, `menu-items/` | catalogue reads and writes                               | Restaurants, dishes, variants, stock                |
| `payments/`, `payment-config/` | UPI configuration, payment reviews, refunds          | The money trail around an order                    |
| `dispatch/`          | H3 candidate search, driver assignment                          | Matching riders to a kitchen                      |
| `driver/`, `drivers/` | offers, accept, telemetry, status, payouts                     | The rider's day                                    |
| `admin/`             | stats, users, coupons, settlements, payment reviews, XP products | Everything only an admin may touch                |
| `cravexp/`           | dark-store catalogue                                           | The grocery side                                   |
| `calculator/`, `distance-pricing/`, `geocode/` | previews                            | Quotes and lookups — **never** authorisation        |
| `push/`, `webhooks/` | push registration, provider callbacks                          | Outbound and inbound integrations                  |
| `user/`              | addresses, profile                                             | Customer-owned data                                |
| `health/`            | liveness and readiness                                          | `REDIS_REQUIRED=true` turns a Redis outage into 503 |

**Authorisation** happens in two places: `lib/api-auth.ts` and `lib/auth-helpers.ts` resolve the
actor, and `lib/auth/order-access.ts` decides what that actor may read. The handover code
(`delivery_otp`) and the order's settlement rows are stripped from every reader except the
customer, and the customer only sees the code between pickup and delivery.

### 3.3 L3 — Domain engines

**Dispatch** (`lib/dispatch/`)
1. `driver-tracker.ts` indexes every online rider's GPS into Redis as H3 cells (resolution 8).
2. `h3-dispatch.ts` expands concentric k-rings from the kitchen and ranks candidates by
   distance, GPS freshness and vehicle match.
3. `atomic-lock.ts` claims the order with a Redis lock, so two riders can never take the same
   order.

**Finance** (`lib/finance/`) — the only place money is calculated.
`money.ts` is an integer-paise type; `pricing-engine.ts` produces the canonical quote;
`tax-engine.ts` splits GST (food 5%, platform and commission 18%, grocery HSN rules);
`ledger-service.ts` writes balanced double-entry journals; `payment-service.ts` owns the
payment and refund state machine. The order stores the quote as `financial_snapshot`, and that
snapshot — not a fresh calculation — is what settlement and invoices use.

**Catalog** (`lib/catalog/`) — the order state machine, the menu and coupon rules, the payment
configuration.

**Auth** (`lib/auth/`) — `jwt.ts` (sign and verify), `password.ts` (scrypt), `order-access.ts`
(who may read an order and its codes).

**Notifications** (`lib/notifications/`) — web push for the portal, APNs/FCM for the riders,
email for the receipts.

**Geo** (`lib/geo/`) — the H3 grid, Haversine with a 1.30× road factor, routing and the
serviceability checks.

### 3.4 L4–L5 — Data access and stores

Everything reads through `lib/dal/`, one module per aggregate, so the queries live in one place
instead of being scattered through the UI.

**PostgreSQL** holds the truth: users, restaurants, menu items and variants, orders with their
`financial_snapshot`, the ledger, payment transactions, reviews, refunds, settlements, coupons
and the driver profiles. Money is stored as integer paise.

**Redis** holds everything ephemeral: the dispatch offer locks, the H3 cell index, the rate
limiters, the JWT blacklist, the idempotency records, and the pub/sub that feeds the WS process.

### 3.5 L6 — Realtime

`ws-server.js` authenticates the JWT on connect, checks role and order ownership on every
subscribe, coalesces GPS to about one message per second, answers pings and drops slow
consumers. Channels: `order_update`, `approval_update`, `driver_location` (ownership-scoped),
`admin_stats`, `admin_orders`, `admin_users`, `map_live_analytics` (admin), `restaurants`,
`menu_items`, `catalog_update`.

`lib/websocket.tsx` is the client half (`useOrderUpdates`, `useDriverLocation`), with a
`BroadcastChannel` fallback for same-tab updates.

**No handover code is ever broadcast.** `stripOrderSecrets()` runs over every WS payload, so
the six-digit delivery code only travels on the authenticated HTTP path, to the customer.

### 3.6 L7 — Client state

The portal uses React contexts in `lib/contexts/`: `auth-context`, `cart-context`,
`theme-context`, `language-context`, `toast-context`, `driver-context`, `websocket-context`.
The native apps use the same patterns in their own `src/`.

### 3.7 L8 — The native shell

Each app is a Vite + React bundle inside a Capacitor shell, talking to the API with a bearer
token instead of a cookie. `x-crave-native-app` tells the login route to return the token in the
body — without it the client is silently unauthenticated.

The customer app's native bridge (`AppUpdatePlugin`) verifies the update's SHA-256, refuses any
source that is not the trusted release host, and opens the "install unknown apps" screen when
Android has not allowed it.

### 3.8 L9 — Caching and offline

**Static files** — the customer app ships a service worker (`customer_app/public/sw.js`):

| Request                   | Strategy                                                        |
| :------------------------ | :-------------------------------------------------------------- |
| the shell (`/`)            | precached on install, served from the cache when the network is down |
| static assets             | cache-first — their names are content-hashed, so they never rot  |
| API reads                 | network-first, with the cached copy as the fallback              |
| writes                    | never cached                                                    |

**Data** — the last good answer for every read is kept on the device
(`cachedRequest` in `customer_app/src/api.ts`). When the network fails the app shows the saved
copy with a "showing the last saved copy" banner instead of an error.

The saved copies are **scoped per account** and wiped on sign-out, so one customer never sees
another customer's orders on a shared device. In the APK the requests go through `CapacitorHttp`
rather than `fetch`, so the service worker alone would not have cached anything — the data cache
is what makes the app work offline on-device.

### 3.9 L10 — Translations

`dictionary/en.ts` is the source of truth; every other language is typed as `Dictionary`, so a
missing key fails the build rather than showing a blank. `dictionary/index.ts` is the registry
(`SUPPORTED_LANGUAGES`, `getDictionary`, `isSupportedLocale`).

`dictionary/react.tsx` exposes the dictionaries to React. It is a **store, not a context**, so
the four native apps call `useLanguage()` anywhere without wrapping their screens in a provider.
The choice is kept in `localStorage` and pushed to the account through
`PATCH /api/user/language`. Every language picker in the product reads its list from the
registry, so a new language appears everywhere at once.

### 3.10 L11 — Permissions

The customer app explains the three permissions it needs on the first launch and then asks:

| Permission    | Why                                                         |
| :------------ | :----------------------------------------------------------- |
| Location      | Find you on the map, set your address, follow your delivery  |
| Notifications | Order updates, payment alerts, delivery status               |
| App updates   | Install new builds so you always run the latest app         |

"Install unknown apps" is a device setting rather than a runtime dialog, so that row opens the
right settings screen. The sheet is shown once and can be reopened from Settings.

### 3.11 L12 — Quality and load

| Suite                          | What it covers                                            |
| :----------------------------- | :--------------------------------------------------------- |
| `test/*.test.ts`               | 31 suites: pricing, coupons, security, concurrency, the DB harness |
| `pnpm test`                    | The 24 that need no database                              |
| `pnpm test:db`                 | All 31, with the database-backed races enabled            |
| `load-tests/app-load-test.js`  | One k6 script, one scenario set per app, selected with `--app` |
| `load-tests/abuse/`            | Double-clicks, timeouts with retries, capacity races, credential stuffing, OTP guessing, socket floods |

The abuse suite separates **integrity** failures (the data is wrong) from **usability** failures
(the data is right but the customer is blocked), and the report says which expectation failed.

---

## 4. The Order Lifecycle Through the Layers

```
payment_pending → payment_submitted → payment_verified → sent_to_vendor
→ preparing → packing → ready_for_pickup → rider_assigned → picked_up
→ out_for_delivery → delivered → completed
```

| Step                          | Layer touched                                                        |
| :---------------------------- | :------------------------------------------------------------------- |
| The customer checks out       | L2 `POST /api/orders` — the quote is priced in paise, the order stores a `financial_snapshot`, and a six-digit delivery OTP is generated server-side |
| The customer pays by UPI      | The app hands over to a UPI app and collects the 12-digit UTR (`utr_ref`) |
| The admin verifies            | L2 `PATCH /api/admin/payment-reviews` — the UTR is unique, so a replay is refused; the order becomes `sent_to_vendor` |
| The kitchen accepts           | L2 `PATCH /api/orders` — guarded by `lib/catalog/order-state-machine.ts` and the optimistic lock `where: { id, status }` |
| A rider is offered the order  | L3 dispatch — H3 k-ring search, ranked candidates, Redis atomic lock |
| The rider accepts             | `rider_assigned` — one rider per order, enforced by the lock and a conditional update |
| The handover                   | The customer reads the six-digit code from the order; the rider enters it to confirm `delivered` — the code is consumed exactly once |
| The invoice                   | The customer app prints a till-slip receipt from the `financial_snapshot`; the portal exports a PDF tax invoice |

**Money never moves without the snapshot.** The customer's bill, the rider's payout, the
restaurant's settlement and the invoice all read the same persisted quote.

---

## 5. Repository Map

```
├── app/                         Next.js App Router pages and route handlers
│   ├── admin|driver|user|vendor/ the four portal areas
│   ├── api/                     the REST surface (see §3.2)
│   └── globals.css, layout.tsx  theme variables and the root layout
├── components/                  shared UI, role dashboards, the invoice modal
├── dictionary/                  en.ts, kn.ts, index.ts (registry), react.tsx (bindings)
├── lib/
│   ├── dal/                     Prisma data access, one module per aggregate
│   ├── finance/                 money, pricing, tax, ledger, payment service
│   ├── dispatch/                H3 dispatch, driver tracker, atomic locks
│   ├── catalog/                 order state machine, menu, coupons, payment config
│   ├── auth/                    JWT, password, order access rules
│   ├── geo/                     H3 grid, distance pricing, routing
│   ├── notifications/           web push, driver push, email
│   ├── native/                  the three portal-side native bridges
│   ├── contexts/                React contexts for the portal
│   ├── infra/                   prisma, redis, cache, idempotency, rate limit, ws server
│   └── *.ts                     JWT, auth helpers, api auth, calculator, commercial engine, websocket
├── admin_app/ driver_app/ restaurant_app/ customer_app/
│                               the four Capacitor apps (Vite + React 19)
│   ├── src/                     the app, its API client, native bridge, theme, i18n
│   ├── android/ ios/            the Capacitor projects
│   └── public/                  the app's own static files (the customer app's service worker)
├── prisma/                      schema.prisma and the migrations
├── scripts/                     build, release, seed and verification scripts
├── load-tests/                  the k6 load test and the abuse suite
├── test/                        the node:test suites
├── docs/                        architecture, PRD, billing specs, audits
├── server.js                    the custom Next.js server and WS proxy
├── ws-server.js                 the standalone WebSocket process
├── proxy.ts                     the edge page guard
└── docker-compose.yml           frontend + backend + Redis
```

---

## 6. Security

- **Passwords** — scrypt with a per-user salt.
- **Sessions** — HS256 JWTs from `jose`, seven-day expiry, HTTP-only `SameSite=Lax` cookies;
  bearer tokens for the native apps. Redis holds the JTI blacklist for logout and logout-all.
  If Redis is down in production, tokens are **rejected** (fail closed).
- **Roles** — `user`, `restaurant_vendor`, `cravexp_store_vendor`, `rider`, `admin`. The portal
  guard and the API both check them.
- **The handover code** — six digits, generated with `crypto.randomInt`, visible only to the
  customer, only between pickup and delivery, and consumed exactly once.
- **Broadcasts** — never carry a handover code or a settlement row.
- **Queries** — Prisma parameterises everything.
- **Updates** — the native update bridge verifies the SHA-256 and refuses any host that is not
  the trusted release origin.
- **Type safety** — `npx tsc --noEmit` is clean in every package.

---

## 7. Documentation Index

| Doc                                                             | Contents                                          |
| :-------------------------------------------------------------- | :------------------------------------------------ |
| [README.md](../README.md)                                        | Platform overview, setup, scripts, CI             |
| [PRD.md](PRD.md)                                                 | Product requirements and the role matrix          |
| [REALTIME_API_ARCHITECTURE.md](REALTIME_API_ARCHITECTURE.md)   | The HTTP and WebSocket channel matrix             |
| [commercial-engine.md](commercial-engine.md)                     | Vendor contracts and the commercial engine        |
| [financial-integrity.md](financial-integrity.md)                 | The money invariants                              |
| [deployment-and-recovery.md](deployment-and-recovery.md)         | Deployment, database operations, runbooks         |
| [billing/BILLING_ARCHITECTURE.md](billing/BILLING_ARCHITECTURE.md) | The finance module map                          |
| [billing/PRICING_AND_FEE_SPECIFICATION.md](billing/PRICING_AND_FEE_SPECIFICATION.md) | Fees and GST                        |
| [billing/FINANCIAL_LEDGER_SPECIFICATION.md](billing/FINANCIAL_LEDGER_SPECIFICATION.md) | Ledger accounts            |
| [billing/PAYMENT_AND_REFUND_STATE_MACHINE.md](billing/PAYMENT_AND_REFUND_STATE_MACHINE.md) | Payment states  |
| [billing/SETTLEMENT_AND_RECONCILIATION.md](billing/SETTLEMENT_AND_RECONCILIATION.md) | Settlement              |
| [billing/TAX_RULE_MATRIX.md](billing/TAX_RULE_MATRIX.md)       | The tax matrix                                    |
| [billing/MIGRATION_AND_ROLLBACK.md](billing/MIGRATION_AND_ROLLBACK.md) | Schema migration and rollback             |
| [app_flow_documentation/APP_FLOW_AND_RULES.md](app_flow_documentation/APP_FLOW_AND_RULES.md) | Page catalogue and order rules |
| [../load-tests/abuse/README.md](../load-tests/abuse/README.md)   | The abuse and concurrency suite                   |
| [../android-builds/README.md](../android-builds/README.md)       | The published APKs and the release flow            |

**Point-in-time reviews** — kept as the record of that review, with a banner saying what has
changed since: [PRODUCTION_AUDIT.md](PRODUCTION_AUDIT.md),
[API_REVIEW_REPORT.md](API_REVIEW_REPORT.md), [forensic-audit.md](forensic-audit.md),
[security-review.md](security-review.md), [remediation-plan.md](remediation-plan.md),
[ui_ux_review.md](ui_ux_review.md),
[reviews/latest-commit-remediation.md](reviews/latest-commit-remediation.md).

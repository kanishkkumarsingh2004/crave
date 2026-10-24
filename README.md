# Crave

Multi-vendor food delivery and **CraveXP** 10-minute dark-store grocery platform.

[![CI Pipeline](https://github.com/kanishkkumarsingh2004/crave/actions/workflows/ci.yml/badge.svg)](https://github.com/kanishkkumarsingh2004/crave/actions/workflows/ci.yml)

One Next.js 16 App Router app (React 19, TypeScript, Tailwind) plus a standalone WebSocket process. Data lives in PostgreSQL (Prisma 7 + `@prisma/adapter-pg`; production is typically [Neon](https://neon.tech)). Redis handles JWT revocation, dispatch locks, rate limits, driver location, and WS pub/sub.

---

## Architecture

```
                         Docker Compose
┌─────────────────────────────────────────────────────────────────┐
│  crave-frontend          HTTP REST           crave-backend      │
│  Next.js (server.js)  ◄─────────────────►  ws-server.js         │
│  :3000 (published)                         :8000 (internal)     │
│         │                                         ▲             │
│         │  WS upgrade /api/ws  ───────────────────┘             │
│         │  Redis publish  OR  POST /__ws/broadcast              │
│         │                                         │             │
│         └──────────────►  crave-redis  ◄──────────┘             │
│                           :6379 (internal)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    PostgreSQL (Neon / any PG)
                    DATABASE_URL
```

`docker-compose.yml` runs **Redis**, the **Next.js frontend**, and the **WebSocket backend**. It does **not** start Postgres. Point `DATABASE_URL` at Neon or a local Postgres instance.

The frontend container proxies WebSocket upgrades on `/api/ws` to `WS_HOST:WS_PORT` (`backend:8000` in Compose). Port 8000 is not published to the host.

API mutations broadcast live events by publishing to Redis (`crave:ws:events`) and falling back to `POST /__ws/broadcast` on the WS process (`lib/ws-server.ts`).

---

## Portals

Role pages are gated in `proxy.ts` (JWT cookie `crave_auth_token`). APIs use `lib/api-auth.ts` / `lib/auth-helpers.ts`.

| Portal               | Routes      | Role(s)                                     |
| -------------------- | ----------- | ------------------------------------------- |
| Customer             | `/user/*`   | `user`                                      |
| Kitchen / dark store | `/vendor/*` | `restaurant_vendor`, `cravexp_store_vendor` |
| Rider                | `/driver/*` | `rider`                                     |
| Admin                | `/admin/*`  | `admin`                                     |

Public: `/`, `/login`, `/signup`, `/policies/*`.

### Android apps

Build the Admin, Driver, Restaurant, and CRAVE customer Android apps together with:

```bash
pnpm build:android
```

The APKs, checksums, installation commands, and build notes are collected in
[android-builds](./android-builds/README.md).

**Customer** — restaurant explore + CraveXP grocery, cart, UPI collect + 12-digit UTR, live tracking,
a printed till-slip invoice, an itemised bill with a tip sheet, and dual tax invoices
(`components/InvoiceModal.tsx`).

**Vendor** — live kitchen / picker desk, Accept → Prepare → Pack → Ready, menu and stock.

**Driver** — online/offline, H3 dispatch offers, GPS broadcast, 6-digit delivery OTP, wallet / payouts / incentives.

**Admin** — KPIs, UTR review queue, coupons, vendor settlements, payment/fee config, live H3 map (`/admin/map-live-analytics`).

The native shells are self-contained Capacitor React apps rather than remote website wrappers.
The Admin app includes CraveXP product barcode scanning and standard update/order/system
notifications; it does not expose a custom audience notification composer. The Restaurant app has
five tabs (Home, Orders, Menu, Sales, Settings); its standalone Profile tab is removed. Current
APK versions and SHA-256 values are maintained in [`android-builds/version.json`](./android-builds/version.json).

All four apps ship the same three-row settings block — _Check for updates_, _Change password_ and
_Language_ — and the language list comes from `dictionary/`, so the pickers follow the registry.

**Releasing.** `pnpm build:android` raises the Android `versionCode` (and the iOS
`CURRENT_PROJECT_VERSION`) by one on every build, because the in-app updater only offers a build
whose number is **higher** than the installed one. To publish the version already in
`build.gradle` unchanged — a fresh `1.0.0`, for example — build with `KEEP_VERSION=1`:

```bash
KEEP_VERSION=1 pnpm build:android
```

`bash scripts/clean-native-builds.sh` wipes the web output, the native build directories, the
published APKs and the manifest, so the next build starts from nothing.

---

## Core systems

### Auth

- Passwords: `scrypt` with per-user salt.
- Sessions: HS256 JWTs (`jose`), 7-day expiry, HTTP-only cookies.
- Redis JTI / user blacklist for logout and logout-all. If `REDIS_URL` is set and Redis is down, production **rejects** tokens (fail closed).
- Test auth headers are blocked when `NODE_ENV=production` unless `CI` is set.

### Orders and payments

Canonical status machine (`lib/catalog/order-state-machine.ts`, re-exported from
`lib/order-state-machine.ts`):

```
payment_pending → payment_submitted → payment_verified → sent_to_vendor
→ preparing → packing → ready_for_pickup → rider_assigned → picked_up
→ out_for_delivery → delivered → completed
```

Checkout is **UPI + UTR**, not a card PSP. The customer submits a UTR; admin verifies `PaymentReview` (unique `utr_ref`). Server-side pricing is persisted on the order as `financial_snapshot` and must be reused for settlement and invoices — do not recalculate.

### Billing Engine 2.0

Authoritative math is `lib/finance/` (integer **paise**):

| Module              | Role                                                |
| ------------------- | --------------------------------------------------- |
| `money.ts`          | Integer paise `Money` type                          |
| `tax-engine.ts`     | GST (food 5%, platform/commission 18%, grocery HSN) |
| `pricing-engine.ts` | Canonical order quote (`calculateOrderPrice`)       |
| `ledger-service.ts` | Double-entry `LedgerEntry` journals                 |

`/api/calculator` is a **preview** endpoint. It returns both a legacy `breakdown` and a `canonical` quote. It must not authorize payment.

`lib/calculator.ts` and `lib/commercial-engine.ts` remain for older UI paths; new checkout and settlement code should import from `@/lib/finance`.

Commercial models on restaurants/contracts: **commission**, **markup**, **hybrid**.

### Dispatch (H3)

1. Rider GPS is indexed into Uber H3 cells (default resolution 8) in Redis (`lib/dispatch/driver-tracker.ts`).
2. Pickup search expands concentric k-rings and ranks candidates (distance, location freshness, vehicle match) in `lib/dispatch/h3-dispatch.ts`.
3. Offer assignment uses Redis atomic locks (`lib/dispatch/atomic-lock.ts`).

### Realtime

`ws-server.js` (port 8000): JWT on connect, role + order-ownership checks on subscribe, GPS coalescing (~1s), ping/pong, slow-consumer disconnect.

Typical channels: `order_update`, `approval_update`, `driver_location` (ownership-scoped); `admin_stats`, `admin_orders`, `admin_users`, `map_live_analytics` (admin); `restaurants`, `menu_items`, `catalog_update`.

Clients use `lib/websocket.tsx` (`useWebSocket`, `useOrderUpdates`, `useDriverLocation`). Same-tab fallback: `BroadcastChannel`.

### Translations

`dictionary/` holds the translation dictionaries — `en.ts` is the source of truth and every other
language is typed as `Dictionary`, so a missing key fails the build. `dictionary/index.ts` is the
registry (`SUPPORTED_LANGUAGES`, `getDictionary`, `isSupportedLocale`).

`dictionary/react.tsx` exposes the same dictionaries to React. It is a **store, not a context**, so
the four native apps can call `useLanguage()` anywhere without wrapping their screens in a
provider. The choice is kept in `localStorage` and can be pushed to the account through
`PATCH /api/user/language`.

To add a language: create `dictionary/<code>.ts`, register it in `dictionary/index.ts`, and add
the code to the `SupportedLocale` union. The language pickers in all four apps read their list
from the registry, so they follow automatically.

---

## Repository layout

```
app/                    Next.js App Router pages and route handlers
  api/                  REST: auth, orders, dispatch, driver, admin, calculator, …
  admin|driver|user|vendor/
components/             Shared UI + role dashboards
dictionary/             Translation dictionaries (en, kn) + the React bindings the
                        four native apps share
lib/
  dal/                  Prisma data access
  finance/              Canonical pricing, tax, ledger
  dispatch/             H3 search, driver tracker, locks
  catalog/              Order state machine
  auth/                 Order access rules, sanitisation of the handover codes
  jwt.ts, api-auth.ts, proxy.ts (edge/page guard lives at repo root)
prisma/schema.prisma
ws-server.js            Standalone WebSocket process
server.js               Custom Next HTTP server + WS upgrade proxy
workers/                PWA / driver location stream workers
test/                   node:test suites (unit + database-backed)
load-tests/             k6 scripts: app load test and the abuse suite
docs/                   Architecture, PRD, billing specs
neon.ts                 Neon branch / bucket config
```

Data access should go through `lib/dal/` rather than scattering Prisma calls in UI.

---

## Stack

| Area                    | Choice                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| App                     | Next.js 16, React 19, TypeScript (strict)                          |
| UI                      | Tailwind 4, Base UI / shadcn, Lucide, MapLibre GL                  |
| ORM                     | Prisma 7 with `pg` adapter                                         |
| Cache / locks / pub-sub | Redis 7 (`ioredis`)                                                |
| Geo                     | `h3-js`, Haversine + 1.30× road factor (`lib/distance-pricing.ts`) |
| Auth                    | `jose` JWT                                                         |
| Task runner             | Turborepo (single package: `build`, `typecheck`, `test`)           |
| Package manager         | pnpm 12.3.4 (pinned)                                               |
| Node                    | 20+                                                                |

---

## Quick start

### Docker (app + Redis)

Postgres is **not** in Compose. Set `DATABASE_URL` first.

```bash
cp .env.example .env
# fill JWT_SECRET, DATABASE_URL, DIRECT_URL, REDIS_URL, WS_INTERNAL_SECRET
pnpm dc:up
```

- App: [http://localhost:3000](http://localhost:3000)
- Health: [http://localhost:3000/api/health](http://localhost:3000/api/health)
- WebSocket (from the browser, via the frontend proxy): `ws://localhost:3000/api/ws`

---

## Razorpay Payment Gateway — Test Docker Environment

A complete Docker Compose test environment (`docker-compose.test.yml`) is provided for local Razorpay integration testing. It uses **`.env.test` only** — **production `.env.production` is never touched**.

### What's included

| Service               | Container             | Host Port | Purpose                   |
| --------------------- | --------------------- | --------- | ------------------------- |
| PostgreSQL 16         | `crave-db-test`       | 5433      | Database                  |
| Redis 7               | `crave-redis-test`    | 6380      | Caching, locks, pub-sub   |
| Backend (Next.js API) | `crave-backend-test`  | 3000      | REST API on :3000         |
| WebSocket Server      | `crave-backend-test`  | 8000      | Internal WS               |
| Frontend (Next.js)    | `crave-frontend-test` | 3000      | Website on :3000          |
| Migration runner      | `crave-migrate-test`  | —         | One-shot schema migration |

### Start the test environment

```bash
# Full start (builds images, runs migrations, starts services)
bash crave-docker-test.sh

# Or step by step:
docker compose -f docker-compose.test.yml up migrate --wait
docker compose -f docker-compose.test.yml up -d backend frontend
```

### Stop / reset

```bash
# Stop all services
docker compose -f docker-compose.test.yml down

# Reset everything (wipes database volumes)
docker compose -f docker-compose.test.yml down -v

# Re-run migrations only
docker compose -f docker-compose.test.yml up migrate
```

### Verify it's running

```bash
# All containers healthy
docker compose -f docker-compose.test.yml ps

# Health API with DB + Redis status
curl http://localhost:3000/api/health
# {"status":"operational","services":{"database":{"status":"operational",...},"redis":{"status":"connected",...}}}

# Razorpay config enabled
curl http://localhost:3000/api/payment-config | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['config']['razorpayEnabled'])"
# True
```

### Razorpay Checkout flow

The checkout page shows **Razorpay-only** payment (no UPI toggle, no UTR input required) when `razorpay_enabled` is ON in the admin config:

1. **Login**: http://localhost:3000/login → `customer@crave.test` / `TestPass123!`
2. **Cart**: http://localhost:3000/user/cart → Razorpay panel ("Card, UPI, Net Banking & Wallets — No UTR needed")
3. **Place Order**: Click "Place Order (₹962.26)" → Order created → Razorpay Checkout opens → Server verifies signature → `payment_status = 'verified'`
4. **Track**: Order sent to vendor → After delivery, Route splits transfers to restaurant/driver linked accounts

### Test credentials (all password: `TestPass123!`)

| Email                 | Role                                                |
| --------------------- | --------------------------------------------------- |
| `admin@crave.test`    | Admin — toggles Razorpay at `/admin/payment-config` |
| `customer@crave.test` | Customer                                            |
| `vendor@crave.test`   | Restaurant Vendor                                   |
| `store@crave.test`    | Dark Store Vendor                                   |
| `rider@crave.test`    | Driver                                              |

### Seeded test data

- **7 restaurants**: Spice Garden, Milano Artisanal Pizzeria, Meghana Biryani House, Rameshwaram Tiffin Room, Zen Dimsum & Wok, Green Harvest Bowls, craveXP
- **18 menu items** with prices
- **7 Razorpay linked accounts** (6 restaurants + 1 driver)
- **Payment Config**: `razorpay_enabled: true`, `razorpay_route_enabled: true`, `razorpay_transfer_release: DELIVERY_COMPLETE`

### Admin configuration

Go to http://localhost:3000/admin/payment-config to toggle:

| Setting                        | Purpose                              |
| ------------------------------ | ------------------------------------ |
| Enable Razorpay Checkout       | Turn Razorpay on/off for checkout    |
| Enable Route Split Settlements | Turn Razorpay Route transfers on/off |

### Test Mode credentials

The `.env.test` file contains Test Mode Razorpay API keys:

```
RAZORPAY_KEY_ID=rzp_test_TrT8Pg6Vpsi18B
RAZORPAY_KEY_SECRET=6tA1GzJZn74SUTcVmHsg2iQU
RAZORPAY_WEBHOOK_SECRET=0d13271f854eb210d5d62a14bedfr8df4f1d948f9b6r4rbb53a7d0d496v139g6
RAZORPAY_ENABLED=true
RAZORPAY_ROUTE_ENABLED=true
```

**Test Mode only.** Enable live payments only after Razorpay Route is approved for your merchant account and the Test Mode checklist in `docs/payment/crave_razorpay_full_implementation.md` passes.

### Razorpay implementation files

| File                                        | Purpose                                                                                                                       |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `lib/payments/razorpay-client.ts`           | Server-only Razorpay SDK wrapper with kill switches                                                                           |
| `app/api/payments/razorpay/order/route.ts`  | Create Razorpay checkout order (amount from canonical snapshot)                                                               |
| `app/api/payments/razorpay/verify/route.ts` | HMAC-SHA256 signature + provider payment verification                                                                         |
| `app/api/webhooks/razorpay/route.ts`        | Dedicated webhook with durable `WebhookEvent` idempotency                                                                     |
| `lib/payments/razorpay-split.ts`            | Route split transfers to restaurant/driver linked accounts                                                                    |
| `app/api/payment-config/route.ts`           | Exposes `razorpayEnabled` / `razorpayRouteEnabled` flags                                                                      |
| `lib/catalog/payment-config.ts`             | `PaymentConfig` type with Razorpay fields                                                                                     |
| `lib/dal/payments.ts`                       | `upsertPaymentConfig` accepts Razorpay flags                                                                                  |
| `app/admin/payment-config/page.tsx`         | Admin toggles for Razorpay Checkout + Route                                                                                   |
| `customer_app/src/razorpay.ts`              | Razorpay Checkout integration                                                                                                 |
| `prisma/schema.prisma`                      | `total_amount_paise`, `amount_paise`, `razorpay_order_id`, `RazorpayLinkedAccount`, `RazorpayTransfer`, `WebhookEvent` models |

---

### Local processes (no Docker)

Need Node 20+, pnpm 12.3.4, Redis, and PostgreSQL (Neon or local).

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:push
pnpm db:seed          # optional: scripts/seed-local-db.ts
# pnpm db:seed:full   # optional: scripts/seed-complete-data.ts
pnpm db:admin         # create / reset admin (scripts/create-admin.ts)

pnpm dev              # Next on :3000
pnpm dev:ws           # WebSocket on :8000
```

For local WS without Compose, set `WS_HOST=localhost` so `server.js` proxies upgrades to the local WS process.

### Environment

See `.env.example`. Required in production:

| Variable                                  | Purpose                                     |
| ----------------------------------------- | ------------------------------------------- |
| `DATABASE_URL`                            | Prisma / Postgres (pooled Neon URL is fine) |
| `JWT_SECRET`                              | Token signing                               |
| `REDIS_URL`                               | Cache, locks, JWT blacklist, WS fan-out     |
| `WS_INTERNAL_SECRET`                      | Auth for `/__ws/broadcast`                  |
| `WS_PORT` / `WS_HOST`                     | WS listen address and frontend proxy target |
| `WS_BROADCAST_PORT` / `WS_BROADCAST_HOST` | HTTP broadcast fallback from Next → WS      |
| `NEON_BUCKET_UPLOADS`                     | Object storage bucket name (optional)       |

`REDIS_REQUIRED=true` makes `/api/health` return 503 if Redis is down.

### Native app configuration

Each native app has its own Vite/Capacitor workspace:

```text
admin_app/      Admin dashboard, CraveXP catalog and barcode scanner
driver_app/     Driver operations, GPS and delivery workflow
restaurant_app/ Restaurant kitchen, orders and menu management
customer_app/   Customer restaurant and CraveXP shopping experience
```

Build or synchronize an individual app with `pnpm --dir <app> build` or
`pnpm --dir <app> sync`. Use `pnpm build:android` to build all debug APKs and refresh the
checksums/update manifest. Camera access is declared by the Admin Android manifest and is requested
when the product scanner starts; Android Settings may be required after a permanent denial.

---

## Scripts

### App

```bash
pnpm dev            # node server.js
pnpm dev:ws         # node ws-server.js
pnpm build          # turbo → next build
pnpm start / start:ws
pnpm typecheck
pnpm rebuild        # prisma generate && build
```

### Database

```bash
pnpm db:generate
pnpm db:push
pnpm db:studio
pnpm db:admin
pnpm db:seed
pnpm db:seed:full
```

### Quality

```bash
pnpm test           # node:test via tsx (`test/*.test.ts`)
pnpm test:db        # the same suites with the database-backed cases enabled
pnpm format
pnpm format:check
```

`pnpm test` runs the unit suites. The suites that need a real database (order races, coupon
limits, the idempotency constraint) are skipped unless `ALLOW_DATABASE_TESTS=true`, which
`pnpm test:db` sets. The database tests create and remove their own fixtures, so they are safe to
run against a scratch database.

### Load tests

There is a single load test script, `load-tests/app-load-test.js`, and the app is selected with
`--app` (required). The target URL, the WebSocket URL, the load profile and the seed credentials
are CLI flags too. The WebSocket URL is derived from `--url` when it is not given, so
`https://host` becomes `wss://host/api/ws`.

```bash
pnpm load-test -- --app customer --url http://localhost:3000
pnpm load-test:ci -- --app driver --url http://localhost:3000   # also writes load-test-results.json
pnpm load-test --help                                          # every available flag
pnpm loadtest:gps                                              # tsx scripts/gps-load-test.ts
```

**Load profiles** — the default is a moderate two-minute ramp that is safe against a dev machine:

| Flag                   | Profile                                             |
| ---------------------- | --------------------------------------------------- |
| _(default)_            | `30s → 10 VUs`, `1m → 50 VUs`, `30s → 0`            |
| `--smoke`              | `5s → 3 VUs`, `5s → 0` — proves the setup works     |
| `--full`               | the production ramp, up to 1000 VUs over ~8 minutes |
| `--stages`             | your own ramp, e.g. `--stages "30s:20,1m:0"`        |
| `--duration` + `--vus` | a single stage, e.g. `--duration 2m --vus 100`      |

When the test credentials for the selected app are missing, the runner asks for them
interactively — the email is shown, the password is masked, and pressing Enter skips that role:

```
Test credentials for customer (press Enter to skip):
  The account has to exist in the target database.

  customer email: tester@example.com
  password: ************
```

Any account that exists in the target database works — there is no need to seed one. If the
account is rejected, the run says so once and skips that role's authenticated scenarios instead
of reporting them as failures, so the benchmark still measures everything that did answer. Pass
`--strict-auth` (CI does) to turn a rejected login into a failed benchmark.

Use `--env-file`, the `--*-email` / `--password` flags, or the `SEED_*` environment variables to
supply the credentials non-interactively.

Before the run starts, the target is probed on `/api/health` using the **IPv4** address, because
k6 resolves `localhost` over IPv4 only. If the target does not answer, the run stops immediately
with the reason and the URLs that usually work — instead of filling the log with connection
errors. A Vite dev server that only binds to `::1` is detected and the run continues on the IPv6
address automatically.

### Local topology

| Process                                        | URL                           | Serves                                    |
| ---------------------------------------------- | ----------------------------- | ----------------------------------------- |
| Next.js API (`pnpm start`)                     | `http://localhost:3000`       | `/api/*` against the local database       |
| WebSocket server (`pnpm start:ws`)             | `http://localhost:8000`       | `/api/ws` realtime channel                |
| App dev server (`pnpm --dir customer_app dev`) | `http://localhost:5173`       | the app, proxying `/api` to the local API |
| Load test                                      | `--url http://localhost:3000` | the local API directly                    |
| Load test                                      | `--url http://localhost:5173` | the API through the dev-server proxy      |

The dev servers listen on every interface (`host: true`), so `127.0.0.1`, `localhost` and a
phone on the same network all reach them. Their `/api` proxy targets the local backend by
default; set `VITE_API_BASE_URL` to point somewhere else.

The WebSocket server is a separate process, so the runner always talks to it on `WS_PORT`
(8000 by default) instead of deriving it from the target URL. If it is not running, the runner
says so and the socket scenarios are skipped.

```bash
pnpm start                                  # backend on :3000
pnpm start:ws                               # websockets on :8000
pnpm --dir customer_app dev                 # app on :5173
pnpm load-test -- --app customer --url http://localhost:5173/
```

| `--app`      | Scenarios it exercises                                                                        |
| ------------ | --------------------------------------------------------------------------------------------- |
| `customer`   | restaurants, menus, addresses, price calculator, order creation, order list, order socket     |
| `driver`     | duty status, offers, assigned orders, GPS updates, trip transitions, payouts, location socket |
| `restaurant` | order queue, menu items, kitchen transitions, settlements, vendor socket                      |
| `admin`      | stats, users, coupons, settlements, payment reviews, XP products                              |
| `all`        | every app above in a single run                                                               |

```bash
# Smoke profile against production
pnpm load-test -- --app customer --url https://crave.apexonestudio.com --smoke

# Custom profile, JSON output, no authenticated scenarios
pnpm load-test -- --app all --url http://localhost:3000 --stages "30s:20,1m:0" --out results.json --no-auth

# With seed credentials (read from a KEY=VALUE file)
pnpm load-test -- --app customer --url http://localhost:3000 --env-file load-tests/.env
```

The authenticated scenarios (order creation, admin stats, vendor coupons, driver socket) only run
when `SEED_PASSWORD` and the matching `SEED_*_EMAIL` values are available. Without them the run
covers the public endpoints only and the report states per app whether it was `authenticated`,
`login failed` or `public only` — it never aborts.

### Abuse & concurrency tests

A separate suite asks a different question: _if a real user hammers this path, does the system
stay correct?_ It covers double-clicks, timeouts with retries, concurrent users competing for
the last unit of an item, credential stuffing, delivery-OTP guessing and websocket floods.

```bash
pnpm start                                    # API on :3000
pnpm start:ws                                 # realtime on :8000
pnpm abuse-test -- --url http://localhost:3000 --env-file load-tests/.env
pnpm abuse-test -- --case double-click --url http://localhost:3000
```

The report separates **integrity** failures (the data is wrong — a duplicate order, an oversold
item) from **usability** failures (the data is right but the customer is blocked). The matching
database-backed tests live in `test/concurrency.test.ts` and run with `pnpm test:db`. See
[`load-tests/abuse/README.md`](./load-tests/abuse/README.md) for the full case list.

### Docker helpers

```bash
pnpm dc:up | dc:down | dc:ps | dc:logs
pnpm dc:restart              # frontend + backend only
pnpm dc:rebuild              # rebuild frontend + backend, keep Redis volume
pnpm dc:clean                # down -v (wipes Redis volume)
```

---

## CI

`.github/workflows/ci.yml` on `main` / `develop` and PRs:

1. Prettier
2. `prisma generate` + `tsc --noEmit`
3. `node:test` against ephemeral Postgres 16 + Redis
4. Next.js production build
5. k6 load test (after build) and the abuse / concurrency suite
6. Dependency audit

---

## Documentation

| Doc                                                                                                    | Contents                                                                                            |
| ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [docs/API_REVIEW_REPORT.md](docs/API_REVIEW_REPORT.md)                                                 | API inventory, smoke-test analysis (12 Oct 2026), optimized flows                                   |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                                                           | System topology (some diagrams still show an in-Compose Postgres service; Compose itself uses Neon) |
| [docs/PRD.md](docs/PRD.md)                                                                             | Product / roles                                                                                     |
| [docs/app_flow_documentation/APP_FLOW_AND_RULES.md](docs/app_flow_documentation/APP_FLOW_AND_RULES.md) | Page catalog and order rules                                                                        |
| [docs/REALTIME_API_ARCHITECTURE.md](docs/REALTIME_API_ARCHITECTURE.md)                                 | HTTP + WS channel matrix                                                                            |
| [docs/commercial-engine.md](docs/commercial-engine.md)                                                 | Vendor commercial contracts                                                                         |
| [docs/billing/BILLING_ARCHITECTURE.md](docs/billing/BILLING_ARCHITECTURE.md)                           | Finance module map                                                                                  |
| [docs/billing/PRICING_AND_FEE_SPECIFICATION.md](docs/billing/PRICING_AND_FEE_SPECIFICATION.md)         | Fees and GST                                                                                        |
| [docs/billing/FINANCIAL_LEDGER_SPECIFICATION.md](docs/billing/FINANCIAL_LEDGER_SPECIFICATION.md)       | Ledger accounts                                                                                     |
| [docs/billing/PAYMENT_AND_REFUND_STATE_MACHINE.md](docs/billing/PAYMENT_AND_REFUND_STATE_MACHINE.md)   | Payment states                                                                                      |
| [docs/billing/SETTLEMENT_AND_RECONCILIATION.md](docs/billing/SETTLEMENT_AND_RECONCILIATION.md)         | Vendor / rider settlement                                                                           |
| [docs/billing/TAX_RULE_MATRIX.md](docs/billing/TAX_RULE_MATRIX.md)                                     | Tax matrix                                                                                          |
| [docs/financial-integrity.md](docs/financial-integrity.md)                                             | Money invariants                                                                                    |
| [load-tests/abuse/README.md](load-tests/abuse/README.md)                                               | The abuse / concurrency suite: cases, failure kinds, how to run it                                  |
| [android-builds/README.md](android-builds/README.md)                                                   | The published APKs, the release flow and the version-number rules                                   |

---

## License

Private and proprietary. All rights reserved.

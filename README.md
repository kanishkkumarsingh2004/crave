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

**Customer** — restaurant explore + CraveXP grocery, cart, UPI collect + 12-digit UTR, live tracking, dual tax invoices (`components/InvoiceModal.tsx`).

**Vendor** — live kitchen / picker desk, Accept → Prepare → Pack → Ready, menu and stock.

**Driver** — online/offline, H3 dispatch offers, GPS broadcast, 4-digit delivery OTP, wallet / payouts / incentives.

**Admin** — KPIs, UTR review queue, coupons, vendor settlements, payment/fee config, live H3 map (`/admin/map-live-analytics`).

The native shells are self-contained Capacitor React apps rather than remote website wrappers.
The Admin app includes CraveXP product barcode scanning and standard update/order/system
notifications; it does not expose a custom audience notification composer. The Restaurant app has
five tabs (Home, Orders, Menu, Sales, Settings); its standalone Profile tab is removed. Current
APK versions and SHA-256 values are maintained in [`android-builds/version.json`](./android-builds/version.json).

---

## Core systems

### Auth

- Passwords: `scrypt` with per-user salt.
- Sessions: HS256 JWTs (`jose`), 7-day expiry, HTTP-only cookies.
- Redis JTI / user blacklist for logout and logout-all. If `REDIS_URL` is set and Redis is down, production **rejects** tokens (fail closed).
- Test auth headers are blocked when `NODE_ENV=production` unless `CI` is set.

### Orders and payments

Canonical status machine (`lib/order-state-machine.ts`):

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

---

## Repository layout

```
app/                    Next.js App Router pages and route handlers
  api/                  REST: auth, orders, dispatch, driver, admin, calculator, …
  admin|driver|user|vendor/
components/             Shared UI + role dashboards
lib/
  dal/                  Prisma data access
  finance/              Canonical pricing, tax, ledger
  dispatch/             H3 search, driver tracker, locks
  order-state-machine.ts
  jwt.ts, api-auth.ts, proxy.ts (edge/page guard lives at repo root)
prisma/schema.prisma
ws-server.js            Standalone WebSocket process
server.js               Custom Next HTTP server + WS upgrade proxy
workers/                PWA / driver location stream workers
test/                   Jest suites
load-tests/             k6 scripts
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
pnpm test           # Jest (`test/**/*.test.{ts,tsx}`)
pnpm test:watch
pnpm test:coverage
pnpm format
pnpm format:check
```

### Load tests

```bash
pnpm load-test      # k6 load-tests/checkout-load-test.js
pnpm load-test:ci
pnpm loadtest:gps   # tsx scripts/gps-load-test.ts
```

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
3. Jest against ephemeral Postgres 16 + Redis
4. Next.js production build
5. k6 load test (after build)
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

---

## License

Private and proprietary. All rights reserved.

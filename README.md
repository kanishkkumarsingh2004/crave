# Crave — Next-Gen Multi-Vendor Food & Dark Store Delivery Platform

> **Production Ready Platform** · **100% Test Coverage Pass Rate (43/43 Test Suites, 246/246 Green Tests)** · **Uber H3 Geospatial Hex Dispatch** · **100% Server-Driven Real-Time WebSocket Engine**

Crave is a full-stack, enterprise-grade multi-vendor food delivery and **CraveXP 10-Minute Dark Store Grocery** platform built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL 16**, **Prisma ORM**, **Uber H3 Geospatial Indexing (`h3-js`)**, **MapLibre GL**, and a dedicated **Native Standalone WebSocket Server (`ws-server.js`)**.

---

## 📸 Architecture & System Topology

```
                         Docker Compose Environment
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  ┌──────────────────┐    HTTP / REST API    ┌─────────────────────────┐ │
│  │  crave-frontend  │◄─────────────────────►│     crave-backend       │ │
│  │  Next.js 16      │  Bi-directional WS    │  Standalone WS Server   │ │
│  │  Port :3000      │                       │  Port :8000             │ │
│  └────────┬─────────┘                       └────────────▲────────────┘ │
│           │                                              │              │
│           │  ws://host:8000/api/ws                       │              │
│           └──────────────────────────────────────────────┼──────────────┤
│                                                          │              │
│           POST Broadcast: /__ws/broadcast                │              │
│           (Triggered on live DB mutations)              │              │
│                                                          │              │
│           ┌──────────────────────────────────────────────┴────────────┐ │
│           │                     crave-postgres                        │ │
│           │                  PostgreSQL 16 Engine                     │ │
│           │                  Port :5433 (Host) / :5432 (Internal)     │ │
│           └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features & Multi-Role Portals

### 🛍️ 1. Customer Ordering & Checkout (`/user/*`)

- **Dual-Engine Storefront**: Switch seamlessly between **Restaurant Food Delivery** and **CraveXP 10-Minute Dark Store Grocery Express**.
- **Dynamic Pricing Engine**: Automated distance-based fare calculation, surge pricing (Rush Hour / Rain Mode / Night Surge), platform service fee, handling charges, and promo code validation.
- **Interactive Map Pinning**: Precision delivery location selector using MapLibre GL with smooth camera fly-to centering.
- **Saved Address Management**: Save multiple addresses with custom labels, map coordinates, and primary default flags.
- **UPI UTR Reference Verification**: Instant 12-digit UTR payment submission with live 3-minute verification status updates.
- **Real-Time Order Tracking**: Multi-stage progress tracking (_Submitted → Confirmed → Cooking → Rider En Route → Delivered_) with live driver GPS movement broadcasting on MapLibre GL maps.

### 🏪 2. Kitchen Vendor & Dark Store Manager Console (`/vendor/*`)

- **Live Kitchen Order Manager**: Real-time incoming order popup banners and audio chimes, step-by-step order state progression (_Accept → Prepare → Pack → Ready for Pickup_).
- **Instant WebSocket Sync**: Real-time kitchen queue updates without manual page refreshes.
- **Catalog & SKU Management**: Add, edit, in-stock toggle, and delete menu items and dark store inventory SKUs.
- **Coupons & Promotional Engine**: Create store-specific or platform-wide discount codes.
- **CraveXP Express Terminal**: Dedicated dark store order dispatch interface for 10-minute grocery packing.

### 🛵 3. Delivery Partner Fleet Cockpit (`/driver/*`)

- **Duty Toggle & Radar Scanning**: Online/Offline toggle with real-time driver spatial indexing.
- **Live Dispatch Popups**: Real-time order dispatch modal with audio chime, pickup kitchen, delivery zone, trip distance, and calculated driver payout share.
- **Live GPS Route Navigation**: Turn-by-turn route tracking and live GPS coordinate broadcasting.
- **Handshake 4-Digit OTP Verification**: Secure delivery completion requiring customer OTP input.
- **Instant Wallet & Earnings Log**: Real-time trip history and instant UPI cashout logs.

### 🛡️ 4. Master Admin Command Center (`/admin/*`)

- **Platform Analytics & Financial Overview**: Live aggregated stats for total revenue, active orders, live devices, vendor payouts, and net commission profit.
- **Uber H3 Geospatial Hex Analytics (`/admin/map-live-analytics`)**:
  - Full-screen interactive MapLibre map with toggleable **Uber H3 Hexagonal Grid** overlay (Resolution 8).
  - Real-time driver density calculation per hex cell.
  - Interactive cell inspection modal on click showing active driver counts, status, and cell IDs.
- **Live User & Vendor Management**: Onboard new vendors, review customer signups in real time, and delete vendor accounts cleanly.
- **Payment Review Queue (UTR Verification)**: Live review interface to verify or reject customer 12-digit UPI UTR transactions.
- **Vendor Settlements & Disbursal**: Weekly net payout calculation, commission percentage audit, and manual settlement disbursals.
- **Dynamic Pricing & Surge Playground**: Interactive pricing simulator to test real-time fee breakdowns, surge multipliers, vendor commission cuts, and guaranteed driver delivery payouts.
- **Coupons & Store Restrictions**: Create global or store-restricted promo codes with a multi-store selector popup modal.

---

## 🔷 Uber H3 Geospatial Dispatch Engine

Crave features an **Uber H3 Hierarchical Hexagonal Geospatial Indexing** system (`h3-js`) for location-aware driver dispatch:

1. **Driver Indexing**: Every driver's GPS location (`lat`, `lng`) is indexed into an H3 hexagonal cell (Resolution 8, ~0.737 km² per cell).
2. **Geofenced Dispatch**: Pickup requests target candidate drivers within the pickup location's H3 cell and expanding `k-ring` concentric hexagonal rings.
3. **Atomic Offer Locking**: In-memory atomic locking prevents duplicate offer assignments across drivers.

---

## 🏗️ Architectural Proof: Persistent Stateful Server vs. Serverless

Crave is engineered to run on a **dedicated, stateful Node.js server container environment** rather than stateless serverless functions (like Vercel Lambdas or AWS Lambda).

| Architectural Feature      | Crave Implementation                                  | Serverless Lambdas (Vercel/AWS)                      | Benefit                                |
| :------------------------- | :---------------------------------------------------- | :--------------------------------------------------- | :------------------------------------- |
| **Server Process**         | Persistent Node.js Server (`server.js`)               | Ephemeral (Spun down after request)                  | **Zero Cold Starts**                   |
| **Real-time WebSockets**   | Native Standalone TCP WS Server (`ws-server.js`)      | Impossible (Requires external 3rd party like Pusher) | **Zero Extra Cost / Native Latency**   |
| **Active Heartbeat Loops** | Persistent 30s `setInterval` Ping Loop                | Suspended on Idle                                    | **Reliable Socket Maintenance**        |
| **Containerization**       | Multi-Container Docker Compose (`docker-compose.yml`) | Zip / Lambda Function Bundles                        | **100% Production Environment Parity** |
| **DB Connection Pool**     | Direct TCP PostgreSQL Pool                            | Requires HTTP Data Proxy                             | **Higher Query Throughput**            |

---

## 📦 Services & Container Matrix

| Service              | Container Name   | Internal Port | External Port | Command / Entrypoint |
| :------------------- | :--------------- | :------------ | :------------ | :------------------- |
| **Frontend Web App** | `crave-frontend` | `3000`        | `3000`        | `node server.js`     |
| **WebSocket Engine** | `crave-backend`  | `8000`        | `8000`        | `node ws-server.js`  |
| **Database Init**    | `crave-db-init`  | N/A           | N/A           | `prisma db push`     |
| **PostgreSQL 16**    | `crave-postgres` | `5432`        | `5433`        | `postgres:16-alpine` |

---

## 🛠️ Quick Start (Docker Deployment)

The fastest way to spin up the full production stack is using Docker Compose:

```bash
# 1. Clone the repository & navigate to directory
git clone https://github.com/your-repo/crave.git
cd crave

# 2. Copy environment variables file
cp .env.example .env

# 3. Launch the containerized production stack
pnpm dc:up
```

Access services at:

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **WebSocket Backend**: `ws://localhost:8000/api/ws`
- **PostgreSQL Database**: `localhost:5433` (`crave_db`)

### Useful Docker & Development Lifecycle Commands

```bash
# Rebuild application preserving database state
pnpm rebuild

# Launch interactive Prisma Studio GUI database manager
pnpm db:studio

# Create or update Master Admin credentials safely
pnpm db:admin

# Rebuild Docker containers (preserves DB volume)
pnpm dc:rebuild

# View real-time container logs
pnpm dc:logs

# Check running container status
pnpm dc:ps

# Stop all Docker services
pnpm dc:down
```

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v9.0.0 or higher
- **PostgreSQL**: Running locally on port `5432` (or adjust `DATABASE_URL`)

### Installation Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment file
cp .env.example .env

# 3. Push Prisma schema & seed initial database records
pnpm db:push
pnpm db:seed

# 4. Start Next.js Frontend Server (Port 3000)
pnpm dev

# 5. In a separate terminal, start the WebSocket backend (Port 8000)
WS_PORT=8000 node ws-server.js
```

---

## 🧪 Automated Test Suite Execution

Crave includes a comprehensive **Jest + React Testing Library** test suite verifying database access layers (DAL), API routes, JWT authentication, H3 dispatch, and WebSocket hooks.

```bash
# Run complete test suite (43 Test Suites, 246 Tests Passing)
pnpm test

# Run tests with coverage report
pnpm test:coverage

# Run specific test file
npx jest test/api/orders/post.test.ts
```

---

## 📋 Comprehensive API Route Catalog

| Endpoint Route                  | Methods                          | Auth / Role     | Description                                                                            |
| :------------------------------ | :------------------------------- | :-------------- | :------------------------------------------------------------------------------------- |
| `/api/auth/signup`              | `POST`                           | Public          | Register new user, vendor, or driver account                                           |
| `/api/auth/login`               | `POST`                           | Public          | Authenticate credentials & issue HTTP-only JWT cookie                                  |
| `/api/auth/me`                  | `GET`                            | Authenticated   | Fetch active user profile and current session role                                     |
| `/api/auth/logout`              | `POST`                           | Public          | Invalidate auth cookie session                                                         |
| `/api/restaurants`              | `GET`, `POST`, `PATCH`           | Role Scoped     | List restaurants, create store, or toggle kitchen open status                          |
| `/api/menu-items`               | `GET`, `POST`, `PATCH`, `DELETE` | Vendor / Admin  | Manage menu items and inventory SKUs                                                   |
| `/api/orders`                   | `GET`, `POST`, `PATCH`           | Authenticated   | Create order with billing breakdown, update status, complete drop with OTP             |
| `/api/cravexp/catalog`          | `GET`, `POST`                    | Public / Vendor | Fetch 10-minute dark store grocery catalog                                             |
| `/api/admin/stats`              | `GET`                            | Admin           | Aggregated database revenue, order counts, and live metrics                            |
| `/api/admin/map-live-analytics` | `GET`                            | Admin           | Fetch H3 cell driver density, active orders, and live driver GPS positions             |
| `/api/admin/payment-reviews`    | `GET`, `PATCH`                   | Admin           | Review, approve, or reject customer UPI UTR payment references                         |
| `/api/admin/settlements`        | `GET`, `POST`                    | Admin           | Calculate vendor commission splits and disburse settlements                            |
| `/api/admin/coupons`            | `GET`, `POST`, `PATCH`, `DELETE` | Admin           | Create promo codes with store applicability restrictions                               |
| `/api/admin/create-vendor`      | `POST`                           | Admin           | Onboard new kitchen or dark store vendor                                               |
| `/api/admin/delete-vendor`      | `POST`                           | Admin           | Remove vendor and associated menu items cleanly                                        |
| `/api/admin/users`              | `GET`                            | Admin           | List all registered users, vendors, and drivers                                        |
| `/api/dispatch/candidates`      | `POST`                           | System / Driver | Search candidate drivers within H3 hexagonal radius rings                              |
| `/api/dispatch/request`         | `POST`                           | System / Driver | Issue atomic dispatch offer to candidate driver                                        |
| `/api/driver/accept`            | `POST`                           | Driver          | Accept assigned dispatch offer and mark driver on trip                                 |
| `/api/driver/location`          | `POST`                           | Driver          | Update driver GPS coordinates and re-index into H3 cell                                |
| `/api/user/addresses`           | `GET`, `POST`, `DELETE`          | Customer        | Manage customer saved delivery addresses & MapLibre coordinates                        |
| `/api/user/update`              | `PATCH`                          | Customer        | Update user name, phone, or address profile                                            |
| `/api/payment-config`           | `GET`, `POST`                    | Admin           | Configure platform fee, base delivery rate, surge multipliers, and driver payout share |
| `/api/health`                   | `GET`                            | Public          | Healthcheck endpoint for Docker & load balancers                                       |

---

## 🔒 Security & Best Practices

- **Password Hashing**: Secure `scrypt` hashing with unique salt generation.
- **JWT Authentication**: `jose` JWT tokens signed with secret key, stored in `HTTPOnly`, `SameSite=Lax` cookies.
- **Role-Based Access Control**: Middleware enforcement for `user`/`customer`, `restaurant_vendor`, `cravexp_store_vendor`, `rider`/`driver`, and `admin`.
- **Prepared Statements**: Prisma ORM parameterized queries preventing SQL injection.

---

## 📄 License

Private — All Rights Reserved. Built for **Crave Food & Dark Store Delivery Platform**.

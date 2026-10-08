# Crave — Next-Gen Multi-Vendor Food & Dark Store Delivery Platform

> **Production Ready Platform** · **100% Test Coverage Pass Rate (48/48 Test Suites, 263/263 Green Tests)** · **Uber H3 Geospatial Hex Dispatch** · **100% Server-Driven Real-Time WebSocket Engine**

Crave is an enterprise-grade multi-vendor food delivery and **CraveXP 10-Minute Dark Store Grocery** platform built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL 16**, **Prisma ORM**, **Uber H3 Geospatial Indexing (`h3-js`)**, **MapLibre GL**, and a dedicated **Native Standalone WebSocket Server (`ws-server.js`)**.

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
│           (Async trigger on live DB mutations)           │              │
│                                                          │              │
│           ┌──────────────────────────────────────────────┴────────────┐ │
│           │                     crave-postgres                        │ │
│           │                  PostgreSQL 16 Engine                     │ │
│           │                  Port :5433 (Host) / :5432 (Internal)     │ │
│           └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 💡 What This Codebase Is Used For

Crave powers an end-to-end multi-party food & grocery delivery ecosystem across 4 dedicated web portals and specialized APIs:

### 🛍️ 1. Customer Portal (`/user/*`)

- **Dual-Engine Storefront**: Switch between **Restaurant Food Delivery** and **CraveXP 10-Minute Dark Store Grocery Express**.
- **Coupons Engine with 1-Click Popup Modal**: Interactive modal listing all available discount coupon codes (`CRAVE50`, `WELCOME100`, etc.) fetched directly from the database with individual **APPLY** buttons and eligibility thresholds.
- **Dynamic Billing Calculation**: Automatic distance-based delivery fees, surge pricing (Rain / Night Surge), packaging caps, service fees, and promo discounts.
- **Interactive Delivery Location Picker**: MapLibre GL map selector for doorstep address pin placement.
- **UPI UTR Reference Payment Verification**: Submit 12-digit UTR references with real-time status updates.
- **Live Order Tracking**: Stage-by-stage status progress (_Submitted → Verified → Preparing → Out for Delivery → Delivered_) with live rider GPS tracking on interactive maps.

### 🏪 2. Kitchen & Dark Store Vendor Console (`/vendor/*`)

- **Live Kitchen Order Desk**: Real-time incoming order audio chimes, stage progression buttons (_Accept → Prepare → Pack → Ready for Pickup_).
- **Zero-Polling Instant Sync**: Connected directly to WebSocket channels (`order_update`, `admin_orders`) for live queue updates without page refreshes.
- **Menu & Stock Editor**: Create, edit, toggle in-stock status, and manage item SKUs.
- **Vendor Store Discounts**: Manage store-specific promotional discount codes.

### 🛵 3. Delivery Partner Fleet Cockpit (`/driver/*`)

- **Duty Toggle & Geofenced Dispatch Radar**: Online/Offline status switch with Uber H3 spatial hex indexing.
- **Live Dispatch Popup Modals**: Order assignment popups with audio chime, pickup restaurant, delivery doorstep, trip distance, and calculated driver payout share.
- **Live GPS Broadcasting**: Real-time driver coordinate broadcasts pushed directly to admin and customer tracking maps.
- **Handshake 4-Digit OTP Confirmation**: Secure drop-off verification using customer OTP.
- **Wallet & Earnings Log**: Real-time trip earnings ledger and instant payout history.

### 🛡️ 4. Master Admin Command Center (`/admin/*`)

- **Platform Financial Analytics**: Real-time aggregate metrics for gross revenue, total orders, active users, vendor payouts, and net platform commissions.
- **Uber H3 Geospatial Hex Analytics (`/admin/map-live-analytics`)**: Full-screen MapLibre map overlay showing live driver density per H3 hexagonal cell (Resolution 8) with interactive cell inspection modals.
- **Payment UTR Verification Queue**: Live review interface to verify or reject customer 12-digit UPI UTR payment submissions.
- **Vendor Onboarding & Settlements**: Create vendor accounts, calculate weekly net payouts, and disburse settlements.
- **Coupons & Restrictions Manager**: Create platform-wide or store-restricted promo codes.

---

## 🔷 Uber H3 Geospatial Dispatch Engine

Crave features an **Uber H3 Hierarchical Hexagonal Geospatial Indexing** system (`h3-js`) for location-aware driver dispatch:

1. **Driver Indexing**: Driver GPS positions (`lat`, `lng`) are indexed into H3 hexagonal cells (Resolution 8, ~0.737 km² per cell).
2. **Geofenced Radius Dispatch**: Pickup requests locate candidate drivers within the pickup location's H3 cell and expanding `k-ring` concentric rings.
3. **Atomic Offer Locking**: Prevents duplicate offer assignments across active drivers.

---

## 📦 Docker Container Services Matrix

| Service              | Container Name   | Internal Port | External Port | Command / Entrypoint         |
| :------------------- | :--------------- | :------------ | :------------ | :--------------------------- |
| **Frontend Web App** | `crave-frontend` | `3000`        | `3000`        | `node server.js`             |
| **WebSocket Engine** | `crave-backend`  | `8000`        | `8000`        | `node ws-server.js`          |
| **Database Init**    | `crave-db-init`  | N/A           | N/A           | `prisma generate && db push` |
| **PostgreSQL 16**    | `crave-postgres` | `5432`        | `5433`        | `postgres:16-alpine`         |

---

## 📜 Full NPM & Docker Scripts Reference

Below is the complete catalog of executable scripts configured in `package.json`:

### 🛠️ Development & Production Server Scripts

```bash
# Start Next.js web application in development mode (Port 3000)
pnpm dev

# Start Standalone WebSocket backend server in development mode (Port 8000)
pnpm dev:ws

# Build optimized Next.js production bundle
pnpm build

# Regenerate Prisma client and rebuild Next.js production bundle
pnpm rebuild

# Start Next.js web application in production mode
pnpm start

# Start Standalone WebSocket backend server in production mode
pnpm start:ws

# Execute fast TypeScript type validation across codebase
pnpm typecheck
```

### 🗄️ Database Management Scripts

```bash
# Push Prisma schema to PostgreSQL database
pnpm db:push

# Open interactive Prisma Studio GUI database browser
pnpm db:studio

# Create or update Master Admin credentials
pnpm db:admin
```

### 🐳 Docker Container & Code Sync Scripts (Safe for DB Data)

```bash
# Launch containerized stack in background (Keeps DB data safe)
pnpm dc:up

# Stop all running Docker services (Keeps DB data safe)
pnpm dc:down

# Restart app containers (Frontend & Backend) without touching PostgreSQL or db-init
pnpm dc:restart

# Restart entire stack (including PostgreSQL)
pnpm dc:restart:all

# Rebuild Frontend & Backend containers with fresh code without touching PostgreSQL or running db-init
pnpm dc:rebuild

# Force-rebuild Next.js frontend container with fresh local code
pnpm dc:rebuild:frontend

# Force-rebuild WebSocket backend container with fresh local code
pnpm dc:rebuild:backend

# Rebuild entire stack including schema sync (keeps DB data safe)
pnpm dc:rebuild:all

# DANGER: Stop containers and delete persistent PostgreSQL database volume
pnpm dc:clean

# DANGER: Wipe database volume and force-rebuild all containers from scratch
pnpm dc:wipe-all

# Stream live real-time container logs
pnpm dc:logs

# Check running container status and port mappings
pnpm dc:ps
```

### 🧪 Testing & Code Quality Scripts

```bash
# Run full Jest unit & integration test suite (48 Test Suites, 263 Tests Passing)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Generate code coverage report
pnpm test:coverage

# Format codebase using Prettier
pnpm format

# Check formatting compliance
pnpm format:check
```

---

## 🚀 Quick Start (Docker Deployment)

Spin up the containerized production stack:

```bash
# 1. Clone repository
git clone https://github.com/your-repo/crave.git
cd crave

# 2. Copy environment configuration
cp .env.example .env

# 3. Launch Docker containers
pnpm dc:up
```

Access services:

- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **WebSocket Backend**: `ws://localhost:8000/api/ws`
- **PostgreSQL Database**: `localhost:5433` (`crave_db`)

---

## 💻 Local Development Setup (Without Docker)

### Prerequisites

- **Node.js**: v20.0.0 or higher
- **pnpm**: v9.0.0 or higher
- **PostgreSQL 16**: Running on port `5432`

### Setup Steps

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment file
cp .env.example .env

# 3. Push database schema to PostgreSQL
pnpm db:push

# 4. Start Next.js Web App (Terminal 1)
pnpm dev

# 5. Start Standalone WebSocket Server (Terminal 2)
pnpm dev:ws
```

---

## 🔒 Security & Best Practices

- **Password Hashing**: Secure `scrypt` hashing with unique salts.
- **JWT Authentication**: Signed `jose` JWTs in `HTTPOnly`, `SameSite=Lax` cookies.
- **Role-Based Access Control**: Strict access controls for `user`, `restaurant_vendor`, `cravexp_store_vendor`, `rider`, and `admin`.
- **Prepared Statements**: Prisma ORM parameterized queries protecting against SQL injection.

---

## 📄 License

Private & Proprietary — All Rights Reserved.

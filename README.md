# 🛵 Multi-Role Delivery Platform

An enterprise-grade, high-performance **Multi-Role Delivery Platform** monorepo designed for hyper-local food, grocery, and package delivery operations. Built with a modern TypeScript stack powering a **Next.js 15 Admin Web Application**, **React Native / Expo Mobile Apps** (Customer, Vendor, Driver), a **Shared Node.js/TS Backend Server**, and **PostgreSQL with Prisma ORM**.

---

## 📋 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Monorepo Architecture](#-monorepo-architecture)
3. [Domain Applications](#-domain-applications)
4. [Shared Packages](#-shared-packages)
5. [Database Schema & State Machines](#-database-schema--state-machines)
   - [Order State Machine](#order-state-machine)
   - [Delivery & Dispatch State Machine](#delivery--dispatch-state-machine)
6. [Prerequisites](#-prerequisites)
7. [Environment Configuration](#-environment-configuration)
8. [Local Development Setup](#-local-development-setup)
9. [Available Scripts & CI Pipeline](#-available-scripts--ci-pipeline)
10. [Native Mobile APK Building (EAS)](#-native-mobile-apk-building-eas)
11. [Docker & Containerized Setup](#-docker--containerized-setup)
12. [API Endpoint Reference](#-api-endpoint-reference)
13. [Realtime SSE & Push Notifications](#-realtime-sse--push-notifications)
14. [Testing Suite](#-testing-suite)
15. [License](#-license)

---

## 🚀 Platform Overview

The Multi-Role Delivery Platform provides an end-to-end ecosystem connecting four primary stakeholders:

```mermaid
graph TD
    Customer["🛒 Customer (Mobile App)"] -->|Places Order & Pays| Backend["⚡ Shared Backend / Next.js Server"]
    Vendor["🏪 Vendor (Mobile App)"] -->|Accepts & Prepares Order| Backend
    Driver["🚴 Driver (Mobile App)"] -->|Accepts Offer & Delivers| Backend
    Admin["👑 Admin (Next.js Web)"] -->|Manages Platform & Approvals| Backend
    Backend -->|PostgreSQL & Prisma| DB[(🛢️ PostgreSQL Database)]
    Backend -->|SSE & FCM Push| Realtime["📡 Realtime Event Bus & Notifications"]
```

### Core System Features

- **Strict Role-Based Access Control (RBAC)**: Enforces role permissions across `ADMIN`, `CUSTOMER`, `VENDOR`, and `DRIVER`.
- **Atomic Checkout & Server-Side Pricing**: Idempotent order processing with server-calculated subtotals, tax rates, delivery fees, and discount logic.
- **Single-Vendor Cart Enforcement**: Prevents cross-vendor product conflicts inside customer carts (`CART_VENDOR_CONFLICT`).
- **Automated Driver Dispatch Engine**: Auto-assigns available active drivers when orders enter `READY_FOR_PICKUP` status with expiration timers.
- **OTP Delivery Verification**: 6-digit numeric OTP code generated at pickup and verified at customer handover.
- **Provider-Agnostic Payment Engine**: Idempotent payment webhook ingestion (`PaymentEvent` deduplication) supporting Razorpay and Stripe.
- **Realtime Server-Sent Events (SSE)**: Live streaming endpoint for order status transitions and GPS driver tracking.
- **Audit Logging Engine**: Background audit logger capturing all platform mutation events.

---

## 🏗 Monorepo Architecture

Managed via **pnpm Workspaces** and **Turborepo** for optimized caching and fast build speeds.

```text
├── apps/
│   ├── admin-web/          # Next.js 15 App Router (Admin Web App + Server API Routes)
│   ├── customer-mobile/     # React Native / Expo SDK 57 Customer Mobile App
│   ├── vendor-mobile/       # React Native / Expo SDK 57 Vendor Mobile App
│   └── driver-mobile/       # React Native / Expo SDK 57 Driver Mobile App
├── packages/
│   ├── api-client/          # Shared HTTP client for mobile apps
│   ├── api-contracts/       # Shared TypeScript request/response contracts
│   ├── auth/                # Server-side & Client-side Better Auth setup
│   ├── config/              # Validated environment variables (Zod)
│   ├── constants/           # Platform-wide constants, error codes & config keys
│   ├── database/            # Prisma Client singleton & schema exports
│   ├── types/               # Platform TypeScript domain interfaces & enums
│   ├── ui/                  # Shared React Native component library
│   ├── utils/               # Pure helper functions (math, formatting, geometry)
│   └── validation/          # Shared Zod validation schemas
├── server/
│   ├── infrastructure/      # Standardized API response builders & storage
│   ├── middleware/          # Auth guards & sliding-window rate limiter
│   ├── modules/             # Business domain modules (catalog, orders, deliveries, etc.)
│   └── realtime/            # Event Emitter bus & SSE stream broadcaster
├── prisma/
│   ├── schema.prisma        # PostgreSQL database schema (22 models, 13 enums)
│   ├── seed.ts              # Database seeding script
│   └── migrations/          # Version-controlled SQL schema migrations
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # PostgreSQL database & server orchestration
├── turbo.json               # Turborepo task pipeline configuration
├── vitest.config.mts        # Vitest unit test runner config with monorepo aliases
└── pnpm-workspace.yaml      # Pnpm workspace package definition & build permissions
```

---

## 📱 Domain Applications

| Application           | Technology                                            | Role / Scope            | Primary Features                                                                                                                    |
| :-------------------- | :---------------------------------------------------- | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`admin-web`**       | Next.js 15, React 19, TailwindCSS, Recharts           | Platform Administrators | Dashboard analytics, user/vendor/driver approvals, audit logs, order monitoring, platform settings.                                 |
| **`customer-mobile`** | React Native, Expo SDK 57, Expo Router, Zustand       | Customers               | Product browsing, cart management, atomic checkout, live order tracking, address book, refund requests.                             |
| **`vendor-mobile`**   | React Native, Expo SDK 57, Expo Router, Zustand       | Store Owners            | Store open/close toggle, incoming order acceptance, preparation state machine, stock management, earnings.                          |
| **`driver-mobile`**   | React Native, Expo SDK 57, Expo Router, Expo Location | Delivery Drivers        | Availability toggle (`OFFLINE ↔ AVAILABLE`), order assignment offer accept/reject, OTP handover verification, GPS location updates. |

---

## 📦 Shared Packages

- **`@delivery/database`**: Prisma v6.19.3 client singleton and database migration exports.
- **`@delivery/auth`**: Better Auth server instance and client hooks.
- **`@delivery/config`**: Environment variable parsing using Zod (`env.DATABASE_URL`, `env.BETTER_AUTH_SECRET`).
- **`@delivery/constants`**: Magic numbers, error code definitions (`ERROR_CODES`), notification type keys.
- **`@delivery/validation`**: Input validation schemas (`zSignUpCustomer`, `zCreateOrder`, `zUpdateDriverLocation`).
- **`@delivery/types`**: Unified TypeScript interfaces, status enums, and API envelopes.
- **`@delivery/utils`**: Haversine geographic distance math, currency formatters, order number generators (`ORD-000001`).
- **`@delivery/api-contracts`**: Shared TypeScript API request & response payload schemas.
- **`@delivery/api-client`**: Type-safe HTTP client wrapper for React Native mobile apps.

---

## 🛢 Database Schema & State Machines

Powered by **PostgreSQL** and **Prisma ORM** containing 22 models:

- **Identity & Auth**: `User`, `Account`, `Session`, `Verification`
- **Domain Profiles**: `CustomerProfile`, `Address`, `Vendor`, `VendorDocument`, `Driver`, `DriverDocument`
- **Catalog & Inventory**: `Category`, `Product`, `ProductImage`, `Inventory`, `InventoryReservation`
- **Cart & Orders**: `Cart`, `CartItem`, `Order`, `OrderItem`, `OrderStatusHistory`
- **Delivery & Drivers**: `Delivery`, `DriverAssignment`, `DeliveryVerification`, `DriverLocation`, `DeliveryStatusHistory`
- **Financials & Reviews**: `Payment`, `PaymentEvent`, `PaymentStatusHistory`, `Refund`, `Review`, `PlatformSetting`, `AuditLog`

### Order State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Placed
    PENDING --> CONFIRMED: Payment Verified / Vendor Accepted
    CONFIRMED --> PREPARING: Kitchen Starts Prep
    PREPARING --> READY_FOR_PICKUP: Order Ready (Triggers Auto-Dispatch)
    READY_FOR_PICKUP --> PICKED_UP: Driver Collects Package
    PICKED_UP --> OUT_FOR_DELIVERY: Driver En Route
    OUT_FOR_DELIVERY --> DELIVERED: OTP Verified Handover
    PENDING --> CANCELLED: Customer / Admin Cancelled
    CONFIRMED --> CANCELLED: State-Aware Cancellation (Releases Stock)
    DELIVERED --> [*]
    CANCELLED --> [*]
```

### Delivery & Dispatch State Machine

```mermaid
stateDiagram-v2
    [*] --> ASSIGNING: Order Ready for Pickup
    ASSIGNING --> OFFERED: Driver Found
    OFFERED --> DRIVER_ACCEPTED: Driver Accepts (60s timer)
    OFFERED --> REJECTED: Driver Declines (Re-triggers Dispatch)
    DRIVER_ACCEPTED --> PICKUP_READY: Arrived at Vendor Store
    PICKUP_READY --> PICKED_UP: Collected Package
    PICKED_UP --> IN_TRANSIT: Departed Vendor
    IN_TRANSIT --> ARRIVING: Approaching Customer
    ARRIVING --> DELIVERED: Customer OTP Verified
```

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env` in the project root:

```env
# Database Connections (PostgreSQL setup)
DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/delivery_platform?schema=public"
DIRECT_DATABASE_URL="postgresql://postgres:postgrespassword@localhost:5432/delivery_platform?schema=public"

# Local Storage (Files & Images saved to ./data folder)
LOCAL_DATA_DIR="./data"
LOCAL_UPLOADS_DIR="./data/uploads"

# Better Auth Secret (Minimum 32 characters)
BETTER_AUTH_SECRET="supersecret32characterlongstringforbetterauth!"
BETTER_AUTH_URL="http://localhost:3000"

# Exposed Public Client API URL
NEXT_PUBLIC_API_URL="http://localhost:3000"

# Payment Gateways (Optional for dev mock mode)
RAZORPAY_KEY_ID="rzp_test_mock_key"
RAZORPAY_KEY_SECRET="rzp_test_mock_secret"
RAZORPAY_WEBHOOK_SECRET="rzp_test_webhook_secret"

# Push Notifications / FCM (Optional for dev simulator)
FCM_PROJECT_ID=""
FCM_PRIVATE_KEY=""
FCM_CLIENT_EMAIL=""
```

---

## 🛠 Local Development Setup

### 1. Prerequisites

- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 9.0.0`
- **PostgreSQL**: `>= 16` (or running via Docker Compose)
- **Git**: Installed and initialized

### 2. Installation

Clone the repository and install workspace dependencies:

```bash
pnpm install
```

### 3. Database Migration & Seeding

Ensure PostgreSQL is running (e.g. via `docker-compose up -d postgres`), then initialize the schema:

```bash
# Generate Prisma Client
pnpm prisma:generate

# Execute database migrations
pnpm prisma:migrate

# Seed database with demo data (categories, users, vendors, products)
pnpm prisma:seed
```

### 4. Start Development Servers

Start all web and mobile apps concurrently via Turborepo:

```bash
pnpm dev
```

Or run individual targets:

```bash
# Next.js Admin Web Dashboard & Server API (http://localhost:3000)
pnpm --filter admin-web dev

# Customer Mobile App (Expo Dev Server)
pnpm --filter customer-mobile start

# Vendor Mobile App (Expo Dev Server)
pnpm --filter vendor-mobile start

# Driver Mobile App (Expo Dev Server)
pnpm --filter driver-mobile start
```

---

## 📜 Available Scripts & CI Pipeline

| Command                | Description                                                                                     |
| :--------------------- | :---------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Start dev servers for all apps and packages in parallel via Turborepo.                          |
| `pnpm build`           | Run production build across all workspace packages and apps.                                    |
| `pnpm lint`            | Run ESLint across all 15 packages.                                                              |
| `pnpm typecheck`       | Execute TypeScript typechecking (`tsc --noEmit`) across the entire workspace.                   |
| `pnpm test`            | Run unit test suite using Vitest runner.                                                        |
| `pnpm format`          | Auto-format all source code files using Prettier.                                               |
| `pnpm format:check`    | Check code formatting compliance across the workspace.                                          |
| `pnpm prisma:generate` | Generate Prisma client bindings from `prisma/schema.prisma`.                                    |
| `pnpm prisma:migrate`  | Apply Prisma schema migrations to the target database.                                          |
| `pnpm prisma:seed`     | Seed database with initial platform categories, vendors, and demo users.                        |
| `pnpm db:reset`        | Reset and re-seed the PostgreSQL database.                                                      |
| `pnpm ci`              | Full CI verification pipeline (Format + Lint + Typecheck + Test + Prisma + Web & Mobile Build). |
| `pnpm ci:apk`          | Complete CI pipeline including native Android preview APK compilation.                          |
| `pnpm build:mobile`    | Export web and JavaScript bundles for all mobile apps (`expo export`).                          |
| `pnpm build:apk`       | Trigger local EAS Android preview APK builds for all 3 mobile apps.                             |

---

## 📱 Native Mobile APK Building (EAS)

Native Android APKs (`.apk`) are built locally using **Expo Application Services (EAS CLI)**.

### EAS Prerequisites

1. **Global EAS Tools**:
   ```bash
   npm install -g eas-cli eas-cli-local-build-plugin
   ```
2. **Git Repository**: EAS CLI requires a clean Git history snapshot (`git init` and commit).
3. **Expo Account & Project Linkage**:
   Each mobile app specifies a valid Expo project ID in its `app.json`:
   - `customer-mobile`: `ec4bb1e0-caa8-4a71-a1c0-fec27425ae18`
   - `driver-mobile`: `a9346614-e832-4ce5-a59f-b57005b91cea`
   - `vendor-mobile`: `1267d51d-aa93-4f45-8902-936462b34895`

### Building Android Preview APKs

To build an APK for a single mobile app:

```bash
# Build Customer Mobile APK
pnpm --filter customer-mobile build:apk

# Build Driver Mobile APK
pnpm --filter driver-mobile build:apk

# Build Vendor Mobile APK
pnpm --filter vendor-mobile build:apk
```

To build APKs for all mobile apps in sequence:

```bash
pnpm build:apk
```

---

## 🐳 Docker & Containerized Setup

Run the entire platform infrastructure (PostgreSQL database + Next.js Admin/API server) via Docker Compose:

### 1. Build and Launch Containers

```bash
docker-compose up --build -d
```

### 2. Check Container Status

```bash
docker-compose ps
```

### 3. Apply Migrations & Seed inside Container

```bash
docker-compose exec admin-web pnpm prisma:migrate:deploy
docker-compose exec admin-web pnpm prisma:seed
```

Access the Admin Web Dashboard & API at **`http://localhost:3000`**.

To stop container services:

```bash
docker-compose down -v
```

---

## 🔌 API Endpoint Reference

All API routes return standardized JSON envelopes (`ApiResponse<T>`):

### Authentication & Users

- `POST /api/auth/sign-in/email` — Authenticate user credentials.
- `POST /api/auth/sign-up/email` — Register customer account.
- `POST /api/auth/sign-out` — Terminate session.

### Catalog & Inventory

- `GET /api/v1/categories` — List active product categories.
- `GET /api/v1/products` — Filter products by category, vendor, or query.
- `POST /api/v1/vendor/products` — Create new vendor product listing.
- `PATCH /api/v1/vendor/inventory` — Update stock levels & threshold settings.

### Cart & Checkout

- `GET /api/v1/cart` — Fetch customer active cart with server-calculated totals.
- `POST /api/v1/cart/items` — Add item to cart (enforces single-vendor cart rule).
- `POST /api/v1/checkout` — Atomic checkout transaction with idempotency key.
- `POST /api/v1/customer/orders/{id}/cancel` — State-aware order cancellation.

### Driver & Dispatch Workflow

- `PATCH /api/v1/driver/availability` — Toggle driver status (`OFFLINE` / `AVAILABLE`).
- `GET /api/v1/driver/active-delivery` — Fetch active assigned delivery task.
- `POST /api/v1/deliveries/{id}/accept` — Accept assigned delivery offer.
- `POST /api/v1/deliveries/{id}/reject` — Decline delivery offer (re-triggers dispatch).
- `POST /api/v1/deliveries/{id}/complete` — Complete delivery via 6-digit OTP verification.
- `POST /api/v1/driver/location` — Throttled live GPS coordinate updates.

### Payments & Refunds

- `POST /api/v1/payments/initiate` — Initiate gateway order payment intent.
- `POST /api/v1/payments/verify` — Verify client gateway payment signature.
- `POST /api/v1/payments/webhook` — Idempotent webhook event processor (`PaymentEvent`).
- `POST /api/v1/customer/orders/{id}/refund-request` — Submit refund request.

### Realtime SSE Stream

- `GET /api/v1/realtime/stream` — Server-Sent Events stream for live order & delivery updates.

---

## 🧪 Testing Suite

The repository uses **Vitest** for fast unit and integration testing.

Run test suite:

```bash
pnpm test
```

Run TypeScript verification across all 15 packages:

```bash
pnpm typecheck
```

---

## 📄 License

This project is proprietary and confidential software.

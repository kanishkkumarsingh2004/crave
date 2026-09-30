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
9. [Docker & Containerized Setup](#-docker--containerized-setup)
10. [API Endpoint Reference](#-api-endpoint-reference)
11. [Realtime SSE & Push Notifications](#-realtime-sse--push-notifications)
12. [Testing Suite](#-testing-suite)
13. [Production Deployment](#-production-deployment)

---

## 🚀 Platform Overview

The Multi-Role Delivery Platform provides an end-to-end ecosystem connecting four primary stakeholders:

```mermaid
graph TD
    Customer["🛒 Customer (Mobile App)"] -->|Places Order & Pays| Backend["⚡ Shared Backend / Next.js Server"]
    Vendor["🏪 Vendor (Mobile & Web)"] -->|Accepts & Prepares Order| Backend
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
- **Audit Logging Engine**: Fire-and-forget background audit logger capturing all platform mutation events.

---

## 🏗 Monorepo Architecture

Managed via **pnpm Workspaces** and **Turborepo** for optimized caching and fast build speeds.

```text
├── apps/
│   ├── admin-web/          # Next.js 15 App Router (Admin Web App + Server API Routes)
│   ├── customer-mobile/     # React Native / Expo Customer Mobile App
│   ├── vendor-mobile/       # React Native / Expo Vendor Mobile App
│   └── driver-mobile/       # React Native / Expo Driver Mobile App
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
├── prisma/
│   ├── schema.prisma        # PostgreSQL database schema (22 models, 13 enums)
│   └── seed.ts              # Idempotent database seeding script
├── server/
│   ├── infrastructure/      # Standardized API response builders & logging
│   ├── middleware/          # Auth guards & sliding-window rate limiter
│   ├── modules/             # Business domain modules (catalog, orders, deliveries, etc.)
│   └── realtime/            # Event Emitter bus & SSE stream broadcaster
├── Dockerfile               # Multi-stage production container build
├── docker-compose.yml       # PostgreSQL database & server orchestration
├── turbo.json               # Turborepo task pipeline configuration
└── vitest.config.ts         # Vitest unit test runner config with monorepo aliases
```

---

## 📱 Domain Applications

| Application           | Technology                                      | Role / Scope            | Primary Features                                                                                                                    |
| :-------------------- | :---------------------------------------------- | :---------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **`admin-web`**       | Next.js 15, React 19, TailwindCSS, Recharts     | Platform Administrators | Dashboard analytics, user/vendor/driver approvals, audit logs, order monitoring, platform settings.                                 |
| **`customer-mobile`** | React Native, Expo Router, Zustand, React Query | Customers               | Product browsing, cart management, atomic checkout, order tracking, address book, refund requests.                                  |
| **`vendor-mobile`**   | React Native, Expo Router, Zustand              | Store Owners            | Store open/close toggle, incoming order acceptance, preparation state machine, stock management, earnings.                          |
| **`driver-mobile`**   | React Native, Expo Router, Expo Location        | Delivery Drivers        | Availability toggle (`OFFLINE ↔ AVAILABLE`), order assignment offer accept/reject, OTP handover verification, GPS location updates. |

---

## 📦 Shared Packages

- **`@delivery/database`**: Prisma client singleton and database migration exports.
- **`@delivery/auth`**: Better Auth server instance and client hooks.
- **`@delivery/config`**: Environment variable parsing using Zod (`env.DATABASE_URL`, `env.BETTER_AUTH_SECRET`).
- **`@delivery/constants`**: Magic numbers, error code definitions (`ERROR_CODES`), notification type keys.
- **`@delivery/validation`**: Input validation schemas (`zSignUpCustomer`, `zCreateOrder`, `zUpdateDriverLocation`).
- **`@delivery/types`**: Unified TypeScript interfaces, status enums, and API envelopes.
- **`@delivery/utils`**: Haversine geographic distance math, currency formatters, order number generators (`ORD-000001`).

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

Copy `.env.example` or create a `.env` file in the project root:

```env
# Database Connections (Local database setup)
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
- **PostgreSQL**: `>= 16` (or Docker)

### 2. Installation

Clone the repository and install workspace dependencies:

```bash
pnpm install
```

### 3. Database Initialization & Seeding

Ensure PostgreSQL is running, then run Prisma migrations and seed the database:

```bash
# Generate Prisma Client
pnpm prisma:generate

# Run database migrations
pnpm prisma:migrate

# Seed database with initial categories, demo users, vendors, and products
pnpm prisma:seed
```

### 4. Start Development Servers

Start all applications concurrently via Turborepo:

```bash
pnpm dev
```

Or run individual apps:

```bash
# Admin Web App (http://localhost:3000)
pnpm --filter admin-web dev

# Customer Mobile App (Expo)
pnpm --filter customer-mobile start

# Vendor Mobile App (Expo)
pnpm --filter vendor-mobile start

# Driver Mobile App (Expo)
pnpm --filter driver-mobile start
```

---

## 🐳 Docker & Containerized Setup

Run the entire platform infrastructure (PostgreSQL database + Next.js Admin/API server) using Docker Compose with zero local Node/PostgreSQL setup required:

### 1. Build and Start Container Services

```bash
docker-compose up --build -d
```

### 2. Verify Container Health

```bash
docker-compose ps
```

### 3. Database Migration inside Container

```bash
docker-compose exec admin-web pnpm prisma:migrate:deploy
docker-compose exec admin-web pnpm prisma:seed
```

Access the Admin Web Dashboard at **`http://localhost:3000`**.

To stop services:

```bash
docker-compose down -v
```

---

## 🔌 API Endpoint Reference

All API routes follow standard JSON responses wrapped in the `ApiResponse` envelope:

### Authentication & Users

- `POST /api/auth/sign-in/email` — Authenticate user credentials.
- `POST /api/auth/sign-up/email` — Register customer user.
- `POST /api/auth/sign-out` — Terminate active session.

### Catalog & Inventory

- `GET /api/v1/categories` — List active product categories.
- `GET /api/v1/products` — Filter products by category, vendor, or search term.
- `POST /api/v1/vendor/products` — Create new vendor product listing.
- `PATCH /api/v1/vendor/inventory` — Update stock levels & low stock thresholds.

### Cart & Checkout

- `GET /api/v1/cart` — Fetch customer active cart with server-side totals.
- `POST /api/v1/cart/items` — Add item to cart (enforces single-vendor rule).
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

Run unit test suite:

```bash
pnpm test
```

Run typechecking across all 14 monorepo packages:

```bash
pnpm typecheck
```

---

## 📄 License

This project is proprietary and confidential software.

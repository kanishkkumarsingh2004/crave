# Technical Architecture Specification

# Crave / Blinkbite — Food & 10-Minute Grocery Delivery System

**Version:** 3.0  
**Last Updated:** October 2026  
**Status:** Production Ready (100% Test Pass Rate: 48/48 Suites, 265/265 Tests)

---

## 1. System Overview & Tech Stack

Crave is an enterprise-grade multi-vendor food delivery and **CraveXP 10-Minute Dark Store Grocery** platform built with **Next.js 16 App Router**, **TypeScript**, **Tailwind CSS**, **PostgreSQL 16**, **Prisma ORM**, **Uber H3 Geospatial Indexing (`h3-js`)**, **MapLibre GL**, **HTML2PDF**, and a dedicated **Native Standalone WebSocket Server (`ws-server.js`)**.

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

### Technology Matrix

| Subsystem                 | Technology / Package                                 | Details                                                |
| :------------------------ | :--------------------------------------------------- | :----------------------------------------------------- |
| **Frontend Framework**    | Next.js 16 (App Router, Turbopack, SWC)              | React 19, Server & Client Components, Route Handlers   |
| **Language**              | TypeScript (`strict` mode)                           | Zero `npx tsc --noEmit` errors                         |
| **Styling & UI**          | Tailwind CSS, Lucide Icons                           | Responsive Dark/Light themes (`#18201c`, `#d9f447`)    |
| **Database & ORM**        | PostgreSQL 16 & Prisma ORM v7.10                     | Type-safe migrations, connection pooling               |
| **Geospatial Dispatch**   | Uber H3 (`h3-js`), MapLibre GL                       | H3 Resolution 8 spatial hex indexing & radar dispatch  |
| **Real-Time WebSockets**  | Node.js Native WebSocket (`ws-server.js`)            | Bi-directional streaming on Port 8000                  |
| **Authentication**        | JOSE JWT (`jose`), `scrypt` hashing                  | HTTPOnly, SameSite=Lax signed cookies                  |
| **Commercial Calculator** | `lib/calculator.ts` & `/api/calculator`              | Dynamic pricing, GST splits, rider payouts, vendor cut |
| **PDF & Invoicing**       | `components/InvoiceModal.tsx` & `html2pdf.js`        | Dual Tax Invoices (Customer & Vendor Commission PDF)   |
| **Testing**               | Jest (`babel.jest.config.js`), React Testing Library | 48 Test Suites, 265 Tests Passing                      |

---

## 2. Directory & Module Architecture

```
New Folder/
├── app/                        # Next.js App Router Routes & APIs
│   ├── admin/                  # Admin Command Center Pages (Dashboard, Settings, Analytics, Live H3 Map)
│   ├── api/                    # REST API Endpoints
│   │   ├── admin/              # Admin APIs (Coupons, Map Analytics, Settings, Settlements, Users)
│   │   ├── auth/               # Login, Signup, Session APIs
│   │   ├── calculator/         # Real-time commercial calculation & breakdown API
│   │   ├── dispatch/           # Uber H3 candidate dispatch & request routing
│   │   ├── driver/             # Driver Telemetry, Payouts & Location Update APIs
│   │   ├── orders/             # Order Creation, Tracking, Status Updates
│   │   └── user/               # User Address Book, Language & Profile APIs
│   ├── driver/                 # Driver Delivery Cockpit & Wallet
│   ├── user/                   # Customer Pages (Explore, Cart, Track, Orders, Profile, CraveXP)
│   ├── vendor/                 # Vendor Kitchen Console & CraveXP Dark Store Console
│   ├── globals.css             # Global Tailwind Styles & Dark Theme Variables
│   └── layout.tsx              # Root Layout with Auth, Cart & Theme Context
├── components/                 # Reusable UI Component Library
│   ├── dashboards/             # Role-Specific Dashboard Views (Admin, Customer, Vendor, Driver)
│   ├── CraveLogo.tsx           # Adaptive Brand Logo
│   ├── Footer.tsx              # Responsive Footer
│   ├── InvoiceModal.tsx        # Dual Tax Invoice Engine with HTML2PDF Export & Print Support
│   ├── Navbar.tsx              # Adaptive Header Navigation & User Menu
│   └── ThemeSelector.tsx       # Theme Preference Switcher Component
├── lib/                        # Business Logic & Core Utilities
│   ├── auth-context.tsx        # JWT Auth State & Role Access Control
│   ├── calculator.ts           # Commercial Engine Calculator (Pricing, GST, Earnings, Payouts)
│   ├── cart-context.tsx        # Persistent Shopping Cart State
│   ├── commercial-engine.ts    # Commission & Vendor Contract Pricing Governance
│   ├── distance-pricing.ts     # Dynamic Road Distance Pricing Calculation Engine
│   ├── driver-context.tsx      # Driver State, Order Accepts & Live GPS Radar
│   ├── payment-config.ts       # Payment Configuration Manager
│   └── websocket.tsx           # Client WebSocket Hooks (`useOrderUpdates`, `useDriverLocation`)
├── docs/                       # Project Documentation & Architecture Specifications
├── prisma/                     # Database Schema & Migrations (`schema.prisma`)
└── ws-server.js                # Real-Time Telemetry WebSocket Broadcast Server (Port 8000)
```

---

## 3. Core Engine Architecture

### 3.1. Uber H3 Geospatial Dispatch Pipeline

1. **Driver Indexing**: Active rider GPS coordinates (`lat`, `lng`) are mapped to H3 Hexagonal Cell Index (Resolution 8, ~0.737 km² per cell).
2. **Concentric Ring Dispatch (`k-ring`)**: When an order is placed, candidate riders are discovered starting from the pickup H3 cell and expanding outwards (`kRing(0)`, `kRing(1)`, `kRing(2)`).
3. **Atomic Offer Locking**: Prevents simultaneous order assignment to multiple drivers using atomic dispatch locks (`lib/dispatch/atomic-lock.ts`).

### 3.2. Commercial Pricing & Earnings Calculator (`lib/calculator.ts`)

- **Subtotal & Food GST**: Food items subtotal plus 5% Food GST.
- **Dynamic Delivery Fee**: Base fee + (Distance beyond base threshold $\times$ Per-KM rate) + Demand/Rain/Night Surge.
- **Driver Payout**: $\text{Driver Base} + (\text{Distance} \times \text{Driver Rate}) + \text{Surge Share} + \text{Customer Tip}$. Calculated via `/api/calculator` to ensure driver earnings match platform rules.
- **Vendor Commission & Settlement**: $\text{Vendor Food Net} = \text{Item Subtotal} - (\text{Subtotal} \times \text{Commission Rate}) + \text{Packaging Fee}$.

### 3.3. Dual Commercial Tax Invoice Engine (`components/InvoiceModal.tsx`)

- **Customer Tax Invoice**: FSSAI compliant invoice detailing supplier GSTIN, customer delivery address, itemized food table, packaging fee, delivery fee, platform fee, GST, tip, and total paid.
- **Vendor Commission Tax Invoice**: B2B tax invoice detailing platform commission, GST on commission (18% IGST/CGST), vendor packaging retention, and net vendor bank payout.
- **HTML2PDF Download Engine**: Dynamically loads `html2pdf.js` to client-side convert the formatted invoice modal into an executive PDF (`Invoice_ORD...pdf`) alongside standard `@media print` browser printing.

---

## 4. Documentation Index

- 📘 [README.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/README.md) — Master Platform Overview & Docker Setup
- 📑 [PRD.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/PRD.md) — Product Requirements & User Role Specifications
- 📈 [PROGRESS.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/PROGRESS.md) — Milestone History & Feature Completion Roadmap
- 🧮 [COMMERCIAL_PRICING_AND_CALCULATIONS_GUIDE.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/COMMERCIAL_PRICING_AND_CALCULATIONS_GUIDE.md) — Pricing & Calculator API Specification
- 🚗 [CODEBASE_STRUCTURE_AND_DRIVER_ROUTES_REPORT.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/CODEBASE_STRUCTURE_AND_DRIVER_ROUTES_REPORT.md) — Driver Routes & Pricing Synchronization Report
- 🔄 [COMMERCIAL_ENGINE_DATABASE_SYNC_REPORT.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/COMMERCIAL_ENGINE_DATABASE_SYNC_REPORT.md) — Database Schema & Commercial Engine Audit
- 🛝 [PAYMENT_DELIVERY_SURGE_PLAYGROUND_REPORT.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/PAYMENT_DELIVERY_SURGE_PLAYGROUND_REPORT.md) — Payment & Surge Simulation Guide
- 📡 [REALTIME_API_ARCHITECTURE.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/REALTIME_API_ARCHITECTURE.md) — Real-Time WebSocket Infrastructure
- 💼 [commercial-engine.md](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/commercial-engine.md) — Platform Commission & Financial Contract Engine

---

## 5. Security & Best Practices

- **Password Hashing**: Secure `scrypt` hashing with unique salt buffers.
- **JWT Authentication**: Signed `jose` JWTs in `HTTPOnly`, `SameSite=Lax` cookies and Bearer headers.
- **Role Guards**: Strict route controls for `user`, `restaurant_vendor`, `cravexp_store_vendor`, `rider`, and `admin`.
- **Prepared Statements**: Prisma ORM parameterized queries protecting against SQL injection.
- **Build Integrity**: Built with Next.js SWC compiler and verified with `npx tsc --noEmit`.

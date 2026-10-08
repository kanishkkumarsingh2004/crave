# Technical Architecture Specification

# Crave / Blinkbite — Food & 10-Minute Grocery Delivery System

**Version:** 2.0  
**Last Updated:** October 2026

---

## 1. System Overview & Tech Stack

Crave / Blinkbite is built using a modern full-stack JavaScript/TypeScript architecture powered by Next.js 14 App Router, Tailwind CSS, PostgreSQL with Prisma ORM, and WebSocket real-time telemetry.

```
+-----------------------------------------------------------------------+
|                          CLIENT LAYER (Browser)                       |
|   Next.js React Client Components, Context Providers (Auth, Cart,     |
|   Theme), Leaflet Maps, Tailwind CSS Utility Design Engine            |
+-----------------------------------------------------------------------+
                                  │
                                  │ HTTP REST / Server Actions / WS
                                  ▼
+-----------------------------------------------------------------------+
|                       APPLICATION SERVER LAYER                        |
|   Next.js 14 App Router APIs (/api/orders, /api/admin/*, /api/auth)   |
|   Standalone Telemetry WebSocket Server (ws-server.js :3001)          |
+-----------------------------------------------------------------------+
                                  │
                                  │ Prisma ORM
                                  ▼
+-----------------------------------------------------------------------+
|                         DATABASE LAYER                                |
|   PostgreSQL / SQLite Storage Engine                                   |
|   (Users, Orders, OrderItems, Restaurants, DriverLocations, Config)   |
+-----------------------------------------------------------------------+
```

### Technology Matrix:

- **Frontend Framework**: Next.js 14+ (App Router, Server Actions, Client Components)
- **Language**: TypeScript (`strict` mode)
- **Styling**: Tailwind CSS v3/v4, CSS Custom Properties, Lucide Icons
- **Database**: PostgreSQL / SQLite with Prisma ORM
- **Authentication**: Custom JWT Engine (`jsonwebtoken`, `bcryptjs`)
- **Real-Time Telemetry**: Node.js WebSocket Server (`ws-server.js`), Server-Sent Events (SSE)
- **Map Library**: Leaflet.js / OpenStreetMap (`react-leaflet`)

---

## 2. Directory & Module Architecture

```
New Folder/
├── app/                        # Next.js App Router Routes & APIs
│   ├── admin/                  # Admin Command Center Pages (Dashboard, Settings, Analytics, Live Map)
│   ├── api/                    # REST API Endpoints
│   │   ├── admin/              # Admin APIs (Coupons, Map Analytics, Settings, Users)
│   │   ├── auth/               # Login, Signup, Session APIs
│   │   ├── driver/             # Driver Telemetry & Location Update APIs
│   │   ├── orders/             # Order Creation, Tracking, Status Updates
│   │   └── user/               # User Address Book, Profile APIs
│   ├── driver/                 # Driver Delivery Cockpit
│   ├── user/                   # Customer Pages (Explore, Cart, Track, Orders, Profile, CraveXP)
│   ├── vendor/                 # Vendor Kitchen Console & CraveXP Dark Store Console
│   ├── globals.css             # Global Tailwind Styles & Dark Theme Variables
│   └── layout.tsx              # Root Layout with Auth, Cart & Theme Context
├── components/                 # Reusable UI Component Library
│   ├── dashboards/             # Role-Specific Dashboard Views (Admin, Customer, Vendor, Driver)
│   ├── CraveLogo.tsx           # Adaptive Brand Logo
│   ├── Footer.tsx              # Responsive Footer
│   ├── InvoiceModal.tsx        # Printable Official Tax Invoice Modal
│   ├── Navbar.tsx              # Adaptive Header Navigation & User Menu
│   └── ThemeSelector.tsx       # Theme Preference Switcher Component
├── lib/                        # Business Logic & Core Utilities
│   ├── auth-context.tsx        # JWT Auth State & Role Access Control
│   ├── cart-context.tsx        # Persistent Shopping Cart State
│   ├── distance-pricing.ts     # Dynamic Road Distance Pricing Calculation Engine
│   ├── payment-config.ts       # Payment Configuration Manager
│   └── toast-context.tsx       # System Toast Notifications
├── docs/                       # Project Documentation & Specifications
├── prisma/                     # Database Schema & Migrations
└── ws-server.js                # Real-Time Telemetry WebSocket Broadcast Server
```

---

## 3. Data Flow & Core Engines

### 3.1. Authentication & Role Access Control

- JWT tokens issued upon successful authentication at `/api/auth/login`.
- Stored in browser `localStorage` (`crave_token`) and request headers (`Authorization: Bearer <token>`).
- Client-side route protection enforced in `auth-context.tsx` and Next.js middleware / layout wrappers.

### 3.2. Distance-Based Dynamic Pricing Engine (`lib/distance-pricing.ts`)

1. **Distance Calculation**:
   $$\text{Haversine Distance } d_{\text{spherical}} = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos\phi_1\cos\phi_2 \sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
2. **Road Travel Factor**:
   $$d_{\text{road}} = d_{\text{spherical}} \times 1.30$$
3. **Delivery Fee Formula**:
   $$\text{Delivery Fee} = \text{Base Fee} + \max(0, d_{\text{road}} - \text{Base Km}) \times \text{Per-Km Rate} + \text{Surge Fees}$$
4. **Grand Total**:
   $$\text{Grand Total} = \text{Subtotal} + \text{Delivery Fee} + \text{Packaging Fee} + \text{Platform Fee} - \text{Coupon Discount}$$

### 3.3. Real-Time Driver Telemetry Pipeline

1. Driver app broadcasts GPS coordinates (`lat`, `lng`, `heading`, `speed`) via `/api/driver/location` or WebSocket connection.
2. Server updates `DriverLocations` database record and broadcasts updates over WebSocket channel.
3. Customer track page (`/user/track`) and Admin live map (`/admin/map-live-analytics`) subscribe to telemetry stream and animate rider pins smoothly across Leaflet maps.

---

## 4. Theme & Styling System Architecture

- Theme preference (`light` | `dark` | `system`) stored in `localStorage` (`crave_theme`).
- Applied dynamically via `.dark` CSS class on `document.documentElement` (`<html>`).
- All UI components utilize Tailwind `dark:` variant utilities:
  - Dark Page Backgrounds: `bg-[#121815]`
  - Dark Card Containers: `bg-[#18201c]`
  - Dark Borders: `border-[#27342d]`
  - Accent Color: Electric Lime (`#d9f447`)

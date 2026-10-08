# Product Requirements Document (PRD)

# Crave / Blinkbite — Food & 10-Minute Grocery Delivery Platform

**Version:** 2.0  
**Status:** Active / Production-Ready  
**Last Updated:** October 2026

---

## 1. Executive Summary & Vision

**Crave** (also known as **Blinkbite**) is a modern, high-performance hyperlocal food and 10-minute grocery delivery platform. It bridges customers, gourmet kitchens, dark stores (craveXP Instamart), delivery riders, and platform administrators through a unified, real-time web application.

### Key Value Propositions:

- **Hyperlocal Speed**: Instant 10-15 minute grocery deliveries via craveXP Instamart and fast food delivery from local kitchen partners.
- **Live Telemetry Tracking**: Real-time map telemetry for customers and admins showing active rider coordinates and live delivery routes.
- **Dynamic Pricing Engine**: Automated distance-based pricing (Haversine & road travel factor) with demand, rain, and night surge multipliers.
- **Seamless Dark/Light Theme Engine**: Full platform-wide dark mode support with automatic system preference detection and sync across all user settings.
- **Verified Payment & Invoice Systems**: Direct UPI deep-linking, UTR transaction verification, and official FSSAI-compliant tax invoices.

---

## 2. Target User Roles & Use Cases

| User Role                                         | Primary Objectives & Capabilities                                                                                                         |
| :------------------------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| **Customer (`customer` / `user`)**                | Browse kitchens, order food & groceries, apply promo codes, track driver live on map, manage saved addresses, view official tax invoices. |
| **Restaurant Vendor (`restaurant_vendor`)**       | Kitchen console, live order acceptance/rejection, menu management, preparation status updates.                                            |
| **CraveXP Store Vendor (`cravexp_store_vendor`)** | 10-minute dark store inventory control, fast item dispatch, stock availability toggles.                                                   |
| **Delivery Driver (`driver` / `rider`)**          | Delivery cockpit, live GPS location broadcasting, order pickup/dropoff workflows, delivery OTP verification, earnings tracking.           |
| **Admin (`admin`)**                               | Command center, live map telemetry, global distance pricing settings, payment configuration, user/vendor management, system settings.     |

---

## 3. Core Feature Specifications

### 3.1. Customer Experience & Checkout

- **Kitchen & Product Exploration**: Grid views of restaurants and craveXP Instamart items with filtering, search, and category tabs.
- **Basket & Cart Management**: Real-time quantity updates, subtotal calculation, free delivery threshold indicators, and single-click clear cart.
- **Saved Address Book**: Doorstep delivery address management with default address selection, label tags (Home, Work, Other), and modal address creator.
- **Promo Code & Coupon Engine**: Minimum order value validation, flat/percentage discount calculation, and one-click coupon application.
- **UPI Payment Workflow**:
  - Direct deep-links for GPay (`tez://`), PhonePe (`phonepe://`), Paytm (`paytmmp://`), and generic UPI (`upi://`).
  - One-tap VPA copy (`crave@upi`).
  - Mandatory 12-digit UTR reference input with live validation.

### 3.2. Real-Time Telemetry & Order Tracking

- Interactive map view using Leaflet / OpenStreetMap.
- Real-time rider coordinate updates via WebSocket / Server-Sent Events (SSE).
- Visual status stepper: `Order Placed` -> `Kitchen Preparing` -> `Out for Delivery` -> `Delivered`.
- Delivery OTP verification on rider doorstep arrival.

### 3.3. Dynamic Pricing Engine

- **Base Distance Calculation**: Haversine spherical distance multiplied by a road curvature factor ($1.30\times$).
- **Configurable Pricing Parameters**:
  - Base Fee (First $N$ km included).
  - Per-km Rate beyond base distance.
  - Demand Surge Fee.
  - Rain / Weather Surge Fee.
  - Night Surge Fee (applicable during night hours).
  - Packaging & Handling Charges.
  - Platform Service Fee.
  - Free Delivery Threshold (subtotal trigger).

### 3.4. Official Tax Invoice System

- FSSAI license compliance display.
- Itemized breakdown table (Item Name, Qty, Unit Price, Total).
- Merchant & Customer DB metadata grid.
- Printable modal interface with custom `@media print` layout.

### 3.5. Design System & Theme Engine

- Curated color palette: Dark Charcoal (`#18201c`), Electric Lime (`#d9f447`), Olive Green (`#849e16`), Emerald (`#10b981`).
- Dark Mode toggle in Settings with 3 choices: `Light`, `Dark`, and `System`.
- High-contrast typography and polished micro-interactions.

---

## 4. Non-Functional Requirements

- **Performance**: Sub-500ms initial load time, optimized Next.js bundle sizes.
- **Security**: JWT tokens in HTTP-only cookies / Authorization headers, password hashing with `bcryptjs`.
- **Reliability**: Graceful API error fallbacks and offline state handling.
- **Responsiveness**: Fully fluid responsive layout from 320px mobile screens to 4K desktop displays.

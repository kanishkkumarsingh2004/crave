# Crave — Real-Time API & Live Connection Architecture

> **Document Version**: 1.0.0  
> **Status**: Production Ready  
> **Live Engine**: Native Standalone WebSocket Backend (`ws-server.js`) + `BroadcastChannel` Engine  
> **Polling Status**: 0 Periodic HTTP Polling Loops (`setInterval` polling eliminated)

---

## 📸 System Topology & Real-Time Flow

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

## 🌐 Real-Time API & Live Connection Matrix

The table below documents every API endpoint in the platform, its HTTP method(s), live connection status, associated WebSocket channel, and real-time synchronization behavior.

| API Endpoint                    | HTTP Method(s)            | Live Connection Status | WebSocket Channel                                                    | Synchronization Mechanism & Behavior                                                                                          |
| :------------------------------ | :------------------------ | :--------------------- | :------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| `/api/orders`                   | `POST`                    | 🟢 **Live Push**       | `order_update`, `admin_orders`, `admin_stats`                        | Instant real-time order creation broadcast to Customer, Vendor, Rider, and Admin dashboards without polling.                  |
| `/api/orders`                   | `PATCH`                   | 🟢 **Live Push**       | `order_update`, `admin_orders`, `approval_update`, `driver_location` | Pushes instant order state transitions (_Accept → Prepare → Picked Up → Delivered_) across all connected clients.             |
| `/api/driver/location`          | `POST`                    | 🟢 **Live Push**       | `driver_location`, `admin_stats`                                     | Broadcasts live driver GPS coordinates (`lat`, `lng`) and Uber H3 cell locations directly to Admin Map & Order Tracking maps. |
| `/api/driver/accept`            | `POST`                    | 🟢 **Live Push**       | `order_update`, `driver_location`, `admin_stats`                     | Pushes instant assignment acceptance and locks driver state on trip.                                                          |
| `/api/admin/payment-reviews`    | `PATCH`                   | 🟢 **Live Push**       | `approval_update`, `admin_stats`                                     | Real-time UTR payment verification/rejection updates pushed to customer order checkout modals.                                |
| `/api/admin/map-live-analytics` | `GET`                     | 🟢 **Live WS Synced**  | `driver_location`, `admin_stats`                                     | Initial data load on page mount, followed strictly by live H3 grid driver updates via WebSocket.                              |
| `/api/admin/stats`              | `GET`                     | 🟢 **Live WS Synced**  | `admin_stats`, `admin_orders`                                        | Initial metric load on mount, updated live whenever new orders, payment reviews, or settlements occur.                        |
| `/api/cravexp/catalog`          | `GET`, `POST`             | 🟢 **Live WS Synced**  | `catalog_update`, `order_update`                                     | CraveXP Instamart catalog loads on mount and updates live on catalog or inventory events without polling loops.               |
| `/api/menu-items`               | `POST`, `PATCH`, `DELETE` | 🟢 **Live Push**       | `menu_items`, `catalog_update`                                       | Instant push of created, updated, or deleted food/grocery SKUs to vendor consoles and customer stores.                        |
| `/api/restaurants`              | `POST`, `PATCH`           | 🟢 **Live Push**       | `restaurants`                                                        | Instant push of new kitchen onboarding or open/closed toggle status changes across customer explore screens.                  |
| `/api/admin/coupons`            | `POST`, `PATCH`, `DELETE` | 🟢 **Live Push**       | `admin_stats`                                                        | Real-time promotion creation and eligibility updates.                                                                         |
| `/api/admin/settlements`        | `POST`                    | 🟢 **Live Push**       | `admin_stats`                                                        | Pushes live settlement disbursal events to admin financial dashboards.                                                        |
| `/api/admin/users`              | `GET`                     | 🟢 **Live WS Synced**  | `admin_users`                                                        | On-demand user list fetch on mount with live WS updates on user registration/role changes.                                    |
| `/api/admin/create-vendor`      | `POST`                    | 🟢 **Live Push**       | `admin_users`, `restaurants`                                         | Real-time vendor onboarding event broadcast.                                                                                  |
| `/api/admin/delete-vendor`      | `POST`                    | 🟢 **Live Push**       | `admin_users`, `restaurants`                                         | Real-time vendor removal and cleanup event broadcast.                                                                         |
| `/api/dispatch/request`         | `POST`                    | 🟢 **Live Push**       | `order_update`, `admin_orders`                                       | Pushes atomic dispatch offer popups to rider radar cockpits.                                                                  |
| `/api/dispatch/candidates`      | `POST`                    | 🔵 **On-Demand**       | N/A                                                                  | Calculated on-demand by H3 ring radius algorithm during dispatch request generation.                                          |
| `/api/user/addresses`           | `GET`, `POST`, `DELETE`   | 🔵 **On-Demand**       | N/A                                                                  | On-demand customer address book management.                                                                                   |
| `/api/user/update`              | `PATCH`                   | 🔵 **On-Demand**       | N/A                                                                  | Customer profile updates (Name, Phone, Address).                                                                              |
| `/api/auth/login`               | `POST`                    | 🔵 **On-Demand**       | N/A                                                                  | Authenticates credentials and sets HTTP-Only JWT cookie.                                                                      |
| `/api/auth/signup`              | `POST`                    | 🟢 **Live Push**       | `admin_users`                                                        | Registers account and broadcasts new signup to admin user feeds.                                                              |
| `/api/auth/me`                  | `GET`                     | 🔵 **On-Demand**       | N/A                                                                  | Validates session token on initial app load.                                                                                  |
| `/api/auth/logout`              | `POST`                    | 🔵 **On-Demand**       | N/A                                                                  | Clears session auth token.                                                                                                    |
| `/api/payment-config`           | `GET`, `POST`             | 🟢 **Live Push**       | `admin_stats`                                                        | Updates platform fees, surge multipliers, and base rates instantly across checkout contexts.                                  |
| `/api/health`                   | `GET`                     | 🔵 **On-Demand**       | N/A                                                                  | Healthcheck endpoint used by Docker containers and load balancers.                                                            |

---

## 📡 WebSocket Channel Event Specifications

Below are the primary WebSocket channels and their event payloads:

1. **`order_update`**:
   - **Trigger**: New order created, kitchen status progression, or driver drop-off completion.
   - **Target Audiences**: Customer order tracker (`/user/track`), Vendor kitchen desk (`/vendor/dashboard`), Driver radar (`/driver/dashboard`).

2. **`admin_orders` & `admin_stats`**:
   - **Trigger**: Real-time order creation, payment approval/rejection, vendor settlement, or store onboarding.
   - **Target Audiences**: Master Admin Command Center (`/admin/dashboard`, `/admin/analytics`).

3. **`driver_location`**:
   - **Trigger**: Driver GPS coordinate update (`lat`, `lng`) or Uber H3 cell transition.
   - **Target Audiences**: Admin Map Live Analytics (`/admin/map-live-analytics`), Customer Order Tracking Map (`/user/track`).

4. **`approval_update`**:
   - **Trigger**: Customer 12-digit UPI UTR payment reference verified or rejected by Admin.
   - **Target Audiences**: Customer Checkout Modal (`/user/cart`).

5. **`catalog_update` & `menu_items`**:
   - **Trigger**: Food menu item or CraveXP grocery SKU created, updated, or toggled in-stock/out-of-stock.
   - **Target Audiences**: CraveXP 10-Minute Dark Store (`/user/cravexp`), Customer Explore (`/user/explore`).

---

## 🔒 Security & Access Control Enforcement

- **JWT Authentication**: Signed using `jose` library with HS256 algorithm. In production environments (`NODE_ENV === 'production'`), strict verification ensures `JWT_SECRET` is defined.
- **Role-Based Access Control (RBAC)**: Enforced via `verifyToken` on all sensitive endpoints (`admin`, `restaurant_vendor`, `cravexp_store_vendor`, `rider`).
- **Driver GPS Authorization**: `/api/driver/location` validates that the requesting caller holds the `rider` role matching the `driverId` (or `admin` role), preventing spoofed GPS broadcasts.
- **Prepared Database Queries**: Handled via Prisma ORM parameterized queries, mitigating SQL injection risks.

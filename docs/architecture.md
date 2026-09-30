# Architecture Specification

**Project:** Multi-Role Delivery Platform
**Version:** 1.0.0
**Status:** Architecture Baseline
**Architecture Style:** Modular Monolith + Multi-App Client Architecture
**Web:** Next.js
**Mobile:** React Native
**Backend:** Next.js
**ORM:** Prisma
**Database:** PostgreSQL
**Authentication:** Better Auth
**Package Manager:** pnpm
**Language:** TypeScript

---

# 1. Architecture Overview

The platform consists of:

- One Admin Web Application
- One Customer Mobile Application
- One Vendor Mobile Application
- One Driver Mobile Application
- One centralized Next.js backend
- One PostgreSQL database
- One Better Auth authentication system
- Shared packages for types, validation, API contracts, and utilities

The architecture intentionally starts as a **modular monolith** instead of microservices.

```text
                         ┌─────────────────────────┐
                         │       PostgreSQL        │
                         │                         │
                         │ Users                   │
                         │ Products                │
                         │ Orders                  │
                         │ Deliveries              │
                         │ Payments                │
                         │ Inventory               │
                         └────────────┬────────────┘
                                      │
                                   Prisma
                                      │
                         ┌────────────▼────────────┐
                         │      Next.js Server     │
                         │                         │
                         │ Authentication          │
                         │ Authorization           │
                         │ API                     │
                         │ Business Services       │
                         │ Validation              │
                         │ Order Engine             │
                         │ Delivery Engine          │
                         │ Payment Engine           │
                         │ Notification Engine      │
                         │ Realtime Gateway         │
                         └────────────┬────────────┘
                                      │
              ┌───────────────────────┼────────────────────────┐
              │                       │                        │
              ▼                       ▼                        ▼
     ┌────────────────┐      ┌────────────────┐      ┌────────────────┐
     │ Customer App   │      │ Vendor App     │      │ Driver App     │
     │ React Native   │      │ React Native   │      │ React Native   │
     └────────────────┘      └────────────────┘      └────────────────┘

                         ┌─────────────────────────┐
                         │      Admin Web App      │
                         │        Next.js          │
                         └─────────────────────────┘
```

---

# 2. Architectural Principles

The system follows these principles.

## 2.1 Single Source of Truth

The backend is authoritative.

The clients must never be treated as trusted sources for:

- Prices
- Order totals
- Inventory
- User roles
- Payment status
- Delivery status
- Driver assignment
- Vendor ownership

---

## 2.2 Server-Side Authorization

Frontend route protection is not sufficient.

Every protected API operation must verify:

```text
Session
   ↓
User
   ↓
Role
   ↓
Resource Ownership
   ↓
Permission
   ↓
Operation
```

---

## 2.3 Modular Monolith

The backend should be divided into independent business modules while remaining inside one deployable backend.

```text
Authentication
Users
Customers
Vendors
Drivers
Catalog
Inventory
Cart
Orders
Payments
Deliveries
Notifications
Reviews
Analytics
Administration
Audit
```

This provides clear boundaries without the operational complexity of microservices.

---

# 3. System Boundaries

The platform contains four primary client boundaries.

```text
                    PLATFORM
                       │
        ┌──────────────┼──────────────┐
        │              │              │
     WEBSITE        CUSTOMER        VENDOR
     ADMIN APP        APP             APP
                                       │
                                       │
                                    DRIVER
                                      APP
```

The backend remains shared.

---

# 4. Application Boundaries

## 4.1 Admin Web

Technology:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
```

Responsibilities:

- Platform administration
- User management
- Vendor management
- Driver management
- Product moderation
- Order monitoring
- Delivery monitoring
- Payments
- Analytics
- Configuration
- Audit logs

---

## 4.2 Customer App

Technology:

```text
React Native
TypeScript
TanStack Query
```

Responsibilities:

- Authentication
- Product discovery
- Cart
- Checkout
- Orders
- Tracking
- Reviews
- Profile

---

## 4.3 Vendor App

Responsibilities:

- Vendor authentication
- Vendor onboarding
- Product management
- Inventory
- Order management
- Store availability
- Earnings
- Analytics

---

## 4.4 Driver App

Responsibilities:

- Driver authentication
- Driver onboarding
- Availability
- Delivery assignment
- Pickup
- Navigation
- Delivery confirmation
- Earnings
- Delivery history

---

# 5. Monorepo Architecture

The project should use a pnpm workspace.

```text
delivery-platform/
│
├── apps/
│   │
│   ├── admin-web/
│   │
│   ├── customer-mobile/
│   │
│   ├── vendor-mobile/
│   │
│   └── driver-mobile/
│
├── packages/
│   │
│   ├── api-client/
│   ├── api-contracts/
│   ├── auth/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── constants/
│   ├── ui/
│   ├── config/
│   └── utils/
│
├── server/
│   │
│   ├── modules/
│   │
│   ├── middleware/
│   ├── realtime/
│   ├── jobs/
│   └── infrastructure/
│
├── prisma/
│   │
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
│
├── docs/
│
├── rules/
│
├── scripts/
│
├── docker/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── .env.example
```

---

# 6. Admin Web Architecture

```text
apps/admin-web/
│
├── app/
│   ├── login/
│   ├── dashboard/
│   ├── customers/
│   ├── vendors/
│   ├── drivers/
│   ├── products/
│   ├── categories/
│   ├── orders/
│   ├── deliveries/
│   ├── payments/
│   ├── analytics/
│   ├── reviews/
│   ├── notifications/
│   ├── settings/
│   └── audit-logs/
│
├── components/
├── features/
├── hooks/
├── lib/
└── middleware.ts
```

The Admin Web must not directly access Prisma from client components.

---

# 7. Mobile Architecture

Each mobile app follows the same structural pattern.

```text
customer-mobile/
│
├── src/
│   ├── screens/
│   ├── navigation/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── api/
│   ├── utils/
│   └── constants/
│
├── assets/
└── app.json
```

The same pattern applies to:

```text
vendor-mobile/
driver-mobile/
```

---

# 8. Backend Architecture

The backend is a modular monolith.

```text
server/
│
├── modules/
│   │
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── vendors/
│   ├── drivers/
│   ├── catalog/
│   ├── inventory/
│   ├── cart/
│   ├── orders/
│   ├── payments/
│   ├── deliveries/
│   ├── notifications/
│   ├── reviews/
│   ├── analytics/
│   ├── admin/
│   └── audit/
│
├── middleware/
├── realtime/
├── jobs/
└── infrastructure/
```

---

# 9. Module Structure

Each business module should follow the same internal structure.

Example:

```text
modules/orders/
│
├── order.controller.ts
├── order.service.ts
├── order.repository.ts
├── order.validator.ts
├── order.policy.ts
├── order.types.ts
├── order.events.ts
└── index.ts
```

Responsibilities:

### Controller

Handles API requests.

### Validator

Validates input.

### Policy

Checks authorization and business permissions.

### Service

Contains business logic.

### Repository

Handles database access.

### Events

Defines domain events.

---

# 10. Request Lifecycle

Every API request should follow:

```text
HTTP Request
     │
     ▼
API Route
     │
     ▼
Authentication
     │
     ▼
Authorization
     │
     ▼
Input Validation
     │
     ▼
Controller
     │
     ▼
Service
     │
     ▼
Repository
     │
     ▼
Prisma
     │
     ▼
PostgreSQL
     │
     ▼
Response
```

---

# 11. Authentication Architecture

Better Auth is the central authentication provider.

```text
                    Better Auth
                         │
              ┌──────────┼──────────┐
              │          │          │
            Admin     Customer     Vendor
                                   Driver
```

The system should use a shared identity model.

---

# 12. Authentication Flow

## Email Authentication

```text
Client
  │
  │ email + password
  ▼
Better Auth
  │
  ├── Validate credentials
  │
  ├── Create session
  │
  └── Return session
  │
  ▼
Client
```

---

# 13. Google Authentication

```text
Client
   │
   ▼
Google OAuth
   │
   ▼
Better Auth
   │
   ▼
Account Linking
   │
   ▼
User
   │
   ▼
Session
```

The system must prevent duplicate accounts when the same verified email is used through different authentication methods.

---

# 14. Role Architecture

Role is stored centrally.

```text
User
 │
 └── role
       │
       ├── ADMIN
       ├── CUSTOMER
       ├── VENDOR
       └── DRIVER
```

Do not create separate authentication tables for each role.

Role-specific profile tables are preferable.

```text
User
 │
 ├── CustomerProfile
 ├── VendorProfile
 └── DriverProfile
```

---

# 15. Authorization Architecture

Authorization consists of multiple layers.

```text
Authentication
      ↓
Role Authorization
      ↓
Resource Ownership
      ↓
Business Rule
```

Example:

```text
PATCH /api/v1/products/:id
```

The backend verifies:

```text
Is authenticated?
        ↓
Is ADMIN or VENDOR?
        ↓
If VENDOR:
Does product belong to vendor?
        ↓
Is vendor active?
        ↓
Allow update
```

---

# 16. Database Architecture

Database:

```text
PostgreSQL
```

Access:

```text
Prisma
```

Architecture:

```text
Service
   ↓
Repository
   ↓
Prisma Client
   ↓
PostgreSQL
```

Prisma should not be imported directly throughout the application.

Database access should primarily remain inside repositories or dedicated data-access modules.

---

# 17. Core Entity Relationship

```text
User
 │
 ├───────────────┐
 │               │
 ▼               ▼
Customer      Vendor
 │               │
 │               ├── Products
 │               │      │
 │               │      └── Inventory
 │               │
 │               └── VendorOrders
 │
 └── Orders
       │
       ├── OrderItems
       │       │
       │       └── Products
       │
       ├── Payment
       │
       └── Delivery
               │
               └── Driver
```

---

# 18. User Domain

```text
User
 ├── id
 ├── email
 ├── name
 ├── phone
 ├── role
 ├── status
 ├── image
 ├── createdAt
 └── updatedAt
```

Status:

```text
ACTIVE
SUSPENDED
DEACTIVATED
PENDING
```

---

# 19. Customer Domain

```text
CustomerProfile
 ├── id
 ├── userId
 ├── defaultAddressId
 └── metadata
```

Customer relationships:

```text
Customer
 ├── Addresses
 ├── Cart
 ├── Orders
 ├── Reviews
 └── Notifications
```

---

# 20. Vendor Domain

```text
VendorProfile
 ├── id
 ├── userId
 ├── businessName
 ├── description
 ├── phone
 ├── address
 ├── latitude
 ├── longitude
 ├── status
 ├── approvalStatus
 └── timestamps
```

Vendor relationships:

```text
Vendor
 ├── Products
 ├── Orders
 ├── Documents
 ├── Earnings
 └── Reviews
```

---

# 21. Driver Domain

```text
DriverProfile
 ├── id
 ├── userId
 ├── vehicleType
 ├── vehicleNumber
 ├── verificationStatus
 ├── availabilityStatus
 ├── rating
 └── timestamps
```

Relationships:

```text
Driver
 ├── Deliveries
 ├── LocationUpdates
 ├── Documents
 └── Payouts
```

---

# 22. Catalog Architecture

Catalog:

```text
Category
    │
    └── Product
           │
           ├── ProductImage
           └── Inventory
```

Products belong to exactly one vendor in the initial architecture.

---

# 23. Inventory Architecture

Inventory should be treated as a separate domain.

```text
Product
   │
   ▼
Inventory
   │
   ├── availableQuantity
   ├── reservedQuantity
   ├── lowStockThreshold
   └── status
```

Inventory changes should be transactional.

---

# 24. Cart Architecture

```text
Customer
   │
   ▼
Cart
   │
   └── CartItem
         │
         └── Product
```

The cart should not permanently store product prices as the source of truth.

At checkout:

```text
Cart
 ↓
Fetch Current Product Data
 ↓
Validate Availability
 ↓
Calculate Server-Side Total
 ↓
Create Order
```

---

# 25. Order Architecture

An order belongs to:

```text
Customer
   +
Vendor
   +
OrderItems
   +
Payment
   +
Delivery
```

Initial constraint:

```text
ONE ORDER
   =
ONE VENDOR
```

This prevents multi-vendor fulfillment complexity during MVP.

---

# 26. Order Creation Flow

```text
Customer
   │
   │ Checkout
   ▼
API
   │
   ▼
Validate Cart
   │
   ▼
Validate Customer
   │
   ▼
Validate Vendor
   │
   ▼
Validate Inventory
   │
   ▼
Calculate Price
   │
   ▼
Database Transaction
   │
   ├── Create Order
   ├── Create OrderItems
   ├── Reserve Inventory
   ├── Create Payment
   └── Create Delivery
   │
   ▼
Commit
```

If any required operation fails:

```text
ROLLBACK
```

---

# 27. Order State Machine

```text
CREATED
   │
   ▼
CONFIRMED
   │
   ▼
ACCEPTED_BY_VENDOR
   │
   ▼
PREPARING
   │
   ▼
READY_FOR_PICKUP
   │
   ▼
DRIVER_ASSIGNED
   │
   ▼
PICKED_UP
   │
   ▼
OUT_FOR_DELIVERY
   │
   ▼
DELIVERED
```

Failure branches:

```text
CANCELLED
REJECTED
FAILED
```

The service layer must reject illegal state transitions.

---

# 28. Delivery Architecture

Delivery is a separate domain from orders.

```text
Order
  │
  ▼
Delivery
  │
  ├── Driver
  ├── Pickup Location
  ├── Delivery Location
  ├── Status
  └── Tracking
```

---

# 29. Driver Assignment

Driver assignment should be handled by a dedicated service.

```text
Delivery Created
       │
       ▼
Find Eligible Drivers
       │
       ├── Approved
       ├── Online
       ├── Available
       └── Within Delivery Area
       │
       ▼
Candidate Drivers
       │
       ▼
Assignment Strategy
       │
       ▼
Driver Assignment
```

The assignment algorithm should be replaceable.

Do not hard-code driver selection into the order service.

---

# 30. Delivery State Machine

```text
PENDING
   ↓
SEARCHING_DRIVER
   ↓
DRIVER_ASSIGNED
   ↓
DRIVER_ACCEPTED
   ↓
ARRIVED_AT_PICKUP
   ↓
PICKED_UP
   ↓
OUT_FOR_DELIVERY
   ↓
ARRIVED_AT_DESTINATION
   ↓
DELIVERED
```

Failure states:

```text
CANCELLED
FAILED
EXPIRED
```

---

# 31. Pickup Verification

The preferred architecture supports a verification mechanism.

Possible methods:

```text
OTP
QR CODE
ORDER CODE
VENDOR CONFIRMATION
```

The verification mechanism should be abstracted:

```text
PickupVerificationService
```

This allows the method to change without rewriting delivery logic.

---

# 32. Delivery Verification

Delivery should support:

```text
DeliveryVerificationService
```

Possible mechanism:

```text
Customer OTP
```

Flow:

```text
Driver
   ↓
Arrives
   ↓
Requests OTP
   ↓
Customer provides OTP
   ↓
Backend verifies
   ↓
Delivery marked DELIVERED
```

The client must never be able to directly force:

```text
status = DELIVERED
```

---

# 33. Real-Time Architecture

Real-time functionality is required for:

- Order status
- Delivery status
- Driver assignment
- Driver location
- Vendor order notifications
- Customer tracking

Architecture:

```text
Business Service
      │
      ▼
Domain Event
      │
      ▼
Realtime Gateway
      │
      ├── Customer
      ├── Vendor
      ├── Driver
      └── Admin
```

---

# 34. Event Architecture

Example:

```text
ORDER_CREATED
ORDER_ACCEPTED
ORDER_READY
DRIVER_ASSIGNED
DRIVER_ACCEPTED
PICKUP_CONFIRMED
DELIVERY_STARTED
DRIVER_ARRIVED
DELIVERY_COMPLETED
PAYMENT_COMPLETED
PAYMENT_FAILED
```

Events should be internal application events.

They should not be tightly coupled to UI components.

---

# 35. Driver Location Architecture

During active delivery:

```text
Driver Mobile
      │
      │ GPS
      ▼
Location Service
      │
      ▼
Backend
      │
      ├── Store latest location
      │
      └── Publish realtime event
               │
               ├── Customer
               └── Admin
```

Do not store every GPS update indefinitely in the primary database.

The architecture should distinguish:

```text
Current Location
Historical Tracking Data
```

---

# 36. Location Update Strategy

Location updates should be throttled.

Example conceptual policy:

```text
Active Delivery
    ↓
Location Update
    ↓
Distance/Time Threshold
    ↓
Send Update
```

This reduces:

- Battery usage
- Network usage
- Backend load
- Database writes

---

# 37. Notification Architecture

Notifications should use a dedicated service.

```text
Domain Event
    │
    ▼
Notification Service
    │
    ├── Push
    ├── In-App
    └── Email
```

Example:

```text
ORDER_READY
     ↓
Notification Service
     ↓
Find Driver
     ↓
Push Notification
```

---

# 38. Payment Architecture

Payment should be isolated behind a provider interface.

```text
PaymentService
      │
      ├── createPayment()
      ├── verifyPayment()
      ├── refundPayment()
      └── handleWebhook()
```

Provider-specific code should not leak into order logic.

---

# 39. Payment Flow

```text
Customer
   │
   ▼
Checkout
   │
   ▼
Create Payment Intent
   │
   ▼
Payment Provider
   │
   ▼
Payment Confirmation
   │
   ▼
Webhook
   │
   ▼
Backend Verification
   │
   ▼
Update Payment
   │
   ▼
Confirm Order
```

Payment webhooks are authoritative for asynchronous payment confirmation.

---

# 40. Payment State

```text
PENDING
   ↓
PROCESSING
   ↓
SUCCESS
```

Failure:

```text
FAILED
```

Refund:

```text
REFUND_PENDING
   ↓
REFUNDED
```

---

# 41. Financial Ledger Architecture

Vendor earnings and driver earnings should not simply be calculated from UI totals.

A financial ledger should eventually be introduced.

```text
Transaction
   │
   ├── Customer Payment
   ├── Platform Fee
   ├── Vendor Earnings
   ├── Driver Earnings
   ├── Refund
   └── Adjustment
```

For MVP, a simplified settlement model can be used, but the database should be designed so a proper ledger can be introduced later.

---

# 42. Review Architecture

Reviews are connected to completed transactions.

```text
Order
  │
  ├── Product Review
  ├── Vendor Review
  └── Driver Review
```

Only eligible customers should be allowed to create reviews.

For example:

```text
Order status = DELIVERED
```

before review creation is allowed.

---

# 43. Admin Architecture

Admin operations should be separated into an administrative module.

```text
Admin
 │
 ├── User Management
 ├── Vendor Management
 ├── Driver Management
 ├── Product Moderation
 ├── Order Monitoring
 ├── Delivery Monitoring
 ├── Payment Management
 ├── Analytics
 ├── Settings
 └── Audit Logs
```

Admin should interact through service methods rather than directly manipulating database records.

---

# 44. Audit Architecture

Sensitive actions produce audit events.

```text
Admin Action
     │
     ▼
Authorization
     │
     ▼
Business Operation
     │
     ▼
Audit Event
     │
     ▼
AuditLog
```

Example:

```text
ADMIN
SUSPEND_VENDOR
vendorId
timestamp
metadata
```

---

# 45. API Architecture

API version:

```text
/api/v1
```

Domains:

```text
/api/v1/auth
/api/v1/users
/api/v1/customers
/api/v1/vendors
/api/v1/drivers
/api/v1/categories
/api/v1/products
/api/v1/inventory
/api/v1/cart
/api/v1/orders
/api/v1/payments
/api/v1/deliveries
/api/v1/reviews
/api/v1/notifications
/api/v1/admin
```

---

# 46. API Response Structure

Successful responses should use a consistent structure.

Conceptually:

```text
{
  success: true,
  data: {...},
  meta: {...}
}
```

Errors:

```text
{
  success: false,
  error: {
    code: "...",
    message: "...",
    details: {...}
  }
}
```

Internal stack traces must never be returned to clients.

---

# 47. API Error Categories

Examples:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
CONFLICT
INVENTORY_UNAVAILABLE
INVALID_STATE_TRANSITION
PAYMENT_FAILED
DELIVERY_UNAVAILABLE
RATE_LIMITED
INTERNAL_ERROR
```

---

# 48. Validation Architecture

Use Zod for request validation.

```text
Request
   ↓
Zod Schema
   ↓
Validated Input
   ↓
Service
```

Schemas should be reusable between:

- Backend
- API client
- Mobile applications
- Admin application

where appropriate.

---

# 49. Shared Type Architecture

Shared packages:

```text
packages/types/
packages/api-contracts/
packages/validation/
```

Example:

```text
OrderStatus
DeliveryStatus
UserRole
PaymentStatus
VendorStatus
DriverStatus
```

must have a single canonical definition.

---

# 50. API Client Architecture

Applications should use a shared API client.

```text
packages/api-client/
```

Example:

```text
auth.login()

products.list()

products.get()

cart.addItem()

orders.create()

orders.get()

deliveries.getActive()

deliveries.accept()

deliveries.confirmPickup()

deliveries.confirmDelivery()
```

This prevents duplicated request logic across apps.

---

# 51. Data Fetching

For web and mobile server state:

```text
TanStack Query
```

Responsibilities:

- Fetching
- Caching
- Refetching
- Mutations
- Loading states
- Error states
- Cache invalidation

Do not duplicate server state unnecessarily in local stores.

---

# 52. Local State

Local state should contain only UI/application state.

Examples:

```text
Modal state
Selected filters
Form state
Navigation state
Temporary UI state
```

Server data should remain in the query/cache layer.

---

# 53. Offline Architecture

Mobile applications should have network awareness.

```text
Online
  │
  ├── Normal API
  │
Offline
  │
  ├── Display cached data
  ├── Queue safe operations
  └── Retry
```

Critical operations such as:

```text
Payment
Order Creation
Pickup Confirmation
Delivery Confirmation
```

must always be validated by the backend.

---

# 54. Idempotency Architecture

Critical mutations should support idempotency keys.

Example:

```text
POST /orders
Idempotency-Key: abc123
```

Backend:

```text
Request
   ↓
Check Idempotency Key
   │
   ├── Exists → Return previous result
   │
   └── New → Process request
```

Apply this to:

```text
Order Creation
Payment Creation
Pickup Confirmation
Delivery Confirmation
Refund
```

---

# 55. Concurrency Architecture

The platform has several concurrency-sensitive operations.

### Inventory

```text
Customer A
Customer B
     ↓
Same Product
     ↓
Database Transaction
```

### Driver Assignment

```text
Request A
Request B
     ↓
Same Driver
     ↓
Atomic Assignment
```

### Delivery Confirmation

```text
Driver
Admin
     ↓
Same Delivery
     ↓
State Validation
```

Database transactions and appropriate constraints must protect these operations.

---

# 56. Database Transaction Boundaries

Transactions should be used for operations where multiple database changes must succeed together.

Examples:

```text
Create Order
Reserve Inventory
Create Payment Record
Create Delivery
```

and:

```text
Confirm Pickup
Update Delivery
Update Order
Create Event
```

Avoid unnecessarily long transactions.

---

# 57. Caching Architecture

Caching should be introduced selectively.

Good candidates:

```text
Categories
Public Product Metadata
Platform Settings
Frequently Accessed Configuration
```

Do not cache highly volatile data without an explicit invalidation strategy.

Avoid blindly caching:

```text
Inventory
Payment State
Delivery State
```

---

# 58. Search Architecture

MVP:

```text
PostgreSQL
+
Indexed Queries
```

Search should initially use database indexes.

A dedicated search engine should only be introduced when actual search requirements justify it.

---

# 59. Database Indexing

Important indexes:

```text
User.email
User.role

Product.vendorId
Product.categoryId
Product.status

Order.customerId
Order.vendorId
Order.status
Order.createdAt

Delivery.driverId
Delivery.status

Payment.orderId
Payment.status
```

Composite indexes should be added based on actual query patterns.

---

# 60. File Storage Architecture

Large files should use object storage.

```text
Application
    │
    ▼
Upload Service
    │
    ▼
Object Storage
```

Database:

```text
fileId
url/key
mimeType
size
owner
createdAt
```

Applications should not store large images directly inside PostgreSQL.

---

# 61. Security Architecture

Security layers:

```text
TLS
 │
 ▼
Authentication
 │
 ▼
Authorization
 │
 ▼
Input Validation
 │
 ▼
Business Rules
 │
 ▼
Database Constraints
```

Additional protection:

- Rate limiting
- Secure cookies/session handling
- CSRF protection where applicable
- Request size limits
- File validation
- Secure headers
- Secret management
- Audit logging

---

# 62. Mobile Security

Mobile applications must not contain:

```text
DATABASE_URL
BETTER_AUTH_SECRET
Payment Secret Keys
Storage Secret Keys
Admin Credentials
```

Only public/client-safe configuration may be bundled.

---

# 63. Environment Architecture

```text
Development
     │
     ▼
Staging
     │
     ▼
Production
```

Each environment should have independent:

- Database
- Authentication configuration
- Storage
- Payment credentials
- API configuration

---

# 64. Infrastructure Architecture

Initial production architecture:

```text
                   Internet
                      │
                      ▼
                 Load Balancer
                      │
              ┌───────┴───────┐
              │               │
              ▼               ▼
        Next.js Server   Next.js Server
              │               │
              └───────┬───────┘
                      │
                      ▼
                 PostgreSQL
                      │
              ┌───────┴────────┐
              │                │
              ▼                ▼
        Object Storage     Realtime Layer
```

A single backend instance can be used for early development/MVP.

---

# 65. Deployment Architecture

Recommended deployment separation:

```text
Admin Web
     │
     ▼
Web Deployment

Backend
     │
     ▼
Server Deployment

PostgreSQL
     │
     ▼
Managed Database

Object Storage
     │
     ▼
Managed Storage
```

Mobile applications are distributed through:

```text
Google Play Store
Apple App Store
```

when production-ready.

---

# 66. Background Jobs

Some operations should not block API requests.

Examples:

```text
Email
Push Notifications
Analytics aggregation
Cleanup
Expired delivery assignment
Payment reconciliation
Payout processing
```

Architecture:

```text
API
 │
 ▼
Job Queue
 │
 ▼
Worker
 │
 ▼
Task
```

The exact queue implementation can be selected during infrastructure implementation.

---

# 67. Expiration Jobs

The system should have scheduled jobs for:

```text
Expired payment sessions
Expired driver requests
Abandoned carts
Stale delivery assignments
Temporary reservations
Old location records
```

---

# 68. Observability Architecture

```text
Application
    │
    ├── Logs
    ├── Metrics
    ├── Errors
    └── Traces
           │
           ▼
     Observability
       Platform
```

Important metrics:

```text
HTTP latency
HTTP error rate
Database latency
Database errors
Order creation failures
Payment failures
Driver assignment failures
Delivery failures
Notification failures
```

---

# 69. Logging

Use structured logs.

Example:

```text
{
  "event": "order.created",
  "orderId": "...",
  "customerId": "...",
  "vendorId": "...",
  "timestamp": "..."
}
```

Do not log:

- Passwords
- Authentication secrets
- Payment secrets
- Access tokens
- Sensitive personal information unnecessarily

---

# 70. Error Handling

The architecture must separate:

```text
Expected Business Error
```

from:

```text
Unexpected System Error
```

Example:

```text
InventoryUnavailableError
InvalidOrderStateError
UnauthorizedError
PaymentFailedError
```

These should be converted into safe API responses.

Unexpected errors should be logged and monitored.

---

# 71. API Rate Limiting

Rate limiting should be applied more aggressively to:

```text
Authentication
Password reset
OTP
Search
Public endpoints
Payment endpoints
```

Different roles may have different limits.

---

# 72. Admin Isolation

Admin endpoints should be explicitly isolated.

```text
/api/v1/admin/*
```

Every request requires:

```text
Authenticated
+
ADMIN role
```

Do not rely on hidden frontend navigation to protect admin functionality.

---

# 73. Vendor Isolation

Vendor resources must be tenant-isolated logically.

Example:

```text
Vendor A
   ↓
Product A
```

Vendor B must never be able to modify Product A.

The backend must verify ownership.

---

# 74. Driver Isolation

Driver operations must be scoped to the driver's own deliveries.

Example:

```text
Driver A
   ↓
Delivery 100
```

Driver B cannot update Delivery 100 unless explicitly assigned.

---

# 75. Customer Isolation

Customers can only access:

```text
Their Profile
Their Addresses
Their Cart
Their Orders
Their Reviews
Their Notifications
```

---

# 76. Data Ownership Model

```text
ADMIN
   ↓
Global Access

CUSTOMER
   ↓
Own Resources

VENDOR
   ↓
Own Store Resources

DRIVER
   ↓
Assigned Delivery Resources
```

---

# 77. Delivery Assignment Race Condition

A major architectural risk is:

```text
Delivery available
      │
      ├── Driver A accepts
      │
      └── Driver B accepts
```

Only one driver can win.

The backend must perform an atomic state transition.

```text
SEARCHING_DRIVER
       ↓
DRIVER_ASSIGNED
```

If another request arrives after the transition:

```text
Reject
```

with:

```text
DELIVERY_ALREADY_ASSIGNED
```

---

# 78. Order State Race Condition

Example:

```text
Vendor marks READY
Admin cancels
Driver picks up
```

The backend must validate the current state before every transition.

No client should assume that a previously fetched state is still current.

---

# 79. Payment Race Condition

Payment confirmation may arrive:

```text
Before order update
After order update
Twice
Out of order
```

Payment processing must therefore be idempotent and state-aware.

Webhook events should be persisted or otherwise safely deduplicated.

---

# 80. Notification Reliability

Notifications should not determine business state.

Incorrect:

```text
Notification failed
      ↓
Order failed
```

Correct:

```text
Order state changes
      ↓
Notification attempted
      ↓
Notification may succeed/fail independently
```

---

# 81. Realtime Reliability

Real-time events are convenience updates, not the source of truth.

If a client misses:

```text
ORDER_READY
```

it should be able to query:

```text
GET /orders/:id
```

and recover the latest state.

---

# 82. Mobile App State Recovery

When the app reconnects:

```text
Reconnect
   ↓
Refresh Authentication
   ↓
Refresh Active Order/Delivery
   ↓
Synchronize Current State
```

The client must never assume that local state remains authoritative.

---

# 83. API Versioning

All production APIs should be versioned:

```text
/api/v1/
```

Future breaking changes can use:

```text
/api/v2/
```

Avoid breaking existing mobile versions unnecessarily because users may remain on older app releases.

---

# 84. Backward Compatibility

The backend must support older mobile clients during controlled rollout periods.

Database migrations must be backward-compatible where possible.

Avoid:

```text
Deploy database breaking change
      ↓
Old app immediately breaks
```

Prefer:

```text
Expand
   ↓
Deploy
   ↓
Migrate Clients
   ↓
Contract
```

---

# 85. Testing Architecture

Testing layers:

```text
Unit Tests
    ↓
Integration Tests
    ↓
API Tests
    ↓
End-to-End Tests
```

---

# 86. Unit Testing

Test:

- Pricing
- Order transitions
- Delivery transitions
- Permission policies
- Inventory calculations
- Driver assignment rules
- Payment calculations

---

# 87. Integration Testing

Test:

```text
Service
   ↓
Prisma
   ↓
PostgreSQL
```

Important scenarios:

- Order creation
- Inventory reservation
- Vendor acceptance
- Driver assignment
- Pickup
- Delivery
- Payment state changes

---

# 88. End-to-End Testing

The most important E2E scenario:

```text
Customer
   ↓
Place Order
   ↓
Vendor
   ↓
Accept
   ↓
Prepare
   ↓
Driver
   ↓
Accept
   ↓
Pickup
   ↓
Deliver
   ↓
Customer
   ↓
Order Completed
```

---

# 89. Database Migration Strategy

Prisma migrations should be committed to Git.

```text
prisma/
├── schema.prisma
└── migrations/
```

Production migrations must be applied through controlled deployment processes.

Never manually modify production schema without recording the change.

---

# 90. Seed Architecture

Development seed data should include:

```text
Admin
Customer
Vendor
Driver
Categories
Products
Orders
Delivery
```

Example:

```text
seed/
├── users.seed.ts
├── vendors.seed.ts
├── products.seed.ts
└── orders.seed.ts
```

Seed credentials must never be production credentials.

---

# 91. Configuration Architecture

Configuration should be centralized.

```text
packages/config/
```

Separate:

```text
Public Configuration
Private Configuration
Environment Configuration
```

Never expose server secrets to React Native or browser bundles.

---

# 92. Dependency Rules

Core business modules should not depend on client applications.

Correct:

```text
Mobile
   ↓
API
   ↓
Services
```

Incorrect:

```text
Order Service
   ↓
Customer React Native Component
```

Business logic must remain platform-independent.

---

# 93. Domain Dependency Direction

Recommended:

```text
API
 ↓
Application Services
 ↓
Domain Logic
 ↓
Repositories
 ↓
Infrastructure
```

Infrastructure should not define business rules.

---

# 94. Recommended Domain Dependencies

```text
Auth
 │
 └── Users

Catalog
 │
 └── Inventory

Cart
 │
 ├── Catalog
 │
 └── Customer

Orders
 │
 ├── Customer
 ├── Vendor
 ├── Catalog
 ├── Inventory
 └── Payments

Deliveries
 │
 ├── Orders
 ├── Drivers
 └── Location

Notifications
 │
 └── Domain Events

Analytics
 │
 └── Domain Events
```

---

# 95. Avoid Circular Dependencies

Example of an architecture problem:

```text
Order
 ↓
Delivery
 ↓
Order
```

Instead, communicate through:

```text
Service Interfaces
```

or:

```text
Domain Events
```

---

# 96. Domain Event Example

```text
OrderService
     │
     ▼
ORDER_READY
     │
     ├── NotificationService
     ├── DeliveryService
     └── AnalyticsService
```

This is preferable to directly coupling every service together.

---

# 97. API Authentication Flow

```text
Mobile/Web
    │
    ▼
API Request
    │
    ▼
Better Auth Session
    │
    ▼
User Identity
    │
    ▼
Role
    │
    ▼
Authorization Policy
    │
    ▼
Controller
```

---

# 98. Admin Authentication Flow

```text
Admin Web
    │
    ▼
Login
    │
    ▼
Better Auth
    │
    ▼
Session
    │
    ▼
ADMIN Role Check
    │
    ▼
Admin Dashboard
```

---

# 99. Customer Order Flow

```text
Customer App
     │
     ▼
Cart
     │
     ▼
Checkout
     │
     ▼
Backend
     │
     ├── Validate
     ├── Calculate
     ├── Reserve
     └── Create
     │
     ▼
Order
     │
     ▼
Vendor
```

---

# 100. Vendor Fulfillment Flow

```text
Vendor App
     │
     ▼
New Order
     │
     ▼
Accept
     │
     ▼
Preparing
     │
     ▼
Ready
     │
     ▼
Delivery System
```

---

# 101. Driver Delivery Flow

```text
Driver App
     │
     ▼
Available Delivery
     │
     ▼
Accept
     │
     ▼
Navigate
     │
     ▼
Pickup
     │
     ▼
Navigate
     │
     ▼
Customer
     │
     ▼
OTP / Verification
     │
     ▼
Delivered
```

---

# 102. Admin Monitoring Flow

```text
Admin
  │
  ├── Users
  ├── Vendors
  ├── Drivers
  ├── Orders
  ├── Deliveries
  ├── Payments
  └── Analytics
       │
       ▼
     Backend
       │
       ▼
   PostgreSQL
```

---

# 103. Scalability Strategy

Initial:

```text
Modular Monolith
```

Later, if required:

```text
                    API Gateway
                         │
       ┌─────────────────┼──────────────────┐
       │                 │                  │
    Order Service   Delivery Service   Payment Service
       │                 │                  │
       └─────────────────┼──────────────────┘
                         │
                    Event Bus
```

Only extract services when there is an actual operational reason.

Do not begin with microservices.

---

# 104. Potential Future Services

If scale eventually requires extraction:

```text
Authentication Service
Catalog Service
Order Service
Inventory Service
Delivery Service
Payment Service
Notification Service
Analytics Service
```

The current module boundaries should make this extraction possible later.

---

# 105. Performance Strategy

The initial performance strategy:

```text
Database Indexes
+
Pagination
+
Efficient Queries
+
Caching Where Appropriate
+
Connection Pooling
+
Background Jobs
```

Do not introduce distributed infrastructure simply because the platform may eventually scale.

---

# 106. Pagination Architecture

Large collections must use cursor or page-based pagination.

Examples:

```text
/admin/orders
/admin/users
/vendor/orders
/driver/history
/customer/orders
```

Avoid returning unlimited records.

---

# 107. Authorization Policy Layer

Each sensitive resource should have an authorization policy.

Examples:

```text
OrderPolicy
ProductPolicy
DeliveryPolicy
VendorPolicy
DriverPolicy
PaymentPolicy
```

Example:

```text
OrderPolicy.canView(user, order)
OrderPolicy.canCancel(user, order)
OrderPolicy.canUpdate(user, order)
```

---

# 108. Business Rule Layer

Policies answer:

```text
"Can this user perform this action?"
```

Business services answer:

```text
"What should happen when this action occurs?"
```

These concerns should not be mixed.

---

# 109. Database Constraint Strategy

Important business rules should be reinforced at the database level where possible.

Examples:

- Unique user email
- Unique product SKU within vendor scope
- Unique payment reference
- Unique delivery per order
- Valid foreign keys
- Non-negative inventory values where practical

Application validation alone is insufficient for concurrency-sensitive constraints.

---

# 110. Data Integrity

The following must always remain consistent:

```text
Order
 ↕
OrderItems

Order
 ↕
Payment

Order
 ↕
Delivery

Product
 ↕
Inventory

Vendor
 ↕
Product
```

Foreign keys should enforce these relationships.

---

# 111. Critical Source-of-Truth Rules

### Product price

Backend/database.

### Inventory

Backend/database.

### Order status

Backend/database.

### Payment status

Backend + verified payment provider state.

### Delivery status

Backend/database.

### Driver assignment

Backend/database.

### Authentication

Better Auth.

### User permissions

Backend authorization layer.

---

# 112. Architecture Anti-Patterns

The project must avoid:

```text
❌ Prisma queries directly inside UI components

❌ Business logic inside React components

❌ Trusting client-side prices

❌ Trusting client-side roles

❌ Separate databases for each app

❌ Three separate backends

❌ Microservices from day one

❌ Unlimited location writes

❌ Client-controlled order status

❌ Client-controlled payment status

❌ Client-controlled inventory

❌ Hard-coded driver assignment

❌ Storing secrets in mobile apps
```

---

# 113. Recommended Development Order

Implementation should follow this order:

```text
1. Repository / Monorepo
       ↓
2. Database Schema
       ↓
3. Better Auth
       ↓
4. RBAC
       ↓
5. API Foundation
       ↓
6. Catalog
       ↓
7. Customer
       ↓
8. Vendor
       ↓
9. Orders
       ↓
10. Driver
       ↓
11. Delivery
       ↓
12. Realtime
       ↓
13. Payments
       ↓
14. Notifications
       ↓
15. Analytics
       ↓
16. Hardening
```

---

# 114. Recommended MVP Architecture

For the first release:

```text
                     PostgreSQL
                         │
                       Prisma
                         │
                  Next.js Backend
                         │
          ┌──────────────┼──────────────┐
          │              │              │
      Admin Web      Customer App    Vendor App
                                        │
                                   Driver App
```

Supporting systems:

```text
Better Auth
Object Storage
Payment Provider
Push Notifications
Maps
Realtime
```

---

# 115. Final Architecture

```text
                              ┌──────────────────────┐
                              │      CUSTOMER        │
                              │    React Native      │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │       VENDOR         │
                              │    React Native      │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │       DRIVER         │
                              │    React Native      │
                              └──────────┬───────────┘
                                         │
                              ┌──────────▼───────────┐
                              │      ADMIN WEB       │
                              │       Next.js        │
                              └──────────┬───────────┘
                                         │
                                         ▼
                         ┌────────────────────────────┐
                         │       NEXT.JS SERVER       │
                         │                            │
                         │ ┌────────────────────────┐ │
                         │ │ Authentication         │ │
                         │ │ Authorization           │ │
                         │ │ API                     │ │
                         │ │ Validation              │ │
                         │ └────────────────────────┘ │
                         │                            │
                         │ ┌────────────────────────┐ │
                         │ │ Customer Module         │ │
                         │ │ Vendor Module           │ │
                         │ │ Driver Module           │ │
                         │ │ Catalog Module          │ │
                         │ │ Inventory Module        │ │
                         │ │ Cart Module             │ │
                         │ │ Order Module            │ │
                         │ │ Payment Module          │ │
                         │ │ Delivery Module         │ │
                         │ │ Notification Module     │ │
                         │ │ Review Module           │ │
                         │ │ Analytics Module        │ │
                         │ │ Admin Module            │ │
                         │ └────────────────────────┘ │
                         │                            │
                         │ ┌────────────────────────┐ │
                         │ │ Realtime Gateway        │ │
                         │ │ Background Jobs         │ │
                         │ │ Audit System            │ │
                         │ └────────────────────────┘ │
                         └──────────────┬─────────────┘
                                        │
                                      Prisma
                                        │
                         ┌──────────────▼─────────────┐
                         │        PostgreSQL          │
                         │                            │
                         │ Users                      │
                         │ Profiles                   │
                         │ Vendors                    │
                         │ Drivers                    │
                         │ Products                   │
                         │ Inventory                  │
                         │ Orders                     │
                         │ Payments                   │
                         │ Deliveries                 │
                         │ Reviews                    │
                         │ Notifications              │
                         │ Audit Logs                 │
                         └────────────────────────────┘

                    External Infrastructure
                    ───────────────────────

                    Better Auth
                    Payment Provider
                    Object Storage
                    Maps / Routing
                    Push Notifications
                    Email Provider
```

---

# 116. Architectural Decision Summary

| Decision              | Choice                                |
| --------------------- | ------------------------------------- |
| Web                   | Next.js                               |
| Mobile                | React Native                          |
| Backend               | Next.js                               |
| Language              | TypeScript                            |
| Database              | PostgreSQL                            |
| ORM                   | Prisma                                |
| Authentication        | Better Auth                           |
| API                   | Versioned REST API                    |
| Real-time             | WebSocket-compatible gateway          |
| Validation            | Zod                                   |
| Server State          | TanStack Query                        |
| Package Manager       | pnpm                                  |
| Architecture          | Modular Monolith                      |
| Repository            | Monorepo                              |
| Storage               | Object Storage                        |
| Payments              | Provider abstraction                  |
| Maps                  | Provider abstraction                  |
| Notifications         | Dedicated notification service        |
| Background Processing | Job Queue                             |
| Authorization         | Server-side RBAC + ownership policies |

---

# 117. Final Architectural Rule

The entire platform should follow this fundamental rule:

```text
CLIENTS ARE INTERFACES.
BACKEND IS THE SOURCE OF TRUTH.
DATABASE IS THE PERSISTENT SOURCE OF TRUTH.
BUSINESS RULES LIVE ON THE SERVER.
```

The customer, vendor, driver and admin applications are four different interfaces over the same platform.

They must never become four independent systems.

The intended architecture is therefore:

```text
                    ONE PLATFORM
                         │
                  ONE BACKEND
                         │
                  ONE DATABASE
                         │
        ┌────────────────┼────────────────┐
        │                │                │
     CUSTOMER          VENDOR           DRIVER
       APP              APP              APP
        │                │                │
        └────────────────┼────────────────┘
                         │
                    ADMIN WEB
```

This structure provides a clean MVP while keeping the system capable of evolving into a much larger delivery platform without forcing a premature microservice architecture.

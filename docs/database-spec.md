# Database Specification

**Project:** Multi-Role Delivery Platform
**Document:** `database-spec.md`
**Version:** 1.0.0
**Status:** Specification
**Database:** PostgreSQL
**ORM:** Prisma
**Last Updated:** 2026-09-29

---

# 1. Purpose

This document defines the PostgreSQL database architecture for the multi-role delivery platform.

The database must support:

- Admins
- Customers
- Vendors
- Drivers
- Vendor stores
- Products
- Product categories
- Inventory
- Carts
- Orders
- Order items
- Payments
- Refunds
- Deliveries
- Driver assignments
- Addresses
- Notifications
- Reviews
- State history
- Audit logs
- Platform configuration

The database is the **authoritative persistent source of truth** for application state.

---

# 2. Technology

## Database

```text
PostgreSQL
```

## ORM

```text
Prisma
```

## Backend

```text
Next.js
```

## Authentication

```text
Better Auth
```

## Clients

```text
Admin Web
Customer Mobile
Vendor Mobile
Driver Mobile
```

---

# 3. Database Principles

The database must follow:

```text
Strong relational integrity
+
Explicit foreign keys
+
Explicit indexes
+
Unique constraints
+
Transactions
+
UTC timestamps
+
Normalized operational data
+
Historical snapshots
+
Auditability
```

---

# 4. Core Design Principles

## 4.1 PostgreSQL Is the Source of Truth

The following must ultimately be persisted in PostgreSQL:

- user identity relationships
- roles
- vendor ownership
- products
- inventory
- carts
- orders
- order items
- payment state
- delivery state
- driver assignment
- important status history
- audit records

Redis, WebSockets, caches, and mobile local storage are not authoritative sources.

---

# 5. Entity Relationship Overview

```text
                         ┌──────────────┐
                         │    User      │
                         └──────┬───────┘
                                │
             ┌──────────────────┼──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
        Customer             Vendor              Driver
             │                  │                  │
             │                  ▼                  │
             │               Store                 │
             │                  │                  │
             │                  ▼                  │
             │              Product                │
             │                  │                  │
             │                  ▼                  │
             │             Inventory               │
             │                                     │
             ▼                                     │
           Cart                                     │
             │                                     │
             ▼                                     │
           Order ◄─────────────────────────────────┘
             │
       ┌─────┼──────────────┐
       │     │              │
       ▼     ▼              ▼
   OrderItem Payment      Delivery
                              │
                              ▼
                         DriverAssignment

Order
 ├── Address
 ├── StatusHistory
 ├── Payment
 └── Delivery

User
 ├── Notifications
 ├── Addresses
 ├── Reviews
 └── Audit references
```

---

# 6. Naming Conventions

## Database Tables

Use singular Prisma model names.

Example:

```text
User
Vendor
Product
Order
Delivery
```

PostgreSQL table mapping may use snake_case if desired.

---

## Fields

Use camelCase in Prisma:

```text
createdAt
updatedAt
vendorId
customerId
deliveryId
```

---

## IDs

Use opaque IDs.

Recommended:

```text
String
```

with generated IDs.

Example:

```text
user_01...
vendor_01...
order_01...
```

The exact ID generation implementation may be changed later.

Clients must never depend on sequential numeric IDs.

---

# 7. Timestamp Standard

All timestamps must use UTC.

Every major entity should contain:

```text
createdAt
updatedAt
```

Recommended Prisma type:

```prisma
DateTime @default(now())
```

Do not use device-generated timestamps as authoritative business timestamps.

---

# 8. User Model

## Purpose

Represents the platform identity.

```text
User
```

### Core fields

```text
id
name
email
phone
role
status
image
createdAt
updatedAt
```

Recommended role:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Recommended account status:

```text
PENDING
ACTIVE
SUSPENDED
DEACTIVATED
```

---

# 9. User Constraints

```text
email → unique
```

Phone uniqueness depends on product requirements and verification strategy.

The role must never be accepted blindly from public signup requests.

---

# 10. Authentication Tables

Better Auth manages authentication-related records.

Depending on the Better Auth configuration, the database should contain its required authentication entities such as:

```text
Account
Session
Verification
```

These must remain separated conceptually from platform business entities.

The application must not duplicate authentication credentials in custom tables unnecessarily.

---

# 11. Customer Profile

Customer-specific information should be separated from generic identity when the data becomes domain-specific.

Recommended:

```text
CustomerProfile
```

Fields may include:

```text
id
userId
createdAt
updatedAt
```

Relationship:

```text
User 1 ─── 1 CustomerProfile
```

Do not duplicate authentication information in `CustomerProfile`.

---

# 12. Vendor Model

Represents a seller/store operator.

```text
Vendor
```

### Fields

```text
id
userId
storeName
description
logoUrl
phone
email
status
approvedAt
suspendedAt
createdAt
updatedAt
```

Vendor status:

```text
PENDING
APPROVED
ACTIVE
SUSPENDED
CLOSED
REJECTED
```

---

# 13. Vendor Relationships

```text
User
  │
  └── Vendor
        │
        ├── Products
        ├── Inventory
        ├── Orders
        └── Reviews
```

Recommended constraint:

```text
Vendor.userId → unique
```

This supports one primary vendor profile per user in the initial architecture.

---

# 14. Driver Model

Represents delivery personnel.

```text
Driver
```

### Fields

```text
id
userId
status
availability
phone
vehicleType
vehicleNumber
approvedAt
suspendedAt
createdAt
updatedAt
```

Account status:

```text
PENDING
APPROVED
ACTIVE
SUSPENDED
DEACTIVATED
```

Availability:

```text
OFFLINE
AVAILABLE
BUSY
```

---

# 15. Driver Relationships

```text
User
  │
  └── Driver
        │
        ├── Assignments
        ├── Deliveries
        └── Location events
```

Recommended:

```text
Driver.userId → unique
```

---

# 16. Address Model

Addresses should be first-class records.

```text
Address
```

### Fields

```text
id
userId
label
recipientName
phone
addressLine1
addressLine2
city
state
postalCode
country
latitude
longitude
deliveryInstructions
isDefault
createdAt
updatedAt
```

Possible labels:

```text
HOME
WORK
OTHER
```

Do not assume one address per customer.

---

# 17. Address Ownership

An address belongs to a user.

```text
User 1 ─── N Address
```

A customer can only modify their own addresses.

---

# 18. Address Snapshotting

Orders must not depend entirely on a mutable address record.

When an order is placed, store a delivery-address snapshot.

Recommended fields on `Order`:

```text
deliveryRecipientName
deliveryPhone
deliveryAddressLine1
deliveryAddressLine2
deliveryCity
deliveryState
deliveryPostalCode
deliveryCountry
deliveryLatitude
deliveryLongitude
deliveryInstructions
```

Reason:

If the customer changes their address later, historical orders must retain the original delivery information.

---

# 19. Category Model

Products should support categories.

```text
Category
```

Fields:

```text
id
name
slug
description
imageUrl
isActive
createdAt
updatedAt
```

Recommended:

```text
slug → unique
```

---

# 20. Product Model

```text
Product
```

Fields:

```text
id
vendorId
categoryId
name
slug
description
sku
price
currency
imageUrl
isActive
isArchived
createdAt
updatedAt
```

---

# 21. Product Ownership

```text
Vendor 1 ─── N Product
```

Every product must have exactly one vendor.

Vendor authorization must verify:

```text
product.vendorId === authenticatedVendor.id
```

---

# 22. Product Price Rules

The current product price is stored in:

```text
Product.price
```

However, orders must not depend on the current product price.

Order items must store a price snapshot.

---

# 23. Product SKU

If SKU is used:

```text
sku
```

should be unique within the vendor.

Recommended conceptual constraint:

```text
UNIQUE(vendorId, sku)
```

This prevents two products from the same vendor sharing an SKU.

---

# 24. Inventory Model

Inventory should be separate from product.

```text
Inventory
```

Fields:

```text
id
productId
onHand
reserved
lowStockThreshold
createdAt
updatedAt
```

Derived:

```text
available = onHand - reserved
```

Do not store `available` as a second mutable quantity unless there is a strong performance reason.

---

# 25. Inventory Constraints

Must enforce:

```text
onHand >= 0
reserved >= 0
reserved <= onHand
```

Application logic must prevent:

```text
available < 0
```

Database constraints should support these invariants where practical.

---

# 26. Inventory Reservation

Use:

```text
InventoryReservation
```

Fields:

```text
id
inventoryId
orderId
quantity
status
expiresAt
createdAt
updatedAt
```

Status:

```text
PENDING
RESERVED
RELEASED
COMMITTED
EXPIRED
```

Relationships:

```text
Inventory
   │
   └── Reservations

Order
   │
   └── Reservations
```

---

# 27. Cart Model

```text
Cart
```

Fields:

```text
id
customerId
createdAt
updatedAt
```

Relationship:

```text
Customer/User
     │
     └── Cart
```

Recommended:

```text
customerId → unique
```

for one active cart per customer.

---

# 28. Cart Item Model

```text
CartItem
```

Fields:

```text
id
cartId
productId
quantity
createdAt
updatedAt
```

Recommended constraint:

```text
UNIQUE(cartId, productId)
```

A product should appear only once in a cart.

Quantity must be:

```text
quantity > 0
```

---

# 29. Cart Vendor Rule

For MVP:

```text
One cart = one vendor
```

This simplifies:

- checkout
- delivery
- vendor fulfillment
- pricing
- order creation

The backend must prevent mixing products from different vendors in the same cart.

If multi-vendor checkout is introduced later, it should be explicitly redesigned rather than hacked into the existing model.

---

# 30. Order Model

```text
Order
```

Core fields:

```text
id
customerId
vendorId
status
subtotal
deliveryFee
discount
tax
total
currency
paymentStatus
deliveryId
createdAt
updatedAt
```

---

# 31. Order Number

Use an internal opaque ID plus a human-friendly order number.

Example:

```text
id:
order_01K...

orderNumber:
ORD-2026-000123
```

`orderNumber` should be unique.

Customers and support staff can use `orderNumber`.

Internal relationships should use `id`.

---

# 32. Order Financial Snapshot

The order should store calculated totals.

Example:

```text
subtotal
deliveryFee
discount
tax
total
currency
```

Do not recalculate historical order totals from the current product table.

---

# 33. Order Item Model

```text
OrderItem
```

Fields:

```text
id
orderId
productId
productName
sku
unitPrice
quantity
lineTotal
createdAt
```

The following are intentionally snapshotted:

```text
productName
sku
unitPrice
```

because product information may change later.

---

# 34. Order Item Integrity

At order creation:

```text
lineTotal = unitPrice × quantity
```

The backend calculates this.

The client cannot submit arbitrary totals.

---

# 35. Order State

Use:

```text
PENDING
CONFIRMED
PREPARING
READY_FOR_PICKUP
PICKED_UP
OUT_FOR_DELIVERY
DELIVERED
CANCELLED
FAILED
```

The state machine is defined in:

```text
state-machines.md
```

---

# 36. Order Status History

```text
OrderStatusHistory
```

Fields:

```text
id
orderId
fromStatus
toStatus
actorId
actorRole
reason
metadata
createdAt
```

This provides an immutable operational history.

---

# 37. Payment Model

```text
Payment
```

Fields:

```text
id
orderId
customerId
provider
providerPaymentId
amount
currency
status
createdAt
updatedAt
paidAt
failedAt
```

Payment status:

```text
PENDING
PROCESSING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUND_PENDING
PARTIALLY_REFUNDED
REFUNDED
```

---

# 38. Payment Constraints

Recommended:

```text
providerPaymentId → unique
```

when present.

Payment amount must be:

```text
amount > 0
```

Payment must reference exactly one order.

---

# 39. Payment Webhook Events

Use:

```text
PaymentEvent
```

Fields:

```text
id
paymentId
provider
providerEventId
eventType
payload
processedAt
createdAt
```

Recommended:

```text
UNIQUE(provider, providerEventId)
```

This ensures webhook idempotency.

Raw provider payloads must be protected because they may contain sensitive information.

---

# 40. Refund Model

```text
Refund
```

Fields:

```text
id
paymentId
orderId
amount
reason
status
providerRefundId
requestedBy
approvedBy
createdAt
updatedAt
processedAt
```

Refund status:

```text
NOT_REQUESTED
REQUESTED
UNDER_REVIEW
APPROVED
PROCESSING
PARTIALLY_REFUNDED
REFUNDED
REJECTED
FAILED
```

---

# 41. Refund Constraints

The total refunded amount must never exceed the original payment amount.

Conceptually:

```text
SUM(refunds) <= payment.amount
```

This must be enforced through backend transactional logic.

---

# 42. Delivery Model

```text
Delivery
```

Fields:

```text
id
orderId
status
driverId
pickupAddress
pickupLatitude
pickupLongitude
deliveryAddress
deliveryLatitude
deliveryLongitude
assignedAt
pickedUpAt
startedAt
arrivingAt
deliveredAt
failedAt
failureReason
createdAt
updatedAt
```

---

# 43. Delivery Relationship

For the MVP:

```text
Order 1 ─── 1 Delivery
```

Recommended:

```text
Delivery.orderId → unique
```

This keeps one order tied to one delivery.

---

# 44. Delivery Status

```text
PENDING
ASSIGNING
ASSIGNED
DRIVER_ACCEPTED
PICKUP_READY
PICKED_UP
IN_TRANSIT
ARRIVING
DELIVERED
FAILED
CANCELLED
```

---

# 45. Driver Assignment Model

Use a separate assignment table.

```text
DriverAssignment
```

Fields:

```text
id
deliveryId
driverId
status
assignedAt
acceptedAt
rejectedAt
endedAt
createdAt
updatedAt
```

Status:

```text
OFFERED
ACCEPTED
REJECTED
EXPIRED
COMPLETED
CANCELLED
```

This preserves assignment history.

---

# 46. Why DriverAssignment Is Separate

Do not only store:

```text
delivery.driverId
```

because driver assignment can change.

Example:

```text
Driver A → rejected
Driver B → rejected
Driver C → accepted
```

Historical assignments must remain available.

`Delivery.driverId` may represent the currently assigned driver.

`DriverAssignment` represents assignment history.

---

# 47. Delivery Verification

Use:

```text
DeliveryVerification
```

Fields:

```text
id
deliveryId
type
status
verifiedBy
metadata
createdAt
```

Verification types may include:

```text
OTP
QR
PHOTO
SIGNATURE
MANUAL
```

Verification status:

```text
PENDING
VERIFIED
FAILED
```

Do not implement every verification type until required.

---

# 48. Driver Location

Driver location should be treated as operational telemetry rather than permanent profile data.

Recommended:

```text
DriverLocation
```

Fields:

```text
id
driverId
deliveryId
latitude
longitude
accuracy
heading
speed
recordedAt
```

Location records should normally be associated with an active delivery.

---

# 49. Driver Location Retention

Do not retain precise driver location forever by default.

Define a retention policy separately.

Possible strategy:

```text
Active delivery
    ↓
High-frequency location

Completed delivery
    ↓
Reduced operational retention

Retention period expires
    ↓
Delete / anonymize
```

Retention must comply with the platform's privacy requirements.

---

# 50. Notification Model

```text
Notification
```

Fields:

```text
id
userId
type
title
body
data
status
readAt
createdAt
updatedAt
```

Status:

```text
CREATED
QUEUED
SENDING
SENT
DELIVERED
READ
FAILED
```

---

# 51. Notification Delivery

If multiple delivery channels are supported, separate notification intent from delivery attempt.

Recommended future model:

```text
Notification
NotificationDelivery
```

Channels:

```text
PUSH
EMAIL
SMS
IN_APP
```

This prevents a single notification record from becoming overloaded.

---

# 52. Review Model

If ratings/reviews are enabled:

```text
Review
```

Fields:

```text
id
orderId
customerId
vendorId
productId
driverId
rating
comment
status
createdAt
updatedAt
```

Review status:

```text
PUBLISHED
HIDDEN
REMOVED
```

---

# 53. Review Constraints

A customer must only review eligible completed orders.

Prevent duplicate reviews according to the intended review model.

Examples:

```text
UNIQUE(orderId, customerId, vendorId)
```

for one vendor review per order.

Product and driver reviews may use separate uniqueness rules.

---

# 54. Audit Log

Administrative and security-sensitive actions require:

```text
AuditLog
```

Fields:

```text
id
actorId
actorRole
action
resourceType
resourceId
before
after
reason
metadata
ipAddress
userAgent
createdAt
```

Sensitive metadata must not contain secrets.

Do not store:

```text
passwords
authentication tokens
payment secrets
private keys
```

---

# 55. Audit Log Rules

Audit logs should be:

```text
Append-oriented
Immutable to normal users
Admin-access controlled
Indexed
Retained according to policy
```

Examples:

```text
VENDOR_APPROVED
VENDOR_SUSPENDED
DRIVER_APPROVED
ORDER_MANUALLY_UPDATED
REFUND_APPROVED
USER_SUSPENDED
PRODUCT_REMOVED
```

---

# 56. Platform Configuration

Use:

```text
PlatformSetting
```

Fields:

```text
id
key
value
type
description
updatedBy
createdAt
updatedAt
```

Example settings:

```text
minimumOrderAmount
defaultDeliveryFee
lowStockThreshold
orderCancellationWindow
```

Sensitive secrets must not be stored here.

Environment secrets belong in secret management/environment configuration.

---

# 57. Database Relationships

High-level relationships:

```text
User
 ├── CustomerProfile
 ├── Vendor
 ├── Driver
 ├── Address[]
 ├── Cart
 ├── Notification[]
 └── Review[]

Vendor
 ├── Product[]
 ├── Order[]
 └── Review[]

Product
 ├── Inventory
 ├── CartItem[]
 ├── OrderItem[]
 └── Review[]

Inventory
 └── InventoryReservation[]

Cart
 └── CartItem[]

Order
 ├── OrderItem[]
 ├── Payment[]
 ├── Refund[]
 ├── Delivery
 ├── InventoryReservation[]
 └── OrderStatusHistory[]

Delivery
 ├── DriverAssignment[]
 ├── DeliveryVerification[]
 └── DriverLocation[]

Payment
 ├── PaymentEvent[]
 └── Refund[]
```

---

# 58. Recommended Prisma Schema Structure

The actual Prisma schema should be organized around domain models.

Conceptually:

```text
prisma/
├── schema.prisma
├── migrations/
└── seed.ts
```

For larger implementations, generated/domain-specific Prisma types can be organized in application code, but Prisma's schema remains the authoritative schema definition.

---

# 59. Core Prisma Enums

Recommended initial enums:

```text
UserRole
UserStatus

VendorStatus

DriverStatus
DriverAvailability

ProductStatus

InventoryReservationStatus

OrderStatus

PaymentStatus

RefundStatus

DeliveryStatus

DriverAssignmentStatus

DeliveryVerificationType
DeliveryVerificationStatus

NotificationStatus

ReviewStatus
```

Avoid creating enums for values that are expected to change frequently and are better represented as database records.

---

# 60. Indexing Strategy

Indexes should support actual query patterns.

## User

```text
email
role
status
createdAt
```

## Vendor

```text
userId
status
storeName
createdAt
```

## Driver

```text
userId
status
availability
```

## Product

```text
vendorId
categoryId
isActive
createdAt
```

## Inventory

```text
productId
```

## Cart

```text
customerId
```

## CartItem

```text
cartId
productId
```

## Order

```text
customerId
vendorId
status
createdAt
orderNumber
```

## Delivery

```text
orderId
driverId
status
createdAt
```

## DriverAssignment

```text
deliveryId
driverId
status
createdAt
```

## Notification

```text
userId
status
createdAt
```

## AuditLog

```text
actorId
resourceType
resourceId
createdAt
```

---

# 61. Composite Indexes

Use composite indexes for frequent combined filters.

Examples:

```text
Order(customerId, createdAt)
Order(vendorId, status)
Order(status, createdAt)

Product(vendorId, isActive)

Driver(status, availability)

Delivery(driverId, status)

Notification(userId, status)
```

Do not add indexes blindly.

Each index has:

- storage cost
- write cost
- maintenance cost

---

# 62. Unique Constraints

Recommended:

```text
User.email

Vendor.userId

Driver.userId

Category.slug

Order.orderNumber

Cart.customerId

CartItem(cartId, productId)

Product(vendorId, sku)

Delivery.orderId

Payment.providerPaymentId

PaymentEvent(provider, providerEventId)
```

Additional uniqueness rules may be introduced based on actual business requirements.

---

# 63. Foreign Key Rules

Foreign keys must be explicit.

Examples:

```text
Product.vendorId → Vendor.id

Order.customerId → User.id

Order.vendorId → Vendor.id

OrderItem.orderId → Order.id

OrderItem.productId → Product.id

Delivery.orderId → Order.id

Delivery.driverId → Driver.id
```

Foreign key behavior must be selected intentionally.

---

# 64. Delete Rules

Avoid cascading deletion of important business history.

For example:

```text
User
  ↓
Order
```

Deleting a user should not automatically destroy historical orders.

Prefer:

```text
soft deactivation
```

for important business identities.

---

# 65. Soft Delete

Use soft deletion only where useful.

Possible:

```text
deletedAt
```

for:

- products
- categories
- vendor records
- user records where required

Do not automatically add `deletedAt` to every table.

State transitions are often better than soft deletion.

Example:

```text
Product
ACTIVE → ARCHIVED
```

instead of deleting it.

---

# 66. Historical Data Preservation

Historical orders must remain readable even if:

- product changes
- product is archived
- vendor changes profile
- customer changes address
- driver account changes
- product price changes

This is why the system uses snapshots and status histories.

---

# 67. Transaction Requirements

Use database transactions for:

### Checkout

```text
Create order
+
Create order items
+
Reserve inventory
+
Create payment
```

### Order confirmation

```text
Validate order
+
Commit inventory
+
Update order
```

### Refund

```text
Validate refundable amount
+
Create refund
+
Update payment
```

### Driver assignment

```text
Create assignment
+
Update delivery
+
Update driver availability
```

---

# 68. Inventory Concurrency

Inventory operations are concurrency-sensitive.

Example:

```text
Stock = 1
```

Two customers attempt to purchase simultaneously.

The system must prevent:

```text
Customer A → quantity 1
Customer B → quantity 1

Final stock = -1
```

The database transaction must atomically verify and reserve stock.

---

# 69. Money Representation

Do not use floating-point numbers for financial values.

Avoid:

```text
Float
```

Use a fixed-precision decimal type.

Recommended:

```prisma
Decimal
```

for:

```text
price
subtotal
tax
deliveryFee
discount
total
payment.amount
refund.amount
```

---

# 70. Currency

Every financial transaction should have a currency.

Example:

```text
currency = "INR"
```

Do not assume currency from frontend locale.

The backend determines the currency according to platform configuration.

---

# 71. Decimal Precision

Define a consistent database precision.

Example:

```text
Decimal(12, 2)
```

The exact precision may be adjusted based on business requirements.

The important rule is:

```text
Never calculate financial totals using binary floating-point arithmetic.
```

---

# 72. JSON Fields

PostgreSQL JSON/JSONB may be used for flexible metadata.

Good candidates:

```text
AuditLog.metadata
PaymentEvent.payload
Notification.data
DeliveryVerification.metadata
```

Do not use JSON to avoid designing relational data that is queried frequently.

Bad:

```text
Order.customerData JSON
```

when customer relationships are required operationally.

---

# 73. Database Transactions and Events

Do not emit an irreversible external event before the database transaction is committed.

Preferred architecture:

```text
Database Transaction
        ↓
Commit
        ↓
Outbox/Event
        ↓
Async Processing
```

For high reliability, introduce an outbox pattern.

---

# 74. Outbox Model

Recommended future model:

```text
OutboxEvent
```

Fields:

```text
id
eventType
aggregateType
aggregateId
payload
status
attempts
availableAt
processedAt
createdAt
```

Status:

```text
PENDING
PROCESSING
PROCESSED
FAILED
```

This can reliably power:

- notifications
- WebSocket events
- analytics
- external integrations

without making the core transaction depend on external systems.

---

# 75. Database Migrations

All schema changes must use Prisma migrations.

Development:

```bash
pnpm prisma migrate dev
```

Production:

```bash
pnpm prisma migrate deploy
```

Never manually modify production schema without a migration strategy.

---

# 76. Migration Rules

Every migration must:

1. Be reviewable.
2. Preserve existing data.
3. Handle nullable/non-nullable changes safely.
4. Consider large-table migration cost.
5. Include required indexes.
6. Avoid destructive changes without explicit approval.

---

# 77. Seed Data

Development seed data may include:

```text
Admin
Customer
Vendor
Driver
Categories
Products
Inventory
```

Seed accounts must never use production secrets.

Production seed behavior must be explicitly controlled.

---

# 78. Database Environment Variables

Recommended:

```text
DATABASE_URL
DIRECT_DATABASE_URL
```

if required by deployment/database tooling.

Never commit:

```text
.env
.env.local
production credentials
database passwords
```

to Git.

Use:

```text
.env.example
```

for documented variable names without secrets.

---

# 79. Database Access Layer

Application code should access Prisma through a controlled database layer.

Avoid creating arbitrary Prisma clients throughout the codebase.

Recommended:

```text
src/
└── server/
    └── db/
        ├── client.ts
        ├── transactions.ts
        └── repositories/
```

Domain services should own business logic.

Repositories/data-access modules should own database operations where useful.

---

# 80. Repository Responsibility

Repositories should handle:

```text
Database queries
Database mutations
Relations
Transactions
Query optimization
```

They should not contain UI logic.

---

# 81. Service Responsibility

Services should handle:

```text
Authorization-aware business rules
State transitions
Inventory logic
Order calculations
Payment workflows
Delivery workflows
```

Example:

```text
OrderService.confirmOrder()
```

rather than putting the entire workflow inside a route handler.

---

# 82. API → Service → Database

Recommended backend flow:

```text
API Route
    ↓
Authentication
    ↓
Authorization
    ↓
Validation
    ↓
Domain Service
    ↓
Repository / Prisma
    ↓
PostgreSQL
```

Avoid:

```text
API Route
    ↓
Random Prisma queries
    ↓
Response
```

for complex business workflows.

---

# 83. Data Ownership

The database must support the authorization model.

Examples:

```text
Product → vendorId

Order → customerId
Order → vendorId

Delivery → driverId

Cart → customerId

Address → userId
```

Ownership should be represented relationally, not inferred from unrelated fields.

---

# 84. Data Access Rules

## Customer

Can query:

```text
Own profile
Own addresses
Own cart
Own orders
Own payments
Own notifications
Eligible reviews
Active public catalog
```

## Vendor

Can query:

```text
Own vendor profile
Own products
Own inventory
Own orders
Own relevant analytics
Relevant reviews
```

## Driver

Can query:

```text
Own driver profile
Own assignments
Assigned deliveries
Required delivery information
Own operational information
```

## Admin

Can query according to administrative permissions.

---

# 85. Database Security

Production database access must be restricted.

Applications should not expose PostgreSQL directly to clients.

Correct:

```text
Mobile/Web
    ↓
Next.js API
    ↓
Prisma
    ↓
PostgreSQL
```

Incorrect:

```text
Mobile
    ↓
Direct PostgreSQL connection
```

---

# 86. Sensitive Data

Never store secrets unnecessarily.

Do not store:

```text
Plaintext passwords
Payment card numbers
CVV
OAuth client secrets
API secrets
Private keys
Session secrets
```

Authentication provider storage must follow Better Auth and provider requirements.

Payment providers should tokenize sensitive payment data where possible.

---

# 87. Data Retention

Define retention policies for:

```text
DriverLocation
PaymentEvent
AuditLog
Notification
OrderStatusHistory
DeliveryStatusHistory
```

Retention must consider:

- operational requirements
- legal requirements
- privacy requirements
- storage cost

Do not retain precise location data indefinitely by default.

---

# 88. Backup Strategy

Production PostgreSQL must have:

```text
Automated backups
Point-in-time recovery where supported
Backup monitoring
Restore testing
```

A backup that has never been restored is not considered fully validated.

---

# 89. Database Monitoring

Monitor:

```text
Connection count
Query latency
Slow queries
Locks
Deadlocks
CPU
Memory
Storage
Replication lag if applicable
Transaction failures
Connection pool exhaustion
```

---

# 90. Database Performance Rules

Do not optimize prematurely.

First establish:

```text
Correct schema
Correct indexes
Correct queries
Correct transactions
```

Then measure.

Use:

```text
EXPLAIN
EXPLAIN ANALYZE
```

for problematic queries.

---

# 91. N+1 Query Prevention

Avoid:

```text
Load 100 orders
    ↓
Run 100 vendor queries
```

Prefer appropriate Prisma relation queries or batched data access.

---

# 92. Pagination

Large collections must use pagination.

Required for:

```text
Orders
Products
Notifications
Audit logs
Driver assignments
Status histories
Reviews
```

Avoid returning unbounded datasets.

---

# 93. Search

Searchable fields should have appropriate indexes.

For MVP:

```text
Product.name
Vendor.storeName
Order.orderNumber
```

Advanced full-text search should only be introduced when required.

---

# 94. Soft Deletion vs Archiving

Use explicit lifecycle states for business objects.

Preferred:

```text
Product → ARCHIVED
Vendor → CLOSED
User → DEACTIVATED
```

instead of physically deleting historical records.

---

# 95. Data Integrity Rules

The database must preserve:

```text
No orphaned order items
No orphaned deliveries
No invalid foreign keys
No negative inventory
No negative financial amounts
No duplicate active cart items
No duplicate provider webhook events
No invalid role values
No invalid status values
```

---

# 96. Required Initial Models

The initial implementation should include at minimum:

```text
User
CustomerProfile
Vendor
Driver

Account
Session
Verification

Address

Category
Product
Inventory
InventoryReservation

Cart
CartItem

Order
OrderItem
OrderStatusHistory

Payment
PaymentEvent
Refund

Delivery
DriverAssignment
DeliveryVerification
DriverLocation

Notification
Review

AuditLog
PlatformSetting
```

`Account`, `Session`, and `Verification` must follow the actual Better Auth adapter/schema requirements.

---

# 97. Optional Future Models

Do not implement these until requirements justify them:

```text
Coupon
Promotion
Wallet
LoyaltyAccount
Subscription
VendorPayout
DriverPayout
Commission
TaxConfiguration
Warehouse
DeliveryZone
Vehicle
SupportTicket
Dispute
ChatMessage
OutboxEvent
```

These should not be forced into the MVP database prematurely.

---

# 98. Recommended Prisma Folder

```text
prisma/
├── schema.prisma
├── seed.ts
└── migrations/
```

Application database layer:

```text
src/server/
└── db/
    ├── client.ts
    ├── transaction.ts
    ├── repositories/
    │   ├── user.repository.ts
    │   ├── vendor.repository.ts
    │   ├── product.repository.ts
    │   ├── inventory.repository.ts
    │   ├── cart.repository.ts
    │   ├── order.repository.ts
    │   ├── payment.repository.ts
    │   ├── delivery.repository.ts
    │   └── notification.repository.ts
    └── queries/
```

Do not create a repository file for every model automatically if the domain is simple.

---

# 99. Database-to-Domain Mapping

```text
IDENTITY
├── User
├── Account
├── Session
└── Verification

CUSTOMER
├── CustomerProfile
├── Address
├── Cart
└── Review

VENDOR
├── Vendor
├── Product
├── Category
└── Inventory

ORDERING
├── Cart
├── CartItem
├── Order
├── OrderItem
└── OrderStatusHistory

PAYMENTS
├── Payment
├── PaymentEvent
└── Refund

DELIVERY
├── Delivery
├── DriverAssignment
├── DeliveryVerification
└── DriverLocation

PLATFORM
├── Notification
├── AuditLog
└── PlatformSetting
```

---

# 100. Database Rules for AI Development

AI coding agents must follow these rules:

1. PostgreSQL is the persistent source of truth.
2. Prisma is the only ORM/database abstraction.
3. All schema changes require Prisma migrations.
4. Never modify production schema manually without an approved migration.
5. Never use floating-point types for money.
6. Use `Decimal` for financial values.
7. Store timestamps in UTC.
8. Use explicit foreign keys.
9. Use database constraints where appropriate.
10. Index actual query patterns.
11. Do not add indexes without justification.
12. Do not delete historical business records casually.
13. Preserve order snapshots.
14. Preserve state transition history.
15. Prevent negative inventory.
16. Make payment webhooks idempotent.
17. Use transactions for multi-record business operations.
18. Prevent race conditions around inventory and driver assignment.
19. Never expose PostgreSQL directly to clients.
20. Never store plaintext passwords.
21. Never store payment card secrets unnecessarily.
22. Do not put frequently queried relational data into JSON.
23. Do not create unnecessary tables for trivial data.
24. Do not create unnecessary microservices or databases.
25. Keep authorization relationships explicit.
26. Do not trust client-provided ownership IDs.
27. Use pagination for large datasets.
28. Test migrations against realistic data.
29. Test database restore procedures in production environments.
30. Update `database-spec.md` when the data model changes.

---

# 101. Final Database Architecture

The database architecture is:

```text
                         ┌────────────────────┐
                         │   Next.js Backend  │
                         └─────────┬──────────┘
                                   │
                              Prisma ORM
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │       PostgreSQL         │
                    └────────────┬─────────────┘
                                 │
       ┌─────────────────────────┼─────────────────────────┐
       │                         │                         │
       ▼                         ▼                         ▼
   Identity                  Commerce                 Operations
       │                         │                         │
   User                    Product                    Delivery
   Account                 Inventory                  Driver
   Session                 Cart                       Assignment
   Verification            Order                      Location
                           Payment
                           Refund
```

The database should remain a **single PostgreSQL database** for the initial architecture.

Do not split the system into separate databases for:

```text
Customer
Vendor
Driver
Admin
```

The applications are separate clients, but the business data is strongly interconnected.

---

# 102. Source of Truth Hierarchy

The system should follow:

```text
                         PostgreSQL
                              │
                    AUTHORITATIVE STATE
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
           Backend          Events           Cache
              │               │               │
              ▼               ▼               ▼
          API/WebSocket   Notifications     Redis
              │
              ▼
       Web / Mobile Apps
```

If there is a conflict:

```text
PostgreSQL
    >
Backend memory
    >
Redis/cache
    >
WebSocket state
    >
Mobile local state
    >
UI state
```

The database wins.

---

# 103. Final Design Principle

The database must model the business rather than merely store API payloads.

The core relationships are:

```text
User
 │
 ├──────── Customer
 │
 ├──────── Vendor
 │            │
 │            ├── Product
 │            │      └── Inventory
 │            │
 │            └── Order
 │
 └──────── Driver
              │
              └── Delivery Assignment

Customer
   │
   ├── Cart
   │
   └── Order
          │
          ├── OrderItem
          ├── Payment
          └── Delivery
                 │
                 ├── Driver
                 ├── Verification
                 └── Location
```

The final implementation should preserve:

```text
Relational integrity
+
Authorization boundaries
+
State-machine correctness
+
Financial accuracy
+
Inventory consistency
+
Delivery traceability
+
Historical data
+
Auditability
```

This database specification is the contract that the Prisma schema must implement.

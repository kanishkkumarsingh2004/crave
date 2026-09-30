# Engineering Rules

**Project:** Multi-Role Delivery Platform
**Version:** 1.0.0
**Status:** Mandatory Engineering Rules
**Package Manager:** `pnpm`
**Language:** TypeScript
**Web:** Next.js
**Mobile:** React Native
**Backend:** Next.js
**Database:** PostgreSQL
**ORM:** Prisma
**Authentication:** Better Auth

---

# 1. Purpose

This document defines the mandatory engineering rules for the entire delivery platform.

These rules apply to:

- Admin Web
- Customer App
- Vendor App
- Driver App
- Next.js Backend
- Database
- API
- Real-time systems
- Payments
- Notifications
- Infrastructure
- Testing
- Documentation
- AI-generated code

Any implementation that violates these rules must be considered invalid unless the rule is explicitly changed.

---

# 2. Core Architecture Rule

The project MUST use a:

```text
Modular Monolith + Multi-Client Architecture
```

The system consists of:

```text
Admin Web
Customer Mobile App
Vendor Mobile App
Driver Mobile App
        │
        ▼
Central Next.js Backend
        │
        ▼
PostgreSQL
```

Do NOT create separate backends for each application.

---

# 3. Package Manager Rule

## 3.1 Mandatory Package Manager

The project MUST use:

```bash
pnpm
```

Do NOT use:

```bash
npm
yarn
bun
```

for project dependency management.

---

# 4. Forbidden npm Commands

The following commands are forbidden:

```bash
npm install
npm i
npm run
npm uninstall
npm update
npm ci
npm init
npx
```

Use the corresponding `pnpm` commands.

### Instead of:

```bash
npm install
```

use:

```bash
pnpm install
```

### Instead of:

```bash
npm install package
```

use:

```bash
pnpm add package
```

### Instead of:

```bash
npm install -D package
```

use:

```bash
pnpm add -D package
```

### Instead of:

```bash
npm uninstall package
```

use:

```bash
pnpm remove package
```

### Instead of:

```bash
npm run dev
```

use:

```bash
pnpm dev
```

### Instead of:

```bash
npx prisma generate
```

use:

```bash
pnpm prisma generate
```

### Instead of:

```bash
npx prisma migrate dev
```

use:

```bash
pnpm prisma migrate dev
```

---

# 5. Core Development Commands

The project should support:

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm test
pnpm format
```

All scripts must be defined in `package.json`.

---

# 6. pnpm Workspace Rule

The repository MUST use a pnpm workspace.

Required:

```text
pnpm-workspace.yaml
```

Example structure:

```text
apps/
packages/
server/
```

All applications and shared packages must be managed through the workspace.

---

# 7. Monorepo Rule

The project MUST use a monorepo.

Recommended:

```text
delivery-platform/
│
├── apps/
│   ├── admin-web/
│   ├── customer-mobile/
│   ├── vendor-mobile/
│   └── driver-mobile/
│
├── packages/
│   ├── api-client/
│   ├── api-contracts/
│   ├── auth/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── ui/
│   ├── config/
│   └── utils/
│
├── server/
│
├── prisma/
│
├── docs/
│
└── rules/
```

---

# 8. Technology Rules

The project MUST use:

| Area            | Technology     |
| --------------- | -------------- |
| Web             | Next.js        |
| Mobile          | React Native   |
| Language        | TypeScript     |
| Backend         | Next.js        |
| Database        | PostgreSQL     |
| ORM             | Prisma         |
| Authentication  | Better Auth    |
| Validation      | Zod            |
| Server State    | TanStack Query |
| Package Manager | pnpm           |
| Styling Web     | Tailwind CSS   |
| UI Web          | shadcn/ui      |

Do not introduce alternative technologies without an explicit architecture decision.

---

# 9. TypeScript Rule

TypeScript is mandatory.

Do NOT introduce new JavaScript files for application logic.

Preferred:

```text
.ts
.tsx
```

Avoid:

```text
.js
.jsx
```

unless a tool configuration explicitly requires them.

---

# 10. Strict Type Safety

TypeScript strict mode should be enabled.

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

Do not disable strict type checking to bypass implementation problems.

---

# 11. Any Type Rule

Avoid:

```ts
any;
```

Do not use `any` simply because a type is inconvenient.

Prefer:

```ts
unknown;
```

followed by proper validation or narrowing.

---

# 12. Type Ownership Rule

Types representing domain concepts must have one canonical definition.

Examples:

```text
UserRole
OrderStatus
DeliveryStatus
PaymentStatus
VendorStatus
DriverStatus
```

Do not create conflicting versions of these types in different applications.

---

# 13. Backend Architecture Rule

The backend MUST follow:

```text
Route
 ↓
Authentication
 ↓
Authorization
 ↓
Validation
 ↓
Controller
 ↓
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
```

Do not bypass layers without a documented reason.

---

# 14. Route Handler Rule

Route handlers must remain thin.

Bad:

```text
Route Handler
 ├── 300 lines of business logic
 ├── Prisma queries
 ├── payment processing
 └── notifications
```

Good:

```text
Route
 ↓
Validation
 ↓
Service
```

Business logic belongs in services.

---

# 15. Prisma Rule

Prisma is the required ORM.

Database access must use:

```text
Prisma
```

Do not introduce:

```text
Drizzle
TypeORM
Sequelize
Mongoose
```

without an explicit architecture decision.

---

# 16. Prisma Access Rule

Do not scatter Prisma queries throughout the application.

Avoid:

```ts
prisma.order.findMany();
```

inside:

- React components
- Route UI
- Controllers when avoidable
- Random utility files

Prefer:

```text
Service
 ↓
Repository
 ↓
Prisma
```

---

# 17. Database Source-of-Truth Rule

PostgreSQL is the persistent source of truth.

Do not treat:

- React state
- Async storage
- local storage
- mobile cache
- client memory

as authoritative business data.

---

# 18. Database Migration Rule

All schema changes must use Prisma migrations.

Development:

```bash
pnpm prisma migrate dev
```

Production migrations must be applied through controlled deployment procedures.

Never manually modify the production database schema without recording the change.

---

# 19. Database Relationship Rule

Foreign keys must be used for important relationships.

Examples:

```text
Order → Customer
Order → Vendor
Order → Delivery
Delivery → Driver
Product → Vendor
OrderItem → Product
Payment → Order
```

---

# 20. Database Constraint Rule

Important invariants must be reinforced at the database level.

Examples:

- Unique email
- Unique payment reference
- Valid foreign keys
- Unique delivery per order where applicable
- Appropriate uniqueness for vendor/product relationships

Application checks alone are insufficient for concurrency-sensitive operations.

---

# 21. Database Naming Rule

Use consistent naming.

Recommended:

```text
camelCase
```

for Prisma fields.

Example:

```prisma
createdAt
updatedAt
vendorId
customerId
deliveryId
```

---

# 22. Timestamp Rule

Major database entities should contain:

```text
createdAt
updatedAt
```

where applicable.

Time must be stored consistently in UTC.

---

# 23. Authentication Rule

All authentication must use:

```text
Better Auth
```

Do not implement custom password hashing/session systems unless required by Better Auth's architecture.

---

# 24. Authentication Methods

The platform must support:

```text
Email + Password
Google Authentication
```

Password recovery and email verification should be supported.

---

# 25. Authentication Centralization

There must be one centralized identity system.

Do NOT create:

```text
CustomerAuthDatabase
VendorAuthDatabase
DriverAuthDatabase
AdminAuthDatabase
```

Use:

```text
User
  ↓
Role
  ↓
Role-specific Profile
```

---

# 26. Role Rule

The platform has exactly four primary roles:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Do not create additional primary roles without an architecture change.

Future administrative permissions may be implemented through permission-based access control.

---

# 27. Authorization Rule

Authentication answers:

> Who are you?

Authorization answers:

> What are you allowed to do?

Both must be implemented.

---

# 28. Server-Side Authorization Rule

Frontend authorization is never sufficient.

Even if a button is hidden:

```text
Backend MUST still reject unauthorized requests.
```

---

# 29. Resource Ownership Rule

Every resource operation must verify ownership.

Example:

```text
Vendor A
 ↓
Product A
```

Vendor B must not be able to modify Product A by changing:

```text
productId
```

in the request.

---

# 30. Admin Rule

Admin has global platform-level permissions.

Admin can manage:

```text
Customers
Vendors
Drivers
Products
Orders
Deliveries
Payments
Reviews
Notifications
Settings
Audit Logs
```

Admin access must always be server-authorized.

---

# 31. Customer Isolation Rule

Customers may access only their own:

```text
Profile
Addresses
Cart
Orders
Reviews
Notifications
```

---

# 32. Vendor Isolation Rule

Vendors may access only their own:

```text
Profile
Products
Inventory
Orders
Store Settings
Earnings
Analytics
```

---

# 33. Driver Isolation Rule

Drivers may access:

```text
Their Profile
Their Assigned Deliveries
Their Delivery History
Their Earnings
Their Availability
```

A driver must not access another driver's private delivery information.

---

# 34. API Rule

The backend API must be versioned.

Required:

```text
/api/v1/
```

Example:

```text
/api/v1/products
/api/v1/orders
/api/v1/deliveries
/api/v1/vendors
/api/v1/drivers
```

---

# 35. REST API Rule

Use predictable resource-oriented APIs.

Preferred:

```text
GET    /orders
GET    /orders/:id
POST   /orders
PATCH  /orders/:id
DELETE /orders/:id
```

Do not create arbitrary action endpoints when a resource-oriented design is more appropriate.

---

# 36. API Validation Rule

Every external request must be validated.

Use:

```text
Zod
```

Never trust:

```text
req.body
query parameters
route parameters
headers
client state
```

without validation.

---

# 37. API Response Rule

Use a consistent response structure.

Success:

```text
{
  success: true,
  data: {},
  meta: {}
}
```

Error:

```text
{
  success: false,
  error: {
    code: "...",
    message: "..."
  }
}
```

---

# 38. Error Message Rule

User-facing errors must be understandable.

Do not expose:

```text
PrismaClientKnownRequestError
stack traces
database errors
internal paths
secret information
```

---

# 39. Error Code Rule

Use stable machine-readable error codes.

Examples:

```text
AUTHENTICATION_REQUIRED
FORBIDDEN
RESOURCE_NOT_FOUND
VALIDATION_ERROR
CONFLICT
INVENTORY_UNAVAILABLE
INVALID_ORDER_STATE
INVALID_DELIVERY_STATE
PAYMENT_FAILED
DELIVERY_UNAVAILABLE
RATE_LIMITED
INTERNAL_ERROR
```

---

# 40. Order Rule

The initial platform MUST use:

```text
ONE ORDER
   =
ONE VENDOR
```

Do not implement multi-vendor carts in the MVP.

---

# 41. Order Source-of-Truth Rule

Order status is controlled by the backend.

The client must never directly decide:

```text
order.status = DELIVERED
```

---

# 42. Order State Machine Rule

Valid order states:

```text
CREATED
CONFIRMED
ACCEPTED_BY_VENDOR
PREPARING
READY_FOR_PICKUP
DRIVER_ASSIGNED
PICKED_UP
OUT_FOR_DELIVERY
DELIVERED
```

Failure states:

```text
CANCELLED
REJECTED
FAILED
```

Only valid state transitions are permitted.

---

# 43. Order Transition Rule

The backend must validate the current state before every transition.

Example:

```text
READY_FOR_PICKUP
```

can move to:

```text
DRIVER_ASSIGNED
```

but cannot directly move to:

```text
DELIVERED
```

---

# 44. Vendor Order Rule

Vendors can:

```text
Accept
Reject
Prepare
Mark Ready
```

Vendors cannot:

```text
Pick Up
Deliver
Mark Delivered
```

---

# 45. Driver Order Rule

Drivers can update delivery-related states only for deliveries assigned to them.

Drivers must not modify arbitrary orders.

---

# 46. Customer Cancellation Rule

Cancellation must be state-dependent.

Example:

```text
CREATED
    ↓
Allowed

PREPARING
    ↓
Restricted

PICKED_UP
    ↓
Not allowed
```

Exact cancellation policy must be implemented through business rules.

---

# 47. Price Rule

Prices must always be calculated server-side.

Never trust:

```text
clientTotal
clientPrice
clientDiscount
clientTax
```

as authoritative values.

---

# 48. Order Price Snapshot Rule

When an order is created, store the relevant price at that time.

Historical orders must not change when a product's current price changes.

---

# 49. Inventory Rule

Inventory must be controlled by the backend.

The client cannot directly modify:

```text
availableQuantity
reservedQuantity
```

---

# 50. Inventory Concurrency Rule

Inventory changes must be transactional.

The system must prevent:

```text
Stock = 1

Customer A buys 1
Customer B buys 1
```

from resulting in:

```text
Stock = -1
```

---

# 51. Inventory Reservation Rule

Where inventory reservation is used:

```text
Available
   ↓
Reserved
   ↓
Consumed
```

or:

```text
Reserved
   ↓
Released
```

must be explicitly handled.

---

# 52. Cart Rule

The cart belongs to the customer.

The backend must validate:

```text
Product exists
Product active
Vendor active
Product available
Quantity valid
```

before checkout.

---

# 53. Checkout Rule

Checkout must recalculate:

```text
Subtotal
Discount
Tax
Delivery Fee
Total
```

on the backend.

---

# 54. Order Transaction Rule

Order creation must use a database transaction where multiple dependent writes are involved.

Conceptually:

```text
Create Order
+
Create Order Items
+
Reserve Inventory
+
Create Payment Record
+
Create Delivery
```

If required operations fail:

```text
ROLLBACK
```

---

# 55. Idempotency Rule

Critical operations must support idempotency.

Required candidates:

```text
Create Order
Create Payment
Confirm Pickup
Confirm Delivery
Refund
```

---

# 56. Idempotency Key Rule

Critical requests should support:

```text
Idempotency-Key
```

Duplicate requests must not create duplicate business operations.

---

# 57. Payment Rule

Payment logic must be isolated from order logic.

Use:

```text
PaymentService
```

Do not put payment-provider-specific logic throughout the order module.

---

# 58. Payment Provider Rule

Payment providers must be abstracted.

The architecture should allow the provider to be replaced without rewriting:

```text
OrderService
DeliveryService
CustomerApp
VendorApp
```

---

# 59. Payment Status Rule

Payment states:

```text
PENDING
PROCESSING
SUCCESS
FAILED
REFUND_PENDING
REFUNDED
```

Only valid transitions are allowed.

---

# 60. Payment Webhook Rule

Payment webhooks must be treated as authoritative for asynchronous payment confirmation.

Webhook processing must be:

```text
Authenticated
Validated
Idempotent
State-aware
Logged
```

---

# 61. Delivery Rule

Delivery is a separate domain from Order.

Do not put all delivery logic directly inside:

```text
OrderService
```

Use:

```text
DeliveryService
```

---

# 62. Delivery State Machine Rule

Valid delivery states:

```text
PENDING
SEARCHING_DRIVER
DRIVER_ASSIGNED
DRIVER_ACCEPTED
ARRIVED_AT_PICKUP
PICKED_UP
OUT_FOR_DELIVERY
ARRIVED_AT_DESTINATION
DELIVERED
```

Failure states:

```text
CANCELLED
FAILED
EXPIRED
```

---

# 63. Driver Assignment Rule

Driver assignment must be atomic.

Scenario:

```text
Driver A accepts
Driver B accepts
```

Only one driver can win.

The backend must reject the losing request.

---

# 64. Driver Eligibility Rule

Only drivers satisfying the required conditions may receive assignments.

Potential conditions:

```text
Approved
Active
Online
Available
Eligible for delivery
Within service area
```

---

# 65. Driver Availability Rule

Driver states should distinguish:

```text
OFFLINE
ONLINE
BUSY
```

A driver handling an active delivery must not receive another incompatible assignment.

---

# 66. Pickup Rule

A driver may only pick up an order when:

```text
Order = READY_FOR_PICKUP
```

The backend must verify this.

---

# 67. Pickup Verification Rule

Pickup should use a verification mechanism such as:

```text
OTP
QR Code
Order Code
Vendor Confirmation
```

The verification mechanism must be server-validated.

---

# 68. Delivery Verification Rule

A delivery should use customer verification where enabled.

Preferred MVP mechanism:

```text
Delivery OTP
```

The driver must not be able to mark an order delivered without satisfying the required verification.

---

# 69. Delivery Ownership Rule

Only:

```text
Assigned Driver
```

may perform driver-specific delivery actions.

Admin may override actions only through explicitly authorized administrative operations.

---

# 70. Driver Location Rule

Location tracking should primarily occur during active delivery.

Do not continuously track drivers unnecessarily.

---

# 71. Location Frequency Rule

Location updates must be throttled.

Do not send GPS coordinates every possible millisecond.

Use a controlled combination of:

```text
Distance threshold
Time threshold
Delivery state
Battery considerations
```

---

# 72. Location Storage Rule

Do not store unlimited raw GPS data indefinitely in PostgreSQL.

Separate:

```text
Current Driver Location
```

from:

```text
Historical Location Data
```

where required.

---

# 73. Realtime Rule

Real-time communication is for synchronization and user experience.

It is NOT the source of truth.

If a client misses an event:

```text
Client → REST API → Current State
```

must restore the correct state.

---

# 74. Realtime Event Rule

Events should be domain-oriented.

Examples:

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

---

# 75. Notification Rule

Notifications must never determine business state.

Correct:

```text
Order State Changed
      ↓
Notification Sent
```

Incorrect:

```text
Notification Failed
      ↓
Order Failed
```

---

# 76. Notification Channels

Support:

```text
Push
In-App
Email
```

where applicable.

---

# 77. Background Job Rule

Long-running or non-critical operations should not block normal API responses.

Examples:

```text
Email
Push Notifications
Analytics
Cleanup
Payment Reconciliation
Payout Processing
```

Use background jobs where appropriate.

---

# 78. Admin Rule

Admin actions must be auditable.

Sensitive actions must generate audit records.

Examples:

```text
Approve Vendor
Reject Vendor
Suspend Vendor
Approve Driver
Suspend Driver
Delete Product
Refund Order
Modify Platform Settings
```

---

# 79. Audit Log Rule

Audit logs should contain:

```text
actor
action
resource
resourceId
timestamp
metadata
```

Do not store secrets in audit logs.

---

# 80. Vendor Approval Rule

Vendor onboarding:

```text
PENDING
 ↓
UNDER_REVIEW
 ↓
APPROVED
 ↓
ACTIVE
```

Possible:

```text
REJECTED
SUSPENDED
```

A vendor must not operate before required approval.

---

# 81. Driver Approval Rule

Driver onboarding:

```text
PENDING
 ↓
UNDER_REVIEW
 ↓
APPROVED
 ↓
ACTIVE
```

Possible:

```text
REJECTED
SUSPENDED
```

A driver must not receive delivery assignments before required approval.

---

# 82. Product Rule

Products must belong to a vendor.

Required conceptual fields:

```text
name
description
price
vendorId
categoryId
status
inventory
```

---

# 83. Product Status Rule

Products should support states such as:

```text
ACTIVE
INACTIVE
OUT_OF_STOCK
ARCHIVED
```

Do not permanently delete products when historical orders depend on them unless data-retention policy explicitly permits it.

---

# 84. Product Image Rule

Product images must use object storage.

Do not store large binary images directly in PostgreSQL.

---

# 85. File Upload Rule

All uploads must validate:

```text
File type
File size
File extension
Content type
Ownership
```

Never trust the client-provided filename or MIME type alone.

---

# 86. Customer App Rule

The Customer App must focus on:

```text
Discovery
Shopping
Checkout
Tracking
Orders
Profile
```

Do not expose vendor or driver administrative functionality.

---

# 87. Vendor App Rule

The Vendor App must focus on:

```text
Products
Inventory
Orders
Store
Earnings
```

Do not expose customer administrative functionality.

---

# 88. Driver App Rule

The Driver App must focus on:

```text
Availability
Delivery Assignment
Pickup
Navigation
Delivery
Earnings
```

Keep the interface simple because it is an operational application.

---

# 89. Admin Web Rule

The Admin Website must focus on:

```text
Management
Monitoring
Operations
Moderation
Analytics
Configuration
```

---

# 90. No Public Landing Page Rule

The applications should not require a marketing landing page for authentication.

Application entry:

```text
Login
Sign Up
Google Authentication
```

After successful authentication, users are routed according to their role.

---

# 91. Role-Based Routing Rule

Examples:

```text
ADMIN
 → Admin Dashboard

CUSTOMER
 → Customer App

VENDOR
 → Vendor App

DRIVER
 → Driver App
```

The backend still performs authorization independently.

---

# 92. UI Rule

The UI must be:

```text
Simple
Fast
Friendly
Playful
Readable
Responsive
Accessible
```

Do not sacrifice usability for visual effects.

---

# 93. Design Consistency Rule

Shared visual concepts should remain consistent across applications:

```text
Typography
Spacing
Buttons
Inputs
Status indicators
Error states
Loading states
```

Role-specific interfaces may have different navigation and information density.

---

# 94. Loading State Rule

Every asynchronous operation must provide feedback.

Examples:

```text
Loading...
Saving...
Processing...
Finding driver...
Updating...
```

Use skeleton loading for large content sections where appropriate.

---

# 95. Empty State Rule

Empty screens must explain what happened and what the user can do.

Bad:

```text
[Blank screen]
```

Good:

```text
No orders yet.
Your orders will appear here.
```

---

# 96. Error UI Rule

Errors must provide:

```text
What happened
What the user can do
```

Avoid technical database messages.

---

# 97. Form Rule

Forms must:

- Validate inputs
- Show field-level errors
- Disable duplicate submissions
- Show loading state
- Preserve valid input when possible
- Handle network errors

---

# 98. Double Submission Rule

Buttons performing critical mutations must prevent accidental duplicate requests.

Examples:

```text
Place Order
Pay
Accept Delivery
Confirm Pickup
Confirm Delivery
Refund
```

Combine frontend protection with backend idempotency.

Frontend protection alone is insufficient.

---

# 99. Mobile Network Rule

Mobile applications must handle:

```text
Slow network
No network
Request timeout
Server errors
Reconnect
```

Do not assume a stable connection.

---

# 100. Offline Rule

Cached data can be used for UX.

But offline state must never override server truth.

Never allow offline clients to permanently decide:

```text
Payment Success
Delivery Complete
Order Complete
```

---

# 101. API Client Rule

All mobile applications should use the shared API client.

Do not duplicate request-building logic across:

```text
customer-mobile
vendor-mobile
driver-mobile
```

---

# 102. Server State Rule

Use TanStack Query for server state.

Do not duplicate server data into multiple unrelated state stores.

---

# 103. Local State Rule

Local state should contain:

```text
UI state
Temporary form state
Filters
Modal state
Navigation state
```

Not authoritative business state.

---

# 104. API Contract Rule

API contracts should be shared where practical.

Use:

```text
packages/api-contracts
```

for:

```text
Request types
Response types
Enums
Validation schemas
```

---

# 105. Dependency Rule

Business logic must not depend on UI components.

Incorrect:

```text
OrderService
 ↓
React Component
```

Correct:

```text
React App
 ↓
API
 ↓
OrderService
```

---

# 106. Domain Dependency Rule

Preferred dependency direction:

```text
API
 ↓
Application
 ↓
Domain
 ↓
Repository
 ↓
Infrastructure
```

Do not create uncontrolled circular dependencies.

---

# 107. Service Responsibility Rule

Services should own business operations.

Examples:

```text
OrderService
DeliveryService
PaymentService
InventoryService
VendorService
DriverService
NotificationService
```

---

# 108. Repository Responsibility Rule

Repositories should primarily handle persistence.

They should not contain UI logic.

They should not decide whether a user is authorized to perform an operation.

---

# 109. Policy Responsibility Rule

Policies determine authorization.

Examples:

```text
OrderPolicy
ProductPolicy
DeliveryPolicy
VendorPolicy
DriverPolicy
PaymentPolicy
```

---

# 110. Validation Responsibility Rule

Validation checks whether input is structurally valid.

Business rules belong in services.

Example:

```text
Zod:
"quantity must be greater than zero"

Service:
"quantity cannot exceed available inventory"
```

---

# 111. Environment Variable Rule

Secrets must be stored in environment variables.

Examples:

```text
DATABASE_URL
BETTER_AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
PAYMENT_SECRET
PAYMENT_WEBHOOK_SECRET
STORAGE_SECRET
MAP_PROVIDER_SECRET
```

---

# 112. Environment Separation Rule

Use separate configurations for:

```text
development
staging
production
```

Never use production secrets locally.

---

# 113. Git Rule

Never commit:

```text
.env
.env.local
private keys
passwords
API secrets
database credentials
payment secrets
```

Provide:

```text
.env.example
```

instead.

---

# 114. Secret Exposure Rule

Never expose server secrets to:

```text
Browser
React Native Bundle
Client Components
Public API Responses
Logs
```

---

# 115. API Security Rule

Protected APIs must verify:

```text
Authentication
Authorization
Validation
Rate Limits
```

where applicable.

---

# 116. Rate Limiting Rule

Rate limiting should be stronger for:

```text
Login
Sign Up
Password Reset
OTP
Payment
Search
Public APIs
```

---

# 117. Logging Rule

Use structured logs.

Example:

```json
{
  "event": "order.created",
  "orderId": "order_123",
  "customerId": "user_123",
  "timestamp": "..."
}
```

---

# 118. Sensitive Logging Rule

Never log:

```text
Passwords
Access Tokens
Session Secrets
Payment Secrets
Full Authentication Headers
```

Avoid unnecessary sensitive personal information.

---

# 119. Observability Rule

Monitor:

```text
Request latency
Error rate
Database latency
Database errors
Order failures
Payment failures
Driver assignment failures
Delivery failures
Notification failures
```

---

# 120. Testing Rule

Critical business logic must have automated tests.

Minimum testing layers:

```text
Unit
Integration
API
End-to-End
```

---

# 121. Unit Test Rule

Unit test:

```text
Pricing
State transitions
Authorization policies
Inventory calculations
Driver assignment logic
Payment calculations
```

---

# 122. Integration Test Rule

Integration tests should verify:

```text
Service
 ↓
Repository
 ↓
Prisma
 ↓
PostgreSQL
```

---

# 123. E2E Rule

The complete delivery workflow must have E2E coverage.

```text
Customer
 ↓
Order
 ↓
Vendor
 ↓
Prepare
 ↓
Driver
 ↓
Pickup
 ↓
Delivery
 ↓
Customer Confirmation
```

---

# 124. Test Data Rule

Use dedicated test data.

Never run destructive automated tests against production.

---

# 125. Database Testing Rule

Tests requiring database state should use isolated test databases or properly controlled test transactions.

---

# 126. Build Rule

Every pull request should pass:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

where applicable to the affected applications.

---

# 127. Formatting Rule

Use one formatter across the repository.

Formatting must be automated.

Developers should not manually maintain inconsistent formatting.

---

# 128. Linting Rule

Linting is mandatory.

Do not suppress lint errors without a reason.

Avoid:

```ts
// eslint-disable-next-line
```

unless the exception is genuinely necessary.

---

# 129. Documentation Rule

Major architectural decisions must be documented.

Required documentation includes:

```text
PRD.md
architecture.md
rules.md
```

Additional specifications may include:

```text
database-spec.md
api-spec.md
auth-spec.md
order-spec.md
delivery-spec.md
payment-spec.md
```

---

# 130. AI Coding Rule

AI-generated code must follow all project rules.

AI must not:

- Introduce npm
- Introduce another ORM
- Create another backend
- Bypass authorization
- Put secrets in code
- Add microservices unnecessarily
- Modify database directly
- Trust client-side financial values

---

# 131. AI Modification Rule

Before modifying a module, AI-generated tooling should inspect:

```text
rules/
architecture.md
relevant service
relevant schema
existing tests
```

Do not rewrite existing architecture blindly.

---

# 132. AI Dependency Rule

AI must not add a new dependency simply because it makes one small implementation easier.

Before adding a dependency:

```text
1. Check existing dependencies
2. Check whether native functionality exists
3. Check whether an existing package solves it
4. Evaluate maintenance and security
5. Add only if justified
```

---

# 133. Dependency Version Rule

Avoid unnecessary dependency churn.

Do not upgrade major dependencies during unrelated feature work.

---

# 134. Package Installation Rule

All dependencies must be installed with pnpm.

Example:

```bash
pnpm add zod
```

Development dependency:

```bash
pnpm add -D vitest
```

Workspace dependency:

```bash
pnpm --filter @delivery/api-client add ...
```

---

# 135. Prisma Commands Rule

Use:

```bash
pnpm prisma generate
pnpm prisma migrate dev
pnpm prisma migrate deploy
pnpm prisma studio
pnpm prisma db seed
```

Never use:

```bash
npx prisma ...
```

---

# 136. Workspace Command Rule

Prefer pnpm filtering.

Example:

```bash
pnpm --filter admin-web dev
```

or:

```bash
pnpm --filter customer-mobile ...
```

Do not create random shell scripts to replace workspace management when pnpm already provides the capability.

---

# 137. CI Rule

CI must use pnpm.

Example conceptual workflow:

```text
Checkout
   ↓
Install pnpm
   ↓
pnpm install --frozen-lockfile
   ↓
Lint
   ↓
Typecheck
   ↓
Test
   ↓
Build
```

---

# 138. Lockfile Rule

The repository must commit:

```text
pnpm-lock.yaml
```

Do not delete or regenerate the lockfile unnecessarily.

---

# 139. Reproducible Installation Rule

CI should use:

```bash
pnpm install --frozen-lockfile
```

to ensure dependency reproducibility.

---

# 140. Workspace Package Naming Rule

Use scoped package names.

Example:

```text
@delivery/types
@delivery/api-client
@delivery/validation
@delivery/database
@delivery/config
```

---

# 141. UI Component Rule

Reusable UI components should be centralized where practical.

Examples:

```text
Button
Input
Modal
Table
Card
Badge
Status
Loader
EmptyState
ErrorState
```

Do not duplicate identical components across all applications unnecessarily.

---

# 142. Role-Specific UI Rule

Shared components can be reused.

Business screens should remain role-specific.

Do not create one giant UI component containing:

```text
if admin
if customer
if vendor
if driver
```

for the entire application.

Prefer separate role-specific features.

---

# 143. Accessibility Rule

Web interfaces must support:

- Keyboard navigation
- Proper labels
- Focus states
- Semantic HTML
- Accessible forms
- Sufficient contrast
- Screen-reader-friendly controls

---

# 144. Responsive Rule

Admin Web must support:

```text
Desktop
Tablet
```

Mobile applications should be optimized for:

```text
Phone
```

Do not simply shrink desktop interfaces into mobile layouts.

---

# 145. Navigation Rule

Customer:

```text
Home
Explore
Orders
Cart
Profile
```

Vendor:

```text
Dashboard
Orders
Products
Inventory
Earnings
Profile
```

Driver:

```text
Dashboard
Deliveries
History
Earnings
Profile
```

Admin:

```text
Dashboard
Customers
Vendors
Drivers
Products
Orders
Deliveries
Payments
Analytics
Reviews
Notifications
Settings
Audit Logs
```

---

# 146. Search Rule

Search must be server-backed for large datasets.

Do not download the entire product/order/user dataset to the client and filter locally.

---

# 147. Pagination Rule

Large datasets must be paginated.

Required for:

```text
Orders
Users
Products
Drivers
Vendors
Reviews
Audit Logs
```

---

# 148. Sorting Rule

Large administrative tables should use server-side sorting.

---

# 149. Filtering Rule

Filters should be represented as validated API parameters.

Do not trust arbitrary filter expressions from clients.

---

# 150. Caching Rule

Cache only data where the invalidation strategy is clear.

Good candidates:

```text
Categories
Static configuration
Low-volatility metadata
```

Be careful with:

```text
Inventory
Payment state
Delivery state
```

---

# 151. Cache Invalidation Rule

Every cache must have an explicit invalidation or expiration strategy.

Never add caching without answering:

```text
When does this data become stale?
How is stale data invalidated?
```

---

# 152. Realtime Fallback Rule

Every important real-time feature must have a REST/API fallback.

Example:

```text
WebSocket missed event
        ↓
GET /orders/:id
        ↓
Recover latest state
```

---

# 153. Background Job Rule

Background jobs must be:

```text
Retryable
Idempotent
Observable
Failure-aware
```

---

# 154. Job Failure Rule

A failed notification should not cause the business transaction itself to fail unless explicitly required.

Example:

```text
Order created successfully
Notification failed
```

The order remains created.

---

# 155. External Service Rule

External providers must be wrapped behind internal services.

Examples:

```text
PaymentProvider
MapProvider
StorageProvider
NotificationProvider
EmailProvider
```

Do not spread provider SDK calls throughout business logic.

---

# 156. Provider Replacement Rule

The system should allow replacing:

```text
Payment provider
Map provider
Object storage
Email provider
Push notification provider
```

without rewriting core domain logic.

---

# 157. API Timeout Rule

External API requests must have appropriate timeouts.

Never allow external services to hang backend requests indefinitely.

---

# 158. Retry Rule

Retries must only be used where the operation is safe to retry.

Do not blindly retry:

```text
Payment creation
Order creation
Delivery confirmation
```

unless idempotency is guaranteed.

---

# 159. Transaction Rule

Transactions should be short and focused.

Do not perform:

```text
External API calls
Large network operations
Long computations
```

inside database transactions unless unavoidable.

---

# 160. Payment + Database Rule

Do not assume a payment provider and PostgreSQL transaction can participate in one atomic transaction.

Use explicit state machines and reconciliation.

---

# 161. Data Retention Rule

Retention periods should be defined for:

```text
Audit logs
Driver locations
Notifications
Payment records
Order records
```

Do not keep high-volume operational data indefinitely without a reason.

---

# 162. Privacy Rule

Only collect information necessary for the feature.

Especially for:

```text
Customer addresses
Driver identity
Driver documents
Location
Payment information
```

---

# 163. Driver Location Privacy Rule

Driver location should not be exposed to arbitrary users.

Location access must be scoped to:

```text
Active delivery
Authorized customer
Authorized admin
Authorized operational systems
```

---

# 164. Document Security Rule

Vendor and driver verification documents are sensitive.

They must:

- Use private storage
- Require authorization
- Never use publicly guessable URLs
- Be access-controlled
- Avoid unnecessary duplication

---

# 165. Payment Data Rule

Do not store sensitive card information unless explicitly required and legally/compliantly supported.

Prefer tokenized payment-provider workflows.

---

# 166. Production Security Rule

Production must use:

```text
HTTPS
Secure authentication
Secure cookies where applicable
Secret management
Database access controls
Rate limiting
Monitoring
Backups
```

---

# 167. Backup Rule

Production PostgreSQL must have:

```text
Automated backups
Retention policy
Recovery process
Recovery testing
```

A backup that has never been restored is not considered verified.

---

# 168. Disaster Recovery Rule

Document:

```text
Database restoration
Application redeployment
Environment restoration
Secret restoration
Storage restoration
```

---

# 169. Performance Rule

Optimize based on measured bottlenecks.

Do not prematurely optimize.

First prioritize:

```text
Correctness
Security
Data Integrity
Maintainability
```

then optimize measured performance problems.

---

# 170. Performance Targets

Initial target:

```text
Typical API response:
< 300ms
```

excluding slow external dependencies.

The target is a performance objective, not a guarantee for every endpoint.

---

# 171. Database Query Rule

Avoid:

```text
N+1 queries
Unbounded queries
SELECT * where unnecessary
Large joins without indexes
```

Use:

```text
Pagination
Selective fields
Indexes
Efficient relations
```

---

# 172. Mobile Performance Rule

Mobile apps must minimize:

```text
Network requests
Large images
Unnecessary rerenders
Background GPS usage
Memory-heavy screens
```

---

# 173. Image Optimization Rule

Product images should be:

```text
Compressed
Resized
Optimized
```

Do not upload unnecessarily huge images from mobile applications.

---

# 174. Architecture Change Rule

Any major architecture change must update:

```text
architecture.md
rules.md
Relevant specification
```

Examples:

```text
Changing ORM
Changing authentication
Introducing microservices
Changing database
Adding major infrastructure
Changing API architecture
```

---

# 175. New Dependency Rule

Before introducing a major dependency, document:

```text
Why is it needed?
What problem does it solve?
Why can't existing infrastructure solve it?
What are the maintenance implications?
```

---

# 176. Microservice Rule

Do NOT introduce microservices during MVP simply because the platform has multiple roles.

The correct initial architecture is:

```text
Modular Monolith
```

Extract services only when justified by:

```text
Scale
Deployment independence
Team ownership
Operational requirements
Resource isolation
```

---

# 177. Multi-Vendor Rule

Multi-vendor checkout is NOT part of the initial architecture.

MVP:

```text
Cart
 ↓
One Vendor
 ↓
One Order
 ↓
One Delivery
```

Multi-vendor checkout may be added later.

---

# 178. AI Feature Rule

AI must not be added merely because it sounds useful.

Potential future AI features include:

```text
Product recommendations
Support assistant
Fraud detection
Delivery prediction
Demand forecasting
```

These must not interfere with the core deterministic delivery workflow.

---

# 179. Core Business Logic Rule

The following systems must remain deterministic:

```text
Pricing
Inventory
Order State
Payment State
Delivery State
Driver Assignment
Authorization
```

AI must never arbitrarily control these systems.

---

# 180. Analytics Rule

Analytics must not affect critical transaction correctness.

Example:

```text
Analytics unavailable
```

must not prevent:

```text
Order creation
Payment confirmation
Delivery completion
```

unless explicitly required.

---

# 181. Feature Flag Rule

Experimental functionality should be isolated behind feature flags where appropriate.

Do not deploy incomplete functionality into production without controlled activation.

---

# 182. Release Rule

Every production release should have:

```text
Version
Changelog
Migration status
Rollback strategy
Monitoring plan
```

---

# 183. Rollback Rule

Deployments must have a rollback strategy.

Database migrations must be designed carefully because application rollback alone may not reverse schema changes.

---

# 184. Mobile Version Rule

The backend must consider that users may have older versions of:

```text
Customer App
Vendor App
Driver App
```

Avoid breaking API changes without a migration strategy.

---

# 185. Backward Compatibility Rule

Prefer:

```text
Additive API changes
```

over:

```text
Breaking API changes
```

when possible.

---

# 186. Code Organization Rule

Organize code by domain/feature rather than dumping everything into generic folders.

Prefer:

```text
modules/orders/
modules/deliveries/
modules/payments/
```

over:

```text
controllers/
services/
utils/
```

containing hundreds of unrelated files.

---

# 187. Utility Rule

Do not create a giant:

```text
utils.ts
```

file.

Utilities should be small and domain-independent.

---

# 188. Constants Rule

Shared constants should live in a dedicated package/module.

Examples:

```text
OrderStatus
DeliveryStatus
PaymentStatus
UserRole
```

---

# 189. Enum Rule

Use consistent enums for important state machines.

Avoid arbitrary strings throughout the application.

---

# 190. State Machine Rule

Order and delivery states must have explicit transition rules.

Do not implement transitions as arbitrary string updates.

Preferred:

```text
OrderStateMachine.transition(...)
DeliveryStateMachine.transition(...)
```

---

# 191. Business Event Rule

Important state changes should produce domain events.

Example:

```text
Order → READY_FOR_PICKUP
```

may produce:

```text
ORDER_READY
```

which can be consumed by:

```text
Delivery
Notification
Analytics
```

---

# 192. Event Reliability Rule

Events that affect important asynchronous workflows should be designed for:

```text
Duplicate delivery
Retry
Delayed processing
Failure
```

Consumers should therefore be idempotent.

---

# 193. Admin Override Rule

Administrative overrides must be explicit.

Do not allow Admin to bypass state rules silently.

If an Admin performs an exceptional operation:

```text
Reason
Actor
Timestamp
Target
Action
```

should be recorded.

---

# 194. Financial Adjustment Rule

Manual financial adjustments must always be auditable.

Never silently modify:

```text
Vendor earnings
Driver earnings
Customer payment
Refund amount
Platform fee
```

---

# 195. Vendor Earnings Rule

Vendor earnings should be derived from recorded financial transactions rather than mutable UI calculations.

---

# 196. Driver Earnings Rule

Driver earnings should be derived from completed delivery/financial records.

---

# 197. Analytics Source Rule

Analytics should preferably be derived from authoritative transactional data or domain events.

Do not treat client-generated analytics as authoritative.

---

# 198. Testing Business States

Tests must cover invalid transitions as well as valid transitions.

Example:

```text
PICKED_UP → DELIVERED
```

may be valid.

But:

```text
CREATED → DELIVERED
```

must fail.

---

# 199. Security Testing Rule

Security tests must include:

```text
Unauthorized access
Cross-vendor access
Cross-customer access
Cross-driver access
Admin endpoint protection
Invalid state manipulation
Price manipulation
Inventory manipulation
Payment manipulation
```

---

# 200. Final Engineering Rule

The project must always preserve these principles:

```text
1. pnpm is mandatory.
2. TypeScript is mandatory.
3. Next.js is the web/backend foundation.
4. React Native is used for the three mobile applications.
5. PostgreSQL is the database.
6. Prisma is the ORM.
7. Better Auth is the authentication system.
8. The backend is the source of truth.
9. Authorization is enforced server-side.
10. Business logic belongs on the server.
11. Customers, vendors and drivers are isolated by ownership.
12. Orders use explicit state transitions.
13. Deliveries use explicit state transitions.
14. Inventory operations are transactional.
15. Payments are idempotent and provider-abstracted.
16. Critical operations are idempotent.
17. Real-time events are not the source of truth.
18. External services are abstracted.
19. Secrets never enter client applications.
20. Prisma migrations are mandatory for schema changes.
21. Critical business logic must be tested.
22. The MVP remains a modular monolith.
23. Multi-vendor checkout is not part of MVP.
24. AI must not control deterministic business-critical operations.
25. Architecture changes must be documented.
```

---

# 201. Canonical Project Command Reference

## Install

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build
```

## Production

```bash
pnpm start
```

## Lint

```bash
pnpm lint
```

## Type Check

```bash
pnpm typecheck
```

## Test

```bash
pnpm test
```

## Prisma Generate

```bash
pnpm prisma generate
```

## Prisma Migration

```bash
pnpm prisma migrate dev
```

## Prisma Production Migration

```bash
pnpm prisma migrate deploy
```

## Prisma Studio

```bash
pnpm prisma studio
```

## Prisma Seed

```bash
pnpm prisma db seed
```

## Add Dependency

```bash
pnpm add <package>
```

## Add Development Dependency

```bash
pnpm add -D <package>
```

## Remove Dependency

```bash
pnpm remove <package>
```

## Workspace Command

```bash
pnpm --filter <package-name> <command>
```

## CI Installation

```bash
pnpm install --frozen-lockfile
```

---

# 202. Absolute Prohibitions

The following are prohibited unless explicitly approved through an architecture change:

```text
❌ npm
❌ yarn
❌ bun as package manager
❌ npx
❌ Separate backend per application
❌ Separate authentication system per role
❌ Direct Prisma access from frontend
❌ Client-controlled pricing
❌ Client-controlled inventory
❌ Client-controlled payment status
❌ Client-controlled delivery completion
❌ Client-controlled authorization
❌ Storing server secrets in mobile apps
❌ Unbounded GPS tracking
❌ Unbounded database queries
❌ Uncontrolled state transitions
❌ Non-idempotent payment operations
❌ Microservices without justification
❌ Multi-vendor checkout in MVP
❌ Untracked financial adjustments
❌ Production database changes without migrations
❌ Committing secrets
```

---

# 203. Final Rule

When implementing any new feature, the implementation must answer:

```text
Which application owns this feature?

Which backend module owns the business logic?

Which user role is allowed to perform it?

Which database entities are affected?

Which state transitions are involved?

Does the operation require a transaction?

Does it require idempotency?

Does it require a domain event?

Does it require realtime synchronization?

Does it require an audit record?

Does it expose sensitive data?

Does it require a new dependency?

Does it require an architecture change?
```

If these questions cannot be answered clearly, the feature is not ready for implementation.

---

# 204. Final Architecture Principle

```text
                         DELIVERY PLATFORM

       ┌────────────────────────────────────────────┐
       │                 CLIENTS                    │
       │                                            │
       │ Admin Web                                  │
       │ Customer App                               │
       │ Vendor App                                 │
       │ Driver App                                 │
       └────────────────────┬───────────────────────┘
                            │
                            ▼
       ┌────────────────────────────────────────────┐
       │             NEXT.JS BACKEND                │
       │                                            │
       │ Auth                                       │
       │ Authorization                              │
       │ Catalog                                    │
       │ Inventory                                  │
       │ Orders                                     │
       │ Payments                                   │
       │ Deliveries                                 │
       │ Notifications                              │
       │ Analytics                                  │
       │ Administration                             │
       └────────────────────┬───────────────────────┘
                            │
                         Prisma
                            │
                            ▼
       ┌────────────────────────────────────────────┐
       │                PostgreSQL                  │
       │                                            │
       │ Persistent Source of Truth                 │
       └────────────────────────────────────────────┘
```

**The clients provide interfaces.
The backend owns business logic.
PostgreSQL owns persistent state.
Better Auth owns authentication.
Prisma owns database access.
`pnpm` owns dependency management.**

This separation must remain intact throughout the project.

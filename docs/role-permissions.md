# Role Permissions Specification

**Project:** Multi-Role Delivery Platform
**Document:** `role-permissions.md`
**Version:** 1.0.0
**Status:** Specification
**Last Updated:** 2026-09-29

---

## 1. Purpose

This document defines the authorization model for the delivery platform.

The platform contains four primary roles:

1. `ADMIN`
2. `CUSTOMER`
3. `VENDOR`
4. `DRIVER`

The system consists of:

- Admin Web Application
- Customer Mobile Application
- Vendor Mobile Application
- Driver Mobile Application
- Shared Next.js backend/API
- PostgreSQL database
- Better Auth authentication system

Authentication determines **who the user is**.

Authorization determines **what that user is allowed to do**.

This document defines authorization.

---

# 2. Authorization Principles

## 2.1 Server-Side Authorization Is Mandatory

Permissions must never be enforced only in:

- React components
- React Native screens
- navigation guards
- hidden buttons
- client-side state
- URL restrictions

The backend must independently validate every protected operation.

Example:

```text
Client:
Hide "Delete Product" button

Backend:
Check:
1. User authenticated?
2. User role = VENDOR?
3. Product belongs to this vendor?
4. Vendor is allowed to modify product?
5. Request valid?

Only then execute mutation.
```

Client-side permission checks exist for UX.

Server-side permission checks exist for security.

---

# 3. Roles

## 3.1 ADMIN

The platform administrator has system-level management capabilities.

Admin can manage:

- users
- vendors
- drivers
- products
- orders
- deliveries
- payments
- platform configuration
- disputes
- moderation
- operational monitoring
- audit logs

Admin does not automatically bypass every business rule.

Sensitive operations must still follow explicit authorization and audit requirements.

---

## 3.2 CUSTOMER

Customers use the platform to:

- browse vendors
- browse products
- maintain a cart
- place orders
- make payments
- track deliveries
- manage their profile
- view order history
- request cancellations/refunds where permitted

Customers may only access resources belonging to themselves or resources explicitly exposed as public.

---

## 3.3 VENDOR

Vendors sell products through the platform.

Vendors can:

- manage their store
- manage their products
- manage inventory
- receive orders
- process orders
- prepare orders
- mark orders ready for pickup
- view relevant delivery information
- view vendor financial information

Vendors cannot access another vendor's private data.

---

## 3.4 DRIVER

Drivers perform deliveries.

Drivers can:

- manage their driver profile
- view available delivery assignments
- accept eligible deliveries
- reject/decline eligible assignments
- update pickup status
- update delivery status
- submit delivery proof
- share location while actively delivering
- view relevant order information

Drivers cannot modify:

- product prices
- customer account information
- vendor products
- platform settings
- payment records

---

# 4. Permission Model

Permissions follow:

```text
ROLE
  ↓
RESOURCE
  ↓
ACTION
  ↓
OWNERSHIP / SCOPE
  ↓
BUSINESS RULE
```

Example:

```text
VENDOR
  ↓
PRODUCT
  ↓
UPDATE
  ↓
Product belongs to vendor
  ↓
Vendor account is active
```

Only after all conditions pass should the operation be allowed.

---

# 5. Permission Naming Convention

Permissions should follow:

```text
<resource>:<action>
```

Examples:

```text
users:read
users:update
vendors:approve
products:create
products:update
orders:read
orders:update
deliveries:assign
deliveries:update
payments:refund
```

Where ownership matters:

```text
products:update:own
orders:read:own
deliveries:read:assigned
```

---

# 6. Permission Categories

## 6.1 User Management

| Permission         | Admin | Customer | Vendor | Driver |
| ------------------ | ----: | -------: | -----: | -----: |
| `users:read`       |    ✅ |       ❌ |     ❌ |     ❌ |
| `users:create`     |    ✅ |     Self |     ❌ |     ❌ |
| `users:update`     |    ✅ |     Self |     ❌ |     ❌ |
| `users:delete`     |    ✅ |       ❌ |     ❌ |     ❌ |
| `users:suspend`    |    ✅ |       ❌ |     ❌ |     ❌ |
| `users:restore`    |    ✅ |       ❌ |     ❌ |     ❌ |
| `users:read:own`   |    ❌ |       ✅ |     ❌ |     ❌ |
| `users:update:own` |    ❌ |       ✅ |     ❌ |     ❌ |

---

# 7. Authentication Permissions

Authentication is handled centrally.

All roles may:

- sign up
- sign in
- sign out
- use Google authentication
- refresh/re-establish sessions
- reset credentials where applicable
- manage their own authentication settings

Authentication does not grant resource permissions.

Example:

```text
Authenticated CUSTOMER
≠
Authorized to read arbitrary orders
```

---

# 8. Profile Management

| Action                   |      Admin | Customer |     Vendor |     Driver |
| ------------------------ | ---------: | -------: | ---------: | ---------: |
| View own profile         |         ✅ |       ✅ |         ✅ |         ✅ |
| Update own profile       |         ✅ |       ✅ |         ✅ |         ✅ |
| View another profile     | Admin only |       ❌ |         ❌ |         ❌ |
| Modify another profile   | Admin only |       ❌ |         ❌ |         ❌ |
| Deactivate own account   | Restricted |       ✅ | Restricted | Restricted |
| Force deactivate account |         ✅ |       ❌ |         ❌ |         ❌ |

Sensitive profile information must not be exposed unnecessarily.

---

# 9. Vendor Management

## 9.1 Vendor Lifecycle

Vendor accounts follow:

```text
PENDING
   ↓
APPROVED
   ↓
ACTIVE
   ↓
SUSPENDED
   ↓
ACTIVE
```

Possible terminal state:

```text
CLOSED
```

Only authorized administrative workflows may transition vendor accounts between administrative states.

---

## 9.2 Vendor Permissions

| Permission                         | Admin | Customer | Vendor |  Driver |
| ---------------------------------- | ----: | -------: | -----: | ------: |
| View public vendor                 |    ✅ |       ✅ |     ✅ | Limited |
| Create vendor application          |    ✅ |       ❌ |   Self |      ❌ |
| Approve vendor                     |    ✅ |       ❌ |     ❌ |      ❌ |
| Reject vendor                      |    ✅ |       ❌ |     ❌ |      ❌ |
| Suspend vendor                     |    ✅ |       ❌ |     ❌ |      ❌ |
| Update own vendor                  |    ✅ |       ❌ |    Own |      ❌ |
| Delete vendor                      |    ✅ |       ❌ |     ❌ |      ❌ |
| View vendor analytics              |    ✅ |       ❌ |    Own |      ❌ |
| View another vendor's private data |    ✅ |       ❌ |     ❌ |      ❌ |

---

# 10. Product Permissions

## 10.1 Product Ownership

Every vendor-owned product must have an ownership relationship:

```text
Product
  └── vendorId
```

A vendor can modify a product only if:

```text
product.vendorId === authenticatedUser.vendorId
```

---

## 10.2 Product Permissions

| Action                  | Admin | Customer |     Vendor |  Driver |
| ----------------------- | ----: | -------: | ---------: | ------: |
| Browse active products  |    ✅ |       ✅ |         ✅ | Limited |
| View product details    |    ✅ |       ✅ |         ✅ | Limited |
| Create product          |    ✅ |       ❌ | Own vendor |      ❌ |
| Update product          |    ✅ |       ❌ | Own vendor |      ❌ |
| Delete product          |    ✅ |       ❌ | Own vendor |      ❌ |
| Activate product        |    ✅ |       ❌ | Own vendor |      ❌ |
| Deactivate product      |    ✅ |       ❌ | Own vendor |      ❌ |
| Change price            |    ✅ |       ❌ | Own vendor |      ❌ |
| Manage images           |    ✅ |       ❌ | Own vendor |      ❌ |
| Manage product metadata |    ✅ |       ❌ | Own vendor |      ❌ |

Vendor product mutations must validate vendor ownership.

---

# 11. Inventory Permissions

| Action                 |  Admin | Customer | Vendor | Driver |
| ---------------------- | -----: | -------: | -----: | -----: |
| View inventory         |     ✅ |       ❌ |    Own |     ❌ |
| Increase inventory     |     ✅ |       ❌ |    Own |     ❌ |
| Decrease inventory     |     ✅ |       ❌ |    Own |     ❌ |
| Adjust inventory       |     ✅ |       ❌ |    Own |     ❌ |
| Reserve inventory      | System |       ❌ |     ❌ |     ❌ |
| Release reservation    | System |       ❌ |     ❌ |     ❌ |
| View inventory history |     ✅ |       ❌ |    Own |     ❌ |

Customers do not directly modify inventory.

Inventory changes caused by orders must be performed by backend business logic.

---

# 12. Cart Permissions

Each customer has their own cart.

| Action          |  Admin | Customer | Vendor | Driver |
| --------------- | -----: | -------: | -----: | -----: |
| Create cart     | System |     Self |     ❌ |     ❌ |
| View cart       |  Admin |     Self |     ❌ |     ❌ |
| Add product     |  Admin |     Self |     ❌ |     ❌ |
| Remove product  |  Admin |     Self |     ❌ |     ❌ |
| Update quantity |  Admin |     Self |     ❌ |     ❌ |
| Clear cart      |  Admin |     Self |     ❌ |     ❌ |

The customer cannot modify another customer's cart.

---

# 13. Order Permissions

Orders are highly restricted resources.

Every order must contain ownership relationships:

```text
Order
├── customerId
├── vendorId
└── deliveryId
```

---

## 13.1 Customer Order Permissions

Customers can:

- create their own orders
- view their own orders
- cancel orders when cancellation rules allow
- view order status
- view delivery status
- request eligible refunds
- view payment status

Customers cannot:

- modify another customer's order
- change vendor-owned pricing
- assign drivers
- modify payment records
- manually mark orders delivered

---

## 13.2 Vendor Order Permissions

Vendors can access orders belonging to their vendor.

They can:

- view incoming orders
- accept orders
- reject orders where permitted
- begin preparation
- update preparation status
- mark order ready for pickup
- view relevant customer delivery information

They cannot:

- access another vendor's orders
- assign arbitrary drivers
- alter completed orders
- directly mark an order as delivered
- manually mark a payment as successful

---

## 13.3 Driver Order Permissions

Drivers can only access order information required for an assigned delivery.

They can:

- view pickup information
- view delivery information
- view relevant order contents
- update pickup status
- update delivery status
- submit proof of delivery

They cannot:

- change order prices
- modify products
- modify customer profile data
- cancel arbitrary orders
- alter payment status

---

## 13.4 Admin Order Permissions

Admins can:

- view orders
- search orders
- filter orders
- inspect order lifecycle
- investigate issues
- intervene where business rules explicitly permit
- initiate authorized refunds
- resolve operational disputes

Administrative mutations must be audited.

---

# 14. Order Ownership Rules

The backend must enforce:

```text
CUSTOMER:
order.customerId === session.user.id

VENDOR:
order.vendorId === session.vendorId

DRIVER:
order.delivery.driverId === session.driverId

ADMIN:
platform-level authorization
```

No client-provided `customerId`, `vendorId`, or `driverId` should be trusted.

---

# 15. Order Status Permissions

Example order lifecycle:

```text
PENDING
   ↓
CONFIRMED
   ↓
PREPARING
   ↓
READY_FOR_PICKUP
   ↓
PICKED_UP
   ↓
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Cancellation paths must be explicitly defined.

Example:

```text
PENDING → CANCELLED
CONFIRMED → CANCELLED
```

The backend must reject invalid transitions.

A client must never be able to send:

```json
{
  "status": "DELIVERED"
}
```

and bypass the lifecycle.

The backend determines whether the transition is valid.

---

# 16. Delivery Permissions

Delivery ownership is separate from order ownership.

A driver may interact with a delivery only when:

```text
delivery.driverId === authenticatedDriver.id
```

unless an authorized administrative operation is being performed.

---

## 16.1 Delivery Permission Matrix

| Action                 |        Admin |  Customer |    Vendor |                 Driver |
| ---------------------- | -----------: | --------: | --------: | ---------------------: |
| View delivery          |           ✅ | Own order | Own order |               Assigned |
| Create delivery        | System/Admin |        ❌ |        ❌ |                     ❌ |
| Assign driver          |           ✅ |        ❌ |        ❌ |                     ❌ |
| Accept delivery        |           ❌ |        ❌ |        ❌ |        Assigned driver |
| Reject delivery        |        Admin |        ❌ |        ❌ |        Assigned driver |
| Start pickup           |        Admin |        ❌ |        ❌ |        Assigned driver |
| Confirm pickup         |        Admin |        ❌ |   Limited |        Assigned driver |
| Start delivery         |        Admin |        ❌ |        ❌ |        Assigned driver |
| Update delivery status |        Admin |        ❌ |        ❌ |        Assigned driver |
| Submit delivery proof  |        Admin |        ❌ |        ❌ |        Assigned driver |
| Mark delivered         |        Admin |        ❌ |        ❌ | Assigned driver/system |

---

# 17. Driver Location Permissions

Driver location is sensitive operational data.

Location sharing should only be active when required.

Example:

```text
Driver Offline
     ↓
No active delivery
     ↓
Location tracking OFF

Active delivery
     ↓
Location tracking ON

Delivery completed
     ↓
Location tracking OFF
```

Customers may only receive the location information required to track their active delivery.

Vendors should not automatically receive unrestricted historical driver location data.

Admins may access operational location information according to platform policy.

---

# 18. Driver Assignment

Driver assignment must be controlled by the backend.

The system must verify:

```text
driver exists
AND
driver is approved
AND
driver is active
AND
driver is eligible
AND
driver is not already assigned to an incompatible delivery
```

Assignment must be atomic.

Two concurrent requests must not assign the same delivery to conflicting drivers.

---

# 19. Payment Permissions

Payments are financially sensitive resources.

| Action                  |                   Admin | Customer |       Vendor | Driver |
| ----------------------- | ----------------------: | -------: | -----------: | -----: |
| Create payment          |                  System |     Self |           ❌ |     ❌ |
| View own payment        |                   Admin |     Self |     Relevant |     ❌ |
| Change payment amount   |            Admin/System |       ❌ |           ❌ |     ❌ |
| Mark payment successful |          System/Webhook |       ❌ |           ❌ |     ❌ |
| Refund                  | Authorized Admin/System |  Request |      Request |     ❌ |
| View payment history    |                   Admin |      Own | Own relevant |     ❌ |

Payment success must be determined by trusted payment-provider confirmation or backend-controlled payment processing.

Client requests must never be trusted as proof of payment.

---

# 20. Refund Permissions

Refunds must follow explicit business rules.

Possible actors:

```text
CUSTOMER
  → Request refund

ADMIN
  → Review / approve / execute where permitted

PAYMENT SYSTEM
  → Execute refund

VENDOR
  → Provide operational input where applicable
```

A customer cannot directly execute a refund by calling a refund endpoint.

---

# 21. Notification Permissions

Users can manage their own notification preferences.

| Action                     | Admin | Customer | Vendor | Driver |
| -------------------------- | ----: | -------: | -----: | -----: |
| View own notifications     |    ✅ |       ✅ |     ✅ |     ✅ |
| Mark own notification read |    ✅ |       ✅ |     ✅ |     ✅ |
| Manage own preferences     |    ✅ |       ✅ |     ✅ |     ✅ |
| Send system notification   |    ✅ |       ❌ |     ❌ |     ❌ |
| Broadcast notification     | Admin |       ❌ |     ❌ |     ❌ |

System-generated notifications may be triggered automatically by backend events.

---

# 22. Review and Rating Permissions

If reviews/ratings are enabled:

Customers can:

- review eligible completed orders
- rate eligible vendors/products
- update reviews where policy permits

Vendors can:

- view reviews associated with their store/products
- respond where the feature exists

Drivers can:

- view driver-specific ratings assigned to them
- not modify customer ratings

Admins can moderate reviews.

Users cannot review an order they did not complete.

---

# 23. Administrative Permissions

Administrative permissions should be divided rather than treating `ADMIN` as unlimited access.

Recommended administrative permissions:

```text
admin:users
admin:vendors
admin:drivers
admin:products
admin:orders
admin:deliveries
admin:payments
admin:refunds
admin:reports
admin:settings
admin:audit
admin:moderation
```

This allows future introduction of specialized administrative roles without redesigning the entire authorization system.

---

# 24. Recommended Future Admin Roles

The initial system may use:

```text
ADMIN
```

Later, it can support:

```text
SUPER_ADMIN
OPERATIONS_ADMIN
FINANCE_ADMIN
SUPPORT_ADMIN
CATALOG_ADMIN
```

Do not implement these roles until they are actually required.

The authorization architecture should, however, avoid assuming that every administrator has unlimited access forever.

---

# 25. Resource Ownership

Every private resource must have an identifiable owner or access relationship.

Examples:

```text
User
  → user.id

Vendor
  → vendor.id

Product
  → vendor.id

Inventory
  → vendor.id / product.id

Cart
  → customer.id

Order
  → customer.id + vendor.id

Delivery
  → driver.id + order.id

Payment
  → customer.id + order.id
```

Authorization must follow these relationships.

---

# 26. Ownership Must Be Checked Server-Side

Incorrect:

```typescript
if (user.role === "VENDOR") {
  updateProduct();
}
```

Correct:

```typescript
if (user.role !== "VENDOR" || product.vendorId !== user.vendorId) {
  throw new ForbiddenError();
}
```

Role checking without ownership checking is insufficient.

---

# 27. Public vs Private Resources

## Public

Potentially public:

```text
Active vendors
Active products
Public product images
Public store information
Public categories
```

## Private

Private by default:

```text
Customer profile
Customer address
Orders
Payments
Driver location
Vendor financial information
Internal analytics
Audit logs
Administrative data
```

Resources must be private by default unless explicitly classified as public.

---

# 28. Sensitive Data Rules

The following information must not be unnecessarily exposed:

- passwords
- authentication tokens
- session secrets
- payment credentials
- private addresses
- private phone numbers
- internal administrative notes
- driver historical location
- vendor financial information
- audit metadata

API responses should return only fields required by the consuming client.

---

# 29. API Authorization Pattern

Every protected API endpoint should follow this structure:

```text
Request
  ↓
Authentication
  ↓
Session Validation
  ↓
Role Validation
  ↓
Resource Lookup
  ↓
Ownership / Scope Validation
  ↓
Business Rule Validation
  ↓
Mutation / Query
  ↓
Audit Event
  ↓
Response
```

Example:

```text
PATCH /api/v1/vendor/products/:id
```

Processing:

```text
1. Validate session
2. Validate role = VENDOR
3. Load product
4. Check product.vendorId
5. Check vendor account status
6. Validate request body
7. Apply business rules
8. Update database
9. Record audit event if required
10. Return sanitized response
```

---

# 30. Forbidden Authorization Patterns

The following patterns are prohibited.

## 30.1 Client-Only Authorization

```typescript
if (role === "ADMIN") {
  showButton();
}
```

This is UX logic, not authorization.

---

## 30.2 Trusting Client Ownership

Never trust:

```json
{
  "vendorId": "client-provided-id"
}
```

The backend must derive ownership from the authenticated session whenever possible.

---

## 30.3 Hidden UI as Security

This is not security:

```text
Hide admin page
```

The API must still reject unauthorized requests.

---

## 30.4 Role-Only Authorization

This is insufficient:

```text
VENDOR → can update every product
```

Correct:

```text
VENDOR
  +
Owns Product
  +
Vendor Active
  =
Can Update Product
```

---

# 31. Session Rules

The backend must derive the authenticated identity from the Better Auth session.

Never rely on:

```text
userId query parameter
```

for determining the current user.

For example, this is unsafe:

```text
GET /api/orders?userId=123
```

Instead:

```text
GET /api/orders
```

The backend determines:

```text
customerId = authenticatedSession.user.id
```

---

# 32. Role Assignment Rules

Users must not be allowed to arbitrarily assign themselves privileged roles.

The client must never be able to submit:

```json
{
  "role": "ADMIN"
}
```

during normal signup.

Recommended initial flow:

```text
Signup
  ↓
CUSTOMER
```

Vendor and driver access should use controlled onboarding/approval workflows.

Admin role assignment must be restricted to authorized administrative processes.

---

# 33. Vendor Onboarding

Recommended flow:

```text
Application
    ↓
PENDING
    ↓
Admin Review
    ↓
APPROVED
    ↓
ACTIVE
```

A pending vendor must not receive full vendor operational privileges.

---

# 34. Driver Onboarding

Recommended flow:

```text
Driver Registration
       ↓
Verification
       ↓
PENDING
       ↓
Admin Approval
       ↓
ACTIVE
       ↓
Eligible for Delivery
```

Only active and approved drivers may receive delivery assignments.

---

# 35. Account Suspension

Suspension must immediately affect authorization.

Example:

```text
VENDOR
ACTIVE
  ↓
SUSPENDED
```

After suspension:

```text
Can login?
        Depends on authentication policy

Can create products?
        ❌

Can modify inventory?
        ❌

Can accept orders?
        ❌

Can access permitted historical data?
        Policy-dependent
```

Suspension behavior must be centralized rather than implemented independently in every client.

---

# 36. Admin Audit Requirements

Sensitive administrative actions should generate audit records.

Examples:

```text
Vendor approved
Vendor suspended
Driver approved
Order manually modified
Refund issued
Payment manually adjusted
User suspended
Product removed
Administrative settings changed
```

Audit event structure should include:

```text
id
actorId
actorRole
action
resourceType
resourceId
metadata
createdAt
```

Audit logs must be append-oriented and protected from ordinary user modification.

---

# 37. Permission Evaluation

The authorization system should conceptually expose:

```typescript
authorize({
  user,
  permission,
  resource,
});
```

Example:

```typescript
authorize({
  user,
  permission: "products:update",
  resource: product,
});
```

The authorization layer should determine:

```text
Is authenticated?
        ↓
Correct role?
        ↓
Correct ownership?
        ↓
Correct account state?
        ↓
Business rule satisfied?
        ↓
ALLOW / DENY
```

---

# 38. Authorization Failure

Use consistent HTTP semantics.

Recommended:

```text
401 Unauthorized
```

When authentication is missing or invalid.

```text
403 Forbidden
```

When the user is authenticated but lacks permission.

```text
404 Not Found
```

May be used where appropriate to avoid revealing whether a private resource exists.

Example:

```text
Customer requests another customer's order.

Possible response:
404 Not Found
```

This prevents unnecessary resource enumeration.

---

# 39. Permission Matrix — High-Level

| Resource          | Admin           | Customer        | Vendor     | Driver     |
| ----------------- | --------------- | --------------- | ---------- | ---------- |
| Users             | Full            | Own             | ❌         | ❌         |
| Own Profile       | Full            | Full            | Full       | Full       |
| Vendors           | Full            | Public          | Own        | Limited    |
| Products          | Full            | Read            | Own        | Limited    |
| Inventory         | Full            | ❌              | Own        | ❌         |
| Cart              | Full            | Own             | ❌         | ❌         |
| Orders            | Full            | Own             | Own Vendor | Assigned   |
| Deliveries        | Full            | Own Order       | Own Order  | Assigned   |
| Payments          | Full/Authorized | Own             | Relevant   | ❌         |
| Refunds           | Authorized      | Request         | Request    | ❌         |
| Notifications     | Full/System     | Own             | Own        | Own        |
| Reviews           | Moderate        | Own             | Own Vendor | Own Driver |
| Driver Location   | Operational     | Active Delivery | Limited    | Own        |
| Reports           | Full            | Personal        | Own        | Own        |
| Audit Logs        | Authorized      | ❌              | ❌         | ❌         |
| Platform Settings | Full            | ❌              | ❌         | ❌         |

---

# 40. Client Application Access

## 40.1 Admin Web

Primary role:

```text
ADMIN
```

Admin web must not expose customer/vendor/driver-only workflows as administrative impersonation by default.

If impersonation is introduced later, it must be:

- explicitly authorized
- clearly visible
- time-limited where possible
- fully audited

---

## 40.2 Customer Mobile

Primary role:

```text
CUSTOMER
```

Customer application focuses on:

```text
Discovery
Cart
Checkout
Orders
Delivery Tracking
Profile
Notifications
```

---

## 40.3 Vendor Mobile

Primary role:

```text
VENDOR
```

Vendor application focuses on:

```text
Store
Products
Inventory
Orders
Preparation
Analytics
Notifications
```

---

## 40.4 Driver Mobile

Primary role:

```text
DRIVER
```

Driver application focuses on:

```text
Availability
Assignments
Pickup
Navigation
Delivery
Proof
Location
Earnings
Notifications
```

---

# 41. Cross-Role Data Access

Cross-role access must be minimized.

Example:

### Customer → Vendor

Customer may see:

```text
Store name
Store image
Product catalog
Product prices
Availability
Public ratings
```

Customer should not automatically see:

```text
Vendor revenue
Vendor internal analytics
Vendor private contact details
Vendor internal notes
```

### Vendor → Customer

Vendor may need:

```text
Customer name
Delivery address
Contact information required for delivery
Order contents
```

Only the minimum information required for fulfillment should be exposed.

### Driver → Customer

Driver may need:

```text
Customer name
Delivery address
Contact method required for delivery
Order identifier
Delivery instructions
```

Driver should not receive unrelated customer account information.

---

# 42. Least Privilege

Every role must operate under the principle:

```text
Minimum access
+
Minimum data
+
Minimum duration
```

A user should receive only the permissions required to complete their current task.

---

# 43. Temporary Permissions

Temporary access may be granted for:

- active delivery
- support investigation
- administrative troubleshooting
- operational workflows

Temporary permissions must have explicit scope and expiration.

Do not create permanent elevated access when temporary access is sufficient.

---

# 44. Permission Changes

Changes to role or privileged permissions must be treated as security-sensitive.

Examples:

```text
CUSTOMER → VENDOR
CUSTOMER → DRIVER
USER → ADMIN
```

These changes must:

1. Be performed by an authorized backend operation.
2. Be validated server-side.
3. Be audited.
4. Invalidate/re-evaluate relevant sessions where necessary.
5. Never depend on client-provided role values.

---

# 45. Multi-Role Users

The initial implementation should prefer one primary operational role per account.

If multi-role accounts are introduced later, authorization must distinguish:

```text
Identity
    ↓
Assigned Roles
    ↓
Active Context
    ↓
Permission
```

Do not assume:

```typescript
user.role === "CUSTOMER";
```

will remain sufficient forever.

The authorization layer should be designed so role expansion does not require rewriting every endpoint.

---

# 46. Authorization Testing

Every protected resource must have authorization tests.

At minimum:

```text
ADMIN → allowed
CUSTOMER → allowed where appropriate
VENDOR → allowed where appropriate
DRIVER → allowed where appropriate
Unauthenticated → denied
Wrong owner → denied
Suspended account → denied where applicable
Invalid state → denied
```

Example:

```text
Vendor A attempts to modify Vendor B's product
→ DENY

Customer A attempts to read Customer B's order
→ DENY

Driver A attempts to update Driver B's delivery
→ DENY

Customer attempts to access admin endpoint
→ DENY
```

---

# 47. Critical Security Test Matrix

The following scenarios are mandatory:

```text
[ ] Customer cannot access another customer's order
[ ] Customer cannot modify product price
[ ] Customer cannot assign driver
[ ] Vendor cannot access another vendor's products
[ ] Vendor cannot access another vendor's orders
[ ] Vendor cannot mark delivery as completed
[ ] Driver cannot access arbitrary deliveries
[ ] Driver cannot modify order price
[ ] Driver cannot modify payment status
[ ] Driver cannot access unrelated customer information
[ ] Suspended vendor cannot process new orders
[ ] Suspended driver cannot accept deliveries
[ ] Non-admin cannot access admin endpoints
[ ] Client cannot self-promote to ADMIN
[ ] Client cannot self-promote to VENDOR
[ ] Client cannot self-promote to DRIVER
[ ] Invalid order transitions are rejected
[ ] Invalid delivery transitions are rejected
[ ] Payment status cannot be spoofed
```

---

# 48. Implementation Rules

The following rules are mandatory:

1. All protected APIs require authentication.
2. All privileged APIs require server-side role validation.
3. Ownership must be checked server-side.
4. Client-provided ownership identifiers must never be trusted.
5. Role assignment must be controlled by the backend.
6. Admin operations must be audited where sensitive.
7. Payment status must never be trusted from the client.
8. Order state transitions must be validated server-side.
9. Delivery state transitions must be validated server-side.
10. Driver access must be restricted to assigned/eligible deliveries.
11. Suspended accounts must lose applicable operational permissions.
12. Private resources must default to deny.
13. API responses must expose only required data.
14. Client-side authorization is for UX only.
15. Database constraints must support authorization assumptions where practical.
16. Authorization logic must not be duplicated independently across every client.
17. Shared authorization utilities should be centralized in the backend.
18. Every authorization failure must produce a predictable API response.
19. Authorization tests are required for all sensitive resources.
20. No client can grant itself a privileged role.

---

# 49. Final Authorization Architecture

The final authorization model is:

```text
                    ┌───────────────┐
                    │ Better Auth   │
                    │ Authentication│
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │    Session    │
                    │   Identity    │
                    └───────┬───────┘
                            │
                            ▼
                    ┌───────────────┐
                    │ Role Resolver │
                    └───────┬───────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
       ADMIN            CUSTOMER           VENDOR
                                              │
                                              ▼
                                           DRIVER
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Permission Resolver │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Ownership / Scope   │
                 │ Validation          │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Business Rules      │
                 └──────────┬──────────┘
                            │
                     ┌──────┴──────┐
                     ▼             ▼
                  ALLOW           DENY
                     │
                     ▼
                 Database/API
```

---

# 50. Core Principle

The authorization system must always answer four questions:

```text
WHO are you?
     ↓
WHAT role/permissions do you have?
     ↓
WHICH resource are you accessing?
     ↓
ARE you allowed to perform this action on this resource
under the current business state?
```

The answer must come from the **backend**, not from the client.

The platform should be designed around:

```text
Authentication
    +
Role
    +
Permission
    +
Ownership
    +
Resource Scope
    +
Business State
    =
Authorization
```

This model is the source of truth for authorization across the Admin Web, Customer Mobile, Vendor Mobile, Driver Mobile, and Next.js backend.

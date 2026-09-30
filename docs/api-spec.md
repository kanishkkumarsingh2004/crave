# API Specification

## Multi-Role Delivery Platform

**Version:** `v1`
**API Base Path:** `/api/v1`
**Backend:** Next.js
**Runtime:** Node.js
**Database:** PostgreSQL
**ORM:** Prisma
**Authentication:** Better Auth
**Validation:** Zod
**API Style:** REST
**Transport:** HTTPS
**Realtime:** WebSocket/SSE where required, REST remains the source of truth

---

# 1. Purpose

This document defines the HTTP API contract for the Multi-Role Delivery Platform.

The platform contains four application clients:

1. **Admin Web**
2. **Customer Mobile**
3. **Vendor Mobile**
4. **Driver Mobile**

The API is shared by all clients.

The backend is responsible for:

- Authentication
- Authorization
- User management
- Vendor management
- Driver management
- Product management
- Category management
- Cart management
- Checkout
- Orders
- Payments
- Inventory
- Delivery management
- Driver assignment
- Location tracking
- Notifications
- Reviews
- Audit logs
- Platform configuration

Clients must never implement business-critical rules independently.

---

# 2. API Architecture

```text
Admin Web
Customer Mobile
Vendor Mobile
Driver Mobile
        |
        v
   API Client
        |
        v
 HTTPS / WebSocket
        |
        v
+----------------------+
| Next.js API Layer    |
+----------------------+
        |
        +--> Authentication
        |
        +--> Authorization
        |
        +--> Validation
        |
        +--> Domain Services
        |
        +--> Repository Layer
        |
        v
   PostgreSQL / Prisma
```

---

# 3. Base URL

Production:

```text
https://api.example.com/api/v1
```

Development:

```text
http://localhost:3000/api/v1
```

All API routes must be versioned.

Example:

```text
GET /api/v1/products
```

Never create unversioned business APIs such as:

```text
/api/products
```

---

# 4. HTTP Standards

## Supported Methods

```text
GET
POST
PATCH
PUT
DELETE
```

Preferred usage:

| Method | Purpose                                    |
| ------ | ------------------------------------------ |
| GET    | Retrieve resources                         |
| POST   | Create resource / execute command          |
| PATCH  | Partial update                             |
| PUT    | Full replacement where required            |
| DELETE | Delete/deactivate resource where permitted |

Business commands may use explicit action endpoints when they represent a state transition.

Example:

```text
POST /orders/{orderId}/cancel
POST /orders/{orderId}/confirm
POST /deliveries/{deliveryId}/assign
POST /deliveries/{deliveryId}/pickup
```

Do not expose arbitrary status mutation:

```text
PATCH /orders/{id}
{
  "status": "DELIVERED"
}
```

The backend must control valid state transitions.

---

# 5. Content Type

Requests containing JSON must use:

```http
Content-Type: application/json
```

Responses:

```http
Content-Type: application/json
```

File uploads may use:

```http
multipart/form-data
```

---

# 6. Authentication

Authentication is handled by Better Auth.

Protected API requests must contain a valid authenticated session.

The exact session transport differs by client:

```text
Admin Web      -> browser session/cookie
Customer App   -> mobile-compatible session/token transport
Vendor App     -> mobile-compatible session/token transport
Driver App     -> mobile-compatible session/token transport
```

The backend must resolve the authenticated user before authorization.

---

# 7. Roles

The platform supports exactly four application roles:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Authorization must be checked server-side.

Client-side role checks are only for UI behavior.

They are never security boundaries.

---

# 8. Authorization Model

Every protected endpoint must define:

```text
Authentication
Role
Ownership
Resource access
```

Example:

```text
GET /customers/me/orders
```

requires:

```text
authenticated = true
role = CUSTOMER
ownership = current user
```

A customer must never be able to access another customer's order simply by changing an ID.

---

# 9. API Response Format

## Successful Response

Single resource:

```json
{
  "success": true,
  "data": {
    "id": "ord_123",
    "status": "CONFIRMED"
  }
}
```

Collection:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Action:

```json
{
  "success": true,
  "data": {
    "message": "Order confirmed successfully"
  }
}
```

---

# 10. Error Response

All API errors must follow one format.

```json
{
  "success": false,
  "error": {
    "code": "ORDER_INVALID_STATE",
    "message": "This order cannot be confirmed",
    "details": {}
  },
  "requestId": "req_abc123"
}
```

---

# 11. Standard Error Codes

## Authentication

```text
AUTH_REQUIRED
AUTH_INVALID_SESSION
AUTH_SESSION_EXPIRED
AUTH_FORBIDDEN
```

## Validation

```text
VALIDATION_ERROR
INVALID_PARAMETER
INVALID_REQUEST_BODY
INVALID_QUERY
```

## Resource

```text
RESOURCE_NOT_FOUND
RESOURCE_ALREADY_EXISTS
RESOURCE_CONFLICT
```

## User

```text
USER_NOT_FOUND
USER_SUSPENDED
USER_DEACTIVATED
```

## Vendor

```text
VENDOR_NOT_FOUND
VENDOR_NOT_APPROVED
VENDOR_SUSPENDED
```

## Product

```text
PRODUCT_NOT_FOUND
PRODUCT_UNAVAILABLE
PRODUCT_INACTIVE
```

## Inventory

```text
INSUFFICIENT_INVENTORY
INVENTORY_CONFLICT
INVENTORY_RESERVATION_FAILED
```

## Cart

```text
CART_NOT_FOUND
CART_EMPTY
CART_VENDOR_CONFLICT
```

## Order

```text
ORDER_NOT_FOUND
ORDER_INVALID_STATE
ORDER_CANNOT_CANCEL
ORDER_PRICE_CHANGED
```

## Payment

```text
PAYMENT_FAILED
PAYMENT_REQUIRED
PAYMENT_ALREADY_COMPLETED
PAYMENT_PROVIDER_ERROR
```

## Delivery

```text
DELIVERY_NOT_FOUND
DELIVERY_INVALID_STATE
DRIVER_NOT_AVAILABLE
DRIVER_ASSIGNMENT_FAILED
DELIVERY_VERIFICATION_FAILED
```

---

# 12. HTTP Status Codes

| Status | Meaning                                  |
| ------ | ---------------------------------------- |
| `200`  | Successful request                       |
| `201`  | Resource created                         |
| `202`  | Accepted for asynchronous processing     |
| `204`  | Successful request without response body |
| `400`  | Invalid request                          |
| `401`  | Authentication required                  |
| `403`  | Forbidden                                |
| `404`  | Resource not found                       |
| `409`  | Conflict                                 |
| `422`  | Validation/business rule failure         |
| `429`  | Rate limited                             |
| `500`  | Internal server error                    |
| `502`  | External provider failure                |
| `503`  | Service unavailable                      |

---

# 13. Request ID

Every request must receive a request ID.

Header:

```http
X-Request-ID: req_abc123
```

If supplied by the client, the server may preserve it after validation.

Otherwise the server generates one.

The request ID must appear in:

- Logs
- Error responses
- Audit context
- Distributed traces

---

# 14. Pagination

Collection endpoints support:

```text
page
pageSize
```

Example:

```text
GET /products?page=1&pageSize=20
```

Defaults:

```text
page = 1
pageSize = 20
```

Maximum:

```text
pageSize = 100
```

Response:

```json
{
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 250,
    "totalPages": 13
  }
}
```

---

# 15. Sorting

Supported pattern:

```text
?sortBy=createdAt&sortOrder=desc
```

The backend must whitelist sortable fields.

Clients cannot inject arbitrary database expressions.

---

# 16. Filtering

Example:

```text
GET /admin/orders?status=CONFIRMED&vendorId=ven_123
```

Filters must be explicitly defined by each endpoint.

Never pass arbitrary query parameters directly into Prisma filters.

---

# 17. Search

Example:

```text
GET /products?search=coffee
```

Search behavior must be defined per resource.

Search must be:

- Validated
- Length limited
- Indexed where appropriate
- Protected from expensive unbounded queries

---

# 18. Idempotency

Financial and mutation operations that may be retried must support idempotency.

Header:

```http
Idempotency-Key: <unique-client-key>
```

Required for operations such as:

```text
POST /checkout
POST /payments
POST /orders/{id}/cancel
POST /refunds
```

Repeated requests with the same valid key must not create duplicate operations.

---

# 19. Authentication Endpoints

Better Auth owns authentication routes.

Conceptual endpoints:

```text
POST /api/auth/sign-in
POST /api/auth/sign-up
POST /api/auth/sign-out
GET  /api/auth/session
```

Google authentication is supported through Better Auth.

Authentication implementation must remain centralized.

Business APIs must not implement separate authentication systems.

---

# 20. Current User

## Get Current User

```http
GET /api/v1/me
```

Roles:

```text
ADMIN
CUSTOMER
VENDOR
DRIVER
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "name": "Kanishk",
    "email": "user@example.com",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

---

# 21. Customer APIs

Customer endpoints are consumed by the Customer Mobile application.

---

## 21.1 Customer Profile

```http
GET /api/v1/customer/profile
PATCH /api/v1/customer/profile
```

Updateable fields may include:

```json
{
  "name": "Kanishk",
  "phone": "+91XXXXXXXXXX"
}
```

The customer cannot change:

```text
role
account status
customer ID
```

---

# 22. Customer Addresses

```http
GET    /api/v1/customer/addresses
POST   /api/v1/customer/addresses
GET    /api/v1/customer/addresses/{addressId}
PATCH  /api/v1/customer/addresses/{addressId}
DELETE /api/v1/customer/addresses/{addressId}
POST   /api/v1/customer/addresses/{addressId}/default
```

Example:

```json
{
  "label": "Home",
  "recipientName": "Kanishk",
  "phone": "+91XXXXXXXXXX",
  "addressLine1": "Example Street",
  "addressLine2": "",
  "city": "Bengaluru",
  "state": "Karnataka",
  "postalCode": "560001",
  "country": "IN"
}
```

Address ownership must always be enforced.

---

# 23. Categories

Public/customer:

```http
GET /api/v1/categories
GET /api/v1/categories/{categoryId}
```

Admin:

```http
POST   /api/v1/admin/categories
PATCH  /api/v1/admin/categories/{categoryId}
DELETE /api/v1/admin/categories/{categoryId}
```

---

# 24. Products

## Customer

```http
GET /api/v1/products
GET /api/v1/products/{productId}
```

Supported filters:

```text
categoryId
vendorId
search
minPrice
maxPrice
available
```

Example:

```http
GET /api/v1/products?categoryId=cat_123&available=true
```

Customer responses must not expose internal vendor or inventory information that is not required by the UI.

---

# 25. Vendor Product APIs

Vendor:

```http
GET    /api/v1/vendor/products
POST   /api/v1/vendor/products
GET    /api/v1/vendor/products/{productId}
PATCH  /api/v1/vendor/products/{productId}
DELETE /api/v1/vendor/products/{productId}
POST   /api/v1/vendor/products/{productId}/activate
POST   /api/v1/vendor/products/{productId}/deactivate
```

Vendor ownership is mandatory.

A vendor must not modify another vendor's products.

---

# 26. Product Creation

```http
POST /api/v1/vendor/products
```

Request:

```json
{
  "name": "Product Name",
  "description": "Product description",
  "sku": "SKU-001",
  "price": "199.00",
  "categoryId": "cat_123",
  "imageUrl": "..."
}
```

The backend must:

1. Validate input.
2. Verify vendor status.
3. Verify category.
4. Validate price.
5. Check SKU uniqueness.
6. Create product.
7. Create inventory if required.
8. Return the created resource.

---

# 27. Inventory APIs

Vendor:

```http
GET /api/v1/vendor/inventory
GET /api/v1/vendor/inventory/{productId}
PATCH /api/v1/vendor/inventory/{productId}
```

Admin:

```http
GET /api/v1/admin/inventory
GET /api/v1/admin/inventory/{productId}
PATCH /api/v1/admin/inventory/{productId}
```

Inventory response:

```json
{
  "productId": "prd_123",
  "onHand": 50,
  "reserved": 5,
  "available": 45,
  "lowStockThreshold": 10
}
```

`available` must be calculated from authoritative inventory values.

Clients must not directly set:

```text
reserved
available
```

---

# 28. Cart APIs

Customer:

```http
GET    /api/v1/cart
POST   /api/v1/cart/items
PATCH  /api/v1/cart/items/{itemId}
DELETE /api/v1/cart/items/{itemId}
DELETE /api/v1/cart
```

Add item:

```json
{
  "productId": "prd_123",
  "quantity": 2
}
```

---

# 29. Cart Rules

The MVP supports:

```text
1 active cart
1 vendor per cart
```

If the customer attempts to add a product belonging to another vendor:

```text
CART_VENDOR_CONFLICT
```

must be returned.

The backend must verify:

- Product exists.
- Product is active.
- Product is available.
- Vendor is active.
- Quantity is valid.

---

# 30. Checkout

```http
POST /api/v1/checkout
```

Request:

```json
{
  "addressId": "addr_123",
  "paymentMethod": "ONLINE",
  "idempotencyKey": "checkout_abc123"
}
```

Checkout must perform server-side:

```text
1. Load cart
2. Validate cart
3. Validate products
4. Validate vendor
5. Recalculate prices
6. Calculate tax
7. Calculate delivery fee
8. Validate inventory
9. Reserve inventory
10. Create order
11. Create order items
12. Create payment
13. Clear/consume cart
14. Return checkout result
```

The client must never submit the final order total as authoritative data.

---

# 31. Checkout Response

```json
{
  "success": true,
  "data": {
    "order": {
      "id": "ord_123",
      "orderNumber": "ORD-2026-000123",
      "status": "PENDING",
      "subtotal": "500.00",
      "deliveryFee": "40.00",
      "tax": "27.00",
      "discount": "0.00",
      "total": "567.00",
      "currency": "INR"
    },
    "payment": {
      "id": "pay_123",
      "status": "PENDING"
    }
  }
}
```

---

# 32. Customer Order APIs

```http
GET /api/v1/customer/orders
GET /api/v1/customer/orders/{orderId}
POST /api/v1/customer/orders/{orderId}/cancel
```

Customers can only access their own orders.

---

# 33. Vendor Order APIs

```http
GET /api/v1/vendor/orders
GET /api/v1/vendor/orders/{orderId}
POST /api/v1/vendor/orders/{orderId}/confirm
POST /api/v1/vendor/orders/{orderId}/reject
POST /api/v1/vendor/orders/{orderId}/start-preparing
POST /api/v1/vendor/orders/{orderId}/ready
```

Vendor ownership must be checked.

---

# 34. Order State Transitions

Allowed transitions:

```text
PENDING
   |
   +--> CONFIRMED
   |
   +--> CANCELLED

CONFIRMED
   |
   +--> PREPARING
   |
   +--> CANCELLED

PREPARING
   |
   +--> READY_FOR_PICKUP

READY_FOR_PICKUP
   |
   +--> PICKED_UP

PICKED_UP
   |
   +--> OUT_FOR_DELIVERY

OUT_FOR_DELIVERY
   |
   +--> DELIVERED
```

Invalid transitions must return:

```text
ORDER_INVALID_STATE
```

The backend owns this state machine.

---

# 35. Driver Order/Delivery APIs

Driver does not directly control order state arbitrarily.

Driver operates through delivery endpoints.

```http
GET /api/v1/driver/deliveries
GET /api/v1/driver/deliveries/{deliveryId}
```

---

# 36. Delivery APIs

Admin:

```http
GET /api/v1/admin/deliveries
GET /api/v1/admin/deliveries/{deliveryId}
POST /api/v1/admin/deliveries/{deliveryId}/assign
POST /api/v1/admin/deliveries/{deliveryId}/cancel
```

Driver:

```http
GET /api/v1/driver/deliveries
GET /api/v1/driver/deliveries/{deliveryId}
POST /api/v1/driver/deliveries/{deliveryId}/accept
POST /api/v1/driver/deliveries/{deliveryId}/reject
POST /api/v1/driver/deliveries/{deliveryId}/pickup
POST /api/v1/driver/deliveries/{deliveryId}/start
POST /api/v1/driver/deliveries/{deliveryId}/arriving
POST /api/v1/driver/deliveries/{deliveryId}/deliver
POST /api/v1/driver/deliveries/{deliveryId}/fail
```

---

# 37. Delivery State Machine

```text
PENDING
   |
   v
ASSIGNING
   |
   v
ASSIGNED
   |
   v
DRIVER_ACCEPTED
   |
   v
PICKUP_READY
   |
   v
PICKED_UP
   |
   v
IN_TRANSIT
   |
   v
ARRIVING
   |
   v
DELIVERED
```

Failure/cancellation paths:

```text
ASSIGNING --> CANCELLED
ASSIGNED --> CANCELLED
DRIVER_ACCEPTED --> FAILED
PICKED_UP --> FAILED
IN_TRANSIT --> FAILED
ARRIVING --> FAILED
```

---

# 38. Driver Assignment

Admin:

```http
POST /api/v1/admin/deliveries/{deliveryId}/assign
```

Request:

```json
{
  "driverId": "drv_123"
}
```

Backend verifies:

```text
driver exists
driver approved
driver active
driver available
driver not already assigned
delivery is assignable
```

Assignment must be atomic.

---

# 39. Driver Availability

```http
GET /api/v1/driver/status
PATCH /api/v1/driver/status
```

Request:

```json
{
  "availability": "AVAILABLE"
}
```

Allowed:

```text
OFFLINE
AVAILABLE
BUSY
```

A driver with an active delivery cannot manually switch to an invalid availability state.

---

# 40. Driver Location

```http
POST /api/v1/driver/deliveries/{deliveryId}/location
```

Request:

```json
{
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.5,
  "heading": 180,
  "speed": 12.4,
  "recordedAt": "2026-09-29T12:00:00Z"
}
```

Rules:

- Driver must own the active assignment.
- Delivery must be active.
- Coordinates must be validated.
- Timestamp must be reasonable.
- Excessively frequent updates must be rate limited.
- Location history must have retention limits.

---

# 41. Delivery Verification

```http
POST /api/v1/driver/deliveries/{deliveryId}/verify
```

Request:

```json
{
  "type": "OTP",
  "value": "123456"
}
```

Supported:

```text
OTP
QR
PHOTO
SIGNATURE
MANUAL
```

Verification must occur server-side.

---

# 42. Customer Delivery Tracking

```http
GET /api/v1/customer/orders/{orderId}/tracking
```

Response:

```json
{
  "success": true,
  "data": {
    "orderId": "ord_123",
    "deliveryId": "del_123",
    "status": "IN_TRANSIT",
    "driver": {
      "name": "Driver"
    },
    "location": {
      "latitude": 12.9716,
      "longitude": 77.5946,
      "updatedAt": "2026-09-29T12:00:00Z"
    }
  }
}
```

Customer must only receive location data for their own active delivery.

---

# 43. Payment APIs

Customer:

```http
GET /api/v1/customer/orders/{orderId}/payment
POST /api/v1/customer/orders/{orderId}/payment
```

Admin:

```http
GET /api/v1/admin/payments
GET /api/v1/admin/payments/{paymentId}
```

Payment provider webhooks:

```http
POST /api/v1/webhooks/payments/{provider}
```

Webhook endpoints must not depend on normal user authentication.

They must instead verify the provider signature.

---

# 44. Payment Rules

The backend must never trust:

```text
amount
currency
order total
payment status
```

from the client.

Payment amount must be calculated from the authoritative order.

Webhook events must be idempotent.

Unique provider event IDs must be enforced.

---

# 45. Refund APIs

Admin:

```http
POST /api/v1/admin/refunds
GET /api/v1/admin/refunds
GET /api/v1/admin/refunds/{refundId}
POST /api/v1/admin/refunds/{refundId}/approve
POST /api/v1/admin/refunds/{refundId}/reject
```

Customer:

```http
POST /api/v1/customer/orders/{orderId}/refund-request
GET /api/v1/customer/orders/{orderId}/refund
```

Refund authorization and amount must be calculated server-side.

---

# 46. Review APIs

Customer:

```http
POST /api/v1/customer/orders/{orderId}/review
GET /api/v1/customer/orders/{orderId}/review
```

Public:

```http
GET /api/v1/products/{productId}/reviews
```

Admin:

```http
GET /api/v1/admin/reviews
POST /api/v1/admin/reviews/{reviewId}/hide
POST /api/v1/admin/reviews/{reviewId}/remove
```

Only eligible customers may create reviews.

---

# 47. Notification APIs

Customer:

```http
GET /api/v1/customer/notifications
POST /api/v1/customer/notifications/{notificationId}/read
POST /api/v1/customer/notifications/read-all
```

Vendor:

```http
GET /api/v1/vendor/notifications
POST /api/v1/vendor/notifications/{notificationId}/read
POST /api/v1/vendor/notifications/read-all
```

Driver:

```http
GET /api/v1/driver/notifications
POST /api/v1/driver/notifications/{notificationId}/read
POST /api/v1/driver/notifications/read-all
```

Admin:

```http
GET /api/v1/admin/notifications
```

---

# 48. Admin User APIs

```http
GET   /api/v1/admin/users
GET   /api/v1/admin/users/{userId}
PATCH /api/v1/admin/users/{userId}
POST  /api/v1/admin/users/{userId}/suspend
POST  /api/v1/admin/users/{userId}/activate
POST  /api/v1/admin/users/{userId}/deactivate
```

Admin must not expose or return authentication secrets.

---

# 49. Vendor Management APIs

```http
GET  /api/v1/admin/vendors
GET  /api/v1/admin/vendors/{vendorId}
POST /api/v1/admin/vendors/{vendorId}/approve
POST /api/v1/admin/vendors/{vendorId}/reject
POST /api/v1/admin/vendors/{vendorId}/suspend
POST /api/v1/admin/vendors/{vendorId}/activate
POST /api/v1/admin/vendors/{vendorId}/close
```

Vendor approval is an admin-controlled workflow.

---

# 50. Driver Management APIs

```http
GET  /api/v1/admin/drivers
GET  /api/v1/admin/drivers/{driverId}
POST /api/v1/admin/drivers/{driverId}/approve
POST /api/v1/admin/drivers/{driverId}/reject
POST /api/v1/admin/drivers/{driverId}/suspend
POST /api/v1/admin/drivers/{driverId}/activate
```

Driver assignment must only target eligible drivers.

---

# 51. Admin Product APIs

```http
GET   /api/v1/admin/products
GET   /api/v1/admin/products/{productId}
PATCH /api/v1/admin/products/{productId}
POST  /api/v1/admin/products/{productId}/activate
POST  /api/v1/admin/products/{productId}/deactivate
```

Admin may manage products across vendors.

---

# 52. Admin Order APIs

```http
GET /api/v1/admin/orders
GET /api/v1/admin/orders/{orderId}
POST /api/v1/admin/orders/{orderId}/cancel
```

Admin must not bypass state machines without an explicit controlled operation.

Exceptional manual state changes must:

1. Be authorized.
2. Require a reason.
3. Create an audit log.
4. Record the actor.
5. Record the previous and new states.

---

# 53. Admin Dashboard

```http
GET /api/v1/admin/dashboard
```

Response may contain:

```json
{
  "users": {
    "customers": 1000,
    "vendors": 50,
    "drivers": 100
  },
  "orders": {
    "today": 100,
    "pending": 20,
    "delivered": 70,
    "cancelled": 10
  },
  "revenue": {
    "today": "100000.00"
  },
  "deliveries": {
    "active": 25
  }
}
```

Dashboard data must be optimized for aggregation.

Do not fetch thousands of individual records and calculate everything in application memory.

---

# 54. Admin Audit Logs

```http
GET /api/v1/admin/audit-logs
GET /api/v1/admin/audit-logs/{auditLogId}
```

Filters:

```text
actorId
action
entityType
entityId
dateFrom
dateTo
```

Audit logs must be append-oriented.

---

# 55. Platform Settings

Admin:

```http
GET   /api/v1/admin/settings
PATCH /api/v1/admin/settings/{key}
```

Examples:

```text
delivery.baseFee
delivery.perKmFee
inventory.lowStockDefault
order.maxItems
```

Secrets must never be stored as ordinary platform settings.

---

# 56. File Uploads

If product images or documents are required:

```http
POST /api/v1/uploads/presign
```

Request:

```json
{
  "filename": "product.jpg",
  "contentType": "image/jpeg",
  "purpose": "PRODUCT_IMAGE"
}
```

Response:

```json
{
  "uploadUrl": "...",
  "fileKey": "products/..."
}
```

The API must validate:

```text
file type
file size
purpose
authenticated owner
```

Clients should upload directly to object storage where supported.

---

# 57. Realtime API

Realtime communication is optional and supplemental.

Possible channel:

```text
wss://api.example.com/realtime
```

Authentication must occur during connection establishment.

Events may include:

```text
order.updated
delivery.updated
delivery.location.updated
notification.created
driver.assignment.created
payment.updated
```

Example:

```json
{
  "event": "delivery.updated",
  "timestamp": "2026-09-29T12:00:00Z",
  "data": {
    "deliveryId": "del_123",
    "status": "IN_TRANSIT"
  }
}
```

Realtime events are not the source of truth.

If a WebSocket connection fails:

```text
Client -> REST API -> PostgreSQL
```

must still provide correct state.

---

# 58. Client API Responsibilities

## Admin Web

Primary APIs:

```text
/admin/users
/admin/vendors
/admin/drivers
/admin/products
/admin/orders
/admin/deliveries
/admin/payments
/admin/refunds
/admin/reviews
/admin/audit-logs
/admin/settings
/admin/dashboard
```

---

## Customer Mobile

Primary APIs:

```text
/me
/customer/profile
/customer/addresses
/categories
/products
/cart
/checkout
/customer/orders
/customer/orders/{id}/tracking
/customer/notifications
/customer/reviews
```

---

## Vendor Mobile

Primary APIs:

```text
/me
/vendor/profile
/vendor/products
/vendor/inventory
/vendor/orders
/vendor/notifications
```

---

## Driver Mobile

Primary APIs:

```text
/me
/driver/profile
/driver/status
/driver/deliveries
/driver/deliveries/{id}/location
/driver/deliveries/{id}/verify
/driver/notifications
```

---

# 59. API Ownership Rules

The following information is always backend-owned:

```text
Order total
Order status
Payment status
Inventory availability
Inventory reservation
Delivery status
Driver assignment
Vendor approval
Driver approval
User role
User status
Refund amount
Refund status
```

Clients may request operations.

They may not dictate authoritative state.

---

# 60. Validation

All external input must be validated using Zod or an equivalent centralized validation layer.

Validation must occur for:

```text
Path parameters
Query parameters
Request body
Headers
Webhook payloads
```

Example:

```text
API Route
    |
    v
Zod Schema
    |
    v
Validated DTO
    |
    v
Domain Service
```

Never pass raw request bodies directly into Prisma.

---

# 61. API Service Layer

Recommended structure:

```text
Route Handler
     |
     v
Authentication
     |
     v
Authorization
     |
     v
Validation
     |
     v
Domain Service
     |
     v
Repository
     |
     v
Prisma
     |
     v
PostgreSQL
```

Route handlers must remain thin.

Business logic belongs in services.

---

# 62. Recommended API Directory

```text
src/
├── app/
│   └── api/
│       └── v1/
│           ├── me/
│           ├── categories/
│           ├── products/
│           ├── cart/
│           ├── checkout/
│           │
│           ├── customer/
│           │   ├── profile/
│           │   ├── addresses/
│           │   ├── orders/
│           │   ├── notifications/
│           │   └── reviews/
│           │
│           ├── vendor/
│           │   ├── profile/
│           │   ├── products/
│           │   ├── inventory/
│           │   ├── orders/
│           │   └── notifications/
│           │
│           ├── driver/
│           │   ├── profile/
│           │   ├── status/
│           │   ├── deliveries/
│           │   └── notifications/
│           │
│           ├── admin/
│           │   ├── dashboard/
│           │   ├── users/
│           │   ├── vendors/
│           │   ├── drivers/
│           │   ├── products/
│           │   ├── inventory/
│           │   ├── orders/
│           │   ├── deliveries/
│           │   ├── payments/
│           │   ├── refunds/
│           │   ├── reviews/
│           │   ├── audit-logs/
│           │   └── settings/
│           │
│           └── webhooks/
│               └── payments/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── customers/
│   ├── vendors/
│   ├── drivers/
│   ├── products/
│   ├── categories/
│   ├── inventory/
│   ├── cart/
│   ├── orders/
│   ├── checkout/
│   ├── payments/
│   ├── refunds/
│   ├── deliveries/
│   ├── notifications/
│   ├── reviews/
│   ├── uploads/
│   └── audit/
│
├── lib/
│   ├── auth/
│   ├── db/
│   ├── validation/
│   ├── api/
│   ├── errors/
│   └── observability/
│
└── middleware.ts
```

---

# 63. API Contract Packages

Shared API contracts should live in a reusable package:

```text
packages/api-contracts
```

Example:

```text
packages/api-contracts/
├── src/
│   ├── auth/
│   ├── users/
│   ├── products/
│   ├── categories/
│   ├── cart/
│   ├── checkout/
│   ├── orders/
│   ├── payments/
│   ├── deliveries/
│   ├── inventory/
│   ├── notifications/
│   ├── reviews/
│   └── common/
│
└── package.json
```

This package may contain:

```text
Zod request schemas
Zod response schemas
TypeScript types
Enums
Pagination contracts
Error contracts
```

It must not contain server-only Prisma code.

---

# 64. API Versioning Rules

Current:

```text
/api/v1
```

Future breaking changes:

```text
/api/v2
```

Do not silently change the meaning of an existing v1 endpoint.

Backward-compatible additions may remain in v1.

Breaking changes require a new version.

---

# 65. Security Rules

Every API must follow:

```text
HTTPS
Authentication
Authorization
Input validation
Rate limiting
Audit logging where required
Secure headers
Secret isolation
```

Never return:

```text
password hashes
authentication secrets
private tokens
payment provider secrets
internal credentials
database connection strings
```

---

# 66. Rate Limiting

Rate limits should be applied by category.

Examples:

```text
Authentication       -> strict
Checkout             -> strict
Payment              -> strict
Location updates     -> controlled high-frequency
Product browsing     -> moderate
Admin APIs           -> authenticated limits
```

Location updates should use a dedicated rate policy rather than the same policy as ordinary API calls.

---

# 67. Concurrency Rules

Operations involving shared state must use database transactions or appropriate concurrency controls.

Critical operations:

```text
Checkout
Inventory reservation
Inventory release
Order confirmation
Payment completion
Refund
Driver assignment
Delivery completion
```

Example:

```text
BEGIN TRANSACTION

check inventory
reserve inventory
create order
create payment

COMMIT
```

If any critical operation fails:

```text
ROLLBACK
```

---

# 68. Transaction Boundaries

Do not create giant transactions covering external network calls.

For example:

```text
Database transaction
    |
    +--> reserve inventory
    +--> create order
    +--> create payment record
```

Then:

```text
External payment provider
```

must be coordinated using idempotency and webhook reconciliation.

---

# 69. Webhook Rules

Webhook processing must:

1. Verify signature.
2. Validate payload.
3. Check event ID.
4. Detect duplicate event.
5. Store event.
6. Process event transactionally.
7. Mark processing result.
8. Return provider-compatible response.

Webhook events must be safe to retry.

---

# 70. Audit Requirements

Audit logs are required for sensitive operations such as:

```text
User suspension
Vendor approval
Vendor suspension
Driver approval
Driver suspension
Manual order changes
Manual refunds
Payment administration
Product moderation
Settings changes
Administrative delivery changes
```

Audit record should include:

```text
actor
action
entity
entityId
timestamp
requestId
metadata
```

Never log secrets.

---

# 71. API Observability

Each API request should capture:

```text
requestId
method
path
statusCode
duration
authenticatedUserId
role
errorCode
```

Sensitive values must be redacted.

Do not log:

```text
password
access tokens
payment credentials
full authentication cookies
private keys
```

---

# 72. API Testing

Every endpoint must have tests appropriate to its risk.

Minimum:

```text
Validation tests
Authorization tests
Success tests
Failure tests
Ownership tests
State-transition tests
Concurrency tests for critical operations
```

Critical workflows require integration/E2E coverage:

```text
Customer signup
Customer checkout
Payment completion
Vendor order processing
Driver assignment
Driver pickup
Delivery tracking
Delivery completion
Order cancellation
Refund
```

---

# 73. API Contract Testing

Shared contracts must be tested against the actual backend.

Recommended flow:

```text
Zod Contract
      |
      v
API Implementation
      |
      v
Integration Test
      |
      v
Client API Client
```

A backend response that violates the shared contract must fail CI.

---

# 74. API Client Rules

Clients should never manually construct arbitrary API URLs throughout the application.

Use a shared API client:

```text
packages/api-client
```

Example:

```ts
api.products.list();
api.cart.get();
api.orders.get(orderId);
api.deliveries.accept(deliveryId);
```

The client should centralize:

```text
base URL
authentication
headers
request ID
error parsing
timeouts
retry policy
serialization
```

---

# 75. Retry Rules

Safe GET requests may be retried.

Mutation retries require idempotency.

Do not blindly retry:

```text
checkout
payment
refund
order creation
delivery completion
```

unless an idempotency mechanism is active.

---

# 76. Caching

Cache only data where stale values are acceptable.

Potentially cache:

```text
Categories
Public product metadata
Platform configuration
Non-sensitive dashboard aggregates
```

Do not blindly cache:

```text
Inventory
Payment status
Delivery state
Driver availability
Order status
```

Critical state must come from authoritative storage.

---

# 77. Source of Truth

The hierarchy is:

```text
PostgreSQL
    >
Backend domain state
    >
Redis/cache
    >
Realtime state
    >
Mobile local state
    >
UI state
```

Realtime or cached data must never override authoritative database state.

---

# 78. API Documentation

The implementation should expose machine-readable API documentation.

Recommended:

```text
OpenAPI 3.1
```

Generated from the API contracts where practical.

Documentation should include:

```text
Endpoints
Methods
Authentication
Roles
Parameters
Request schemas
Response schemas
Errors
Examples
```

---

# 79. API Naming Rules

Use plural resource names:

```text
/products
/orders
/vendors
/drivers
/deliveries
```

Use explicit action endpoints for state transitions:

```text
/orders/{id}/cancel
/orders/{id}/confirm
/deliveries/{id}/accept
```

Avoid vague endpoints:

```text
/orders/{id}/updateStatus
```

---

# 80. Endpoint Naming Summary

```text
/api/v1
│
├── /me
├── /categories
├── /products
├── /cart
├── /checkout
│
├── /customer/*
│
├── /vendor/*
│
├── /driver/*
│
├── /admin/*
│
└── /webhooks/*
```

---

# 81. Final API Principles

The API must follow these rules:

1. Backend owns business logic.
2. PostgreSQL is the persistent source of truth.
3. Every protected endpoint requires authorization.
4. Ownership must be checked server-side.
5. Clients cannot directly mutate authoritative state.
6. State machines must be enforced by the backend.
7. Money must be calculated server-side.
8. Inventory operations must be transactional.
9. Payment operations must be idempotent.
10. Webhooks must be signature-verified and idempotent.
11. Driver assignments must be atomic.
12. Location tracking must be restricted to active deliveries.
13. Sensitive administrative actions must be audited.
14. API input must always be validated.
15. API responses must use consistent structures.
16. API errors must use stable machine-readable codes.
17. Breaking changes require API versioning.
18. Realtime communication is supplemental, never authoritative.
19. Shared contracts should be reused by all clients.
20. Route handlers should remain thin; domain logic belongs in services.

---

# 82. Implementation Priority

The API should be implemented in this order:

### Phase 1 — Foundation

```text
Authentication
/me
Role authorization
Error handling
Request IDs
Validation
```

### Phase 2 — Catalog

```text
Categories
Products
Vendor products
Inventory
```

### Phase 3 — Customer Commerce

```text
Addresses
Cart
Checkout
Orders
```

### Phase 4 — Payments

```text
Payments
Payment webhooks
Payment reconciliation
Refunds
```

### Phase 5 — Vendor Operations

```text
Vendor orders
Order preparation
Ready-for-pickup
Vendor notifications
```

### Phase 6 — Driver Operations

```text
Driver availability
Driver assignment
Delivery lifecycle
Pickup
Location tracking
Delivery verification
Delivery completion
```

### Phase 7 — Administration

```text
Dashboard
User management
Vendor management
Driver management
Product management
Order management
Delivery management
Audit logs
Settings
```

### Phase 8 — Realtime

```text
Order events
Delivery events
Driver location
Notifications
```

### Phase 9 — Hardening

```text
Rate limiting
Concurrency testing
Security testing
Load testing
API contract testing
Observability
OpenAPI documentation
```

---

# 83. Definition of Done

An API endpoint is considered complete only when:

```text
[ ] Authentication requirement defined
[ ] Role requirement defined
[ ] Ownership rules defined
[ ] Request schema defined
[ ] Response schema defined
[ ] Error codes defined
[ ] Validation implemented
[ ] Authorization implemented
[ ] Business logic implemented in service layer
[ ] Database access implemented through Prisma
[ ] Tests implemented
[ ] Logging implemented where required
[ ] Rate limit considered
[ ] Idempotency considered
[ ] OpenAPI documentation updated
```

The API is not considered complete merely because the route returns a successful response.

---

# 84. Final Architecture Contract

```text
┌─────────────────────────────────────────────────────────┐
│                    CLIENT APPLICATIONS                  │
│                                                         │
│  Admin Web | Customer App | Vendor App | Driver App    │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
                    HTTPS / WebSocket
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    API / Next.js                        │
│                                                         │
│ Authentication                                          │
│ Authorization                                           │
│ Validation                                              │
│ Rate Limiting                                           │
│ Request Context                                         │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    DOMAIN SERVICES                      │
│                                                         │
│ Users | Vendors | Products | Cart | Orders             │
│ Inventory | Payments | Deliveries | Drivers            │
│ Notifications | Reviews | Admin                        │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                       PRISMA                            │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                    POSTGRESQL                           │
│                                                         │
│                 SOURCE OF TRUTH                         │
└─────────────────────────────────────────────────────────┘
```

**Core principle:**

> **Clients request actions. APIs validate and authorize them. Domain services enforce business rules. PostgreSQL stores the authoritative state.**

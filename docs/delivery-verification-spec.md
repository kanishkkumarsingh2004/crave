# Delivery Verification & QR Code Specification

## 1. Purpose

This specification defines the delivery handoff verification system for the multi-role delivery platform.

The system allows a driver to confirm that an order has physically been handed over to the customer using either:

1. A QR code displayed inside the customer's mobile application.
2. A 6-digit delivery verification code displayed inside the customer's mobile application.

The QR code and 6-digit code belong to the specific delivery/order and are changed for every new order.

The backend is the final authority for determining whether a delivery is successfully completed.

---

# 2. Core Objective

The delivery confirmation system must prevent:

* Driver accidentally marking an order as delivered.
* Driver marking an unrelated order as delivered.
* Reusing an old delivery code.
* Reusing a QR code from a previous order.
* A driver confirming another customer's order.
* Customer code being accepted after delivery is already completed.
* Client-side manipulation of delivery status.
* Unauthorized delivery confirmation.
* Guessing a valid 6-digit code through unlimited attempts.

The system must provide a clear audit trail for every verification attempt.

---

# 3. Roles

The delivery verification flow involves three primary roles.

### Customer

The customer:

* Receives the order.
* Opens the active order.
* Views the delivery verification screen.
* Displays the QR code.
* Can display the 6-digit code.
* Gives the QR/code to the driver at handoff.

### Driver

The driver:

* Receives the delivery.
* Travels to the customer's destination.
* Opens the active delivery.
* Scans the customer's QR code.

OR:

* Enters the customer's 6-digit code manually.

The driver cannot manually set an order to `DELIVERED`.

### Backend

The backend:

* Validates the credential.
* Validates the order.
* Validates the driver.
* Validates the delivery.
* Validates credential expiration.
* Prevents replay.
* Records the verification.
* Changes the delivery/order state.
* Publishes delivery completion events.

---

# 4. High-Level Architecture

```text
┌──────────────────────┐
│   Customer Mobile    │
│                      │
│ Active Order         │
│       │              │
│       ├── QR Code    │
│       └── 6 Digit    │
└──────────┬───────────┘
           │
           │ QR / Code
           ▼
┌──────────────────────┐
│    Driver Mobile     │
│                      │
│ Scan QR              │
│ OR                   │
│ Enter 6 Digit Code   │
└──────────┬───────────┘
           │
           │ HTTPS
           ▼
┌──────────────────────┐
│     Next.js API      │
│                      │
│ Verification Service │
└──────────┬───────────┘
           │
           ▼
┌────────────────────────────┐
│        PostgreSQL          │
│                            │
│ Order                      │
│ Delivery                   │
│ DriverAssignment           │
│ DeliveryVerification       │
│ OrderStatusHistory         │
└──────────┬─────────────────┘
           │
           ▼
┌──────────────────────┐
│ Notification/Event   │
│ System               │
└──────────────────────┘
```

---

# 5. Delivery Credential

Each order receives a unique delivery verification credential.

The credential consists of:

```text
DeliveryVerification
│
├── id
├── deliveryId
├── orderId
├── customerId
├── driverId
├── codeHash
├── qrTokenHash
├── status
├── expiresAt
├── attemptCount
├── maxAttempts
├── consumedAt
├── consumedByDriverId
├── createdAt
└── updatedAt
```

The credential is associated with the delivery rather than being a permanent property of the customer.

---

# 6. Credential Generation

When an order reaches the appropriate delivery stage, the backend generates a delivery verification credential.

Example:

```text
Order:
ORD-2026-000184

6-digit code:
583214

QR:
opaque signed/random verification token
```

The QR should NOT directly contain:

```text
orderId
customerId
driverId
583214
```

Instead, it should contain an opaque token.

Example conceptual QR payload:

```text
delivery://verify/<opaque-token>
```

The opaque token should not expose sensitive customer information.

---

# 7. Code Generation

The 6-digit code must be generated using a cryptographically secure random generator.

Example:

```text
583214
```

Valid range:

```text
000000 - 999999
```

Leading zeroes must be supported.

For example:

```text
004821
```

is valid.

Do not generate codes using predictable methods such as:

```text
orderId % 1000000
timestamp % 1000000
customerId % 1000000
```

The backend must generate the code using a secure random source.

---

# 8. Code Storage

The plaintext 6-digit code should not be stored in the database.

Store:

```text
codeHash
```

instead.

Conceptually:

```text
Customer sees:

583214

Database:

codeHash = hash(583214)
```

When the driver submits:

```text
583214
```

the backend verifies it against the stored hash.

---

# 9. QR Token Storage

The QR token should also be treated as a secret.

Prefer:

```text
qrTokenHash
```

rather than storing the raw token.

The QR contains the raw token.

The database contains the hash of the token.

---

# 10. When Should the Credential Be Generated?

The credential should be created when the order enters the delivery phase.

Recommended lifecycle:

```text
ORDER CREATED
      │
      ▼
PAYMENT CONFIRMED
      │
      ▼
PREPARING
      │
      ▼
READY_FOR_PICKUP
      │
      ▼
DRIVER ASSIGNED
      │
      ▼
PICKED_UP
      │
      ▼
OUT_FOR_DELIVERY
      │
      ▼
DELIVERY CREDENTIAL ACTIVE
```

The credential may be generated earlier for implementation convenience, but it must not be accepted until the delivery is in a valid verification state.

---

# 11. Customer Application

The customer application should display the delivery credential only when appropriate.

Example:

```text
┌──────────────────────────────┐
│       Your Delivery          │
│                              │
│       Driver is nearby       │
│                              │
│   ┌──────────────────────┐   │
│   │                      │   │
│   │       QR CODE        │   │
│   │                      │   │
│   └──────────────────────┘   │
│                              │
│       Delivery Code          │
│                              │
│          583 214             │
│                              │
│  Show this code to the      │
│  delivery driver.           │
│                              │
└──────────────────────────────┘
```

The customer should be instructed not to share the code before the driver arrives.

---

# 12. Customer Verification Screen

Recommended states:

### Before delivery

```text
Delivery code is not available yet.
```

### Driver approaching

```text
Your driver is approaching.

Your delivery code is ready.
```

### Active handoff

```text
Show this QR code to your driver.

583 214
```

### Delivered

```text
Order delivered successfully.

Delivery confirmed at 7:42 PM.
```

### Failed/expired

```text
Your delivery verification code has expired.

Please contact support.
```

---

# 13. Driver Application

The driver application should provide two verification methods.

```text
Confirm Delivery

┌────────────────────────────┐
│                            │
│       Scan Customer QR     │
│                            │
└────────────────────────────┘

            OR

┌────────────────────────────┐
│ Enter 6-digit code         │
└────────────────────────────┘
```

The driver should normally use QR scanning because it reduces typing errors.

The 6-digit code exists as a fallback.

---

# 14. QR Verification Workflow

## Step 1

Driver arrives at the customer's location.

The driver opens:

```text
Active Delivery
        ↓
Confirm Delivery
        ↓
Scan QR
```

## Step 2

Camera opens.

Driver scans the QR displayed by the customer.

## Step 3

Driver app extracts the opaque QR token.

Example:

```text
delivery://verify/7b4c9e...
```

## Step 4

Driver app sends the token to the backend.

```http
POST /api/v1/deliveries/{deliveryId}/verify
```

Request:

```json
{
  "method": "QR",
  "token": "opaque-token"
}
```

## Step 5

Backend validates:

```text
Is driver authenticated?
        ↓
Is driver assigned to delivery?
        ↓
Does delivery exist?
        ↓
Is delivery active?
        ↓
Does credential belong to delivery?
        ↓
Is credential active?
        ↓
Is credential expired?
        ↓
Has credential already been consumed?
        ↓
Is QR token valid?
        ↓
Is verification allowed?
```

If all checks pass:

```text
DELIVERY VERIFIED
```

---

# 15. 6-Digit Code Workflow

If QR scanning is unavailable:

```text
Driver
  ↓
Confirm Delivery
  ↓
Enter Code
  ↓
583214
  ↓
Backend
  ↓
Validate
  ↓
Success
```

Request:

```json
{
  "method": "CODE",
  "code": "583214"
}
```

The backend must never trust the driver's client-side validation.

---

# 16. Verification Rules

The backend must verify all of the following.

### Rule 1 — Driver Authentication

The driver must have a valid authenticated session.

```text
Unauthenticated → REJECT
Authenticated → CONTINUE
```

### Rule 2 — Driver Assignment

The driver must be assigned to the delivery.

```text
assignedDriverId == authenticatedDriverId
```

Otherwise:

```text
403 FORBIDDEN
```

### Rule 3 — Delivery State

Verification is only allowed from permitted states.

Recommended:

```text
OUT_FOR_DELIVERY
ARRIVING
```

Depending on the state machine, `PICKED_UP` may also be accepted if the product wants drivers to confirm delivery immediately.

Do not allow:

```text
CANCELLED
FAILED
DELIVERED
```

### Rule 4 — Credential State

Credential must be:

```text
ACTIVE
```

Not:

```text
CONSUMED
EXPIRED
REVOKED
```

### Rule 5 — Order Match

The credential must belong to the same delivery/order.

### Rule 6 — One-Time Use

After successful verification:

```text
ACTIVE → CONSUMED
```

The credential can never be used again.

---

# 17. Successful Verification

The verification must happen inside a database transaction.

Conceptually:

```text
BEGIN TRANSACTION

1. Lock delivery
2. Lock verification credential
3. Validate driver assignment
4. Validate delivery state
5. Validate credential
6. Mark credential CONSUMED
7. Create DeliveryVerification record
8. Update delivery status
9. Update order status
10. Create OrderStatusHistory
11. Create audit record

COMMIT
```

This prevents two requests from simultaneously completing the same delivery.

---

# 18. Delivery Completion

After successful verification:

```text
Delivery:

ARRIVING
   ↓
DELIVERED
```

Order:

```text
OUT_FOR_DELIVERY
   ↓
DELIVERED
```

Payment:

```text
PAID
```

remains unchanged.

The order should also record:

```text
deliveredAt
```

---

# 19. Verification Record

A successful verification should create an immutable record.

Example:

```text
DeliveryVerification

id:
dv_91f82...

deliveryId:
del_812...

orderId:
ord_184...

driverId:
drv_392...

customerId:
usr_812...

method:
QR

verifiedAt:
2026-10-01T14:32:21Z

latitude:
12.9716

longitude:
77.5946

accuracy:
8.2

deviceId:
...

ipAddress:
...

result:
SUCCESS
```

The exact amount of device/network metadata retained should follow the platform's privacy policy.

---

# 20. Verification Methods

Use an enum:

```text
DeliveryVerificationMethod

QR
CODE
```

Future methods can include:

```text
OTP
PHOTO
SIGNATURE
MANUAL
```

But QR and 6-digit code are the primary MVP methods.

---

# 21. Verification Status

Recommended:

```text
DeliveryVerificationStatus

ACTIVE
CONSUMED
EXPIRED
REVOKED
```

For individual attempts, use:

```text
VerificationAttemptResult

SUCCESS
INVALID_CODE
INVALID_QR
EXPIRED
ALREADY_USED
WRONG_DRIVER
INVALID_STATE
RATE_LIMITED
```

This allows the system to distinguish the current credential state from individual attempts.

---

# 22. Failed Verification Attempts

Every failed attempt should be handled carefully.

Example:

```text
Driver enters:

123456

Backend:

INVALID_CODE
```

The backend should not reveal excessive information.

Do not respond with:

```text
The code exists but belongs to another customer.
```

Instead:

```text
Invalid delivery verification code.
```

---

# 23. Rate Limiting

The 6-digit code has only one million possible combinations.

Therefore manual code verification must be rate limited.

Example policy:

```text
Maximum attempts:
5 attempts / short window

After repeated failures:
temporary lock

Further failures:
security event + support/admin review
```

The exact limits should be configurable.

Rate limiting should be applied by combinations such as:

```text
driverId
deliveryId
IP
device/session
```

Do not rely on IP alone.

---

# 24. QR Replay Protection

QR credentials are single-use.

Before delivery:

```text
ACTIVE
```

After successful verification:

```text
CONSUMED
```

If somebody tries the QR again:

```text
REJECT

Reason:
Credential already consumed.
```

The backend must enforce this even if the old QR image is still visible.

---

# 25. Credential Expiration

The credential should have an expiration policy.

Example:

```text
Credential created
       ↓
Active
       ↓
Delivery completed
       ↓
Consumed
```

If the delivery fails or is cancelled:

```text
ACTIVE → REVOKED
```

If a new delivery attempt is created:

```text
Generate new credential
```

Never reactivate an old credential for a new delivery attempt.

---

# 26. Order-Level Uniqueness

Every new order receives a new delivery credential.

Example:

```text
Order A
Code: 583214
QR: Token A
```

Next order:

```text
Order B
Code: 192847
QR: Token B
```

Even if the customer orders again:

```text
Order C
Code: 731052
QR: Token C
```

The code belongs to the order/delivery, not permanently to the customer.

---

# 27. Driver GPS During Verification

The driver application should send the driver's current location during active delivery.

At verification time, capture the most recent location.

Example:

```text
Driver Location

latitude:
12.9716

longitude:
77.5946

accuracy:
8.2 meters

recordedAt:
2026-10-01T14:32:18Z
```

Then verification:

```text
verifiedAt:
2026-10-01T14:32:21Z
```

This provides useful operational evidence that the delivery was confirmed near the customer's destination.

GPS should be treated as supporting evidence, not as the sole proof of delivery.

---

# 28. GPS Proximity Check

The backend may optionally verify whether the driver is reasonably close to the delivery destination.

Example:

```text
Customer destination
        ●
        │
        │ 120 m
        │
        ●
Driver
```

If:

```text
distance <= configured verification radius
```

verification can proceed normally.

If the driver is far away:

```text
distance > configured radius
```

the system can:

```text
allow with warning
```

or:

```text
require additional verification
```

or:

```text
reject verification
```

This should be a configurable business rule.

GPS should not be used as the only authentication factor because GPS can be inaccurate or spoofed.

---

# 29. H3 Integration

The platform can use H3 for delivery-area and driver-location indexing.

H3 converts latitude/longitude into a hierarchical hexagonal cell.

Conceptually:

```text
GPS Coordinate
      │
      ▼
H3 Cell
      │
      ▼
Spatial bucket
```

Example:

```text
Driver GPS
12.9716, 77.5946

        ↓

H3 Cell

8928308280fffff
```

The exact resolution should be configurable.

H3 is useful for:

* Finding nearby drivers.
* Grouping drivers into geographic cells.
* Delivery zone management.
* Dispatch candidate discovery.
* Heatmaps.
* Driver density.
* Geographic aggregation.
* Geofencing logic.

H3 should NOT be treated as a road-routing engine.

For actual driving distance and ETA, use a routing/navigation engine.

---

# 30. Driver Discovery Using H3

When a delivery needs a driver:

```text
Pickup Location
       │
       ▼
Convert pickup GPS → H3 cell
       │
       ▼
Search drivers in same cell
       │
       ▼
Not enough drivers?
       │
       ▼
Expand neighboring H3 cells
       │
       ▼
Filter candidates
       │
       ▼
Calculate actual distance/ETA
       │
       ▼
Offer delivery
```

Example:

```text
                ┌───────┐
                │ Cell  │
          ┌─────┼───────┼─────┐
          │     │       │     │
          │ C1  │ PICKUP│ C2  │
          │     │       │     │
          └─────┼───────┼─────┘
                │ C3    │
                └───────┘
```

The H3 search finds candidates.

The routing system determines the actual road distance and ETA.

---

# 31. H3 Must Not Determine ETA

Do NOT do:

```text
H3 grid distance
        ↓
ETA
```

This is incorrect.

H3 grid distance represents movement between H3 cells, not actual road travel.

Correct architecture:

```text
GPS
 ↓
H3
 ↓
Candidate Drivers
 ↓
Actual Road Distance / ETA
 ↓
Dispatch Ranking
```

---

# 32. Driver Location Record

The driver location system should maintain a current location record.

Example:

```text
DriverLocation

id
driverId
deliveryId
latitude
longitude
accuracy
heading
speed
altitude
h3Resolution
h3Cell
recordedAt
receivedAt
sequenceNumber
source
```

Optional:

```text
batteryLevel
isMocked
deviceId
```

---

# 33. Current Driver Location

For fast lookup:

```text
Driver.currentLocation
```

or a dedicated current-location table can be maintained.

Example:

```text
DriverCurrentLocation

driverId
latitude
longitude
h3Cell
accuracy
heading
speed
recordedAt
updatedAt
```

Historical location samples should be stored separately.

This avoids querying thousands of historical GPS points just to display the driver's current position.

---

# 34. GPS Update Strategy

Do not blindly send GPS every second forever.

Use adaptive tracking.

Example:

```text
Active delivery:

Send location when:

distance moved >= configured threshold

OR

maximum update interval reached
```

For example:

```text
10–20 meters
OR
5 seconds
```

The exact values should be configurable.

The driver app should also account for mobile operating-system background location restrictions.

---

# 35. GPS Validation

The backend should reject obviously invalid GPS data.

Validate:

```text
latitude:
-90 to +90

longitude:
-180 to +180

accuracy:
>= 0

timestamp:
reasonable clock range

speed:
reasonable range

sequence:
not older than latest accepted sequence
```

Detect suspicious jumps such as:

```text
Location A
    ↓
12.9716, 77.5946

Location B
    ↓
12.9716, 77.5946

Location C
    ↓
13.0827, 80.2707
```

A sudden impossible movement should be flagged.

Do not automatically assume fraud from a single GPS anomaly.

---

# 36. Out-of-Order GPS Events

Mobile networks can deliver location events out of order.

Example:

```text
Event 101
recordedAt: 10:00:05

Event 102
recordedAt: 10:00:10

Event 100
recordedAt: 10:00:02
```

If event 100 arrives last, it must not overwrite the current location.

Use:

```text
sequenceNumber
+
recordedAt
```

to determine whether a location sample is newer.

---

# 37. Real-Time Tracking

Recommended architecture:

```text
Driver Mobile
     │
     │ GPS
     ▼
Next.js API
     │
     ├──────────────► PostgreSQL
     │
     ├──────────────► Current Location
     │
     └──────────────► Realtime Event
                              │
             ┌────────────────┼────────────────┐
             ▼                ▼                ▼
        Customer App      Vendor App       Admin Web
```

WebSocket or another real-time transport can be used for live updates.

However:

```text
WebSocket ≠ source of truth
```

PostgreSQL/backend state remains authoritative.

If the connection drops:

```text
Client reconnects
      ↓
Fetch latest delivery state
      ↓
Fetch latest driver location
      ↓
Resume realtime updates
```

---

# 38. Customer Tracking

The customer should see:

```text
┌──────────────────────────────┐
│ Your order                   │
│                              │
│ Vendor                       │
│       │                      │
│       │ Preparing            │
│       ▼                      │
│ Driver picked up             │
│       │                      │
│       ▼                      │
│ Driver is on the way         │
│                              │
│          🚗                  │
│             ● Customer       │
│                              │
│ ETA: ~12 min                 │
│                              │
│ Delivery code                │
│ 583 214                      │
└──────────────────────────────┘
```

The driver should be represented by a generic delivery marker.

Do not expose unnecessary driver personal information.

---

# 39. Driver Tracking Screen

The driver should see:

```text
Active Delivery

Pickup
  ✓

Customer
  ↓

Navigation
  ↓

Current GPS

  🚗

Destination
```

Actions:

```text
Start navigation
Call customer
View delivery
Confirm delivery
```

The actual navigation route can be handed to a navigation provider.

---

# 40. Vendor Tracking

The vendor can see:

```text
Order
  ↓
Preparing
  ↓
Ready for pickup
  ↓
Driver assigned
  ↓
Picked up
  ↓
Out for delivery
  ↓
Delivered
```

After pickup, vendor can see:

```text
Driver assigned
Driver status
Delivery status
Approximate ETA
```

---

# 41. Admin Tracking

The admin dashboard can provide:

```text
Active Deliveries
        │
        ├── Driver
        ├── Order
        ├── Vendor
        ├── Customer
        ├── Current Location
        ├── Delivery Status
        ├── Last GPS Update
        └── ETA
```

Admin can filter:

```text
All
Assigned
Picked Up
In Transit
Arriving
Delayed
Failed
Delivered
```

---

# 42. API Specification

## Get Delivery

```http
GET /api/v1/deliveries/{deliveryId}
```

Returns:

```json
{
  "id": "del_123",
  "orderId": "ord_123",
  "status": "OUT_FOR_DELIVERY",
  "driver": {
    "id": "drv_123",
    "status": "BUSY"
  }
}
```

---

# 43. Submit Driver Location

```http
POST /api/v1/drivers/me/location
```

Request:

```json
{
  "deliveryId": "del_123",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "accuracy": 8.2,
  "heading": 180,
  "speed": 9.4,
  "recordedAt": "2026-10-01T14:32:18Z",
  "sequenceNumber": 1842
}
```

Backend calculates/stores:

```text
h3Cell
```

based on the configured H3 resolution.

---

# 44. QR Verification API

```http
POST /api/v1/deliveries/{deliveryId}/verify
```

Request:

```json
{
  "method": "QR",
  "token": "opaque-token"
}
```

Response:

```json
{
  "success": true,
  "deliveryStatus": "DELIVERED",
  "orderStatus": "DELIVERED",
  "verifiedAt": "2026-10-01T14:32:21Z"
}
```

---

# 45. Code Verification API

```http
POST /api/v1/deliveries/{deliveryId}/verify
```

Request:

```json
{
  "method": "CODE",
  "code": "583214"
}
```

Successful response:

```json
{
  "success": true,
  "deliveryStatus": "DELIVERED",
  "orderStatus": "DELIVERED",
  "verifiedAt": "2026-10-01T14:32:21Z"
}
```

---

# 46. Verification Error Responses

Invalid code:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_VERIFICATION",
    "message": "Invalid delivery verification."
  }
}
```

Already consumed:

```json
{
  "success": false,
  "error": {
    "code": "VERIFICATION_ALREADY_USED",
    "message": "This delivery verification has already been used."
  }
}
```

Wrong driver:

```json
{
  "success": false,
  "error": {
    "code": "DRIVER_NOT_ASSIGNED",
    "message": "You are not assigned to this delivery."
  }
}
```

Invalid state:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_DELIVERY_STATE",
    "message": "This delivery cannot be verified yet."
  }
}
```

---

# 47. Event System

After successful verification, publish:

```text
delivery.verified
```

Payload:

```json
{
  "deliveryId": "del_123",
  "orderId": "ord_123",
  "driverId": "drv_123",
  "verificationMethod": "QR",
  "verifiedAt": "2026-10-01T14:32:21Z"
}
```

Consumers:

```text
Customer notification
Vendor notification
Admin dashboard
Order history
Analytics
Audit system
```

---

# 48. Order Events

Recommended events:

```text
order.created
order.confirmed
order.preparing
order.ready_for_pickup
order.driver_assigned
order.picked_up
order.out_for_delivery
order.arriving
delivery.verification_started
delivery.verified
order.delivered
order.cancelled
order.failed
```

---

# 49. Database Changes

The existing `DeliveryVerification` model should be extended to support the one-time credential.

Conceptual Prisma model:

```prisma
model DeliveryVerification {
  id                  String   @id @default(cuid())

  deliveryId          String   @unique
  orderId             String

  customerId          String
  driverId            String

  codeHash            String
  qrTokenHash         String

  status              DeliveryVerificationStatus

  expiresAt           DateTime

  attemptCount        Int      @default(0)
  maxAttempts         Int      @default(5)

  consumedAt          DateTime?
  consumedByDriverId  String?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  delivery            Delivery @relation(fields: [deliveryId], references: [id])

  @@index([orderId])
  @@index([driverId])
  @@index([customerId])
  @@index([status])
}
```

---

# 50. Verification Attempt Model

For security auditing, use a separate attempt table.

```prisma
model DeliveryVerificationAttempt {
  id            String   @id @default(cuid())

  deliveryId    String
  driverId      String

  method        DeliveryVerificationMethod
  result        DeliveryVerificationAttemptResult

  latitude      Decimal?
  longitude     Decimal?
  accuracy      Decimal?

  createdAt     DateTime @default(now())

  @@index([deliveryId, createdAt])
  @@index([driverId, createdAt])
}
```

This creates an audit trail such as:

```text
14:30:01 CODE INVALID
14:30:08 CODE INVALID
14:31:42 QR SUCCESS
```

---

# 51. State Machine

The complete delivery state machine becomes:

```text
PENDING
   │
   ▼
ASSIGNING
   │
   ▼
ASSIGNED
   │
   ▼
DRIVER_ACCEPTED
   │
   ▼
PICKUP_READY
   │
   ▼
PICKED_UP
   │
   ▼
IN_TRANSIT
   │
   ▼
ARRIVING
   │
   ▼
DELIVERY VERIFICATION
   │
   ├── QR
   │
   └── 6-DIGIT CODE
           │
           ▼
        VERIFIED
           │
           ▼
        DELIVERED
```

Failed path:

```text
ARRIVING
   │
   ▼
Verification failed
   │
   ├── retry
   │
   ├── support
   │
   └── FAILED
```

---

# 52. Important Separation

Do not combine these concepts:

```text
Order
Delivery
Driver Assignment
Delivery Verification
GPS Location
```

They have different responsibilities.

### Order

What the customer purchased.

### Delivery

Movement of the parcel from vendor to customer.

### Driver Assignment

Which driver is responsible for the delivery.

### Delivery Verification

Proof that the parcel was handed over.

### GPS Location

Where the driver/device is currently located.

---

# 53. Security Rules

## Rule 1

The client cannot directly set:

```text
DELIVERED
```

## Rule 2

Only the backend can transition:

```text
ARRIVING → DELIVERED
```

after successful verification.

## Rule 3

A delivery credential is single-use.

## Rule 4

Credential verification requires the assigned driver.

## Rule 5

Verification attempts must be rate limited.

## Rule 6

6-digit codes must be cryptographically random.

## Rule 7

Plaintext codes should not be stored.

## Rule 8

QR tokens should be opaque.

## Rule 9

Old credentials must be revoked/invalidated.

## Rule 10

All successful delivery confirmations must be auditable.

## Rule 11

GPS is supporting evidence, not the sole proof of delivery.

## Rule 12

H3 is for spatial indexing/candidate discovery, not road navigation.

---

# 54. Complete Delivery Example

Customer orders:

```text
Order:
ORD-2026-000184
```

Vendor prepares:

```text
PREPARING
```

Vendor completes:

```text
READY_FOR_PICKUP
```

Driver accepts:

```text
DRIVER_ACCEPTED
```

Driver collects:

```text
PICKED_UP
```

Driver starts delivery:

```text
OUT_FOR_DELIVERY
```

Driver GPS:

```text
12.9709, 77.5951
```

Driver gets closer:

```text
ARRIVING
```

Customer opens:

```text
Delivery Verification
```

Customer sees:

```text
QR CODE

583214
```

Driver chooses:

```text
Scan QR
```

QR is scanned.

Backend receives:

```text
deliveryId
driverId
qrToken
```

Backend validates:

```text
✓ Authenticated driver
✓ Correct driver
✓ Correct delivery
✓ Delivery active
✓ Credential active
✓ QR valid
✓ Credential not consumed
✓ Verification allowed
```

Backend transaction:

```text
Credential:
ACTIVE → CONSUMED

Delivery:
ARRIVING → DELIVERED

Order:
OUT_FOR_DELIVERY → DELIVERED
```

Then:

```text
Customer:
"Order delivered"

Vendor:
"Order delivered"

Admin:
Delivery completed

Driver:
Delivery completed
```

---

# 55. Recommended Project Structure

```text
apps/
├── admin-web/
├── customer-mobile/
├── vendor-mobile/
└── driver-mobile/

packages/
├── api-client/
├── api-contracts/
├── auth/
├── database/
├── types/
├── validation/
├── ui/
├── geo/
│   ├── h3/
│   ├── distance/
│   ├── geofence/
│   └── dispatch/
├── delivery/
│   ├── verification/
│   ├── tracking/
│   ├── assignment/
│   └── state-machine/
└── utils/

apps/api/
└── src/
    └── modules/
        ├── orders/
        ├── deliveries/
        ├── drivers/
        ├── tracking/
        ├── verification/
        └── notifications/
```

---

# 56. Geo Package

The `geo` package should contain:

```text
geo/
├── h3/
│   ├── cell.ts
│   ├── neighbors.ts
│   ├── distance.ts
│   └── resolution.ts
│
├── distance/
│   ├── haversine.ts
│   └── validation.ts
│
├── geofence/
│   ├── contains.ts
│   └── proximity.ts
│
└── dispatch/
    ├── candidate-search.ts
    ├── candidate-filter.ts
    └── candidate-ranking.ts
```

---

# 57. Verification Package

```text
delivery/
└── verification/
    ├── generate-code.ts
    ├── generate-qr-token.ts
    ├── hash-credential.ts
    ├── verify-code.ts
    ├── verify-qr.ts
    ├── consume-credential.ts
    ├── verification-service.ts
    └── verification-errors.ts
```

The main business operation should be:

```text
verifyDelivery()
```

It should own the complete verification transaction.

---

# 58. Testing Requirements

## Unit Tests

Test:

```text
code generation
QR token generation
code hashing
code verification
expiration
replay prevention
rate limiting
GPS validation
H3 conversion
H3 neighbor search
distance calculation
```

## Integration Tests

Test:

```text
Driver + Delivery
Driver + Credential
Credential + Order
Verification + State Machine
Verification + GPS
```

## Security Tests

Test:

```text
Wrong driver
Wrong delivery
Wrong code
Expired code
Consumed code
Repeated attempts
Concurrent verification
Unauthenticated request
Unauthorized driver
Tampered QR token
```

---

# 59. Critical Concurrency Test

Two requests may arrive at almost exactly the same time:

```text
Driver request A → QR
Driver request B → QR
```

Both must NOT produce:

```text
DELIVERED
DELIVERED
```

The database transaction must guarantee:

```text
Request A
   ↓
Credential locked
   ↓
Consumed
   ↓
Delivery completed

Request B
   ↓
Credential already consumed
   ↓
REJECTED
```

This is mandatory.

---

# 60. Final Architecture

The complete system should work like this:

```text
                    CUSTOMER
                       │
                       │
                 Places Order
                       │
                       ▼
                    ORDER
                       │
                       ▼
                   VENDOR
                       │
                 Prepares Parcel
                       │
                       ▼
                READY_FOR_PICKUP
                       │
                       ▼
                 DRIVER ASSIGNMENT
                       │
                       ▼
                    DRIVER
                       │
                    Pickup
                       │
                       ▼
                  PICKED_UP
                       │
                       ▼
                OUT_FOR_DELIVERY
                       │
              ┌────────┴────────┐
              │                 │
             GPS               H3
              │                 │
              ▼                 ▼
        Live Location      Spatial Index
              │                 │
              └────────┬────────┘
                       │
                       ▼
                    ARRIVING
                       │
                       ▼
              CUSTOMER SHOWS QR
                       │
                 ┌─────┴─────┐
                 │           │
              QR Scan      6-Digit
                 │           │
                 └─────┬─────┘
                       │
                       ▼
                 BACKEND VERIFY
                       │
          ┌────────────┼────────────┐
          │            │            │
       Driver       Credential    Delivery
       Check          Check        Check
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
                DATABASE TRANSACTION
                       │
              ┌────────┴────────┐
              │                 │
       Credential CONSUMED   Delivery
                                │
                                ▼
                            DELIVERED
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
                Customer     Vendor       Admin
                notified     notified     updated
```

## 61. Design Principle

The most important rule for this system is:

> **The QR/6-digit code proves the handoff; the driver's GPS provides supporting location evidence; the backend authorizes the state transition; PostgreSQL records the final truth.**

This keeps **authentication, delivery verification, GPS tracking, H3 spatial indexing, and order state management** separate while allowing them to work together cleanly.

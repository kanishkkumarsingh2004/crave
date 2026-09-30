# State Machines Specification

**Project:** Multi-Role Delivery Platform
**Document:** `state-machines.md`
**Version:** 1.0.0
**Status:** Specification
**Last Updated:** 2026-09-29

---

# 1. Purpose

This document defines the lifecycle and state-transition rules for all stateful entities in the delivery platform.

The platform contains multiple independent workflows:

- User accounts
- Vendor accounts
- Driver accounts
- Products
- Inventory
- Orders
- Payments
- Deliveries
- Refunds
- Notifications

Each state machine defines:

1. Valid states
2. Valid transitions
3. Who or what can trigger a transition
4. Conditions required for a transition
5. Invalid transitions
6. Terminal states
7. Side effects
8. Audit requirements

The backend is the authoritative state-transition engine.

Clients must request transitions.

Clients must never directly control arbitrary state values.

---

# 2. Core State Machine Principle

The system follows:

```text
Current State
      ↓
Requested Action
      ↓
Authorization
      ↓
Business Rule Validation
      ↓
State Transition Validation
      ↓
Database Transaction
      ↓
Side Effects
      ↓
New State
```

Example:

```text
Vendor clicks "Accept Order"

        ↓

POST /api/v1/orders/:id/accept

        ↓

Authenticate vendor

        ↓

Verify vendor owns order

        ↓

Verify order = PENDING

        ↓

Verify inventory/business rules

        ↓

Transaction

        ↓

Order = CONFIRMED
```

The client does not send:

```json
{
  "status": "CONFIRMED"
}
```

and expect the backend to trust it.

The backend determines the resulting state.

---

# 3. State Machine Requirements

Every stateful entity must define:

```text
States
Transitions
Actors
Preconditions
Side Effects
Terminal States
Failure Behavior
Audit Requirements
```

No new state should be introduced without updating this document.

No new transition should be implemented without updating this document.

---

# 4. State Naming Convention

Use uppercase enum-style state names in backend/database code.

Example:

```typescript
PENDING;
CONFIRMED;
PREPARING;
READY_FOR_PICKUP;
```

Use descriptive names.

Avoid ambiguous states such as:

```text
ACTIVE
DONE
PROCESSING
FINISHED
```

unless their meaning is explicitly defined for that specific entity.

---

# 5. User Account State Machine

## 5.1 States

```text
PENDING
ACTIVE
SUSPENDED
DEACTIVATED
```

---

## 5.2 Lifecycle

```text
PENDING
   │
   ▼
ACTIVE
   │
   ├──────────────► SUSPENDED
   │                   │
   │                   ▼
   │                 ACTIVE
   │
   ▼
DEACTIVATED
```

---

## 5.3 Transitions

| Current     | Action              | Next          | Actor                 |
| ----------- | ------------------- | ------------- | --------------------- |
| `PENDING`   | Complete activation | `ACTIVE`      | System/User           |
| `ACTIVE`    | Suspend             | `SUSPENDED`   | Admin/System          |
| `SUSPENDED` | Restore             | `ACTIVE`      | Admin                 |
| `ACTIVE`    | Deactivate          | `DEACTIVATED` | Authorized User/Admin |
| `SUSPENDED` | Deactivate          | `DEACTIVATED` | Admin                 |

`DEACTIVATED` should normally be treated as a terminal business state unless account restoration is explicitly supported.

---

# 6. Vendor State Machine

## 6.1 States

```text
PENDING
APPROVED
ACTIVE
SUSPENDED
CLOSED
REJECTED
```

---

## 6.2 Lifecycle

```text
                ┌──────────────┐
                │   PENDING    │
                └──────┬───────┘
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
         APPROVED             REJECTED
             │
             ▼
          ACTIVE
             │
             ▼
        SUSPENDED
             │
             ▼
          ACTIVE

ACTIVE ───────────────► CLOSED
```

---

## 6.3 Valid Transitions

| Current     | Action   | Next        | Actor                   |
| ----------- | -------- | ----------- | ----------------------- |
| `PENDING`   | Approve  | `APPROVED`  | Admin                   |
| `PENDING`   | Reject   | `REJECTED`  | Admin                   |
| `APPROVED`  | Activate | `ACTIVE`    | Admin/System            |
| `ACTIVE`    | Suspend  | `SUSPENDED` | Admin                   |
| `SUSPENDED` | Restore  | `ACTIVE`    | Admin                   |
| `ACTIVE`    | Close    | `CLOSED`    | Authorized Admin/Vendor |
| `APPROVED`  | Close    | `CLOSED`    | Authorized Admin/Vendor |

---

## 6.4 Vendor Operational Rules

A vendor must be:

```text
ACTIVE
```

to:

- receive new orders
- modify products
- modify inventory
- process orders
- access operational vendor features

A suspended vendor cannot process new orders.

Existing orders require explicit operational handling.

---

# 7. Driver State Machine

## 7.1 Account State

```text
PENDING
APPROVED
ACTIVE
SUSPENDED
DEACTIVATED
```

---

## 7.2 Lifecycle

```text
PENDING
   │
   ▼
APPROVED
   │
   ▼
ACTIVE
   │
   ├────────► SUSPENDED
   │             │
   │             ▼
   └────────── ACTIVE
   │
   ▼
DEACTIVATED
```

---

## 7.3 Operational Availability

Account state and availability must remain separate.

Driver account:

```text
ACTIVE
```

does not necessarily mean:

```text
AVAILABLE
```

Use a separate operational availability state:

```text
OFFLINE
AVAILABLE
BUSY
```

Lifecycle:

```text
OFFLINE
   │
   ▼
AVAILABLE
   │
   ▼
BUSY
   │
   ▼
AVAILABLE
   │
   ▼
OFFLINE
```

This prevents account state from being overloaded with operational availability.

---

# 8. Product State Machine

## 8.1 States

```text
DRAFT
ACTIVE
INACTIVE
ARCHIVED
```

---

## 8.2 Lifecycle

```text
DRAFT
  │
  ▼
ACTIVE
  │
  ├────────► INACTIVE
  │             │
  │             ▼
  └────────── ACTIVE
  │
  ▼
ARCHIVED
```

---

## 8.3 Rules

`ACTIVE` products can:

- appear in customer catalog
- be added to carts
- participate in checkout

`INACTIVE` products:

- remain in vendor records
- cannot be newly purchased

`ARCHIVED` products:

- should not appear in normal catalog queries
- remain available for historical order references

Historical orders must retain their product snapshot even after a product is archived.

---

# 9. Inventory State Machine

Inventory itself should not rely only on a single status.

Inventory quantity should be represented using quantities such as:

```text
onHand
reserved
available
```

Where:

```text
available = onHand - reserved
```

---

## 9.1 Inventory Operational States

Derived state:

```text
OUT_OF_STOCK
LOW_STOCK
IN_STOCK
```

Optional:

```text
DISABLED
```

---

## 9.2 Derived Lifecycle

```text
IN_STOCK
    │
    ▼
LOW_STOCK
    │
    ▼
OUT_OF_STOCK
```

and:

```text
OUT_OF_STOCK
    │
    ▼
LOW_STOCK
    │
    ▼
IN_STOCK
```

These should normally be derived from quantity thresholds rather than manually assigned.

---

# 10. Inventory Reservation State

Inventory reservations require an explicit lifecycle.

## 10.1 States

```text
PENDING
RESERVED
RELEASED
COMMITTED
EXPIRED
```

---

## 10.2 Lifecycle

```text
PENDING
   │
   ▼
RESERVED
   │
   ├────────► RELEASED
   │
   ├────────► EXPIRED
   │
   ▼
COMMITTED
```

---

## 10.3 Reservation Rules

Inventory is reserved during the appropriate checkout/order phase.

Reservation must:

1. Verify available quantity.
2. Lock or atomically update inventory.
3. Create reservation.
4. Prevent overselling.
5. Expire if the checkout/payment process fails or times out.
6. Commit when the order is successfully confirmed.

---

# 11. Order State Machine

The order state machine is one of the most important parts of the platform.

## 11.1 States

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

---

# 12. Order Lifecycle

```text
                  ┌─────────────┐
                  │   PENDING   │
                  └──────┬──────┘
                         │
              ┌──────────┴──────────┐
              ▼                     ▼
        ┌───────────┐          ┌───────────┐
        │ CONFIRMED │          │ CANCELLED │
        └─────┬─────┘          └───────────┘
              │
              ▼
        ┌────────────┐
        │ PREPARING  │
        └─────┬──────┘
              │
              ▼
     ┌────────────────────┐
     │ READY_FOR_PICKUP   │
     └─────────┬──────────┘
               │
               ▼
        ┌─────────────┐
        │  PICKED_UP  │
        └──────┬──────┘
               │
               ▼
     ┌──────────────────┐
     │ OUT_FOR_DELIVERY │
     └────────┬─────────┘
              │
              ▼
        ┌────────────┐
        │ DELIVERED  │
        └────────────┘
```

Failure path:

```text
PENDING
   │
   ▼
FAILED
```

or an appropriate failure transition from another state according to the business rules.

---

# 13. Order Transitions

## 13.1 Create Order

```text
NONE → PENDING
```

Actor:

```text
CUSTOMER / SYSTEM
```

Conditions:

- authenticated customer
- valid cart
- products active
- sufficient inventory
- vendor active
- valid delivery address
- valid pricing
- valid checkout information

---

## 13.2 Confirm Order

```text
PENDING → CONFIRMED
```

Actor:

```text
VENDOR / SYSTEM
```

Conditions:

- vendor owns order
- vendor is active
- order is pending
- required payment condition satisfied
- inventory reservation valid

---

## 13.3 Start Preparation

```text
CONFIRMED → PREPARING
```

Actor:

```text
VENDOR
```

Conditions:

- vendor owns order
- order confirmed
- vendor active

---

## 13.4 Ready for Pickup

```text
PREPARING → READY_FOR_PICKUP
```

Actor:

```text
VENDOR
```

Conditions:

- order preparation completed
- products packed
- order eligible for pickup

---

## 13.5 Pickup

```text
READY_FOR_PICKUP → PICKED_UP
```

Actor:

```text
DRIVER / SYSTEM
```

Conditions:

- driver assigned
- driver authorized
- pickup verification successful where required

---

## 13.6 Out for Delivery

```text
PICKED_UP → OUT_FOR_DELIVERY
```

Actor:

```text
DRIVER
```

Conditions:

- pickup confirmed
- driver has possession
- delivery is active

---

## 13.7 Delivery

```text
OUT_FOR_DELIVERY → DELIVERED
```

Actor:

```text
DRIVER / SYSTEM
```

Conditions:

- delivery verification completed
- OTP/QR/signature/photo where applicable
- delivery location or operational requirements satisfied

---

# 14. Order Cancellation

Cancellation must be state-aware.

Possible transitions:

```text
PENDING → CANCELLED
CONFIRMED → CANCELLED
```

Additional cancellation states may be permitted only if explicitly defined.

Example:

```text
PREPARING → CANCELLED
```

should not be automatically allowed.

It may require:

- vendor approval
- admin intervention
- refund evaluation

Once:

```text
PICKED_UP
```

the order should normally not use the ordinary customer cancellation path.

---

# 15. Order Failure

`FAILED` represents an order that cannot proceed because of an operational/system failure.

Possible causes:

```text
Payment failure
Inventory failure
Vendor failure
System failure
Delivery failure
```

Failure reason must be stored separately.

Example:

```text
status = FAILED

failureReason = PAYMENT_FAILED
```

Do not create dozens of statuses for every failure reason.

Use:

```text
state
+
reason
```

---

# 16. Order Terminal States

Terminal states:

```text
DELIVERED
CANCELLED
FAILED
```

Terminal orders must not be casually transitioned back into active states.

Any exceptional administrative correction must use a dedicated audited workflow.

---

# 17. Order State Transition Matrix

| From               | To                 |     Allowed |
| ------------------ | ------------------ | ----------: |
| `PENDING`          | `CONFIRMED`        |          ✅ |
| `PENDING`          | `CANCELLED`        |          ✅ |
| `PENDING`          | `FAILED`           |          ✅ |
| `CONFIRMED`        | `PREPARING`        |          ✅ |
| `CONFIRMED`        | `CANCELLED`        | Conditional |
| `CONFIRMED`        | `FAILED`           | Conditional |
| `PREPARING`        | `READY_FOR_PICKUP` |          ✅ |
| `PREPARING`        | `CANCELLED`        |  Restricted |
| `READY_FOR_PICKUP` | `PICKED_UP`        |          ✅ |
| `READY_FOR_PICKUP` | `CANCELLED`        |  Restricted |
| `PICKED_UP`        | `OUT_FOR_DELIVERY` |          ✅ |
| `OUT_FOR_DELIVERY` | `DELIVERED`        |          ✅ |
| `DELIVERED`        | Any active state   |          ❌ |
| `CANCELLED`        | Any active state   |          ❌ |
| `FAILED`           | Any active state   |          ❌ |

---

# 18. Payment State Machine

Payment state must be independent from order state.

## 18.1 States

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

# 19. Payment Lifecycle

```text
PENDING
   │
   ▼
PROCESSING
   │
   ├────────────► FAILED
   │
   ▼
AUTHORIZED
   │
   ▼
PAID
   │
   ├────────────► REFUND_PENDING
   │                     │
   │                     ▼
   │             PARTIALLY_REFUNDED
   │                     │
   │                     ▼
   │                 REFUNDED
   │
   ▼
CANCELLED
```

The exact provider lifecycle may differ, but the internal state machine must remain normalized.

---

# 20. Payment Rules

The client cannot directly set:

```text
PAID
REFUNDED
```

Payment state must be controlled by:

- trusted backend operations
- payment provider callbacks/webhooks
- authorized administrative operations

Webhook processing must be idempotent.

---

# 21. Payment Failure

A payment failure should not automatically imply:

```text
ORDER = FAILED
```

unless the order business rules require it.

Instead:

```text
Payment:
FAILED

Order:
PENDING
```

may remain possible for a retry window.

The order and payment state machines must remain independent.

---

# 22. Refund State Machine

## 22.1 States

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

## 22.2 Lifecycle

```text
NOT_REQUESTED
      │
      ▼
REQUESTED
      │
      ▼
UNDER_REVIEW
      │
      ├────────► REJECTED
      │
      ▼
APPROVED
      │
      ▼
PROCESSING
      │
      ├────────► FAILED
      │
      ▼
REFUNDED
```

Partial refunds:

```text
PROCESSING
    ↓
PARTIALLY_REFUNDED
    ↓
REFUNDED
```

---

# 23. Delivery State Machine

Delivery must have its own lifecycle.

## 23.1 States

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

# 24. Delivery Lifecycle

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
DELIVERED
```

Failure:

```text
ASSIGNED
   ↓
FAILED
```

or:

```text
IN_TRANSIT
   ↓
FAILED
```

depending on the operational situation.

---

# 25. Delivery Assignment Rules

## Pending

Delivery has been created but no driver is assigned.

```text
PENDING → ASSIGNING
```

System starts assignment.

---

## Assigning

The system is finding an eligible driver.

```text
ASSIGNING → ASSIGNED
```

when a driver is successfully assigned.

If no eligible driver exists:

```text
ASSIGNING → PENDING
```

or a dedicated operational failure state may be used.

---

## Assigned

Driver has been selected.

```text
ASSIGNED → DRIVER_ACCEPTED
```

when the driver accepts.

If the driver rejects:

```text
ASSIGNED → ASSIGNING
```

for reassignment.

---

# 26. Pickup Flow

```text
DRIVER_ACCEPTED
       ↓
PICKUP_READY
       ↓
PICKED_UP
```

Pickup may require:

```text
OTP
QR
Barcode
Order identifier
Vendor confirmation
```

The exact verification method can be configured later.

---

# 27. Delivery Flow

```text
PICKED_UP
    ↓
IN_TRANSIT
    ↓
ARRIVING
    ↓
DELIVERED
```

`ARRIVING` is optional operationally.

The system must not require it unless the application actually uses the state.

---

# 28. Delivery Failure

Possible failure reasons:

```text
CUSTOMER_UNAVAILABLE
WRONG_ADDRESS
VEHICLE_ISSUE
DRIVER_ISSUE
VENDOR_ISSUE
WEATHER
SAFETY_ISSUE
SYSTEM_ERROR
OTHER
```

Store:

```text
deliveryStatus = FAILED
failureReason = CUSTOMER_UNAVAILABLE
```

instead of creating:

```text
CUSTOMER_UNAVAILABLE
WRONG_ADDRESS
VEHICLE_ISSUE
```

as separate lifecycle states.

---

# 29. Delivery Cancellation

Possible transitions:

```text
PENDING → CANCELLED
ASSIGNING → CANCELLED
ASSIGNED → CANCELLED
```

Later stages require explicit business rules.

A delivery already in transit should not be cancelled through a normal customer endpoint.

---

# 30. Notification State Machine

Notifications can use:

```text
CREATED
QUEUED
SENDING
SENT
DELIVERED
READ
FAILED
```

Lifecycle:

```text
CREATED
   ↓
QUEUED
   ↓
SENDING
   ↓
SENT
   ↓
DELIVERED
   ↓
READ
```

Failure:

```text
SENDING → FAILED
```

A notification being `READ` means the recipient has read it.

It does not mean the underlying business event succeeded.

---

# 31. Notification Rules

Example:

```text
Order Confirmed
    ↓
Notification Created
    ↓
Push Notification
    ↓
Customer receives notification
```

Notification failure must not normally change the order state.

Example:

```text
Push failed
```

does not mean:

```text
Order failed
```

---

# 32. Admin Intervention

Admins may have controlled intervention capabilities.

Administrative intervention must:

1. Validate authorization.
2. Validate target state.
3. Record reason.
4. Create audit event.
5. Preserve previous state.
6. Avoid silently rewriting history.

Example:

```text
Order:
PREPARING

Admin correction:
PREPARING → CANCELLED

Audit:
actor = admin
reason = vendor unavailable
```

---

# 33. State History

Important entities should maintain state transition history.

Recommended:

```text
OrderStatusHistory
DeliveryStatusHistory
PaymentStatusHistory
VendorStatusHistory
DriverStatusHistory
```

Example:

```text
OrderStatusHistory
-------------------
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

This allows operational debugging and customer support.

---

# 34. Database Transaction Rules

Critical state transitions must happen inside database transactions where multiple records must remain consistent.

Example:

```text
Confirm Order
    ↓
Payment validation
    ↓
Inventory commit
    ↓
Order state update
    ↓
Delivery creation/update
    ↓
Transaction commit
```

If a critical step fails:

```text
ROLLBACK
```

Do not leave the database in a partially updated state.

---

# 35. Concurrency Rules

State transitions must protect against race conditions.

Example:

Two vendor devices attempt:

```text
PENDING → CONFIRMED
```

simultaneously.

Only one request should successfully perform the transition.

The backend must use appropriate:

- database transactions
- row locks where required
- conditional updates
- unique constraints
- optimistic concurrency controls

---

# 36. Idempotency

Operations that can be retried must be idempotent where practical.

Especially:

```text
Payment webhooks
Order creation
Refund requests
Driver assignment
Delivery confirmation
Notification processing
```

Example:

```text
Payment webhook received twice
```

must not result in:

```text
Two payments
Two refunds
Two order confirmations
```

---

# 37. Event vs State

Events and states are different concepts.

State:

```text
ORDER = CONFIRMED
```

Event:

```text
OrderConfirmed
```

The state represents the current truth.

The event represents something that happened.

Recommended flow:

```text
State Transition
      ↓
Persist State
      ↓
Create Domain Event
      ↓
Process Side Effects
```

---

# 38. Real-Time Updates

Real-time systems may broadcast state changes.

Example:

```text
Vendor confirms order
        ↓
Order state persisted
        ↓
OrderConfirmed event
        ↓
WebSocket / Push
        ↓
Customer app updates
```

Real-time communication is not the source of truth.

If WebSocket delivery fails:

```text
Database state remains correct.
```

The client can recover using REST/API synchronization.

---

# 39. Client State Rules

Clients should represent backend state.

They must not invent authoritative state.

Incorrect:

```text
Customer app:
order.status = DELIVERED
```

Correct:

```text
Backend:
order.status = DELIVERED

        ↓

API/WebSocket

        ↓

Customer app:
display DELIVERED
```

---

# 40. State Transition API Design

Prefer action-oriented endpoints for important transitions.

Examples:

```text
POST /api/v1/orders/:id/confirm
POST /api/v1/orders/:id/cancel
POST /api/v1/orders/:id/start-preparation
POST /api/v1/orders/:id/ready-for-pickup

POST /api/v1/deliveries/:id/accept
POST /api/v1/deliveries/:id/reject
POST /api/v1/deliveries/:id/pickup
POST /api/v1/deliveries/:id/start
POST /api/v1/deliveries/:id/complete

POST /api/v1/payments/:id/refund
```

Avoid generic endpoints such as:

```text
PATCH /orders/:id

{
  "status": "DELIVERED"
}
```

for sensitive lifecycle changes.

---

# 41. State Transition Response

Successful transition should return the new resource state.

Example:

```json
{
  "data": {
    "id": "order_123",
    "status": "CONFIRMED"
  }
}
```

Optional:

```json
{
  "data": {
    "id": "order_123",
    "status": "CONFIRMED"
  },
  "event": {
    "type": "ORDER_CONFIRMED"
  }
}
```

---

# 42. Invalid Transition Response

Example:

```json
{
  "error": {
    "code": "INVALID_STATE_TRANSITION",
    "message": "Order cannot transition from DELIVERED to PREPARING"
  }
}
```

Recommended HTTP status:

```text
409 Conflict
```

for state conflicts.

---

# 43. State Machine Validation

The backend should centralize transition definitions.

Conceptually:

```typescript
const orderTransitions = {
  PENDING: ["CONFIRMED", "CANCELLED", "FAILED"],
  CONFIRMED: ["PREPARING", "CANCELLED", "FAILED"],
  PREPARING: ["READY_FOR_PICKUP"],
  READY_FOR_PICKUP: ["PICKED_UP"],
  PICKED_UP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};
```

Then:

```typescript
canTransition(currentState, requestedState);
```

must be evaluated server-side.

---

# 44. State Transition Guard

A transition guard should conceptually perform:

```text
canTransition(
    entity,
    action,
    actor,
    context
)
```

Example:

```text
canTransition(
    order,
    "CONFIRM",
    vendor,
    context
)
```

Validation includes:

```text
Authentication
Role
Ownership
Current State
Business Conditions
Resource Availability
```

---

# 45. Side Effects

Side effects should occur only after the state transition is safely persisted.

Examples:

```text
Order Confirmed
    ↓
Update order state
    ↓
Emit event
    ↓
Notify customer
    ↓
Update vendor dashboard
```

If notifications fail:

```text
Order remains CONFIRMED.
```

Notification processing should be retryable independently.

---

# 46. State Machine and Database Integrity

Database enums or equivalent constraints should be used where practical.

Example:

```text
OrderStatus
PaymentStatus
DeliveryStatus
VendorStatus
DriverStatus
```

The application layer controls transitions.

The database layer prevents invalid enum values.

Both layers are required.

---

# 47. State Machine and Audit

Every sensitive state transition should be auditable.

Example:

```text
Order
PENDING → CONFIRMED

Actor:
vendor_123

Role:
VENDOR

Timestamp:
UTC

Reason:
accepted_by_vendor
```

Administrative transitions must always include an audit reason.

---

# 48. Time Rules

All timestamps must be stored in UTC.

Examples:

```text
createdAt
updatedAt
confirmedAt
preparedAt
pickedUpAt
outForDeliveryAt
deliveredAt
cancelledAt
```

Do not store business timestamps based solely on the device's local clock.

The backend should generate authoritative timestamps.

---

# 49. State Timestamp Rules

Important timestamps should be immutable once recorded unless an explicit correction workflow exists.

Example:

```text
confirmedAt
```

should represent the actual confirmation event.

Do not continuously overwrite it with `updatedAt`.

---

# 50. State Machine Testing

Every state machine must have tests for:

### Valid transitions

```text
PENDING → CONFIRMED
CONFIRMED → PREPARING
PREPARING → READY_FOR_PICKUP
READY_FOR_PICKUP → PICKED_UP
PICKED_UP → OUT_FOR_DELIVERY
OUT_FOR_DELIVERY → DELIVERED
```

### Invalid transitions

```text
DELIVERED → PREPARING
DELIVERED → PENDING
CANCELLED → CONFIRMED
FAILED → PREPARING
```

### Authorization

```text
Customer confirms order
→ DENY

Vendor confirms own order
→ ALLOW

Vendor confirms another vendor's order
→ DENY

Driver updates unrelated delivery
→ DENY
```

### Concurrency

```text
Two confirmation requests
→ One successful transition

Two driver assignments
→ One valid assignment
```

---

# 51. Complete System State Map

The platform can be understood as:

```text
USER
 │
 ├── Account State
 │
 ├── Role
 │
 └── Permissions
       │
       ├──────────────┐
       ▼              ▼
    VENDOR          DRIVER
       │              │
       ▼              ▼
   PRODUCTS       AVAILABILITY
       │              │
       ▼              │
   INVENTORY           │
       │              │
       └──────┬───────┘
              ▼
           ORDER
              │
       ┌──────┴───────┐
       ▼              ▼
    PAYMENT        DELIVERY
       │              │
       ▼              ▼
    REFUND         LOCATION
                      │
                      ▼
                   DELIVERY
                      │
                      ▼
                  COMPLETED
```

---

# 52. Critical Business Invariants

The following invariants must always hold.

## Order

```text
Every order has exactly one customer.
Every order has exactly one vendor.
Every active order has a valid lifecycle state.
A delivered order cannot return to an active state.
```

## Delivery

```text
A delivery belongs to exactly one order.
A delivery can have at most one active driver assignment.
Only an assigned driver can perform driver delivery actions.
A delivered delivery cannot return to transit.
```

## Payment

```text
A payment belongs to an order.
Payment success must be verified by trusted backend/provider data.
A payment cannot be refunded beyond the refundable amount.
```

## Inventory

```text
Available inventory cannot become negative.
Reservations cannot exceed available stock.
Inventory changes must be atomic.
```

## Vendor

```text
Only active vendors can receive new operational orders.
Vendor products must belong to that vendor.
```

## Driver

```text
Only approved active drivers can receive assignments.
A driver cannot accept incompatible simultaneous deliveries.
```

---

# 53. State Machine Rules for AI Development

AI coding agents must follow these rules:

1. Never invent a new state without updating `state-machines.md`.
2. Never allow arbitrary client-driven state mutation.
3. Never bypass transition validation.
4. Never skip authorization before transition validation.
5. Never use UI state as authoritative business state.
6. Never treat WebSocket events as the source of truth.
7. Never create duplicate states for simple failure reasons.
8. Store failure reasons separately where appropriate.
9. Use database transactions for multi-resource transitions.
10. Make retryable operations idempotent.
11. Record important transition history.
12. Keep independent state machines independent.
13. Do not couple payment state directly to order state without explicit business rules.
14. Do not couple notification failure to business transaction failure.
15. Do not allow terminal states to silently reopen.
16. Validate concurrency-sensitive transitions.
17. Use UTC for authoritative timestamps.
18. Keep state names consistent across frontend, backend, database, and API contracts.
19. Add tests for every valid and invalid transition.
20. Update this document whenever lifecycle behavior changes.

---

# 54. Recommended State Machine Ownership

| State Machine         | Primary Authority          |
| --------------------- | -------------------------- |
| User Account          | Backend/Admin              |
| Vendor                | Backend/Admin              |
| Driver                | Backend/Admin              |
| Driver Availability   | Driver + Backend           |
| Product               | Vendor + Backend           |
| Inventory             | Backend                    |
| Inventory Reservation | Backend                    |
| Order                 | Backend + authorized actor |
| Payment               | Payment Backend/Webhook    |
| Refund                | Backend/Payment Provider   |
| Delivery              | Backend + assigned Driver  |
| Notification          | Notification Service       |

---

# 55. Final Architecture Principle

The platform should follow:

```text
                CLIENT
                  │
                  │ Request Action
                  ▼
           ┌───────────────┐
           │  AUTHENTICATE │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ AUTHORIZE     │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ LOAD RESOURCE │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ STATE GUARD   │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ BUSINESS      │
           │ VALIDATION    │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ DB TRANSACTION│
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ NEW STATE     │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ DOMAIN EVENT  │
           └───────┬───────┘
                   ▼
           ┌───────────────┐
           │ SIDE EFFECTS  │
           └───────────────┘
```

The fundamental rule is:

```text
Clients request actions.
Backend validates actions.
State machines determine valid transitions.
Database stores authoritative state.
Events communicate changes.
Side effects happen after state is safely persisted.
```

This keeps the Admin Web, Customer Mobile, Vendor Mobile, and Driver Mobile applications synchronized around one authoritative backend state model.

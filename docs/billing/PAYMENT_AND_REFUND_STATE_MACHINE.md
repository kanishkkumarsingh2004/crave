# CRAVE Billing Engine 2.0 — Payment & Refund State Machine

---

## 1. Payment State Machine

Payment states are decoupled from order fulfillment states:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Order Created
    PENDING --> AWAITING_VERIFICATION: UTR / Payment Submitted
    AWAITING_VERIFICATION --> VERIFIED: Admin Approved
    AWAITING_VERIFICATION --> REJECTED: UTR Invalid / Not Found
    VERIFIED --> PARTIALLY_REFUNDED: Partial Refund Approved
    VERIFIED --> REFUNDED: Full Refund Approved
    REJECTED --> PENDING: Re-submitted with valid UTR
```

**Canonical Order States** (single source of truth in Prisma & `lib/order-state-machine.ts`):

- **Payment Phase**: `payment_pending` → `payment_submitted` → `payment_verified`
- **Fulfillment Phase**: `sent_to_vendor` → `preparing` → `packing` → `ready_for_pickup` → `rider_assigned` → `picked_up` → `out_for_delivery` → `delivered` → `completed`
- **Terminal**: `cancelled`

**App Flow States** (UI mapping): `PENDING` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED`

See `lib/order-state-machine.ts` for:

- Explicit `ORDER_TO_APP_FLOW_MAP` and `ORDER_TO_PAYMENT_MAP`
- `VALID_TRANSITIONS` with enforced state machine
- `isValidTransition()`, `getAppFlowStatus()`, `getPaymentStatus()`, `getPhaseName()`

---

## 2. Order Fulfillment State Machine

Order status progresses independently through fulfillment checkpoints:

```
payment_pending ➔ payment_submitted ➔ payment_verified ➔ sent_to_vendor ➔ preparing ➔ packing ➔ ready_for_pickup ➔ rider_assigned ➔ picked_up ➔ out_for_delivery ➔ delivered ➔ completed
```

**Transition Rules** (enforced in `lib/order-state-machine.ts`):

- Each state has explicit `VALID_TRANSITIONS` array
- `CANCELLED` is allowed from any payment/fulfillment state
- `COMPLETED` is terminal, only reachable from `DELIVERED`

---

## 3. Cancellation & Refund Matrix

| Cancellation Trigger  | Stage                           | Customer Refund          | Vendor Payout      | Rider Compensation |
| :-------------------- | :------------------------------ | :----------------------- | :----------------- | :----------------- |
| **Customer Cancels**  | Before Payment Verification     | **100% Refund**          | ₹0                 | ₹0                 |
| **Customer Cancels**  | After Vendor Acceptance         | **50% Cancellation Fee** | 50% Food Subtotal  | ₹0                 |
| **Vendor Rejection**  | Kitchen Busy / Out of Stock     | **100% Refund**          | ₹0                 | ₹0                 |
| **Rider Unavailable** | Dispatch Timeout (>15 min)      | **100% Refund**          | 100% Food Subtotal | ₹0                 |
| **Delivery Failure**  | Customer Unreachable at Address | **0% Refund**            | 100% Food Subtotal | 100% Rider Payout  |

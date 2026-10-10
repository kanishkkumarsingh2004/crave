# CRAVE — Financial Integrity & Payment Systems Architecture

**Date:** October 2026  
**Auditor:** Principal Payment-Systems Engineer & Database Architect  
**Classification:** Internal Financial Architecture & Engineering  
**Scope:** Order Pricing, Payment Verifications, UTR Idempotency, Transaction Boundaries, Subledger Accounting, and Settlement Reconciliation

---

## 1. Executive Summary

Crave operates a multi-sided marketplace connecting customers, restaurant/grocery vendors, and delivery partners. Financial correctness demands strict determinism: client-side price tampering must be rejected, duplicate payment verification must be impossible, transaction state transitions must be atomic, and settlements must reconcile against an immutable double-entry subledger.

This document formalizes the complete financial lifecycle, the mathematical pricing canonical engine, transaction consistency boundaries, and provider limitations.

---

## 2. Order Pricing Canonical Lifecycle

```
[ Client Checkout Cart ]
       │
       ▼ (Items, Delivery Address, Coupon)
[ POST /api/orders ]
       │
       ├─► 1. Load MenuItem records directly from database (Never trust client item prices)
       ├─► 2. Compute Haversine distance between Store (store_lat, store_lng) and Dropoff
       ├─► 3. Calculate distance-tiered delivery fee via `calculateDeliveryFee(distanceKm)`
       ├─► 4. Apply platform packaging fee, taxes, and coupon deductions via `lib/billing/calculator.ts`
       ├─► 5. Snap immutable breakdown into Order table (`items_total`, `delivery_fee`, `total_amount`)
       ▼
[ Atomic Transaction: Order Created with status: 'PENDING' ]
```

### 2.1 Pricing Rules & Mathematical Determinism

- **Item Total:** Calculated strictly from database unit prices:
  $$\text{ItemsTotal} = \sum_{i=1}^{n} (\text{db\_price}_i \times \text{quantity}_i)$$
- **Delivery Fee:** Distance-tiered model:
  - Base Fee: ₹25 for first 2.0 km.
  - Incremental Distance: ₹10 / km thereafter.
  - Late-night surge / peak rain surcharge: Dynamically appended based on config.
- **Taxes & Surcharges:** 5% standard GST applied to restaurant food items; platform service fee ₹5.
- **Client Invariant:** Any discrepancy between the client-estimated total and the canonical server calculation results in strict server-side recalculation and persistence of the server-derived total. The client can never override unit prices or fees.

---

## 3. Payment Lifecycle & UTR Processing

Crave supports both Direct Gateway integration and UPI UTR (Unique Transaction Reference) manual verification.

```
       [ Order Created (Status: PENDING) ]
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
  [ Direct Gateway ]     [ UPI / UTR Workflow ]
         │                       │
  [ Webhook Handler ]    [ POST /api/payment/verify-utr ]
         │                       │
         │                ├─ Check UTR Format (12 alphanumeric)
         │                ├─ Verify UTR Uniqueness in PaymentAttempt
         │                ├─ Review Queue / Automated Verification
         │                       │
         └───────────┬───────────┘
                     ▼
  [ Database Transaction: `prisma.$transaction` ]
    1. Mark PaymentAttempt as SUCCESS (or UNDER_REVIEW)
    2. Transition Order: PENDING -> PAID / ACCEPTED
    3. Generate Immutable Subledger Entries
    4. Broadcast Real-Time Payment Event
```

### 3.1 Concurrency & Idempotency Guarantees

- **UTR Uniqueness:** The `PaymentAttempt` and `PaymentReview` tables enforce a uniqueness constraint on `utr_number`. Re-submitting the same UTR for different orders fails with HTTP 409 Conflict.
- **Concurrent Verification Protection:** When a payment verification request arrives, it executes within an atomic database transaction. If two parallel requests race to verify the same order, only the first can transition `Order.status` from `PENDING` to `PAID`. Subsequent requests fail closed.
- **State Transition Machine:**
  $$\text{PENDING} \longrightarrow \text{PAID} \longrightarrow \text{PREPARING} \longrightarrow \text{PICKED\_UP} \longrightarrow \text{DELIVERED}$$
  Terminal states (`CANCELLED`, `REFUNDED`, `DELIVERED`) are strictly protected. Once an order is `CANCELLED`, payment confirmation transitions are rejected.

---

## 4. Subledger & Settlement Reconciliation

To ensure driver earnings and merchant payouts can be reconciled down to the rupee, the commercial engine implements an auditable ledger:

### 4.1 Financial Ledger Accounts

1. **Customer Receivable:** Cash or UPI received from customer.
2. **Vendor Payable:** Order items subtotal minus Crave platform commission (e.g., 15%).
3. **Driver Payable:** Delivery fee + tips minus platform fleet levy.
4. **Platform Revenue:** Platform commission + platform fee + tax withheld.

### 4.2 Settlement Math Invariant

For every settled order $k$:
$$\text{TotalPaid}_k = \text{VendorPayable}_k + \text{DriverPayable}_k + \text{PlatformRevenue}_k$$

Any rounding adjustments are allocated directly to Platform Revenue to guarantee zero reconciliation drift.

---

## 5. Remaining Payment-Provider Limitations

1. **Manual UTR Banking Integration:**
   - _Limitation:_ Crave's UPI UTR workflow accepts user-entered 12-digit reference numbers. Without direct banking NPCI/BBPS API integration or webhook feeds from ICICI/HDFC/Razorpay, a UTR indicates _intent to pay_ rather than bank-confirmed settlement.
   - _Production Guardrail:_ High-value orders (> ₹1000) or suspicious accounts must enter the `UNDER_REVIEW` state, requiring admin confirmation (`/api/admin/payment-reviews`) before kitchen dispatch.
2. **Automated Refund Webhooks:**
   - _Limitation:_ Automated reversals rely on provider API secrets. When mocked or operated offline, refunds require manual reconciliation via the admin settlement interface (`/api/admin/settlements`).

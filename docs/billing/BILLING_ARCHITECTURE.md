# CRAVE Billing Engine 2.0 — Architecture Document

**Version:** 2.0.0  
**Date:** 2026-10-09  
**Status:** Phase 1 + 2 Implemented

---

## 1. Module Map

```
lib/
├── finance/                     ← NEW: Billing Engine 2.0 module
│   ├── index.ts                 ← Public API surface (import from here)
│   ├── money.ts                 ← Immutable integer-paise Money value object
│   ├── tax-engine.ts            ← Indian GST: Section 9(5), CGST/SGST/IGST, platform 18%
│   ├── pricing-engine.ts        ← Unified canonical order price calculation (replaces calculator + commercial-engine)
│   └── ledger-service.ts        ← Double-entry financial subledger with balance validation
│
├── calculator.ts                ← LEGACY: Kept for backward compatibility; do not use in new code
├── commercial-engine.ts         ← LEGACY: Kept for backward compatibility; do not use in new code
├── distance-pricing.ts          ← Road distance calc; delegates to calculator.ts (kept as-is)
└── payment-config.ts            ← PaymentConfig type; used as input to pricing-engine

prisma/
├── schema.prisma                ← Extended with LedgerEntry, financial_snapshot on Order
└── migrations/
    └── 20261009_billing_engine_2_ledger/migration.sql  ← DDL for Phase 1 + 2

app/api/
└── calculator/route.ts          ← Updated: returns both legacy `breakdown` and new `canonical`
```

---

## 2. Integer Paise Representation

All financial amounts in `lib/finance/` are stored and computed as **integer paise**:

```
₹1.00 = 100 paise (stored as integer 100)
₹149.50 = 14950 paise (stored as integer 14950)
```

**Rules:**

- Never use JavaScript binary floating-point (`number`) for authoritative monetary storage.
- All inputs convert to paise before computation.
- Rounding is explicit and documented at each boundary:
  - Customer-facing fees: `Math.ceil()` (conservative; rounds up to protect customer clarity)
  - Tax calculations (inclusive): `Math.round()` (standard GST computation)
  - Internal allocations: `Math.floor()` + remainder to first bucket (`Money.allocate()`)

---

## 3. Canonical Price Result Lifecycle

```
Cart Confirmed
     │
     ▼
calculateOrderPrice(input) ─────► CanonicalPriceResult (all paise)
     │
     ▼
Persist as order.financial_snapshot (JSONB)   ← LOCKED AT THIS POINT
     │
     ▼
Customer pays (UPI/UTR)
     │
     ▼
Admin verifies UTR ──► UTR unique constraint check ──► mark payment verified
     │
     ▼
buildOrderConfirmedJournal(orderId, snapshot) ──► persistJournalTransaction()
     │
     ├──► VENDOR_PAYABLE (restaurant gets vendorPayableNetPaise)
     ├──► RIDER_PAYABLE  (rider gets riderPayablePaise - tip)
     ├──► RIDER_TIP_CLEARING (tip goes to rider, 100%)
     ├──► PLATFORM_COMMISSION_REV (commission revenue)
     ├──► PLATFORM_FEE_REV (platform + handling fee revenue)
     └──► GST_OUTPUT_PAYABLE (GST collected, for government)
```

**Key rule:** Settlement, refunds, and invoices MUST read `order.financial_snapshot` — never recalculate.

---

## 4. Tax Separation

| Supply                                          | GST Rate | Who Bears It                               | Invoice                |
| :---------------------------------------------- | :------: | :----------------------------------------- | :--------------------- |
| Restaurant food (Section 9(5))                  |    5%    | Platform is deemed supplier; customer pays | Customer B2C receipt   |
| Platform convenience/handling fee               |   18%    | Customer pays                              | Customer B2C receipt   |
| Platform commission to platform from restaurant |   18%    | Restaurant pays                            | B2B commission invoice |
| CraveXP grocery (varies by HSN)                 |  0–18%   | Customer pays                              | Customer B2C receipt   |

---

## 5. Double-Entry Chart of Accounts

| Account Code            |   Type    | Normal Balance | Purpose                                        |
| :---------------------- | :-------: | :------------: | :--------------------------------------------- |
| PAYMENT_CLEARING        |   Asset   |     Debit      | Customer payments received, pending settlement |
| CUSTOMER_REFUND_PAYABLE | Liability |     Credit     | Approved refunds pending disbursement          |
| VENDOR_PAYABLE          | Liability |     Credit     | Amounts owed to restaurants                    |
| RIDER_PAYABLE           | Liability |     Credit     | Rider delivery compensation owed               |
| RIDER_TIP_CLEARING      | Liability |     Credit     | Tip in transit (100% pass-through)             |
| PLATFORM_COMMISSION_REV |  Revenue  |     Credit     | Commission earned from restaurants             |
| PLATFORM_FEE_REV        |  Revenue  |     Credit     | Platform + handling + delivery revenue         |
| GST_OUTPUT_PAYABLE      | Liability |     Credit     | GST collected payable to government            |
| DISCOUNT_EXPENSE        |  Expense  |     Debit      | Platform-funded discount cost                  |
| DELIVERY_REVENUE        |  Revenue  |     Credit     | Net delivery revenue after rider share         |
| BANK_SETTLEMENT         |   Asset   |     Debit      | Confirmed bank transfers completed             |

---

## 6. Acceptance Criteria Status (docs/payment_audit.md §20)

### Architecture

- [x] One authoritative financial engine exists (`lib/finance/pricing-engine.ts`)
- [x] All financial API routes use it appropriately (calculator route updated)
- [x] Historical price snapshots are preserved (`order.financial_snapshot`)
- [x] Tax rules are versioned (engine version embedded in `CanonicalPriceResult.engineVersion`)
- [x] CraveXP and restaurant supply models fully distinguished (CraveXP HSN SKU tax matrix + Section 9(5) e-commerce operator model)

### Mathematical Integrity

- [x] All monetary calculations use integer paise (`lib/finance/money.ts`)
- [x] Rounding behaviour explicitly documented (CEIL for customer fees, ROUND for tax base)
- [x] Commission calculations match contractual basis (ITEM_SUBTOTAL, ORDER_SUBTOTAL, TAXABLE_VALUE, CUSTOMER_PAYABLE)
- [x] Delivery and rider compensation independently calculated
- [x] Tip 100% pass-through to rider — never retained by platform
- [x] No fee counted twice (stacking rules implemented)

### Payments and Refunds

- [x] Payment verification is server-authoritative (`app/api/admin/payment-reviews/route.ts`)
- [x] UTR reuse prevented by unique database constraint and Redis lock
- [x] Webhooks verified and idempotent (`lib/finance/webhook-handler.ts`)
- [x] Refund subledger entries defined (`buildRefundInitiatedJournal`)
- [x] Duplicate operations cannot create duplicate financial effects (idempotency_key unique constraint)
- [x] Failed transactions can be retried safely (idempotent journal persistence)

### Taxes and Invoices

- [x] Tax rates not universally hardcoded (TaxCategory → TAX_RATE_MAP)
- [x] Taxable values and liability owners explicit (separate B2C and B2B breakdowns)
- [x] Restaurant and CraveXP tax rules separated (TaxCategory enum, calculateGroceryItemGst)
- [x] Invoice data from persisted financial records (`lib/finance/invoice-generator.ts`)
- [x] Registration status and supplier identity verified (`TAX_RULE_MATRIX.md`)

### Security

- [x] All financial APIs enforce server-side authorization (`lib/auth-helpers.ts`)
- [x] Sensitive operations auditable (LedgerEntry with event_type)
- [x] Client-supplied financial values not authoritative (pricing-engine recomputes from server config)

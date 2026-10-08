# Commercial, Tax & Pricing Engine

## 1. Purpose

The Commercial Engine manages all financial rules applied to restaurants, menu items, orders, customers, platform revenue, restaurant settlements, commissions, markups, discounts, fees, taxes, refunds, and adjustments.

The engine must support:

- Percentage-based commission
- Fixed commission
- Hybrid commission
- Percentage markup
- Fixed markup
- Hybrid markup
- Category-specific rules
- Item-specific rules
- Slab-based rules
- Restaurant-specific rules
- Customer fees
- Restaurant fees
- Platform fees
- Delivery charges
- Packaging charges
- Discounts
- Restaurant-funded discounts
- Platform-funded discounts
- Shared discounts
- Taxable and non-taxable components
- GST configuration
- CGST/SGST
- IGST
- Tax-inclusive pricing
- Tax-exclusive pricing
- Refunds
- Partial refunds
- Order cancellations
- Commission reversals
- Settlement deductions
- Settlement adjustments
- Effective-dated commercial contracts
- Immutable order price snapshots
- Full audit history

The Commercial Engine must remain independent from the UI layer and should be callable from order, checkout, payment, refund, and settlement workflows.

---

# 2. Core Principle

The system must distinguish between:

1. Restaurant selling price
2. Customer-facing price
3. Platform markup
4. Commission
5. Platform fees
6. Delivery charges
7. Packaging charges
8. Discounts
9. Taxes
10. Payment processing charges
11. Restaurant payable amount
12. Platform revenue
13. Settlement adjustments

These values must never be collapsed into a single `amount` field.

---

# 3. High-Level Architecture

```text
Restaurant
    │
    ▼
Commercial Contract
    │
    ├── Commission Rules
    ├── Markup Rules
    ├── Fee Rules
    ├── Discount Rules
    ├── Tax Rules
    └── Settlement Rules
    │
    ▼
Pricing Engine
    │
    ├── Resolve Rules
    ├── Calculate Item Prices
    ├── Calculate Markup
    ├── Calculate Discounts
    ├── Calculate Fees
    ├── Calculate Taxes
    ├── Calculate Commission
    └── Calculate Payables
    │
    ▼
Price Snapshot
    │
    ├── Customer Payable
    ├── Restaurant Payable
    └── Platform Financial Breakdown
    │
    ▼
Settlement Engine
```

---

# 4. Commercial Contract

Every restaurant must have a commercial contract.

A commercial contract defines the financial relationship between the restaurant and the platform.

## Contract fields

```text
CommercialContract
├── id
├── restaurantId
├── contractNumber
├── status
├── effectiveFrom
├── effectiveUntil
├── currency
├── createdBy
├── approvedBy
├── createdAt
└── updatedAt
```

## Contract statuses

```text
DRAFT
PENDING_APPROVAL
ACTIVE
SUSPENDED
EXPIRED
TERMINATED
```

Only `ACTIVE` contracts can be used for new orders.

---

# 5. Contract Versioning

Commercial contracts must be versioned.

Example:

```text
Contract V1
Commission = 20%
Effective = 2026-01-01 → 2026-03-31

Contract V2
Commission = 18%
Effective = 2026-04-01 → NULL
```

Historical orders must continue using the rules that were active when the order was created.

Never recalculate historical orders using the current contract.

---

# 6. Commission Engine

Commission represents the platform's commercial charge against the restaurant.

## Supported commission models

### Percentage

```text
commission = taxableBase × percentage / 100
```

Example:

```text
Order subtotal = ₹1,000
Commission = 20%

Commission = ₹200
```

### Fixed

```text
commission = fixedAmount
```

Example:

```text
Commission = ₹50/order
```

### Hybrid

```text
commission = (base × percentage / 100) + fixedAmount
```

Example:

```text
10% + ₹20
```

---

# 7. Commission Basis

Commission must explicitly define its calculation basis.

Supported values:

```text
ITEM_SUBTOTAL
ORDER_SUBTOTAL
ORDER_TOTAL
TAXABLE_VALUE
CUSTOMER_PAYABLE
CUSTOM_DEFINED
```

Do not assume that commission is always calculated against the customer-facing total.

The commercial contract determines the basis.

---

# 8. Commission Payer

Normally:

```text
RESTAURANT
```

The engine must support future configurations where another party is responsible.

Supported:

```text
RESTAURANT
CUSTOMER
PLATFORM
SHARED
```

---

# 9. Category-Level Commission

A restaurant may have different commission rates by category.

Example:

```text
Food       → 20%
Beverages  → 15%
Desserts   → 18%
```

Rule resolution:

```text
Item Rule
    ↓
Category Rule
    ↓
Restaurant Rule
    ↓
Global Default
```

More specific rules override less specific rules.

---

# 10. Item-Level Commission

Individual menu items may override category and restaurant-level commission rules.

Example:

```text
Restaurant Default = 20%

Pizza Category = 18%

Premium Pizza Item = 15%
```

Final commission:

```text
15%
```

---

# 11. Slab Commission

The system must support value-based slabs.

Example:

```text
₹0 – ₹500       → 10%
₹501 – ₹1,000   → 15%
₹1,001+         → 20%
```

The slab calculation must be deterministic and stored in the order price snapshot.

---

# 12. Markup Engine

Markup represents an additional amount applied to the restaurant/menu price for the customer-facing price.

Supported models:

```text
PERCENTAGE
FIXED
HYBRID
SLAB
CATEGORY
ITEM
```

Example:

```text
Restaurant price = ₹500
Markup = 10%

Markup = ₹50
Customer item price = ₹550
```

---

# 13. Markup Tax Classification

Markup must not automatically be treated as GST-taxable or non-taxable.

The markup rule must reference a tax configuration.

```text
MarkupRule
├── calculationType
├── value
├── basis
├── taxRuleId
├── effectiveFrom
└── effectiveUntil
```

The legal/tax classification must be configurable and reviewed according to the platform's actual business model.

---

# 14. Fee Engine

Every fee must be independently configurable.

Supported fees:

```text
PLATFORM_FEE
CONVENIENCE_FEE
PACKAGING_FEE
DELIVERY_FEE
HANDLING_FEE
SMALL_ORDER_FEE
SURGE_FEE
PAYMENT_PROCESSING_FEE
OTHER
```

Each fee must contain:

```text
feeType
calculationType
amount
payer
taxRuleId
effectiveFrom
effectiveUntil
```

---

# 15. Fee Calculation

Supported calculation methods:

```text
FIXED
PERCENTAGE
HYBRID
SLAB
```

Example:

```text
Platform Fee = ₹10
Packaging Fee = ₹20
Delivery Fee = ₹40
```

The fees must remain separate in the price breakdown.

---

# 16. Fee Payer

Each fee must specify who pays it.

```text
CUSTOMER
RESTAURANT
PLATFORM
SHARED
```

Example:

```text
Platform Fee
Payer = CUSTOMER

Commission
Payer = RESTAURANT
```

---

# 17. Discount Engine

Discounts must be represented separately from commissions and markups.

Supported discount types:

```text
RESTAURANT_DISCOUNT
PLATFORM_DISCOUNT
SHARED_DISCOUNT
COUPON
BANK_OFFER
MEMBERSHIP_DISCOUNT
PROMOTIONAL_DISCOUNT
```

Each discount must define its funding source.

```text
RESTAURANT
PLATFORM
BANK
SHARED
THIRD_PARTY
```

---

# 18. Discount Allocation

Example:

```text
Order Value = ₹1,000
Discount = ₹100

Restaurant Contribution = ₹60
Platform Contribution = ₹40
```

Store:

```text
grossDiscount = 100
restaurantDiscount = 60
platformDiscount = 40
```

Never store only:

```text
discount = 100
```

because settlement reconciliation requires the funding breakdown.

---

# 19. Tax Engine

The tax engine must be independent from the commission engine.

It must support:

```text
GST
CGST
SGST
IGST
EXEMPT
ZERO_RATED
OUT_OF_SCOPE
NOT_APPLICABLE
```

Tax applicability must be configurable per financial component.

---

# 20. GST Registration Status

Restaurant tax profiles should support:

```text
REGISTERED
UNREGISTERED
COMPOSITION
EXEMPT
OTHER
```

Tax registration information:

```text
GSTIN
Legal Name
Registration State
Registration Date
Verification Status
Verification Timestamp
```

The system must not infer tax liability solely from whether a GSTIN exists.

---

# 21. Tax Rule

Tax rules must be versioned and effective-dated.

```text
TaxRule
├── id
├── name
├── taxType
├── rate
├── applicability
├── effectiveFrom
├── effectiveUntil
├── jurisdiction
└── status
```

Example:

```text
Tax Type = GST
Rate = configured rate
Effective From = 2026-01-01
```

Historical transactions must retain the tax rule used at transaction time.

---

# 22. Tax Applicability

Every chargeable component must be able to specify:

```text
TAXABLE
EXEMPT
ZERO_RATED
OUT_OF_SCOPE
NOT_APPLICABLE
```

Examples:

```text
Food Item → Taxable / configured treatment
Platform Service → Taxable according to applicable rule
Discount → Tax treatment determined by applicable rule
Refund → Tax reversal/adjustment
```

The system must not globally assume that all fees or markups have the same GST treatment.

---

# 23. Tax-Inclusive Pricing

The system must support:

```text
TAX_INCLUSIVE
```

Example:

```text
Displayed Price = ₹105
GST Rate = 5%
```

The taxable base must be derived from the tax-inclusive amount.

Do not calculate:

```text
₹105 × 5%
```

as the GST component when ₹105 already includes GST.

---

# 24. Tax-Exclusive Pricing

Example:

```text
Base Price = ₹100
GST = ₹5

Customer Price = ₹105
```

Configuration:

```text
priceTaxMode = TAX_EXCLUSIVE
```

---

# 25. CGST / SGST / IGST

The tax engine must resolve the applicable tax mode from the transaction's tax context.

Required data:

```text
supplierState
customerState
placeOfSupply
transactionType
```

Possible tax modes:

```text
CGST_SGST
IGST
EXEMPT
ZERO_RATED
OTHER
```

Do not determine GST treatment using customer location alone.

---

# 26. Restaurant Item Tax Configuration

Every menu item should support:

```text
taxCategory
hsnSacCode
taxRuleId
priceTaxMode
```

Example:

```text
MenuItem
├── name
├── price
├── taxCategory
├── hsnSacCode
├── taxRuleId
└── priceTaxMode
```

---

# 27. Delivery Tax Configuration

Delivery must specify its provider.

```text
PLATFORM
RESTAURANT
THIRD_PARTY
```

And:

```text
deliveryAmount
payer
taxRuleId
```

The tax treatment must be determined from the applicable supply/service structure rather than universally hard-coded.

---

# 28. Platform Commission Tax

Commission and other platform service charges must have their own tax calculation.

Example:

```text
Restaurant Commission = ₹200

Tax on Platform Service = ₹36

Restaurant Deduction = ₹236
```

Store separately:

```text
commissionAmount
commissionTaxableValue
commissionTax
commissionTotal
```

Do not combine restaurant food tax and platform service tax.

---

# 29. Payment Processing Fees

Payment gateway charges must be independently tracked.

```text
paymentProcessingFee
paymentProcessingTax
paymentProcessingPayer
```

Example:

```text
Payment Fee = ₹20
Applicable Tax = configured separately
```

---

# 30. Order Price Calculation

The pricing engine should follow a deterministic process.

```text
1. Load restaurant
2. Load active commercial contract
3. Load applicable menu prices
4. Resolve item rules
5. Calculate base item value
6. Calculate markup
7. Calculate discounts
8. Calculate customer-facing subtotal
9. Calculate fees
10. Resolve tax rules
11. Calculate applicable taxes
12. Calculate customer payable
13. Calculate restaurant commission
14. Calculate commission tax
15. Calculate restaurant deductions
16. Calculate restaurant payable
17. Calculate platform financial breakdown
18. Generate immutable price snapshot
```

---

# 31. Example Calculation

```text
Restaurant Item Value       ₹500
Markup                      ₹50
--------------------------------
Customer Subtotal           ₹550

Platform Fee                ₹10
Packaging                   ₹20
Delivery                    ₹40
--------------------------------
Pre-tax Customer Total      ₹620

Tax                          configured
--------------------------------
Customer Payable             calculated
```

Restaurant side:

```text
Restaurant Base Value       ₹500

Commission 20%              ₹100
Commission Tax               configured
--------------------------------
Restaurant Payable           calculated
```

The exact tax and settlement values must come from the configured tax and commercial rules.

---

# 32. Price Snapshot

Every confirmed order must store an immutable price snapshot.

```text
OrderPriceSnapshot
├── baseAmount
├── markupAmount
├── discountAmount
├── restaurantDiscount
├── platformDiscount
├── taxableAmount
├── taxAmount
├── cgstAmount
├── sgstAmount
├── igstAmount
├── platformFees
├── packagingFees
├── deliveryFees
├── paymentFees
├── commissionAmount
├── commissionTax
├── customerPayable
├── restaurantPayable
└── platformFinancialBreakdown
```

Once an order is confirmed, this snapshot must not be recalculated from current rules.

---

# 33. Financial Breakdown

Every order must expose a structured breakdown.

```json
{
  "baseAmount": 500,
  "markup": 50,
  "discount": 0,
  "customerSubtotal": 550,
  "platformFee": 10,
  "packagingFee": 20,
  "deliveryFee": 40,
  "tax": {
    "cgst": 0,
    "sgst": 0,
    "igst": 0,
    "total": 0
  },
  "customerPayable": 620,
  "commission": 100,
  "commissionTax": 0,
  "restaurantPayable": 400
}
```

The actual values must be generated by the engine.

---

# 34. Refund Engine

Supported refund types:

```text
FULL_REFUND
PARTIAL_REFUND
ITEM_REFUND
DELIVERY_REFUND
FEE_REFUND
TAX_REFUND
COMMISSION_REVERSAL
```

Refund calculations must reference the original order snapshot.

Never calculate refunds from the current commercial contract.

---

# 35. Refund Allocation

A refund must identify:

```text
customerRefund
restaurantAdjustment
platformAdjustment
taxReversal
commissionReversal
feeReversal
```

Example:

```text
Original Order = ₹1,000
Refund = ₹300

Customer Refund = ₹300

Tax Reversal = calculated
Commission Reversal = calculated
Restaurant Adjustment = calculated
Platform Adjustment = calculated
```

---

# 36. Cancellation Rules

Order cancellation must define the financial consequence.

Possible states:

```text
NO_CHARGE
PARTIAL_CHARGE
FULL_CHARGE
FULL_REFUND
PARTIAL_REFUND
COMMISSION_APPLIED
COMMISSION_REVERSED
```

Cancellation rules must be configurable by order lifecycle state.

Example:

```text
Before Restaurant Acceptance
→ Full refund

After Preparation Started
→ Cancellation rule applies

After Pickup
→ Delivery/cancellation rule applies
```

The exact business rules should be configured rather than embedded in application code.

---

# 37. Settlement Engine

Settlement calculates the amount owed to the restaurant.

Conceptual flow:

```text
Gross Restaurant Value
        │
        ├── Restaurant Discounts
        ├── Commission
        ├── Commission Tax
        ├── Restaurant Fees
        ├── Refund Adjustments
        ├── Cancellation Adjustments
        └── Other Adjustments
        │
        ▼
Net Restaurant Payable
```

---

# 38. Settlement Status

```text
PENDING
CALCULATING
READY
PROCESSING
PAID
FAILED
REVERSED
ON_HOLD
CANCELLED
```

---

# 39. Settlement Cycle

Supported:

```text
DAILY
WEEKLY
BIWEEKLY
MONTHLY
CUSTOM
```

The commercial contract determines the settlement cycle.

---

# 40. Settlement Batch

A settlement batch groups multiple eligible orders.

```text
SettlementBatch
├── id
├── restaurantId
├── periodStart
├── periodEnd
├── grossAmount
├── deductions
├── adjustments
├── taxes
├── netPayable
├── status
├── processedAt
└── paidAt
```

---

# 41. Settlement Reconciliation

The system must be able to reconcile:

```text
Orders
    ↓
Payments
    ↓
Refunds
    ↓
Adjustments
    ↓
Commission
    ↓
Taxes
    ↓
Settlement
```

The final settlement must be traceable back to individual orders.

---

# 42. Audit Log

Every financial configuration change must be audited.

```text
CommercialAuditLog
├── id
├── entityType
├── entityId
├── action
├── oldValue
├── newValue
├── reason
├── performedBy
├── approvedBy
├── timestamp
└── metadata
```

Actions:

```text
CREATE
UPDATE
ACTIVATE
SUSPEND
TERMINATE
OVERRIDE
APPROVE
REJECT
```

---

# 43. Manual Financial Adjustment

Admins may create adjustments.

Types:

```text
CREDIT
DEBIT
COMMISSION_ADJUSTMENT
DISCOUNT_ADJUSTMENT
TAX_ADJUSTMENT
REFUND_ADJUSTMENT
SETTLEMENT_ADJUSTMENT
OTHER
```

Every adjustment requires:

```text
amount
reason
reference
createdBy
createdAt
```

Financially significant adjustments should support an approval workflow.

---

# 44. Rule Priority

Rule resolution should follow:

```text
GLOBAL
    ↓
RESTAURANT
    ↓
CATEGORY
    ↓
ITEM
    ↓
ORDER-SPECIFIC OVERRIDE
```

The most specific valid rule wins.

However, overrides must be permission-controlled and audited.

---

# 45. Effective Dating

Every commercial rule must contain:

```text
effectiveFrom
effectiveUntil
```

Rules must not overlap for the same scope unless explicitly supported.

Example:

```text
20%
2026-01-01 → 2026-03-31

18%
2026-04-01 → NULL
```

Invalid:

```text
20%
2026-01-01 → 2026-06-30

18%
2026-04-01 → NULL
```

because both rules are active during April–June.

---

# 46. Currency and Precision

Default currency:

```text
INR
```

Money must never be represented using floating-point arithmetic.

Use:

```text
Decimal
```

or integer minor units where appropriate.

Recommended:

```text
₹100.50
```

must not become:

```text
100.499999999
```

Define:

```text
currencyPrecision = 2
roundingMode = HALF_UP
```

---

# 47. Rounding

Rounding policy must be explicit.

Supported strategies:

```text
ROUND_PER_LINE
ROUND_PER_COMPONENT
ROUND_AT_INVOICE_TOTAL
```

The selected policy must remain consistent across:

```text
Pricing
Invoice
Payment
Refund
Settlement
```

---

# 48. Financial Idempotency

Pricing and settlement operations must be idempotent.

Examples:

```text
calculateOrderPrice()
createSettlement()
processRefund()
applyAdjustment()
```

Repeated requests must not create duplicate financial records.

Use idempotency keys for external financial operations.

---

# 49. Immutability Rules

After an order becomes financially confirmed:

The following must not be silently modified:

```text
Base Item Price
Markup
Discount
Tax
Commission
Fees
Customer Payable
Restaurant Payable
```

Corrections must create:

```text
Adjustment
Refund
Reversal
Replacement
```

rather than mutating historical financial records.

---

# 50. Admin Commercial Workflow

```text
Create Restaurant
      ↓
Create Commercial Contract
      ↓
Configure Commission
      ↓
Configure Markup
      ↓
Configure Fees
      ↓
Configure Discounts
      ↓
Configure Tax Profile
      ↓
Configure Settlement
      ↓
Preview Example Order
      ↓
Validate
      ↓
Approve
      ↓
Activate
```

---

# 51. Commercial Preview

Before activating a contract, the admin must be able to simulate an order.

Input:

```text
Restaurant
Order Amount
Menu Items
Discount
Customer State
Restaurant State
Delivery Charge
```

Output:

```text
Base Amount
Markup
Discount
Fees
Taxable Value
CGST
SGST
IGST
Customer Payable
Commission
Commission Tax
Restaurant Payable
Platform Financial Breakdown
```

The preview must not create a real order or settlement.

---

# 52. Required Admin Views

## Restaurants

```text
All Restaurants
Pending
Active
Suspended
Terminated
```

## Commercials

```text
Contracts
Commission Rules
Markup Rules
Fee Rules
Discount Rules
Tax Rules
```

## Orders

```text
Orders
Pricing Breakdown
Commission
Markup
Tax
Refunds
Adjustments
```

## Settlements

```text
Pending
Ready
Processing
Paid
Failed
Reversed
```

## Reports

```text
Restaurant Revenue
Platform Revenue
Commission Revenue
Markup Revenue
Fee Revenue
Tax Report
Discount Report
Refund Report
Settlement Report
Reconciliation Report
```

---

# 53. Required Database Entities

At minimum:

```text
Restaurant
CommercialContract
CommissionRule
MarkupRule
FeeRule
DiscountRule
TaxProfile
TaxRule
MenuItemTaxProfile
OrderPriceSnapshot
PriceComponent
OrderAdjustment
Refund
Settlement
SettlementItem
SettlementBatch
CommercialAuditLog
```

---

# 54. Important Enums

```text
CommercialRuleType

COMMISSION
MARKUP
FEE
DISCOUNT
TAX
```

```text
CalculationType

PERCENTAGE
FIXED
HYBRID
SLAB
```

```text
TaxApplicability

TAXABLE
EXEMPT
ZERO_RATED
OUT_OF_SCOPE
NOT_APPLICABLE
```

```text
TaxMode

CGST_SGST
IGST
EXEMPT
ZERO_RATED
OTHER
```

```text
PriceTaxMode

TAX_INCLUSIVE
TAX_EXCLUSIVE
```

```text
PayerType

CUSTOMER
RESTAURANT
PLATFORM
SHARED
THIRD_PARTY
```

```text
SettlementStatus

PENDING
CALCULATING
READY
PROCESSING
PAID
FAILED
REVERSED
ON_HOLD
CANCELLED
```

---

# 55. Security Rules

Only authorized administrators may:

- Create commercial contracts
- Modify commission
- Modify markup
- Modify fees
- Modify tax configuration
- Create financial adjustments
- Approve contracts
- Process settlements
- Reverse settlements

Every financial action must be logged.

No frontend value may be trusted for:

```text
price
commission
markup
tax
discount
fee
settlement
```

The backend must recalculate or validate all financial values.

---

# 56. API Responsibilities

The frontend must never calculate the final financial amount.

Example:

```text
POST /api/admin/restaurants/:id/commercial-contract
```

```text
GET /api/admin/restaurants/:id/commercial-contract
```

```text
POST /api/admin/commercial/preview
```

```text
POST /api/orders/:id/pricing/calculate
```

```text
GET /api/orders/:id/pricing-breakdown
```

```text
POST /api/orders/:id/refund
```

```text
GET /api/admin/settlements
```

```text
POST /api/admin/settlements/:id/process
```

```text
GET /api/admin/restaurants/:id/settlements
```

---

# 57. Backend Calculation Rule

The server is the single source of truth.

```text
Client Request
      ↓
Validate Input
      ↓
Load Restaurant
      ↓
Load Active Contract
      ↓
Resolve Rules
      ↓
Calculate
      ↓
Validate
      ↓
Persist Snapshot
      ↓
Return Result
```

Never trust:

```text
customerTotal
restaurantPayable
commission
tax
```

sent from React Native or Next.js.

---

# 58. Testing Requirements

The Commercial Engine must have unit and integration tests for:

### Commission

```text
Percentage
Fixed
Hybrid
Slab
Category
Item
```

### Markup

```text
Percentage
Fixed
Hybrid
```

### Taxes

```text
Taxable
Exempt
Zero-rated
Tax-inclusive
Tax-exclusive
CGST + SGST
IGST
```

### Discounts

```text
Restaurant-funded
Platform-funded
Shared
```

### Orders

```text
Normal
Cancelled
Refunded
Partially refunded
```

### Settlement

```text
Normal settlement
Settlement with refund
Settlement with adjustment
Failed settlement
Reversal
```

### Precision

```text
₹0.01
₹0.99
₹100.50
Large order values
Multiple tax components
```

---

# 59. Financial Invariants

The system must enforce invariants such as:

```text
customerPayable >= 0
restaurantPayable >= 0
taxAmount >= 0
commissionAmount >= 0
refundAmount <= refundableAmount
```

For every confirmed order:

```text
Customer Financial Breakdown
+
Platform Financial Breakdown
+
Restaurant Financial Breakdown
```

must reconcile according to the configured commercial model.

Any unreconciled amount must be treated as an error, not silently ignored.

---

# 60. Example End-to-End Flow

```text
Customer orders food
        ↓
Load Restaurant
        ↓
Load Active Contract
        ↓
Load Menu Items
        ↓
Resolve Item Tax Rules
        ↓
Calculate Base Amount
        ↓
Apply Markup
        ↓
Apply Discount
        ↓
Calculate Fees
        ↓
Calculate Taxes
        ↓
Calculate Customer Payable
        ↓
Calculate Commission
        ↓
Calculate Commission Tax
        ↓
Calculate Restaurant Payable
        ↓
Generate Price Snapshot
        ↓
Payment
        ↓
Order Confirmation
        ↓
Delivery
        ↓
Order Completion
        ↓
Settlement Eligibility
        ↓
Settlement Batch
        ↓
Restaurant Payment
```

---

# 61. Critical Design Rules

1. Never store commission as a single percentage without its basis.
2. Never store tax as a single boolean.
3. Never calculate historical orders using current rules.
4. Never use JavaScript floating-point numbers for financial calculations.
5. Never trust frontend financial calculations.
6. Never silently modify a confirmed financial transaction.
7. Never combine commission, markup, fees and taxes into one amount.
8. Every commercial rule must be effective-dated.
9. Every financial adjustment must be auditable.
10. Every confirmed order must contain an immutable price snapshot.
11. Every refund must reference the original transaction.
12. Every settlement must be traceable to individual orders.
13. Tax treatment must be configurable rather than hard-coded.
14. Rule precedence must be deterministic.
15. Overlapping active rules must be rejected unless explicitly supported.
16. Financial operations must be idempotent.
17. Platform revenue must not automatically be treated as platform profit.
18. Tax configuration must be reviewed against the actual legal/business structure before production use.
19. GST rates and tax treatment must not be assumed permanently; they must be versioned and effective-dated.
20. All financial calculations must be reproducible from persisted transaction data.

---

# 62. Final Architecture Principle

The system should ultimately behave as:

```text
                    ┌─────────────────────┐
                    │     RESTAURANT      │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ COMMERCIAL CONTRACT │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
        COMMISSION           MARKUP             FEES
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │    ORDER ENGINE     │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
         DISCOUNTS            TAXES           DELIVERY
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                    ┌─────────────────────┐
                    │   PRICE SNAPSHOT    │
                    └──────────┬──────────┘
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             CUSTOMER PAYABLE      RESTAURANT PAYABLE
                                          │
                                          ▼
                                ┌──────────────────┐
                                │ SETTLEMENT ENGINE │
                                └──────────────────┘
```

The Commercial Engine is therefore the single source of truth for restaurant pricing, platform charges, tax calculation, customer payable amounts, restaurant settlements, and financial reconciliation.

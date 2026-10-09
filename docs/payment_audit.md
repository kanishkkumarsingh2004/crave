# MASTER IMPLEMENTATION PROMPT — CRAVE BILLING ENGINE 2.0
## Complete Financial Logic, Dynamic Pricing, Tax Compliance, Payments, Settlements & End-to-End System Audit

**Repository:** https://github.com/kanishkkumarsingh2004/crave  
**Branch:** Inspect the current branch and establish the correct working branch before making changes.  
**Product:** CRAVE — restaurant ordering and delivery platform  
**Additional product:** CraveXP — quick-commerce and grocery operations  
**Business context:** CRAVE is the customer-facing platform operated under the relevant Akshaya Ventures business entity, with ApexOne Studio serving as its technology/operating layer as applicable. Verify actual legal supplier identities and registrations before configuring invoices or tax rules.  
**Primary objective:** Audit, correct, test, and document the entire financial system so that all customer charges, restaurant and store payables, rider earnings, platform revenue, taxes, refunds, invoices and settlements are mathematically consistent, secure and auditable.

---

# PART 1 — YOUR ROLE AND MANDATORY WORKING RULES

You are acting as a principal software architect, senior backend engineer, financial-systems engineer, application-security engineer and implementation lead.

Your task is to work directly inside the existing CRAVE repository. Do not merely produce a plan, suggest changes, or create a demonstration calculator. Inspect the implementation, make the necessary changes, run the tests and provide evidence.

## 1.1 Mandatory rules

1. Inspect the existing repository before modifying anything.
2. Identify the framework, package manager, database, ORM, authentication system, payment integrations, application routes and deployment configuration.
3. Read the existing README, documentation, database schema, migrations, API routes, shared libraries and relevant frontend components.
4. Do not assume that documentation accurately describes production behaviour.
5. Trace actual execution paths from customer checkout to payment verification, fulfilment, refunds, invoices, ledger entries and settlements.
6. Preserve existing working functionality unless a change is required for correctness, security or compliance.
7. Do not replace the application with a new project or introduce an unnecessary rewrite.
8. Do not remove features simply because their implementation is incomplete. Document the issue and implement a safe, backward-compatible solution where possible.
9. Do not fabricate successful payment verification, tax compliance, test results or settlement outcomes.
10. Do not use floating-point arithmetic for authoritative monetary calculations.
11. Do not trust financial values supplied by a browser, mobile client, URL query parameter or untrusted integration.
12. Do not make payment, refund or payout operations possible solely by changing an order's status.
13. Do not delete historical financial records to fix an error. Use traceable adjustments and reversals.
14. Never execute destructive production database operations, send real payments, issue real refunds or initiate real settlements without explicit authorization.
15. Never expose production secrets, API keys, bank details, payment credentials or personal data in logs or reports.
16. Do not deploy to production or change live tax settings without authorization.
17. Use current, authoritative documentation for payment-provider APIs and Indian regulatory requirements.
18. Where a legal rule is uncertain, implement a configurable, fail-closed design and document the required professional decision. Do not invent a tax rate or legal exemption.
19. Use deterministic test fixtures. All financial examples must be reproducible.
20. Continue through implementation and verification instead of stopping after the initial audit, unless a missing credential, external service or destructive operation makes further progress unsafe.

## 1.2 Required execution approach

Work in the following order:

**Discovery → Baseline → Findings → Financial specification → Implementation → Migration → Testing → Reconciliation → Security review → Final report**

Before changing code:

- Inspect `git status`.
- Identify the current branch and commit.
- Check for uncommitted changes.
- Record the initial test and build status.
- Create a dedicated working branch if appropriate.
- Do not overwrite existing user changes.
- Inventory all billing-related files and routes.

Maintain a progress document at:

`docs/billing/BILLING_AUDIT_PROGRESS.md`

Update it with completed work, unresolved blockers, test results and decisions.

---

# PART 2 — COMPLETE REPOSITORY AUDIT

Inspect every file involved in financial calculations or financial state transitions.

At minimum, investigate these known paths:

- `lib/calculator.ts`
- `lib/commercial-engine.ts`
- `app/api/calculator/route.ts`
- The existing Prisma schema.
- Order creation and checkout APIs.
- Payment verification and UTR APIs.
- Coupon and promotion logic.
- Restaurant and CraveXP order APIs.
- Rider assignment and delivery-completion APIs.
- Vendor settlement and rider payout APIs.
- Refund and cancellation APIs.
- Invoice generation.
- Admin financial dashboards.
- Vendor and rider wallets.
- Webhook handlers.
- Database migrations.
- Authentication and authorization middleware.
- Background jobs and scheduled tasks.

The paths above are starting points, not a complete inventory. Search the entire repository for financial operations, monetary fields, fee calculations, tax logic, payment states, settlement states, commission calculations and wallet mutations.

Useful search terms include:

`subtotal`, `total`, `amount`, `price`, `tax`, `GST`, `commission`, `deliveryFee`, `surge`, `rain`, `handling`, `packaging`, `discount`, `coupon`, `payout`, `settlement`, `wallet`, `refund`, `UTR`, `payment`, `invoice`, `tip`, `distance`, `rider`, `vendor`.

## 2.1 Produce a dependency map

For every relevant route and function, document:

- File and function name.
- Caller and downstream dependencies.
- Request inputs.
- Database reads.
- Database writes.
- Authorization requirements.
- Financial calculation performed.
- External services invoked.
- Events or background jobs triggered.
- Records created or updated.
- Whether the operation is idempotent.
- Whether the result is persisted or recalculated later.

Build a dependency map that reveals whether checkout, payment, vendor settlement, rider payout and invoice generation use the same authoritative financial rules.

## 2.2 Required audit findings register

Create:

`docs/billing/BILLING_DEFECT_REGISTER.md`

Use this format:

| Field | Required information |
|---|---|
| Finding ID | Unique ID, such as BILL-001 |
| Severity | Critical, High, Medium, Low |
| File and lines | Exact location |
| Current behaviour | What the code actually does |
| Expected behaviour | Approved rule |
| Reproduction | Input and steps |
| Financial impact | Who could be overcharged, underpaid or misreported |
| Root cause | Technical cause |
| Required correction | Specific change |
| Regression test | Test proving the fix |
| Status | Open, In Progress, Fixed, Verified |
| Reviewer | Person responsible for review |

Distinguish confirmed defects from potential vulnerabilities, missing evidence and recommended improvements.

---

# PART 3 — ESTABLISH ONE AUTHORITATIVE FINANCIAL ENGINE

## 3.1 Consolidate the existing engines

The repository currently contains two calculation implementations:

- `lib/calculator.ts`
- `lib/commercial-engine.ts`

Investigate both thoroughly.

Do not simply rename one file or create a third calculation engine.

Design one authoritative financial domain service. Reuse existing architecture where appropriate, but separate the internal responsibilities into well-defined modules.

Recommended logical structure:

- `Money` and currency arithmetic.
- `PricingEngine`.
- `DeliveryPricingEngine`.
- `DiscountEngine`.
- `TaxEngine`.
- `CommissionEngine`.
- `RiderCompensationEngine`.
- `SettlementEngine`.
- `RefundEngine`.
- `InvoiceSnapshotService`.
- `FinancialLedgerService`.
- `ReconciliationService`.

Adapt these names to the repository's existing conventions.

All checkout, order-creation, settlement, refund and invoice workflows must consume the same authoritative financial rules and persisted financial snapshots.

A preview API may calculate indicative prices, but it must not independently authorize payments, settlements or refunds.

## 3.2 Define a canonical pricing result

Create a typed financial result containing at least:

- Currency.
- Order type.
- Merchant or supplier ID.
- Item-level price breakdown.
- Gross merchandise subtotal.
- Item discounts.
- Cart discounts.
- Discount funding allocations.
- Net merchandise value.
- Packaging charge.
- Delivery charge.
- Peak-demand surcharge.
- Rain surcharge.
- Late-night surcharge.
- Small-cart surcharge.
- Long-distance surcharge, if separately used.
- Platform service fee.
- Handling fee.
- Other disclosed fees.
- Taxable base for each applicable tax category.
- Tax breakdown by rate and tax component.
- Tip.
- Customer payable.
- Restaurant or supplier payable.
- Platform commission.
- Commission tax.
- Rider base compensation.
- Rider distance compensation.
- Rider incentives.
- Rider tip entitlement.
- Rider payable.
- Payment-provider charges where known.
- Platform-funded delivery subsidy.
- Platform revenue components.
- Refundable amounts and refund restrictions.
- Pricing-rule version.
- Tax-rule version.
- Contract version.
- Calculation-engine version.

Not every field applies to every order. Use explicit applicability rules rather than treating zero, missing and unknown as interchangeable.

Persist the confirmed result. Invoice generation and settlements must not recalculate historical orders using the current configuration.

## 3.3 Monetary representation

Use integer paise for INR calculations, or an established decimal-money library compatible with the current stack.

For INR:

- ₹1 = 100 paise.
- Store monetary amounts using a clearly defined integer representation.
- Never use binary floating-point as the authoritative monetary representation.
- Avoid implicit JavaScript coercion.
- Validate that all inputs are finite, non-negative where required and within reasonable configured limits.
- Use explicit rounding policies.
- Preserve the required precision for intermediate calculations.
- Document where rounding occurs.

Use ISO currency codes if the architecture may later support additional currencies.

---

# PART 4 — DEFINE THE COMPLETE ORDER PRICE FORMULA

Build a component-based pricing calculation.

Conceptually:

`CustomerPayable = MerchandisePayable + ApplicableFees + ApplicableTaxes + Tip`

Expand this into explicit line items:

`CustomerPayable = NetMerchandiseValue + PackagingCharge + DeliveryCharge + PeakSurcharge + RainSurcharge + LateNightSurcharge + SmallCartSurcharge + LongDistanceCharge + PlatformFee + HandlingFee + OtherDisclosedCharges + ApplicableTaxes + Tip`

This is a logical framework, not permission to add every field to every order.

Rules:

1. Include only applicable charges.
2. Do not double-count a fee under multiple categories.
3. Determine whether each price is tax-inclusive or tax-exclusive.
4. Do not add a tax again if it is already included in the configured price.
5. Exclude tips from unrelated tax and commission bases unless the applicable law and documented supply treatment require otherwise.
6. Exclude customer delivery fees from restaurant merchandise commission unless the signed contract explicitly establishes a different lawful basis.
7. Keep platform revenue, supplier proceeds and tax liabilities separate.
8. Save the exact price breakdown before payment confirmation.
9. Revalidate material price changes before the customer confirms the order.
10. Never increase a confirmed order's price retrospectively without a valid, explicitly authorized customer-consent flow.

Provide an independently testable function for each calculation stage.

---

# PART 5 — DELIVERY PRICING ENGINE

Implement a configurable delivery-pricing system suitable for restaurant delivery and CraveXP.

## 5.1 Required inputs

- Pickup coordinates and address.
- Delivery coordinates and address.
- Approved routing-service distance.
- Estimated travel time, where available.
- Service zone.
- Service type.
- Time of pricing.
- Delivery radius.
- Base fee.
- Included distance.
- Distance-band or per-kilometre rate.
- Applicable zone adjustment.
- Approved minimum and maximum fee.
- Applicable promotional subsidy.
- Relevant operational surcharge eligibility.
- Pricing-rule version.

Use a trusted routing provider when available. Do not calculate road distance from straight-line distance alone.

If the routing service is unavailable, use an explicitly configured safe fallback, such as a fixed approved zone price or rejection of the unsupported route. Do not silently invent a distance.

## 5.2 Initial delivery formula

Let:

- `d` = approved route distance in kilometres.
- `D0` = included distance.
- `B` = base delivery fee.
- `K` = fee per kilometre beyond the included distance.
- `Z` = approved zone adjustment.

Then:

`DeliveryBase = B + max(0, d - D0) × K + Z`

The final delivery-related charge is:

`DeliveryCharges = DeliveryBase + PeakSurcharge + RainSurcharge + LateNightSurcharge + SmallCartSurcharge + ApprovedLongDistanceCharge`

Apply configured caps, exemptions and rounding rules.

If the same distance is already priced using a per-kilometre rate, do not apply a second overlapping long-distance charge without a clearly defined rule.

## 5.3 Configuration example

Use this only as a test fixture:

- Base fee: ₹15.
- Included distance: 1 km.
- Additional distance rate: ₹6/km.
- Route distance: 3 km.
- Zone adjustment: ₹0.
- Other surcharges: ₹0.

Expected result:

`₹15 + max(0, 3 - 1) × ₹6 = ₹27`

Expected delivery charge before other applicable components: ₹27.

These are illustrative development values, not final CRAVE commercial prices.

## 5.4 Delivery pricing administration

Create or adapt a secure configuration interface for authorized administrators.

It must support:

- Service-zone configuration.
- Distance bands.
- Base delivery fees.
- Included distances.
- Per-kilometre rates.
- Zone adjustments.
- Minimum and maximum fees.
- Effective dates.
- Approval status.
- Version history.
- Reason for change.
- Audit trail.

A new configuration must not modify the historical price snapshot of an existing order.

---

# PART 6 — DYNAMIC SURGE PRICING

Implement a controlled peak-demand pricing system.

## 6.1 Initial algorithm

Start with deterministic, explainable rules rather than a black-box machine-learning model.

Potential inputs:

- Active orders awaiting dispatch.
- Available riders.
- Orders per available rider.
- Pickup backlog.
- Median delivery time.
- Local demand by service zone.
- Time window.
- Operational capacity.
- Approved maximum surcharge.

Example:

`DemandRatio = EligibleActiveOrders / max(AvailableRiders, 1)`

Use configurable thresholds:

- Below threshold A: no surge.
- Between thresholds A and B: low surcharge.
- Between thresholds B and C: medium surcharge.
- Above threshold C: capped high surcharge or restricted new orders.

Thresholds and amounts must be configuration values, not unexplained constants scattered throughout the code.

Define the behaviour when no riders are available. Do not interpret a division-by-zero condition as an unlimited surge.

## 6.2 Surge controls

- Calculate by service zone.
- Use a defined pricing timestamp.
- Display the surcharge before confirmation.
- Record the reason and applicable zone.
- Enforce maximum limits.
- Apply approved exemptions.
- Preserve the final charge after confirmation.
- Prevent repeated recalculation from stacking the same surcharge.
- Monitor cancellation rate and fulfilment performance.
- Maintain an audit trail for configuration changes.

Do not use surge pricing to bypass consumer-protection requirements or create undisclosed charges.

---

# PART 7 — RAIN AND LATE-NIGHT PRICING

## 7.1 Rain surcharge

Implement an independent rain-fee rule.

Inputs:

- Approved weather source or authorized operations decision.
- Service zone.
- Weather severity or configured eligibility flag.
- Effective start and end time.
- Surcharge amount.
- Maximum permitted amount.
- Rider incentive allocation, if applicable.

Required behaviour:

1. Confirm that the order's service zone and pricing time qualify.
2. Apply the fee once.
3. Show it as a separate checkout line item.
4. Record its reason, rule version and effective period.
5. Define whether any part funds rider compensation.
6. Do not assume the entire amount is rider earnings.
7. Prevent stale weather conditions from continuing to trigger the fee after expiry.
8. Define a safe fallback when the weather source fails.

## 7.2 Late-night surcharge

Support a configurable time window per service zone.

Use the relevant local timezone and explicit boundary conditions. Define how the rule behaves when checkout occurs before the window but confirmation occurs inside it.

The pricing timestamp and rule must be persisted. Do not recalculate the original fee from the delivery completion time.

## 7.3 Surcharge stacking

Create a formal policy defining which fees may be combined.

For example:

- Delivery distance fee plus peak surcharge: potentially allowed.
- Delivery distance fee plus rain surcharge: potentially allowed.
- Small-cart fee plus platform fee: potentially allowed if independently justified and disclosed.
- Duplicate distance charges for the same distance: prohibited.
- Repeated peak or rain surcharge application: prohibited.

Implement the policy as testable validation logic.

---

# PART 8 — SMALL-CART AND HANDLING FEES

## 8.1 Small-cart fee

Define:

- Minimum eligible basket value.
- Whether eligibility uses pre-discount or post-discount merchandise value.
- Eligible order types.
- Exemptions.
- Fee amount or fee bands.
- Applicable tax classification.
- Effective dates.

Do not count tips, delivery fees or unrelated service charges toward the minimum merchandise value unless an approved policy and applicable law support doing so.

Test values immediately below, exactly at and immediately above the threshold.

## 8.2 Platform fee

Represent the platform fee as an independent charge for the relevant service.

Specify:

- Who supplies the service.
- Who pays the fee.
- Applicable amount or formula.
- Tax treatment.
- Exemptions.
- Refund treatment.
- Invoice treatment.
- Revenue-recognition treatment.

Do not silently change the fee for a confirmed order.

## 8.3 Handling fee

Define the actual commercial purpose of the fee.

Do not use the handling-fee field to disguise a delivery charge, commission or unrelated tax.

Apply the appropriate supplier and tax treatment.

## 8.4 Packaging

Determine whether packaging is supplied by the restaurant, CraveXP or another supplier.

Persist the charge and beneficiary separately.

Packaging must not be:

- Counted twice in the customer total.
- Deducted twice from vendor proceeds.
- Counted as platform revenue without a legitimate entitlement.
- Taxed using a universal assumption without classification.

---

# PART 9 — RIDER COMPENSATION ENGINE

Create a separate rider-compensation engine.

Conceptually:

`RiderPayout = BasePayout + DistancePayout + EligibleIncentives + RiderTip + ApprovedAdjustments`

The customer's delivery charge must not automatically determine the rider's compensation.

Configure:

- Base payout per completed delivery.
- Distance payout.
- Pickup and drop-off distance rules.
- Multi-order delivery allocation.
- Waiting-time compensation.
- Peak incentives.
- Rain incentives.
- Late-night incentives.
- Rider tips.
- Cancellation compensation.
- Failed pickup and delivery handling.
- Approved reimbursements.
- Payout timing.
- Dispute and correction workflow.

For each component, define its eligibility, calculation, beneficiary and settlement status.

### Test fixture

- Base payout: ₹20.
- Eligible distance payout: ₹12.
- Peak incentive: ₹0.
- Rain incentive: ₹0.
- Rider tip: ₹10.

Expected rider payable: ₹42.

The values are illustrative. Do not use them as production rates without operational approval.

Ensure that:

- A tip is not silently retained by the platform.
- An incentive is credited only once.
- A completed delivery cannot be paid twice.
- A cancelled delivery follows its own compensation rule.
- A refund after delivery does not automatically reverse earned rider compensation.
- A failed payout can be retried without duplicating the ledger entry.

---

# PART 10 — TAX ENGINE AND INDIAN REGULATORY CONTROLS

The tax engine must be configurable, versioned and fail closed when an applicable rule cannot be determined.

Do not treat this prompt as a substitute for professional GST advice.

## 10.1 Restaurant services

Restaurant services supplied through an e-commerce operator may fall under the applicable CGST section 9(5) framework.

The ordinary restaurant-service rate is generally 5% without input tax credit, subject to the actual classification, exceptions and current notifications.

Implement:

- Restaurant-service classification.
- Taxable value.
- Applicable rate.
- Tax components.
- Liability owner.
- Tax-reporting category.
- Applicable invoice and credit-note workflow.
- Refund and cancellation adjustments.

Do not record the same restaurant-service tax liability twice.

Official references:

- https://cbic-gst.gov.in/hindi/gst-goods-services-rates.html
- https://taxinformation.cbic.gov.in/content-page/explore-act/1000613/1000001
- https://cbic-gst.gov.in/pdf/Circular-167-17-12-2021-GST.pdf

## 10.2 CraveXP goods

Create item-level tax classifications for CraveXP.

Each SKU should have:

- Supplier identity.
- HSN classification where applicable.
- Applicable tax rate.
- Tax-inclusive or tax-exclusive price setting.
- Effective date.
- Exemption or special treatment, if legally applicable.
- Invoice classification.

Do not automatically apply restaurant-service GST rates to grocery products.

First determine whether CraveXP acts as a direct seller or a marketplace facilitating third-party sales. The accounting, invoicing and tax responsibilities depend on that model.

## 10.3 Delivery services

Delivery services may have specific GST treatment depending on the supply, provider and applicable conditions.

A 5% rate may apply to qualifying delivery services under the relevant framework, but do not apply it universally without confirming the legal category and responsibility for tax.

Reference:

https://www.pib.gov.in/FaqDetails.aspx?ModuleId=4&NoteId=160396&lang=1&reg=3

## 10.4 Platform and handling services

Classify each service according to the actual supply.

A separately supplied platform service may commonly fall under an 18% GST treatment, but this must be confirmed for the specific supply.

Do not apply 18% to the entire order simply because a platform fee exists.

Separate:

- Restaurant-service tax.
- Goods tax.
- Platform-service tax.
- Handling-service tax.
- Delivery-service tax.
- Commission tax.
- Other applicable taxes.

## 10.5 Tax-inclusive and tax-exclusive calculations

For a tax-inclusive amount:

`TaxableBase = InclusivePrice / (1 + Rate)`

`TaxAmount = InclusivePrice - TaxableBase`

For a tax-exclusive amount:

`TaxAmount = TaxableBase × Rate`

Test fixture:

An inclusive price of ₹105 at 5% yields a ₹100 taxable base and ₹5 tax.

An inclusive price of ₹118 at 18% yields a ₹100 taxable base and ₹18 tax.

These are arithmetic examples, not decisions about which tax rate applies to a CRAVE transaction.

## 10.6 Discounts and taxable value

Implement the applicable discount rules according to the nature of the discount and the law.

Persist:

- Original value.
- Discount amount.
- Funding party.
- Discount eligibility.
- Net value.
- Taxable value.
- Tax rate.
- Tax amount.

Do not assume that a platform-funded discount and a supplier-funded discount have identical tax treatment.

## 10.7 Registration and reporting

Before finalizing production tax configuration, obtain professional confirmation of:

- The actual legal entity operating CRAVE.
- GST registration status and obligations.
- Section 9(5) applicability.
- Section 52 tax collection at source, where applicable.
- Tax reporting and reconciliation.
- Input tax credit restrictions.
- Invoice and credit-note obligations.
- Interstate operations.
- CraveXP's direct-sale or marketplace model.

Do not generate a false GSTIN or claim that an unregistered business is GST registered.

Where the business is not registered, configure only the invoicing and tax behaviour permitted by the confirmed legal position.

---

# PART 11 — COMMISSION AND SUPPLIER SETTLEMENT

## 11.1 Commission rules

Support explicit contract-defined commission bases, such as:

- Eligible item subtotal before discount.
- Eligible item subtotal after discount.
- Another approved contractual basis.

The engine must apply the selected basis correctly. It must not expose a configuration option that is ignored by the actual calculation.

Commission rules must identify:

- Merchant.
- Applicable order type.
- Basis.
- Percentage or fixed amount.
- Tax treatment.
- Effective period.
- Approval status.
- Contract version.

Do not calculate commission on customer tips, taxes or delivery fees unless the applicable contract and law explicitly establish that treatment.

## 11.2 Vendor payable

Use a documented formula such as:

`VendorPayable = EligibleSupplierProceeds - ContractualCommission - SupplierFundedDiscounts - ApprovedDeductions + AmountsOwedToSupplier`

Packaging must be allocated to the correct supplier.

The formula must be adapted to the actual contract. Do not assume all merchants use identical commission or packaging rules.

## 11.3 CraveXP settlement distinction

If CraveXP owns and resells its inventory, treat it as a direct-sale business rather than automatically generating a restaurant marketplace commission settlement.

Account for:

- Merchandise sales.
- Discounts.
- Refunds.
- Inventory movements.
- Cost of goods sold.
- Spoilage and write-offs.
- Taxes.
- Delivery costs.
- Payment costs.
- Contribution margin.

If CraveXP instead facilitates third-party sellers, create the corresponding supplier settlement workflow.

---

# PART 12 — CUSTOMER PAYMENTS AND UTR VERIFICATION

Inspect the existing UPI, UTR and payment-provider implementation.

## 12.1 Payment states

Represent payment state independently from fulfilment state.

Examples:

- `PENDING`
- `AWAITING_VERIFICATION`
- `AUTHORIZED`, if supported by the payment provider
- `CAPTURED`
- `FAILED`
- `CANCELLED`
- `PARTIALLY_REFUNDED`
- `REFUNDED`
- `DISPUTED`

Use states that accurately reflect the actual payment method. Do not pretend a manual UTR verification is equivalent to a provider-confirmed payment event.

## 12.2 UTR validation

For manually verified payments:

- Record the submitted UTR.
- Verify the actual payment against the bank or payment account evidence.
- Match order, amount and transaction reference.
- Prevent reuse of the same UTR across orders.
- Record the verifying administrator.
- Record verification time and evidence reference.
- Support rejection and re-submission.
- Reconcile against statements.
- Keep the submitted claim distinct from verified funds.

A payment screenshot alone is not sufficient proof of settled funds.

## 12.3 Idempotency

Every financial operation must support idempotency.

Use appropriate idempotency keys and database uniqueness constraints for:

- Order payment.
- Payment-provider webhook.
- UTR verification.
- Vendor settlement.
- Rider payout.
- Refund.
- Wallet credit.
- Incentive credit.
- Commission posting.
- Ledger posting.

A repeated request must return the existing operation result or a safe conflict. It must not create another financial transaction.

## 12.4 Webhook security

Verify provider webhook signatures using the documented provider implementation.

Do not trust client-submitted payment-success flags.

Handle duplicate and out-of-order webhooks. Persist provider event identifiers. Make processing transactional and retry-safe.

Never log complete credentials or sensitive payment payloads.

---

# PART 13 — ORDER LIFECYCLE, CANCELLATIONS AND REFUNDS

Trace every state transition.

The order workflow must distinguish:

- Created.
- Payment pending.
- Payment verified.
- Vendor accepted.
- Preparing.
- Ready for pickup.
- Rider assigned.
- Picked up.
- Delivered.
- Completed.
- Cancelled.
- Partially refunded.
- Refunded.
- Disputed.

Adapt the names to the existing application.

Do not treat order completion as proof of payment. Do not let a payment-success event automatically create a duplicate order.

## 13.1 Cancellation scenarios

Test:

1. Cancellation before payment.
2. Payment succeeds but order creation or confirmation fails.
3. Cancellation before vendor acceptance.
4. Vendor rejection.
5. Cancellation after preparation starts.
6. Rider unavailable.
7. Rider cancellation.
8. Pickup failure.
9. Delivery failure.
10. Customer unavailable.
11. CraveXP item unavailable.
12. Partial fulfilment.
13. Partial refund.
14. Full refund.
15. Duplicate payment.
16. Refund failure.

For each scenario, determine:

- Customer refund amount.
- Vendor compensation, if any.
- Rider compensation, if any.
- Platform-funded cost.
- Tax adjustment.
- Inventory reversal.
- Invoice or credit-note action.
- Ledger reversals.
- Notification and audit requirements.

Do not apply a single blanket cancellation formula to every case.

## 13.2 Refund safety

Refunds must reference the original payment and relevant original ledger entries.

- Never refund more than the eligible captured amount.
- Prevent duplicate refund execution.
- Track refund initiation, provider confirmation and failure.
- Support partial refunds.
- Reconcile failed or delayed refunds.
- Preserve the original invoice and issue the appropriate adjustment document where required.
- Do not reverse a completed rider payout automatically unless a documented, lawful adjustment rule applies.

---

# PART 14 — FINANCIAL LEDGER AND DATABASE DESIGN

Inspect the existing Prisma schema before proposing migrations.

Where absent, introduce an appropriate financial subledger.

## 14.1 Required ledger information

Each entry should include:

- Unique ledger-entry ID.
- Order ID.
- Event ID.
- Event type.
- Debit account.
- Credit account.
- Amount in integer paise.
- Currency.
- Timestamp.
- Payment or settlement reference.
- Idempotency key.
- Originating service or actor.
- Reversal reference.
- Relevant pricing, tax and contract version.

A double-entry ledger is preferred. Each journal transaction must balance, with explicit rules for accounts and normal balances.

Do not implement a ledger merely as a collection of unrelated wallet balances.

## 14.2 Example accounts

Define the actual chart of accounts with finance review. Possible categories include:

- Payment clearing.
- Bank or settlement account.
- Customer refund payable.
- Restaurant payable.
- CraveXP inventory or cost-of-goods-sold accounts.
- Rider payable.
- Platform service revenue.
- Commission revenue.
- Delivery revenue, where applicable.
- Discount expense.
- Delivery subsidy expense.
- Payment-processing expense.
- Applicable GST payable accounts.
- Refund and adjustment accounts.

Account names and accounting entries must be validated against the actual legal and commercial model.

## 14.3 Transactional integrity

Use database transactions for related financial changes.

Examples:

- Confirm payment and create the corresponding ledger entries atomically.
- Post a completed order's financial events exactly once.
- Create a settlement and mark its allocation records consistently.
- Record refund initiation and the associated financial reservation.
- Prevent concurrent requests from creating duplicate credits.

Use appropriate isolation, locking, optimistic concurrency controls and unique constraints.

Never use a frontend-only check to prevent duplicate financial operations.

## 14.4 Migrations

- Preserve existing records.
- Add nullable or safely defaulted fields before enforcing new constraints where appropriate.
- Backfill existing orders only where reliable source data exists.
- Do not invent historical tax or payout values.
- Reconcile migrated balances.
- Provide rollback and recovery instructions.
- Test migrations on a copy of the existing schema.
- Never run destructive migrations against production without explicit approval.

---

# PART 15 — INVOICES AND FINANCIAL REPORTS

All documents must be generated from persisted financial records.

## 15.1 Customer invoice or receipt

Include the legally required information for the actual supplier and transaction, as applicable:

- Correct legal supplier identity.
- Appropriate registration details.
- Invoice number and date.
- Order reference.
- Description and quantity.
- Applicable price and discount.
- Taxable value and applicable taxes.
- Separately disclosed service charges.
- Final payable.
- Payment status.
- Applicable tax-inclusion disclosure.
- Credit-note or refund reference where required.

Do not claim a tax invoice is GST-compliant solely because it contains GST fields.

## 15.2 Restaurant commission invoice

Determine the correct invoicing relationship between CRAVE and the restaurant.

Record the service, contractual amount, taxable value, applicable tax and invoice reference.

Do not confuse a restaurant's supply to the customer with CRAVE's commission or platform service supplied to the restaurant.

## 15.3 CraveXP documents

Generate appropriate sale invoices or receipts based on the actual seller and applicable requirements.

For mixed baskets, ensure that product-level tax classifications and supplier allocations are correct.

## 15.4 Rider statement

Show:

- Completed deliveries.
- Base pay.
- Distance pay.
- Incentives.
- Tips.
- Approved adjustments.
- Previous balance, if applicable.
- Amount paid.
- Outstanding amount.
- Settlement reference.

Do not expose unrelated customer or merchant financial data.

## 15.5 Admin and finance reports

Create reconciled reports for:

- Gross merchandise value.
- Customer collections.
- Recognized platform revenue.
- Restaurant payable.
- CraveXP sales.
- Rider payable.
- Discounts by funding source.
- Delivery and operational subsidies.
- Applicable tax liabilities.
- Payment-processing costs.
- Refunds and chargebacks.
- Settlements initiated, completed and failed.
- Outstanding balances.
- Contribution margin.

Define every metric, its source and whether it is gross or net of taxes, discounts, refunds and other adjustments.

---

# PART 16 — ROLE-BASED ACCESS CONTROL

Audit every role and financial API.

Expected roles include:

- Customer.
- Restaurant vendor.
- CraveXP store operator or vendor.
- Rider.
- Operations manager.
- Administrator.
- Finance/compliance operator, if supported.

Adapt to the existing authentication system.

Enforce:

- Customers can access only their own orders and payments.
- Restaurants can access only authorized merchant records.
- Riders can access only their assignments and earnings.
- CraveXP operations can access only their permitted inventory and order data.
- Managers cannot gain unrestricted financial privileges.
- Admin privileges are explicit and audited.
- Refund and payout privileges are restricted.
- Tax and pricing configuration changes require authorized access.
- Sensitive financial data is not exposed through unprotected endpoints.
- Server-side authorization applies even when the UI hides a feature.

Log changes to pricing, tax rules, commission rates, refunds, manual payment verification and settlement settings.

---

# PART 17 — REQUIRED TEST SUITE

Create automated unit, integration, API and end-to-end tests.

## 17.1 Mathematical tests

Test:

- Zero-value and minimum-value orders.
- Maximum supported order value.
- Multiple quantities.
- Fractional unit prices where supported.
- Tax-inclusive and tax-exclusive pricing.
- Mixed tax rates.
- Discounts before and after tax where legally applicable.
- Percentage and fixed coupons.
- Maximum discount caps.
- Packaging allocation.
- Commission on each supported basis.
- Distance bands.
- Service-zone adjustments.
- Surge thresholds.
- Rain eligibility.
- Late-night boundaries.
- Small-cart boundaries.
- Long-distance limits.
- Tips.
- Rider incentives.
- Full and partial refunds.
- Paise rounding.
- Very small monetary values.
- Overflow and invalid input handling.

## 17.2 Security tests

Attempt to tamper with:

- Item subtotal.
- Item price.
- Quantity.
- Discount.
- Coupon eligibility.
- Tax rate.
- Commission rate.
- Delivery distance.
- Surcharge.
- Vendor payable.
- Rider payout.
- Payment-success status.
- UTR.
- Refund amount.
- Settlement amount.

Verify that untrusted inputs cannot override authoritative server calculations or access unauthorized financial operations.

## 17.3 Concurrency tests

Simulate:

- Simultaneous coupon redemption.
- Duplicate payment webhooks.
- Two administrators verifying the same payment.
- Multiple settlement retries.
- Repeated refund requests.
- Two riders claiming the same order.
- Concurrent order cancellation and completion.
- Stock updates from simultaneous orders.

Verify that transactions remain consistent and duplicate financial effects cannot occur.

## 17.4 End-to-end tests

Run the entire flow for:

1. Successful restaurant order.
2. Successful CraveXP order.
3. Invalid or failed payment.
4. Pending manual UTR verification.
5. Vendor rejection.
6. Item unavailability.
7. Peak-demand surcharge.
8. Rain surcharge.
9. Late-night surcharge.
10. Small-cart fee.
11. Platform-funded promotion.
12. Restaurant-funded promotion.
13. Delivery subsidy.
14. Rider incentive.
15. Cancellation before pickup.
16. Cancellation after pickup.
17. Partial refund.
18. Full refund.
19. Failed vendor settlement.
20. Failed rider payout.
21. Duplicate payment callback.
22. Duplicate settlement request.

For each completed scenario, independently recompute the expected result and compare it with:

- Customer payable.
- Payment record.
- Order snapshot.
- Supplier payable.
- Rider payable.
- Platform revenue.
- Tax liability.
- Ledger entries.
- Invoice.
- Settlement records.
- Admin reports.

No scenario passes solely because an HTTP response returns success.

---

# PART 18 — COMPETITOR BENCHMARKING

Use the public terms of Swiggy and Blinkit to inform transparent pricing and operational design.

References:

- Swiggy: https://www.swiggy.com/terms-and-conditions?is_app=true
- Blinkit: https://blinkit.com/terms
- Blinkit FAQ: https://blinkit.com/faq

Study their publicly documented treatment of:

- Delivery charges.
- Distance and operational pricing.
- Peak-demand surge.
- Rain charges.
- Small-cart charges.
- Platform and handling fees.
- Invoice allocation.
- Product versus service taxation.

Do not claim to have replicated their internal algorithms. Do not hardcode competitor fee amounts.

Implement a configurable CRAVE model based on actual costs, service zones, partner contracts, rider compensation and customer transparency.

---

# PART 19 — REQUIRED DELIVERABLES

Produce the following repository documents:

1. `docs/billing/BILLING_AUDIT_PROGRESS.md`
2. `docs/billing/BILLING_DEFECT_REGISTER.md`
3. `docs/billing/BILLING_ARCHITECTURE.md`
4. `docs/billing/PRICING_AND_FEE_SPECIFICATION.md`
5. `docs/billing/TAX_RULE_MATRIX.md`
6. `docs/billing/FINANCIAL_LEDGER_SPECIFICATION.md`
7. `docs/billing/PAYMENT_AND_REFUND_STATE_MACHINE.md`
8. `docs/billing/SETTLEMENT_AND_RECONCILIATION.md`
9. `docs/billing/TEST_RESULTS.md`
10. `docs/billing/MIGRATION_AND_ROLLBACK.md`
11. `docs/billing/PRODUCTION_READINESS.md`

Include diagrams showing:

- Customer-to-order flow.
- Payment verification.
- Restaurant and CraveXP branches.
- Rider assignment and compensation.
- Cancellation and refund flows.
- Ledger posting.
- Vendor and rider settlement.
- Invoice generation.
- Tax-liability ownership.

Also provide example transactions with independently verified calculations.

---

# PART 20 — ACCEPTANCE CRITERIA

The implementation is not complete until all applicable criteria pass.

### Architecture

- [ ] One authoritative financial engine exists.
- [ ] All financial API routes use it appropriately.
- [ ] Historical price snapshots are preserved.
- [ ] Tax, commercial and pricing rules are versioned.
- [ ] CraveXP and restaurant supply models are distinguished.

### Mathematical integrity

- [ ] All monetary calculations use approved money-safe arithmetic.
- [ ] Rounding behaviour is explicitly documented.
- [ ] Commission calculations match their selected contractual basis.
- [ ] Delivery and rider compensation are independently calculated.
- [ ] Every order's financial allocations reconcile.
- [ ] No fee is counted twice.

### Payments and refunds

- [ ] Payment verification is server-authoritative.
- [ ] UTR reuse is prevented.
- [ ] Webhooks are verified and idempotent.
- [ ] Refunds cannot exceed eligible amounts.
- [ ] Duplicate operations cannot create duplicate financial effects.
- [ ] Failed transactions can be retried safely.

### Taxes and invoices

- [ ] Tax rates are not universally hardcoded.
- [ ] Taxable values and liability owners are explicit.
- [ ] Restaurant and CraveXP tax rules are separated.
- [ ] Invoice data comes from persisted financial records.
- [ ] Registration status and supplier identity are verified.
- [ ] Professional tax review is recorded.

### Security

- [ ] All financial APIs enforce server-side authorization.
- [ ] Sensitive operations are auditable.
- [ ] Client-supplied financial values are not authoritative.
- [ ] Secrets and personal data are not exposed.
- [ ] No unauthorized role can access another party's financial records.

### Testing

- [ ] Unit tests pass.
- [ ] Integration tests pass.
- [ ] End-to-end financial scenarios pass.
- [ ] Concurrency tests pass.
- [ ] Existing unrelated functionality remains operational.
- [ ] Build and type checks pass.
- [ ] Remaining failures and blockers are documented honestly.

### Release approval

- [ ] Finance approves the financial reconciliation.
- [ ] Operations approves fee and compensation rules.
- [ ] Security review is completed.
- [ ] The applicable tax treatment is professionally reviewed.
- [ ] Migration and rollback procedures are tested.
- [ ] Production deployment receives explicit authorization.

---

# PART 21 — FINAL INSTRUCTIONS TO THE AGENT

Start by inspecting the repository and recording the current state.

Then trace the entire financial lifecycle and produce the defect register.

Next, implement the corrections in small, reviewable changes. Do not rewrite the entire application unnecessarily. Run tests after each meaningful change, inspect the resulting diff and document any migration requirements.

If a payment-provider credential, external API, tax decision or other dependency is unavailable, implement the safe portion of the work and clearly identify what remains blocked. Never fabricate a successful external integration.

Before completing the task:

1. Run the relevant automated tests.
2. Run the build and type checks.
3. Review all financial calculation paths.
4. Search for remaining duplicate calculations and hardcoded tax defaults.
5. Verify that financial writes are transactional and idempotent.
6. Reconcile representative restaurant and CraveXP orders.
7. Inspect the final code diff for accidental deletions or unrelated changes.
8. Update every required documentation file.
9. Report exactly what changed, which tests passed, which failed and what still requires human approval.

**Final output must contain:**

- Executive summary.
- Confirmed defect register.
- Files changed.
- Financial rules implemented.
- Before-and-after examples.
- Test results.
- Database migration instructions.
- Unresolved risks.
- External dependencies.
- Tax-review decisions still required.
- Production deployment checklist.

Do not declare the system fully compliant merely because all automated tests pass. Code correctness, payment integrity, operational readiness and legal compliance are separate acceptance requirements.

**The ultimate objective is a reliable, auditable, production-grade CRAVE financial system in which every customer charge, supplier payable, rider earning, tax liability, refund and settlement can be traced, independently recomputed and reconciled.**
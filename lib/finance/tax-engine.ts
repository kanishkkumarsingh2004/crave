/**
 * lib/finance/tax-engine.ts
 *
 * Indian GST Tax Engine for CRAVE — Phase 4 of Billing Engine 2.0
 *
 * References (docs/payment_audit.md §10):
 *  - Restaurant services: Section 9(5) CGST — platform is the deemed supplier
 *    Standard rate: 5% without ITC (CGST 2.5% + SGST 2.5% intra-state, or IGST 5% inter-state)
 *  - Platform services (convenience/handling fee): 18% GST
 *  - CraveXP goods: SKU-level HSN-based classification (varies 0–28%)
 *  - Commission to platform from restaurant: 18% GST on commission amount
 *
 * IMPORTANT: Actual rates must be professionally reviewed before production.
 * This engine is fail-closed: unknown classifications throw rather than assume 0%.
 */

import { Money } from './money'

// ─── GST Component Types ──────────────────────────────────────────────────────

export type TaxMode = 'CGST_SGST' | 'IGST' | 'EXEMPT'

export interface TaxBreakdown {
  taxableBasePaise: number
  taxRatePercent: number
  totalGstPaise: number
  cgstPaise: number // 0 if IGST
  sgstPaise: number // 0 if IGST
  igstPaise: number // 0 if CGST_SGST
  taxMode: TaxMode
}

export interface ItemTaxResult {
  name: string
  hsnSacCode: string
  quantity: number
  unitPricePaise: number
  grossAmountPaise: number
  priceTaxMode: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  taxBreakdown: TaxBreakdown
  netAmountPaise: number // gross amount (customer-facing, tax already included or added)
}

export type PriceTaxMode = 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'

// ─── Tax Categories ────────────────────────────────────────────────────────────

export type TaxCategory =
  | 'RESTAURANT_SERVICE' // 5% under Section 9(5) CGST
  | 'PLATFORM_SERVICE' // 18% — platform convenience/handling fees
  | 'PLATFORM_COMMISSION' // 18% — on restaurant commission invoice
  | 'GROCERY_EXEMPT' // 0% — unprocessed food grains, fresh produce
  | 'GROCERY_5PCT' // 5% — packaged food items HSN 19xx, 21xx
  | 'GROCERY_12PCT' // 12% — processed/semi-processed food
  | 'GROCERY_18PCT' // 18% — beverages, some processed goods
  | 'GROCERY_28PCT' // 28% — luxury FMCG (rare)
  | 'DELIVERY_SERVICE' // 5% — if platform charges delivery as separate supply

const TAX_RATE_MAP: Record<TaxCategory, number> = {
  RESTAURANT_SERVICE: 5,
  PLATFORM_SERVICE: 18,
  PLATFORM_COMMISSION: 18,
  GROCERY_EXEMPT: 0,
  GROCERY_5PCT: 5,
  GROCERY_12PCT: 12,
  GROCERY_18PCT: 18,
  GROCERY_28PCT: 28,
  DELIVERY_SERVICE: 5,
}

// ─── Core Calculation Functions ────────────────────────────────────────────────

/**
 * Derives taxable base and GST amount depending on Tax Inclusive or Exclusive mode.
 *
 * Tax-Inclusive: TaxableBase = Amount / (1 + Rate/100)
 *   e.g. ₹105 at 5% => base ₹100, tax ₹5
 * Tax-Exclusive: TaxableBase = Amount, Tax = Amount × Rate/100
 *   e.g. ₹100 at 5% => base ₹100, tax ₹5, total ₹105
 *
 * All arithmetic uses integer paise throughout; rounding is explicit CEIL at final boundary.
 */
export function calculateTaxBreakdown(
  amountPaise: number,
  taxRatePercent: number,
  priceTaxMode: PriceTaxMode,
  supplierState: string,
  customerState: string
): TaxBreakdown {
  if (amountPaise <= 0 || taxRatePercent <= 0) {
    return {
      taxableBasePaise: amountPaise,
      taxRatePercent,
      totalGstPaise: 0,
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
      taxMode: taxRatePercent <= 0 ? 'EXEMPT' : 'CGST_SGST',
    }
  }

  let taxableBasePaise: number
  let totalGstPaise: number

  if (priceTaxMode === 'TAX_INCLUSIVE') {
    // Base = Price * 100 / (100 + Rate) — using integer arithmetic
    // Multiply first, divide last to preserve precision
    taxableBasePaise = Math.round((amountPaise * 100) / (100 + taxRatePercent))
    totalGstPaise = amountPaise - taxableBasePaise
  } else {
    // Exclusive: tax is added on top of base
    taxableBasePaise = amountPaise
    totalGstPaise = Math.ceil((amountPaise * taxRatePercent) / 100)
  }

  return {
    taxableBasePaise,
    taxRatePercent,
    totalGstPaise,
    ...resolveTaxSplitPaise(totalGstPaise, supplierState, customerState),
  }
}

/**
 * Resolves CGST/SGST (intra-state) vs IGST (inter-state) split.
 * Intra-state: CGST = ceil(tax/2), SGST = remainder
 * Inter-state: IGST = full tax
 */
export function resolveTaxSplitPaise(
  totalGstPaise: number,
  supplierState: string,
  customerState: string
): Pick<TaxBreakdown, 'cgstPaise' | 'sgstPaise' | 'igstPaise' | 'taxMode'> {
  const isIntraState =
    !supplierState ||
    !customerState ||
    supplierState.trim().toLowerCase() === customerState.trim().toLowerCase()

  if (isIntraState) {
    const cgstPaise = Math.ceil(totalGstPaise / 2)
    const sgstPaise = totalGstPaise - cgstPaise
    return { taxMode: 'CGST_SGST', cgstPaise, sgstPaise, igstPaise: 0 }
  }

  return { taxMode: 'IGST', cgstPaise: 0, sgstPaise: 0, igstPaise: totalGstPaise }
}

/**
 * Calculate GST for Restaurant Service (Section 9(5) CGST deemed-supply via E-Commerce Operator).
 * Standard rate: 5%, no ITC for platform.
 * Taxable base: net merchandise value after discounts.
 */
export function calculateRestaurantServiceGst(
  netMerchandisePaise: number,
  priceTaxMode: PriceTaxMode,
  supplierState: string,
  customerState: string
): TaxBreakdown {
  return calculateTaxBreakdown(
    netMerchandisePaise,
    TAX_RATE_MAP.RESTAURANT_SERVICE,
    priceTaxMode,
    supplierState,
    customerState
  )
}

/**
 * Calculate GST for Platform Service (convenience fee + handling fee) at 18%.
 * These are platform's own supplies to the customer; always TAX_EXCLUSIVE (added on top).
 */
export function calculatePlatformServiceGst(
  platformFeesPaise: number,
  supplierState: string,
  customerState: string
): TaxBreakdown {
  return calculateTaxBreakdown(
    platformFeesPaise,
    TAX_RATE_MAP.PLATFORM_SERVICE,
    'TAX_EXCLUSIVE',
    supplierState,
    customerState
  )
}

/**
 * Calculate 18% GST on commission charged to restaurant (B2B supply: platform service to restaurant).
 * This appears on the restaurant commission invoice, not on customer invoice.
 */
export function calculateCommissionGst(
  commissionPaise: number,
  platformState: string,
  restaurantState: string
): TaxBreakdown {
  return calculateTaxBreakdown(
    commissionPaise,
    TAX_RATE_MAP.PLATFORM_COMMISSION,
    'TAX_EXCLUSIVE',
    platformState,
    restaurantState
  )
}

/**
 * Calculate tax for CraveXP grocery items based on SKU tax category.
 * Each item must carry an explicit TaxCategory from its HSN classification.
 */
export function calculateGroceryItemGst(
  grossAmountPaise: number,
  taxCategory: TaxCategory,
  priceTaxMode: PriceTaxMode,
  supplierState: string,
  customerState: string
): TaxBreakdown {
  if (!TAX_RATE_MAP.hasOwnProperty(taxCategory)) {
    throw new Error(
      `calculateGroceryItemGst: Unknown tax category "${taxCategory}". Classify the SKU before proceeding.`
    )
  }
  const rate = TAX_RATE_MAP[taxCategory]
  return calculateTaxBreakdown(grossAmountPaise, rate, priceTaxMode, supplierState, customerState)
}

/**
 * Returns tax rate for a given category.
 */
export function getTaxRate(category: TaxCategory): number {
  return TAX_RATE_MAP[category]
}

// ─── Verification Helpers ──────────────────────────────────────────────────────

/**
 * Verify that tax-inclusive price factoring is correct.
 * Test fixture from docs/payment_audit.md §10.5:
 *   ₹105 at 5% inclusive => base ₹100, tax ₹5
 *   ₹118 at 18% inclusive => base ₹100, tax ₹18
 */
export function verifyTaxInclusiveExample(): boolean {
  const t1 = calculateTaxBreakdown(10500, 5, 'TAX_INCLUSIVE', 'Karnataka', 'Karnataka')
  const t2 = calculateTaxBreakdown(11800, 18, 'TAX_INCLUSIVE', 'Karnataka', 'Karnataka')

  return (
    t1.taxableBasePaise === 10000 &&
    t1.totalGstPaise === 500 &&
    t2.taxableBasePaise === 10000 &&
    t2.totalGstPaise === 1800
  )
}

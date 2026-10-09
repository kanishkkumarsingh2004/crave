/**
 * lib/finance/pricing-engine.ts
 *
 * CRAVE Unified Financial Pricing Engine — Billing Engine 2.0
 *
 * This is the ONE authoritative source for all CRAVE commercial math.
 * It replaces the parallel calculations that existed across:
 *   - lib/calculator.ts   (customer billing + driver earnings)
 *   - lib/commercial-engine.ts (commercial contract + tax + snapshot)
 *
 * Key design rules (docs/payment_audit.md §3):
 *  1. All internal arithmetic uses integer PAISE via the Money class.
 *  2. A single CanonicalPriceResult is produced, persisted, and reused.
 *  3. Checkout, settlement, refund, and invoice MUST read the persisted snapshot — not recalculate.
 *  4. The preview /api/calculator endpoint MAY call calculateOrderPrice() but MUST NOT authorise payments.
 *  5. Rounding is CEIL at each customer-facing fee boundary (conservative customer protection).
 *  6. Explicit applicability flags: zero means zero, undefined means N/A.
 */

import { Money, sumMoney } from './money'
import {
  calculateRestaurantServiceGst,
  calculatePlatformServiceGst,
  calculateCommissionGst,
  TaxBreakdown,
  PriceTaxMode,
  TaxCategory,
  calculateGroceryItemGst,
} from './tax-engine'

// ─── Enums & Types ─────────────────────────────────────────────────────────────

export type CommercialModel = 'commission' | 'markup' | 'hybrid'
export type CommissionBasis =
  'ITEM_SUBTOTAL' | 'ORDER_SUBTOTAL' | 'TAXABLE_VALUE' | 'CUSTOMER_PAYABLE'
export type GstStatus = 'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'EXEMPT'
export type OrderType = 'restaurant_food' | 'cravexp_grocery'
export type FundingSource = 'RESTAURANT' | 'PLATFORM' | 'SHARED' | 'BANK'

// ─── Input Interfaces ──────────────────────────────────────────────────────────

export interface PricingItem {
  id?: string
  name: string
  hsnSacCode?: string // e.g. '996331' for restaurant
  category?: string
  quantity: number
  unitPricePaise: number // Selling price per unit in PAISE (integer)
  mrpPaise?: number
  priceTaxMode?: PriceTaxMode // defaults to contract
  taxCategory?: TaxCategory // required for CraveXP items
  taxRatePercent?: number // explicit override; otherwise derived from taxCategory
  customCommissionRatePercent?: number
  customMarkupRatePercent?: number
}

export interface CommercialContractInput {
  contractNumber?: string
  version?: number
  commercialModel?: CommercialModel
  commissionRatePercent?: number // e.g. 15.0
  markupRatePercent?: number // e.g. 10.0
  fixedCommissionPaise?: number
  fixedMarkupPaise?: number
  commissionBasis?: CommissionBasis
  priceTaxMode?: PriceTaxMode // default for all items
  gstStatus?: GstStatus
  supplierState?: string
  restaurantGstin?: string
}

export interface SurchargeConfig {
  surgeMultiplier?: number // 1.0 = no surge; 1.5 = 50% surge
  rainFeePaise?: number // 0 if not raining
  nightSurgeFeePaise?: number // 0 if not night hours
  isRainActive?: boolean
  isNightSurgeActive?: boolean
}

export interface DeliveryConfig {
  baseDeliveryFeePaise: number // Base fee e.g. 3000 (₹30)
  baseDistanceKm: number // Included km e.g. 3
  perKmRatePaise: number // Per extra km rate e.g. 1000 (₹10/km)
  freeDeliveryThresholdPaise?: number // Cart value above which delivery is free
  roadDistanceKm: number // Actual routing distance
}

export interface OrderPriceInput {
  orderId?: string
  orderType: OrderType

  // Restaurant/supplier context
  restaurantId?: string
  restaurantName: string
  supplierState?: string // defaults to 'Karnataka'
  customerState?: string // defaults to supplierState

  // Items
  items: PricingItem[]

  // Delivery
  delivery: DeliveryConfig

  // Surcharges
  surcharges?: SurchargeConfig

  // Fees (in paise; from active PaymentConfig)
  platformFeePaise?: number // e.g. 600 (₹6)
  handlingFeePaise?: number // e.g. 500 (₹5)
  packagingFeePaise?: number // e.g. 2000 (₹20)

  // Small-cart fee
  smallCartFeePaise?: number // Applied if net merchandise < threshold
  smallCartThresholdPaise?: number

  // Discount
  couponDiscountPaise?: number
  couponFundingSource?: FundingSource
  restaurantDiscountSharePercent?: number // % of discount funded by restaurant

  // Tip
  tipPaise?: number

  // Commercial contract
  contract?: CommercialContractInput
}

// ─── Result Interface ──────────────────────────────────────────────────────────

export interface ItemPriceResult {
  name: string
  hsnSacCode: string
  quantity: number
  unitPricePaise: number
  grossAmountPaise: number
  priceTaxMode: PriceTaxMode
  taxableBasePaise: number
  taxRatePercent: number
  gstTotalPaise: number
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
  commissionRatePercent: number
  commissionAmountPaise: number
  markupRatePercent: number
  markupAmountPaise: number
}

export interface CanonicalPriceResult {
  // Identity
  engineVersion: string
  snapshotId: string
  orderId: string
  calculatedAt: string
  orderType: OrderType

  // Supplier context
  restaurantName: string
  supplierState: string
  customerState: string
  contractNumber: string
  contractVersion: number
  gstStatus: GstStatus
  taxMode: string // 'CGST_SGST' | 'IGST'

  // Items
  items: ItemPriceResult[]

  // Merchandise
  grossSubtotalPaise: number // sum of all item.quantity × unitPrice
  couponDiscountPaise: number // validated coupon discount
  restaurantFundedDiscountPaise: number
  platformFundedDiscountPaise: number
  netMerchandisePaise: number // grossSubtotal - couponDiscount

  // Commercial model
  commercialModel: CommercialModel
  commissionBasis: CommissionBasis
  commissionRatePercent: number
  grossCommissionPaise: number // on the eligible commission base
  commissionGstPaise: number // 18% GST on commission (B2B platform invoice)
  totalCommissionDeductionPaise: number // grossCommission + commissionGst (deducted from vendor)
  markupRatePercent: number
  markupAmountPaise: number // added to customer price (markup/hybrid only)

  // Fees (all in paise)
  packagingFeePaise: number
  deliveryFeePaise: number // net delivery fee after free-delivery check
  grossDeliveryFeePaise: number // before free-delivery waiver
  surgeFeePaise: number
  rainFeePaise: number
  nightSurgeFeePaise: number
  platformFeePaise: number
  handlingFeePaise: number
  smallCartFeePaise: number

  // Tax — Restaurant Service (Section 9(5))
  restaurantServiceTaxBreakdown: TaxBreakdown

  // Tax — Platform Service (18%)
  platformServiceTaxBreakdown: TaxBreakdown

  // Tip
  tipPaise: number

  // Customer total
  customerPayablePaise: number

  // Vendor settlement
  vendorGrossSalesPaise: number
  vendorNetSalesPaise: number // after restaurant-funded discount
  vendorPackagingSharePaise: number
  vendorPayableGrossPaise: number
  vendorPayableNetPaise: number // final bank transfer to vendor

  // Rider compensation
  riderBasePayPaise: number
  riderDistancePayPaise: number
  riderSurgeIncentivePaise: number
  riderRainIncentivePaise: number
  riderNightIncentivePaise: number
  riderTipPaise: number
  riderPayablePaise: number

  // Platform economics
  platformGrossRevenuePaise: number
  platformGstLiabilityPaise: number
  platformNetRevenuePaise: number
}

// ─── Engine Constants ──────────────────────────────────────────────────────────

const ENGINE_VERSION = '2.0.0'

// Rider earns 80% of gross delivery fee by default (configurable via driverPayoutSharePercent)
const DEFAULT_RIDER_SHARE_PERCENT = 80

// ─── Main Calculation Function ─────────────────────────────────────────────────

/**
 * Calculate the canonical price result for a CRAVE order.
 *
 * This function is pure and deterministic. Persist the result immediately
 * after calling it — never recalculate from config for historical orders.
 */
export function calculateOrderPrice(input: OrderPriceInput): CanonicalPriceResult {
  const snapshotId = `snp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const orderId = input.orderId || `CRV-${Date.now().toString().slice(-6)}`
  const calculatedAt = new Date().toISOString()

  const contract: Required<CommercialContractInput> = {
    contractNumber: input.contract?.contractNumber || 'DEFAULT',
    version: input.contract?.version || 1,
    commercialModel: input.contract?.commercialModel || 'commission',
    commissionRatePercent: input.contract?.commissionRatePercent ?? 15,
    markupRatePercent: input.contract?.markupRatePercent ?? 0,
    fixedCommissionPaise: input.contract?.fixedCommissionPaise ?? 0,
    fixedMarkupPaise: input.contract?.fixedMarkupPaise ?? 0,
    commissionBasis: input.contract?.commissionBasis || 'ORDER_SUBTOTAL',
    priceTaxMode: input.contract?.priceTaxMode || 'TAX_INCLUSIVE',
    gstStatus: input.contract?.gstStatus || 'REGISTERED',
    supplierState: input.contract?.supplierState || 'Karnataka',
    restaurantGstin: input.contract?.restaurantGstin || '',
  }

  const supplierState = input.supplierState || contract.supplierState || 'Karnataka'
  const customerState = input.customerState || supplierState

  const isCommission =
    contract.commercialModel === 'commission' || contract.commercialModel === 'hybrid'
  const isMarkup = contract.commercialModel === 'markup' || contract.commercialModel === 'hybrid'

  // ─── 1. Items ────────────────────────────────────────────────────────────────

  let grossSubtotalPaise = 0
  const processedItems: ItemPriceResult[] = input.items.map((item) => {
    const qty = Math.max(1, item.quantity || 1)
    const unitPricePaise = Math.max(0, item.unitPricePaise || 0)
    const grossAmountPaise = unitPricePaise * qty
    grossSubtotalPaise += grossAmountPaise

    const priceTaxMode: PriceTaxMode = item.priceTaxMode || contract.priceTaxMode

    // Tax calculation per item
    let taxBreakdown: TaxBreakdown
    if (input.orderType === 'cravexp_grocery' && item.taxCategory) {
      taxBreakdown = calculateGroceryItemGst(
        grossAmountPaise,
        item.taxCategory,
        priceTaxMode,
        supplierState,
        customerState
      )
    } else {
      taxBreakdown = calculateRestaurantServiceGst(
        grossAmountPaise,
        priceTaxMode,
        supplierState,
        customerState
      )
    }

    const commissionRatePercent = isCommission
      ? (item.customCommissionRatePercent ?? contract.commissionRatePercent)
      : 0
    const commissionAmountPaise = Math.ceil((grossAmountPaise * commissionRatePercent) / 100)

    const markupRatePercent = isMarkup
      ? (item.customMarkupRatePercent ?? contract.markupRatePercent)
      : 0
    const markupAmountPaise = Math.ceil((grossAmountPaise * markupRatePercent) / 100)

    return {
      name: item.name,
      hsnSacCode: item.hsnSacCode || '996331',
      quantity: qty,
      unitPricePaise,
      grossAmountPaise,
      priceTaxMode,
      taxableBasePaise: taxBreakdown.taxableBasePaise,
      taxRatePercent: taxBreakdown.taxRatePercent,
      gstTotalPaise: taxBreakdown.totalGstPaise,
      cgstPaise: taxBreakdown.cgstPaise,
      sgstPaise: taxBreakdown.sgstPaise,
      igstPaise: taxBreakdown.igstPaise,
      commissionRatePercent,
      commissionAmountPaise,
      markupRatePercent,
      markupAmountPaise,
    }
  })

  // ─── 2. Markup (added to customer's food subtotal) ───────────────────────────

  const markupAmountPaise = isMarkup
    ? Math.ceil((grossSubtotalPaise * contract.markupRatePercent) / 100) + contract.fixedMarkupPaise
    : 0

  // ─── 3. Discount Allocation ──────────────────────────────────────────────────

  const couponDiscountPaise = Math.min(
    grossSubtotalPaise + markupAmountPaise,
    Math.max(0, input.couponDiscountPaise || 0)
  )

  const restaurantSharePercent = input.restaurantDiscountSharePercent ?? 50
  const restaurantFundedDiscountPaise = Math.ceil(
    (couponDiscountPaise * restaurantSharePercent) / 100
  )
  const platformFundedDiscountPaise = couponDiscountPaise - restaurantFundedDiscountPaise

  const netMerchandisePaise = Math.max(
    0,
    grossSubtotalPaise + markupAmountPaise - couponDiscountPaise
  )

  // ─── 4. Fees ─────────────────────────────────────────────────────────────────

  const packagingFeePaise = Math.max(0, input.packagingFeePaise ?? 2000)
  const platformFeePaise = Math.max(0, input.platformFeePaise ?? 600)
  const handlingFeePaise = Math.max(0, input.handlingFeePaise ?? 500)

  // Small-cart fee: only if net merchandise below threshold (never count tips/fees toward threshold)
  const smallCartThresholdPaise = input.smallCartThresholdPaise ?? 0
  const smallCartFeePaise =
    smallCartThresholdPaise > 0 && netMerchandisePaise < smallCartThresholdPaise
      ? Math.max(0, input.smallCartFeePaise ?? 0)
      : 0

  // ─── 5. Delivery Fee ─────────────────────────────────────────────────────────

  const {
    baseDeliveryFeePaise,
    baseDistanceKm,
    perKmRatePaise,
    roadDistanceKm,
    freeDeliveryThresholdPaise,
  } = input.delivery
  const extraDistanceKm = Math.max(0, roadDistanceKm - baseDistanceKm)
  const extraDistanceFeePaise = Math.ceil(extraDistanceKm * perKmRatePaise)
  const basePlusDistancePaise = baseDeliveryFeePaise + extraDistanceFeePaise

  // Surge: additive fee on top of base delivery (not a multiplier on total order)
  const surgeConfig = input.surcharges || {}
  const surgeMultiplierAdd = Math.max(0, (surgeConfig.surgeMultiplier ?? 1.0) - 1.0)
  const surgeFeePaise = Math.ceil(basePlusDistancePaise * surgeMultiplierAdd)

  const rainFeePaise = surgeConfig.isRainActive ? Math.max(0, surgeConfig.rainFeePaise ?? 0) : 0
  const nightSurgeFeePaise = surgeConfig.isNightSurgeActive
    ? Math.max(0, surgeConfig.nightSurgeFeePaise ?? 0)
    : 0

  const grossDeliveryFeePaise =
    basePlusDistancePaise + surgeFeePaise + rainFeePaise + nightSurgeFeePaise

  const isFreeDelivery =
    (freeDeliveryThresholdPaise ?? 0) > 0 &&
    netMerchandisePaise >= (freeDeliveryThresholdPaise ?? 0)
  const deliveryFeePaise = isFreeDelivery ? 0 : grossDeliveryFeePaise

  // ─── 6. Tax ──────────────────────────────────────────────────────────────────

  // Restaurant service GST (Section 9(5)): applied on net merchandise (post-discount) + packaging
  const restaurantServiceTaxBase = netMerchandisePaise + packagingFeePaise
  const restaurantServiceTaxBreakdown = calculateRestaurantServiceGst(
    restaurantServiceTaxBase,
    contract.priceTaxMode,
    supplierState,
    customerState
  )

  // Platform service GST (18%): applied on platform fee + handling fee
  const platformServiceTaxBase = platformFeePaise + handlingFeePaise
  const platformServiceTaxBreakdown = calculatePlatformServiceGst(
    platformServiceTaxBase,
    supplierState,
    customerState
  )

  // ─── 7. Tip ──────────────────────────────────────────────────────────────────

  const tipPaise = Math.max(0, input.tipPaise ?? 0)

  // ─── 8. Customer Payable ─────────────────────────────────────────────────────

  // Formula (docs/payment_audit.md §4):
  // CustomerPayable = NetMerchandise + PackagingFee + DeliveryFee + SmallCartFee +
  //                   PlatformFee + HandlingFee + RestaurantServiceGST + PlatformServiceGST + Tip
  // NOTE: If TAX_INCLUSIVE, GST is already inside netMerchandise; we do NOT add it again.
  //       If TAX_EXCLUSIVE, we add it.
  let restaurantGstAddition = 0
  if (contract.priceTaxMode === 'TAX_EXCLUSIVE') {
    restaurantGstAddition = restaurantServiceTaxBreakdown.totalGstPaise
  }

  const customerPayablePaise =
    netMerchandisePaise +
    packagingFeePaise +
    deliveryFeePaise +
    smallCartFeePaise +
    platformFeePaise +
    handlingFeePaise +
    restaurantGstAddition +
    platformServiceTaxBreakdown.totalGstPaise +
    tipPaise

  // ─── 9. Commission & Vendor Settlement ───────────────────────────────────────

  // Commission basis selection
  let commissionBasePaise: number
  switch (contract.commissionBasis) {
    case 'ITEM_SUBTOTAL':
      commissionBasePaise = grossSubtotalPaise
      break
    case 'TAXABLE_VALUE':
      commissionBasePaise = restaurantServiceTaxBreakdown.taxableBasePaise
      break
    case 'CUSTOMER_PAYABLE':
      commissionBasePaise = customerPayablePaise - tipPaise // exclude tip
      break
    case 'ORDER_SUBTOTAL':
    default:
      commissionBasePaise = grossSubtotalPaise // standard: pre-discount subtotal
  }

  // Commission amount (NEVER on tips, delivery fees, taxes unless contract explicitly requires it)
  const grossCommissionPaise = isCommission
    ? Math.ceil((commissionBasePaise * contract.commissionRatePercent) / 100) +
      contract.fixedCommissionPaise
    : 0

  const commissionGstBreakdown = calculateCommissionGst(
    grossCommissionPaise,
    supplierState, // platform state = supplier state for B2B invoice
    supplierState // restaurant is in same state for this calc; adjust if needed
  )
  const commissionGstPaise = commissionGstBreakdown.totalGstPaise
  const totalCommissionDeductionPaise = grossCommissionPaise + commissionGstPaise

  // Vendor payable
  const vendorGrossSalesPaise = grossSubtotalPaise
  const vendorNetSalesPaise = Math.max(0, vendorGrossSalesPaise - restaurantFundedDiscountPaise)
  const vendorPackagingSharePaise = packagingFeePaise
  const vendorPayableGrossPaise = vendorNetSalesPaise + vendorPackagingSharePaise
  const vendorPayableNetPaise = Math.max(0, vendorPayableGrossPaise - totalCommissionDeductionPaise)

  // ─── 10. Rider Compensation ──────────────────────────────────────────────────

  // Rider earns a percentage of gross delivery fee (NOT the customer's delivery fee post-waiver)
  // This ensures riders are compensated even when customers get free delivery.
  const riderSharePercent = DEFAULT_RIDER_SHARE_PERCENT
  const riderBasePayPaise = Math.ceil((baseDeliveryFeePaise * riderSharePercent) / 100)
  const riderDistancePayPaise = Math.ceil((extraDistanceFeePaise * riderSharePercent) / 100)
  const riderSurgeIncentivePaise = Math.ceil((surgeFeePaise * riderSharePercent) / 100)
  const riderRainIncentivePaise = Math.ceil((rainFeePaise * riderSharePercent) / 100)
  const riderNightIncentivePaise = Math.ceil((nightSurgeFeePaise * riderSharePercent) / 100)
  const riderTipPaise = tipPaise // 100% tip pass-through — never retained by platform

  const riderPayablePaise =
    riderBasePayPaise +
    riderDistancePayPaise +
    riderSurgeIncentivePaise +
    riderRainIncentivePaise +
    riderNightIncentivePaise +
    riderTipPaise

  // ─── 11. Platform Economics ───────────────────────────────────────────────────

  const platformGrossRevenuePaise =
    grossCommissionPaise + markupAmountPaise + platformFeePaise + handlingFeePaise
  const platformGstLiabilityPaise = commissionGstPaise + platformServiceTaxBreakdown.totalGstPaise
  const platformNetRevenuePaise = Math.max(
    0,
    platformGrossRevenuePaise - platformFundedDiscountPaise - platformGstLiabilityPaise
  )

  // ─── Return canonical result ─────────────────────────────────────────────────

  return {
    engineVersion: ENGINE_VERSION,
    snapshotId,
    orderId,
    calculatedAt,
    orderType: input.orderType,

    restaurantName: input.restaurantName,
    supplierState,
    customerState,
    contractNumber: contract.contractNumber,
    contractVersion: contract.version,
    gstStatus: contract.gstStatus,
    taxMode: restaurantServiceTaxBreakdown.taxMode,

    items: processedItems,

    grossSubtotalPaise,
    couponDiscountPaise,
    restaurantFundedDiscountPaise,
    platformFundedDiscountPaise,
    netMerchandisePaise,

    commercialModel: contract.commercialModel,
    commissionBasis: contract.commissionBasis,
    commissionRatePercent: contract.commissionRatePercent,
    grossCommissionPaise,
    commissionGstPaise,
    totalCommissionDeductionPaise,
    markupRatePercent: contract.markupRatePercent,
    markupAmountPaise,

    packagingFeePaise,
    deliveryFeePaise,
    grossDeliveryFeePaise,
    surgeFeePaise,
    rainFeePaise,
    nightSurgeFeePaise,
    platformFeePaise,
    handlingFeePaise,
    smallCartFeePaise,

    restaurantServiceTaxBreakdown,
    platformServiceTaxBreakdown,

    tipPaise,
    customerPayablePaise,

    vendorGrossSalesPaise,
    vendorNetSalesPaise,
    vendorPackagingSharePaise,
    vendorPayableGrossPaise,
    vendorPayableNetPaise,

    riderBasePayPaise,
    riderDistancePayPaise,
    riderSurgeIncentivePaise,
    riderRainIncentivePaise,
    riderNightIncentivePaise,
    riderTipPaise,
    riderPayablePaise,

    platformGrossRevenuePaise,
    platformGstLiabilityPaise,
    platformNetRevenuePaise,
  }
}

// ─── Compatibility Adapter ────────────────────────────────────────────────────
// Converts CanonicalPriceResult to the legacy FullCalculatorResult shape
// so existing API routes and UI components continue working during migration.

import type { FullCalculatorResult } from '../calculator'

export function tolegacyCalculatorResult(r: CanonicalPriceResult): FullCalculatorResult {
  const toRupees = (paise: number) => Math.round(paise / 100)
  return {
    input: {
      subtotal: toRupees(r.grossSubtotalPaise),
      distanceKm: 0, // not stored in canonical result; use delivery config
    },
    customerBilling: {
      subtotal: toRupees(r.grossSubtotalPaise),
      markupAmount: toRupees(r.markupAmountPaise),
      customerFoodSubtotal: toRupees(r.grossSubtotalPaise + r.markupAmountPaise),
      packagingFee: toRupees(r.packagingFeePaise),
      baseDeliveryFee: toRupees(
        r.grossDeliveryFeePaise - r.surgeFeePaise - r.rainFeePaise - r.nightSurgeFeePaise
      ),
      extraDistanceFee: 0,
      surgeFee: toRupees(r.surgeFeePaise),
      rainFee: toRupees(r.rainFeePaise),
      nightSurgeFee: toRupees(r.nightSurgeFeePaise),
      grossDeliveryFee: toRupees(r.grossDeliveryFeePaise),
      isFreeDelivery: r.deliveryFeePaise === 0 && r.grossDeliveryFeePaise > 0,
      netDeliveryFee: toRupees(r.deliveryFeePaise),
      platformFee: toRupees(r.platformFeePaise),
      handlingFee: toRupees(r.handlingFeePaise),
      couponDiscount: toRupees(r.couponDiscountPaise),
      gstAmount: toRupees(
        r.restaurantServiceTaxBreakdown.totalGstPaise + r.platformServiceTaxBreakdown.totalGstPaise
      ),
      exactGst:
        (r.restaurantServiceTaxBreakdown.totalGstPaise +
          r.platformServiceTaxBreakdown.totalGstPaise) /
        100,
      roundingAdjustment: 0,
      tip: toRupees(r.tipPaise),
      grandTotal: toRupees(r.customerPayablePaise),
    },
    vendorSettlement: {
      restaurantName: r.restaurantName,
      grossSales: toRupees(r.vendorGrossSalesPaise),
      commercialModel: r.commercialModel,
      commissionRatePercent: r.commissionRatePercent,
      commissionDeducted: toRupees(r.grossCommissionPaise),
      markupDeducted: toRupees(r.markupAmountPaise),
      netVendorPayout: toRupees(r.vendorPayableNetPaise),
    },
    driverEarnings: {
      deliveryFeeCollected: toRupees(r.grossDeliveryFeePaise),
      driverSharePercent: DEFAULT_RIDER_SHARE_PERCENT,
      baseDistanceShare: toRupees(r.riderBasePayPaise),
      extraDistanceShare: toRupees(r.riderDistancePayPaise),
      surgeRainShare: toRupees(
        r.riderSurgeIncentivePaise + r.riderRainIncentivePaise + r.riderNightIncentivePaise
      ),
      tip: toRupees(r.riderTipPaise),
      totalDriverEarnings: toRupees(r.riderPayablePaise),
    },
    platformEconomics: {
      totalCollectedFromCustomer: toRupees(r.customerPayablePaise),
      totalPaidToVendor: toRupees(r.vendorPayableNetPaise),
      totalPaidToDriver: toRupees(r.riderPayablePaise),
      totalGstCollected: toRupees(r.restaurantServiceTaxBreakdown.totalGstPaise),
      platformGrossRevenue: toRupees(r.platformGrossRevenuePaise),
      platformNetProfit: toRupees(r.platformNetRevenuePaise),
      profitMarginPercent:
        r.customerPayablePaise > 0
          ? Number(((r.platformNetRevenuePaise / r.customerPayablePaise) * 100).toFixed(1))
          : 0,
    },
    timestamp: r.calculatedAt,
  }
}

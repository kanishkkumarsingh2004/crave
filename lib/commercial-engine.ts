/**
 * Commercial, Tax & Pricing Engine
 * Implementation based on docs/commercial-engine.md
 */

export type ContractStatus =
  'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED'

export type CommercialModel = 'commission' | 'markup' | 'hybrid'

export type CommissionModel = 'PERCENTAGE' | 'FIXED' | 'HYBRID'

export type CommissionBasis =
  'ITEM_SUBTOTAL' | 'ORDER_SUBTOTAL' | 'ORDER_TOTAL' | 'TAXABLE_VALUE' | 'CUSTOMER_PAYABLE'

export type CommercialPayer = 'RESTAURANT' | 'CUSTOMER' | 'PLATFORM' | 'SHARED'

export type FeeType =
  | 'PLATFORM_FEE'
  | 'CONVENIENCE_FEE'
  | 'PACKAGING_FEE'
  | 'DELIVERY_FEE'
  | 'HANDLING_FEE'
  | 'SMALL_ORDER_FEE'
  | 'SURGE_FEE'
  | 'PAYMENT_PROCESSING_FEE'
  | 'OTHER'

export type FeeCalculationType = 'FIXED' | 'PERCENTAGE' | 'HYBRID' | 'SLAB'

export type DiscountType =
  | 'RESTAURANT_DISCOUNT'
  | 'PLATFORM_DISCOUNT'
  | 'SHARED_DISCOUNT'
  | 'COUPON'
  | 'BANK_OFFER'
  | 'MEMBERSHIP_DISCOUNT'

export type FundingSource = 'RESTAURANT' | 'PLATFORM' | 'BANK' | 'SHARED' | 'THIRD_PARTY'

export type GstRegistrationStatus =
  'REGISTERED' | 'UNREGISTERED' | 'COMPOSITION' | 'EXEMPT' | 'OTHER'

export type TaxApplicability =
  'TAXABLE' | 'EXEMPT' | 'ZERO_RATED' | 'OUT_OF_SCOPE' | 'NOT_APPLICABLE'

export type PriceTaxMode = 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'

export type TaxMode = 'CGST_SGST' | 'IGST' | 'EXEMPT' | 'ZERO_RATED' | 'OTHER'

// 1. Commercial Contract Interface
export interface CommercialContract {
  id: string
  restaurantId: string
  contractNumber: string
  version: number
  status: ContractStatus
  effectiveFrom: string
  effectiveUntil?: string | null
  currency: string
  commercialModel: CommercialModel // 'commission' | 'markup' | 'hybrid'
  commissionModel?: CommissionModel
  commissionRate: number // percentage vendor pays to platform (e.g. 15 for 15%)
  markupRate: number // percentage markup added for customer (e.g. 10 for 10%)
  fixedCommissionAmount?: number
  fixedMarkupAmount?: number
  commissionBasis: CommissionBasis
  commissionPayer: CommercialPayer
  markupModel?: CommissionModel
  markupValue?: number
  priceTaxMode: PriceTaxMode
  supplierState: string
  gstin?: string
  gstStatus: GstRegistrationStatus
  fssaiLicense?: string
  createdBy?: string
  approvedBy?: string
  createdAt: string
  updatedAt: string
}

// 2. Fee Rule Interface
export interface FeeRule {
  id: string
  feeType: FeeType
  name: string
  calculationType: FeeCalculationType
  amount: number // flat or percentage
  payer: CommercialPayer
  taxable: boolean
  taxRate: number // default 18% for platform fees
  effectiveFrom: string
  effectiveUntil?: string | null
}

// 3. Category & Item Commission Override Rule
export interface ItemCommissionOverride {
  id: string
  restaurantId: string
  categoryId?: string
  itemId?: string
  commissionModel: CommissionModel
  commissionRate: number
  hsnSacCode?: string
  taxCategory?: string
  taxRate?: number
  priceTaxMode?: PriceTaxMode
}

// 4. Input for Pricing Engine
export interface PriceCalculationInput {
  orderId?: string
  restaurantId: string
  restaurantName: string
  supplierState?: string
  customerState?: string
  customerGstin?: string
  items: Array<{
    id?: string
    name: string
    category?: string
    quantity: number
    price: number // selling price per unit
    mrp?: number
    hsnSacCode?: string
    taxCategory?: string
    taxRate?: number // e.g. 5 for 5% food GST
    priceTaxMode?: PriceTaxMode
    customCommissionRate?: number
    customMarkupRate?: number
  }>
  distanceKm?: number
  tip?: number
  couponCode?: string
  couponDiscountAmount?: number
  couponFundingSource?: FundingSource
  restaurantDiscountContributionPercent?: number // e.g., 60 for 60% funded by vendor
  contract?: Partial<CommercialContract>
  feeRules?: Partial<FeeRule>[]
}

// 5. Immutable Price Snapshot Result
export interface ImmutablePriceSnapshot {
  snapshotId: string
  orderId: string
  contractNumber: string
  contractVersion: number
  currency: string
  calculatedAt: string

  // Location & Tax Context
  supplierState: string
  customerState: string
  placeOfSupply: string
  taxMode: TaxMode
  gstStatus: GstRegistrationStatus

  // Items Breakdown
  items: Array<{
    name: string
    hsnSacCode: string
    quantity: number
    unitPrice: number
    grossAmount: number
    taxMode: PriceTaxMode
    taxableBase: number
    taxRate: number
    gstAmount: number
    cgstAmount: number
    sgstAmount: number
    igstAmount: number
    netItemTotal: number
    commissionRate: number
    commissionAmount: number
    markupRate?: number
    markupAmount?: number
  }>

  // Customer Financial Breakdown
  subtotal: number
  grossDiscount: number
  restaurantDiscount: number
  platformDiscount: number
  netItemSubtotal: number

  commercialModel: CommercialModel
  commissionRate: number
  markupRate: number
  markupAmount: number

  packagingFee: number
  deliveryFee: number
  platformFee: number
  handlingFee: number
  surgeFee: number
  totalFees: number

  foodTaxableBase: number
  foodGstTotal: number
  foodCgst: number
  foodSgst: number
  foodIgst: number

  platformServiceTaxableBase: number
  platformServiceGst: number // 18% GST on platform fee + delivery fee if applicable

  tip: number
  customerPayable: number

  // Commercial Commission Breakdown (Platform vs Restaurant)
  commissionBasis: CommissionBasis
  grossCommission: number
  commissionGst: number // 18% GST on platform commission
  totalCommissionDeduction: number

  // Restaurant Payable Breakdown
  restaurantGrossSales: number
  restaurantNetDiscounts: number
  restaurantNetSales: number
  restaurantPackagingFeeShare: number
  restaurantPayableGross: number
  restaurantPayableNet: number // Final payout amount to bank account

  // Platform Revenue Breakdown
  platformGrossRevenue: number // Commission + Markup + Fees
  platformServiceGstLiability: number
  platformNetRevenue: number
}

// Default Platform Commercial Contract fallback
export const DEFAULT_COMMERCIAL_CONTRACT: CommercialContract = {
  id: 'contract_default_01',
  restaurantId: 'default',
  contractNumber: 'CRV-CC-2026-001',
  version: 1,
  status: 'ACTIVE',
  effectiveFrom: '2026-01-01T00:00:00Z',
  effectiveUntil: null,
  currency: 'INR',
  commercialModel: 'commission',
  commissionModel: 'PERCENTAGE',
  commissionRate: 15,
  markupRate: 0,
  fixedCommissionAmount: 0,
  fixedMarkupAmount: 0,
  commissionBasis: 'ORDER_SUBTOTAL',
  commissionPayer: 'RESTAURANT',
  priceTaxMode: 'TAX_INCLUSIVE',
  supplierState: 'Karnataka',
  gstStatus: 'REGISTERED',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

/**
 * Derives Taxable Base & GST Amount depending on Tax Inclusive or Exclusive Mode
 * Conforms to Section 23 & 24 of commercial-engine.md
 */
export function calculateTaxBase(amount: number, taxRatePercent: number, mode: PriceTaxMode) {
  if (taxRatePercent <= 0 || amount <= 0) {
    return { taxableBase: amount, gstAmount: 0, totalAmount: amount }
  }

  if (mode === 'TAX_INCLUSIVE') {
    // Base = P / (1 + R/100)
    const taxableBase = Math.round((amount / (1 + taxRatePercent / 100)) * 100) / 100
    const gstAmount = Math.round((amount - taxableBase) * 100) / 100
    return { taxableBase, gstAmount, totalAmount: amount }
  } else {
    // Exclusive: Base = P, Tax = P * (R/100)
    const taxableBase = amount
    const gstAmount = Math.round(((amount * taxRatePercent) / 100) * 100) / 100
    const totalAmount = Math.round((taxableBase + gstAmount) * 100) / 100
    return { taxableBase, gstAmount, totalAmount }
  }
}

/**
 * Resolves CGST/SGST vs IGST split based on Supplier State vs Customer State
 * Conforms to Section 25 of commercial-engine.md
 */
export function resolveTaxSplit(taxAmount: number, supplierState: string, customerState: string) {
  const isIntraState =
    supplierState.trim().toLowerCase() === customerState.trim().toLowerCase() ||
    !customerState ||
    !supplierState

  if (isIntraState) {
    const cgst = Math.round((taxAmount / 2) * 100) / 100
    const sgst = Math.round((taxAmount - cgst) * 100) / 100
    return { taxMode: 'CGST_SGST' as TaxMode, cgst, sgst, igst: 0 }
  } else {
    return { taxMode: 'IGST' as TaxMode, cgst: 0, sgst: 0, igst: taxAmount }
  }
}

/**
 * Master Pricing Engine calculation conforming to the 18-step Workflow in Section 30
 */
export function calculateOrderPriceSnapshot(input: PriceCalculationInput): ImmutablePriceSnapshot {
  const contract: CommercialContract = {
    ...DEFAULT_COMMERCIAL_CONTRACT,
    ...input.contract,
  }

  const supplierState = input.supplierState || contract.supplierState || 'Karnataka'
  const customerState = input.customerState || supplierState
  const placeOfSupply = customerState

  const snapshotId = `snp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const orderId = input.orderId || `CRV-${Date.now().toString().slice(-6)}`

  const commercialModel = contract.commercialModel || 'commission'
  const isCommissionApplicable = commercialModel === 'commission' || commercialModel === 'hybrid'
  const isMarkupApplicable = commercialModel === 'markup' || commercialModel === 'hybrid'

  const effectiveCommissionRate = isCommissionApplicable ? (contract.commissionRate ?? 15) : 0
  const effectiveMarkupRate = isMarkupApplicable ? (contract.markupRate ?? 0) : 0

  // 1. Calculate Items & Taxes
  let rawSubtotal = 0
  let totalFoodTaxableBase = 0
  let totalFoodGst = 0
  let totalFoodCgst = 0
  let totalFoodSgst = 0
  let totalFoodIgst = 0
  let totalCommissionFromItems = 0

  const processedItems = input.items.map((item) => {
    const qty = Math.max(1, item.quantity || 1)
    const unitPrice = Math.max(0, item.price || 0)
    const grossAmount = unitPrice * qty
    rawSubtotal += grossAmount

    const taxMode = item.priceTaxMode || contract.priceTaxMode || 'TAX_INCLUSIVE'
    const taxRate = item.taxRate ?? 5 // default 5% food GST
    const hsnSacCode = item.hsnSacCode || '996331' // Restaurant service HSN/SAC

    const taxCalc = calculateTaxBase(grossAmount, taxRate, taxMode)
    const split = resolveTaxSplit(taxCalc.gstAmount, supplierState, customerState)

    totalFoodTaxableBase += taxCalc.taxableBase
    totalFoodGst += taxCalc.gstAmount
    totalFoodCgst += split.cgst
    totalFoodSgst += split.sgst
    totalFoodIgst += split.igst

    // Item-level commission override or contract commission
    const commRate = isCommissionApplicable
      ? (item.customCommissionRate ?? effectiveCommissionRate)
      : 0
    const itemCommission = (grossAmount * commRate) / 100
    totalCommissionFromItems += itemCommission

    const mkpRate = isMarkupApplicable ? (item.customMarkupRate ?? effectiveMarkupRate) : 0
    const itemMarkup = (grossAmount * mkpRate) / 100

    return {
      name: item.name,
      hsnSacCode,
      quantity: qty,
      unitPrice,
      grossAmount,
      taxMode,
      taxableBase: taxCalc.taxableBase,
      taxRate,
      gstAmount: taxCalc.gstAmount,
      cgstAmount: split.cgst,
      sgstAmount: split.sgst,
      igstAmount: split.igst,
      netItemTotal: taxCalc.totalAmount,
      commissionRate: commRate,
      commissionAmount: itemCommission,
      markupRate: mkpRate,
      markupAmount: itemMarkup,
    }
  })

  // 2. Discount Allocation (Section 17 & 18)
  const grossDiscount = Math.min(rawSubtotal, Math.round(input.couponDiscountAmount || 0))
  const restContribPct = input.restaurantDiscountContributionPercent ?? 50
  const restaurantDiscount = Math.round((grossDiscount * restContribPct) / 100)
  const platformDiscount = Math.round(grossDiscount - restaurantDiscount)
  const netItemSubtotal = Math.max(0, rawSubtotal - grossDiscount)

  // Markup amount calculated on gross item subtotal
  const markupAmount = isMarkupApplicable
    ? Math.round((rawSubtotal * effectiveMarkupRate) / 100) + (contract.fixedMarkupAmount || 0)
    : 0

  // 3. Fees Calculation
  const packagingFee = 20
  const deliveryFee = 35
  const platformFee = 6
  const handlingFee = 5
  const surgeFee = 0
  const totalFees = packagingFee + deliveryFee + platformFee + handlingFee + surgeFee

  // Platform service tax (18% GST on platform service fees: platformFee + handlingFee)
  const platformServiceTaxableBase = platformFee + handlingFee
  const platformServiceGst = Math.round(platformServiceTaxableBase * 0.18 * 100) / 100

  const tip = Math.max(0, input.tip || 0)

  // 4. Customer Payable Total (Includes markupAmount when operating under markup/hybrid model)
  const customerPayable = Math.round(
    netItemSubtotal +
      markupAmount +
      packagingFee +
      deliveryFee +
      platformFee +
      handlingFee +
      totalFoodGst +
      platformServiceGst +
      tip
  )

  // 5. Platform Commission & Tax (Section 28)
  const grossCommission = isCommissionApplicable
    ? Math.round(
        contract.commissionModel === 'FIXED'
          ? contract.fixedCommissionAmount || 50
          : (rawSubtotal * effectiveCommissionRate) / 100
      )
    : 0
  const commissionGst = Math.round(grossCommission * 0.18 * 100) / 100 // 18% GST on platform service charge
  const totalCommissionDeduction = grossCommission + commissionGst

  // 6. Restaurant Payable / Settlement (Section 30)
  const restaurantGrossSales = rawSubtotal
  const restaurantNetDiscounts = restaurantDiscount
  const restaurantNetSales = restaurantGrossSales - restaurantNetDiscounts
  const restaurantPackagingFeeShare = packagingFee
  const restaurantPayableGross = restaurantNetSales + restaurantPackagingFeeShare
  const restaurantPayableNet = Math.max(
    0,
    Math.round(restaurantPayableGross - totalCommissionDeduction)
  )

  // 7. Platform Economics
  const platformGrossRevenue = grossCommission + markupAmount + platformFee + handlingFee
  const platformServiceGstLiability = commissionGst + platformServiceGst
  const platformNetRevenue = Math.round(platformGrossRevenue - platformDiscount)

  return {
    snapshotId,
    orderId,
    contractNumber: contract.contractNumber,
    contractVersion: contract.version,
    currency: contract.currency || 'INR',
    calculatedAt: new Date().toISOString(),

    supplierState,
    customerState,
    placeOfSupply,
    taxMode: resolveTaxSplit(totalFoodGst, supplierState, customerState).taxMode,
    gstStatus: contract.gstStatus,

    items: processedItems,

    subtotal: rawSubtotal,
    grossDiscount,
    restaurantDiscount,
    platformDiscount,
    netItemSubtotal,

    commercialModel,
    commissionRate: effectiveCommissionRate,
    markupRate: effectiveMarkupRate,
    markupAmount,

    packagingFee,
    deliveryFee,
    platformFee,
    handlingFee,
    surgeFee,
    totalFees,

    foodTaxableBase: totalFoodTaxableBase,
    foodGstTotal: totalFoodGst,
    foodCgst: totalFoodCgst,
    foodSgst: totalFoodSgst,
    foodIgst: totalFoodIgst,

    platformServiceTaxableBase,
    platformServiceGst,

    tip,
    customerPayable,

    commissionBasis: contract.commissionBasis,
    grossCommission,
    commissionGst,
    totalCommissionDeduction,

    restaurantGrossSales,
    restaurantNetDiscounts,
    restaurantNetSales,
    restaurantPackagingFeeShare,
    restaurantPayableGross,
    restaurantPayableNet,

    platformGrossRevenue,
    platformServiceGstLiability,
    platformNetRevenue,
  }
}

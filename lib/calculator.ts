import { PaymentConfig, DEFAULT_PAYMENT_CONFIG } from './payment-config'

export interface CalculatorInput {
  subtotal: number
  distanceKm: number
  packagingFee?: number
  tip?: number
  restaurantId?: string
  restaurantName?: string
  commercialModel?: 'commission' | 'markup' | 'hybrid' | string
  vendorCommissionPercent?: number
  markupPercent?: number
  fixedCommission?: number
  fixedMarkup?: number
  priceTaxMode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE' | string
  couponCode?: string
  platformFee?: number
  handlingFee?: number
  baseDeliveryFee?: number
  baseDistanceKm?: number
  perKmRate?: number
  freeDeliveryThreshold?: number
  driverPayoutSharePercent?: number
  surgeMultiplier?: number
  rainFee?: number
  nightSurgeFee?: number
  isRainModeActive?: boolean
  isNightSurgeActive?: boolean
  gstRatePercent?: number
}

export interface CustomerBillingBreakdown {
  subtotal: number
  markupAmount: number
  customerFoodSubtotal: number
  packagingFee: number
  baseDeliveryFee: number
  extraDistanceFee: number
  surgeFee: number
  rainFee: number
  nightSurgeFee: number
  grossDeliveryFee: number
  isFreeDelivery: boolean
  netDeliveryFee: number
  platformFee: number
  handlingFee: number
  couponDiscount: number
  gstAmount: number
  exactGst?: number
  roundingAdjustment: number
  tip: number
  grandTotal: number
}

export interface VendorSettlementBreakdown {
  restaurantName: string
  grossSales: number
  commercialModel: string
  commissionRatePercent: number
  commissionDeducted: number
  markupDeducted: number
  netVendorPayout: number
}

export interface DriverEarningsBreakdown {
  deliveryFeeCollected: number
  driverSharePercent: number
  baseDistanceShare: number
  extraDistanceShare: number
  surgeRainShare: number
  tip: number
  totalDriverEarnings: number
}

export interface PlatformEconomicsBreakdown {
  totalCollectedFromCustomer: number
  totalPaidToVendor: number
  totalPaidToDriver: number
  totalGstCollected: number
  platformGrossRevenue: number
  platformNetProfit: number
  profitMarginPercent: number
}

export interface FullCalculatorResult {
  input: CalculatorInput
  customerBilling: CustomerBillingBreakdown
  vendorSettlement: VendorSettlementBreakdown
  driverEarnings: DriverEarningsBreakdown
  platformEconomics: PlatformEconomicsBreakdown
  timestamp: string
}

/**
 * Commercial Engine Financial & Unit Economics Calculator
 */
export function calculateFullBreakdown(
  input: CalculatorInput,
  couponDetails?: {
    discount_type: 'percentage' | 'flat'
    discount_value: number
    max_discount?: number | null
    min_order_amount?: number
  }
): FullCalculatorResult {
  const subtotal = Math.max(0, input.subtotal || 0)
  const distanceKm = Math.max(0, input.distanceKm || 0)
  const packagingFee = Math.max(0, input.packagingFee ?? 20)
  const tip = Math.max(0, input.tip || 0)

  // Commercial Model & Restaurant Parameters
  const commercialModel = (input.commercialModel || 'commission').toLowerCase()
  const markupPercent = Math.max(0, input.markupPercent || 0)
  const fixedMarkup = Math.max(0, input.fixedMarkup || 0)
  const fixedCommission = Math.max(0, input.fixedCommission || 0)

  // Markup Engine Calculation
  let markupAmount = 0
  if (commercialModel === 'markup' || commercialModel === 'hybrid') {
    markupAmount = Math.ceil((subtotal * markupPercent) / 100 + fixedMarkup)
  }
  const customerFoodSubtotal = subtotal + markupAmount

  // System Payment Config parameters with fallbacks
  const baseDeliveryFee = input.baseDeliveryFee ?? DEFAULT_PAYMENT_CONFIG.baseDeliveryFee
  const baseDistanceKm = input.baseDistanceKm ?? DEFAULT_PAYMENT_CONFIG.baseDistanceKm
  const perKmRate = input.perKmRate ?? DEFAULT_PAYMENT_CONFIG.perKmRate
  const freeDeliveryThreshold =
    input.freeDeliveryThreshold ?? DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold
  const platformFee = input.platformFee ?? DEFAULT_PAYMENT_CONFIG.platformFee
  const handlingFee = input.handlingFee ?? DEFAULT_PAYMENT_CONFIG.handlingFee
  const vendorCommissionPercent =
    input.vendorCommissionPercent ?? DEFAULT_PAYMENT_CONFIG.vendorCommission
  const driverPayoutSharePercent =
    input.driverPayoutSharePercent ?? DEFAULT_PAYMENT_CONFIG.driverPayoutShare
  const surgeMultiplier = input.surgeMultiplier ?? DEFAULT_PAYMENT_CONFIG.surgeMultiplier
  const isRainModeActive = input.isRainModeActive ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive
  const isNightSurgeActive = input.isNightSurgeActive ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive
  const rainFeeValue = isRainModeActive ? (input.rainFee ?? DEFAULT_PAYMENT_CONFIG.rainFee) : 0
  const nightSurgeFeeValue = isNightSurgeActive
    ? (input.nightSurgeFee ?? DEFAULT_PAYMENT_CONFIG.nightSurgeFee)
    : 0
  const gstRate = (input.gstRatePercent ?? 5) / 100

  // 1. Delivery Fee Calculation
  const extraDistanceKm = Math.max(0, distanceKm - baseDistanceKm)
  const extraDistanceFee = Math.ceil(Math.ceil(extraDistanceKm) * perKmRate)
  const basePlusDistance = baseDeliveryFee + extraDistanceFee
  const surgeMultiplierAdd = Math.max(0, surgeMultiplier - 1.0)
  const surgeFee = Math.ceil(basePlusDistance * surgeMultiplierAdd)
  const grossDeliveryFee = basePlusDistance + surgeFee + rainFeeValue + nightSurgeFeeValue

  const isFreeDelivery = freeDeliveryThreshold > 0 && customerFoodSubtotal >= freeDeliveryThreshold
  const netDeliveryFee = isFreeDelivery ? 0 : grossDeliveryFee

  // 2. Coupon Discount Calculation
  let couponDiscount = 0
  if (couponDetails && customerFoodSubtotal >= (couponDetails.min_order_amount || 0)) {
    if (couponDetails.discount_type === 'percentage') {
      const calculated = (customerFoodSubtotal * couponDetails.discount_value) / 100
      couponDiscount = couponDetails.max_discount
        ? Math.min(calculated, couponDetails.max_discount)
        : calculated
    } else {
      couponDiscount = couponDetails.discount_value
    }
  }
  couponDiscount = Math.min(customerFoodSubtotal, Math.ceil(couponDiscount))

  // 3. GST Calculation
  const taxableFoodSubtotal = Math.max(0, customerFoodSubtotal - couponDiscount)
  const exactGst = (taxableFoodSubtotal + packagingFee) * gstRate
  const gstAmount = Math.ceil(exactGst)

  // 4. Grand Total Collected from Customer
  const exactTotal =
    taxableFoodSubtotal + packagingFee + netDeliveryFee + platformFee + handlingFee + exactGst + tip
  const grandTotal = Math.ceil(exactTotal)
  const roundingAdjustment = Math.max(0, Number((grandTotal - exactTotal).toFixed(2)))

  const customerBilling: CustomerBillingBreakdown = {
    subtotal,
    markupAmount,
    customerFoodSubtotal,
    packagingFee,
    baseDeliveryFee,
    extraDistanceFee,
    surgeFee,
    rainFee: rainFeeValue,
    nightSurgeFee: nightSurgeFeeValue,
    grossDeliveryFee,
    isFreeDelivery,
    netDeliveryFee,
    platformFee,
    handlingFee,
    couponDiscount,
    gstAmount,
    exactGst: Number(exactGst.toFixed(2)),
    roundingAdjustment,
    tip,
    grandTotal,
  }

  // 5. Vendor Settlement Math
  let commissionDeducted = 0
  if (commercialModel === 'commission' || commercialModel === 'hybrid') {
    commissionDeducted = Math.ceil((subtotal * vendorCommissionPercent) / 100 + fixedCommission)
  }
  const netVendorPayout = Math.max(0, subtotal - commissionDeducted)

  const vendorSettlement: VendorSettlementBreakdown = {
    restaurantName: input.restaurantName || 'Partner Restaurant',
    grossSales: subtotal,
    commercialModel,
    commissionRatePercent: vendorCommissionPercent,
    commissionDeducted,
    markupDeducted: markupAmount,
    netVendorPayout,
  }

  // 6. Driver Earnings Math
  const deliveryShareMultiplier = driverPayoutSharePercent / 100
  const baseDistanceShare = Math.ceil(baseDeliveryFee * deliveryShareMultiplier)
  const extraDistanceShare = Math.ceil(extraDistanceFee * deliveryShareMultiplier)
  const surgeRainShare = Math.ceil(
    (surgeFee + rainFeeValue + nightSurgeFeeValue) * deliveryShareMultiplier
  )
  const totalDriverEarnings = Math.ceil(grossDeliveryFee * deliveryShareMultiplier + tip)

  const driverEarnings: DriverEarningsBreakdown = {
    deliveryFeeCollected: grossDeliveryFee,
    driverSharePercent: driverPayoutSharePercent,
    baseDistanceShare,
    extraDistanceShare,
    surgeRainShare,
    tip,
    totalDriverEarnings,
  }

  // 7. Platform Economics & Profit Margin Math
  const totalCollectedFromCustomer = grandTotal
  const totalPaidToVendor = netVendorPayout
  const totalPaidToDriver = totalDriverEarnings
  const totalGstCollected = gstAmount

  const platformGrossRevenue = Math.ceil(
    platformFee +
      handlingFee +
      commissionDeducted +
      markupAmount +
      grossDeliveryFee * (1 - deliveryShareMultiplier)
  )
  const platformNetProfit = Math.ceil(
    totalCollectedFromCustomer -
      totalPaidToVendor -
      totalPaidToDriver -
      totalGstCollected -
      packagingFee
  )

  const profitMarginPercent =
    totalCollectedFromCustomer > 0
      ? Number(((platformNetProfit / totalCollectedFromCustomer) * 100).toFixed(1))
      : 0

  const platformEconomics: PlatformEconomicsBreakdown = {
    totalCollectedFromCustomer,
    totalPaidToVendor,
    totalPaidToDriver,
    totalGstCollected,
    platformGrossRevenue,
    platformNetProfit,
    profitMarginPercent,
  }

  return {
    input,
    customerBilling,
    vendorSettlement,
    driverEarnings,
    platformEconomics,
    timestamp: new Date().toISOString(),
  }
}

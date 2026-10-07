import { PaymentConfig, DEFAULT_PAYMENT_CONFIG } from './payment-config'

export interface CalculatorInput {
  subtotal: number
  distanceKm: number
  packagingFee?: number
  tip?: number
  restaurantId?: string
  restaurantName?: string
  vendorCommissionPercent?: number
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
  tip: number
  grandTotal: number
}

export interface VendorSettlementBreakdown {
  restaurantName: string
  grossSales: number
  commissionRatePercent: number
  commissionDeducted: number
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
  Full financial & unit economics calculator function
 */
export function calculateFullBreakdown(
  input: CalculatorInput,
  couponDetails?: { discount_type: 'percentage' | 'flat'; discount_value: number; max_discount?: number | null; min_order_amount?: number }
): FullCalculatorResult {
  const subtotal = Math.max(0, input.subtotal || 0)
  const distanceKm = Math.max(0, input.distanceKm || 0)
  const packagingFee = Math.max(0, input.packagingFee ?? 20)
  const tip = Math.max(0, input.tip || 0)

  // Config parameters with fallbacks
  const baseDeliveryFee = input.baseDeliveryFee ?? DEFAULT_PAYMENT_CONFIG.baseDeliveryFee
  const baseDistanceKm = input.baseDistanceKm ?? DEFAULT_PAYMENT_CONFIG.baseDistanceKm
  const perKmRate = input.perKmRate ?? DEFAULT_PAYMENT_CONFIG.perKmRate
  const freeDeliveryThreshold = input.freeDeliveryThreshold ?? DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold
  const platformFee = input.platformFee ?? DEFAULT_PAYMENT_CONFIG.platformFee
  const handlingFee = input.handlingFee ?? DEFAULT_PAYMENT_CONFIG.handlingFee
  const vendorCommissionPercent = input.vendorCommissionPercent ?? DEFAULT_PAYMENT_CONFIG.vendorCommission
  const driverPayoutSharePercent = input.driverPayoutSharePercent ?? DEFAULT_PAYMENT_CONFIG.driverPayoutShare
  const surgeMultiplier = input.surgeMultiplier ?? DEFAULT_PAYMENT_CONFIG.surgeMultiplier
  const isRainModeActive = input.isRainModeActive ?? DEFAULT_PAYMENT_CONFIG.isRainModeActive
  const isNightSurgeActive = input.isNightSurgeActive ?? DEFAULT_PAYMENT_CONFIG.isNightSurgeActive
  const rainFeeValue = isRainModeActive ? (input.rainFee ?? DEFAULT_PAYMENT_CONFIG.rainFee) : 0
  const nightSurgeFeeValue = isNightSurgeActive ? (input.nightSurgeFee ?? DEFAULT_PAYMENT_CONFIG.nightSurgeFee) : 0
  const gstRate = (input.gstRatePercent ?? 18) / 100

  // 1. Delivery Fee Math
  const extraDistanceKm = Math.max(0, distanceKm - baseDistanceKm)
  const extraDistanceFee = Math.round(Math.ceil(extraDistanceKm) * perKmRate)
  const basePlusDistance = baseDeliveryFee + extraDistanceFee
  const surgeMultiplierAdd = Math.max(0, surgeMultiplier - 1.0)
  const surgeFee = Math.round(basePlusDistance * surgeMultiplierAdd)
  const grossDeliveryFee = basePlusDistance + surgeFee + rainFeeValue + nightSurgeFeeValue

  const isFreeDelivery = freeDeliveryThreshold > 0 && subtotal >= freeDeliveryThreshold
  const netDeliveryFee = isFreeDelivery ? 0 : grossDeliveryFee

  // 2. Coupon Discount Calculation
  let couponDiscount = 0
  if (couponDetails && subtotal >= (couponDetails.min_order_amount || 0)) {
    if (couponDetails.discount_type === 'percentage') {
      const calculated = (subtotal * couponDetails.discount_value) / 100
      couponDiscount = couponDetails.max_discount
        ? Math.min(calculated, couponDetails.max_discount)
        : calculated
    } else {
      couponDiscount = couponDetails.discount_value
    }
  }
  couponDiscount = Math.min(subtotal, Math.round(couponDiscount))

  // 3. GST Math
  const taxableFoodSubtotal = Math.max(0, subtotal - couponDiscount)
  const gstAmount = Math.round((taxableFoodSubtotal + packagingFee) * gstRate)

  // 4. Grand Total Collected from Customer
  const grandTotal = Math.round(
    taxableFoodSubtotal + packagingFee + netDeliveryFee + platformFee + handlingFee + gstAmount + tip
  )

  const customerBilling: CustomerBillingBreakdown = {
    subtotal,
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
    tip,
    grandTotal,
  }

  // 5. Vendor Settlement Math
  const commissionDeducted = Math.round((subtotal * vendorCommissionPercent) / 100)
  const netVendorPayout = Math.max(0, subtotal - commissionDeducted)

  const vendorSettlement: VendorSettlementBreakdown = {
    restaurantName: input.restaurantName || 'Partner Restaurant',
    grossSales: subtotal,
    commissionRatePercent: vendorCommissionPercent,
    commissionDeducted,
    netVendorPayout,
  }

  // 6. Driver Earnings Math
  const deliveryShareMultiplier = driverPayoutSharePercent / 100
  const baseDistanceShare = Math.round(baseDeliveryFee * deliveryShareMultiplier)
  const extraDistanceShare = Math.round(extraDistanceFee * deliveryShareMultiplier)
  const surgeRainShare = Math.round((surgeFee + rainFeeValue + nightSurgeFeeValue) * deliveryShareMultiplier)
  const totalDriverEarnings = Math.round((grossDeliveryFee * deliveryShareMultiplier) + tip)

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

  const platformGrossRevenue = Math.round(
    platformFee + handlingFee + commissionDeducted + (grossDeliveryFee * (1 - deliveryShareMultiplier))
  )
  const platformNetProfit = Math.round(
    totalCollectedFromCustomer - totalPaidToVendor - totalPaidToDriver - totalGstCollected - packagingFee
  )

  const profitMarginPercent = totalCollectedFromCustomer > 0
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

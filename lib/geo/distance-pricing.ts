/**
 * Distance Calculation & Admin-Configured Pricing Engine
 * Computes road travel distance (via OSRM road network routing) and customer checkout billing.
 */
import { DEFAULT_PAYMENT_CONFIG, PaymentConfig } from '@/lib/payment-config'
import { calculateHaversineDistanceKm } from '@/lib/utils'

// Re-export for backward compatibility with tests and other modules
export { calculateEstimatedEtaMinutes, calculateHaversineDistanceKm } from '@/lib/utils'

export interface CheckoutPricingBreakdown {
  cartSubtotal: number
  roadDistanceKm: number
  baseDeliveryFee: number
  extraKmFee: number
  surgeFee: number
  rainFee: number
  nightSurgeFee: number
  deliveryFee: number
  isFreeDelivery: boolean
  packagingFee: number
  handlingFee: number
  platformFee: number
  gstAmount: number
  exactGst?: number
  roundingAdjustment: number
  couponDiscount: number
  grandTotal: number
  driverEarnings?: {
    deliveryFeeCollected: number
    driverSharePercent: number
    baseDistanceShare: number
    extraDistanceShare: number
    surgeRainShare: number
    totalDriverEarnings: number
  }
}

/**
 * Calculates estimated road travel distance accounting for urban road circuity (~1.3x straight-line distance).
 * Defaults to 1.8 km minimum if coordinates are equal or missing.
 */
export function calculateRoadTravelDistanceKm(
  restLat?: number | null,
  restLng?: number | null,
  destLat?: number | null,
  destLng?: number | null
): number {
  if (
    restLat == null ||
    restLng == null ||
    destLat == null ||
    destLng == null ||
    isNaN(restLat) ||
    isNaN(restLng) ||
    isNaN(destLat) ||
    isNaN(destLng) ||
    (restLat === 0 && restLng === 0) ||
    (destLat === 0 && destLng === 0)
  ) {
    return 1.8
  }

  const directKm = calculateHaversineDistanceKm(restLat, restLng, destLat, destLng)
  if (directKm <= 0.05) return 1.8

  // Urban road circuity factor: ~1.3x straight-line distance for road travel over street network
  const roadKm = Number((directKm * 1.3).toFixed(1))
  return Math.max(1.0, roadKm)
}

/**
 * Queries OSRM Road Routing Engine to fetch actual driving distance over real road networks (in kilometers).
 * Falls back to estimated road network distance if OSRM is unreachable or coordinates are invalid.
 */
export async function fetchOSRMDrivingDistanceKm(
  restLat?: number | null,
  restLng?: number | null,
  destLat?: number | null,
  destLng?: number | null
): Promise<number> {
  if (
    restLat == null ||
    restLng == null ||
    destLat == null ||
    destLng == null ||
    isNaN(restLat) ||
    isNaN(restLng) ||
    isNaN(destLat) ||
    isNaN(destLng) ||
    (restLat === 0 && restLng === 0) ||
    (destLat === 0 && destLng === 0)
  ) {
    return 1.8
  }

  try {
    if (typeof fetch === 'undefined' && typeof globalThis.fetch === 'undefined') {
      return calculateRoadTravelDistanceKm(restLat, restLng, destLat, destLng)
    }
    const fetchFn = typeof fetch !== 'undefined' ? fetch : globalThis.fetch
    const url = `https://router.project-osrm.org/route/v1/driving/${restLng},${restLat};${destLng},${destLat}?overview=false`
    const res = await fetchFn(url, {
      signal: AbortSignal?.timeout ? AbortSignal.timeout(3000) : undefined,
    })
    if (res && res.ok) {
      const data = await res.json()
      if (data?.routes?.[0]?.distance != null) {
        const meters = Number(data.routes[0].distance)
        const km = Number((meters / 1000).toFixed(1))
        if (km > 0.05) return km
      }
    }
  } catch (err) {
    // Fallback to road network estimation if OSRM endpoint times out or fails
  }

  return calculateRoadTravelDistanceKm(restLat, restLng, destLat, destLng)
}

import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'

/**
 * Calculates comprehensive customer checkout billing according to Admin Payment Configuration.
 */
export function calculateCheckoutPricing(params: {
  cartSubtotal: number
  roadDistanceKm: number
  config?: Partial<PaymentConfig> | Record<string, any> | null
  couponDiscount?: number
  packagingFee?: number
  gstRatePercent?: number
}): CheckoutPricingBreakdown {
  const cfg: any = params.config || DEFAULT_PAYMENT_CONFIG
  const subtotal = Math.max(0, Number(params.cartSubtotal) || 0)
  const distKm = Math.max(0.1, Number(params.roadDistanceKm) || 1.8)
  const discount = Math.max(0, Number(params.couponDiscount) || 0)

  const input: CalculatorInput = {
    subtotal,
    distanceKm: distKm,
    packagingFee: params.packagingFee ?? cfg.packagingCap ?? cfg.packaging_cap ?? 20,
    gstRatePercent: params.gstRatePercent ?? cfg.gstRatePercent ?? cfg.gst_rate_percent ?? 5,
    platformFee: cfg.platformFee ?? cfg.platform_fee,
    handlingFee: cfg.handlingFee ?? cfg.handling_fee,
    vendorCommissionPercent: cfg.vendorCommission ?? cfg.vendor_commission,
    baseDeliveryFee: cfg.baseDeliveryFee ?? cfg.delivery_fee,
    baseDistanceKm: cfg.baseDistanceKm ?? cfg.base_distance_km,
    perKmRate: cfg.perKmRate ?? cfg.per_km_rate,
    freeDeliveryThreshold: cfg.freeDeliveryThreshold ?? cfg.free_delivery_threshold,
    driverPayoutSharePercent: cfg.driverPayoutShare ?? cfg.driver_payout_share,
    surgeMultiplier: cfg.surgeMultiplier ?? cfg.surge_multiplier,
    rainFee: cfg.rainFee ?? cfg.rain_fee,
    nightSurgeFee: cfg.nightSurgeFee ?? cfg.night_surge_fee,
    isRainModeActive: cfg.isRainModeActive ?? cfg.is_rain_mode_active,
    isNightSurgeActive: cfg.isNightSurgeActive ?? cfg.is_night_surge_active,
  }

  const result = calculateFullBreakdown(
    input,
    discount > 0 ? { discount_type: 'flat', discount_value: discount } : undefined
  )
  const b = result.customerBilling
  const d = result.driverEarnings

  return {
    cartSubtotal: b.subtotal,
    roadDistanceKm: distKm,
    baseDeliveryFee: b.baseDeliveryFee,
    extraKmFee: b.extraDistanceFee,
    surgeFee: b.surgeFee,
    rainFee: b.rainFee,
    nightSurgeFee: b.nightSurgeFee,
    deliveryFee: b.netDeliveryFee,
    isFreeDelivery: b.isFreeDelivery,
    packagingFee: b.packagingFee,
    handlingFee: b.handlingFee,
    platformFee: b.platformFee,
    gstAmount: b.gstAmount,
    exactGst: b.exactGst,
    roundingAdjustment: b.roundingAdjustment,
    couponDiscount: b.couponDiscount,
    grandTotal: b.grandTotal,
    driverEarnings: {
      deliveryFeeCollected: d.deliveryFeeCollected,
      driverSharePercent: d.driverSharePercent,
      baseDistanceShare: d.baseDistanceShare,
      extraDistanceShare: d.extraDistanceShare,
      surgeRainShare: d.surgeRainShare,
      totalDriverEarnings: d.totalDriverEarnings,
    },
  }
}

export interface ExactDeliveryEta {
  exactMinutes: number
  displayText: string
  arrivalSubtitle: string
  distanceKm: number
  isDelivered: boolean
}

/**
 * Calculates the exact delivery time and arrival SLA from the kitchen/driver to the customer.
 * Uses realistic kitchen prep time + road transit at ~30 km/h.
 * Clamps reasonable city delivery window (max 35-45 mins) even if coordinates span across regions in test mode.
 */
export function calculateExactDeliveryEta(params: {
  restaurantLat?: number | null
  restaurantLng?: number | null
  customerLat?: number | null
  customerLng?: number | null
  driverLat?: number | null
  driverLng?: number | null
  statusStep?: number
  deliveryMinutes?: number | null
  isDarkStore?: boolean
  orderCreatedAt?: string | number | Date | null
}): ExactDeliveryEta {
  const statusStep = params.statusStep ?? 1
  if (statusStep >= 4) {
    return {
      exactMinutes: 0,
      displayText: 'Delivered',
      arrivalSubtitle: 'Delivered to doorstep',
      distanceKm: 0,
      isDelivered: true,
    }
  }

  // 1. Resolve coordinates with defaults (Bengaluru central coords if unspecified)
  const restLat =
    params.restaurantLat != null && !isNaN(params.restaurantLat) && params.restaurantLat !== 0
      ? params.restaurantLat
      : 12.9716
  const restLng =
    params.restaurantLng != null && !isNaN(params.restaurantLng) && params.restaurantLng !== 0
      ? params.restaurantLng
      : 77.6412
  const custLat =
    params.customerLat != null && !isNaN(params.customerLat) && params.customerLat !== 0
      ? params.customerLat
      : 12.9716
  const custLng =
    params.customerLng != null && !isNaN(params.customerLng) && params.customerLng !== 0
      ? params.customerLng
      : 77.5946

  // 2. Road travel distance from kitchen to customer
  const distanceKm = calculateRoadTravelDistanceKm(restLat, restLng, custLat, custLng)

  // 3. Baseline prep & transit SLA
  const baselineSlaMinutes = params.deliveryMinutes ?? (params.isDarkStore ? 10 : 25)
  const prepTimeMinutes = params.isDarkStore ? 5 : Math.max(8, Math.round(baselineSlaMinutes * 0.6))

  // Real transit time at city scooter speed (~30 km/h = 2 min/km)
  const calculatedTransitMinutes = Math.max(3, Math.round(distanceKm * 2))

  // In food delivery, if distance is within normal delivery radius (<= 15 km),
  // total SLA is prep time + transit time.
  // If distance exceeds 15 km (e.g. cross-district or demo/test address),
  // delivery apps cap the estimate to the kitchen's guaranteed SLA window (e.g. 25-30 mins)
  // rather than projecting absurd multi-hour times.
  const fullTripMinutes =
    distanceKm <= 15
      ? Math.max(10, Math.min(45, prepTimeMinutes + calculatedTransitMinutes))
      : Math.max(10, Math.min(35, baselineSlaMinutes))

  let exactMinutes: number

  if (statusStep === 3) {
    // Rider on the way: kitchen prep is done, only remaining road travel matters
    if (
      params.driverLat != null &&
      params.driverLng != null &&
      !isNaN(params.driverLat) &&
      !isNaN(params.driverLng)
    ) {
      const driverDistKm = calculateRoadTravelDistanceKm(
        params.driverLat,
        params.driverLng,
        custLat,
        custLng
      )
      exactMinutes =
        driverDistKm <= 15
          ? Math.max(3, Math.min(25, Math.round(driverDistKm * 2)))
          : Math.max(5, Math.min(15, Math.round(fullTripMinutes * 0.4)))
    } else {
      exactMinutes = Math.max(5, Math.min(18, Math.round(calculatedTransitMinutes)))
    }
  } else if (statusStep === 2) {
    // Cooking / preparing in kitchen
    exactMinutes = Math.max(10, Math.round(fullTripMinutes * 0.75))
  } else {
    // Step 1: Confirmed / Payment verified
    exactMinutes = fullTripMinutes
  }

  // Arrival clock time
  const arrivalDate = new Date(Date.now() + exactMinutes * 60 * 1000)
  const arrivalTimeString = arrivalDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  return {
    exactMinutes,
    displayText: `${exactMinutes} mins`,
    arrivalSubtitle: `Arriving by ${arrivalTimeString}`,
    distanceKm: Number(distanceKm.toFixed(1)),
    isDelivered: false,
  }
}

/**
 * Distance Calculation & Admin-Configured Pricing Engine
 * Computes road travel distance (via OSRM road network routing) and customer checkout billing.
 */
import { PaymentConfig, DEFAULT_PAYMENT_CONFIG } from './payment-config'

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
 * Haversine formula for exact geographic straight-line distance calculation (in kilometers)
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(2))
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

import { calculateFullBreakdown, CalculatorInput } from './calculator'

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
    packagingFee: params.packagingFee ?? 0,
    gstRatePercent: params.gstRatePercent ?? 0,
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

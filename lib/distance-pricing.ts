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
  handlingFee: number
  platformFee: number
  couponDiscount: number
  grandTotal: number
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
    const url = `https://router.project-osrm.org/route/v1/driving/${restLng},${restLat};${destLng},${destLat}?overview=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
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

/**
 * Calculates comprehensive customer checkout billing according to Admin Payment Configuration.
 */
export function calculateCheckoutPricing(params: {
  cartSubtotal: number
  roadDistanceKm: number
  config?: Partial<PaymentConfig> | Record<string, any> | null
  couponDiscount?: number
}): CheckoutPricingBreakdown {
  const cfg: any = params.config || DEFAULT_PAYMENT_CONFIG
  const subtotal = Math.max(0, Number(params.cartSubtotal) || 0)
  const distKm = Math.max(0.1, Number(params.roadDistanceKm) || 1.8)
  const discount = Math.max(0, Number(params.couponDiscount) || 0)

  const freeThreshold = cfg.freeDeliveryThreshold ?? DEFAULT_PAYMENT_CONFIG.freeDeliveryThreshold
  const isFreeDelivery = subtotal >= freeThreshold && subtotal > 0

  let baseFee = cfg.baseDeliveryFee ?? cfg.deliveryFee ?? DEFAULT_PAYMENT_CONFIG.baseDeliveryFee
  let extraKmFee = 0
  const baseKmThreshold = cfg.baseDistanceKm ?? DEFAULT_PAYMENT_CONFIG.baseDistanceKm
  const perKmRate = cfg.perKmRate ?? DEFAULT_PAYMENT_CONFIG.perKmRate

  if (distKm > baseKmThreshold) {
    const extraDistance = Math.ceil(distKm - baseKmThreshold)
    extraKmFee = extraDistance * perKmRate
  }

  const calculatedBaseDelivery = baseFee + extraKmFee
  let deliveryBeforeSurge = isFreeDelivery ? 0 : calculatedBaseDelivery

  let surgeFee = 0
  let rainFee = 0
  let nightSurgeFee = 0

  if (!isFreeDelivery && deliveryBeforeSurge > 0) {
    if (cfg.surgeMultiplier && cfg.surgeMultiplier > 1.0) {
      surgeFee = Math.round(deliveryBeforeSurge * (cfg.surgeMultiplier - 1.0))
    }
    if (cfg.isRainModeActive) {
      rainFee = cfg.rainFee || 0
    }
    if (cfg.isNightSurgeActive) {
      nightSurgeFee = cfg.nightSurgeFee || 0
    }
  }

  const finalDeliveryFee = isFreeDelivery
    ? 0
    : deliveryBeforeSurge + surgeFee + rainFee + nightSurgeFee

  const handlingFee =
    subtotal > 0 ? (cfg.handlingFee ?? cfg.packagingCap ?? DEFAULT_PAYMENT_CONFIG.handlingFee) : 0
  const platformFee = subtotal > 0 ? (cfg.platformFee ?? DEFAULT_PAYMENT_CONFIG.platformFee) : 0

  const grandTotal = Math.max(0, subtotal + finalDeliveryFee + handlingFee + platformFee - discount)

  return {
    cartSubtotal: subtotal,
    roadDistanceKm: distKm,
    baseDeliveryFee: isFreeDelivery ? 0 : baseFee,
    extraKmFee: isFreeDelivery ? 0 : extraKmFee,
    surgeFee,
    rainFee,
    nightSurgeFee,
    deliveryFee: finalDeliveryFee,
    isFreeDelivery,
    handlingFee,
    platformFee,
    couponDiscount: Math.min(discount, subtotal),
    grandTotal,
  }
}

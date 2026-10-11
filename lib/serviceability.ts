/**
 * Delivery Serviceability Engine
 * Validates delivery coordinates against Crave's service coverage area (Bengaluru metropolitan region)
 * and verifies maximum road delivery distance from partner kitchens.
 */
import { calculateRoadTravelDistanceKm, calculateEstimatedEtaMinutes } from './distance-pricing'

export interface ServiceabilityCheckResult {
  isServiceable: boolean
  distanceKm?: number
  estimatedMinutes?: number
  reason?: string
}

// Greater Bengaluru Metropolitan Service Boundary
export const BENGALURU_SERVICE_BOUNDS = {
  minLat: 12.60,
  maxLat: 13.35,
  minLng: 77.20,
  maxLng: 77.95,
}

// Maximum practical delivery radius from a partner kitchen (in kilometers)
export const MAX_RESTAURANT_DELIVERY_RADIUS_KM = 25.0

/**
 * Validates if coordinates are geographically valid
 */
export function isValidCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  if (lat === 0 && lng === 0) return false
  return true
}

/**
 * Validates if coordinates fall within Crave's citywide operating coverage
 */
export function isWithinCityServiceBounds(lat: number, lng: number): boolean {
  if (!isValidCoordinate(lat, lng)) return false
  return (
    lat >= BENGALURU_SERVICE_BOUNDS.minLat &&
    lat <= BENGALURU_SERVICE_BOUNDS.maxLat &&
    lng >= BENGALURU_SERVICE_BOUNDS.minLng &&
    lng <= BENGALURU_SERVICE_BOUNDS.maxLng
  )
}

/**
 * Comprehensive serviceability check for customer delivery addresses
 */
export function checkDeliveryServiceability(params: {
  customerLat?: number | null
  customerLng?: number | null
  restaurantLat?: number | null
  restaurantLng?: number | null
}): ServiceabilityCheckResult {
  const { customerLat, customerLng, restaurantLat, restaurantLng } = params

  if (!isValidCoordinate(customerLat, customerLng)) {
    return {
      isServiceable: false,
      reason: 'Invalid or missing delivery coordinates. Please pick a location on the map.',
    }
  }

  const cLat = customerLat!
  const cLng = customerLng!

  // 1. Check citywide coverage
  if (!isWithinCityServiceBounds(cLat, cLng)) {
    return {
      isServiceable: false,
      reason: 'Delivery is currently not available at this location. Crave currently serves the Bengaluru region.',
    }
  }

  // 2. If a specific restaurant is provided, check delivery radius
  if (isValidCoordinate(restaurantLat, restaurantLng)) {
    const distanceKm = calculateRoadTravelDistanceKm(
      restaurantLat,
      restaurantLng,
      cLat,
      cLng
    )

    if (distanceKm > MAX_RESTAURANT_DELIVERY_RADIUS_KM) {
      return {
        isServiceable: false,
        distanceKm,
        reason: `Location is ${distanceKm} km away, which exceeds our maximum delivery radius of ${MAX_RESTAURANT_DELIVERY_RADIUS_KM} km from this kitchen.`,
      }
    }

    const eta = calculateEstimatedEtaMinutes(distanceKm)
    return {
      isServiceable: true,
      distanceKm,
      estimatedMinutes: eta,
    }
  }

  // General serviceability within city limits
  return {
    isServiceable: true,
  }
}

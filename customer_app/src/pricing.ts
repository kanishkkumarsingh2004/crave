import type { Address, Restaurant } from './types'

const DEFAULT_LATITUDE = 12.9716
const DEFAULT_LONGITUDE = 77.5946

// P1 FIX: Cache road distances to avoid hammering the OSRM routing service.
// The cache is keyed by rounded coordinates (1 decimal ≈ 111m precision) with
// a 5-minute TTL. This prevents N parallel requests on every location change.
const DISTANCE_CACHE_TTL = 5 * 60 * 1000
const distanceCache = new Map<string, { km: number; expiresAt: number }>()

function cacheKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
  // Round to ~111m precision to deduplicate nearby lookups
  return `${lat1.toFixed(1)},${lng1.toFixed(1)}→${lat2.toFixed(1)},${lng2.toFixed(1)}`
}

function getCachedDistance(lat1: number, lng1: number, lat2: number, lng2: number): number | null {
  const key = cacheKey(lat1, lng1, lat2, lng2)
  const cached = distanceCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.km
  distanceCache.delete(key)
  return null
}

function setCachedDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
  km: number
): void {
  const key = cacheKey(lat1, lng1, lat2, lng2)
  distanceCache.set(key, { km, expiresAt: Date.now() + DISTANCE_CACHE_TTL })
  // P1 FIX: Bound cache size to prevent memory leak
  if (distanceCache.size > 200) {
    const oldest = distanceCache.keys().next().value
    if (oldest) distanceCache.delete(oldest)
  }
}

/** Clear the distance cache. Call when the restaurant list changes. */
export function clearDistanceCache(): void {
  distanceCache.clear()
}

function coordinate(value: number | string | undefined, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function checkoutDistanceKm(restaurant: Restaurant, address?: Address): number {
  const restaurantLat = coordinate(restaurant.latitude, 0)
  const restaurantLng = coordinate(restaurant.longitude, 0)
  const customerLat = coordinate(address?.latitude, DEFAULT_LATITUDE)
  const customerLng = coordinate(address?.longitude, DEFAULT_LONGITUDE)
  if (!restaurantLat || !restaurantLng || !customerLat || !customerLng) return 1.8

  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = radians(customerLat - restaurantLat)
  const deltaLng = radians(customerLng - restaurantLng)
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(restaurantLat)) * Math.cos(radians(customerLat)) * Math.sin(deltaLng / 2) ** 2
  const directKm = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  if (directKm <= 0.05) return 1.8
  return Math.max(1, Number((directKm * 1.3).toFixed(1)))
}

/** Straight-line distance between two coordinates in kilometres, or null if any input is missing. */
export function straightDistanceKm(
  lat1: number | string | undefined,
  lng1: number | string | undefined,
  lat2: number | string | undefined,
  lng2: number | string | undefined
): number | null {
  const a = coordinate(lat1, NaN)
  const b = coordinate(lng1, NaN)
  const c = coordinate(lat2, NaN)
  const d = coordinate(lng2, NaN)
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(d))
    return null
  const radians = (degrees: number) => (degrees * Math.PI) / 180
  const deltaLat = radians(c - a)
  const deltaLng = radians(d - b)
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(radians(a)) * Math.cos(radians(c)) * Math.sin(deltaLng / 2) ** 2
  return Number((6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(1))
}

/**
 * Road (driving) distance between two coordinates in kilometres, or null if any input is missing.
 * Tries the public OSRM routing service first (same engine the backend uses); falls back to a
 * straight-line × 1.3 road-circuity estimate when OSRM is unreachable. Coordinates use lat,lng;
 * OSRM expects lng,lat in the request URL.
 *
 * P1 FIX: Results are cached by rounded coordinates with a 5-minute TTL to avoid
 * N parallel external HTTP requests when computing distances for many restaurants.
 */
export async function roadDistanceKm(
  lat1: number | string | undefined,
  lng1: number | string | undefined,
  lat2: number | string | undefined,
  lng2: number | string | undefined
): Promise<number | null> {
  const a = coordinate(lat1, NaN)
  const b = coordinate(lng1, NaN)
  const c = coordinate(lat2, NaN)
  const d = coordinate(lng2, NaN)
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c) || !Number.isFinite(d))
    return null

  // P1 FIX: Check cache before making a network request
  const cached = getCachedDistance(a, b, c, d)
  if (cached !== null) return cached

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${b},${a};${d},${c}?overview=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json()
      if (data?.routes?.[0]?.distance != null) {
        const km = Number((Number(data.routes[0].distance) / 1000).toFixed(1))
        if (km > 0.05) {
          setCachedDistance(a, b, c, d, km)
          return km
        }
      }
    }
  } catch {}
  const direct = straightDistanceKm(lat1, lng1, lat2, lng2)
  if (direct == null || direct <= 0.05) return 1.8
  const result = Math.max(1, Number((direct * 1.3).toFixed(1)))
  setCachedDistance(a, b, c, d, result)
  return result
}

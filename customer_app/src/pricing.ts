import type { Address, Restaurant } from './types'

const DEFAULT_LATITUDE = 12.9716
const DEFAULT_LONGITUDE = 77.5946

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
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${b},${a};${d},${c}?overview=false`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (res.ok) {
      const data = await res.json()
      if (data?.routes?.[0]?.distance != null) {
        const km = Number((Number(data.routes[0].distance) / 1000).toFixed(1))
        if (km > 0.05) return km
      }
    }
  } catch {}
  const direct = straightDistanceKm(lat1, lng1, lat2, lng2)
  if (direct == null || direct <= 0.05) return 1.8
  return Math.max(1, Number((direct * 1.3).toFixed(1)))
}

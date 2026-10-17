/**
 * Route & Path Calculation Service via OSRM Driving Engine
 */

export interface OSRMRouteData {
  coordinates: [number, number][]
  duration: number // seconds
  distance: number // meters
}

export function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const remainingMins = mins % 60
  return `${hours}h ${remainingMins}m`
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

/**
 * Fetches turn-by-turn driving routes & geometry from OSRM
 */
export async function fetchOSRMDrivingRoutes(
  startLng: number,
  startLat: number,
  endLng: number,
  endLat: number,
  alternatives = true
): Promise<OSRMRouteData[]> {
  try {
    if (typeof fetch === 'undefined' && typeof globalThis.fetch === 'undefined') {
      return []
    }
    const fetchFn = typeof fetch !== 'undefined' ? fetch : globalThis.fetch
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&alternatives=${alternatives}`
    const res = await fetchFn(url, {
      signal: AbortSignal?.timeout ? AbortSignal.timeout(6000) : undefined,
    })
    if (res && res.ok) {
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        return data.routes.map(
          (route: {
            geometry: { coordinates: [number, number][] }
            duration: number
            distance: number
          }) => ({
            coordinates: route.geometry.coordinates,
            duration: route.duration,
            distance: route.distance,
          })
        )
      }
    }
  } catch (error) {
    console.error('Failed to fetch OSRM driving routes:', error)
  }
  return []
}

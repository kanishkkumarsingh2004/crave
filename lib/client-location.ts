/**
 * Client-Side GPS Geolocation & Reverse Geocoding Utility
 * Ensures reliable GPS detection with high accuracy and fast fallback,
 * automatically converting coordinates into formatted delivery addresses.
 */

export interface GeocodedLocation {
  lat: number
  lng: number
  formattedAddress: string
  shortAddress: string
  details?: {
    road?: string
    neighbourhood?: string
    city?: string
    state?: string
    postcode?: string
  }
}

/**
 * Get device GPS coordinates with high accuracy and automatic fallback
 */
export async function getDeviceCoordinates(): Promise<{ lat: number; lng: number }> {
  if (typeof window === 'undefined' || !('geolocation' in navigator)) {
    throw new Error('Geolocation is not supported by your browser')
  }

  return new Promise<{ lat: number; lng: number }>((resolve, reject) => {
    // Attempt 1: High Accuracy GPS (Wi-Fi + Cellular + GPS chip)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: parseFloat(pos.coords.latitude.toFixed(6)),
          lng: parseFloat(pos.coords.longitude.toFixed(6)),
        })
      },
      (err) => {
        console.warn('[GPS] High-accuracy detection failed, falling back to network location:', err.message)
        // Attempt 2: Fallback to cached or network geolocation
        navigator.geolocation.getCurrentPosition(
          (posFallback) => {
            resolve({
              lat: parseFloat(posFallback.coords.latitude.toFixed(6)),
              lng: parseFloat(posFallback.coords.longitude.toFixed(6)),
            })
          },
          (errFallback) => {
            reject(new Error(errFallback.message || 'Could not access device location.'))
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
        )
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    )
  })
}

/**
 * Server-backed reverse geocode coordinates into a clean delivery address
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeocodedLocation> {
  try {
    const res = await fetch(`/api/geocode/reverse?lat=${lat}&lng=${lng}`)
    if (res.ok) {
      const data = await res.json()
      if (data && data.success) {
        return {
          lat: data.lat,
          lng: data.lng,
          formattedAddress: data.formattedAddress,
          shortAddress: data.shortAddress,
          details: data.details,
        }
      }
    }
  } catch (err) {
    console.warn('[Reverse Geocode Client] Error calling reverse geocode API:', err)
  }

  // Fallback if API is unreachable
  return {
    lat,
    lng,
    formattedAddress: `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Bengaluru`,
    shortAddress: 'Bengaluru Area',
  }
}

/**
 * Check if the browser currently allows geolocation without prompting
 */
export async function checkGeolocationPermission(): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> {
  if (typeof window === 'undefined' || !navigator.permissions) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return status.state
  } catch {
    return 'unknown'
  }
}

/**
 * Automatically detect current GPS location and reverse geocode it
 */
export async function autoDetectAndGeocodeLocation(): Promise<GeocodedLocation> {
  const coords = await getDeviceCoordinates()
  const geocoded = await reverseGeocode(coords.lat, coords.lng)

  // Cache in localStorage for instant access across tabs
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('crave_cached_location', JSON.stringify(geocoded))
    } catch {}
  }

  return geocoded
}

/**
 * Get previously cached location from localStorage if available
 */
export function getCachedLocation(): GeocodedLocation | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('crave_cached_location')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

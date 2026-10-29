import { NextResponse } from 'next/server'
import { getClientIp, checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'

export async function GET(request: Request) {
  // P1-F: Rate limit per IP
  const clientIp = getClientIp(request)
  const rl = await checkRateLimit(clientIp, 'PUBLIC')
  if (!rl.allowed) return rateLimitResponse(rl.resetTime, rl.retryAfter)

  const { searchParams } = new URL(request.url)
  const latStr = searchParams.get('lat')
  const lngStr = searchParams.get('lng')

  if (!latStr || !lngStr) {
    return NextResponse.json(
      { error: 'Latitude and Longitude query parameters are required' },
      { status: 400 }
    )
  }

  const lat = parseFloat(latStr)
  const lng = parseFloat(lngStr)

  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return NextResponse.json(
      { error: 'Invalid latitude or longitude coordinates' },
      { status: 400 }
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`

    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CraveFoodDeliveryApp/1.0 (support@crave.delivery)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 3600 }, // Cache geocode results for 1 hour
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data = await response.json()
      if (data && data.address) {
        const addr = data.address

        // Extract key components
        const road = addr.road || addr.pedestrian || addr.street || ''
        const houseNumber = addr.house_number || ''
        const building = addr.building || addr.amenity || addr.shop || ''
        const neighbourhood = addr.neighbourhood || addr.suburb || addr.residential || ''
        const city =
          addr.city || addr.town || addr.village || addr.city_district || addr.county || 'Bengaluru'
        const state = addr.state || 'Karnataka'
        const postcode = addr.postcode || ''

        // Format a clean, human-readable delivery address
        const addressLines = [
          building || houseNumber ? `${houseNumber} ${building}`.trim() : null,
          road,
          neighbourhood,
          city,
          postcode ? `${postcode}, ${state}` : state,
        ].filter(Boolean)

        const formattedAddress =
          addressLines.length > 0
            ? addressLines.join(', ')
            : data.display_name?.split(', ').slice(0, 5).join(', ') ||
              `${lat.toFixed(4)}, ${lng.toFixed(4)}`

        const shortAddress =
          neighbourhood && city
            ? `${neighbourhood}, ${city}`
            : road && city
              ? `${road}, ${city}`
              : city || 'Bengaluru'

        return NextResponse.json({
          success: true,
          formattedAddress,
          shortAddress,
          lat,
          lng,
          details: {
            road,
            neighbourhood,
            city,
            state,
            postcode,
          },
        })
      }
    }
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err?.name === 'AbortError') {
      console.warn('[Reverse Geocode API] Nominatim timed out after 5s, using graceful coordinates fallback')
    } else {
      console.warn('[Reverse Geocode API] Nominatim lookup failed:', err?.message)
    }
  }

  // Graceful fallback if external geocoding service is unreachable or times out
  const fallbackFormatted = `Location near ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E, Bengaluru`
  return NextResponse.json({
    success: true,
    formattedAddress: fallbackFormatted,
    shortAddress: 'Bengaluru Area',
    lat,
    lng,
    details: {
      road: '',
      neighbourhood: 'Bengaluru',
      city: 'Bengaluru',
      state: 'Karnataka',
      postcode: '',
    },
  })
}

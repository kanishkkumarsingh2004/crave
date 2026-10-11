import { NextResponse } from 'next/server'

interface NominatimSearchResult {
  place_id: number
  osm_id: number
  osm_type: string
  lat: string
  lon: string
  display_name: string
  name?: string
  type?: string
  address?: {
    road?: string
    house_number?: string
    building?: string
    suburb?: string
    neighbourhood?: string
    residential?: string
    city?: string
    town?: string
    village?: string
    state?: string
    postcode?: string
    country?: string
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json(
      { error: 'Search query must be at least 2 characters long' },
      { status: 400 }
    )
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 4500)

    // Bias search towards Bengaluru and Karnataka, India
    const encodedQuery = encodeURIComponent(query)
    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodedQuery}&countrycodes=in&viewbox=77.2,13.35,77.95,12.6&bounded=0&limit=7&addressdetails=1`

    const response = await fetch(nominatimUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'CraveFoodDeliveryApp/1.0 (support@crave.delivery)',
        'Accept-Language': 'en',
      },
      next: { revalidate: 1800 }, // Cache search queries for 30 minutes
    })

    clearTimeout(timeoutId)

    if (response.ok) {
      const data: NominatimSearchResult[] = await response.json()

      if (Array.isArray(data)) {
        const results = data.map((item) => {
          const lat = parseFloat(item.lat)
          const lng = parseFloat(item.lon)
          const addr = item.address || {}

          const primaryName =
            item.name ||
            addr.building ||
            addr.road ||
            addr.neighbourhood ||
            addr.suburb ||
            item.display_name.split(',')[0]

          const locality =
            addr.neighbourhood || addr.suburb || addr.residential || addr.road || ''
          const city = addr.city || addr.town || addr.village || 'Bengaluru'
          const state = addr.state || 'Karnataka'

          const secondaryAddress = [locality, city, state].filter(Boolean).join(', ')

          return {
            placeId: String(item.place_id || item.osm_id),
            name: primaryName,
            formattedAddress: item.display_name,
            secondaryAddress: secondaryAddress || item.display_name,
            lat,
            lng,
            type: item.type || 'place',
            locality,
            city,
            state,
            postcode: addr.postcode || '',
          }
        })

        return NextResponse.json({
          success: true,
          results,
        })
      }
    }
  } catch (err: any) {
    console.warn('[Geocode Search API] Nominatim search timed out or failed:', err?.message)
  }

  // Graceful fallback with empty results
  return NextResponse.json({
    success: true,
    results: [],
  })
}

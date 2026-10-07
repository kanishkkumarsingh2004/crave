import * as h3 from 'h3-js'

export interface TelemetryPin {
  id: string
  name: string
  type: 'driver' | 'restaurant' | 'order'
  status: string
  lat: number
  lng: number
  locationName: string
  detail: string
  timestamp: string
}

export interface H3CellProperties {
  id: string
  h3Index: string
  resolution: number
  totalPins: number
  drivers: number
  restaurants: number
  orders: number
  fillColor: string
  fillOpacity: number
  strokeColor: string
}

export const H3_RESOLUTIONS = [
  { level: 5, label: 'Res 5 (~252 km² Metro)' },
  { level: 6, label: 'Res 6 (~36 km² Zone)' },
  { level: 7, label: 'Res 7 (~5.1 km² Sector)' },
  { level: 8, label: 'Res 8 (~0.7 km² Micro)' },
  { level: 9, label: 'Res 9 (~0.1 km² Block)' },
] as const

/**
 * Generate a GeoJSON FeatureCollection of H3 Hexagons covering the full map view area.
 */
export function generateH3GridGeoJSON(
  centerLat: number,
  centerLng: number,
  resolution: number = 7,
  ringRadius: number = 4,
  pins: TelemetryPin[] = []
) {
  try {
    // 1. Restore previous compact ring radius
    const radius = ringRadius ?? 4

    // 2. Compute center cell and disk of surrounding cells
    const centerCell = h3.latLngToCell(centerLat, centerLng, resolution)
    const baseCells = h3.gridDisk(centerCell, radius)

    // 3. Ensure all pin locations are also covered by hexagon cells
    const cellSet = new Set<string>(baseCells)
    pins.forEach((pin) => {
      try {
        const pinCell = h3.latLngToCell(pin.lat, pin.lng, resolution)
        const pinDisk = h3.gridDisk(pinCell, 2)
        pinDisk.forEach((c) => cellSet.add(c))
      } catch {
        // Handle invalid coordinates
      }
    })

    const allCells = Array.from(cellSet)

    // 4. Count pins per cell
    const countsMap: Record<
      string,
      { total: number; drivers: number; restaurants: number; orders: number }
    > = {}

    pins.forEach((pin) => {
      try {
        const cell = h3.latLngToCell(pin.lat, pin.lng, resolution)
        if (!countsMap[cell]) {
          countsMap[cell] = { total: 0, drivers: 0, restaurants: 0, orders: 0 }
        }
        countsMap[cell].total += 1
        if (pin.type === 'driver') countsMap[cell].drivers += 1
        else if (pin.type === 'restaurant') countsMap[cell].restaurants += 1
        else if (pin.type === 'order') countsMap[cell].orders += 1
      } catch {
        // Ignore out of bounds
      }
    })

    // 5. Construct GeoJSON polygon features for full map coverage
    const features = allCells.map((cellIndex) => {
      const boundary = h3.cellToBoundary(cellIndex, true)
      const closedBoundary = [...boundary, boundary[0]]
      const counts = countsMap[cellIndex] || { total: 0, drivers: 0, restaurants: 0, orders: 0 }

      // Dynamic heatmap styling based on pin density
      let fillColor = '#d9f447' // default crave lime tint
      let fillOpacity = 0.12
      let strokeColor = '#859d19'

      if (counts.total >= 5) {
        fillColor = '#ef4444' // High density (Red)
        fillOpacity = 0.45
        strokeColor = '#dc2626'
      } else if (counts.total >= 3) {
        fillColor = '#f97316' // Medium density (Orange)
        fillOpacity = 0.35
        strokeColor = '#ea580c'
      } else if (counts.total >= 1) {
        fillColor = '#3b82f6' // Low density (Blue)
        fillOpacity = 0.25
        strokeColor = '#2563eb'
      }

      return {
        type: 'Feature' as const,
        id: cellIndex,
        properties: {
          id: cellIndex,
          h3Index: cellIndex,
          resolution,
          totalPins: counts.total,
          drivers: counts.drivers,
          restaurants: counts.restaurants,
          orders: counts.orders,
          fillColor,
          fillOpacity,
          strokeColor,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [closedBoundary],
        },
      }
    })

    return {
      type: 'FeatureCollection' as const,
      features,
    }
  } catch (err) {
    console.error('Failed to generate H3 grid GeoJSON:', err)
    return {
      type: 'FeatureCollection' as const,
      features: [],
    }
  }
}

import { generateH3GridGeoJSON } from '@/lib/h3-grid'

describe('generateH3GridGeoJSON', () => {
  it('generates a valid H3 GeoJSON FeatureCollection', () => {
    const lat = 12.6817
    const lng = 77.4729
    const geojson = generateH3GridGeoJSON(lat, lng, 7, 2, [])

    expect(geojson.type).toBe('FeatureCollection')
    expect(geojson.features.length).toBeGreaterThan(0)

    const firstFeature = geojson.features[0]
    expect(firstFeature.geometry.type).toBe('Polygon')
    expect(firstFeature.properties).toHaveProperty('h3Index')
    expect(firstFeature.properties).toHaveProperty('resolution', 7)
    expect(firstFeature.properties).toHaveProperty('totalPins', 0)
  })

  it('correctly counts telemetry pins inside H3 cells', () => {
    const lat = 12.6817
    const lng = 77.4729
    const dummyPins = [
      {
        id: '1',
        name: 'Rider 1',
        type: 'driver' as const,
        status: 'active',
        lat,
        lng,
        locationName: 'Center',
        detail: 'Test',
        timestamp: 'Just now',
      },
      {
        id: '2',
        name: 'Kitchen 1',
        type: 'restaurant' as const,
        status: 'open',
        lat,
        lng,
        locationName: 'Center',
        detail: 'Test',
        timestamp: 'Just now',
      },
    ]

    const geojson = generateH3GridGeoJSON(lat, lng, 7, 2, dummyPins)
    const centerFeature = geojson.features.find((f) => f.properties.totalPins > 0)

    expect(centerFeature).toBeDefined()
    expect(centerFeature?.properties.totalPins).toBe(2)
    expect(centerFeature?.properties.drivers).toBe(1)
    expect(centerFeature?.properties.restaurants).toBe(1)
    expect(centerFeature?.properties.orders).toBe(0)
  })
})

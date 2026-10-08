import { GET, POST } from '@/app/api/distance-pricing/route'

jest.mock('@/lib/dal/payments', () => ({
  getActivePaymentConfig: jest.fn().mockResolvedValue({
    delivery_fee: 30,
    base_distance_km: 3,
    per_km_rate: 10,
    platform_fee: 6,
    handling_fee: 5,
    free_delivery_threshold: 500,
    surge_multiplier: 1.0,
    is_rain_mode_active: false,
    is_night_surge_active: false,
  }),
}))

describe('Distance Pricing API Route', () => {
  test('GET returns OSRM road distance and calculated distance pricing', async () => {
    // Start: NYC City Hall (-74.006, 40.7128), Dest: Empire State Building (-73.9857, 40.7484)
    const req = new Request(
      'http://localhost/api/distance-pricing?startLat=40.7128&startLng=-74.006&destLat=40.7484&destLng=-73.9857&subtotal=250'
    )
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.roadDistanceKm).toBeGreaterThan(0)
    expect(json.pricing).toBeDefined()
    expect(json.pricing.baseDeliveryFee).toBe(30)
    expect(json.pricing.grandTotal).toBeGreaterThan(250)
  })

  test('POST calculates distance pricing from JSON payload', async () => {
    const req = new Request('http://localhost/api/distance-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startLat: 12.9716,
        startLng: 77.5946,
        destLat: 12.8399,
        destLng: 77.677,
        subtotal: 600,
      }),
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.roadDistanceKm).toBeGreaterThan(10)
    expect(json.pricing.isFreeDelivery).toBe(true)
  })
})

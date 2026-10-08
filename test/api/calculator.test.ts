import { GET, POST } from '@/app/api/calculator/route'

jest.mock('@/lib/dal/payments', () => ({
  getActivePaymentConfig: jest.fn().mockResolvedValue({
    platform_fee: 2,
    handling_fee: 5,
    vendor_commission: 15,
    packaging_cap: 20,
    delivery_fee: 20,
    base_distance_km: 10,
    per_km_rate: 2,
    free_delivery_threshold: 500,
    driver_payout_share: 80,
    surge_multiplier: 1.0,
    rain_fee: 0,
    night_surge_fee: 0,
    is_rain_mode_active: false,
    is_night_surge_active: false,
  }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    coupon: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

describe('/api/calculator API Route', () => {
  test('POST /api/calculator computes correct customer billing & unit economics', async () => {
    const req = new Request('http://localhost:3000/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: 400,
        distanceKm: 5.5,
        packagingFee: 0,
      }),
    })

    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.breakdown.customerBilling.subtotal).toBe(400)
    expect(json.breakdown.customerBilling.baseDeliveryFee).toBe(20)
    expect(json.breakdown.customerBilling.platformFee).toBe(2)
    expect(json.breakdown.customerBilling.handlingFee).toBe(5)
    expect(json.breakdown.customerBilling.grandTotal).toBe(499)
    expect(json.breakdown.vendorSettlement.netVendorPayout).toBe(340)
  })

  test('GET /api/calculator computes breakdown from query parameters', async () => {
    const req = new Request('http://localhost:3000/api/calculator?subtotal=600&distanceKm=3.5', {
      method: 'GET',
    })

    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.breakdown.customerBilling.subtotal).toBe(600)
    expect(json.breakdown.customerBilling.isFreeDelivery).toBe(true)
  })
})

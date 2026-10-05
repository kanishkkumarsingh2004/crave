import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn().mockResolvedValue({
  id: 'usr_test_user',
  role: 'user',
  name: 'Test User',
  email: 'user.test@crave.local',
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
    restaurant: { findUnique: jest.fn() },
    paymentConfig: { findFirst: jest.fn() },
    paymentReview: { create: jest.fn(), updateMany: jest.fn() },
    vendorSettlement: { create: jest.fn() },
    driverPayout: { create: jest.fn() },
  },
}))

jest.mock('@/lib/dal', () => ({
  findOrderById: jest.fn(),
  createOrder: jest.fn(),
}))
jest.mock('@/lib/dal/payments', () => ({
  createPaymentReview: jest.fn(),
  createVendorSettlement: jest.fn(),
  createDriverPayout: jest.fn(),
  updatePaymentReviewStatus: jest.fn(),
}))
jest.mock('@/lib/dal/restaurants', () => ({ findRestaurantById: jest.fn() }))
jest.mock('@/lib/jwt', () => ({
  verifyToken: mockVerifyToken,
  createToken: jest.fn(),
  JWTPayload: {},
}))
jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn().mockReturnValue({ value: 'test.jwt.token' }) }),
}))

describe('Orders API Route - POST', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => null },
      url: 'http://localhost:3000/api/orders',
    } as unknown as NextRequest
  }

  it('rejects order when not authenticated', async () => {
    mockVerifyToken.mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({ customer_id: 'usr_1', restaurant_id: 'vnd_1', total_amount: 100 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('authenticated')
  })

  it('rejects order from non-user role', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'usr_1',
      role: 'admin',
      email: 'admin@test.com',
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({ customer_id: 'usr_1', restaurant_id: 'vnd_1', total_amount: 100 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Only authenticated users')
  })

  it('rejects order when customer_id does not match actor', async () => {
    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_different',
      restaurant_id: 'vnd_1',
      total_amount: 100,
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('rejects order when restaurant_id is missing', async () => {
    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({ customer_id: 'usr_test_user', restaurant_id: null, total_amount: 100 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
  })

  it('rejects order when total_amount is missing', async () => {
    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({ customer_id: 'usr_test_user', restaurant_id: 'vnd_1' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
  })

  it('creates an order with valid data', async () => {
    const mockOrder = { id: 'ord_new', status: 'payment_submitted' }
    require('@/lib/dal').createOrder.mockResolvedValue(mockOrder)
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue({
      id: 'vnd_1',
      name: 'Spice Garden',
      commission_rate: 15,
    })
    require('@/lib/dal/payments').createPaymentReview.mockResolvedValue({})
    require('@/lib/dal/payments').createVendorSettlement.mockResolvedValue({})
    require('@/lib/prisma').prisma.paymentConfig.findFirst.mockResolvedValue({
      vendorCommission: 15,
      packagingCap: 20,
      baseDeliveryFee: 30,
      driverPayoutShare: 80,
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_test_user',
      customer_name: 'Test User',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Spice Garden',
      items: [{ name: 'Pizza', qty: 1, price: 150 }],
      subtotal: 150,
      packaging_fee: 20,
      gst: 3,
      total_amount: 173,
      utr_ref: '123456789012',
      customer_vpa: 'test@upi',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order).toBeDefined()
    expect(data.billing).toBeDefined()
    expect(data.billing.vendor_commission_amount).toBe(23)
  })

  it('generates a UUID when id is not provided', async () => {
    require('@/lib/dal').createOrder.mockResolvedValue({ id: 'auto-id', status: 'new' })
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue(null)

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_test_user',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Test',
      items: [],
      subtotal: 100,
      total_amount: 118,
    })

    const response = await POST(req)
    await response.json()

    expect(require('@/lib/dal').createOrder).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.any(String) })
    )
  })
})

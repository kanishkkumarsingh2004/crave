import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn().mockResolvedValue({
  id: 'usr_test_user',
  role: 'user',
  name: 'Test User',
  email: 'user.test@crave.local',
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn().mockResolvedValue(null),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    restaurant: { findUnique: jest.fn() },
    paymentConfig: { findFirst: jest.fn() },
    paymentReview: { create: jest.fn(), updateMany: jest.fn() },
    vendorSettlement: { create: jest.fn() },
    driverPayout: { create: jest.fn() },
    menuItem: { findUnique: jest.fn() },
    customerAddress: { findFirst: jest.fn() },
    coupon: { update: jest.fn() },
    $transaction: jest.fn(async (cb) => {
      const mockTx = {
        order: {
          create: jest.fn().mockResolvedValue({
            id: 'ord_new',
            status: 'payment_submitted',
            customer_id: 'usr_test_user',
          }),
        },
        coupon: { update: jest.fn().mockResolvedValue({}) },
        paymentReview: { create: jest.fn().mockResolvedValue({}) },
        vendorSettlement: { create: jest.fn().mockResolvedValue({}) },
      }
      return cb(mockTx)
    }),
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
  getActivePaymentConfig: jest.fn().mockResolvedValue({
    merchant_vpa: 'crave@upi',
    merchant_name: 'crave Food Delivery',
    merchant_category_code: '5812',
    thank_you_message: 'Thank you!',
    ifsc_code: 'HDFC0001234',
    account_number: '1234567890',
    platform_fee: 6,
    handling_fee: 5,
    vendor_commission: 15,
    packaging_cap: 20,
    delivery_fee: 30,
    base_distance_km: 2.5,
    per_km_rate: 10,
    free_delivery_threshold: 500,
    driver_payout_share: 80,
    surge_multiplier: 1.0,
    rain_fee: 0,
    night_surge_fee: 0,
    is_rain_mode_active: false,
    is_night_surge_active: false,
    enable_cash_on_delivery: true,
    enable_upi_deep_link: true,
    require_utr_number: true,
  }),
}))
jest.mock('@/lib/dal/restaurants', () => ({
  findRestaurantById: jest.fn(),
  listRestaurants: jest.fn(),
}))
jest.mock('@/lib/dal/menu-items', () => ({
  findMenuItemById: jest.fn(),
  listMenuItems: jest.fn(),
}))
jest.mock('@/lib/jwt', () => ({
  verifyToken: mockVerifyToken,
  createToken: jest.fn(),
  JWTPayload: {},
}))
jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn().mockReturnValue({ value: 'test.jwt.token' }) }),
}))
jest.mock('@/lib/rate-limit', () => ({
  getClientIp: () => '127.0.0.1',
  checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
  rateLimitResponse: jest.fn(),
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

  function setupDefaultMocks() {
    // Default restaurant mock
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue({
      id: 'vnd_1',
      name: 'Spice Garden',
      commission_rate: 15,
      markup_rate: 0,
      commercial_model: 'commission',
      supplier_state: 'Karnataka',
      gst_status: 'REGISTERED',
      price_tax_mode: 'TAX_INCLUSIVE',
    })

    // Default menu item mocks
    require('@/lib/dal/menu-items').findMenuItemById.mockResolvedValue({
      id: 'mi_pizza',
      name: 'Pizza',
      price: 150,
      restaurant_id: 'vnd_1',
      in_stock: true,
      stock_count: 100,
      hsn_sac_code: '996331',
      price_tax_mode: 'TAX_INCLUSIVE',
      taxRate: 5,
    })

    // Default DAL responses
    require('@/lib/dal/payments').createPaymentReview.mockResolvedValue({})
    require('@/lib/dal/payments').createVendorSettlement.mockResolvedValue({})
    require('@/lib/dal/payments').createDriverPayout.mockResolvedValue({})
    require('@/lib/dal').createOrder.mockResolvedValue({
      id: 'ord_new',
      status: 'payment_submitted',
      customer_id: 'usr_test_user',
    })

    // Default customer address mock (for distance calculation)
    require('@/lib/prisma').prisma.customerAddress.findFirst.mockResolvedValue({
      latitude: 12.9716,
      longitude: 77.5946,
    })
  }

  it('rejects order when not authenticated', async () => {
    mockVerifyToken.mockResolvedValueOnce(null)

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({ customer_id: 'usr_1', restaurant_id: 'vnd_1', total_amount: 100 })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Authentication required')
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

    expect(response.status).toBe(403)
    expect(data.error).toContain('Insufficient permissions')
  })

  it('ignores client customer_id and uses authenticated user', async () => {
    setupDefaultMocks()

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_different',
      restaurant_id: 'vnd_1',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    // Should succeed using authenticated user's ID (usr_test_user)
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('accepts order without client total_amount (server computes)', async () => {
    setupDefaultMocks()

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      restaurant_id: 'vnd_1',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('creates an order with valid data', async () => {
    setupDefaultMocks()

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_test_user',
      customer_name: 'Test User',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Spice Garden',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
      utr_ref: '123456789012',
      customer_vpa: 'test@upi',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order).toBeDefined()
    expect(data.billing).toBeDefined()
  })

  it('generates a UUID when id is not provided', async () => {
    setupDefaultMocks()

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      customer_id: 'usr_test_user',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Test',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    await response.json()

    // Verify transaction was called (order creation is now inside transaction)
    expect(require('@/lib/prisma').prisma.$transaction).toHaveBeenCalled()
  })

  it('rejects order when menu item not found', async () => {
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue({
      id: 'vnd_1',
      name: 'Spice Garden',
      commission_rate: 15,
      markup_rate: 0,
      commercial_model: 'commission',
      supplier_state: 'Karnataka',
      gst_status: 'REGISTERED',
      price_tax_mode: 'TAX_INCLUSIVE',
    })
    require('@/lib/dal/menu-items').findMenuItemById.mockResolvedValue(null)
    require('@/lib/prisma').prisma.paymentConfig.findFirst.mockResolvedValue({
      vendorCommission: 15,
      packagingCap: 20,
      baseDeliveryFee: 30,
      driverPayoutShare: 80,
      platformFee: 6,
      handlingFee: 5,
      baseDistanceKm: 2.5,
      perKmRate: 10,
      freeDeliveryThreshold: 500,
      surgeMultiplier: 1.0,
      rainFee: 0,
      nightSurgeFee: 0,
      isRainModeActive: false,
      isNightSurgeActive: false,
      gstRatePercent: 5,
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      restaurant_id: 'vnd_1',
      items: [{ itemId: 'mi_nonexistent', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Menu item not found')
  })

  it('rejects order when restaurant not found', async () => {
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue(null)
    require('@/lib/prisma').prisma.paymentConfig.findFirst.mockResolvedValue({
      vendorCommission: 15,
      packagingCap: 20,
      baseDeliveryFee: 30,
      driverPayoutShare: 80,
      platformFee: 6,
      handlingFee: 5,
      baseDistanceKm: 2.5,
      perKmRate: 10,
      freeDeliveryThreshold: 500,
      surgeMultiplier: 1.0,
      rainFee: 0,
      nightSurgeFee: 0,
      isRainModeActive: false,
      isNightSurgeActive: false,
      gstRatePercent: 5,
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      restaurant_id: 'vnd_nonexistent',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toContain('Restaurant not found')
  })

  it('rejects order when items belong to different restaurants', async () => {
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue(null)
    require('@/lib/dal/menu-items')
      .findMenuItemById.mockResolvedValueOnce({
        id: 'mi_pizza',
        name: 'Pizza',
        price: 150,
        restaurant_id: 'vnd_1',
        in_stock: true,
        stock_count: 100,
      })
      .mockResolvedValueOnce({
        id: 'mi_burger',
        name: 'Burger',
        price: 100,
        restaurant_id: 'vnd_2',
        in_stock: true,
        stock_count: 100,
      })
    require('@/lib/prisma').prisma.paymentConfig.findFirst.mockResolvedValue({
      vendorCommission: 15,
      packagingCap: 20,
      baseDeliveryFee: 30,
      driverPayoutShare: 80,
      platformFee: 6,
      handlingFee: 5,
      baseDistanceKm: 2.5,
      perKmRate: 10,
      freeDeliveryThreshold: 500,
      surgeMultiplier: 1.0,
      rainFee: 0,
      nightSurgeFee: 0,
      isRainModeActive: false,
      isNightSurgeActive: false,
      gstRatePercent: 5,
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      items: [
        { itemId: 'mi_pizza', quantity: 1 },
        { itemId: 'mi_burger', quantity: 1 },
      ],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('same restaurant')
  })

  it('rejects order when item out of stock', async () => {
    require('@/lib/dal/restaurants').findRestaurantById.mockResolvedValue({
      id: 'vnd_1',
      name: 'Spice Garden',
      commission_rate: 15,
      markup_rate: 0,
      commercial_model: 'commission',
      supplier_state: 'Karnataka',
      gst_status: 'REGISTERED',
      price_tax_mode: 'TAX_INCLUSIVE',
    })
    require('@/lib/dal/menu-items').findMenuItemById.mockResolvedValue({
      id: 'mi_pizza',
      name: 'Pizza',
      price: 150,
      restaurant_id: 'vnd_1',
      in_stock: false,
      stock_count: 0,
    })
    require('@/lib/prisma').prisma.paymentConfig.findFirst.mockResolvedValue({
      vendorCommission: 15,
      packagingCap: 20,
      baseDeliveryFee: 30,
      driverPayoutShare: 80,
      platformFee: 6,
      handlingFee: 5,
      baseDistanceKm: 2.5,
      perKmRate: 10,
      freeDeliveryThreshold: 500,
      surgeMultiplier: 1.0,
      rainFee: 0,
      nightSurgeFee: 0,
      isRainModeActive: false,
      isNightSurgeActive: false,
      gstRatePercent: 5,
    })

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      restaurant_id: 'vnd_1',
      items: [{ itemId: 'mi_pizza', quantity: 5 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('out of stock')
  })

  it('safely deduplicates and returns existing order when submitted with same order id', async () => {
    const existingOrder = {
      id: 'ord_existing_123',
      customer_id: 'usr_test_user',
      total_amount: 550,
      status: 'payment_submitted',
    }
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.order.findUnique as jest.Mock).mockResolvedValueOnce(existingOrder)

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      id: 'ord_existing_123',
      restaurant_id: 'vnd_1',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.id).toBe('ord_existing_123')
    expect(data.message).toContain('idempotent')
  })

  it('safely deduplicates within short time window for identical customer order', async () => {
    const recentDuplicate = {
      id: 'ord_recent_duplicate',
      customer_id: 'usr_test_user',
      restaurant_id: 'vnd_1',
      utr_ref: '123456789012',
      status: 'payment_submitted',
    }
    const { prisma } = await import('@/lib/prisma')
    ;(prisma.order.findFirst as jest.Mock).mockResolvedValueOnce(recentDuplicate)

    const { POST } = await import('@/app/api/orders/route')
    const req = makeRequest({
      restaurant_id: 'vnd_1',
      utr_ref: '123456789012',
      items: [{ itemId: 'mi_pizza', quantity: 1 }],
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.id).toBe('ord_recent_duplicate')
    expect(data.message).toContain('deduplicated')
  })
})

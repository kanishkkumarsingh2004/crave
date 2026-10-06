import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn()
const mockFindOrderById = jest.fn()
const mockUpdateOrder = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    restaurant: { findFirst: jest.fn() },
    order: { update: jest.fn(), findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
  getWSS: jest.fn(),
  getClients: jest.fn(),
  getDrivers: jest.fn(),
  WS_BROADCAST_ENDPOINT: '/__ws/broadcast',
  initWebSocketServer: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
  createToken: jest.fn(),
  JWTPayload: {},
}))

jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn().mockReturnValue({ value: 'test.token' }) }),
}))

jest.mock('@/lib/dal', () => ({
  findUserByEmail: jest.fn(),
  listOrders: jest.fn(),
  findOrderById: (...args: any[]) => mockFindOrderById(...args),
  updateOrder: (...args: any[]) => mockUpdateOrder(...args),
  createOrder: jest.fn(),
}))

jest.mock('@/lib/dal/payments', () => ({
  createPaymentReview: jest.fn(),
  updatePaymentReviewStatus: jest.fn(),
  createVendorSettlement: jest.fn(),
  createDriverPayout: jest.fn(),
}))

jest.mock('@/lib/dal/restaurants', () => ({
  findRestaurantById: jest.fn(),
}))

describe('Orders PATCH - WebSocket Broadcast Integration', () => {
  const { broadcast } = require('@/lib/ws-server')

  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyToken.mockResolvedValue({
      id: 'usr_test_user',
      role: 'user',
      email: 'user@test.com',
    })
  })

  function makeAuthedRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => 'Bearer valid.token' },
      url: 'http://localhost:3000/api/orders',
    } as unknown as NextRequest
  }

  it('broadcasts order_update channel on status change', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'usr_test_user',
      role: 'restaurant_vendor',
      email: 'vendor@test.com',
      restaurantName: 'Spice Garden',
    })
    mockFindOrderById.mockResolvedValue({
      status: 'sent_to_vendor',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Spice Garden',
    })
    mockUpdateOrder.mockResolvedValue({ status: 'preparing' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeAuthedRequest({ orderId: 'ord_1', status: 'preparing' })

    await PATCH(req)

    expect(broadcast).toHaveBeenCalledWith(
      'order_update',
      expect.objectContaining({
        orderId: 'ord_1',
        order: expect.objectContaining({ status: 'preparing' }),
      })
    )
  })

  it('broadcasts driver_location on driver location update', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'rider_1',
      role: 'rider',
      email: 'rider@test.com',
    })
    mockFindOrderById.mockResolvedValue({
      status: 'out_for_delivery',
      customer_id: 'usr_1',
    })
    mockUpdateOrder.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeAuthedRequest({
      orderId: 'ord_1',
      driver_lat: 12.9716,
      driver_lng: 77.4695,
      driver_name: 'Rider A',
    })

    await PATCH(req)

    expect(broadcast).toHaveBeenCalledWith(
      'driver_location',
      expect.objectContaining({
        orderId: 'ord_1',
        lat: 12.9716,
        lng: 77.4695,
        driverName: 'Rider A',
      })
    )
  })

  it('does NOT broadcast when status is not provided', async () => {
    mockFindOrderById.mockResolvedValue({
      status: 'new',
      customer_id: 'usr_test_user',
    })
    mockUpdateOrder.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeAuthedRequest({ orderId: 'ord_1', driver_name: 'Rider A' })

    await PATCH(req)

    expect(broadcast).not.toHaveBeenCalled()
  })

  it('broadcasts approval_update when admin updates payment_status', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'usr_admin',
      role: 'admin',
      email: 'admin@test.com',
    })
    mockFindOrderById.mockResolvedValue({
      status: 'payment_submitted',
      customer_id: 'usr_1',
    })
    mockUpdateOrder.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeAuthedRequest({ orderId: 'ord_1', payment_status: 'verified' })

    await PATCH(req)

    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({
        status: 'verified',
        orderId: 'ord_1',
      })
    )
  })
})

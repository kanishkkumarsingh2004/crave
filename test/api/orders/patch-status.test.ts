import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn()
const mockedFindOrderById = jest.fn()
const mockedUpdateOrder = jest.fn()

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

jest.mock('@/lib/jwt', () => ({
  createToken: jest.fn(),
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
  JWTPayload: {},
}))

jest.mock('@/lib/dal', () => ({
  findUserByEmail: jest.fn(),
  listOrders: jest.fn(),
  findOrderById: (...args: any[]) => mockedFindOrderById(...args),
  updateOrder: (...args: any[]) => mockedUpdateOrder(...args),
  createOrder: jest.fn(),
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
  getWSS: jest.fn(),
  getClients: jest.fn(),
  getDrivers: jest.fn(),
  initWebSocketServer: jest.fn(),
  WS_BROADCAST_ENDPOINT: '/__ws/broadcast',
}))

describe('Orders PATCH - Order Status Flow', () => {
  const { broadcast } = require('@/lib/ws-server')

  beforeEach(() => jest.clearAllMocks())

  const ADMIN_TOKEN = 'admin-token'
  const VENDOR_TOKEN = 'vendor-token'
  const RIDER_TOKEN = 'rider-token'
  const USER_TOKEN = 'user-token'

  function makeRequest(body: any, token?: string): NextRequest {
    return {
      json: async () => body,
      headers: {
        get: (key: string) => (key === 'authorization' ? `Bearer ${token}` : null),
      },
      url: 'http://localhost:3000/api/orders',
    } as unknown as NextRequest
  }

  it('admin can set order to sent_to_vendor', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_admin',
      role: 'admin',
      email: 'admin@test.com',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'payment_verified',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
    })
    mockedUpdateOrder.mockResolvedValue({ status: 'sent_to_vendor' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'sent_to_vendor' }, ADMIN_TOKEN)

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(broadcast).toHaveBeenCalledWith(
      'order_update',
      expect.objectContaining({ orderId: 'ord_1', order: expect.any(Object) })
    )
  })

  it('vendor can set order to preparing', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_vendor',
      role: 'restaurant_vendor',
      email: 'vendor@test.com',
      restaurantName: 'Spice Garden',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'sent_to_vendor',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Spice Garden',
    })
    mockedUpdateOrder.mockResolvedValue({ status: 'preparing' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'preparing' }, VENDOR_TOKEN)

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('vendor cannot set order to out_for_delivery', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_vendor',
      role: 'restaurant_vendor',
      email: 'vendor@test.com',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'ready_for_pickup',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
    })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'out_for_delivery' }, VENDOR_TOKEN)

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('not allowed')
  })

  it('rider can set order to out_for_delivery', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_rider',
      role: 'rider',
      email: 'rider@test.com',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'picked_up',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
    })
    mockedUpdateOrder.mockResolvedValue({ status: 'out_for_delivery' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest(
      { orderId: 'ord_1', status: 'out_for_delivery', driver_name: 'Rider A' },
      RIDER_TOKEN
    )

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(broadcast).toHaveBeenCalledWith(
      'order_update',
      expect.objectContaining({ orderId: 'ord_1' })
    )
  })

  it('rider can update driver location with lat/lng', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_rider',
      role: 'rider',
      email: 'rider@test.com',
    })
    mockedFindOrderById.mockResolvedValue({ status: 'out_for_delivery' })
    mockedUpdateOrder.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest(
      {
        orderId: 'ord_1',
        driver_lat: 12.9716,
        driver_lng: 77.4695,
        driver_name: 'Rider A',
        driver_phone: '+919999999999',
      },
      RIDER_TOKEN
    )

    const response = await PATCH(req)
    await response.json()

    expect(mockedUpdateOrder).toHaveBeenCalledWith(
      'ord_1',
      expect.objectContaining({
        delivery_latitude: 12.9716,
        delivery_longitude: 77.4695,
        driver_name: 'Rider A',
      })
    )
    expect(broadcast).toHaveBeenCalledWith(
      'driver_location',
      expect.objectContaining({
        lat: 12.9716,
        lng: 77.4695,
        driverName: 'Rider A',
      })
    )
  })

  it('regular user cannot update order status', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_test_user',
      role: 'user',
      email: 'user@test.com',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'new',
      customer_id: 'usr_different',
      restaurant_id: 'vnd_1',
    })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'preparing' }, USER_TOKEN)

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('not allowed')
  })

  it('admin can approve payment (sets payment_status)', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_admin',
      role: 'admin',
      email: 'admin@test.com',
    })
    mockedFindOrderById.mockResolvedValue({ status: 'payment_submitted' })
    mockedUpdateOrder.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', payment_status: 'verified' }, ADMIN_TOKEN)

    const response = await PATCH(req)
    await response.json()

    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({ status: 'verified', orderId: 'ord_1' })
    )
  })

  it('customer who owns the order can mark delivered', async () => {
    mockVerifyToken.mockResolvedValue({
      id: 'usr_test_user',
      role: 'user',
      email: 'user@test.com',
    })
    mockedFindOrderById.mockResolvedValue({
      status: 'out_for_delivery',
      customer_id: 'usr_test_user',
    })
    mockedUpdateOrder.mockResolvedValue({ status: 'delivered' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'completed' }, USER_TOKEN)

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(broadcast).toHaveBeenCalledWith(
      'order_update',
      expect.objectContaining({ orderId: 'ord_1' })
    )
  })
})

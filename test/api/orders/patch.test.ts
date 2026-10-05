import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn().mockResolvedValue({
  id: 'usr_test_user',
  role: 'admin',
  email: 'admin@test.com',
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { update: jest.fn(), findUnique: jest.fn() },
  },
}))

jest.mock('@/lib/dal/orders', () => ({
  findOrderById: jest.fn(),
  updateOrder: jest.fn(),
}))

jest.mock('@/lib/dal/payments', () => ({
  updatePaymentReviewStatus: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: mockVerifyToken,
  createToken: jest.fn(),
  JWTPayload: {},
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
}))

describe('Orders API Route - PATCH (order_update broadcast)', () => {
  const { findOrderById, updateOrder } = require('@/lib/dal/orders')
  const { broadcast } = require('@/lib/ws-server')

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => 'Bearer mock-token' },
      url: 'http://localhost:3000/api/orders',
    } as unknown as NextRequest
  }

  it('rejects when not authenticated', async () => {
    mockVerifyToken.mockResolvedValueOnce(null)

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'preparing' })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Authentication required')
  })

  it('rejects when orderId is missing', async () => {
    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ status: 'preparing' })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Order ID is required')
  })

  it('rejects when order does not exist', async () => {
    findOrderById.mockResolvedValue(null)
    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'nonexistent', status: 'preparing' })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Order not found')
  })

  it('broadcasts order_update on order status change', async () => {
    const mockOrder = {
      id: 'ord_1',
      status: 'new',
      customer_id: 'usr_test_user',
      restaurant_id: 'vnd_1',
      restaurant_name: 'Spice Garden',
    }
    findOrderById.mockResolvedValue(mockOrder)
    updateOrder.mockResolvedValue({ ...mockOrder, status: 'sent_to_vendor' })

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({ orderId: 'ord_1', status: 'sent_to_vendor' })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(broadcast).toHaveBeenCalledWith(
      'order_update',
      expect.objectContaining({ orderId: 'ord_1' })
    )
  })

  it('broadcasts approval_update when payment_status is set by admin', async () => {
    const mockOrder = {
      status: 'payment_submitted',
      customer_id: 'usr_test_user',
    }
    findOrderById.mockResolvedValue(mockOrder)
    updateOrder.mockResolvedValue(mockOrder)

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({
      orderId: 'ord_1',
      payment_status: 'verified',
    })

    const response = await PATCH(req)
    await response.json()

    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({ status: 'verified', orderId: 'ord_1' })
    )
  })

  it('broadcasts driver_location when coordinates are provided by rider', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'rider_1',
      role: 'rider',
      email: 'rider@test.com',
    })

    const mockOrder = {
      status: 'out_for_delivery',
      customer_id: 'usr_1',
      restaurant_id: 'vnd_1',
    }
    findOrderById.mockResolvedValue(mockOrder)
    updateOrder.mockResolvedValue(mockOrder)

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({
      orderId: 'ord_1',
      driver_lat: 12.9716,
      driver_lng: 77.5946,
      driver_name: 'Rider A',
    })

    const response = await PATCH(req)
    await response.json()

    expect(broadcast).toHaveBeenCalledWith(
      'driver_location',
      expect.objectContaining({
        orderId: 'ord_1',
        lat: 12.9716,
        lng: 77.5946,
        driverName: 'Rider A',
      })
    )
  })

  it('rejects driver_lat for non-rider role', async () => {
    mockVerifyToken.mockResolvedValueOnce({
      id: 'usr_test_user',
      role: 'user',
      email: 'user@test.com',
    })

    const mockOrder = { status: 'new', customer_id: 'usr_test_user' }
    findOrderById.mockResolvedValue(mockOrder)

    const { PATCH } = await import('@/app/api/orders/route')
    const req = makeRequest({
      orderId: 'ord_1',
      driver_lat: 12.9716,
      driver_lng: 77.5946,
    })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(403)
        expect(data.error).toContain('not allowed')
  })
})

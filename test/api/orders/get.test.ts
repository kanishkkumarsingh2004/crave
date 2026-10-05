import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    restaurant: {
      findUnique: jest.fn(),
    },
    paymentConfig: {
      findFirst: jest.fn(),
    },
    paymentReview: {
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    vendorSettlement: {
      create: jest.fn(),
    },
    driverPayout: {
      create: jest.fn(),
    },
  },
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    restaurant: { findUnique: jest.fn() },
    paymentConfig: { findFirst: jest.fn() },
    paymentReview: { create: jest.fn(), updateMany: jest.fn() },
    vendorSettlement: { create: jest.fn() },
    driverPayout: { create: jest.fn() },
  },
}))

jest.mock('@/lib/dal', () => ({
  listOrders: jest.fn(),
  findOrderById: jest.fn(),
}))

jest.mock('@/lib/dal/payments', () => ({
  createPaymentReview: jest.fn(),
  createVendorSettlement: jest.fn(),
  createDriverPayout: jest.fn(),
  updatePaymentReviewStatus: jest.fn(),
}))

jest.mock('@/lib/dal/restaurants', () => ({
  findRestaurantById: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn().mockResolvedValue({
    id: 'usr_test_user',
    role: 'user',
    name: 'Test User',
    email: 'user.test@crave.local',
  }),
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

describe('Orders API Route - GET', () => {
  const { listOrders } = require('@/lib/dal')
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(url: string): NextRequest {
    return {
      url,
      headers: { get: () => null },
    } as unknown as NextRequest
  }

  it('fetches orders without filters', async () => {
    listOrders.mockResolvedValue([{ id: 'ord_1' }])
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.orders).toHaveLength(1)
    expect(listOrders).toHaveBeenCalledWith({
      customerId: undefined,
      restaurantId: undefined,
      restaurantName: undefined,
    })
  })

  it('fetches order by ID when orderId param is present', async () => {
    const { findOrderById } = require('@/lib/dal')
    findOrderById.mockResolvedValue({ id: 'ord_1', status: 'new' })
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders?orderId=ord_1')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.order.id).toBe('ord_1')
    expect(findOrderById).toHaveBeenCalledWith('ord_1')
  })

  it('filters orders by customerId', async () => {
    listOrders.mockResolvedValue([])
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders?customerId=usr_1')

    const response = await GET(req)
    await response.json()

    expect(listOrders).toHaveBeenCalledWith({
      customerId: 'usr_1',
      restaurantId: undefined,
      restaurantName: undefined,
    })
  })

  it('filters orders by vendorId (restaurantId)', async () => {
    listOrders.mockResolvedValue([])
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders?vendorId=vnd_1')

    const response = await GET(req)
    await response.json()

    expect(listOrders).toHaveBeenCalledWith({
      customerId: undefined,
      restaurantId: 'vnd_1',
      restaurantName: undefined,
    })
  })

  it('returns 500 on database error', async () => {
    listOrders.mockRejectedValue(new Error('DB error'))
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('DB error')
  })

  it('returns 404 when specific order not found', async () => {
    const { findOrderById } = require('@/lib/dal')
    findOrderById.mockResolvedValue(null)
    const { GET } = await import('@/app/api/orders/route')
    const req = makeRequest('http://localhost:3000/api/orders?orderId=notfound')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.orders).toEqual([])
  })
})

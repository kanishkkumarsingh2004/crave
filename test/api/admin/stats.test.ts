import { NextRequest } from 'next/server'

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn().mockResolvedValue({ id: 'usr_admin', role: 'admin' }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findMany: jest.fn(), count: jest.fn() },
    restaurant: { findMany: jest.fn() },
    menuItem: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    vendorSettlement: { findMany: jest.fn() },
  },
}))

describe('Admin Stats API Route', () => {
  const { prisma } = require('@/lib/prisma')

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(): NextRequest {
    return {
      url: 'http://localhost:3000/api/admin/stats',
      headers: {
        get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null),
      },
    } as unknown as NextRequest
  }

  it('returns aggregated stats from all data sources', async () => {
    prisma.vendorSettlement.findMany = jest
      .fn()
      .mockResolvedValue([{ gross_sales: 50000, commission_amount: 7500, net_payout: 42500 }])
    prisma.restaurant.findMany = jest.fn().mockResolvedValue([{ id: 'vnd_1' }, { id: 'vnd_2' }])
    prisma.user.findMany = jest.fn().mockResolvedValue([
      { id: 'usr_1', role: 'user' },
      { id: 'usr_2', role: 'restaurant_vendor' },
      { id: 'usr_3', role: 'rider' },
    ])
    prisma.order.findMany = jest.fn().mockResolvedValue([
      { total_amount: 500, status: 'completed' },
      { total_amount: 300, status: 'completed' },
    ])
    prisma.order.count = jest.fn().mockResolvedValue(2)

    const { GET } = await import('@/app/api/admin/stats/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.stats.weeklyGross).toBe(50000)
    expect(data.stats.orderCount).toBe(2)
    expect(data.stats.restaurantCount).toBe(2)
    expect(data.stats.customerCount).toBe(3)
    expect(data.stats.vendorCount).toBe(3)
    expect(data.stats.driverCount).toBe(3)
    expect(data.stats.totalUsers).toBe(9)
  })

  it('returns zero values when all data sources are empty', async () => {
    prisma.vendorSettlement.findMany = jest.fn().mockResolvedValue([])
    prisma.restaurant.findMany = jest.fn().mockResolvedValue([])
    prisma.user.findMany = jest.fn().mockResolvedValue([])
    prisma.order.findMany = jest.fn().mockResolvedValue([])
    prisma.order.count = jest.fn().mockResolvedValue(0)

    const { GET } = await import('@/app/api/admin/stats/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.stats.weeklyGross).toBe(0)
    expect(data.stats.orderCount).toBe(0)
    expect(data.stats.totalUsers).toBe(0)
  })

  it('handles database errors with 500 response', async () => {
    prisma.vendorSettlement.findMany = jest.fn().mockRejectedValue(new Error('DB error'))
    prisma.restaurant.findMany = jest.fn().mockRejectedValue(new Error('DB error'))
    prisma.user.findMany = jest.fn().mockRejectedValue(new Error('DB error'))
    prisma.order.findMany = jest.fn().mockRejectedValue(new Error('DB error'))
    prisma.order.count = jest.fn().mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/stats/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })

  it('counts users by role correctly', async () => {
    prisma.vendorSettlement.findMany = jest.fn().mockResolvedValue([])
    prisma.restaurant.findMany = jest.fn().mockResolvedValue([])
    prisma.user.findMany = jest
      .fn()
      .mockResolvedValueOnce([{ role: 'user' }, { role: 'user' }])
      .mockResolvedValueOnce([{ role: 'restaurant_vendor' }])
      .mockResolvedValueOnce([{ role: 'rider' }])
    prisma.order.findMany = jest.fn().mockResolvedValue([])
    prisma.order.count = jest.fn().mockResolvedValue(0)

    const { GET } = await import('@/app/api/admin/stats/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(data.stats.customerCount).toBe(2)
    expect(data.stats.vendorCount).toBe(1)
    expect(data.stats.driverCount).toBe(1)
    expect(data.stats.totalUsers).toBe(4)
  })
})

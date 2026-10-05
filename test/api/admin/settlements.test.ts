import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    vendorSettlement: { findMany: jest.fn() },
  },
}))

describe('Admin Settlements API Route', () => {
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  it('fetches all vendor settlements', async () => {
    const mockSettlements = [
      {
        id: 'stl_1',
        restaurant_name: 'Spice Garden',
        gross_sales: 50000,
        commission_amount: 7500,
        net_payout: 42500,
        status: 'settled',
        restaurant: { id: 'vnd_1', name: 'Spice Garden' },
      },
      {
        id: 'stl_2',
        restaurant_name: 'Biryani Blues',
        gross_sales: 35000,
        commission_amount: 5250,
        net_payout: 29750,
        status: 'scheduled',
        restaurant: { id: 'vnd_2', name: 'Biryani Blues' },
      },
    ]
    mockPrisma.vendorSettlement.findMany.mockResolvedValue(mockSettlements)

    const { GET } = await import('@/app/api/admin/settlements/route')
    const req = { headers: { get: () => null } } as unknown as NextRequest

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.settlements).toHaveLength(2)
    expect(data.settlements[0].restaurant_name).toBe('Spice Garden')
  })

  it('returns settlements ordered by payout_date desc', async () => {
    mockPrisma.vendorSettlement.findMany.mockResolvedValue([])

    const { GET } = await import('@/app/api/admin/settlements/route')
    const req = { headers: { get: () => null } } as unknown as NextRequest

    await GET(req)

    expect(mockPrisma.vendorSettlement.findMany).toHaveBeenCalledWith({
      orderBy: { payout_date: 'desc' },
      include: { restaurant: true },
    })
  })

  it('returns 500 on database error', async () => {
    mockPrisma.vendorSettlement.findMany.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/admin/settlements/route')
    const req = { headers: { get: () => null } } as unknown as NextRequest

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBeDefined()
  })
})

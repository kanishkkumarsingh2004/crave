import { prisma } from '@/lib/prisma'
import { listInStockItems } from '@/lib/dal/menu-items'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    menuItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}))

jest.mock('@/lib/supabase', () => {
  const chainable: any = {
    select: () => chainable,
    eq: () => chainable,
    order: () => chainable,
    then: function (resolve: any) {
      return resolve({ data: [], error: null })
    },
  }
  return { supabase: { from: () => chainable } }
})

const mockPrisma = prisma as any

describe('Menu Items DAL - In Stock', () => {
  beforeEach(() => jest.clearAllMocks())

  it('filters out items where in_stock is false', async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([
      { id: 'mi_1', name: 'Pizza', in_stock: true },
      { id: 'mi_2', name: 'Burger', in_stock: false },
      { id: 'mi_3', name: 'Pasta', in_stock: true },
    ])

    const result = await listInStockItems('vnd_1')
    expect(result).toHaveLength(2)
    expect(result.map((i: any) => i.name)).toEqual(['Pizza', 'Pasta'])
  })

  it('returns empty array when no items', async () => {
    mockPrisma.menuItem.findMany.mockResolvedValue([])

    const result = await listInStockItems('vnd_1')
    expect(result).toEqual([])
  })
})

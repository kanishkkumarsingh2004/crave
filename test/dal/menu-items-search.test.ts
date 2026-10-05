import { prisma } from '@/lib/prisma'
import { searchMenuItems } from '@/lib/dal/menu-items'

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

describe('Menu Items DAL - Search', () => {
  beforeEach(() => jest.clearAllMocks())

  it('filters items by name query (case-insensitive)', async () => {
    const mockItems = [
      { id: 'mi_1', name: 'Margherita Pizza', category: 'Pizza', description: 'Tomato, cheese' },
      { id: 'mi_2', name: 'Burger', category: 'Fast Food', description: '' },
    ]
    mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

    const result = await searchMenuItems('vnd_1', 'pizza')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Margherita Pizza')
  })

  it('filters items by category query', async () => {
    const mockItems = [
      { id: 'mi_1', name: 'Burger', category: 'Fast Food', description: '' },
      { id: 'mi_2', name: 'Pizza', category: 'Italian', description: '' },
    ]
    mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

    const result = await searchMenuItems('vnd_1', 'fast')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Burger')
  })

  it('filters items by description query', async () => {
    const mockItems = [
      { id: 'mi_1', name: 'Pizza', category: 'Italian', description: 'Spicy chicken' },
      { id: 'mi_2', name: 'Burger', category: 'Fast Food', description: '' },
    ]
    mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

    const result = await searchMenuItems('vnd_1', 'chicken')
    expect(result).toHaveLength(1)
  })

  it('returns empty array when query does not match', async () => {
    const mockItems = [{ id: 'mi_1', name: 'Pizza', category: 'Italian', description: '' }]
    mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

    const result = await searchMenuItems('vnd_1', 'nonexistent')
    expect(result).toEqual([])
  })
})

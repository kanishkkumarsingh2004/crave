import { prisma } from '@/lib/prisma'
import { findMenuItemById, listMenuItems, searchMenuItems } from '@/lib/dal/menu-items'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    menuItem: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/supabase', () => {
  const chainable = {
    select: () => chainable,
    eq: () => chainable,
    order: () => chainable,
    maybeSingle: async () => ({ data: null, error: { message: 'disabled' } }),
    single: async () => ({ data: null, error: { message: 'disabled' } }),
    insert: () => chainable,
    update: () => chainable,
    delete: () => chainable,
    then: (resolve: any) => resolve({ data: [], error: null }),
  }
  return {
    supabase: {
      from: () => chainable,
    },
  }
})

const mockPrisma = prisma as any

describe('Menu Items DAL', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('findMenuItemById', () => {
    it('returns menu item when found in Prisma', async () => {
      const mockItem = { id: 'mi_1', name: 'Pizza', price: 150 }
      mockPrisma.menuItem.findUnique.mockResolvedValue(mockItem)

      const result = await findMenuItemById('mi_1')
      expect(result).toEqual(mockItem)
      expect(mockPrisma.menuItem.findUnique).toHaveBeenCalledWith({ where: { id: 'mi_1' } })
    })

    it('returns null when not found', async () => {
      mockPrisma.menuItem.findUnique.mockResolvedValue(null)

      const result = await findMenuItemById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('listMenuItems', () => {
    it('returns items ordered by category and name', async () => {
      const mockItems = [{ id: 'mi_1', name: 'Burger', category: 'Fast Food' }]
      mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

      const result = await listMenuItems('vnd_1')
      expect(result).toEqual(mockItems)
      expect(mockPrisma.menuItem.findMany).toHaveBeenCalledWith({
        where: { restaurant_id: 'vnd_1' },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      })
    })

    it('returns empty array when no items', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([])

      const result = await listMenuItems('vnd_1')
      expect(result).toEqual([])
    })
  })

  describe('searchMenuItems', () => {
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
})

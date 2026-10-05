import { createRestaurant, updateRestaurant, deleteRestaurant, findRestaurantById } from '@/lib/dal/restaurants'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    restaurant: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: null }),
        }),
      }),
      delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    }),
  },
}))

const mockPrisma = prisma as any

describe('Restaurant Mutations', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('createRestaurant', () => {
    it('creates a restaurant with all provided fields', async () => {
      const data = {
        id: 'vnd_new',
        name: 'New Kitchen',
        cuisine: 'Italian',
        rating: 4.5,
        address: 'NYC',
        owner_id: 'usr_1',
        is_open: true,
      }
      mockPrisma.restaurant.create.mockResolvedValue(data)

      const result = await createRestaurant(data)
      expect(result).toEqual(data)
      expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({ data })
    })

    it('falls back to Supabase when Prisma fails', async () => {
      mockPrisma.restaurant.create.mockRejectedValue(new Error('DB error'))

      const result = await createRestaurant({
        id: 'vnd_new',
        name: 'Restaurant',
        cuisine: 'Italian',
      })

      expect(result).toBeDefined()
    })
  })

  describe('updateRestaurant', () => {
    it('updates restaurant fields by ID', async () => {
      const updated = { id: 'vnd_1', name: 'Updated Name', is_open: false }
      mockPrisma.restaurant.update.mockResolvedValue(updated)

      const result = await updateRestaurant('vnd_1', { name: 'Updated Name', is_open: false })
      expect(result).toEqual(updated)
    })
  })

  describe('deleteRestaurant', () => {
    it('deletes restaurant by ID', async () => {
      mockPrisma.restaurant.delete.mockResolvedValue({ id: 'vnd_1' })

      const result = await deleteRestaurant('vnd_1')
      expect(result).toEqual({ id: 'vnd_1' })
    })
  })

  describe('findRestaurantById', () => {
    it('returns restaurant with owner relation', async () => {
      const mockRestaurant = {
        id: 'vnd_1',
        name: 'Spice Garden',
        owner: { id: 'usr_1', name: 'Owner' },
        menu_items: [],
      }
      mockPrisma.restaurant.findUnique.mockResolvedValue(mockRestaurant)

      const result = await findRestaurantById('vnd_1')
      expect(result).toEqual(mockRestaurant)
      expect(mockPrisma.restaurant.findUnique).toHaveBeenCalledWith({
        where: { id: 'vnd_1' },
        include: { owner: true },
      })
    })
  })
})

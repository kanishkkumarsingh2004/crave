import {
  findRestaurantById,
  listRestaurants,
  listFoodRestaurants,
  listDarkStores,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
  deleteRestaurantsByOwner,
} from '@/lib/dal/restaurants'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => {
  const mockRestaurant = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  }
  const mockPrisma = {
    restaurant: mockRestaurant,
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
    $queryRaw: jest.fn(),
  }
  return { prisma: mockPrisma, PrismaClient: jest.fn(() => mockPrisma) }
})
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            then: async () => ({ data: [], error: { message: 'Supabase disabled' } }),
          }),
        }),
        maybeSingle: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({ data: null, error: { message: 'Supabase disabled' } }),
        }),
      }),
      delete: () => ({
        eq: () => Promise.resolve({ data: null, error: { message: 'Supabase disabled' } }),
      }),
    }),
  },
}))

const mockPrisma = prisma as any

describe('Restaurants DAL', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('findRestaurantById', () => {
    it('returns restaurant with owner when found in Prisma', async () => {
      const mockRestaurant = {
        id: 'vnd_1',
        name: 'Spice Garden',
        cuisine: 'Indian',
        owner: { id: 'usr_1', name: 'Owner' },
      }
      mockPrisma.restaurant.findUnique = jest.fn().mockResolvedValue(mockRestaurant)

      const result = await findRestaurantById('vnd_1')
      expect(result).toEqual(mockRestaurant)
      expect(mockPrisma.restaurant.findUnique).toHaveBeenCalledWith({
        where: { id: 'vnd_1' },
        include: { owner: true },
      })
    })

    it('returns null when restaurant not found', async () => {
      mockPrisma.restaurant.findUnique = jest.fn().mockResolvedValue(null)
      mockPrisma.restaurant.findUnique = jest.fn().mockResolvedValue(null)

      const result = await findRestaurantById('nonexistent')
      expect(result).toBeNull()
    })
  })

  describe('listRestaurants', () => {
    it('fetches all restaurants without filters', async () => {
      const mockRestaurants = [
        { id: 'vnd_1', name: 'Restaurant A' },
        { id: 'vnd_2', name: 'Restaurant B' },
      ]
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue(mockRestaurants)

      const result = await listRestaurants()
      expect(result).toHaveLength(2)
    })

    it('filters by isDarkStore when provided', async () => {
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue([])

      await listRestaurants({ isDarkStore: true })
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith({
        where: { is_dark_store: true },
        include: { menu_items: true },
        orderBy: { created_at: 'desc' },
      })
    })

    it('filters by isOpen when provided', async () => {
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue([])

      await listRestaurants({ isOpen: false })
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_open: false } })
      )
    })

    it('filters by ownerId when provided', async () => {
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue([])

      await listRestaurants({ ownerId: 'usr_1' })
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { owner_id: 'usr_1' } })
      )
    })
  })

  describe('listFoodRestaurants', () => {
    it('calls listRestaurants with isDarkStore=false', async () => {
      const mockRestaurants = [{ id: 'vnd_1', name: 'Food Place' }]
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue(mockRestaurants)

      const result = await listFoodRestaurants()
      expect(result).toEqual(mockRestaurants)
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_dark_store: false } })
      )
    })
  })

  describe('listDarkStores', () => {
    it('calls listRestaurants with isDarkStore=true', async () => {
      mockPrisma.restaurant.findMany = jest.fn().mockResolvedValue([])

      await listDarkStores()
      expect(mockPrisma.restaurant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_dark_store: true } })
      )
    })
  })

  describe('createRestaurant', () => {
    it('creates a restaurant with provided data', async () => {
      const restaurantData = {
        id: 'vnd_new',
        name: 'New Restaurant',
        cuisine: 'Italian',
        is_open: true,
        owner_id: 'usr_1',
      }
      mockPrisma.restaurant.create = jest.fn().mockResolvedValue(restaurantData)

      const result = await createRestaurant(restaurantData)
      expect(result).toEqual(restaurantData)
    })
  })

  describe('updateRestaurant', () => {
    it('updates a restaurant by ID', async () => {
      const mockUpdated = { id: 'vnd_1', name: 'Updated Name', is_open: false }
      mockPrisma.restaurant.update = jest.fn().mockResolvedValue(mockUpdated)

      const result = await updateRestaurant('vnd_1', { name: 'Updated Name', is_open: false })
      expect(result).toEqual(mockUpdated)
      expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
        where: { id: 'vnd_1' },
        data: { name: 'Updated Name', is_open: false },
      })
    })
  })

  describe('deleteRestaurant', () => {
    it('deletes a restaurant by ID', async () => {
      mockPrisma.restaurant.delete = jest.fn().mockResolvedValue({ id: 'vnd_1' })

      const result = await deleteRestaurant('vnd_1')
      expect(result).toEqual({ id: 'vnd_1' })
    })
  })

  describe('deleteRestaurantsByOwner', () => {
    it('deletes all restaurants belonging to an owner', async () => {
      mockPrisma.restaurant.deleteMany = jest.fn().mockResolvedValue({ count: 3 })

      const result = await deleteRestaurantsByOwner('usr_1')
      expect(mockPrisma.restaurant.deleteMany).toHaveBeenCalledWith({
        where: { owner_id: 'usr_1' },
      })
    })
  })
})

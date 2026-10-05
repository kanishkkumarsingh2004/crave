import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    restaurant: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/dal/restaurants', () => ({
  listRestaurants: jest.fn(),
  findRestaurantById: jest.fn(),
}))

describe('Restaurants API Route - GET', () => {
  const { listRestaurants, findRestaurantById } = require('@/lib/dal/restaurants')

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(url: string): NextRequest {
    return {
      url,
      headers: { get: () => null },
    } as unknown as NextRequest
  }

  it('fetches all restaurants without filters', async () => {
    const mockRestaurants = [{ id: 'vnd_1', name: 'Restaurant A' }]
    listRestaurants.mockResolvedValue(mockRestaurants)

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.restaurants).toEqual(mockRestaurants)
    expect(listRestaurants).toHaveBeenCalledWith()
  })

  it('fetches restaurant by ID when restaurantId param is provided', async () => {
    const mockRestaurant = { id: 'vnd_1', name: 'Spice Garden' }
    findRestaurantById.mockResolvedValue(mockRestaurant)

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants?restaurantId=vnd_1')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.restaurants).toHaveLength(1)
    expect(data.restaurants[0]).toEqual(mockRestaurant)
    expect(findRestaurantById).toHaveBeenCalledWith('vnd_1')
  })

  it('fetches restaurants by ownerId', async () => {
    listRestaurants.mockResolvedValue([])

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants?ownerId=usr_1')

    const response = await GET(req)
    await response.json()

    expect(listRestaurants).toHaveBeenCalledWith({ ownerId: 'usr_1' })
  })

  it('fetches dark stores when isDarkStore=true', async () => {
    listRestaurants.mockResolvedValue([])

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants?isDarkStore=true')

    const response = await GET(req)
    await response.json()

    expect(listRestaurants).toHaveBeenCalledWith({ isDarkStore: true })
  })

  it('fetches food restaurants when isDarkStore=false', async () => {
    listRestaurants.mockResolvedValue([])

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants?isDarkStore=false')

    const response = await GET(req)
    await response.json()

    expect(listRestaurants).toHaveBeenCalledWith({ isDarkStore: false })
  })

  it('returns 500 on error', async () => {
    listRestaurants.mockRejectedValue(new Error('DB error'))

    const { GET } = await import('@/app/api/restaurants/route')
    const req = makeRequest('http://localhost:3000/api/restaurants')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('DB error')
  })
})

describe('Restaurants API Route - POST', () => {
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  function makePostRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => null },
      url: 'http://localhost:3000/api/restaurants',
    } as unknown as NextRequest
  }

  it('creates a restaurant with provided data', async () => {
    const mockRestaurant = {
      id: 'vnd_new',
      name: 'New Kitchen',
      cuisine: 'Italian',
      is_open: true,
    }
    mockPrisma.restaurant.create.mockResolvedValue(mockRestaurant)

    const { POST } = await import('@/app/api/restaurants/route')
    const req = makePostRequest({
      id: 'vnd_new',
      name: 'New Kitchen',
      cuisine: 'Italian',
      owner_id: 'usr_1',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.restaurant).toEqual(mockRestaurant)
  })

  it('uses default values when optional fields are not provided', async () => {
    mockPrisma.restaurant.create.mockResolvedValue({ id: 'auto' })

    const { POST } = await import('@/app/api/restaurants/route')
    const req = makePostRequest({ name: 'My Kitchen' })

    const response = await POST(req)
    await response.json()

    expect(mockPrisma.restaurant.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'My Kitchen',
        cuisine: 'Multi-Cuisine',
        is_open: true,
        is_dark_store: false,
        commission_rate: 15,
        payment_model: 'commission',
      }),
    })
  })
})

describe('Restaurants API Route - PATCH', () => {
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  function makePatchRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => null },
      url: 'http://localhost:3000/api/restaurants',
    } as unknown as NextRequest
  }

  it('updates restaurant is_open status', async () => {
    const mockUpdated = { id: 'vnd_1', is_open: false }
    mockPrisma.restaurant.update.mockResolvedValue(mockUpdated)

    const { PATCH } = await import('@/app/api/restaurants/route')
    const req = makePatchRequest({ id: 'vnd_1', is_open: false })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.restaurant).toEqual(mockUpdated)
    expect(mockPrisma.restaurant.update).toHaveBeenCalledWith({
      where: { id: 'vnd_1' },
      data: { is_open: false },
    })
  })

  it('rejects PATCH when id is missing', async () => {
    const { PATCH } = await import('@/app/api/restaurants/route')
    const req = makePatchRequest({ is_open: false })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })
})

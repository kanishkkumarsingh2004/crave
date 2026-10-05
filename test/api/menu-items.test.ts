import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    menuItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

describe('Menu Items API Route', () => {
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(url: string, body?: any): NextRequest {
    return {
      url,
      json: async () => body || {},
      headers: { get: () => null },
    } as unknown as NextRequest
  }

  describe('GET', () => {
    it('fetches menu items for a restaurant', async () => {
      const mockItems = [{ id: 'mi_1', name: 'Pizza', price: 150 }]
      mockPrisma.menuItem.findMany.mockResolvedValue(mockItems)

      const { GET } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items?restaurantId=vnd_1')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.items).toHaveLength(1)
      expect(data.items[0].name).toBe('Pizza')
    })

    it('rejects when restaurantId is missing', async () => {
      const { GET } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('restaurantId required')
    })

    it('returns empty array when no items found', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items?restaurantId=vnd_1')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toEqual([])
    })

    it('returns 500 on database error', async () => {
      mockPrisma.menuItem.findMany.mockRejectedValue(new Error('DB error'))

      const { GET } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items?restaurantId=vnd_1')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('POST', () => {
    it('creates a new menu item', async () => {
      const mockItem = { id: 'mi_new', name: 'Burger', price: 200 }
      mockPrisma.menuItem.create.mockResolvedValue(mockItem)

      const { POST } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items', {
        restaurant_id: 'vnd_1',
        name: 'Burger',
        category: 'Fast Food',
        price: 200,
      })

      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.item).toEqual(mockItem)
    })

    it('normalizes price to Number', async () => {
      mockPrisma.menuItem.create.mockResolvedValue({})
      const { POST } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items', {
        restaurant_id: 'vnd_1',
        name: 'Burger',
        category: 'Fast Food',
        price: '250',
      })

      await POST(req)

      const callArg = mockPrisma.menuItem.create.mock.calls[0][0]
      expect(callArg.data.price).toBe(250)
      expect(typeof callArg.data.price).toBe('number')
    })
  })

  describe('PATCH', () => {
    it('updates an existing menu item', async () => {
      const mockUpdated = { id: 'mi_1', name: 'Updated Burger', price: 250 }
      mockPrisma.menuItem.update.mockResolvedValue(mockUpdated)

      const { PATCH } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items', {
        id: 'mi_1',
        name: 'Updated Burger',
        price: 250,
      })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.item).toEqual(mockUpdated)
    })

    it('rejects when id is missing', async () => {
      const { PATCH } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items', {
        name: 'Test',
      })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Item ID required')
    })
  })

  describe('DELETE', () => {
    it('deletes a menu item by ID', async () => {
      mockPrisma.menuItem.delete.mockResolvedValue({ id: 'mi_1' })

      const { DELETE } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items?id=mi_1')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(mockPrisma.menuItem.delete).toHaveBeenCalledWith({ where: { id: 'mi_1' } })
    })

    it('rejects when id is missing', async () => {
      const { DELETE } = await import('@/app/api/menu-items/route')
      const req = makeRequest('http://localhost:3000/api/menu-items')

      const response = await DELETE(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Item ID required')
    })
  })
})

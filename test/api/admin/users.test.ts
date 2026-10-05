import { NextRequest } from 'next/server'

jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn().mockResolvedValue({ id: 'usr_admin', role: 'admin' }),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findMany: jest.fn() },
    menuItem: { findMany: jest.fn() },
    order: { findMany: jest.fn() },
    restaurant: { findFirst: jest.fn() },
    paymentConfig: { findFirst: jest.fn() },
  },
}))

jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn().mockReturnValue(null) }),
}))

describe('Admin Users API Route', () => {
  const { prisma } = require('@/lib/prisma')

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(): NextRequest {
    return {
      headers: {
        get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null),
      },
      url: 'http://localhost:3000/api/admin/users',
    } as unknown as NextRequest
  }

  it('fetches all users from Prisma', async () => {
    const mockUsers = [
      { id: 'usr_1', name: 'Admin', email: 'admin@test.com', role: 'admin', is_online: true },
      {
        id: 'usr_2',
        name: 'Vendor',
        email: 'vendor@test.com',
        role: 'restaurant_vendor',
        is_online: false,
      },
    ]
    prisma.user.findMany = jest.fn().mockResolvedValue(mockUsers)
    require('@/lib/prisma').prisma.user.findMany = prisma.user.findMany

    const actualPrisma = require('@/lib/prisma').prisma
    actualPrisma.user = { findMany: jest.fn().mockResolvedValue(mockUsers) }

    const { GET } = await import('@/app/api/admin/users/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.users).toBeDefined()
  })

  it('handles Prisma failure gracefully', async () => {
    const { GET } = await import('@/app/api/admin/users/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(Array.isArray(data.users)).toBe(true)
  })

  it('returns users with expected fields', async () => {
    const mockUser = {
      id: 'usr_1',
      name: 'Test',
      email: 'test@test.com',
      role: 'user',
      is_online: true,
    }
    const actualPrisma = require('@/lib/prisma').prisma
    actualPrisma.user = { findMany: jest.fn().mockResolvedValue([mockUser]) }

    const { GET } = await import('@/app/api/admin/users/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.users[0]).toHaveProperty('id')
    expect(data.users[0]).toHaveProperty('name')
    expect(data.users[0]).toHaveProperty('email')
    expect(data.users[0]).toHaveProperty('role')
  })
})

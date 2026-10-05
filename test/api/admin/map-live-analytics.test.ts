import { GET } from '@/app/api/admin/map-live-analytics/route'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'

jest.mock('@/lib/prisma', () => require('../../__mocks__/prisma'))
jest.mock('@/lib/jwt', () => ({
  verifyToken: jest.fn(),
}))

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockResolvedValue({
    get: jest.fn((name: string) => (name === 'crave_auth_token' ? { value: 'admin_token' } : null)),
  }),
}))

const mockPrisma = prisma as any

describe('/api/admin/map-live-analytics API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('GET returns 401 for non-admin user', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ role: 'customer' })
    const req = new Request('http://localhost/api/admin/map-live-analytics')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  test('GET returns live telemetry pins from DB for admin', async () => {
    ;(verifyToken as jest.Mock).mockResolvedValueOnce({ role: 'admin' })
    mockPrisma.restaurant.findMany.mockResolvedValueOnce([
      {
        id: 'rst_1',
        name: 'Rolls & Bowls',
        address: 'Main Gate',
        latitude: '12.65',
        longitude: '77.44',
        is_open: true,
        is_dark_store: false,
        delivery_minutes: 15,
      },
    ])
    mockPrisma.order.findMany.mockResolvedValueOnce([])
    mockPrisma.user.findMany.mockResolvedValueOnce([])
    if (mockPrisma.customerAddress?.findMany) {
      mockPrisma.customerAddress.findMany.mockResolvedValueOnce([])
    }

    const req = new Request('http://localhost/api/admin/map-live-analytics', {
      headers: { Authorization: 'Bearer admin_token' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.pins).toHaveLength(1)
    expect(json.pins[0].name).toBe('Rolls & Bowls')
    expect(json.stats.openKitchensCount).toBe(1)
  })
})

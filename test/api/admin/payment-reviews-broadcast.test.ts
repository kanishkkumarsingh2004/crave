import { NextRequest } from 'next/server'

const mockVerifyToken = jest.fn().mockResolvedValue({
  id: 'usr_admin',
  role: 'admin',
  email: 'admin@test.com',
})

jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentReview: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
  createToken: jest.fn(),
  JWTPayload: {},
}))

jest.mock('next/headers', () => ({
  cookies: () => ({ get: jest.fn().mockReturnValue(null) }),
}))

describe('Payment Reviews PATCH - Broadcast Integration', () => {
  const mockPrisma = require('@/lib/prisma').prisma
  const { broadcast } = require('@/lib/ws-server')

  beforeEach(() => {
    jest.clearAllMocks()
    mockVerifyToken.mockResolvedValue({
      id: 'usr_admin',
      role: 'admin',
      email: 'admin@test.com',
    })
  })

  function makeRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => 'Bearer admin-token' },
      url: 'http://localhost:3000/api/admin/payment-reviews',
    } as unknown as NextRequest
  }

  it('broadcasts approval_update to admin channel on verification', async () => {
    mockPrisma.paymentReview.findUnique.mockResolvedValue({
      id: 'pr_1',
      order_id: 'ord_1',
      status: 'verified',
    })
    mockPrisma.paymentReview.update.mockResolvedValue({
      id: 'pr_1',
      order_id: 'ord_1',
      status: 'verified',
    })
    mockPrisma.order.update.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
    const req = makeRequest({ id: 'pr_1', status: 'verified' })

    const response = await PATCH(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({
        status: 'verified',
        orderId: 'ord_1',
      })
    )
  })

  it('broadcasts approval_update to admin channel on rejection', async () => {
    mockPrisma.paymentReview.findUnique.mockResolvedValue({
      id: 'pr_2',
      order_id: 'ord_2',
      status: 'rejected',
    })
    mockPrisma.paymentReview.update.mockResolvedValue({
      id: 'pr_2',
      order_id: 'ord_2',
      status: 'rejected',
    })
    mockPrisma.order.update.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
    const req = makeRequest({ id: 'pr_2', status: 'rejected' })

    await PATCH(req)

    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({
        status: 'rejected',
        orderId: 'ord_2',
      })
    )
  })

  it('broadcasts approval_update to admin channel on pending', async () => {
    mockPrisma.paymentReview.findUnique.mockResolvedValue({
      id: 'pr_3',
      order_id: 'ord_3',
      status: 'pending',
    })
    mockPrisma.paymentReview.update.mockResolvedValue({
      id: 'pr_3',
      order_id: 'ord_3',
      status: 'pending',
    })
    mockPrisma.order.update.mockResolvedValue({})

    const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
    const req = makeRequest({ id: 'pr_3', status: 'pending' })

    await PATCH(req)

    expect(broadcast).toHaveBeenCalledWith(
      'approval_update',
      expect.objectContaining({
        status: 'pending',
      })
    )
  })
})

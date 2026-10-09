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
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/jwt', () => ({
  verifyToken: (...args: any[]) => mockVerifyToken(...args),
  createToken: jest.fn(),
  JWTPayload: {},
}))

jest.mock('@/lib/ws-server', () => ({
  broadcast: jest.fn().mockReturnValue(true),
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn().mockReturnValue(null),
  }),
}))

describe('Admin Payment Reviews API - approval_update broadcast', () => {
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

  function makeGetRequest(url: string): NextRequest {
    return {
      url,
      headers: {
        get: (k: string) => (k.toLowerCase() === 'authorization' ? 'Bearer admin-token' : null),
      },
    } as unknown as NextRequest
  }

  function makePatchRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => 'Bearer admin-token' },
      url: 'http://localhost:3000/api/admin/payment-reviews',
    } as unknown as NextRequest
  }

  describe('GET', () => {
    it('fetches all payment reviews', async () => {
      const mockReviews = [
        { id: 'pr_1', order_id: 'ord_1', utr_ref: '123456789012', amount: 500, status: 'pending' },
        { id: 'pr_2', order_id: 'ord_2', utr_ref: '987654321098', amount: 300, status: 'verified' },
      ]
      mockPrisma.paymentReview.findMany.mockResolvedValue(mockReviews)

      const { GET } = await import('@/app/api/admin/payment-reviews/route')
      const req = makeGetRequest('http://localhost:3000/api/admin/payment-reviews')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reviews).toHaveLength(2)
    })

    it('filters by status when provided', async () => {
      mockPrisma.paymentReview.findMany.mockResolvedValue([])

      const { GET } = await import('@/app/api/admin/payment-reviews/route')
      const req = makeGetRequest('http://localhost:3000/api/admin/payment-reviews?status=pending')

      const response = await GET(req)
      await response.json()

      expect(mockPrisma.paymentReview.findMany).toHaveBeenCalledWith({
        where: { status: 'pending' },
        orderBy: { created_at: 'desc' },
      })
    })

    it('returns 500 on error', async () => {
      mockPrisma.paymentReview.findMany.mockRejectedValue(new Error('DB error'))

      const { GET } = await import('@/app/api/admin/payment-reviews/route')
      const req = makeGetRequest('http://localhost:3000/api/admin/payment-reviews')

      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBeDefined()
    })
  })

  describe('PATCH - approval_update broadcast', () => {
    it('broadcasts approval_update when payment status changes to verified', async () => {
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
      const req = makePatchRequest({ id: 'pr_1', status: 'verified' })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(broadcast).toHaveBeenCalledWith(
        'approval_update',
        expect.objectContaining({ status: 'verified', orderId: 'ord_1' })
      )
    })

    it('broadcasts approval_update when payment status changes to rejected', async () => {
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
      const req = makePatchRequest({ id: 'pr_2', status: 'rejected' })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(broadcast).toHaveBeenCalledWith(
        'approval_update',
        expect.objectContaining({ status: 'rejected' })
      )
    })

    it('rejects when id is missing', async () => {
      const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
      const req = makePatchRequest({ status: 'verified' })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Review ID and status are required')
    })

    it('rejects when status is missing', async () => {
      const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
      const req = makePatchRequest({ id: 'pr_1' })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Review ID and status are required')
    })

    it('rejects non-admin role', async () => {
      mockVerifyToken.mockResolvedValueOnce({
        id: 'usr_regular',
        role: 'user',
        email: 'user@test.com',
      })

      const { PATCH } = await import('@/app/api/admin/payment-reviews/route')
      const req = makePatchRequest({ id: 'pr_1', status: 'verified' })

      const response = await PATCH(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error.toLowerCase()).toContain('admin')
    })
  })
})

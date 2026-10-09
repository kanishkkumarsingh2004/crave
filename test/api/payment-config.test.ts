import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    paymentConfig: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

describe('Payment Config API', () => {
  const mockPrisma = require('@/lib/prisma').prisma

  beforeEach(() => jest.clearAllMocks())

  function makeGetRequest(): NextRequest {
    return {
      url: 'http://localhost:3000/api/payment-config',
      headers: { get: () => null },
    } as unknown as NextRequest
  }

  function makePostRequest(
    body: any,
    role: string = 'admin',
    userId: string = 'usr_test_user'
  ): NextRequest {
    return {
      json: async () => body,
      headers: {
        get: (name: string) => {
          if (name === 'x-test-auth') return 'true'
          if (name === 'x-test-role') return role
          if (name === 'x-test-user-id') return userId
          return null
        },
      },
      url: 'http://localhost:3000/api/payment-config',
    } as unknown as NextRequest
  }

  it('GET returns active payment config', async () => {
    const mockConfig = {
      id: 'default_config',
      merchant_vpa: 'crave@upi',
      is_active: true,
    }
    mockPrisma.paymentConfig.findFirst.mockResolvedValue(mockConfig)

    const { GET } = await import('@/app/api/payment-config/route')
    const req = makeGetRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.config).toBeDefined()
    expect(data.config.merchant_vpa).toBe('crave@upi')
  })

  it('GET returns default config when none in DB', async () => {
    mockPrisma.paymentConfig.findFirst.mockResolvedValue(null)

    const { GET } = await import('@/app/api/payment-config/route')
    const req = makeGetRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.config).toBeDefined()
    expect(data.config.upiVpa).toBe('crave@upi')
  })

  it('POST creates or updates payment config', async () => {
    const mockConfig = {
      id: 'cfg_1',
      name: 'UPI Config',
      merchant_vpa: 'crave@upi',
      is_active: true,
    }
    mockPrisma.paymentConfig.upsert.mockResolvedValue(mockConfig)

    const { POST } = await import('@/app/api/payment-config/route')
    const req = makePostRequest({
      id: 'cfg_1',
      name: 'UPI Config',
      merchant_vpa: 'crave@upi',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.config).toBeDefined()
    expect(data.config.upiVpa).toBe('crave@upi')
  })
})

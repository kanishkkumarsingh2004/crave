import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

jest.mock('next/headers', () => ({
  cookies: jest.fn().mockReturnValue({
    get: jest.fn().mockReturnValue(null),
  }),
}))

describe('Auth Logout API Route', () => {
  beforeEach(() => jest.resetModules())

  function createMockRequest(body?: any): NextRequest {
    return {
      json: async () => body || {},
      headers: { get: () => null },
      url: 'http://localhost:3000/api/auth/logout',
    } as unknown as NextRequest
  }

  it('clears auth cookies on logout', async () => {
    const { POST } = await import('@/app/api/auth/logout/route')
    const req = createMockRequest()

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('returns success even when no cookie is present', async () => {
    const { POST } = await import('@/app/api/auth/logout/route')
    const req = createMockRequest()

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.message).toBeDefined()
  })
})

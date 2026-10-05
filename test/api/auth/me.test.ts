import { NextRequest } from 'next/server'

describe('Auth Me API Route', () => {
  beforeEach(() => jest.clearAllMocks())

  function makeRequest(token?: string): NextRequest {
    const headers: Record<string, string> = {}
    if (token) {
      headers['Cookie'] = `crave_auth_token=${token}`
    }
    return {
      headers: { get: (key: string) => headers[key] || null },
      url: 'http://localhost:3000/api/auth/me',
    } as unknown as NextRequest
  }

  it('returns 401 when no token is provided', async () => {
    const { GET } = require('@/app/api/auth/me/route')
    const req = makeRequest()

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.authenticated).toBe(false)
  })

  it('returns user data when valid token is provided', async () => {
    jest.resetModules()
    jest.doMock('@/lib/jwt', () => ({
      verifyToken: jest.fn().mockResolvedValue({
        id: 'usr_1',
        name: 'Test User',
        email: 'test@test.com',
        role: 'user',
      }),
    }))

    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: jest.fn().mockReturnValue({ value: 'valid.jwt.token' }),
      }),
    }))

    const { GET } = require('@/app/api/auth/me/route')
    const req = makeRequest('valid.jwt.token')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe('usr_1')
  })

  it('returns 401 when token is invalid', async () => {
    jest.resetModules()
    jest.doMock('@/lib/jwt', () => ({
      verifyToken: jest.fn().mockResolvedValue(null),
    }))

    jest.doMock('next/headers', () => ({
      cookies: () => ({
        get: jest.fn().mockReturnValue({ value: 'invalid.token' }),
      }),
    }))

    const { GET } = require('@/app/api/auth/me/route')
    const req = makeRequest('invalid.token')

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
  })
})

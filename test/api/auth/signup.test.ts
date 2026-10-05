import { NextRequest } from 'next/server'
import crypto from 'crypto'

describe('Auth Signup API Route', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  function createMockRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: {
        get: (key: string) =>
          key === 'Content-Type' ? 'application/json' : null,
      },
      url: 'http://localhost:3000/api/auth/signup',
    } as unknown as NextRequest
  }

  it('rejects missing email', async () => {
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue(null),
    }))

    const { POST } = await import('@/app/api/auth/signup/route')
    const req = createMockRequest({ password: '1234567890', role: 'user', name: 'Test' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('rejects missing password', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const req = createMockRequest({ email: 'test@crave.local', role: 'user', name: 'Test' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('rejects missing role', async () => {
    const { POST } = await import('@/app/api/auth/signup/route')
    const req = createMockRequest({ email: 'test@crave.local', password: '1234567890', name: 'Test' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('role')
  })

  it('rejects when user already exists', async () => {
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue({ id: 'usr_existing', email: 'test@crave.local' }),
    }))

    const { POST } = await import('@/app/api/auth/signup/route')
    const req = createMockRequest({
      email: 'test@crave.local',
      password: '1234567890',
      role: 'user',
      name: 'Test',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
  })

  it('creates a new user on valid signup', async () => {
    const mockCreatedUser = {
      id: 'usr_new',
      name: 'New User',
      email: 'new@crave.local',
      role: 'user',
      password_hash: 'hash',
    }
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue(null),
      createUser: jest.fn().mockResolvedValue(mockCreatedUser),
    }))
    jest.doMock('@/lib/jwt', () => ({
      createToken: jest.fn().mockResolvedValue('mock_jwt_token'),
    }))

    const { POST } = await import('@/app/api/auth/signup/route')
    const req = createMockRequest({
      email: 'new@crave.local',
      password: '1234567890',
      role: 'user',
      name: 'New User',
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.token).toBe('mock_jwt_token')
    expect(data.user.email).toBe('new@crave.local')
  })
})

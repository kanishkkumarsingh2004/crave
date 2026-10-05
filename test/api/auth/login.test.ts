import { createToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

describe('Auth Login API Route', () => {
  const mockCookiesGet = jest.fn()
  const mockCookiesSet = jest.fn()

  beforeEach(() => {
    jest.resetModules()
    ;(cookies as jest.Mock).mockReset()
    ;(cookies as jest.Mock).mockReturnValue({
      get: mockCookiesGet,
      set: mockCookiesSet,
    })
  })

  function createMockRequest(body: any, token?: string): NextRequest {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
      headers['Cookie'] = `crave_auth_token=${token}`
    }
    return {
      json: async () => body,
      headers: {
        get: (key: string) => headers[key] || null,
      },
      url: 'http://localhost:3000/api/auth/login',
    } as unknown as NextRequest
  }

  it('rejects request with missing email', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ password: '1234567890' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('rejects request with missing password', async () => {
    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'test@crave.local' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('required')
  })

  it('normalizes email to lowercase', async () => {
    const mockUser = {
      id: 'usr_1',
      email: 'TEST@CRAVE.LOCAL',
      role: 'user',
      password_hash: 'somehash',
    }
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue(mockUser),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'TEST@CRAVE.LOCAL', password: '1234567890' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toContain('Invalid')
  })

  it('rejects with 401 when user not found', async () => {
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue(null),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'notfound@crave.local', password: '1234567890' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Invalid email or password')
  })

  it('rejects with 401 when user has no password_hash', async () => {
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue({
        id: 'usr_1',
        email: 'test@crave.local',
        role: 'user',
        password_hash: null,
      }),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'test@crave.local', password: '1234567890' })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('rejects with 401 when password is incorrect', async () => {
    const crypto = require('crypto')
    const correctHash = crypto.scryptSync('correctpassword', 'test@crave.local', 64).toString('hex')

    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue({
        id: 'usr_1',
        email: 'test@crave.local',
        role: 'user',
        password_hash: correctHash,
      }),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'test@crave.local', password: 'wrongpassword' })

    const response = await POST(req)
    expect(response.status).toBe(401)
  })

  it('returns a valid token and user payload on successful login', async () => {
    const crypto = require('crypto')
    const passwordHash = crypto
      .scryptSync('1234567890', 'user.test@crave.local', 64)
      .toString('hex')

    const mockUser = {
      id: 'usr_test_user',
      name: 'Test User',
      email: 'user.test@crave.local',
      role: 'user',
      password_hash: passwordHash,
      phone: '+919876543210',
      address: 'Bengaluru',
      restaurant_name: null,
      cuisine: null,
      locale: 'en',
    }
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockResolvedValue(mockUser),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'user.test@crave.local', password: '1234567890' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.token).toBeDefined()
    expect(data.user).toBeDefined()
    expect(data.user.id).toBe('usr_test_user')
    expect(data.user.role).toBe('user')
    expect(data.user.restaurantName).toBeUndefined()
  })

  it('returns 500 on unexpected error', async () => {
    jest.doMock('@/lib/dal', () => ({
      findUserByEmail: jest.fn().mockRejectedValue(new Error('DB connection failed')),
    }))

    const { POST } = await import('@/app/api/auth/login/route')
    const req = createMockRequest({ email: 'test@crave.local', password: '1234567890' })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('DB connection failed')
  })
})

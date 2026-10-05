import { NextRequest } from 'next/server'
import crypto from 'crypto'

jest.mock('@/lib/dal', () => ({
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
}))

jest.mock('@/lib/jwt', () => ({
  createToken: jest.fn().mockResolvedValue('mock.jwt.token'),
}))

describe('Auth Signup API - Password Hashing', () => {
  const { findUserByEmail, createUser } = require('@/lib/dal')
  const { createToken } = require('@/lib/jwt')

  beforeEach(() => jest.clearAllMocks())

  function makeRequest(body: any): NextRequest {
    return {
      json: async () => body,
      headers: { get: () => null },
      url: 'http://localhost:3000/api/auth/signup',
    } as unknown as NextRequest
  }

  it('hashes password with scrypt before storing', async () => {
    findUserByEmail.mockResolvedValue(null)
    createUser.mockImplementation((data: any) => {
      expect(data.password_hash).toBeDefined()
      expect(data.password_hash.length).toBeGreaterThan(0)
      const expectedHash = crypto.scryptSync('1234567890', 'new@test.com', 64).toString('hex')
      expect(data.password_hash).toBe(expectedHash)
      return Promise.resolve({ ...data })
    })

    const { POST } = await import('@/app/api/auth/signup/route')
    const req = makeRequest({
      email: 'new@test.com',
      password: '1234567890',
      name: 'New User',
      role: 'user',
    })

    await POST(req)

    const createCall = createUser.mock.calls[0][0]
    expect(createCall.password).toBeUndefined()
    expect(createCall.password_hash).toBeDefined()
  })

  it('does not store plaintext password in user data', async () => {
    findUserByEmail.mockResolvedValue(null)
    createUser.mockImplementation((data: any) => {
      expect(data.password).toBeUndefined()
      return Promise.resolve({ ...data })
    })

    const { POST } = await import('@/app/api/auth/signup/route')
    const req = makeRequest({
      email: 'notstored@test.com',
      password: 'supersecret',
      name: 'User',
      role: 'user',
    })

    await POST(req)

    const createCall = createUser.mock.calls[0][0]
    expect(JSON.stringify(createCall)).not.toContain('supersecret')
  })
})

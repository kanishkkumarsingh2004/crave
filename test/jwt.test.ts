import { createToken, verifyToken, JWTPayload } from '@/lib/jwt'

jest.mock('jose', () => {
  const crypto = require('crypto')

  function base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
  }

  function base64UrlDecode(str: string): string {
    const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
    const normal = padded.replace(/-/g, '+').replace(/_/g, '/')
    return Buffer.from(normal, 'base64').toString()
  }

  class SignJWT {
    private payload: Record<string, any> = {}
    private header: Record<string, any> = {}

    constructor(payload: Record<string, any> = {}) {
      this.payload = { ...payload }
    }

    setProtectedHeader(header: Record<string, any>) {
      this.header = header
      return this
    }

    setIssuedAt() {
      this.payload.iat = Math.floor(Date.now() / 1000)
      return this
    }

    setExpirationTime(exp: string | number) {
      if (typeof exp === 'string' && exp.endsWith('d')) {
        const days = parseInt(exp)
        this.payload.exp = Math.floor(Date.now() / 1000) + days * 24 * 60 * 60
      } else {
        this.payload.exp = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60
      }
      return this
    }

    sign(secret: string | Uint8Array): Promise<string> {
      const header = base64UrlEncode(JSON.stringify(this.header))
      const payload = base64UrlEncode(JSON.stringify(this.payload))
      const data = `${header}.${payload}`
      const signature = crypto
        .createHmac(
          'sha256',
          Buffer.from(typeof secret === 'string' ? secret : new TextDecoder().decode(secret))
        )
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      return Promise.resolve(`${data}.${signature}`)
    }
  }

  async function jwtVerify(token: string, secret: string | Uint8Array, _opts?: any) {
    const parts = token.split('.')
    if (parts.length !== 3) {
      throw new Error('Invalid token')
    }

    const [headerB64, payloadB64, signature] = parts
    const data = `${headerB64}.${payloadB64}`
    const secretKey = typeof secret === 'string' ? secret : new TextDecoder().decode(secret)
    const expectedSignature = crypto
      .createHmac('sha256', Buffer.from(secretKey))
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature')
    }

    const payload = JSON.parse(base64UrlDecode(payloadB64))

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      throw new Error('Token expired')
    }

    return { payload }
  }

  return { SignJWT, jwtVerify }
})

describe('JWT Token Service', () => {
  const mockPayload: JWTPayload = {
    id: 'usr_test_user',
    name: 'Test User',
    email: 'user.test@crave.local',
    role: 'user',
    phone: '+919876543210',
    address: 'Bengaluru, India',
    locale: 'en',
  }

  it('creates a valid JWT token for a user payload', async () => {
    const token = await createToken(mockPayload)
    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.split('.').length).toBe(3)
  })

  it('verifies and decodes a created token correctly', async () => {
    const token = await createToken(mockPayload)
    const payload = await verifyToken(token)
    expect(payload).not.toBeNull()
    expect(payload!.id).toBe(mockPayload.id)
    expect(payload!.email).toBe(mockPayload.email)
    expect(payload!.role).toBe('user')
    expect(payload!.name).toBe(mockPayload.name)
  })

  it('returns null for an invalid token', async () => {
    const payload = await verifyToken('invalid.token.string')
    expect(payload).toBeNull()
  })

  it('returns null for a malformed token', async () => {
    const payload = await verifyToken('not-a-jwt')
    expect(payload).toBeNull()
  })

  it('returns null for an empty string token', async () => {
    const payload = await verifyToken('')
    expect(payload).toBeNull()
  })

  it('preserves all custom claims in the token payload', async () => {
    const token = await createToken({
      ...mockPayload,
      restaurantName: 'Spice Garden',
      cuisine: 'Indian',
    })
    const payload = await verifyToken(token)
    expect(payload!.restaurantName).toBe('Spice Garden')
    expect(payload!.cuisine).toBe('Indian')
  })

  it('creates different tokens for different payloads', async () => {
    const token1 = await createToken(mockPayload)
    const token2 = await createToken({ ...mockPayload, id: 'usr_different' })
    expect(token1).not.toBe(token2)
  })
})

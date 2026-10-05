import { createToken, verifyToken } from '@/lib/jwt'
import { JWTPayload } from '@/lib/jwt'

jest.mock('jose', () => {
  const crypto = require('crypto')

  function base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
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
        this.payload.exp = Math.floor(Date.now() / 1000) + parseInt(exp) * 24 * 60 * 60
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
          Buffer.from(
            typeof secret === 'string' ? secret : new TextDecoder().decode(secret),
            'utf8'
          )
        )
        .update(data)
        .digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')
      return Promise.resolve(`${data}.${signature}`)
    }
  }

  async function jwtVerify(token: string, secret: string | Uint8Array) {
    const parts = token.split('.')
    if (parts.length !== 3) throw new Error('Invalid token')
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
    if (signature !== expectedSignature) throw new Error('Invalid signature')
    const padded = payloadB64 + '='.repeat((4 - (payloadB64.length % 4)) % 4)
    const normal = padded.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(Buffer.from(normal, 'base64').toString())
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) throw new Error('Token expired')
    return { payload }
  }

  return { SignJWT, jwtVerify }
})

describe('JWT - Token Expiry and Claims', () => {
  it('token expires within 7 days', async () => {
    const token = await createToken({
      id: 'usr_1',
      name: 'Test',
      email: 'test@test.com',
      role: 'user',
    })

    expect(token).toBeDefined()
    const parts = token.split('.')
    expect(parts).toHaveLength(3)

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString())
    const issuedAt = payload.iat
    const expTime = payload.exp
    const diffHours = (expTime - issuedAt) / 3600

    expect(diffHours).toBeCloseTo(168, 0)
  })

  it('token includes required role field', async () => {
    const roles = ['user', 'restaurant_vendor', 'admin', 'rider', 'cravexp_store_vendor'] as const

    for (const role of roles) {
      const token = await createToken({
        id: `usr_${role}`,
        name: 'Test',
        email: `test@${role}.com`,
        role,
      })
      const payload = await verifyToken(token)
      expect(payload?.role).toBe(role)
    }
  })

  it('token payload can be decoded to original values', async () => {
    const payload: JWTPayload = {
      id: 'usr_test',
      name: 'John Doe',
      email: 'john@example.com',
      role: 'user',
      phone: '+919876543210',
      address: 'Bengaluru',
      restaurantName: 'Spice Garden',
      cuisine: 'Indian',
    }

    const token = await createToken(payload)
    const decoded = await verifyToken(token)

    expect(decoded).toEqual(
      expect.objectContaining({
        id: 'usr_test',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+919876543210',
        address: 'Bengaluru',
        restaurantName: 'Spice Garden',
        cuisine: 'Indian',
      })
    )
  })

  it('rejects token signed with wrong secret', async () => {
    const crypto = require('crypto')
    const wrongSecret = crypto.randomBytes(32).toString('hex')
    const { SignJWT } = require('jose')

    const token = await new SignJWT({
      id: 'usr_1',
      name: 'Test',
      email: 'test@test.com',
      role: 'user',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(new TextEncoder().encode(wrongSecret))

    const payload = await verifyToken(token)
    expect(payload).toBeNull()
  })
})

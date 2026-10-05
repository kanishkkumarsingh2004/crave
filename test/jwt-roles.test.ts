import { createToken, verifyToken } from '@/lib/jwt'

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
        .createHmac('sha256', Buffer.from(typeof secret === 'string' ? secret : new TextDecoder().decode(secret)))
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

    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
      throw new Error('Token expired')
    }

    return { payload }
  }

  return { SignJWT, jwtVerify }
})

describe('JWT - Role Based Access Control', () => {
  const generateToken = async (role: string) => {
    return createToken({
      id: `usr_${role}`,
      name: 'Test User',
      email: `test@${role}.com`,
      role: role as any,
    })
  }

  it('user role token is verified correctly', async () => {
    const token = await generateToken('user')
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('user')
  })

  it('admin role token is verified correctly', async () => {
    const token = await generateToken('admin')
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('admin')
  })

  it('restaurant_vendor role token is verified correctly', async () => {
    const token = await generateToken('restaurant_vendor')
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('restaurant_vendor')
  })

  it('rider role token is verified correctly', async () => {
    const token = await generateToken('rider')
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('rider')
  })

  it('cravexp_store_vendor role token is verified correctly', async () => {
    const token = await generateToken('cravexp_store_vendor')
    const payload = await verifyToken(token)
    expect(payload?.role).toBe('cravexp_store_vendor')
  })

  it('each role produces a unique token', async () => {
    const tokens = await Promise.all([
      generateToken('user'),
      generateToken('admin'),
      generateToken('restaurant_vendor'),
      generateToken('rider'),
      generateToken('cravexp_store_vendor'),
    ])

    const unique = new Set(tokens)
    expect(unique.size).toBe(5)
  })
})

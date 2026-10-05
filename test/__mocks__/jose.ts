const crypto = require('crypto')

const JWT_SECRET =
  process.env.JWT_SECRET || 'crave_jwt_secret_key_bengaluru_2026_super_secure_auth'

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
  private secretKey: string | Uint8Array = JWT_SECRET

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
    this.secretKey = secret
    const header = base64UrlEncode(JSON.stringify(this.header))
    const payload = base64UrlEncode(JSON.stringify({ ...this.payload }))
    const data = `${header}.${payload}`
    const signature = crypto
      .createHmac('sha256', Buffer.from(typeof secret === 'string' ? secret : String(secret)))
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
  const expectedSignature = crypto
    .createHmac('sha256', Buffer.from(typeof secret === 'string' ? secret : String(secret)))
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  if (signature !== expectedSignature) {
    throw new Error('Invalid signature')
  }

  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token expired')
  }

  return { payload }
}

module.exports = { SignJWT, jwtVerify }

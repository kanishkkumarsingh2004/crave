import { SignJWT, jwtVerify } from 'jose'

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL: JWT_SECRET environment variable must be configured in production!')
}
const jwtSecret = process.env.JWT_SECRET || 'REDACTED_JWT_SECRET'
const JWT_SECRET = new TextEncoder().encode(jwtSecret)

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: 'user' | 'restaurant_vendor' | 'cravexp_store_vendor' | 'rider' | 'admin'
  phone?: string
  address?: string
  avatar?: string
  restaurantName?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
  /** ISO 639-1 locale code stored on the user row, e.g. 'en' | 'kn' */
  locale?: string
  [key: string]: any
}

export async function createToken(payload: JWTPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)

  return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    })
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}

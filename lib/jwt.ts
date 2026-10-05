import { SignJWT, jwtVerify } from 'jose'

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'REDACTED_JWT_SECRET'
  return new TextEncoder().encode(secret)
}

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
    .sign(getJwtSecretKey())

  return token
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ['HS256'],
    })
    return payload as JWTPayload
  } catch (error) {
    return null
  }
}

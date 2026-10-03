import { SignJWT, jwtVerify } from 'jose'

const jwtSecret = process.env.JWT_SECRET
if (!jwtSecret) throw new Error('JWT_SECRET must be configured in the environment.')
const JWT_SECRET = new TextEncoder().encode(jwtSecret)

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: 'customer' | 'vendor' | 'driver' | 'admin'
  phone?: string
  address?: string
  restaurantName?: string
  cuisine?: string
  vehicleType?: string
  licensePlate?: string
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

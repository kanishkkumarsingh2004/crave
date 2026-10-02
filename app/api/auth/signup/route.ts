import { NextResponse } from 'next/server'
import { createToken, JWTPayload } from '@/lib/jwt'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, role, phone, address, restaurantName, cuisine, vehicleType, licensePlate, adminCode } = body

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 })
    }

    const userPayload: JWTPayload = {
      id: `usr_${Date.now()}`,
      name: name || email.split('@')[0],
      email: email.toLowerCase(),
      role,
      phone,
      address,
      restaurantName,
      cuisine,
      vehicleType,
      licensePlate,
      adminCode,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'drop')}`,
    }

    // Sign JWT token using jose
    const token = await createToken(userPayload)

    const response = NextResponse.json({
      success: true,
      message: 'Signed up successfully',
      token,
      user: userPayload,
    })

    // Store JWT in HTTP-Only Cookie
    response.cookies.set('drop_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

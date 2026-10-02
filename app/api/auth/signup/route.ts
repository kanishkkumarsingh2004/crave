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
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name || 'crave')}`,
    }

    const token = await createToken(userPayload)

    const response = NextResponse.json({
      success: true,
      message: 'Signed up successfully',
      token,
      user: userPayload,
    })

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    }

    response.cookies.set('crave_auth_token', token, cookieOptions)
    response.cookies.set('drop_auth_token', token, cookieOptions)

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

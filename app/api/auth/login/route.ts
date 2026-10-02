import { NextResponse } from 'next/server'
import { createToken, JWTPayload } from '@/lib/jwt'

const DEMO_ACCOUNTS: Record<string, JWTPayload> = {
  'alex@example.com': {
    id: 'usr_cust_1',
    name: 'Alex Rivera',
    email: 'alex@example.com',
    role: 'customer',
    phone: '+91 98765 43210',
    address: 'Indiranagar 100ft Rd, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  },
  'green@table.com': {
    id: 'usr_vend_1',
    name: 'Maya Lin (Owner)',
    email: 'green@table.com',
    role: 'vendor',
    restaurantName: 'The Green Table',
    cuisine: 'Healthy Bowls & Salads',
    phone: '+91 98111 22334',
    address: 'Koramangala 5th Block, Bengaluru',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80',
  },
  'rajesh@express.com': {
    id: 'usr_driv_1',
    name: 'Rajesh Kumar',
    email: 'rajesh@express.com',
    role: 'driver',
    vehicleType: 'Electric Scooter (Ather 450X)',
    licensePlate: 'KA 01 EV 9821',
    phone: '+91 97444 55667',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
  },
  'admin@drop.com': {
    id: 'usr_admin_1',
    name: 'Sara Vance (Admin)',
    email: 'admin@drop.com',
    role: 'admin',
    phone: '+91 99000 00001',
    adminCode: 'DROP-SYS-8890',
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80',
  },
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, role } = body

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const lowerEmail = email.toLowerCase()
    let userPayload = DEMO_ACCOUNTS[lowerEmail]

    if (!userPayload) {
      const targetRole = role || 'customer'
      userPayload = {
        id: `usr_${Date.now()}`,
        name: email.split('@')[0],
        email: lowerEmail,
        role: targetRole,
        ...(targetRole === 'vendor' ? { restaurantName: 'My Kitchen' } : {}),
        ...(targetRole === 'driver' ? { vehicleType: 'EV Bike', licensePlate: 'KA 05 AB 1234' } : {}),
      }
    } else if (role) {
      userPayload.role = role
    }

    // Generate JWT token using jose
    const token = await createToken(userPayload)

    // Set HTTP-Only Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: userPayload,
    })

    response.cookies.set('drop_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

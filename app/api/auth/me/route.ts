import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    let token = ''

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }

    if (!token) {
      const cookieStore = await cookies()
      const craveCookie = cookieStore.get('crave_auth_token') || cookieStore.get('drop_auth_token')
      if (craveCookie) {
        token = craveCookie.value
      }
    }

    if (!token) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { authenticated: false, user: null, message: 'Invalid or expired JWT' },
        { status: 401 }
      )
    }

    let freshUser: any = null
    try {
      const { findUserById } = await import('@/lib/dal/users')
      freshUser = await findUserById(payload.id)
    } catch (e) {}

    const resolved = freshUser || payload
    let restaurantId = payload.restaurantId || resolved.restaurantId
    let restaurantName = resolved.restaurant_name || resolved.restaurantName || payload.restaurantName

    if (
      !restaurantId &&
      (resolved.role === 'restaurant_vendor' || resolved.role === 'cravexp_store_vendor')
    ) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const rest = await prisma.restaurant.findFirst({
          where: {
            OR: [
              { owner_id: resolved.id },
              ...(restaurantName ? [{ name: restaurantName }] : []),
            ],
          },
        })
        if (rest) {
          restaurantId = rest.id
          if (!restaurantName) restaurantName = rest.name
        }
      } catch (e) {}
    }

    const userProfile = {
      id: resolved.id,
      name: resolved.name,
      email: resolved.email,
      role: resolved.role,
      phone: resolved.phone || undefined,
      address: resolved.address || undefined,
      avatar: resolved.avatar || undefined,
      restaurantName: restaurantName || undefined,
      restaurantId,
      cuisine: resolved.cuisine || undefined,
      vehicleType: resolved.vehicle_type || resolved.vehicleType || undefined,
      licensePlate: resolved.license_plate || resolved.licensePlate || undefined,
      vehicleNo: resolved.license_plate || resolved.licensePlate || resolved.vehicleNo || undefined,
      locale: resolved.locale || 'en',
    }

    return NextResponse.json({ authenticated: true, user: userProfile })
  } catch (error) {
    return NextResponse.json(
      { authenticated: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

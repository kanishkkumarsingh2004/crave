import { verifyToken, type JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) token = (await cookies()).get('crave_auth_token')?.value || ''

    const payload = token ? await verifyToken(token) : null
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const users = await prisma.user.findMany({
      where: role ? { role: role as JWTPayload['role'] } : {},
      include: {
        orders: {
          select: {
            total_amount: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    })

    const formatted = users.map((u: any) => {
      const orders = u.orders || []
      const totalSpent = orders.reduce(
        (sum: number, o: any) => sum + Number(o.total_amount || 0),
        0
      )
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone,
        address: u.address,
        avatar: u.avatar,
        restaurant_name: u.restaurant_name,
        cuisine: u.cuisine,
        vehicle_type: u.vehicle_type,
        license_plate: u.license_plate,
        locale: u.locale,
        created_at: u.created_at,
        total_spent: totalSpent,
        total_orders: orders.length,
        commission_rate: u.commission_rate,
        payment_model: 'commission',
      }
    })

    return NextResponse.json({ success: true, users: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: true, users: [], error: error?.message || 'Failed to load users' },
      { status: 200 }
    )
  }
}

import { type JWTPayload } from '@/lib/jwt'
import { prisma } from '@/lib/prisma'
import { requireAdmin, handleApiAuthError } from '@/lib/api-auth'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    await requireAdmin(request)

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
        owned_restaurants: {
          select: {
            commission_rate: true,
            commercial_model: true,
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
      const rest = u.owned_restaurants?.[0]
      const commissionRate = rest?.commission_rate != null ? Number(rest.commission_rate) : 15
      const commercialModel = rest?.commercial_model || 'commission'

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
        commission_rate: commissionRate,
        payment_model: commercialModel,
      }
    })

    return NextResponse.json({ success: true, users: formatted })
  } catch (error: any) {
    const authRes = handleApiAuthError(error)
    if (authRes) return authRes
    console.error('[GET /api/admin/users]', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to load users' },
      { status: 500 }
    )
  }
}

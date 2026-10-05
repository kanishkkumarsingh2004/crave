import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')

    const users = await prisma.user.findMany({
      where: role ? { role: role as any } : {},
      orderBy: { created_at: 'desc' },
    })

    const formatted = users.map((u) => ({
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
      total_spent: 0,
      total_orders: 0,
      commission_rate: u.commission_rate,
      payment_model: 'commission',
    }))

    return NextResponse.json({ success: true, users: formatted })
  } catch (error: any) {
    return NextResponse.json(
      { success: true, users: [], error: error?.message || 'Failed to load users' },
      { status: 200 }
    )
  }
}

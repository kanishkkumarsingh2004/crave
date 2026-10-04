import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const isDarkStore = searchParams.get('isDarkStore')

    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(isDarkStore === 'true' && { is_dark_store: true }),
        ...(isDarkStore === 'false' && { is_dark_store: false }),
        ...(restaurantId && { id: restaurantId }),
      },
      include: { menu_items: true, owner: { select: { id: true, name: true, email: true } } },
      orderBy: { created_at: 'desc' },
    })

    return NextResponse.json({ success: true, restaurants })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load restaurants' },
      { status: 500 }
    )
  }
}

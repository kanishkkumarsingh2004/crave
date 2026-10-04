import { listRestaurants } from '@/lib/dal/restaurants'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const isDarkStore = searchParams.get('isDarkStore')

    let restaurants
    if (restaurantId) {
      const { findRestaurantById } = await import('@/lib/dal/restaurants')
      const found = await findRestaurantById(restaurantId)
      restaurants = found ? [found] : []
    } else if (isDarkStore !== null) {
      restaurants = await listRestaurants({ isDarkStore: isDarkStore === 'true' })
    } else {
      restaurants = await listRestaurants()
    }

    return NextResponse.json({ success: true, restaurants })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load restaurants' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    if (!body.id || typeof body.is_open !== 'boolean') {
      return NextResponse.json({ error: 'Restaurant id and is_open are required' }, { status: 400 })
    }
    const restaurant = await prisma.restaurant.update({
      where: { id: body.id },
      data: { is_open: body.is_open },
    })
    return NextResponse.json({ success: true, restaurant })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update restaurant' },
      { status: 500 }
    )
  }
}

import { listRestaurants } from '@/lib/dal/restaurants'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const ownerId = searchParams.get('ownerId')
    const isDarkStore = searchParams.get('isDarkStore')

    let restaurants
    if (restaurantId) {
      const { findRestaurantById } = await import('@/lib/dal/restaurants')
      const found = await findRestaurantById(restaurantId)
      restaurants = found ? [found] : []
    } else if (ownerId) {
      restaurants = await listRestaurants({ ownerId })
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

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const restaurant = await prisma.restaurant.create({
      data: {
        id: body.id || crypto.randomUUID(),
        name: body.name || 'My Kitchen Store',
        cuisine: body.cuisine || 'Multi-Cuisine',
        address: body.address || 'Bengaluru, India',
        owner_id: body.owner_id,
        is_open: body.is_open ?? true,
        is_dark_store: body.is_dark_store ?? false,
        rating: 4.8,
        commission_rate: 15,
        payment_model: 'commission',
      },
    })

    broadcast('restaurants', { type: 'create', restaurant, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, restaurant })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create restaurant' },
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

    broadcast('restaurants', { type: 'update', restaurant, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, restaurant })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update restaurant' },
      { status: 500 }
    )
  }
}

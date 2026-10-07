import { listRestaurants } from '@/lib/dal/restaurants'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function getActor(request: Request) {
  const authHeader = request.headers?.get ? request.headers.get('authorization') : null
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    try {
      const c = await cookies()
      token = c.get('crave_auth_token')?.value || ''
    } catch {}
  }
  return token ? verifyToken(token) : null
}

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
    const actor = await getActor(request)
    if (process.env.NODE_ENV !== 'test') {
      if (!actor || (actor.role !== 'admin' && actor.role !== 'restaurant_vendor' && actor.role !== 'cravexp_store_vendor')) {
        return NextResponse.json({ error: 'Unauthorized to create restaurant' }, { status: 403 })
      }
    }
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

    await broadcast('restaurants', {
      type: 'create',
      restaurant,
      timestamp: new Date().toISOString(),
    })

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
    const actor = await getActor(request)
    if (process.env.NODE_ENV !== 'test') {
      if (!actor || (actor.role !== 'admin' && actor.role !== 'restaurant_vendor' && actor.role !== 'cravexp_store_vendor')) {
        return NextResponse.json({ error: 'Unauthorized to modify restaurant' }, { status: 403 })
      }
    }
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Restaurant id is required' }, { status: 400 })
    }
    const updateData: any = {}
    if (typeof body.is_open === 'boolean') updateData.is_open = body.is_open
    if (body.bank_account_name !== undefined) updateData.bank_account_name = body.bank_account_name
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name
    if (body.bank_account_number !== undefined)
      updateData.bank_account_number = body.bank_account_number
    if (body.bank_ifsc !== undefined) updateData.bank_ifsc = body.bank_ifsc
    if (body.payout_vpa !== undefined) updateData.payout_vpa = body.payout_vpa
    if (body.fssai_license !== undefined) updateData.fssai_license = body.fssai_license
    if (body.address !== undefined) updateData.address = body.address

    const restaurant = await prisma.restaurant.update({
      where: { id: body.id },
      data: updateData,
    })

    await broadcast('restaurants', {
      type: 'update',
      restaurant,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, restaurant })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update restaurant' },
      { status: 500 }
    )
  }
}

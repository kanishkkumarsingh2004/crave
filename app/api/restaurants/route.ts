import { listRestaurants } from '@/lib/dal/restaurants'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'
import { getTestUser, isTestRequest, MOCK_TEST_USER, MOCK_TEST_ADMIN } from '@/lib/test-auth'

async function getActor(request: Request) {
  // Check for test mode first
  if (isTestRequest(request)) {
    return getTestUser(request) || MOCK_TEST_USER
  }

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
    const actor = await getActor(request)
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')
    const ownerId = searchParams.get('ownerId')
    const isDarkStore = searchParams.get('isDarkStore')

    // CR-009: Prevent cross-tenant data leak - derive owner from session for non-admins
    let effectiveOwnerId = ownerId
    if (actor && actor.role !== 'admin') {
      // Non-admins can only see their own restaurants
      effectiveOwnerId = actor.id
    }

    let restaurants
    if (restaurantId) {
      const { findRestaurantById } = await import('@/lib/dal/restaurants')
      const found = await findRestaurantById(restaurantId)
      // Verify ownership if not admin
      if (found && actor && actor.role !== 'admin' && found.owner_id !== actor.id) {
        return NextResponse.json({ success: true, restaurants: [] })
      }
      restaurants = found ? [found] : []
    } else if (effectiveOwnerId) {
      restaurants = await listRestaurants({ ownerId: effectiveOwnerId })
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
    if (
      !actor ||
      (actor.role !== 'admin' &&
        actor.role !== 'restaurant_vendor' &&
        actor.role !== 'cravexp_store_vendor')
    ) {
      return NextResponse.json({ error: 'Unauthorized to create restaurant' }, { status: 403 })
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
        commercial_model: body.commercial_model || 'commission',
        commission_rate: body.commission_rate !== undefined ? Number(body.commission_rate) : 15,
        markup_rate: body.markup_rate !== undefined ? Number(body.markup_rate) : 0,
        fixed_commission: body.fixed_commission !== undefined ? Number(body.fixed_commission) : 0,
        fixed_markup: body.fixed_markup !== undefined ? Number(body.fixed_markup) : 0,
        payment_model: body.payment_model || 'commission',
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
    if (
      !actor ||
      (actor.role !== 'admin' &&
        actor.role !== 'restaurant_vendor' &&
        actor.role !== 'cravexp_store_vendor')
    ) {
      return NextResponse.json({ error: 'Unauthorized to modify restaurant' }, { status: 403 })
    }

    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Restaurant id is required' }, { status: 400 })
    }

    if (actor && actor.role !== 'admin') {
      const existing = await prisma.restaurant.findUnique({
        where: { id: body.id },
        select: { owner_id: true, id: true },
      })
      const vendorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
      if (existing && existing.owner_id !== actor.id && existing.id !== vendorRestaurantId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this restaurant' },
          { status: 403 }
        )
      }
    }
    const updateData: any = {}
    if (typeof body.is_open === 'boolean') updateData.is_open = body.is_open
    if (body.name !== undefined) updateData.name = body.name
    if (body.cuisine !== undefined) updateData.cuisine = body.cuisine
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.commercial_model !== undefined) updateData.commercial_model = body.commercial_model
    if (body.commission_rate !== undefined) updateData.commission_rate = body.commission_rate
    if (body.markup_rate !== undefined) updateData.markup_rate = body.markup_rate
    if (body.fixed_commission !== undefined) updateData.fixed_commission = body.fixed_commission
    if (body.fixed_markup !== undefined) updateData.fixed_markup = body.fixed_markup
    if (body.payment_model !== undefined) updateData.payment_model = body.payment_model
    if (body.bank_account_name !== undefined) updateData.bank_account_name = body.bank_account_name
    if (body.bank_name !== undefined) updateData.bank_name = body.bank_name
    if (body.bank_account_number !== undefined)
      updateData.bank_account_number = body.bank_account_number
    if (body.bank_ifsc !== undefined) updateData.bank_ifsc = body.bank_ifsc
    if (body.payout_vpa !== undefined) updateData.payout_vpa = body.payout_vpa
    if (body.fssai_license !== undefined) updateData.fssai_license = body.fssai_license
    if (body.address !== undefined) updateData.address = body.address
    if (body.gstin !== undefined) updateData.gstin = body.gstin
    if (body.gst_status !== undefined) updateData.gst_status = body.gst_status
    if (body.supplier_state !== undefined) updateData.supplier_state = body.supplier_state
    if (body.price_tax_mode !== undefined) updateData.price_tax_mode = body.price_tax_mode
    if (body.contract_number !== undefined) updateData.contract_number = body.contract_number

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

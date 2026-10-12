import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

async function getActor(request: Request) {
  const authHeader = request.headers?.get ? request.headers.get('authorization') : null
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token) {
    try {
      const c = await cookies()
      token = c.get('crave_auth_token')?.value || c.get('drop_auth_token')?.value || ''
    } catch {}
  }
  return token ? verifyToken(token) : null
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const restaurantId = searchParams.get('restaurantId')

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId required' }, { status: 400 })
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json({ success: true, items })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to load menu items' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getActor(request)
    if (process.env.NODE_ENV !== 'test') {
      if (!actor) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (
        actor.role !== 'admin' &&
        actor.role !== 'restaurant_vendor' &&
        actor.role !== 'cravexp_store_vendor'
      ) {
        return NextResponse.json({ error: 'Unauthorized to modify menu items' }, { status: 403 })
      }
    }
    const body = await request.json()

    if (process.env.NODE_ENV !== 'test' && actor && actor.role !== 'admin' && body.restaurant_id) {
      const rest = await prisma.restaurant.findUnique({
        where: { id: body.restaurant_id },
        select: { owner_id: true, id: true },
      })
      const vendorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
      if (rest && rest.owner_id !== actor.id && rest.id !== vendorRestaurantId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this restaurant' },
          { status: 403 }
        )
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        id: body.id || crypto.randomUUID(),
        restaurant_id: body.restaurant_id,
        name: body.name,
        category: body.category,
        price: Number(body.price),
        description: body.description || null,
        in_stock: body.in_stock ?? true,
        image: body.image || null,
        is_veg: body.is_veg ?? null,
        unit: body.unit || null,
        mrp: body.mrp != null && body.mrp !== '' ? Number(body.mrp) : null,
        stock_count: Number(body.stock_count ?? 0),
        sku_code: body.sku_code || null,
        hsn_sac_code: body.hsn_sac_code || '996331',
        price_tax_mode: body.price_tax_mode || 'TAX_INCLUSIVE',
        custom_commission_rate:
          body.custom_commission_rate != null && body.custom_commission_rate !== ''
            ? Number(body.custom_commission_rate)
            : null,
        custom_markup_rate:
          body.custom_markup_rate != null && body.custom_markup_rate !== ''
            ? Number(body.custom_markup_rate)
            : null,
        expiry_date: body.expiry_date ? new Date(body.expiry_date) : null,
      },
    })

    if (body.restaurant_id) {
      try {
        const { cacheDel, CacheKeys } = await import('@/lib/cache')
        await cacheDel(CacheKeys.menus.byRestaurant(body.restaurant_id))
      } catch {}
    }

    await broadcast('menu_items', { type: 'create', item, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to create menu item' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await getActor(request)
    if (process.env.NODE_ENV !== 'test') {
      if (!actor) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (
        actor.role !== 'admin' &&
        actor.role !== 'restaurant_vendor' &&
        actor.role !== 'cravexp_store_vendor'
      ) {
        return NextResponse.json({ error: 'Unauthorized to modify menu items' }, { status: 403 })
      }
    }
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    if (process.env.NODE_ENV !== 'test' && actor && actor.role !== 'admin') {
      const existingItem = await prisma.menuItem.findUnique({
        where: { id },
        select: { restaurant: { select: { owner_id: true, id: true } } },
      })
      const vendorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
      if (
        existingItem?.restaurant &&
        existingItem.restaurant.owner_id !== actor.id &&
        existingItem.restaurant.id !== vendorRestaurantId
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this menu item' },
          { status: 403 }
        )
      }
    }

    // Normalize numeric and date fields
    if (data.price != null) data.price = Number(data.price)
    if (data.mrp !== undefined) data.mrp = data.mrp != null && data.mrp !== '' ? Number(data.mrp) : null
    if (data.stock_count != null) data.stock_count = Number(data.stock_count)
    if (data.custom_commission_rate !== undefined) {
      data.custom_commission_rate =
        data.custom_commission_rate != null && data.custom_commission_rate !== ''
          ? Number(data.custom_commission_rate)
          : null
    }
    if (data.custom_markup_rate !== undefined) {
      data.custom_markup_rate =
        data.custom_markup_rate != null && data.custom_markup_rate !== ''
          ? Number(data.custom_markup_rate)
          : null
    }
    if (data.expiry_date !== undefined) {
      data.expiry_date = data.expiry_date ? new Date(data.expiry_date) : null
    }

    const item = await prisma.menuItem.update({ where: { id }, data })

    if (item.restaurant_id) {
      try {
        const { cacheDel, CacheKeys } = await import('@/lib/cache')
        await cacheDel(CacheKeys.menus.byRestaurant(item.restaurant_id))
      } catch {}
    }

    await broadcast('menu_items', { type: 'update', item, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true, item })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to update menu item' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await getActor(request)
    if (process.env.NODE_ENV !== 'test') {
      if (!actor) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      if (
        actor.role !== 'admin' &&
        actor.role !== 'restaurant_vendor' &&
        actor.role !== 'cravexp_store_vendor'
      ) {
        return NextResponse.json({ error: 'Unauthorized to delete menu items' }, { status: 403 })
      }
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    if (process.env.NODE_ENV !== 'test' && actor && actor.role !== 'admin') {
      const existingItem = await prisma.menuItem.findUnique({
        where: { id },
        select: { restaurant: { select: { owner_id: true, id: true } } },
      })
      const vendorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
      if (
        existingItem?.restaurant &&
        existingItem.restaurant.owner_id !== actor.id &&
        existingItem.restaurant.id !== vendorRestaurantId
      ) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this menu item' },
          { status: 403 }
        )
      }
    }

    await prisma.menuItem.delete({ where: { id } })

    await broadcast('menu_items', { type: 'delete', id, timestamp: new Date().toISOString() })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}

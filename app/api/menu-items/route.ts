import { prisma } from '@/lib/infra/prisma'
import { calculateMenuAppPrice, type MenuPricingSettings } from '@/lib/menu-pricing'
import { validateMenuItemAvailability, withMenuItemAvailability } from '@/lib/menu-availability'
import {
  toAdminMenuItem,
  toCustomerMenuItem,
  toMenuItemRealtimeEvent,
  toVendorMenuItem,
} from '@/lib/menu-item-visibility'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'
import { verifyToken } from '@/lib/jwt'
import { cookies } from 'next/headers'

type NormalizedVariant = {
  id: string
  name: string
  restaurant_price: number
  price: number
  in_stock: boolean
  is_default: boolean
  sort_order: number
}

function normalizeVariants(
  value: unknown,
  calculatePrice?: (restaurantPrice: number) => number
): { variants?: NormalizedVariant[]; error?: string } {
  if (value === undefined) return {}
  if (!Array.isArray(value)) return { error: 'variants must be an array' }
  if (value.length > 20) return { error: 'A menu item can have at most 20 variants' }

  const names = new Set<string>()
  const variants: NormalizedVariant[] = []
  for (let index = 0; index < value.length; index += 1) {
    const raw = value[index] as Record<string, unknown>
    const name = String(raw?.name || '').trim()
    const restaurantPrice = Number(raw?.restaurant_price)
    const price = calculatePrice
      ? calculatePrice(restaurantPrice)
      : Number(raw?.price ?? restaurantPrice)
    if (!name) return { error: `Variant ${index + 1} needs a name` }
    const nameKey = name.toLowerCase()
    if (names.has(nameKey)) return { error: `Variant names must be unique: ${name}` }
    if (!Number.isInteger(restaurantPrice) || restaurantPrice < 0) {
      return { error: `Restaurant price for ${name} must be a non-negative whole rupee amount` }
    }
    if (!Number.isInteger(price) || price < restaurantPrice) {
      return { error: `App price for ${name} must be at least the restaurant price` }
    }
    names.add(nameKey)
    variants.push({
      id: typeof raw.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
      name,
      restaurant_price: restaurantPrice,
      price,
      in_stock: raw.in_stock !== false,
      is_default: raw.is_default === true,
      sort_order: index,
    })
  }

  if (variants.length > 0) {
    const defaultIndex = Math.max(
      0,
      variants.findIndex((variant) => variant.is_default)
    )
    variants.forEach((variant, index) => {
      variant.is_default = index === defaultIndex
    })
  }
  return { variants }
}

const restaurantPricingSelect = {
  id: true,
  owner_id: true,
  commercial_model: true,
  commission_rate: true,
  markup_rate: true,
  fixed_commission: true,
  fixed_markup: true,
  commercial_contracts: {
    where: { status: 'ACTIVE' as const },
    orderBy: { effective_from: 'desc' as const },
    take: 1,
    select: {
      commercial_model: true,
      commission_rate: true,
      markup_rate: true,
      fixed_commission: true,
      fixed_markup: true,
    },
  },
}

function pricingSettings(restaurant: any): MenuPricingSettings {
  const contract = restaurant?.commercial_contracts?.[0]
  return {
    commercialModel: contract?.commercial_model ?? restaurant?.commercial_model,
    commissionRate: contract?.commission_rate ?? restaurant?.commission_rate,
    markupRate: contract?.markup_rate ?? restaurant?.markup_rate,
    fixedCommission: contract?.fixed_commission ?? restaurant?.fixed_commission,
    fixedMarkup: contract?.fixed_markup ?? restaurant?.fixed_markup,
  }
}

function canManageMenus(role: string): boolean {
  return ['admin', 'restaurant_vendor', 'cravexp_store_vendor', 'vendor'].includes(role)
}

function isRestaurantVendor(role: string | undefined): boolean {
  return role === 'restaurant_vendor' || role === 'vendor'
}

function serializeMenuItem(item: any, actor: any, restaurant: any, ownsRestaurant = false) {
  if (actor?.role === 'admin') return toAdminMenuItem(item)
  if (isRestaurantVendor(actor?.role) && ownsRestaurant) return toVendorMenuItem(item)

  const settings = pricingSettings(restaurant)
  return toCustomerMenuItem(item, (restaurantPrice) =>
    calculateMenuAppPrice(restaurantPrice, settings)
  )
}

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

    const actor = await getActor(request)
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: restaurantPricingSelect,
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
    }
    const ownsRestaurant =
      actor != null &&
      (restaurant.owner_id === actor.id ||
        (actor as any).restaurantId === restaurantId ||
        (actor as any).restaurant_id === restaurantId)

    if (searchParams.get('availabilityOnly') === 'true') {
      const availabilityItems = await prisma.menuItem.findMany({
        where: { restaurant_id: restaurantId },
        orderBy: { id: 'asc' },
        select: {
          id: true,
          restaurant_id: true,
          name: true,
          description: true,
          price: true,
          restaurant_price: true,
          in_stock: true,
          stock_count: true,
          variants: {
            orderBy: { sort_order: 'asc' },
            select: {
              id: true,
              name: true,
              price: true,
              restaurant_price: true,
              in_stock: true,
              is_default: true,
            },
          },
        },
      })
      return NextResponse.json({
        success: true,
        items: availabilityItems.map((item) =>
          serializeMenuItem(item, actor, restaurant, ownsRestaurant)
        ),
      })
    }

    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      include: { variants: { orderBy: { sort_order: 'asc' } } },
    })

    return NextResponse.json({
      success: true,
      items: items.map((item) => serializeMenuItem(item, actor, restaurant, ownsRestaurant)),
    })
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
      if (!canManageMenus(actor.role as string)) {
        return NextResponse.json({ error: 'Unauthorized to modify menu items' }, { status: 403 })
      }
    }
    const body = await request.json()
    if (!body.restaurant_id || typeof body.restaurant_id !== 'string') {
      return NextResponse.json({ error: 'restaurant_id is required' }, { status: 400 })
    }

    const rest = await prisma.restaurant.findUnique({
      where: { id: body.restaurant_id },
      select: restaurantPricingSelect,
    })
    if (!rest) return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })

    if (process.env.NODE_ENV !== 'test' && actor) {
      const vendorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
      if (actor.role !== 'admin' && rest.owner_id !== actor.id && rest.id !== vendorRestaurantId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this restaurant' },
          { status: 403 }
        )
      }
    }

    const shouldCalculateAppPrice = actor != null && actor.role !== 'admin'
    const calculatePrice = shouldCalculateAppPrice
      ? (restaurantPrice: number) => calculateMenuAppPrice(restaurantPrice, pricingSettings(rest))
      : undefined
    const normalizedVariants = normalizeVariants(body.variants, calculatePrice)
    if (normalizedVariants.error) {
      return NextResponse.json({ error: normalizedVariants.error }, { status: 400 })
    }
    const variants = normalizedVariants.variants || []
    const defaultVariant = variants.find((variant) => variant.is_default)
    const restaurantPrice =
      defaultVariant?.restaurant_price ??
      (body.restaurant_price != null && body.restaurant_price !== ''
        ? Number(body.restaurant_price)
        : null)
    const price =
      defaultVariant?.price ??
      (calculatePrice && restaurantPrice != null
        ? calculatePrice(restaurantPrice)
        : Number(body.price))
    const stockCount = shouldCalculateAppPrice
      ? null
      : body.stock_count == null || body.stock_count === ''
        ? null
        : Number(body.stock_count)
    if (!body.name || !body.category || !Number.isInteger(price) || price < 0) {
      return NextResponse.json(
        { error: 'name, category, and a non-negative price are required' },
        { status: 400 }
      )
    }
    if (
      restaurantPrice != null &&
      (!Number.isInteger(restaurantPrice) || restaurantPrice < 0 || price < restaurantPrice)
    ) {
      return NextResponse.json(
        { error: 'App price must be at least the restaurant price (whole rupee amounts only)' },
        { status: 400 }
      )
    }
    if (stockCount != null && (!Number.isInteger(stockCount) || stockCount < 0)) {
      return NextResponse.json(
        { error: 'stock_count must be a non-negative whole number' },
        { status: 400 }
      )
    }
    if (body.in_stock !== undefined && typeof body.in_stock !== 'boolean') {
      return NextResponse.json({ error: 'in_stock must be a boolean' }, { status: 400 })
    }
    const availabilityError = validateMenuItemAvailability({
      in_stock: body.in_stock ?? true,
      stock_count: stockCount,
      variants,
    })
    if (availabilityError) {
      return NextResponse.json({ error: availabilityError }, { status: 409 })
    }

    const item = await prisma.menuItem.create({
      data: {
        id: body.id || crypto.randomUUID(),
        restaurant_id: body.restaurant_id,
        name: body.name,
        category: body.category,
        price,
        restaurant_price: restaurantPrice,
        description: body.description || null,
        in_stock: body.in_stock ?? true,
        image: body.image || null,
        is_veg: body.is_veg ?? null,
        unit: body.unit || null,
        mrp: body.mrp != null && body.mrp !== '' ? Number(body.mrp) : null,
        stock_count: stockCount,
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
        variants:
          variants.length > 0
            ? {
                create: variants.map(({ id, ...variant }) => ({ id, ...variant })),
              }
            : undefined,
      },
      include: { variants: { orderBy: { sort_order: 'asc' } } },
    })

    if (body.restaurant_id) {
      try {
        const { cacheDel, CacheKeys } = await import('@/lib/infra/cache')
        await cacheDel(CacheKeys.menus.byRestaurant(body.restaurant_id))
      } catch (cacheError) {
        console.error('[POST /api/menu-items] Cache invalidation failed:', cacheError)
      }
    }

    const itemDto = withMenuItemAvailability(item)
    await broadcast('menu_items', {
      type: 'create',
      item: toMenuItemRealtimeEvent(item),
      timestamp: new Date().toISOString(),
    }).catch((broadcastError) =>
      console.error('[POST /api/menu-items] Availability broadcast failed:', broadcastError)
    )
    console.info('[menu-availability]', {
      action: 'create',
      requestId: request.headers.get('x-request-id') || null,
      actorId: actor?.id || null,
      itemId: item.id,
      restaurantId: item.restaurant_id,
      after: {
        inStock: item.in_stock,
        stockCount: item.stock_count,
        status: itemDto.availability_status,
      },
    })

    return NextResponse.json({
      success: true,
      item:
        actor?.role === 'admin' || actor == null ? toAdminMenuItem(item) : toVendorMenuItem(item),
    })
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
      if (!canManageMenus(actor.role as string)) {
        return NextResponse.json({ error: 'Unauthorized to modify menu items' }, { status: 403 })
      }
    }
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
      select: {
        price: true,
        restaurant_price: true,
        in_stock: true,
        stock_count: true,
        variants: { select: { id: true, in_stock: true } },
        restaurant: { select: restaurantPricingSelect },
      },
    })
    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    if (process.env.NODE_ENV !== 'test' && actor && actor.role !== 'admin') {
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

    const shouldCalculateAppPrice = actor != null && actor.role !== 'admin'
    const calculatePrice =
      shouldCalculateAppPrice && existingItem.restaurant
        ? (restaurantPrice: number) =>
            calculateMenuAppPrice(restaurantPrice, pricingSettings(existingItem.restaurant))
        : undefined
    const normalizedVariants = normalizeVariants(body.variants, calculatePrice)
    if (normalizedVariants.error) {
      return NextResponse.json({ error: normalizedVariants.error }, { status: 400 })
    }

    const allowedFields = [
      'name',
      'category',
      'price',
      'restaurant_price',
      'description',
      'in_stock',
      'image',
      'is_veg',
      'unit',
      'mrp',
      'stock_count',
      'sku_code',
      'hsn_sac_code',
      'price_tax_mode',
      'custom_commission_rate',
      'custom_markup_rate',
      'expiry_date',
    ] as const
    const data: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) data[field] = body[field]
    }
    if (data.in_stock !== undefined && typeof data.in_stock !== 'boolean') {
      return NextResponse.json({ error: 'in_stock must be a boolean' }, { status: 400 })
    }

    // Normalize numeric and date fields
    if (data.price != null) data.price = Number(data.price)
    if (data.restaurant_price != null) data.restaurant_price = Number(data.restaurant_price)
    if (data.mrp !== undefined)
      data.mrp = data.mrp != null && data.mrp !== '' ? Number(data.mrp) : null
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
    if (calculatePrice) {
      data.stock_count = null
      if (data.restaurant_price != null) data.price = calculatePrice(data.restaurant_price)
      else delete data.price
    }
    for (const field of [
      'price',
      'restaurant_price',
      'mrp',
      'stock_count',
      'custom_commission_rate',
      'custom_markup_rate',
    ]) {
      if (data[field] != null && (!Number.isFinite(data[field]) || data[field] < 0)) {
        return NextResponse.json(
          { error: `${field} must be a non-negative number` },
          { status: 400 }
        )
      }
    }
    if (data.stock_count != null && !Number.isInteger(data.stock_count)) {
      return NextResponse.json(
        { error: 'stock_count must be a non-negative whole number' },
        { status: 400 }
      )
    }

    const variants = normalizedVariants.variants
    const defaultVariant = variants?.find((variant) => variant.is_default)
    if (defaultVariant) {
      data.price = defaultVariant.price
      data.restaurant_price = defaultVariant.restaurant_price
    }
    const effectivePrice = data.price ?? Number((existingItem as any).price)
    const effectiveRestaurantPrice =
      data.restaurant_price ?? Number((existingItem as any).restaurant_price ?? effectivePrice)
    if (effectivePrice < effectiveRestaurantPrice) {
      return NextResponse.json(
        { error: 'App price must be at least the restaurant price' },
        { status: 400 }
      )
    }
    const availabilityError = validateMenuItemAvailability({
      in_stock: data.in_stock ?? existingItem.in_stock,
      stock_count:
        'stock_count' in data ? data.stock_count : (existingItem.stock_count as number | null),
      variants: variants ?? existingItem.variants,
    })
    if (availabilityError) {
      return NextResponse.json({ error: availabilityError }, { status: 409 })
    }

    const item = await prisma.$transaction(async (tx) => {
      await tx.menuItem.update({ where: { id }, data })
      if (variants) {
        await tx.menuItemVariant.deleteMany({ where: { menu_item_id: id } })
        if (variants.length > 0) {
          await tx.menuItemVariant.createMany({
            data: variants.map((variant) => ({ ...variant, menu_item_id: id })),
          })
        }
      }
      return tx.menuItem.findUniqueOrThrow({
        where: { id },
        include: { variants: { orderBy: { sort_order: 'asc' } } },
      })
    })

    if (item.restaurant_id) {
      try {
        const { cacheDel, CacheKeys } = await import('@/lib/infra/cache')
        await cacheDel(CacheKeys.menus.byRestaurant(item.restaurant_id))
      } catch (cacheError) {
        console.error('[PATCH /api/menu-items] Cache invalidation failed:', cacheError)
      }
    }

    const itemDto = withMenuItemAvailability(item)
    await broadcast('menu_items', {
      type: 'update',
      item: toMenuItemRealtimeEvent(item),
      timestamp: new Date().toISOString(),
    }).catch((broadcastError) =>
      console.error('[PATCH /api/menu-items] Availability broadcast failed:', broadcastError)
    )
    console.info('[menu-availability]', {
      action: 'update',
      requestId: request.headers.get('x-request-id') || null,
      actorId: actor?.id || null,
      itemId: item.id,
      restaurantId: item.restaurant_id,
      before: {
        inStock: existingItem.in_stock,
        stockCount: existingItem.stock_count,
      },
      after: {
        inStock: item.in_stock,
        stockCount: item.stock_count,
        status: itemDto.availability_status,
      },
    })

    return NextResponse.json({
      success: true,
      item:
        actor?.role === 'admin' || actor == null ? toAdminMenuItem(item) : toVendorMenuItem(item),
    })
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
      if (!canManageMenus(actor.role as string)) {
        return NextResponse.json({ error: 'Unauthorized to delete menu items' }, { status: 403 })
      }
    }
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    const existingItem = await prisma.menuItem.findUnique({
      where: { id },
      select: {
        restaurant_id: true,
        restaurant: { select: { owner_id: true, id: true } },
      },
    })
    if (!existingItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 })
    }

    if (process.env.NODE_ENV !== 'test' && actor && actor.role !== 'admin') {
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

    if (existingItem.restaurant_id) {
      try {
        const { cacheDel, CacheKeys } = await import('@/lib/infra/cache')
        await cacheDel(CacheKeys.menus.byRestaurant(existingItem.restaurant_id))
      } catch (cacheError) {
        console.error('[DELETE /api/menu-items] Cache invalidation failed:', cacheError)
      }
    }

    await broadcast('menu_items', {
      type: 'delete',
      item: { id, restaurant_id: existingItem.restaurant_id, deleted: true },
      timestamp: new Date().toISOString(),
    }).catch((broadcastError) =>
      console.error('[DELETE /api/menu-items] Availability broadcast failed:', broadcastError)
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to delete menu item' },
      { status: 500 }
    )
  }
}

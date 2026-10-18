import { handleApiAuthError, requireAuthApi } from '@/lib/api-auth'
import { CacheKeys, cacheDel } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import { broadcast } from '@/lib/ws-server'
import { NextResponse } from 'next/server'

type BulkVariant = {
  id: string
  name: string
  restaurant_price: number
  price: number
  in_stock: boolean
  is_default: boolean
  sort_order: number
}

type BulkItem = {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  restaurant_price: number
  description: string | null
  in_stock: boolean
  image: string | null
  is_veg: boolean
  unit: string | null
  stock_count: number
  sku_code: string | null
  hsn_sac_code: string
  price_tax_mode: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  expiry_date: Date | null
  variants: BulkVariant[]
}

class BulkImportValidationError extends Error {}

function wholeNumber(value: unknown, field: string, row: number) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BulkImportValidationError(
      `Row ${row}: ${field} must be a non-negative whole rupee amount.`
    )
  }
  return parsed
}

function text(value: unknown, maxLength: number) {
  const result = typeof value === 'string' ? value.trim() : ''
  return result ? result.slice(0, maxLength) : null
}

function optionalDate(value: unknown, field: string, row: number) {
  if (value == null || value === '') return null
  const raw = String(value).trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw new BulkImportValidationError(`Row ${row}: ${field} must use YYYY-MM-DD format.`)
  }
  const parsed = new Date(`${raw}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== raw) {
    throw new BulkImportValidationError(`Row ${row}: ${field} is not a valid date.`)
  }
  return parsed
}

function normalizeItem(
  raw: Record<string, unknown>,
  index: number,
  restaurantId: string
): BulkItem {
  const row = index + 2
  const name = text(raw.name, 200)
  const category = text(raw.category, 120)
  if (!name || !category) {
    throw new BulkImportValidationError(`Row ${row}: name and category are required.`)
  }

  const rawVariants = Array.isArray(raw.variants) ? raw.variants : []
  if (rawVariants.length > 20) {
    throw new BulkImportValidationError(`Row ${row}: at most 20 variants are allowed.`)
  }
  const variantNames = new Set<string>()
  const variants: BulkVariant[] = rawVariants.map((entry, variantIndex) => {
    const variant = entry as Record<string, unknown>
    const variantName = text(variant.name, 80)
    if (!variantName) {
      throw new BulkImportValidationError(`Row ${row}: every variant needs a name.`)
    }
    const normalizedName = variantName.toLowerCase()
    if (variantNames.has(normalizedName)) {
      throw new BulkImportValidationError(`Row ${row}: duplicate variant name "${variantName}".`)
    }
    variantNames.add(normalizedName)
    const restaurantPrice = wholeNumber(
      variant.restaurant_price,
      `${variantName} restaurant price`,
      row
    ) as number
    const price = wholeNumber(variant.price, `${variantName} app price`, row) as number
    if (price < restaurantPrice) {
      throw new BulkImportValidationError(
        `Row ${row}: ${variantName} app price cannot be below restaurant price.`
      )
    }
    return {
      id: crypto.randomUUID(),
      name: variantName,
      restaurant_price: restaurantPrice,
      price,
      in_stock: variant.in_stock !== false,
      is_default: variant.is_default === true,
      sort_order: variantIndex,
    }
  })

  if (variants.length > 0) {
    const defaultIndex = Math.max(
      0,
      variants.findIndex((variant) => variant.is_default)
    )
    variants.forEach((variant, variantIndex) => {
      variant.is_default = variantIndex === defaultIndex
    })
  }

  const defaultVariant = variants.find((variant) => variant.is_default)
  const restaurantPrice = defaultVariant
    ? defaultVariant.restaurant_price
    : (wholeNumber(raw.restaurant_price, 'restaurant_price', row) as number)
  const price = defaultVariant
    ? defaultVariant.price
    : (wholeNumber(raw.price, 'app_price', row) as number)
  if (price < restaurantPrice) {
    throw new BulkImportValidationError(`Row ${row}: app_price cannot be below restaurant_price.`)
  }

  const stockCount = wholeNumber(raw.stock_count ?? 0, 'stock_count', row) as number
  const rawPriceTaxMode = text(raw.price_tax_mode, 30)?.toUpperCase() || 'TAX_INCLUSIVE'
  if (!['TAX_INCLUSIVE', 'TAX_EXCLUSIVE'].includes(rawPriceTaxMode)) {
    throw new BulkImportValidationError(
      `Row ${row}: price_tax_mode must be TAX_INCLUSIVE or TAX_EXCLUSIVE.`
    )
  }
  const priceTaxMode = rawPriceTaxMode as 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'

  return {
    id: crypto.randomUUID(),
    restaurant_id: restaurantId,
    name,
    category,
    price,
    restaurant_price: restaurantPrice,
    description: text(raw.description, 2000),
    in_stock: raw.in_stock !== false,
    image: text(raw.image, 2000),
    is_veg: raw.is_veg !== false,
    unit: text(raw.unit, 100),
    stock_count: stockCount,
    sku_code: text(raw.sku_code, 120),
    hsn_sac_code: text(raw.hsn_sac_code, 30) || '996331',
    price_tax_mode: priceTaxMode,
    expiry_date: optionalDate(raw.expiry_date, 'expiry_date', row),
    variants,
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthApi(request)
    const body = await request.json()
    const restaurantId = typeof body.restaurant_id === 'string' ? body.restaurant_id.trim() : ''
    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : []
    const actorRole = actor.role as string

    if (!['admin', 'restaurant_vendor', 'cravexp_store_vendor', 'vendor'].includes(actorRole)) {
      return NextResponse.json(
        { error: 'Not authorized to import restaurant menus.' },
        { status: 403 }
      )
    }
    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurant_id is required.' }, { status: 400 })
    }
    if (rawItems.length === 0 || rawItems.length > 500) {
      return NextResponse.json(
        { error: 'Import must contain between 1 and 500 menu items.' },
        { status: 400 }
      )
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { id: true, owner_id: true, name: true },
    })
    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found.' }, { status: 404 })
    }
    const actorRestaurantId = (actor as any).restaurantId || (actor as any).restaurant_id
    if (
      actorRole !== 'admin' &&
      restaurant.owner_id !== actor.id &&
      actorRestaurantId !== restaurant.id
    ) {
      return NextResponse.json({ error: 'You do not own this restaurant.' }, { status: 403 })
    }

    const items: BulkItem[] = rawItems.map((item, index) =>
      normalizeItem(item as Record<string, unknown>, index, restaurantId)
    )
    const skuCodes = items.map((item) => item.sku_code).filter((sku): sku is string => Boolean(sku))
    const duplicateSku = skuCodes.find(
      (sku, index) =>
        skuCodes.findIndex((candidate) => candidate.toLowerCase() === sku.toLowerCase()) !== index
    )
    if (duplicateSku) {
      return NextResponse.json(
        { error: `The CSV contains the duplicate SKU "${duplicateSku}".` },
        { status: 400 }
      )
    }

    if (skuCodes.length > 0) {
      const existingSkus = await prisma.menuItem.findMany({
        where: { restaurant_id: restaurantId, sku_code: { not: null } },
        select: { sku_code: true },
      })
      const requestedSkuKeys = new Set(skuCodes.map((sku) => sku.toLowerCase()))
      const conflicts = existingSkus.flatMap((item) => {
        const sku = item.sku_code
        return sku && requestedSkuKeys.has(sku.toLowerCase()) ? [sku] : []
      })
      if (conflicts.length > 0) {
        return NextResponse.json(
          {
            error: `These SKUs already exist in this restaurant: ${conflicts.join(', ')}`,
          },
          { status: 409 }
        )
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.menuItem.createMany({
        data: items.map(({ variants: _variants, ...item }) => item),
      })
      const variants = items.flatMap((item) =>
        item.variants.map((variant) => ({ ...variant, menu_item_id: item.id }))
      )
      if (variants.length > 0) await tx.menuItemVariant.createMany({ data: variants })
    })

    await cacheDel(CacheKeys.menus.byRestaurant(restaurantId)).catch(() => {})
    await broadcast('menu_items', {
      type: 'bulk_create',
      restaurantId,
      count: items.length,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      imported: items.length,
      message: `${items.length} menu items imported for ${restaurant.name}.`,
    })
  } catch (error) {
    const authResponse = handleApiAuthError(error)
    if (authResponse) return authResponse
    const message = error instanceof Error ? error.message : 'Unable to import menu items.'
    console.error('[POST /api/menu-items/bulk]', error)
    return NextResponse.json(
      {
        error:
          error instanceof BulkImportValidationError ? message : 'Unable to import menu items.',
      },
      { status: error instanceof BulkImportValidationError ? 400 : 500 }
    )
  }
}

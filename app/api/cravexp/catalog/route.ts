import { prisma } from '@/lib/prisma'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  type CraveXPGroceryItem,
} from '@/lib/cravexp-grocery-catalog'
import { NextResponse } from 'next/server'
import { requireRole, handleAuthError } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * ensureStore is now WRITE-ONLY — called exclusively from setup or seed scripts.
 */
async function ensureStore() {
  await prisma.restaurant.upsert({
    where: { id: CRAVEXP_DARK_STORE_ID },
    update: { is_open: true, is_dark_store: true },
    create: {
      id: CRAVEXP_DARK_STORE_ID,
      name: CRAVEXP_DARK_STORE_INFO.name,
      cuisine: 'craveXP Instamart 10-Min Store',
      address: CRAVEXP_DARK_STORE_INFO.address,
      is_dark_store: true,
      is_open: true,
      rating: 4.9,
      rating_count: 5200,
      delivery_minutes: 10,
    },
  })
}

function mapMenuItem(item: any): CraveXPGroceryItem {
  const mrp = Number(item.mrp ?? item.price)
  const price = Number(item.price)
  const safeImage =
    item.image && !item.image.includes('photo-1516467508483-a7212febe31a')
      ? item.image
      : item.name?.toLowerCase().includes('egg')
        ? 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500'
        : item.image || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'

  return {
    id: item.id,
    name: item.name,
    unit: item.unit || '1 Pack',
    price,
    mrp,
    image: safeImage,
    category: item.category || 'Grocery Essentials',
    inStock: item.in_stock !== false && Number(item.stock_count ?? 0) > 0,
    restaurantId: item.restaurant_id || CRAVEXP_DARK_STORE_ID,
    restaurantName: item.restaurant?.name || CRAVEXP_DARK_STORE_INFO.name,
    stockCount: Number(item.stock_count ?? 0),
    skuCode: item.sku_code || item.id,
    discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
    is_veg: item.is_veg !== false,
  }
}

function mapProductItem(item: any): CraveXPGroceryItem {
  const mrp = Number(item.mrp ?? item.price)
  const price = Number(item.price)
  const safeImage =
    item.image && !item.image.includes('photo-1516467508483-a7212febe31a')
      ? item.image
      : item.name?.toLowerCase().includes('egg')
        ? 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500'
        : item.image || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'

  return {
    id: item.id,
    name: item.name,
    unit: item.unit || '1 Pack',
    price,
    mrp,
    image: safeImage,
    category: item.category || 'Grocery Essentials',
    inStock: item.in_stock !== false && Number(item.stock_count ?? 0) > 0,
    restaurantId: CRAVEXP_DARK_STORE_ID,
    restaurantName: CRAVEXP_DARK_STORE_INFO.name,
    stockCount: Number(item.stock_count ?? 0),
    skuCode: item.sku_code || item.id,
    barcode: item.barcode || undefined,
    discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
    is_veg: item.is_veg !== false,
  }
}

function isTransientConnectionError(error: unknown) {
  let current: unknown = error
  for (let depth = 0; depth < 4 && current; depth += 1) {
    const message = current instanceof Error ? current.message.toLowerCase() : String(current)
    if (
      message.includes('connection terminated') ||
      message.includes('connection timeout') ||
      message.includes('econnreset') ||
      message.includes('etimedout')
    ) {
      return true
    }
    current =
      typeof current === 'object' && current !== null && 'cause' in current
        ? current.cause
        : undefined
  }
  return false
}

/**
 * Load items directly from the CraveXP Store Vendor's database (menu_items table for dark store).
 * Falls back to cravexp_products if menu_items hasn't been initialized yet.
 */
async function loadCatalogItems(): Promise<CraveXPGroceryItem[]> {
  const queryDarkStoreMenuItems = async () => {
    return prisma.menuItem.findMany({
      where: {
        OR: [
          { restaurant_id: CRAVEXP_DARK_STORE_ID },
          { restaurant: { is_dark_store: true } },
          { restaurant: { name: { contains: 'cravexp', mode: 'insensitive' } } },
        ],
      },
      include: {
        restaurant: {
          select: { id: true, name: true, address: true, is_open: true },
        },
      },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  try {
    const darkStoreMenuItems = await queryDarkStoreMenuItems()
    if (darkStoreMenuItems.length > 0) {
      return darkStoreMenuItems.map(mapMenuItem)
    }

    // Fallback: check cravexp_products table
    const products = await prisma.craveXPProduct.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return products.map(mapProductItem)
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error
    await new Promise((resolve) => setTimeout(resolve, 300))

    const darkStoreMenuItems = await queryDarkStoreMenuItems()
    if (darkStoreMenuItems.length > 0) {
      return darkStoreMenuItems.map(mapMenuItem)
    }

    const products = await prisma.craveXPProduct.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    return products.map(mapProductItem)
  }
}

/**
 * GET /api/cravexp/catalog
 *
 * Reads live inventory directly from the CraveXP Store Vendor's database.
 * Every product addition, stock count update, and price change in the vendor console
 * (/vendor/crave-ep) is immediately reflected here.
 */
export async function GET() {
  try {
    const items = await loadCatalogItems()
    return NextResponse.json({ success: true, items })
  } catch (error) {
    console.error('[cravexp/catalog] Failed to load catalog from vendor DB:', error)
    return NextResponse.json({ error: 'Failed to load CraveXP catalog' }, { status: 500 })
  }
}

/**
 * POST /api/cravexp/catalog
 *
 * Idempotent setup endpoint for the dark store dispatch hub.
 */
export async function POST(request: Request) {
  try {
    await requireRole(request, 'admin')
    await ensureStore()
    return NextResponse.json({ success: true })
  } catch (error) {
    const authResponse = handleAuthError(error)
    if ((authResponse.status === 401 || authResponse.status === 403) && error instanceof Error) {
      return authResponse
    }
    console.error('[cravexp/catalog] Failed to initialize store:', error)
    return NextResponse.json({ error: 'Failed to initialize CraveXP store' }, { status: 500 })
  }
}

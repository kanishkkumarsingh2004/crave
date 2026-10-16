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
 * ensureStore is now WRITE-ONLY — called exclusively from the POST handler or
 * from a migration/seed script, never from the GET path.
 *
 * P0.3 FIX: Previously, every catalog GET executed an upsert, which is a write
 * operation.  Under concurrent reads this creates unnecessary database write
 * contention.  GET requests are now pure reads; store initialization is the
 * responsibility of POST /api/cravexp/catalog (called once on setup) or a DB
 * seed script.
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

function mapItem(item: any): CraveXPGroceryItem {
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
    stockCount: Number(item.stock_count ?? 50),
    skuCode: item.sku_code || item.id,
    barcode: item.barcode || undefined,
    discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
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

async function loadCatalogItems() {
  try {
    return await prisma.craveXPProduct.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  } catch (error) {
    if (!isTransientConnectionError(error)) throw error
    await new Promise((resolve) => setTimeout(resolve, 300))
    return prisma.craveXPProduct.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }
}

/**
 * GET /api/cravexp/catalog
 *
 * Pure read from the dedicated cravexp_products table. Product management is
 * intentionally independent from restaurant menu_items and store operators.
 */
export async function GET() {
  try {
    const items = await loadCatalogItems()
    return NextResponse.json({ success: true, items: items.map(mapItem) })
  } catch (error) {
    console.error('[cravexp/catalog] Failed to load catalog:', error)
    return NextResponse.json({ error: 'Failed to load CraveXP catalog' }, { status: 500 })
  }
}

/**
 * POST /api/cravexp/catalog
 *
 * Idempotent setup endpoint for the virtual checkout/dispatch hub. Products are
 * created through /api/admin/cravexp-products and never through menu_items.
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

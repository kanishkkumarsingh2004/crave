import { prisma } from '@/lib/prisma'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  type CraveXPGroceryItem,
} from '@/lib/cravexp-grocery-catalog'
import { NextResponse } from 'next/server'

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
    inStock: item.in_stock !== false,
    restaurantId: CRAVEXP_DARK_STORE_ID,
    restaurantName: CRAVEXP_DARK_STORE_INFO.name,
    stockCount: Number(item.stock_count ?? 50),
    skuCode: item.sku_code || item.id,
    discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
  }
}

export async function GET() {
  try {
    await ensureStore()
    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: CRAVEXP_DARK_STORE_ID },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, items: items.map(mapItem) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load CraveXP catalog' },
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    await ensureStore()
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize CraveXP store' },
      { status: 500 }
    )
  }
}

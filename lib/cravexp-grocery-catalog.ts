import { prisma } from '@/lib/prisma'

export const CRAVEXP_DARK_STORE_ID = 'cravexp_dark_store_01'

export const CRAVEXP_DARK_STORE_INFO = {
  id: CRAVEXP_DARK_STORE_ID,
  name: 'craveXP Dark Store Warehouse',
  address: 'Kanakapura Road Central Warehouse, Bengaluru',
  is_dark_store: true,
}

export interface CraveXPGroceryItem {
  id: string
  name: string
  unit: string
  price: number
  mrp: number
  image: string
  category: string
  inStock: boolean
  restaurantId: string
  restaurantName: string
  stockCount: number
  skuCode: string
  discount?: string
}

export async function fetchCraveXPGroceryItems(): Promise<CraveXPGroceryItem[]> {
  if (typeof window !== 'undefined') {
    const response = await fetch('/api/cravexp/catalog')
    if (!response.ok) throw new Error('Failed to load CraveXP catalog')
    const data = await response.json()
    return data.items ?? []
  }

  try {
    const menuData = await prisma.menuItem.findMany({
      where: { restaurant_id: CRAVEXP_DARK_STORE_ID },
      orderBy: { name: 'asc' },
    })

    if (menuData.length > 0) {
      return menuData.map((item: any) => {
        const mrp = Number(item.mrp ?? item.price)
        const price = Number(item.price)
        return {
          id: item.id,
          name: item.name,
          unit: item.unit || '1 Pack',
          price: price,
          mrp: mrp,
          image: item.image || 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
          category: item.category || 'Grocery Essentials',
          inStock: Boolean(item.in_stock),
          restaurantId: CRAVEXP_DARK_STORE_ID,
          restaurantName: CRAVEXP_DARK_STORE_INFO.name,
          stockCount: Number(item.stock_count ?? 50),
          skuCode: item.sku_code || item.id,
          discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
        }
      })
    }
  } catch (e) {
    console.warn('Failed to load craveXP items from DB:', e)
  }

  return []
}

export async function ensureCraveXPDarkStore() {
  if (typeof window !== 'undefined') {
    const response = await fetch('/api/cravexp/catalog', { method: 'POST' })
    if (!response.ok) throw new Error('Failed to initialize CraveXP store')
    return
  }

  try {
    const existing = await prisma.restaurant.findUnique({
      where: { id: CRAVEXP_DARK_STORE_ID },
      select: { id: true },
    })

    if (!existing) {
      await prisma.restaurant.create({
        data: {
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
  } catch (e) {
    console.warn('Could not auto-provision craveXP dark store:', e)
  }
}

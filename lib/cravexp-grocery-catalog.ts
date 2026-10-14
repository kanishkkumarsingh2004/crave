export const CRAVEXP_DARK_STORE_ID = 'cravexp_dark_store_01'

export const CRAVEXP_DARK_STORE_INFO = {
  id: CRAVEXP_DARK_STORE_ID,
  name: 'craveXP 10 Store Hub',
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
  const response = await fetch('/api/cravexp/catalog', { cache: 'no-store' })
  if (!response.ok) throw new Error('Failed to load CraveXP catalog')

  const data = await response.json()
  return Array.isArray(data.items) ? data.items : []
}

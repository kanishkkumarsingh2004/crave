import { cacheDel, cacheGet, CacheKeys, cacheSet, CacheTTL } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import type { Restaurant } from '@prisma/client'

// ─── Listing fields ───────────────────────────────────────
// Only the columns required by the restaurant discovery / store-front UI.
// Menu items are NOT eagerly loaded here — fetch them via
//   GET /api/menu-items?restaurantId=<id>
// which has its own Redis cache (CacheTTL.MENU_ITEMS).
const RESTAURANT_LISTING_SELECT = {
  id: true,
  name: true,
  cuisine: true,
  rating: true,
  rating_count: true,
  delivery_minutes: true,
  image: true,
  is_open: true,
  is_dark_store: true,
  address: true,
  latitude: true,
  longitude: true,
  phone: true,
  fssai_license: true,
  owner_id: true,
} as const

// ─── Queries ─────────────────────────────────────────────

export async function findRestaurantById(id: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id },
    include: { owner: true },
  })
  return r ?? null
}

export async function listRestaurants(options?: {
  isDarkStore?: boolean
  isOpen?: boolean
  ownerId?: string
  limit?: number
}) {
  // Try cache first for common queries (no owner filter, no limit override)
  const isCommonQuery = !options?.ownerId && !options?.limit
  const cacheKey =
    options?.isDarkStore === true
      ? CacheKeys.restaurants.darkStores()
      : options?.isDarkStore === false
        ? CacheKeys.restaurants.foodStores()
        : options?.isOpen === false
          ? 'restaurants:closed'
          : CacheKeys.restaurants.all()

  if (isCommonQuery) {
    const cached = await cacheGet<any[]>(cacheKey)
    if (cached) return cached
  }

  const take = Math.min(options?.limit ?? 50, 100) // Max 100, default 50
  const list = await prisma.restaurant.findMany({
    where: {
      ...(options?.isDarkStore !== undefined && { is_dark_store: options.isDarkStore }),
      ...(options?.isOpen !== undefined && { is_open: options.isOpen }),
      ...(options?.ownerId && { owner_id: options.ownerId }),
    },
    // P0.2 FIX: Do NOT include menu_items here — menus are unbounded and can be
    // very large.  The discovery UI fetches them separately via /api/menu-items.
    select: RESTAURANT_LISTING_SELECT,
    orderBy: { created_at: 'desc' },
    take,
  })

  if (list && list.length > 0) {
    if (isCommonQuery) await cacheSet(cacheKey, list, { ttlSeconds: CacheTTL.RESTAURANTS })
    return list
  }

  return []
}

export async function listFoodRestaurants() {
  return listRestaurants({ isDarkStore: false })
}

export async function listDarkStores() {
  return listRestaurants({ isDarkStore: true })
}

// ─── Mutations ───────────────────────────────────────────

const VALID_RESTAURANT_FIELDS = new Set([
  'id',
  'name',
  'cuisine',
  'rating',
  'rating_count',
  'delivery_minutes',
  'image',
  'is_open',
  'is_pure_veg',
  'is_dark_store',
  'cost_for_two',
  'offer',
  'address',
  'latitude',
  'longitude',
  'phone',
  'commercial_model',
  'commission_rate',
  'markup_rate',
  'fixed_commission',
  'fixed_markup',
  'payment_model',
  'fssai_license',
  'gstin',
  'gst_status',
  'supplier_state',
  'price_tax_mode',
  'contract_number',
  'bank_account_name',
  'bank_name',
  'bank_account_number',
  'bank_ifsc',
  'payout_vpa',
  'gst_rate_percent',
])

export async function createRestaurant(data: {
  id: string
  name: string
  cuisine: string
  rating?: number
  delivery_minutes?: number
  image?: string
  is_open?: boolean
  is_pure_veg?: boolean
  is_dark_store?: boolean
  address?: string
  owner_id?: string
  commercial_model?: string
  commission_rate?: number
  markup_rate?: number
  fixed_commission?: number
  fixed_markup?: number
  payment_model?: string
  phone?: string
  latitude?: number
  longitude?: number
  bank_account_name?: string
  bank_name?: string
  bank_account_number?: string
  bank_ifsc?: string
  payout_vpa?: string
  fssai_license?: string
  gstin?: string
  gst_status?: string
  supplier_state?: string
  price_tax_mode?: string
  contract_number?: string
  gst_rate_percent?: number
}) {
  const { owner_id, ...rest } = data
  const filteredData: Record<string, any> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (VALID_RESTAURANT_FIELDS.has(key) && value !== undefined) {
      filteredData[key] = value
    }
  }
  if (owner_id) {
    filteredData.owner = { connect: { id: owner_id } }
  }
  const created = await prisma.restaurant.create({ data: filteredData as any })
  await invalidateRestaurantCache()
  return created
}

export async function invalidateRestaurantCache(): Promise<void> {
  await Promise.all([
    cacheDel(CacheKeys.restaurants.all()),
    cacheDel(CacheKeys.restaurants.open()),
    cacheDel(CacheKeys.restaurants.darkStores()),
    cacheDel(CacheKeys.restaurants.foodStores()),
    cacheDel('restaurants:closed'),
  ])
}

export async function updateRestaurant(id: string, data: Partial<Omit<Restaurant, 'id'>>) {
  const { owner_id, ...rest } = data as any
  const filteredData: Record<string, any> = {}
  for (const [key, value] of Object.entries(rest)) {
    if (VALID_RESTAURANT_FIELDS.has(key) && value !== undefined) {
      filteredData[key] = value
    }
  }
  if (owner_id) {
    filteredData.owner = { connect: { id: owner_id } }
  }
  const updated = await prisma.restaurant.update({ where: { id }, data: filteredData })
  await invalidateRestaurantCache()
  return updated
}

export async function deleteRestaurant(id: string) {
  await prisma.restaurant.delete({ where: { id } })
  await invalidateRestaurantCache()
  return { id }
}

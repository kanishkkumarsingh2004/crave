import { prisma } from '@/lib/prisma'
import type { Restaurant } from '@prisma/client'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL } from '@/lib/cache'

// ─── Queries ─────────────────────────────────────────────

export async function findRestaurantById(id: string) {
  const r = await prisma.restaurant.findUnique({
    where: { id },
    include: { owner: true },
  })
  if (r) return r
  return null
}

export async function listRestaurants(options?: {
  isDarkStore?: boolean
  isOpen?: boolean
  ownerId?: string
  limit?: number
}) {
  // Try cache first for common queries (no owner filter, no limit override)
  const isCommonQuery = !options?.ownerId && !options?.limit
  const cacheKey = options?.isDarkStore
    ? CacheKeys.restaurants.darkStores()
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
    include: { menu_items: true },
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

export async function createRestaurant(data: {
  id: string
  name: string
  cuisine: string
  rating?: number
  delivery_minutes?: number
  image?: string
  is_open?: boolean
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
  const created = await prisma.restaurant.create({ data: data as any })
  await invalidateRestaurantCache()
  return created
}

async function invalidateRestaurantCache(): Promise<void> {
  await Promise.all([
    cacheDel(CacheKeys.restaurants.all()),
    cacheDel(CacheKeys.restaurants.open()),
    cacheDel(CacheKeys.restaurants.darkStores()),
    cacheDel('restaurants:closed'),
  ])
}

export async function updateRestaurant(id: string, data: Partial<Omit<Restaurant, 'id'>>) {
  const updated = await prisma.restaurant.update({ where: { id }, data: data as any })
  await invalidateRestaurantCache()
  return updated
}

export async function deleteRestaurant(id: string) {
  await prisma.restaurant.delete({ where: { id } })
  await invalidateRestaurantCache()
  return { id }
}

export async function deleteRestaurantsByOwner(ownerId: string) {
  return await prisma.restaurant.deleteMany({ where: { owner_id: ownerId } })
}

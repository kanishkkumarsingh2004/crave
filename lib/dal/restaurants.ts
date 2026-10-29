import { cacheDel, cacheGet, CacheKeys, cacheSet, CacheTTL } from '@/lib/cache'
import { prisma } from '@/lib/prisma'
import type { Restaurant } from '@prisma/client'

// ─── Fallback Seed Data (for local/offline development) ─────
export const FALLBACK_SEED_RESTAURANTS: any[] = [
  {
    id: 'rest_01',
    name: 'Spice Garden Gourmet',
    cuisine: 'North Indian & Mughlai',
    rating: 4.8,
    rating_count: 320,
    delivery_minutes: 25,
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800',
    is_open: true,
    is_dark_store: false,
    address: '100 Feet Road, Indiranagar, Bengaluru',
    latitude: 12.9716,
    longitude: 77.6412,
    phone: '+919876543212',
    owner_id: 'usr_vendor_01',
    fssai_license: '11223344556677',
    commercial_model: 'commission',
    commission_rate: 15.0,
    markup_rate: 0.0,
    fixed_commission: 0,
    fixed_markup: 0,
    payment_model: 'commission',
    cost_for_two: 500,
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'rest_02',
    name: 'Bella Italia Bistro',
    cuisine: 'Italian, Pizza & Pasta',
    rating: 4.9,
    rating_count: 450,
    delivery_minutes: 20,
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
    is_open: true,
    is_dark_store: false,
    address: '12 Brigade Road, Bengaluru',
    latitude: 12.974,
    longitude: 77.607,
    phone: '+919876543212',
    owner_id: 'usr_vendor_01',
    fssai_license: '11223344556688',
    commercial_model: 'commission',
    commission_rate: 15.0,
    markup_rate: 0.0,
    fixed_commission: 0,
    fixed_markup: 0,
    payment_model: 'commission',
    cost_for_two: 600,
    created_at: new Date('2026-01-01'),
  },
  {
    id: 'cravexp_dark_store_01',
    name: 'craveXP 10 Store Hub',
    cuisine: 'Instant Groceries & Daily Needs',
    rating: 4.9,
    rating_count: 5200,
    delivery_minutes: 10,
    image: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500',
    is_open: true,
    is_dark_store: true,
    address: 'Central Warehouse, Bengaluru',
    latitude: 12.935,
    longitude: 77.624,
    phone: '+919876543213',
    owner_id: 'usr_darkstore_01',
    fssai_license: '22334455667788',
    commercial_model: 'commission',
    commission_rate: 10.0,
    markup_rate: 0.0,
    fixed_commission: 0,
    fixed_markup: 0,
    payment_model: 'commission',
    cost_for_two: 200,
    created_at: new Date('2026-01-01'),
  },
]

// ─── Listing fields ───────────────────────────────────────
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
  commercial_model: true,
  commission_rate: true,
  markup_rate: true,
  fixed_commission: true,
  fixed_markup: true,
  payment_model: true,
} as const

// ─── Queries ─────────────────────────────────────────────

export async function findRestaurantById(id: string) {
  if (prisma) {
    try {
      const r = await prisma.restaurant.findUnique({
        where: { id },
        include: {
          owner: true,
          commercial_contracts: {
            where: { status: 'ACTIVE' },
            orderBy: { effective_from: 'desc' },
            take: 1,
          },
        },
      })
      if (r) return r
    } catch (err) {
      console.warn('[findRestaurantById] DB query failed, using fallback:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_RESTAURANTS.find((r) => r.id === id) || null
}

export async function findRestaurantListingById(id: string) {
  if (prisma) {
    try {
      const r = await prisma.restaurant.findUnique({
        where: { id },
        select: RESTAURANT_LISTING_SELECT,
      })
      if (r) return r
    } catch (err) {
      console.warn('[findRestaurantListingById] DB query failed, using fallback:', (err as any)?.message)
    }
  }
  return FALLBACK_SEED_RESTAURANTS.find((r) => r.id === id) || null
}

export async function listRestaurants(options?: {
  isDarkStore?: boolean
  isOpen?: boolean
  ownerId?: string
  limit?: number
}) {
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

  if (prisma) {
    try {
      const take = Math.min(options?.limit ?? 50, 100)
      const list = await prisma.restaurant.findMany({
        where: {
          ...(options?.isDarkStore !== undefined && { is_dark_store: options.isDarkStore }),
          ...(options?.isOpen !== undefined && { is_open: options.isOpen }),
          ...(options?.ownerId && { owner_id: options.ownerId }),
        },
        select: RESTAURANT_LISTING_SELECT,
        orderBy: { created_at: 'desc' },
        take,
      })

      if (list && list.length > 0) {
        if (isCommonQuery) await cacheSet(cacheKey, list, { ttlSeconds: CacheTTL.RESTAURANTS })
        return list
      }
    } catch (err) {
      console.warn('[listRestaurants] DB query failed, using fallback:', (err as any)?.message)
    }
  }

  let filtered = [...FALLBACK_SEED_RESTAURANTS]
  if (options?.isDarkStore !== undefined) {
    filtered = filtered.filter((r) => r.is_dark_store === options.isDarkStore)
  }
  if (options?.isOpen !== undefined) {
    filtered = filtered.filter((r) => r.is_open === options.isOpen)
  }
  if (options?.ownerId) {
    filtered = filtered.filter((r) => r.owner_id === options.ownerId)
  }
  if (options?.limit) {
    filtered = filtered.slice(0, options.limit)
  }
  return filtered
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

  if (!prisma) {
    const synthetic = {
      id: data.id,
      ...filteredData,
      owner_id: owner_id || 'usr_vendor_01',
      rating: data.rating ?? 4.5,
      delivery_minutes: data.delivery_minutes ?? 25,
      is_open: data.is_open ?? true,
      is_dark_store: data.is_dark_store ?? false,
      created_at: new Date(),
    }
    FALLBACK_SEED_RESTAURANTS.unshift(synthetic)
    await invalidateRestaurantCache()
    return synthetic
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

  if (!prisma) {
    const idx = FALLBACK_SEED_RESTAURANTS.findIndex((r) => r.id === id)
    if (idx !== -1) {
      FALLBACK_SEED_RESTAURANTS[idx] = { ...FALLBACK_SEED_RESTAURANTS[idx], ...filteredData }
      await invalidateRestaurantCache()
      return FALLBACK_SEED_RESTAURANTS[idx]
    }
    throw new Error(`Restaurant ${id} not found in fallback catalog`)
  }

  if (owner_id) {
    filteredData.owner = { connect: { id: owner_id } }
  }
  const updated = await prisma.restaurant.update({ where: { id }, data: filteredData })
  await invalidateRestaurantCache()
  return updated
}

export async function deleteRestaurant(id: string) {
  if (!prisma) {
    const idx = FALLBACK_SEED_RESTAURANTS.findIndex((r) => r.id === id)
    if (idx !== -1) FALLBACK_SEED_RESTAURANTS.splice(idx, 1)
    await invalidateRestaurantCache()
    return { id }
  }
  await prisma.restaurant.delete({ where: { id } })
  await invalidateRestaurantCache()
  return { id }
}

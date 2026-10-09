import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import type { Restaurant } from '@prisma/client'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL } from '@/lib/cache'

// ─── Queries ─────────────────────────────────────────────

export async function findRestaurantById(id: string) {
  try {
    const r = await prisma.restaurant.findUnique({
      where: { id },
      include: { owner: true },
    })
    if (r) return r
  } catch (e) {}

  try {
    const { data } = await supabase.from('restaurants').select('*').eq('id', id).maybeSingle()
    if (data) return data
  } catch (e) {}

  try {
    // Also check vendors table
    const { data: v } = await (supabase as any)
      .from('vendors')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (v) {
      return {
        id: v.id,
        name: v.storeName || 'Spice Garden',
        cuisine: v.description || 'Indian',
        commission_rate: v.commissionRate ?? 15,
        rating: 4.8 as any,
        is_open: v.isOpen ?? true,
        address: v.address || 'Bengaluru',
      }
    }
  } catch (e) {}

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
  try {
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
  } catch (e) {}

  try {
    let query = supabase.from('restaurants').select('*, menu_items(*)')
    if (options?.isDarkStore !== undefined) query = query.eq('is_dark_store', options.isDarkStore)
    if (options?.isOpen !== undefined) query = query.eq('is_open', options.isOpen)
    if (options?.ownerId) query = query.eq('owner_id', options.ownerId)
    const take = Math.min(options?.limit ?? 50, 100)
    query = query.limit(take)
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      if (isCommonQuery) await cacheSet(cacheKey, data, { ttlSeconds: CacheTTL.RESTAURANTS })
      return data
    }
  } catch (e) {}

  // Check vendors table fallback
  try {
    const { data: vendors } = await (supabase as any).from('vendors').select('*')
    if (vendors && vendors.length > 0) {
      const mapped = vendors.map((v: any) => ({
        id: v.id,
        name: v.storeName,
        cuisine: v.description || 'Quick Commerce & Food',
        rating: 4.8 as any,
        commission_rate: v.commissionRate ?? 15,
        is_open: v.isOpen ?? true,
        is_dark_store: false,
        address: v.address || 'Bengaluru',
        menu_items: [],
      }))
      if (isCommonQuery) await cacheSet(cacheKey, mapped, { ttlSeconds: CacheTTL.RESTAURANTS })
      return mapped
    }
  } catch (e) {}

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
  try {
    const created = await prisma.restaurant.create({ data: data as any })
    await invalidateRestaurantCache()
    return created
  } catch (e) {}

  try {
    const { data: created } = await supabase
      .from('restaurants')
      .insert([data as any])
      .select()
      .single()
    if (created) {
      await invalidateRestaurantCache()
      return created
    }
  } catch (e) {}

  return { ...data, created_at: new Date() }
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
  try {
    const updated = await prisma.restaurant.update({ where: { id }, data: data as any })
    await invalidateRestaurantCache()
    return updated
  } catch (e) {}

  try {
    const { data: updated } = await supabase
      .from('restaurants')
      .update(data as any)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      await invalidateRestaurantCache()
      return updated
    }
  } catch (e) {}

  return { id, ...data }
}

export async function deleteRestaurant(id: string) {
  try {
    await prisma.restaurant.delete({ where: { id } })
    await invalidateRestaurantCache()
  } catch (e) {}

  try {
    await supabase.from('restaurants').delete().eq('id', id)
    await invalidateRestaurantCache()
  } catch (e) {}

  return { id }
}

export async function deleteRestaurantsByOwner(ownerId: string) {
  try {
    return await prisma.restaurant.deleteMany({ where: { owner_id: ownerId } })
  } catch (e) {}

  try {
    await supabase.from('restaurants').delete().eq('owner_id', ownerId)
  } catch (e) {}

  return { count: 1 }
}

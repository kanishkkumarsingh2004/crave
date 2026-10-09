/**
 * Database Access Layer — Menu Items
 * Resilient dual-engine: Prisma ORM with Supabase menu_items & products fallback
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL } from '@/lib/cache'

// ─── Queries ─────────────────────────────────────────────

export async function findMenuItemById(id: string) {
  try {
    const item = await prisma.menuItem.findUnique({ where: { id } })
    if (item) return item
  } catch (e) {}

  try {
    const { data } = await supabase.from('menu_items').select('*').eq('id', id).maybeSingle()
    if (data) return data
  } catch (e) {}

  try {
    const { data: p } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (p) {
      return {
        id: p.id,
        restaurant_id: p.vendorId,
        name: p.name,
        category: p.description || 'General',
        price: p.price,
        mrp: p.comparePrice,
        in_stock: p.status === 'ACTIVE',
        image: p.imageUrl,
        sku_code: p.sku,
      }
    }
  } catch (e) {}

  return null
}

export async function listMenuItems(restaurantId: string) {
  const cacheKey = CacheKeys.menus.byRestaurant(restaurantId)

  // Try cache first
  const cached = await cacheGet<any[]>(cacheKey)
  if (cached) return cached

  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    if (items && items.length > 0) {
      await cacheSet(CacheKeys.menus.byRestaurant(restaurantId), items, {
        ttlSeconds: CacheTTL.MENU_ITEMS,
      })
      return items
    }
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name')
    if (data && data.length > 0) {
      await cacheSet(CacheKeys.menus.byRestaurant(restaurantId), data, {
        ttlSeconds: CacheTTL.MENU_ITEMS,
      })
      return data
    }
  } catch (e) {}

  // Fallback to products table
  try {
    const { data: prods } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('vendorId', restaurantId)
    if (prods && prods.length > 0) {
      const mapped = prods.map((p: any) => ({
        id: p.id,
        restaurant_id: p.vendorId,
        name: p.name,
        category: p.description || 'General',
        price: p.price,
        mrp: p.comparePrice,
        in_stock: p.status === 'ACTIVE',
        image: p.imageUrl,
        sku_code: p.sku,
      }))
      await cacheSet(CacheKeys.menus.byRestaurant(restaurantId), mapped, {
        ttlSeconds: CacheTTL.MENU_ITEMS,
      })
      return mapped
    }
  } catch (e) {}

  return []
}

export async function listInStockItems(restaurantId: string) {
  const items = await listMenuItems(restaurantId)
  return items.filter((i: any) => i.in_stock !== false)
}

export async function searchMenuItems(restaurantId: string, query: string) {
  const items = await listMenuItems(restaurantId)
  const q = query.toLowerCase()
  return items.filter(
    (i: any) =>
      i.name.toLowerCase().includes(q) ||
      (i.category && i.category.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
  )
}

// ─── Mutations ───────────────────────────────────────────

async function invalidateMenuCache(restaurantId: string): Promise<void> {
  await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
}

export async function createMenuItem(data: {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  description?: string
  in_stock?: boolean
  image?: string
  is_veg?: boolean
  unit?: string
  mrp?: number
  stock_count?: number
  sku_code?: string
}) {
  try {
    const created = await prisma.menuItem.create({ data: data as any })
    await cacheDel(CacheKeys.menus.byRestaurant(data.restaurant_id))
    return created
  } catch (e) {}

  try {
    const { data: created } = await supabase
      .from('menu_items')
      .insert([data as any])
      .select()
      .single()
    if (created) {
      await cacheDel(CacheKeys.menus.byRestaurant(data.restaurant_id))
      return created
    }
  } catch (e) {}

  // Also try products table
  try {
    await (supabase as any).from('products').insert([
      {
        id: data.id,
        vendorId: data.restaurant_id,
        name: data.name,
        price: data.price,
        comparePrice: data.mrp,
        description: data.category,
        sku: data.sku_code || `SKU_${Date.now()}`,
        status: data.in_stock ? 'ACTIVE' : 'INACTIVE',
      },
    ])
    await cacheDel(CacheKeys.menus.byRestaurant(data.restaurant_id))
  } catch (e) {}

  return { ...data, created_at: new Date() }
}

export async function updateMenuItem(id: string, data: any) {
  // We need to get the restaurant_id first to invalidate cache
  let restaurantId: string | null = null
  try {
    const item = await prisma.menuItem.findUnique({ where: { id } })
    if (item) restaurantId = item.restaurant_id
  } catch (e) {}

  try {
    const updated = await prisma.menuItem.update({ where: { id }, data })
    if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
    return updated
  } catch (e) {}

  try {
    const { data: updated } = await supabase
      .from('menu_items')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (updated) {
      if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
      return updated
    }
  } catch (e) {}

  return { id, ...data }
}

export async function deleteMenuItem(id: string) {
  let restaurantId: string | null = null
  try {
    const item = await prisma.menuItem.findUnique({ where: { id } })
    if (item) restaurantId = item.restaurant_id
  } catch (e) {}

  try {
    await prisma.menuItem.delete({ where: { id } })
    if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
    return { id }
  } catch (e) {}

  try {
    await supabase.from('menu_items').delete().eq('id', id)
    if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  } catch (e) {}

  return { id }
}

export async function deleteMenuItemsByRestaurant(restaurantId: string) {
  try {
    await prisma.menuItem.deleteMany({ where: { restaurant_id: restaurantId } })
    await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  } catch (e) {}

  try {
    await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId)
    await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  } catch (e) {}

  return { count: 0 }
}

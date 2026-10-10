/**
 * Database Access Layer — Menu Items
 * Prisma ORM with Neon PostgreSQL
 */
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, cacheDel, CacheKeys, CacheTTL } from '@/lib/cache'

// ─── Queries ─────────────────────────────────────────────

export async function findMenuItemById(id: string) {
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (item) return item
  return null
}

export async function listMenuItems(restaurantId: string) {
  const cacheKey = CacheKeys.menus.byRestaurant(restaurantId)

  // Try cache first
  const cached = await cacheGet<any[]>(cacheKey)
  if (cached) return cached

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
  const created = await prisma.menuItem.create({ data: data as any })
  await cacheDel(CacheKeys.menus.byRestaurant(data.restaurant_id))
  return created
}

export async function updateMenuItem(id: string, data: any) {
  // We need to get the restaurant_id first to invalidate cache
  let restaurantId: string | null = null
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (item) restaurantId = item.restaurant_id

  const updated = await prisma.menuItem.update({ where: { id }, data })
  if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  return updated
}

export async function deleteMenuItem(id: string) {
  let restaurantId: string | null = null
  const item = await prisma.menuItem.findUnique({ where: { id } })
  if (item) restaurantId = item.restaurant_id

  await prisma.menuItem.delete({ where: { id } })
  if (restaurantId) await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  return { id }
}

export async function deleteMenuItemsByRestaurant(restaurantId: string) {
  await prisma.menuItem.deleteMany({ where: { restaurant_id: restaurantId } })
  await cacheDel(CacheKeys.menus.byRestaurant(restaurantId))
  return { count: 0 }
}

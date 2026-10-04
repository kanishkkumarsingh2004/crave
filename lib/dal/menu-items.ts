/**
 * Database Access Layer — Menu Items
 * Resilient dual-engine: Prisma ORM with Supabase menu_items & products fallback
 */
import { prisma } from '@/lib/prisma'
import { supabase } from '@/lib/supabase'

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
    const { data: p } = await (supabase as any).from('products').select('*').eq('id', id).maybeSingle()
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
  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurant_id: restaurantId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
    if (items && items.length > 0) return items
  } catch (e) {}

  try {
    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('name')
    if (data && data.length > 0) return data
  } catch (e) {}

  // Fallback to products table
  try {
    const { data: prods } = await (supabase as any)
      .from('products')
      .select('*')
      .eq('vendorId', restaurantId)
    if (prods && prods.length > 0) {
      return prods.map((p: any) => ({
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
    return await prisma.menuItem.create({ data: data as any })
  } catch (e) {}

  try {
    const { data: created } = await supabase.from('menu_items').insert([data as any]).select().single()
    if (created) return created
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
  } catch (e) {}

  return { ...data, created_at: new Date() }
}

export async function updateMenuItem(id: string, data: any) {
  try {
    return await prisma.menuItem.update({ where: { id }, data })
  } catch (e) {}

  try {
    const { data: updated } = await supabase.from('menu_items').update(data).eq('id', id).select().single()
    if (updated) return updated
  } catch (e) {}

  return { id, ...data }
}

export async function deleteMenuItem(id: string) {
  try {
    return await prisma.menuItem.delete({ where: { id } })
  } catch (e) {}

  try {
    await supabase.from('menu_items').delete().eq('id', id)
  } catch (e) {}

  return { id }
}

export async function deleteMenuItemsByRestaurant(restaurantId: string) {
  try {
    return await prisma.menuItem.deleteMany({ where: { restaurant_id: restaurantId } })
  } catch (e) {}

  try {
    await supabase.from('menu_items').delete().eq('restaurant_id', restaurantId)
  } catch (e) {}

  return { count: 0 }
}

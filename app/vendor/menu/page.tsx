'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, Plus, Search, Utensils } from 'lucide-react'
import VendorSidebar from '@/components/VendorSidebar'
import AddEditDishModal from '@/components/menu/AddEditDishModal'
import BulkMenuImportModal from '@/components/menu/BulkMenuImportModal'
import DishCard from '@/components/menu/DishCard'
import { MenuItemRecord } from '@/components/menu/types'
import { VendorMenuSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { publishLiveEvent } from '@/lib/websocket'

function formatMenuItem(item: any, fallbackRestaurantId: string): MenuItemRecord {
  return {
    id: item.id,
    restaurant_id: item.restaurant_id || fallbackRestaurantId,
    name: item.name,
    category: item.category || 'General',
    price: Number(item.price),
    restaurant_price: Number(item.restaurant_price ?? item.price),
    description: item.description ?? '',
    in_stock: item.in_stock ?? true,
    image:
      item.image ||
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
    veg: item.is_veg ?? true,
    unit: item.unit ?? null,
    stock_count: Number(item.stock_count ?? 0),
    sku_code: item.sku_code ?? null,
    hsn_sac_code: item.hsn_sac_code ?? '996331',
    price_tax_mode: item.price_tax_mode ?? 'TAX_INCLUSIVE',
    expiry_date: item.expiry_date ? String(item.expiry_date).substring(0, 10) : null,
    variants: Array.isArray(item.variants)
      ? item.variants.map((v: any) => ({
          id: v.id,
          name: v.name,
          restaurant_price: Number(v.restaurant_price),
          price: Number(v.price),
          in_stock: v.in_stock !== false,
          is_default: v.is_default === true,
        }))
      : [],
  }
}

export default function VendorMenuPage() {
  const { user, role, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  const [showItemModal, setShowItemModal] = useState(false)
  const [showBulkImportModal, setShowBulkImportModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null)

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (role !== 'vendor' && role !== 'restaurant_vendor') {
      router.replace(
        role === 'user' || role === 'customer'
          ? '/user/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'rider' || role === 'driver'
              ? '/driver/dashboard'
              : '/dashboard'
      )
    }
  }, [user, role, isLoading, router])

  useEffect(() => {
    async function loadLiveMenu() {
      if (!user?.id) {
        setMenuItems([])
        setRestaurantId(null)
        setMenuLoading(false)
        return
      }

      setMenuLoading(true)
      setMenuError('')
      try {
        let targetRestId: string | null = null

        const restRes = await fetch(`/api/restaurants?ownerId=${encodeURIComponent(user.id)}`)
        if (restRes.ok) {
          const restResult = await restRes.json()
          if (restResult.success && restResult.restaurants?.length > 0) {
            targetRestId = restResult.restaurants[0].id
          }
        }

        if (!targetRestId) {
          const restName = user.restaurantName || 'My Kitchen Store'
          const newRestId = `vnd_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
          const createRes = await fetch('/api/restaurants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: newRestId,
              name: restName,
              cuisine: user.cuisine || 'Multi-Cuisine',
              address: user.address || 'Bengaluru, India',
              owner_id: user.id,
              is_open: true,
              is_dark_store: false,
            }),
          })
          if (createRes.ok) {
            const createResult = await createRes.json()
            targetRestId = createResult.restaurant?.id || newRestId
          } else {
            targetRestId = newRestId
          }
        }

        const restId = targetRestId || ''
        setRestaurantId(restId || null)

        const menuRes = await fetch(`/api/menu-items?restaurantId=${encodeURIComponent(restId)}`)
        if (menuRes.ok) {
          const menuResult = await menuRes.json()
          if (menuResult.success && menuResult.items) {
            setMenuItems(menuResult.items.map((item: any) => formatMenuItem(item, restId)))
          } else {
            setMenuItems([])
          }
        } else {
          setMenuItems([])
        }
      } catch (err: any) {
        console.error('Failed to load vendor menu:', err)
        setMenuItems([])
      } finally {
        setMenuLoading(false)
      }
    }

    loadLiveMenu()
  }, [user?.id])

  const refreshMenuAfterImport = async () => {
    if (!restaurantId) return
    const response = await fetch(`/api/menu-items?restaurantId=${encodeURIComponent(restaurantId)}`, {
      cache: 'no-store',
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to refresh the menu.')
    setMenuItems((result.items || []).map((item: any) => formatMenuItem(item, restaurantId)))
    toast('Bulk menu import completed successfully!', 'success')
  }

  const handleToggleStock = async (id: string, currentStock: boolean) => {
    const nextStock = !currentStock
    try {
      const res = await fetch('/api/menu-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, in_stock: nextStock }),
      })
      if (!res.ok) throw new Error(await res.text())
      setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, in_stock: nextStock } : i)))
      publishLiveEvent('menu_items', {
        type: 'update',
        item: {
          id,
          in_stock: nextStock,
          stock_count: nextStock ? 10 : 0,
          restaurant_id: restaurantId,
        },
      })
      toast(`Dish availability updated to ${nextStock ? 'In Stock' : 'Out of Stock'}`, 'success')
    } catch {
      toast('Could not update availability.', 'error')
    }
  }

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete '${name}' from your menu?`)) return
    try {
      const res = await fetch(`/api/menu-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(await res.text())
      setMenuItems((prev) => prev.filter((i) => i.id !== id))
      publishLiveEvent('menu_items', {
        type: 'delete',
        item: {
          id,
          restaurant_id: restaurantId,
        },
      })
      toast(`Deleted '${name}' from menu.`, 'success')
    } catch {
      toast('Could not delete the menu item.', 'error')
    }
  }

  const categories = useMemo(() => {
    const fromItems = menuItems.map((item) => item.category).filter(Boolean)
    const baseOptions = [
      'Biryani, Rice & Pulao',
      'North Indian Curries',
      'South Indian & Dosa',
      'Thali & Combos',
      'Starters & Appetizers',
      'Burgers & Sandwiches',
      'Pizzas & Pasta',
      'Rolls & Wraps',
      'Beverages',
      'Desserts & Sweets',
    ]
    return ['All', ...Array.from(new Set([...fromItems, ...baseOptions]))]
  }, [menuItems])

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch = item.name.toLowerCase().includes(q) || item.description.toLowerCase().includes(q)
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
      return matchesSearch && matchesCat
    })
  }, [menuItems, searchQuery, selectedCategory])

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return <VendorMenuSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] text-[#121815] dark:text-white pb-28 lg:pb-16 lg:pl-64 custom-scrollbar transition-colors duration-200">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Menu Catalog Hero */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-6 sm:p-8 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Restaurant Menu Management
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-semibold text-[#1D1D1F] dark:text-white tracking-[-0.02em]">
                {user?.restaurantName || 'Your restaurant'} Dish Catalog
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1 font-normal">
                Manage dishes, categories, dietary types, portion sizes, pricing &amp; live kitchen inventory.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowBulkImportModal(true)}
                disabled={!restaurantId}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200/80 dark:border-white/15 bg-white dark:bg-white/10 px-5 py-2.5 text-xs font-semibold text-[#1D1D1F] dark:text-white shadow-2xs hover:bg-stone-50 dark:hover:bg-white/15 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                <FileSpreadsheet className="size-4 stroke-[1.8]" /> Bulk Import CSV
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null)
                  setShowItemModal(true)
                }}
                disabled={!restaurantId}
                className="inline-flex items-center gap-2 rounded-full bg-[#1D1D1F] dark:bg-white px-5 sm:px-6 py-2.5 text-xs font-semibold text-white dark:text-[#1D1D1F] shadow-sm hover:bg-[#2C2C2E] dark:hover:bg-stone-200 active:scale-95 disabled:opacity-50 transition cursor-pointer"
              >
                <Plus className="size-4 stroke-[2.5]" /> Add New Dish
              </button>
            </div>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-2 text-xs transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#1D1D1F] text-white dark:bg-white dark:text-[#1D1D1F] font-semibold shadow-xs'
                    : 'bg-stone-100 hover:bg-stone-200/80 text-stone-600 dark:bg-white/[0.06] dark:hover:bg-white/[0.12] dark:text-stone-300 font-medium'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] py-2.5 pl-10 pr-4 text-xs font-normal text-[#1D1D1F] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#86a018] shadow-xs transition"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuLoading ? (
            <p className="col-span-full rounded-2xl border border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-8 text-center text-sm text-stone-500 dark:text-gray-400">
              Loading menu from the database...
            </p>
          ) : menuError ? (
            <p role="alert" className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-600 dark:text-rose-300">
              {menuError}
            </p>
          ) : !restaurantId ? (
            <p className="col-span-full rounded-2xl border border-dashed border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-8 text-center text-sm text-stone-500 dark:text-gray-400">
              No restaurant is linked to this vendor account yet.
            </p>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-12 text-center text-stone-500 dark:text-gray-400">
              <Utensils className="mx-auto size-12 text-stone-400 dark:text-gray-600 mb-2" />
              <p className="font-bold text-base text-[#121815] dark:text-white">No Dishes Found</p>
              <p className="text-xs mt-1">Click &apos;Add New Dish&apos; to create dishes for your kitchen menu.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <DishCard
                key={item.id}
                item={item}
                onToggleStock={handleToggleStock}
                onEdit={(dish) => {
                  setEditingItem(dish)
                  setShowItemModal(true)
                }}
                onDelete={handleDeleteItem}
              />
            ))
          )}
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {restaurantId && (
        <AddEditDishModal
          isOpen={showItemModal}
          onClose={() => setShowItemModal(false)}
          editingItem={editingItem}
          restaurantId={restaurantId}
          onSaved={(savedItem, isEdit) => {
            if (isEdit) {
              setMenuItems((prev) => prev.map((i) => (i.id === savedItem.id ? savedItem : i)))
            } else {
              setMenuItems((prev) => [savedItem, ...prev])
            }
          }}
        />
      )}

      {restaurantId && (
        <BulkMenuImportModal
          open={showBulkImportModal}
          restaurantId={restaurantId}
          restaurantName={user.restaurantName || 'Your restaurant'}
          onClose={() => setShowBulkImportModal(false)}
          onImported={refreshMenuAfterImport}
        />
      )}
    </div>
  )
}

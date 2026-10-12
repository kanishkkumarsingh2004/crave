'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { Check, Edit, Image as ImageIcon, Plus, Search, Sparkles, Trash2, Utensils, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

export interface MenuItemRecord {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  description: string
  in_stock: boolean
  image: string
  veg?: boolean
  unit?: string | null
  mrp?: number | null
  stock_count?: number
  sku_code?: string | null
  hsn_sac_code?: string | null
  price_tax_mode?: 'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'
  expiry_date?: string | null
}

export const MENU_CATEGORY_GROUPS = [
  {
    group: 'Main Course & Meals',
    categories: [
      'Biryani, Rice & Pulao',
      'North Indian Curries',
      'South Indian & Dosa',
      'Thali & Combos',
      'Dal & Indian Breads',
      'Paneer & Veg Specials',
      'Chicken & Meat Curries',
    ],
  },
  {
    group: 'Starters & Street Food',
    categories: [
      'Starters & Appetizers',
      'Kebabs & Tandoor',
      'Chaat & Street Food',
      'Rolls & Wraps',
      'Momos & Dimsums',
      'Soups & Salads',
    ],
  },
  {
    group: 'Fast Food & Continental',
    categories: [
      'Burgers & Sandwiches',
      'Pizzas & Pasta',
      'Bowls',
      'Snacks & Finger Food',
    ],
  },
  {
    group: 'Desserts & Bakes',
    categories: [
      'Desserts & Sweets',
      'Cakes & Pastries',
      'Ice Creams & Waffles',
      'Bakery & Cookies',
    ],
  },
  {
    group: 'Beverages & Drinks',
    categories: [
      'Beverages',
      'Cold Drinks & Sodas',
      'Fresh Juices & Smoothies',
      'Milkshakes',
      'Chai, Coffee & Hot Drinks',
    ],
  },
  {
    group: 'Dark Store & Groceries',
    categories: [
      'Dairy & Eggs',
      'Instant Food & Noodles',
      'Packaged Snacks & Munchies',
      'Cooking Essentials & Spices',
    ],
  },
]

export const ALL_PRESET_CATEGORIES = MENU_CATEGORY_GROUPS.flatMap((g) => g.categories)

const PORTION_PRESETS = [
  'Serves 1',
  'Serves 1-2',
  'Serves 2-3',
  '1 Plate',
  'Half',
  'Full',
  '500 ml',
  '250 g',
  '1 Piece',
  'Combo Box',
]

const QUICK_IMAGE_PRESETS = [
  {
    name: 'Biryani',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Pizza',
    url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Bowl / Salad',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Roll / Wrap',
    url: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Curry / Gravy',
    url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Beverage',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dessert',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=800&q=80',
  },
]

export default function VendorMenuPage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItemRecord[]>([])
  const [menuLoading, setMenuLoading] = useState(true)
  const [menuError, setMenuError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Modal State for Adding / Editing Dish
  const [showItemModal, setShowItemModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItemRecord | null>(null)

  // Form Fields
  const [nameInput, setNameInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('Biryani, Rice & Pulao')
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategoryInput, setCustomCategoryInput] = useState('')
  const [priceInput, setPriceInput] = useState<number | ''>('')
  const [mrpInput, setMrpInput] = useState<number | ''>('')
  const [descInput, setDescInput] = useState('')
  const [imageInput, setImageInput] = useState('')
  const [isVegInput, setIsVegInput] = useState(true)
  const [inStockInput, setInStockInput] = useState(true)
  const [stockCountInput, setStockCountInput] = useState<number | ''>(50)
  const [unitInput, setUnitInput] = useState('Serves 1')
  const [skuCodeInput, setSkuCodeInput] = useState('')
  const [expiryDateInput, setExpiryDateInput] = useState('')

  // Commercial Engine Item Fields
  const [hsnSacInput, setHsnSacInput] = useState('996331')
  const [priceTaxModeInput, setPriceTaxModeInput] = useState<'TAX_INCLUSIVE' | 'TAX_EXCLUSIVE'>(
    'TAX_INCLUSIVE'
  )

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

  // Load live menu items for logged-in vendor from database
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
            const formatted: MenuItemRecord[] = menuResult.items.map((item: any) => ({
              id: item.id,
              restaurant_id: item.restaurant_id || targetRestId,
              name: item.name,
              category: item.category || 'General',
              price: Number(item.price),
              description: item.description ?? '',
              in_stock: item.in_stock ?? true,
              image:
                item.image ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
              veg: item.is_veg ?? true,
              unit: item.unit ?? null,
              mrp: item.mrp != null ? Number(item.mrp) : null,
              stock_count: Number(item.stock_count ?? 0),
              sku_code: item.sku_code ?? null,
              hsn_sac_code: item.hsn_sac_code ?? '996331',
              price_tax_mode: item.price_tax_mode ?? 'TAX_INCLUSIVE',
              expiry_date: item.expiry_date ? String(item.expiry_date).substring(0, 10) : null,
            }))
            setMenuItems(formatted)
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

  function triggerToast(msg: string) {
    const isError = /could not|failed|error|unable|invalid/i.test(msg)
    toast(msg, isError ? 'error' : 'success')
  }

  function openAddModal() {
    setEditingItem(null)
    setNameInput('')
    setCategoryInput('Biryani, Rice & Pulao')
    setIsCustomCategory(false)
    setCustomCategoryInput('')
    setPriceInput('')
    setMrpInput('')
    setDescInput('')
    setImageInput('')
    setIsVegInput(true)
    setInStockInput(true)
    setStockCountInput(50)
    setUnitInput('Serves 1')
    setSkuCodeInput('')
    setHsnSacInput('996331')
    setPriceTaxModeInput('TAX_INCLUSIVE')
    setExpiryDateInput('')
    setShowItemModal(true)
  }

  function openEditModal(item: MenuItemRecord) {
    setEditingItem(item)
    setNameInput(item.name)
    const isPreset = ALL_PRESET_CATEGORIES.includes(item.category)
    if (isPreset) {
      setCategoryInput(item.category)
      setIsCustomCategory(false)
      setCustomCategoryInput('')
    } else {
      setCategoryInput('__CUSTOM__')
      setIsCustomCategory(true)
      setCustomCategoryInput(item.category)
    }
    setPriceInput(item.price)
    setMrpInput(item.mrp != null ? item.mrp : '')
    setDescInput(item.description || '')
    setImageInput(item.image || '')
    setIsVegInput(item.veg !== false)
    setInStockInput(item.in_stock !== false)
    setStockCountInput(item.stock_count != null ? item.stock_count : 50)
    setUnitInput(item.unit || '')
    setSkuCodeInput(item.sku_code || '')
    setHsnSacInput(item.hsn_sac_code || '996331')
    setPriceTaxModeInput(item.price_tax_mode || 'TAX_INCLUSIVE')
    setExpiryDateInput(item.expiry_date || '')
    setShowItemModal(true)
  }

  async function handleSaveItem(e: FormEvent) {
    e.preventDefault()
    if (!nameInput.trim() || priceInput === '' || !restaurantId) {
      triggerToast('Please provide a valid dish name and price.')
      return
    }

    const resolvedCategory = isCustomCategory
      ? customCategoryInput.trim() || 'General'
      : categoryInput

    const newItemId = editingItem
      ? editingItem.id
      : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const defaultImg =
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

    const itemData: MenuItemRecord = {
      id: newItemId,
      restaurant_id: restaurantId,
      name: nameInput.trim(),
      category: resolvedCategory,
      price: Number(priceInput),
      description: descInput.trim(),
      in_stock: inStockInput,
      image: imageInput.trim() || defaultImg,
      veg: isVegInput,
      unit: unitInput.trim() || null,
      mrp: mrpInput !== '' ? Number(mrpInput) : null,
      stock_count: stockCountInput !== '' ? Number(stockCountInput) : 0,
      sku_code: skuCodeInput.trim() || null,
      hsn_sac_code: hsnSacInput.trim() || '996331',
      price_tax_mode: priceTaxModeInput,
      expiry_date: expiryDateInput || null,
    }

    try {
      const payload = {
        id: newItemId,
        restaurant_id: restaurantId,
        name: itemData.name,
        category: itemData.category,
        price: itemData.price,
        description: itemData.description || null,
        image: itemData.image || null,
        in_stock: itemData.in_stock,
        is_veg: itemData.veg ?? true,
        unit: itemData.unit || null,
        mrp: itemData.mrp || null,
        stock_count: itemData.stock_count || 0,
        sku_code: itemData.sku_code || null,
        hsn_sac_code: itemData.hsn_sac_code || '996331',
        price_tax_mode: itemData.price_tax_mode || 'TAX_INCLUSIVE',
        expiry_date: itemData.expiry_date || null,
      }

      let res
      if (editingItem) {
        res = await fetch('/api/menu-items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch('/api/menu-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      }

      if (!res.ok) {
        const errResult = await res.text()
        throw new Error(errResult || 'Failed to save menu item')
      }

      const result = await res.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to save menu item')
      }
    } catch (err: any) {
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err))
      console.error('Failed to save menu item:', errMsg)
      triggerToast(errMsg || 'Could not save dish to database.')
      return
    }

    if (editingItem) {
      setMenuItems((prev) => prev.map((i) => (i.id === editingItem.id ? itemData : i)))
      triggerToast(`Updated dish '${itemData.name}'!`)
    } else {
      setMenuItems((prev) => [itemData, ...prev])
      triggerToast(`Added new dish '${itemData.name}' to live menu!`)
    }

    setShowItemModal(false)
  }

  async function handleToggleStock(id: string, currentStock: boolean) {
    const nextStock = !currentStock
    try {
      const res = await fetch('/api/menu-items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, in_stock: nextStock }),
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }
    } catch (err) {
      console.error('Failed to update menu item stock:', err)
      triggerToast('Could not update availability. Please try again.')
      return
    }

    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, in_stock: nextStock } : i)))
    triggerToast(`Dish availability updated to ${nextStock ? 'In Stock' : 'Out of Stock'}`)
  }

  async function handleDeleteItem(id: string, name: string) {
    if (!confirm(`Are you sure you want to delete '${name}' from your menu?`)) return
    try {
      const res = await fetch(`/api/menu-items?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        throw new Error(await res.text())
      }
    } catch (err) {
      console.error('Failed to delete menu item:', err)
      triggerToast('Could not delete the menu item. Please try again.')
      return
    }

    setMenuItems((prev) => prev.filter((i) => i.id !== id))
    triggerToast(`Deleted '${name}' from menu.`)
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
    const unique = Array.from(new Set([...fromItems, ...baseOptions]))
    return ['All', ...unique]
  }, [menuItems])

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
    return matchesSearch && matchesCat
  })

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-[#0a0f0d] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] text-[#121815] dark:text-white pb-28 lg:pb-16 lg:pl-64 custom-scrollbar transition-colors duration-200">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Menu Catalog Hero */}
        <div className="rounded-3xl border border-stone-200 dark:border-[#233027] bg-white dark:bg-gradient-to-r dark:from-[#141b17] dark:via-[#111614] dark:to-[#18231c] p-6 shadow-sm dark:shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447]">
                Restaurant Menu Management
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-[#121815] dark:text-white">
                {user?.restaurantName || 'Your restaurant'} Dish Catalog
              </h2>
              <p className="text-xs text-stone-500 dark:text-gray-400 mt-0.5">
                Manage dishes, categories, dietary types, portion sizes, pricing & live kitchen inventory.
              </p>
            </div>

            <button
              onClick={openAddModal}
              disabled={!restaurantId}
              className="inline-flex items-center gap-2 rounded-full bg-[#d9f447] px-6 py-3 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition cursor-pointer"
            >
              <Plus className="size-4 text-[#0d1310]" /> Add New Dish
            </button>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition shrink-0 border cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447] font-black'
                    : 'bg-stone-100 dark:bg-[#141c17] text-stone-700 dark:text-gray-300 border-stone-200 dark:border-[#233228] hover:bg-stone-200/80 dark:hover:bg-[#1c2720] hover:text-stone-900 dark:hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-2.5 size-4 text-stone-400 dark:text-gray-400" />
            <input
              type="text"
              placeholder="Search dishes or ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-stone-200 dark:border-[#233228] bg-white dark:bg-[#141c17] py-2 pl-9 pr-4 text-xs font-medium text-[#121815] dark:text-white placeholder-stone-400 dark:placeholder-gray-500 outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] shadow-xs"
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
            <p
              role="alert"
              className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-600 dark:text-rose-300"
            >
              {menuError}
            </p>
          ) : !restaurantId ? (
            <p className="col-span-full rounded-2xl border border-dashed border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-8 text-center text-sm text-stone-500 dark:text-gray-400">
              No restaurant is linked to this vendor account yet.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-8 text-center text-sm text-stone-500 dark:text-gray-400">
              No menu items match your criteria. Click &quot;Add New Dish&quot; above to add one.
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-3xl border p-4 bg-white dark:bg-[#121815] shadow-sm dark:shadow-xl flex flex-col justify-between transition ${
                  item.in_stock
                    ? 'border-stone-200 dark:border-[#233027] hover:border-[#86a018]/40 dark:hover:border-[#d9f447]/40'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl mb-3 bg-stone-100 dark:bg-[#171f1b]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`size-full object-cover transition ${!item.in_stock ? 'grayscale opacity-60' : ''}`}
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-stone-100 dark:bg-[#171f1b] text-stone-400 dark:text-gray-500">
                        <Utensils className="size-8" aria-hidden="true" />
                      </div>
                    )}

                    {/* Category Tag */}
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 dark:bg-[#18201c]/90 px-3 py-1 text-[10px] font-black uppercase text-[#86a018] dark:text-[#d9f447] border border-stone-200 dark:border-[#27342d] backdrop-blur-md shadow-xs">
                      {item.category}
                    </span>

                    {/* Veg / Non-Veg Indicator Badge */}
                    <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 dark:bg-[#18201c]/90 px-2.5 py-1 text-[10px] font-bold border border-stone-200 dark:border-[#27342d] backdrop-blur-md shadow-xs">
                      {item.veg !== false ? (
                        <>
                          <span className="inline-block size-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
                          <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">VEG</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block size-2 rounded-full bg-rose-500 ring-2 ring-rose-500/30" />
                          <span className="text-rose-700 dark:text-rose-400 font-extrabold">NON-VEG</span>
                        </>
                      )}
                    </span>

                    {!item.in_stock && (
                      <span className="absolute inset-0 grid place-items-center bg-black/75 text-white text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-base text-[#121815] dark:text-white leading-snug">
                        {item.name}
                      </h3>
                      {item.unit && (
                        <span className="inline-block text-[11px] font-bold text-stone-500 dark:text-gray-400">
                          {item.unit}
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-black text-lg text-[#5e700a] dark:text-[#d9f447]">
                        ₹{item.price}
                      </span>
                      {item.mrp != null && item.mrp > item.price && (
                        <span className="block text-[10px] font-medium text-stone-400 dark:text-gray-500 line-through">
                          ₹{item.mrp}
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-stone-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.description || 'No description provided.'}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px]">
                    {item.stock_count != null && (
                      <span className="rounded-md bg-stone-100 dark:bg-[#1a231e] px-2 py-0.5 font-bold text-stone-600 dark:text-gray-300 border border-stone-200 dark:border-[#28372e]">
                        Stock: {item.stock_count} units
                      </span>
                    )}
                    {item.sku_code && (
                      <span className="rounded-md bg-stone-100 dark:bg-[#1a231e] px-2 py-0.5 font-mono font-bold text-stone-500 dark:text-gray-400 border border-stone-200 dark:border-[#28372e]">
                        SKU: {item.sku_code}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#202b24] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStock(item.id, item.in_stock)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition border cursor-pointer ${
                      item.in_stock
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="grid size-8 place-items-center rounded-xl bg-stone-100 dark:bg-[#1c2620] text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-[#25332a] transition border border-stone-200 dark:border-[#28372e] cursor-pointer"
                      title="Edit Dish"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20 cursor-pointer"
                      title="Delete Dish"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {filteredItems.length === 0 && (
            <div className="col-span-full rounded-3xl border border-dashed border-stone-200 dark:border-[#222e27] bg-white dark:bg-[#121815] p-12 text-center text-stone-500 dark:text-gray-400">
              <Utensils className="mx-auto size-12 text-stone-400 dark:text-gray-600 mb-2" />
              <p className="font-bold text-base text-[#121815] dark:text-white">No Dishes Found</p>
              <p className="text-xs mt-1">
                Click &apos;Add New Dish&apos; to create dishes for your kitchen menu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-[#121815] border border-stone-200 dark:border-[#233027] p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto text-[#121815] dark:text-white custom-scrollbar">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#202b24] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447] flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  {editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#121815] dark:text-white mt-0.5">
                  {editingItem ? editingItem.name : 'Add Dish to Menu'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowItemModal(false)}
                className="grid size-9 place-items-center rounded-full bg-stone-100 dark:bg-[#1c2620] text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-[#25332a] cursor-pointer transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-5 space-y-5 text-xs">
              {/* Dietary Indicator (Veg / Non-Veg) */}
              <div>
                <label className="font-bold text-stone-700 dark:text-gray-200 block mb-1.5">
                  Dietary Classification <span className="text-rose-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setIsVegInput(true)}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-3 border font-extrabold transition cursor-pointer ${
                      isVegInput
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 shadow-sm ring-1 ring-emerald-500'
                        : 'border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] text-stone-600 dark:text-gray-400 hover:border-emerald-500/40'
                    }`}
                  >
                    <span className="grid size-4 place-items-center rounded-sm border border-emerald-600 dark:border-emerald-400 p-0.5">
                      <span className="size-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    </span>
                    <span>Pure Veg (100% Vegetarian)</span>
                    {isVegInput && <Check className="size-3.5 text-emerald-600 ml-1" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVegInput(false)}
                    className={`flex items-center justify-center gap-2 rounded-2xl p-3 border font-extrabold transition cursor-pointer ${
                      !isVegInput
                        ? 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-400 shadow-sm ring-1 ring-rose-500'
                        : 'border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] text-stone-600 dark:text-gray-400 hover:border-rose-500/40'
                    }`}
                  >
                    <span className="grid size-4 place-items-center rounded-sm border border-rose-600 dark:border-rose-400 p-0.5">
                      <span className="size-2 rounded-full bg-rose-600 dark:bg-rose-400" />
                    </span>
                    <span>Non-Veg (Contains Meat/Egg)</span>
                    {!isVegInput && <Check className="size-3.5 text-rose-600 ml-1" />}
                  </button>
                </div>
              </div>

              {/* Dish Name */}
              <div>
                <label className="font-bold text-stone-700 dark:text-gray-200">
                  Dish Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Classic Hyderabadi Dum Biryani or Paneer Tikka Wrap"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
              </div>

              {/* Category & Portion/Serving Size */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-stone-700 dark:text-gray-200">
                      Category <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCustomCategory(!isCustomCategory)}
                      className="text-[10px] font-bold text-[#86a018] dark:text-[#d9f447] hover:underline"
                    >
                      {isCustomCategory ? 'Choose from List' : '+ Custom Category'}
                    </button>
                  </div>

                  {!isCustomCategory ? (
                    <select
                      value={categoryInput}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM__') {
                          setIsCustomCategory(true)
                        } else {
                          setCategoryInput(e.target.value)
                        }
                      }}
                      className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                    >
                      {MENU_CATEGORY_GROUPS.map((group) => (
                        <optgroup
                          key={group.group}
                          label={group.group}
                          className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white font-bold"
                        >
                          {group.categories.map((cat) => (
                            <option
                              key={cat}
                              value={cat}
                              className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white font-normal"
                            >
                              {cat}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                      <option
                        value="__CUSTOM__"
                        className="bg-white dark:bg-[#121815] text-[#86a018] dark:text-[#d9f447] font-bold"
                      >
                        + Create Custom Category...
                      </option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chef's Daily Special, Tandoor Platter"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-[#86a018] dark:border-[#d9f447] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none"
                    />
                  )}
                </div>

                {/* Portion / Serving Unit */}
                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    Portion / Serving Size
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Serves 1-2, 500 ml, 1 Plate"
                    value={unitInput}
                    onChange={(e) => setUnitInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {PORTION_PRESETS.slice(0, 5).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setUnitInput(preset)}
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold transition border cursor-pointer ${
                          unitInput === preset
                            ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447]'
                            : 'bg-stone-100 dark:bg-[#1a231e] text-stone-600 dark:text-gray-400 border-stone-200 dark:border-[#28372e] hover:border-stone-400'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pricing, Strike MRP & Tax Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    Selling Price (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="e.g. 299"
                    value={priceInput}
                    onChange={(e) =>
                      setPriceInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-black text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    Original MRP (₹) <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 349 (Crossed out)"
                    value={mrpInput}
                    onChange={(e) =>
                      setMrpInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">GST Tax Mode</label>
                  <select
                    value={priceTaxModeInput}
                    onChange={(e) => setPriceTaxModeInput(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  >
                    <option
                      value="TAX_INCLUSIVE"
                      className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white"
                    >
                      TAX INCLUSIVE (Standard)
                    </option>
                    <option
                      value="TAX_EXCLUSIVE"
                      className="bg-white dark:bg-[#121815] text-[#121815] dark:text-white"
                    >
                      TAX EXCLUSIVE (+ GST at checkout)
                    </option>
                  </select>
                </div>
              </div>

              {/* Commercial & Inventory Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    HSN/SAC Code
                  </label>
                  <input
                    type="text"
                    value={hsnSacInput}
                    onChange={(e) => setHsnSacInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                    placeholder="996331"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Restaurant service code</span>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    Stock Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={stockCountInput}
                    onChange={(e) =>
                      setStockCountInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-bold text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                    placeholder="50"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Daily kitchen inventory</span>
                </div>

                <div>
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    SKU / Item Code <span className="text-stone-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={skuCodeInput}
                    onChange={(e) => setSkuCodeInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                    placeholder="e.g. BRY-101"
                  />
                  <span className="text-[10px] text-stone-400 mt-0.5 block">Internal tracking code</span>
                </div>
              </div>

              {/* Description / Ingredients */}
              <div>
                <label className="font-bold text-stone-700 dark:text-gray-200">
                  Description / Ingredients / Allergen Info
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fragrant aged basmati rice cooked with fresh paneer cubes, saffron, roasted spices, and crispy onions. Served with raita."
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-medium text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
              </div>

              {/* Dish Image URL & Quick Presets */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-stone-700 dark:text-gray-200">
                    Dish Image URL
                  </label>
                  <span className="text-[10px] text-stone-400">High-resolution JPG/PNG</span>
                </div>

                <div className="flex gap-3 items-center">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      value={imageInput}
                      onChange={(e) => setImageInput(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full rounded-xl border border-stone-200 dark:border-[#233027] bg-stone-50 dark:bg-[#0d1210] p-3 font-mono text-[11px] text-[#121815] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                    />
                  </div>

                  {/* Thumbnail Preview */}
                  <div className="size-11 rounded-xl overflow-hidden border border-stone-200 dark:border-[#233027] bg-stone-100 dark:bg-[#171f1b] shrink-0 grid place-items-center">
                    {imageInput ? (
                      <img
                        src={imageInput}
                        alt="Preview"
                        className="size-full object-cover"
                        onError={(e) => {
                          ;(e.target as any).style.display = 'none'
                        }}
                      />
                    ) : (
                      <ImageIcon className="size-5 text-stone-400 dark:text-gray-500" />
                    )}
                  </div>
                </div>

                {/* Instant Sample Image Starters */}
                <div className="mt-2 rounded-xl bg-stone-50 dark:bg-[#0d1210] p-2.5 border border-stone-200/70 dark:border-[#202b24]">
                  <span className="text-[10px] font-bold text-stone-500 dark:text-gray-400 block mb-1.5">
                    Quick Sample Photos (Click to auto-fill):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_IMAGE_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setImageInput(preset.url)}
                        className={`rounded-lg px-2 py-1 text-[10px] font-bold transition border cursor-pointer ${
                          imageInput === preset.url
                            ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447]'
                            : 'bg-white dark:bg-[#171f1b] text-stone-700 dark:text-gray-300 border-stone-200 dark:border-[#27352d] hover:border-[#86a018] dark:hover:border-[#d9f447]'
                        }`}
                      >
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* In-Stock Availability Toggle */}
              <div className="flex items-center justify-between rounded-2xl bg-stone-50 dark:bg-[#171f1b] p-4 border border-stone-200 dark:border-[#233027]">
                <div>
                  <span className="font-extrabold text-sm text-[#121815] dark:text-white block">
                    Live In-Stock Availability
                  </span>
                  <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                    When active, customers can add this item to their cart immediately.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInStockInput(!inStockInput)}
                  className={`px-5 py-2 rounded-full font-black text-xs transition cursor-pointer shadow-sm ${
                    inStockInput
                      ? 'bg-emerald-500 text-[#0d1310] hover:bg-emerald-400'
                      : 'bg-rose-500 text-white hover:bg-rose-600'
                  }`}
                >
                  {inStockInput ? '✓ In Stock' : '✕ Out of Stock'}
                </button>
              </div>

              {/* Form Actions */}
              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-stone-100 dark:border-[#202b24]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-full border border-stone-200 dark:border-[#2a382e] bg-stone-100 dark:bg-[#1a231e] px-6 py-2.5 font-bold text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#d9f447] px-8 py-2.5 font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition cursor-pointer text-xs"
                >
                  {editingItem ? 'Save Dish Changes' : 'Add Dish to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

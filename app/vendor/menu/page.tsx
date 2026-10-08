'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import { Edit, Plus, Search, Trash2, Utensils, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

interface MenuItemRecord {
  id: string
  restaurant_id: string
  name: string
  category: string
  price: number
  description: string
  in_stock: boolean
  image: string
  veg?: boolean
}

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
  const [categoryInput, setCategoryInput] = useState('Bowls')
  const [priceInput, setPriceInput] = useState<number | ''>('')
  const [descInput, setDescInput] = useState('')
  const [imageInput, setImageInput] = useState('')
  const [isVegInput, setIsVegInput] = useState(true)
  const [inStockInput, setInStockInput] = useState(true)

  // Commercial Engine Item Fields (Section 26)
  const [hsnSacInput, setHsnSacInput] = useState('996331')
  const [mrpInput, setMrpInput] = useState<number | ''>('')
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

  // Load this vendor's menu only; an empty query must not leave placeholder rows visible.
  // Load live menu items for logged-in vendor from Supabase
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
              category: item.category,
              price: Number(item.price),
              description: item.description ?? '',
              in_stock: item.in_stock ?? true,
              image:
                item.image ||
                'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
              veg: item.is_veg ?? true,
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
    setCategoryInput('Bowls')
    setPriceInput('')
    setDescInput('')
    setImageInput('')
    setIsVegInput(true)
    setInStockInput(true)
    setShowItemModal(true)
  }

  function openEditModal(item: MenuItemRecord) {
    setEditingItem(item)
    setNameInput(item.name)
    setCategoryInput(item.category)
    setPriceInput(item.price)
    setDescInput(item.description)
    setImageInput(item.image)
    setIsVegInput(item.veg !== false)
    setInStockInput(item.in_stock)
    setShowItemModal(true)
  }

  async function handleSaveItem(e: FormEvent) {
    e.preventDefault()
    if (!nameInput.trim() || priceInput === '' || !restaurantId) {
      triggerToast('Please provide a valid dish name and price.')
      return
    }

    const newItemId = editingItem
      ? editingItem.id
      : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`
    const defaultImg =
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'

    const itemData: MenuItemRecord = {
      id: newItemId,
      restaurant_id: restaurantId,
      name: nameInput.trim(),
      category: categoryInput,
      price: Number(priceInput),
      description: descInput.trim(),
      in_stock: inStockInput,
      image: imageInput.trim() || defaultImg,
      veg: isVegInput,
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
        is_veg: itemData.veg ?? null,
        unit: null,
        mrp: itemData.price || null,
        stock_count: 0,
        sku_code: null,
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

  const categories = ['All', 'Bowls', 'Wraps', 'Starters', 'Beverages', 'Desserts']

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCat = selectedCategory === 'All' || item.category === selectedCategory
    return matchesSearch && matchesCat
  })

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0f0d] text-white pb-16 lg:pl-64 custom-scrollbar">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Menu Catalog Hero */}
        <div className="rounded-3xl border border-[#233027] bg-gradient-to-r from-[#141b17] via-[#111614] to-[#18231c] p-6 shadow-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">
                Restaurant Menu Management
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                {user?.restaurantName || 'Your restaurant'} Dish Catalog
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Add, edit, set pricing, or toggle live dish availability for customer orders.
              </p>
            </div>

            <button
              onClick={openAddModal}
              disabled={!restaurantId}
              className="inline-flex items-center gap-2 rounded-full bg-[#d9f447] px-6 py-3 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition"
            >
              <Plus className="size-4 text-[#0d1310]" /> Add New Dish
            </button>
          </div>
        </div>

        {/* Filter Chips & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition shrink-0 border ${
                  selectedCategory === cat
                    ? 'bg-[#d9f447] text-[#0d1310] border-[#d9f447] font-black'
                    : 'bg-[#141c17] text-gray-300 border-[#233228] hover:bg-[#1c2720] hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3.5 top-2.5 size-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search dishes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-full border border-[#233228] bg-[#141c17] py-2 pl-9 pr-4 text-xs font-medium text-white placeholder-gray-500 outline-none focus:border-[#d9f447] shadow-xs"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuLoading ? (
            <p className="col-span-full rounded-2xl border border-[#222e27] bg-[#121815] p-8 text-center text-sm text-gray-400">
              Loading menu from the database...
            </p>
          ) : menuError ? (
            <p
              role="alert"
              className="col-span-full rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-sm text-rose-300"
            >
              {menuError}
            </p>
          ) : !restaurantId ? (
            <p className="col-span-full rounded-2xl border border-dashed border-[#222e27] bg-[#121815] p-8 text-center text-sm text-gray-400">
              No restaurant is linked to this vendor account yet.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-[#222e27] bg-[#121815] p-8 text-center text-sm text-gray-400">
              No menu items are stored for this restaurant yet.
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-3xl border p-4 bg-[#121815] shadow-xl flex flex-col justify-between transition ${
                  item.in_stock
                    ? 'border-[#233027] hover:border-[#d9f447]/40'
                    : 'border-rose-500/30 bg-rose-500/5'
                }`}
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl mb-3 bg-[#171f1b]">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`size-full object-cover transition ${!item.in_stock ? 'grayscale opacity-60' : ''}`}
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-[#171f1b] text-gray-500">
                        <Utensils className="size-8" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 rounded-full bg-[#18201c]/90 px-3 py-1 text-[10px] font-black uppercase text-[#d9f447] border border-[#27342d] backdrop-blur-md shadow-xs">
                      {item.category}
                    </span>
                    {!item.in_stock && (
                      <span className="absolute inset-0 grid place-items-center bg-black/75 text-white text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-base text-white leading-snug">
                      {item.name}
                    </h3>
                    <span className="font-black text-lg text-[#d9f447] shrink-0">
                      ₹{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#202b24] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStock(item.id, item.in_stock)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition border ${
                      item.in_stock
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                    }`}
                  >
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => openEditModal(item)}
                      className="grid size-8 place-items-center rounded-xl bg-[#1c2620] text-gray-300 hover:text-white hover:bg-[#25332a] transition border border-[#28372e]"
                      title="Edit Dish"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition border border-rose-500/20"
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
            <div className="col-span-full rounded-3xl border border-dashed border-[#222e27] bg-[#121815] p-12 text-center text-gray-400">
              <Utensils className="mx-auto size-12 text-gray-600 mb-2" />
              <p className="font-bold text-base text-white">No Dishes Found</p>
              <p className="text-xs mt-1">
                Click &apos;Add New Dish&apos; to create dishes for your kitchen menu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#121815] border border-[#233027] p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-white">
            <div className="flex items-center justify-between border-b border-[#202b24] pb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">
                  {editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}
                </span>
                <h3 className="text-xl font-black text-white mt-0.5">
                  {editingItem ? editingItem.name : 'Add Dish to Menu'}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="grid size-8 place-items-center rounded-full bg-[#1c2620] text-gray-400 hover:text-white hover:bg-[#25332a]"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-200">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Quinoa Harvest Bowl"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-200">Category</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                  >
                    <option value="Bowls">Bowls</option>
                    <option value="Wraps">Wraps</option>
                    <option value="Starters">Starters</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-200">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={priceInput}
                    onChange={(e) =>
                      setPriceInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-200">Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Organic quinoa topped with wild basil pesto & roasted cherry tomatoes"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-gray-200">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={hsnSacInput}
                    onChange={(e) => setHsnSacInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono font-bold text-white outline-none focus:border-[#d9f447]"
                    placeholder="996331"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-200">MRP (Optional)</label>
                  <input
                    type="number"
                    value={mrpInput}
                    onChange={(e) =>
                      setMrpInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-200">GST Tax Mode</label>
                  <select
                    value={priceTaxModeInput}
                    onChange={(e) => setPriceTaxModeInput(e.target.value as any)}
                    className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                  >
                    <option value="TAX_INCLUSIVE">TAX INCLUSIVE</option>
                    <option value="TAX_EXCLUSIVE">TAX EXCLUSIVE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-200">Dish Image URL</label>
                <input
                  type="url"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono text-[11px] text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-[#171f1b] p-4 border border-[#233027]">
                <span className="font-bold text-white">In-Stock Availability</span>
                <button
                  type="button"
                  onClick={() => setInStockInput(!inStockInput)}
                  className={`px-4 py-1.5 rounded-full font-bold transition ${
                    inStockInput ? 'bg-emerald-500 text-[#0d1310]' : 'bg-rose-500 text-white'
                  }`}
                >
                  {inStockInput ? 'In Stock' : 'Out of Stock'}
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-[#202b24]">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-full border border-[#2a382e] bg-[#1a231e] px-5 py-2.5 font-bold text-gray-300 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#d9f447] px-7 py-2.5 font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] transition"
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

'use client'

import { useAuth } from '@/lib/auth-context'
import { useToast } from '@/lib/toast-context'
import {
  ArrowLeft,
  Edit,
  LogOut,
  Percent,
  Plus,
  Search,
  Settings,
  Sparkles,
  Store,
  Trash2,
  Utensils,
  X,
} from 'lucide-react'
import Link from 'next/link'
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
      triggerToast(`🎉 Added new dish '${itemData.name}' to live menu!`)
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
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#86a018] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-16">
      {/* Top Vendor Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-2xl sm:text-3xl tracking-tighter text-[#18201c] shrink-0"
            >
              crave<span className="text-[#86a018]">.</span>
            </Link>
            <span className="rounded-full bg-[#18201c] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#d9f447]">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#18201c] truncate">
              <Store className="size-4 text-[#86a018] shrink-0" />
              <span className="truncate max-w-[200px]">
                {user?.restaurantName || 'Your restaurant'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
            <Link
              href="/vendor/dashboard"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kitchen Orders</span>
            </Link>
            <button
              onClick={() => router.push('/vendor/menu')}
              className="rounded-2xl bg-[#18201c] text-white px-4 py-2 transition shrink-0 shadow-xs"
            >
              Menu Management
            </button>
            <Link
              href="/vendor/sales"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50"
            >
              Sales &amp; Earnings
            </Link>
            <Link
              href="/vendor/coupons"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Percent className="size-3.5 text-purple-600" />
              <span>Store Offers</span>
            </Link>
            <Link
              href="/vendor/settings"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Settings className="size-3.5 text-gray-600" />
              <span>Bank &amp; Settings</span>
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 transition shrink-0 hover:bg-rose-100 flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Menu Catalog Hero */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                Restaurant Menu Management
              </span>
              <h2 className="mt-1 text-2xl font-bold text-[#18201c]">
                {user?.restaurantName || 'Your restaurant'} Dish Catalog
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Add, edit, set pricing, or toggle live dish availability for customer orders.
              </p>
            </div>

            <button
              onClick={openAddModal}
              disabled={!restaurantId}
              className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
            >
              <Plus className="size-4 text-[#d9f447]" /> Add New Dish
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
                    ? 'bg-[#18201c] text-white border-[#18201c]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
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
              className="w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-4 text-xs font-medium outline-none focus:border-[#86a018] shadow-xs"
            />
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menuLoading ? (
            <p className="col-span-full rounded-2xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
              Loading menu from the database...
            </p>
          ) : menuError ? (
            <p
              role="alert"
              className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center text-sm text-rose-800"
            >
              {menuError}
            </p>
          ) : !restaurantId ? (
            <p className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              No restaurant is linked to this vendor account yet.
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              No menu items are stored for this restaurant yet.
            </p>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-3xl border p-4 bg-white shadow-xs flex flex-col justify-between transition ${
                  item.in_stock ? 'border-gray-200' : 'border-rose-200 bg-rose-50/20'
                }`}
              >
                <div>
                  <div className="relative h-44 w-full overflow-hidden rounded-2xl mb-3">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className={`size-full object-cover transition ${!item.in_stock ? 'grayscale opacity-75' : ''}`}
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-gray-100 text-gray-400">
                        <Utensils className="size-8" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase text-[#18201c] backdrop-blur-md shadow-xs">
                      {item.category}
                    </span>
                    {!item.in_stock && (
                      <span className="absolute inset-0 grid place-items-center bg-black/60 text-white text-xs font-extrabold uppercase tracking-wider backdrop-blur-xs">
                        Out of Stock
                      </span>
                    )}
                  </div>

                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-base text-[#18201c] leading-snug">{item.name}</h3>
                    <span className="font-bold text-base text-[#18201c] shrink-0">
                      ₹{item.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleToggleStock(item.id, item.in_stock)}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold transition border ${
                      item.in_stock
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    {item.in_stock ? 'In Stock' : 'Out of Stock'}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditModal(item)}
                      className="grid size-8 place-items-center rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      title="Edit Dish"
                    >
                      <Edit className="size-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
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
            <div className="col-span-full rounded-3xl border border-dashed border-gray-200 bg-white p-12 text-center text-gray-500">
              <Utensils className="mx-auto size-12 text-gray-300 mb-2" />
              <p className="font-bold text-base text-[#18201c]">No Dishes Found</p>
              <p className="text-xs mt-1">
                Click &apos;Add New Dish&apos; to create dishes for your kitchen menu.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">
                  {editingItem ? 'Edit Dish Details' : 'Create New Menu Item'}
                </span>
                <h3 className="text-xl font-bold text-[#18201c] mt-0.5">
                  {editingItem ? editingItem.name : 'Add Dish to Menu'}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Quinoa Harvest Bowl"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#18201c]">Category</label>
                  <select
                    value={categoryInput}
                    onChange={(e) => setCategoryInput(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                  >
                    <option value="Bowls">Bowls</option>
                    <option value="Wraps">Wraps</option>
                    <option value="Starters">Starters</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Price (₹)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={priceInput}
                    onChange={(e) =>
                      setPriceInput(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Organic quinoa topped with wild basil pesto & roasted cherry tomatoes"
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Dish Image URL</label>
                <input
                  type="url"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-mono text-[11px] outline-none focus:border-[#86a018]"
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-gray-50 p-4 border border-gray-200">
                <span className="font-bold text-[#18201c]">In-Stock Availability</span>
                <button
                  type="button"
                  onClick={() => setInStockInput(!inStockInput)}
                  className={`px-4 py-1.5 rounded-full font-bold transition ${
                    inStockInput ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                  }`}
                >
                  {inStockInput ? 'In Stock' : 'Out of Stock'}
                </button>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-full border border-gray-300 px-5 py-2.5 font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[#18201c] px-7 py-2.5 font-bold text-white shadow-md hover:bg-[#323d36] transition"
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

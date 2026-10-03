'use client'

import CraveLogo from '@/components/CraveLogo'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  ArrowRight,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

export interface GroceryItem {
  id: string
  name: string
  unit: string
  price: number
  mrp: number
  image: string
  category: string
  inStock: boolean
  restaurantId: string
  restaurantName: string
  stockCount: number
  discount?: string
}

export default function CraveXPStore() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<{ item: GroceryItem; qty: number }[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>([])
  const [stores, setStores] = useState<{ id: string; name: string; address: string }[]>([])
  const [selectedStoreId, setSelectedStoreId] = useState('')
  const [isLoadingItems, setIsLoadingItems] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [orderError, setOrderError] = useState('')

  useEffect(() => {
    const loadStores = async () => {
      let activeStores: { id: string; name: string; address: string }[] = []

      // 1. Fetch craveXP vendor stores from vendors table
      const { data: vendorData } = await supabase
        .from('vendors')
        .select('id, storeName, address, isOpen')
        .eq('status', 'ACTIVE')

      if (vendorData && vendorData.length > 0) {
        activeStores = vendorData.map((v) => ({
          id: v.id,
          name: v.storeName || 'craveXP Store',
          address: v.address || 'Bengaluru Central Hub',
        }))
      } else {
        // Fallback check in restaurants table
        const { data: restData } = await supabase.from('restaurants').select('id, name, address')
        if (restData && restData.length > 0) {
          activeStores = restData.map((r) => ({
            id: r.id,
            name: r.name,
            address: r.address || '',
          }))
        }
      }

      if (activeStores.length === 0) {
        activeStores = [
          {
            id: 'cmur2n46c000lg1dkpbvcyg83',
            name: 'craveXP Store #01 - Kanakapura Hub',
            address: '104 Market Street, Koramangala 4th Block, Bengaluru',
          },
        ]
      }

      setStores(activeStores)
      setSelectedStoreId((current) =>
        activeStores.some((store) => store.id === current) ? current : activeStores[0].id
      )
    }

    loadStores()
  }, [])

  useEffect(() => {
    const loadItems = async () => {
      setIsLoadingItems(true)
      setLoadError('')
      if (!selectedStoreId) {
        setGroceryItems([])
        setIsLoadingItems(false)
        return
      }

      const store = stores.find((entry) => entry.id === selectedStoreId)
      const storeName = store?.name ?? 'craveXP Store'

      // Fetch active inventory products from products table
      const { data: prodData, error: prodErr } = await supabase.from('products').select('*')

      let itemsList: GroceryItem[] = []

      if (!prodErr && prodData && prodData.length > 0) {
        itemsList = prodData.map((item: any) => {
          const cat = item.description ? item.description.split(' · ')[0] : 'Dairy & Eggs'
          const unit = item.description ? item.description.split(' · ')[1] || '1 Pack' : '1 Pack'
          const mrp = Number(item.comparePrice ?? item.price)
          const price = Number(item.price)

          return {
            id: item.id,
            name: item.name,
            unit: unit,
            price: price,
            mrp: mrp,
            image:
              item.imageUrl ?? 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500',
            category: cat || 'Dairy & Eggs',
            inStock: item.status !== 'OUT_OF_STOCK',
            restaurantId: item.vendorId || selectedStoreId,
            restaurantName: storeName,
            stockCount: item.status !== 'OUT_OF_STOCK' ? 50 : 0,
            skuCode: item.sku || item.id,
            discount: mrp > price ? `${Math.round(((mrp - price) / mrp) * 100)}% OFF` : undefined,
          }
        })
      } else {
        // Fallback to menu_items table
        const { data: menuData } = await supabase.from('menu_items').select('*').order('name')
        if (menuData) {
          itemsList = menuData.map((item: any) => ({
            id: item.id,
            name: item.name,
            unit: item.unit ?? '',
            price: Number(item.price),
            mrp: Number(item.mrp ?? item.price),
            image: item.image ?? '',
            category: item.category || 'Dairy & Eggs',
            inStock: Boolean(item.in_stock),
            restaurantId: item.restaurant_id || selectedStoreId,
            restaurantName: storeName,
            stockCount: Number(item.stock_count ?? 0),
            skuCode: item.sku_code ?? item.id,
            discount:
              Number(item.mrp) > Number(item.price)
                ? `${Math.round((1 - Number(item.price) / Number(item.mrp)) * 100)}% OFF`
                : undefined,
          }))
        }
      }

      setGroceryItems(itemsList)
      setIsLoadingItems(false)
    }

    loadItems()
    const poll = setInterval(loadItems, 3000)
    return () => clearInterval(poll)
  }, [selectedStoreId, stores])

  const filteredItems = useMemo(() => {
    return groceryItems.filter((i) => {
      const matchesCat = selectedCategory === 'All Items' || i.category === selectedCategory
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [groceryItems, selectedCategory, searchQuery])

  const categories = useMemo(
    () => ['All Items', ...new Set(groceryItems.map((item) => item.category))],
    [groceryItems]
  )

  const cartTotalItems = useMemo(() => cart.reduce((sum, c) => sum + c.qty, 0), [cart])

  const cartSubtotal = useMemo(() => cart.reduce((sum, c) => sum + c.item.price * c.qty, 0), [cart])

  const grandTotal = cartSubtotal

  const getItemQty = (id: string) => {
    return cart.find((c) => c.item.id === id)?.qty || 0
  }

  const updateItemQty = (item: GroceryItem, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id)
      if (!existing) {
        if (
          delta > 0 &&
          item.stockCount > 0 &&
          (!prev.length || prev[0].item.restaurantId === item.restaurantId)
        ) {
          return [...prev, { item, qty: 1 }]
        }
        return prev
      }
      const newQty = existing.qty + delta
      if (newQty <= 0) {
        return prev.filter((c) => c.item.id !== item.id)
      }
      if (newQty > item.stockCount) return prev
      return prev.map((c) => (c.item.id === item.id ? { ...c, qty: newQty } : c))
    })
  }

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return
    setOrderError('')
    if (!user?.id) {
      setOrderError('Sign in with a customer account before placing an order.')
      return
    }
    const store = stores.find((entry) => entry.id === cart[0].item.restaurantId)
    if (!store || cart.some(({ item }) => item.restaurantId !== store.id)) {
      setOrderError('All items in an order must come from the same store.')
      return
    }

    setOrderPlaced(true)
    const orderId = crypto.randomUUID()
    const itemsFormatted = cart.map((c) => ({
      name: c.item.name,
      qty: c.qty,
      price: c.item.price,
      menu_item_id: c.item.id,
    }))

    try {
      const { error } = await supabase.from('orders').insert([
        {
          id: orderId,
          customer_id: user.id,
          customer_name: user.name,
          customer_phone: user.phone || null,
          customer_address: user.address || null,
          restaurant_id: store.id,
          restaurant_name: store.name,
          items: JSON.stringify(itemsFormatted),
          subtotal: cartSubtotal,
          packaging_fee: 0,
          gst: 0,
          total_amount: grandTotal,
          status: 'new',
          driver_name: null,
          driver_phone: null,
          payment_method: 'Cash on delivery',
        },
      ])
      if (error) throw error
    } catch (error) {
      console.error('Failed to submit craveXP order:', error)
      setOrderError('The order could not be saved. Please try again.')
      setOrderPlaced(false)
      return
    }

    setTimeout(() => {
      setCart([])
      setOrderPlaced(false)
      setShowCartDrawer(false)
      router.push('/user/track')
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] text-[#18201c] pb-24">
      {/* Top Header Banner for craveXP Instamart */}
      <header className="sticky top-0 z-40 border-b border-[#e5e9e0] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/user/explore" className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-[#d9f447] font-extrabold text-[#18201c] shadow-sm">
                <Zap className="size-5 fill-current" />
              </span>
              <div className="flex items-center gap-2">
                <CraveLogo variant="cravexp" size="lg" />
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                  Live inventory
                </span>
              </div>
            </Link>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-[#5a665f]">
            <MapPin className="size-4 text-emerald-600" />
            <span className="max-w-48 truncate">
              {stores.find((store) => store.id === selectedStoreId)?.address || 'No active store'}
            </span>
          </div>

          <button
            onClick={() => setShowCartDrawer(true)}
            className="relative flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323f37] transition"
          >
            <ShoppingCart className="size-4 text-[#d9f447]" />
            <span>{cartTotalItems} items</span>
            {cartSubtotal > 0 && <span className="text-[#d9f447]">· ₹{grandTotal}</span>}
          </button>
        </div>

        {/* Search Bar */}
        <div className="mx-auto max-w-[1240px] px-4 pb-3 sm:px-6">
          <div className="relative flex items-center rounded-2xl border-2 border-[#e2e7dc] bg-[#f8f9f6] px-3.5 py-2.5 shadow-sm focus-within:border-emerald-600">
            <Search className="size-4 text-gray-500 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search live products..."
              className="w-full bg-transparent text-xs font-medium outline-none placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-gray-400 hover:text-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Banner for craveXP */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#121815] via-[#1a2520] to-[#121815] p-6 sm:p-8 text-white shadow-xl border-2 border-emerald-500/30">
          <div className="relative z-10 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-[#d9f447] mb-2">
              <Zap className="size-4 text-[#d9f447]" /> Store inventory
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              crave<span className="text-[#d9f447]">XP</span> Grocery Store
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-300">
              Browse and order products currently available in active stores.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-bold text-emerald-300">
              <span className="flex items-center gap-1">
                <Store className="size-4" /> {stores.length} active stores
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Bar */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        {stores.length > 1 && (
          <label className="mb-4 flex items-center gap-3 text-xs font-bold text-gray-700">
            Store
            <select
              value={selectedStoreId}
              onChange={(event) => {
                setCart([])
                setSelectedStoreId(event.target.value)
              }}
              className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs"
            >
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-2xl px-4 py-2 text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-[#18201c] text-[#d9f447] shadow-md'
                  : 'bg-white text-[#525f57] border border-[#e2e7dc] hover:bg-[#f0f3eb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Instamart Items Grid */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-[#18201c]">
            {selectedCategory === 'All Items' ? 'Available Products' : selectedCategory} (
            {filteredItems.length})
          </h2>
          <span className="text-xs text-gray-500 font-semibold">Live store inventory</span>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {isLoadingItems ? (
            <p className="col-span-full py-12 text-center text-sm text-gray-500">
              Loading live inventory...
            </p>
          ) : loadError ? (
            <p
              role="alert"
              className="col-span-full rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-800"
            >
              {loadError}
            </p>
          ) : filteredItems.length === 0 ? (
            <p className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
              {stores.length === 0
                ? 'No active grocery stores are available.'
                : 'No matching in-stock products are available.'}
            </p>
          ) : (
            filteredItems.map((item) => {
              const qty = getItemQty(item.id)
              return (
                <div
                  key={item.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-3.5 shadow-xs transition hover:border-emerald-500 hover:shadow-lg"
                >
                  <div>
                    <div className="relative h-32 w-full overflow-hidden rounded-xl bg-gray-50">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div className="grid size-full place-items-center text-gray-400">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}
                      {item.discount && (
                        <span className="absolute top-2 left-2 rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-extrabold text-white">
                          {item.discount}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                      {item.unit}
                    </p>
                    <h3 className="mt-0.5 text-xs font-bold text-[#18201c] line-clamp-2 leading-snug">
                      {item.name}
                    </h3>
                  </div>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-[#f0f4eb]">
                    <div>
                      <span className="text-xs font-extrabold text-[#18201c]">₹{item.price}</span>
                      {item.mrp > item.price && (
                        <span className="ml-1 text-[10px] text-gray-400 line-through font-normal">
                          ₹{item.mrp}
                        </span>
                      )}
                    </div>

                    {qty === 0 ? (
                      <button
                        onClick={() => updateItemQty(item, 1)}
                        className="flex items-center gap-1 rounded-xl border-2 border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-800 hover:bg-emerald-600 hover:text-white transition"
                      >
                        <Plus className="size-3.5" /> ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 rounded-xl bg-emerald-600 px-2 py-1 text-xs font-bold text-white shadow">
                        <button onClick={() => updateItemQty(item, -1)}>
                          <Minus className="size-3" />
                        </button>
                        <span>{qty}</span>
                        <button onClick={() => updateItemQty(item, 1)}>
                          <Plus className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-gray-200 p-4">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-emerald-600" />
                <h2 className="text-base font-bold text-[#18201c]">
                  craveXP Cart ({cartTotalItems} items)
                </h2>
              </div>
              <button
                onClick={() => setShowCartDrawer(false)}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {cart.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="mx-auto size-12 text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-700">Your craveXP cart is empty</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Add products from the current store inventory.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-900 flex items-center justify-between">
                    <span>{cart[0]?.item.restaurantName}</span>
                    <span className="text-emerald-700">Pay on delivery</span>
                  </div>

                  {cart.map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="size-12 rounded-xl object-cover"
                          />
                        ) : (
                          <span className="grid size-12 place-items-center rounded-xl bg-gray-100 text-gray-400">
                            <ShoppingBag className="size-5" />
                          </span>
                        )}
                        <div>
                          <p className="text-xs font-bold text-[#18201c] line-clamp-1">
                            {item.name}
                          </p>
                          <p className="text-[10px] text-gray-500">{item.unit}</p>
                          <p className="text-xs font-extrabold text-[#18201c] mt-0.5">
                            ₹{item.price * qty}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-2 py-1 text-xs font-bold text-[#18201c]">
                        <button onClick={() => updateItemQty(item, -1)}>
                          <Minus className="size-3" />
                        </button>
                        <span>{qty}</span>
                        <button onClick={() => updateItemQty(item, 1)}>
                          <Plus className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Bill Summary */}
                  <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-xs font-medium text-gray-600 flex flex-col gap-2">
                    <div className="flex justify-between">
                      <span>Item Total</span>
                      <span className="font-bold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-extrabold text-[#18201c]">
                      <span>To Pay</span>
                      <span className="text-emerald-700">₹{grandTotal}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-gray-200 p-4">
                {orderError && (
                  <p role="alert" className="mb-3 text-xs text-rose-700">
                    {orderError}
                  </p>
                )}
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderPlaced}
                  className="w-full rounded-2xl bg-[#18201c] py-3.5 text-xs font-extrabold text-[#d9f447] shadow-xl hover:bg-[#323f37] transition flex items-center justify-center gap-2"
                >
                  {orderPlaced ? (
                    <span>Saving order...</span>
                  ) : (
                    <>
                      <span>Place Order · Pay on Delivery · ₹{grandTotal}</span>
                      <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

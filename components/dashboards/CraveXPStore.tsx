'use client'

import CraveLogo from '@/components/CraveLogo'
import { useCart } from '@/lib/cart-context'
import {
  Apple,
  ArrowRight,
  Coffee,
  Cookie,
  Layers,
  MapPin,
  Milk,
  Minus,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Wheat,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  ensureCraveXPDarkStore,
  fetchCraveXPGroceryItems,
  CraveXPGroceryItem,
} from '@/lib/cravexp-grocery-catalog'

export type GroceryItem = CraveXPGroceryItem

const CATEGORY_ITEMS = [
  { id: 'All Items', name: 'All Items', icon: Layers },
  { id: 'Dairy & Eggs', name: 'Dairy & Eggs', icon: Milk },
  { id: 'Fruits & Vegetables', name: 'Fruits & Vegetables', icon: Apple },
  { id: 'Cold Drinks & Juices', name: 'Cold Drinks & Juices', icon: Coffee },
  { id: 'Munchies & Snacks', name: 'Snacks & Munchies', icon: Cookie },
  { id: 'Staples & Atta', name: 'Staples & Atta', icon: Wheat },
  { id: 'Bakery & Breakfast', name: 'Bakery & Breakfast', icon: Package },
  { id: 'Cleaning & Household', name: 'Cleaning & Household', icon: ShieldCheck },
]

import { useWebSocket } from '@/lib/websocket'

export default function CraveXPStore() {
  const {
    items: globalCartItems,
    addItem,
    updateItemQty: updateGlobalQty,
    totalCount: cartTotalItems,
  } = useCart()
  const router = useRouter()
  const [selectedCategory, setSelectedCategory] = useState('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [groceryItems, setGroceryItems] = useState<CraveXPGroceryItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  useEffect(() => {
    ensureCraveXPDarkStore()
  }, [])

  const loadCatalog = async () => {
    setIsLoadingItems(true)
    const items = await fetchCraveXPGroceryItems()
    setGroceryItems(items)
    setIsLoadingItems(false)
  }

  // Initial fetch on mount
  useEffect(() => {
    loadCatalog()
  }, [])

  // Live WebSocket broadcast updates - instant live sync on catalog/order events
  useWebSocket({
    channels: ['catalog_update', 'order_update'],
    onMessage: (msg) => {
      if (msg.channel === 'catalog_update' || msg.channel === 'order_update') {
        loadCatalog()
      }
    },
  })

  const filteredItems = useMemo(() => {
    return groceryItems.filter((i) => {
      const matchesCat = selectedCategory === 'All Items' || i.category === selectedCategory
      const matchesSearch =
        i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesCat && matchesSearch
    })
  }, [groceryItems, selectedCategory, searchQuery])

  const cartSubtotal = useMemo(
    () => globalCartItems.reduce((sum, c) => sum + c.price * c.qty, 0),
    [globalCartItems]
  )

  const getItemQty = (id: string) => {
    return globalCartItems.find((c) => c.id === id)?.qty || 0
  }

  const updateItemQty = (item: CraveXPGroceryItem, delta: number) => {
    const currentQty = getItemQty(item.id)
    if (currentQty === 0 && delta > 0) {
      addItem({
        id: item.id,
        name: item.name,
        price: item.price,
        qty: 1,
        image: item.image,
        detail: item.unit,
        restaurantName: CRAVEXP_DARK_STORE_INFO.name,
        restaurantId: CRAVEXP_DARK_STORE_ID,
        vendorId: CRAVEXP_DARK_STORE_ID,
      })
    } else {
      updateGlobalQty(item.id, delta)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f5] dark:bg-[#121815] text-[#18201c] dark:text-white pb-32 sm:pb-36 transition-colors duration-200">
      {/* RESTORED CRAVEXP HERO BANNER CARD (Ultra-Premium Obsidian Glassmorphism) */}
      <section className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c120f] via-[#131d17] to-[#090d0b] p-6 sm:p-8 lg:p-9 text-white shadow-2xl border border-white/[0.12]">
          {/* Luxury Ambient Lighting Glows */}
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-[#d9f447]/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-30" />

          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
                <CraveLogo variant="cravexp" size="lg" theme="light" />
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/70 border border-emerald-500/30 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 backdrop-blur-md">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>10-Min Dark Store Hub</span>
                </div>
              </div>
              <h1 className="text-2xl font-black sm:text-3xl text-white tracking-tight">
                Ultra-fast Grocery &amp; Daily Essentials
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-300 max-w-xl font-normal leading-relaxed">
                Sourced directly from our CraveXP 10 Store hub. Delivered fresh to your doorstep in 10 minutes.
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs font-bold text-[#d9f447]">
                <MapPin className="size-4 text-[#d9f447] shrink-0" />
                <span>{CRAVEXP_DARK_STORE_INFO.address}</span>
              </div>
            </div>

            {/* Cart Trigger Card */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push('/user/cart')}
                className="flex items-center gap-2.5 rounded-2xl bg-[#d9f447] hover:bg-[#cbf026] px-6 py-3.5 text-xs font-black text-[#0d1410] shadow-xl shadow-[#d9f447]/20 hover:shadow-[#d9f447]/35 ring-1 ring-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                <ShoppingCart className="size-4" />
                <span>{cartTotalItems} items</span>
                {cartSubtotal > 0 && <span>· ₹{cartSubtotal}</span>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR & CATEGORY BAR CONTAINER */}
      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        {/* Search Bar */}
        <div className="relative flex items-center rounded-2xl border-2 border-[#e2e7dc] bg-white px-4 py-3 shadow-sm focus-within:border-[#d9f447]">
          <Search className="size-4 text-gray-400 mr-2.5 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products in CraveXP 10 Store..."
            className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-gray-400"
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

        {/* Category Pills Bar (Pure Vector Lucide Icons - ZERO Emojis) */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {CATEGORY_ITEMS.map((cat) => {
            const Icon = cat.icon
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition shrink-0 ${
                  isActive
                    ? 'bg-[#18201c] text-[#d9f447] shadow-md'
                    : 'bg-white text-[#18201c] border border-[#e2e7dc] hover:bg-gray-50'
                }`}
              >
                <Icon className={`size-4 ${isActive ? 'text-[#d9f447]' : 'text-gray-500'}`} />
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* PRODUCT GRID */}
      <main className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-[#18201c]">
            {selectedCategory} ({filteredItems.length})
          </h2>
          <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
            <Zap className="size-3.5 text-emerald-600 fill-emerald-600" /> Live Inventory
          </span>
        </div>

        {isLoadingItems ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div key={n} className="h-64 rounded-3xl bg-gray-200 animate-pulse" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center border border-[#e2e7dc] shadow-sm">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-100 text-amber-600 mb-3">
              <Package className="size-6" />
            </div>
            <h4 className="text-base font-bold text-[#18201c]">
              No products found in CraveXP 10 Store
            </h4>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Products are added dynamically through the craveXP Hub Operator Console (
              <code className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                /vendor/crave-ep
              </code>
              ). Log in with a vendor account to add inventory.
            </p>
            <div className="mt-5">
              <Link
                href="/vendor/crave-ep"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323f37] transition"
              >
                <span>Go to craveXP Hub Console</span>
                <ArrowRight className="size-4 text-[#d9f447]" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {filteredItems.map((item) => {
              const qty = getItemQty(item.id)
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between rounded-3xl bg-white p-4 shadow-sm border border-[#e2e7dc] transition hover:shadow-md"
                >
                  {/* Badges: 10 MINS & Discount */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-800 tracking-wider">
                      <Zap className="size-2.5 fill-current text-emerald-600" /> 10 MINS
                    </span>
                    {item.discount && (
                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black uppercase text-white">
                        {item.discount}
                      </span>
                    )}
                  </div>

                  {/* Product Image */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-50 mb-2">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {/* Unit Tag */}
                  <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                    {item.unit}
                  </span>

                  {/* Product Title */}
                  <h3 className="mt-0.5 text-xs font-bold text-[#18201c] line-clamp-2 leading-snug min-h-[32px]">
                    {item.name}
                  </h3>

                  {/* Pricing & Stepper Button */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                    <div>
                      {item.mrp > item.price && (
                        <span className="block text-[10px] text-gray-400 line-through leading-none">
                          ₹{item.mrp}
                        </span>
                      )}
                      <span className="text-sm font-black text-[#18201c]">₹{item.price}</span>
                    </div>

                    {qty === 0 ? (
                      <button
                        onClick={() => updateItemQty(item, 1)}
                        className="rounded-xl border-2 border-[#18201c] bg-white px-3 py-1 text-xs font-black text-[#18201c] shadow-xs hover:bg-[#18201c] hover:text-[#d9f447] transition"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#18201c] px-2 py-1 text-[#d9f447] shadow-xs">
                        <button
                          onClick={() => updateItemQty(item, -1)}
                          className="p-0.5 hover:bg-white/20 rounded-md"
                        >
                          <Minus className="size-3" />
                        </button>
                        <span className="text-xs font-black px-1 text-white">{qty}</span>
                        <button
                          onClick={() => updateItemQty(item, 1)}
                          className="p-0.5 hover:bg-white/20 rounded-md"
                        >
                          <Plus className="size-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* CRAVEXP FLOATING CART BAR (Bottom of Screen) */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 mx-auto max-w-xl">
          <div className="flex items-center justify-between rounded-2xl bg-[#18201c] p-3 text-white shadow-2xl border border-[#2d3b32] animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500 text-white">
                <ShoppingBag className="size-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {cartTotalItems} {cartTotalItems === 1 ? 'ITEM' : 'ITEMS'} ADDED
                </p>
                <p className="text-sm font-extrabold text-white">₹{cartSubtotal}</p>
              </div>
            </div>

            <button
              onClick={() => router.push('/user/cart')}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-600 transition"
            >
              <span>View Cart</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

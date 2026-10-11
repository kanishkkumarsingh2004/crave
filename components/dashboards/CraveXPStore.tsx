'use client'

import CraveLogo from '@/components/CraveLogo'
import { useCart } from '@/lib/cart-context'
import {
  Apple,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Cookie,
  Flame,
  Layers,
  MapPin,
  Milk,
  Minus,
  Package,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Wheat,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useMemo, useState } from 'react'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  ensureCraveXPDarkStore,
  fetchCraveXPGroceryItems,
  CraveXPGroceryItem,
} from '@/lib/cravexp-grocery-catalog'
import { useWebSocket } from '@/lib/websocket'

export type GroceryItem = CraveXPGroceryItem

/** Map arbitrary category string to a modern Lucide vector icon */
function getCategoryIcon(category: string): React.ElementType {
  const c = (category || '').toLowerCase()
  if (c.includes('dairy') || c.includes('milk') || c.includes('egg') || c.includes('butter') || c.includes('cheese')) {
    return Milk
  }
  if (c.includes('fruit') || c.includes('veggie') || c.includes('vegetable') || c.includes('fresh')) {
    return Apple
  }
  if (c.includes('snack') || c.includes('munch') || c.includes('biscuit') || c.includes('chips')) {
    return Cookie
  }
  if (c.includes('drink') || c.includes('juice') || c.includes('beverage') || c.includes('coffee') || c.includes('tea') || c.includes('soda')) {
    return Coffee
  }
  if (c.includes('bakery') || c.includes('bread') || c.includes('cake') || c.includes('toast') || c.includes('breakfast')) {
    return Wheat
  }
  if (c.includes('instant') || c.includes('staple') || c.includes('atta') || c.includes('rice') || c.includes('dal') || c.includes('oil')) {
    return Package
  }
  if (c.includes('clean') || c.includes('household') || c.includes('care') || c.includes('wash')) {
    return ShieldCheck
  }
  return Sparkles
}

export default function CraveXPStore() {
  const {
    items: globalCartItems,
    addItem,
    updateItemQty: updateGlobalQty,
    totalCount: cartTotalItems,
  } = useCart()
  const router = useRouter()

  const [selectedCategory, setSelectedCategory] = useState<string>('All Items')
  const [searchQuery, setSearchQuery] = useState('')
  const [inStockOnly, setInStockOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'discount'>('featured')
  const [groceryItems, setGroceryItems] = useState<CraveXPGroceryItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Ensure store record exists in database
  useEffect(() => {
    ensureCraveXPDarkStore()
  }, [])

  // Load catalog directly from PostgreSQL database
  const loadCatalog = async () => {
    try {
      setIsLoadingItems(true)
      const items = await fetchCraveXPGroceryItems()
      setGroceryItems(items)
    } catch (err) {
      console.error('Failed to load CraveXP catalog:', err)
    } finally {
      setIsLoadingItems(false)
    }
  }

  // Initial load
  useEffect(() => {
    loadCatalog()
  }, [])

  // Live real-time WebSocket sync: listen for vendor console & database catalog updates
  useWebSocket({
    channels: ['catalog_update', 'order_update', 'menu_items'],
    onMessage: (msg) => {
      if (
        msg.channel === 'catalog_update' ||
        msg.channel === 'order_update' ||
        msg.channel === 'menu_items'
      ) {
        loadCatalog()
      }
    },
  })

  // Dynamically extract categories from loaded DB items (zero mismatches)
  const categories = useMemo(() => {
    const set = new Set<string>()
    groceryItems.forEach((i) => {
      if (i.category && i.category.trim()) {
        set.add(i.category.trim())
      }
    })
    const distinct = Array.from(set).sort()

    return [
      {
        id: 'All Items',
        name: 'All Items',
        icon: Layers,
        count: groceryItems.length,
      },
      ...distinct.map((catName) => ({
        id: catName,
        name: catName,
        icon: getCategoryIcon(catName),
        count: groceryItems.filter(
          (i) => i.category?.trim().toLowerCase() === catName.toLowerCase()
        ).length,
      })),
    ]
  }, [groceryItems])

  // Filter & sort items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    let result = groceryItems.filter((i) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'All Items' ||
        (i.category && i.category.trim().toLowerCase() === selectedCategory.toLowerCase())

      // Search query filter
      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.unit && i.unit.toLowerCase().includes(q)) ||
        (i.skuCode && i.skuCode.toLowerCase().includes(q))

      // In stock filter
      const matchesStock = !inStockOnly || i.inStock

      return matchesCategory && matchesSearch && matchesStock
    })

    // Sorting
    if (sortBy === 'price_low') {
      result = [...result].sort((a, b) => a.price - b.price)
    } else if (sortBy === 'price_high') {
      result = [...result].sort((a, b) => b.price - a.price)
    } else if (sortBy === 'discount') {
      result = [...result].sort((a, b) => {
        const discA = a.mrp > a.price ? (a.mrp - a.price) / a.mrp : 0
        const discB = b.mrp > b.price ? (b.mrp - b.price) / b.mrp : 0
        return discB - discA
      })
    }

    return result
  }, [groceryItems, selectedCategory, searchQuery, inStockOnly, sortBy])

  // Subtotal in cart
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
    <div className="min-h-screen bg-[#f7f8f5] dark:bg-[#0c100e] text-[#18201c] dark:text-white pb-36 transition-colors duration-200">
      {/* ULTRA-PREMIUM CRAVEXP OBSIDIAN HERO SECTION */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#0a0f0d] via-[#121a15] to-[#070b09] p-4 sm:p-7 lg:p-9 text-white shadow-2xl border border-white/10">
          {/* Ambient Lighting & Mesh Glows */}
          <div className="absolute -right-24 -top-24 size-80 rounded-full bg-[#d9f447]/15 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 size-72 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40" />

          <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 mb-2 sm:mb-2.5">
                <CraveLogo variant="cravexp" size="lg" theme="light" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wider text-emerald-400 uppercase shadow-xs">
                  <span className="size-1.5 sm:size-2 rounded-full bg-emerald-400 animate-pulse" />
                  10-MIN DISPATCH
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#d9f447]/10 border border-[#d9f447]/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#d9f447]">
                  <Flame className="size-3 text-[#d9f447]" />
                  Live Store
                </span>
              </div>

              <h1 className="text-xl xs:text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight leading-tight">
                Fresh Groceries &amp; Daily Essentials in 10 Minutes
              </h1>
              <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-gray-300 max-w-xl font-normal leading-relaxed">
                Direct fulfillment from our automated micro-warehouse. Chilled, packed, and delivered to your doorstep.
              </p>

              {/* Dark Store Hub Location Pill */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] sm:text-xs font-semibold text-gray-300">
                  <MapPin className="size-3 sm:size-3.5 text-[#d9f447] shrink-0" />
                  <span className="truncate max-w-[240px] sm:max-w-none">
                    {CRAVEXP_DARK_STORE_INFO.address}
                  </span>
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-xl border border-emerald-500/20">
                  <CheckCircle2 className="size-3" />
                  Verified Hub
                </div>
              </div>

              {/* Service Badges */}
              <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 pt-2.5 border-t border-white/10 text-gray-300 text-[10px] sm:text-xs font-bold">
                <div className="flex items-center gap-1">
                  <Zap className="size-3 sm:size-3.5 text-[#d9f447] shrink-0" />
                  <span>~3.8m Dispatch</span>
                </div>
                <div className="flex items-center gap-1">
                  <ShieldCheck className="size-3 sm:size-3.5 text-emerald-400 shrink-0" />
                  <span>100% Cold-Chain</span>
                </div>
                <div className="flex items-center gap-1">
                  <Package className="size-3 sm:size-3.5 text-[#d9f447] shrink-0" />
                  <span>Tamper Proof</span>
                </div>
              </div>
            </div>

            {/* Right Card: Quick Cart / Inventory Status (Desktop only to save mobile height) */}
            <div className="hidden lg:flex flex-col items-stretch gap-3 shrink-0 min-w-[220px]">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                  LIVE CATALOG
                </span>
                <p className="text-2xl font-black text-[#d9f447] mt-0.5">
                  {groceryItems.length} {groceryItems.length === 1 ? 'Product' : 'Products'}
                </p>
                <p className="text-[11px] text-gray-300 mt-0.5 flex items-center justify-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400" />
                  PostgreSQL Real-time
                </p>
              </div>

              <button
                onClick={() => router.push('/user/cart')}
                className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#d9f447] hover:bg-[#cbf026] px-6 py-3.5 text-xs font-black text-[#0d1410] shadow-xl shadow-[#d9f447]/20 hover:shadow-[#d9f447]/35 ring-1 ring-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <ShoppingCart className="size-4" />
                <span>{cartTotalItems} {cartTotalItems === 1 ? 'Item' : 'Items'}</span>
                {cartSubtotal > 0 && <span className="font-extrabold">· ₹{cartSubtotal}</span>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH, SORT & FILTER BAR */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-6 pt-3 sm:pt-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          {/* Instant Search Bar */}
          <div className="relative flex-1 flex items-center rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#141b17] px-3.5 py-2.5 sm:py-3 shadow-xs focus-within:border-[#86a018] dark:focus-within:border-[#d9f447] transition">
            <Search className="size-4 text-gray-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search milk, bread, eggs, apples, essentials..."
              className="w-full bg-transparent text-xs font-bold outline-none placeholder:text-gray-400 text-[#18201c] dark:text-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="grid size-5 place-items-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 hover:text-gray-700 dark:hover:text-white transition cursor-pointer"
                title="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Quick Filters - Clean single row on mobile */}
          <div className="flex items-center gap-2 shrink-0">
            {/* In-Stock Toggle */}
            <button
              onClick={() => setInStockOnly((v) => !v)}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 sm:py-3 text-xs font-bold border transition cursor-pointer ${
                inStockOnly
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'bg-white dark:bg-[#141b17] border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5'
              }`}
            >
              <Check className={`size-3.5 ${inStockOnly ? 'text-emerald-600' : 'text-gray-400'}`} />
              <span>In Stock</span>
            </button>

            {/* Sort Dropdown */}
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort products"
                className="w-full appearance-none rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#141b17] px-3.5 py-2.5 sm:py-3 pr-7 text-xs font-bold text-gray-700 dark:text-gray-300 outline-none hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="discount">Biggest Discount</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-gray-400" />
            </div>
          </div>
        </div>

        {/* DYNAMIC CATEGORY PILLS BAR (Synced with DB Categories) */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] shadow-md shadow-black/10'
                    : 'bg-white dark:bg-[#141b17] text-[#18201c] dark:text-gray-300 border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`size-3.5 ${
                    isActive
                      ? 'text-[#d9f447] dark:text-[#18201c]'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                />
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                    isActive
                      ? 'bg-white/20 dark:bg-black/20 text-inherit'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* PRODUCT GRID CONTAINER */}
      <main className="mx-auto max-w-[1240px] px-3 sm:px-6 pt-6 pb-28 sm:pb-24">
        {/* Header row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#18201c] dark:text-white">
              {selectedCategory}
            </h2>
            <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 text-xs font-bold text-gray-600 dark:text-gray-300">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Zap className="size-3.5 text-emerald-600 fill-emerald-600" />
              Direct DB Inventory
            </span>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoadingItems ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-72 rounded-3xl bg-gray-200/70 dark:bg-white/5 animate-pulse border border-gray-200/60 dark:border-white/5"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* EMPTY / NO ITEMS STATE (NEVER SHOW MOCK ITEMS) */
          <div className="rounded-3xl bg-white dark:bg-[#141b17] p-8 sm:p-14 text-center border border-gray-200/80 dark:border-white/10 shadow-sm">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#d9f447]/20 text-[#18201c] dark:text-[#d9f447] mb-4 shadow-xs">
              <Sparkles className="size-8 text-[#86a018] dark:text-[#d9f447]" />
            </div>

            {searchQuery ? (
              <>
                <h3 className="text-lg sm:text-xl font-black text-[#18201c] dark:text-white">
                  No products found for &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Try searching for a different product or clear your search to explore all available dark store items.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-black text-white dark:text-[#18201c] shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Clear Search Filter</span>
                  </button>
                </div>
              </>
            ) : groceryItems.length === 0 ? (
              <>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2.5">
                  <span className="size-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Shelves Restocking In Progress</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-[#18201c] dark:text-white">
                  Fresh Inventory Arriving Shortly
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-2 max-w-md mx-auto leading-relaxed">
                  Our Kanakapura Road fulfillment center is actively restocking daily essentials and fresh groceries directly to the live database catalog.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/user/explore"
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-black text-white dark:text-[#18201c] shadow-md hover:scale-[1.02] active:scale-[0.98] transition"
                  >
                    <span>Explore Kitchens &amp; Food</span>
                    <ArrowRight className="size-4" />
                  </Link>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg sm:text-xl font-black text-[#18201c] dark:text-white">
                  No items in &ldquo;{selectedCategory}&rdquo;
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2 max-w-md mx-auto leading-relaxed">
                  We are restocking this section. Switch to another category or browse all available products.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setSelectedCategory('All Items')}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-black text-white dark:text-[#18201c] shadow-md hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  >
                    <span>View All {groceryItems.length} Items</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* REDESIGNED PRODUCT GRID */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {filteredItems.map((item) => {
              const qty = getItemQty(item.id)
              const hasDiscount = item.mrp > item.price

              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col justify-between rounded-3xl bg-white dark:bg-[#141b17] p-3.5 sm:p-4 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 border border-gray-200/80 dark:border-white/10 hover:border-[#86a018]/50 dark:hover:border-[#d9f447]/40"
                >
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                      <Zap className="size-2.5 fill-current text-emerald-600 dark:text-emerald-400" />
                      10 MINS
                    </span>
                    {item.discount ? (
                      <span className="rounded-full bg-[#d9f447] px-2 py-0.5 text-[9px] font-black uppercase text-[#18201c] shadow-xs">
                        {item.discount}
                      </span>
                    ) : hasDiscount ? (
                      <span className="rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 px-2 py-0.5 text-[9px] font-black uppercase">
                        Save ₹{item.mrp - item.price}
                      </span>
                    ) : null}
                  </div>

                  {/* Product Image Container */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-[#1a221e] mb-2.5">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback image if broken
                        const target = e.target as HTMLImageElement
                        target.src =
                          'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'
                      }}
                    />
                  </div>

                  {/* Product Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-400 uppercase tracking-wider truncate">
                        {item.unit}
                      </span>
                      {item.category && (
                        <>
                          <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                          <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-400 truncate">
                            {item.category}
                          </span>
                        </>
                      )}
                    </div>

                    <h3 className="mt-1 text-xs sm:text-sm font-bold text-[#18201c] dark:text-white line-clamp-2 leading-snug min-h-[34px]">
                      {item.name}
                    </h3>
                  </div>

                  {/* Pricing & Add/Stepper Button Row */}
                  <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-gray-100 dark:border-white/10">
                    <div>
                      {hasDiscount && (
                        <span className="block text-[10px] text-gray-400 line-through leading-none mb-0.5">
                          ₹{item.mrp}
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-black text-[#18201c] dark:text-white">
                        ₹{item.price}
                      </span>
                    </div>

                    {qty === 0 ? (
                      <button
                        onClick={() => updateItemQty(item, 1)}
                        className="rounded-xl border-2 border-[#18201c] dark:border-[#d9f447] bg-white dark:bg-[#141b17] px-3.5 py-1.5 text-xs font-black text-[#18201c] dark:text-[#d9f447] shadow-xs hover:bg-[#18201c] hover:text-[#d9f447] dark:hover:bg-[#d9f447] dark:hover:text-[#18201c] active:scale-95 transition-all duration-150 cursor-pointer"
                      >
                        + ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-2 py-1 text-[#d9f447] dark:text-[#18201c] shadow-md">
                        <button
                          onClick={() => updateItemQty(item, -1)}
                          className="grid size-5 place-items-center hover:bg-white/20 dark:hover:bg-black/20 rounded-md transition cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3 text-white dark:text-[#18201c]" />
                        </button>
                        <span className="text-xs font-black px-1.5 text-white dark:text-[#18201c]">
                          {qty}
                        </span>
                        <button
                          onClick={() => updateItemQty(item, 1)}
                          className="grid size-5 place-items-center hover:bg-white/20 dark:hover:bg-black/20 rounded-md transition cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3 text-white dark:text-[#18201c]" />
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

      {/* FLOATING GLASS BOTTOM CART DRAWER */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:w-[420px] z-[70] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between rounded-2xl sm:rounded-3xl bg-[#0a0f0d]/95 dark:bg-[#070b09]/95 backdrop-blur-2xl p-2.5 sm:p-3.5 text-white shadow-2xl border border-white/15">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="grid size-9 sm:size-11 place-items-center rounded-xl sm:rounded-2xl bg-[#d9f447] text-[#18201c] shadow-md shadow-[#d9f447]/20 shrink-0">
                <ShoppingBag className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-[#d9f447] truncate">
                  {cartTotalItems} {cartTotalItems === 1 ? 'ITEM' : 'ITEMS'} IN CART
                </p>
                <p className="text-sm sm:text-base font-black text-white leading-tight">
                  ₹{cartSubtotal}
                </p>
              </div>
            </div>

            <button
              onClick={() => router.push('/user/cart')}
              className="flex items-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl bg-[#d9f447] hover:bg-[#cbf026] px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs font-black text-[#18201c] shadow-lg shadow-[#d9f447]/25 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer shrink-0"
            >
              <span>Checkout</span>
              <ArrowRight className="size-3.5 sm:size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

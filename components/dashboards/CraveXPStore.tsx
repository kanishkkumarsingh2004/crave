'use client'

import CraveLogo from '@/components/CraveLogo'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  CraveXPGroceryItem,
  fetchCraveXPGroceryItems,
} from '@/lib/cravexp-grocery-catalog'
import { useWebSocket } from '@/lib/websocket'
import {
  Apple,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
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
import React, { useCallback, useEffect, useMemo, useState } from 'react'

export type GroceryItem = CraveXPGroceryItem

/** Map category strings to modern Lucide vector icons */
function getCategoryIcon(category: string): React.ElementType {
  const c = (category || '').toLowerCase()
  if (
    c.includes('dairy') ||
    c.includes('milk') ||
    c.includes('egg') ||
    c.includes('butter') ||
    c.includes('cheese') ||
    c.includes('paneer')
  ) {
    return Milk
  }
  if (
    c.includes('fruit') ||
    c.includes('veggie') ||
    c.includes('vegetable') ||
    c.includes('fresh') ||
    c.includes('green')
  ) {
    return Apple
  }
  if (
    c.includes('snack') ||
    c.includes('munch') ||
    c.includes('biscuit') ||
    c.includes('chip') ||
    c.includes('popcorn') ||
    c.includes('chocolate')
  ) {
    return Cookie
  }
  if (
    c.includes('drink') ||
    c.includes('juice') ||
    c.includes('beverage') ||
    c.includes('coffee') ||
    c.includes('tea') ||
    c.includes('soda') ||
    c.includes('brew')
  ) {
    return Coffee
  }
  if (
    c.includes('bakery') ||
    c.includes('bread') ||
    c.includes('cake') ||
    c.includes('toast') ||
    c.includes('breakfast') ||
    c.includes('oats')
  ) {
    return Wheat
  }
  if (
    c.includes('home') ||
    c.includes('clean') ||
    c.includes('household') ||
    c.includes('care') ||
    c.includes('wash') ||
    c.includes('towel') ||
    c.includes('sanitizer')
  ) {
    return ShieldCheck
  }
  return Package
}

const QUICK_SEARCH_CHIPS = [
  'Milk',
  'Brown Eggs',
  'Cold Brew',
  'Whole Wheat Bread',
  'Apples',
  'Chocolates',
  'Butter',
]

export default function CraveXPStore() {
  const { user } = useAuth()
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
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'discount'>(
    'featured'
  )
  const [groceryItems, setGroceryItems] = useState<CraveXPGroceryItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Load the database-backed catalog through the server API.
  const loadCatalog = useCallback(async () => {
    try {
      setIsLoadingItems(true)
      const items = await fetchCraveXPGroceryItems()
      setGroceryItems(items)
    } catch (err) {
      console.error('Failed to load CraveXP catalog:', err)
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  // Live real-time WebSocket sync: listen for vendor console & database catalog updates
  useWebSocket({
    channels: ['cravexp_products'],
    onMessage: (msg) => {
      if (msg.channel === 'cravexp_products') {
        void loadCatalog()
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
        name: 'All Aisles',
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

  const handleCheckoutClick = () => {
    if (user) {
      router.push('/user/cart')
    } else {
      router.push('/login?redirect=/user/cart')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#090e0b] text-[#18201c] dark:text-[#f2f4f2] pb-36 antialiased selection:bg-[#86a018] selection:text-white transition-colors duration-300">
      
      {/* ── 1. APPLE VISIONOS LIQUID GLASS STORE HERO COCKPIT ── */}
      <section className="relative overflow-hidden pt-4 sm:pt-7 pb-6 sm:pb-8">
        {/* Optical Ambient Refraction Lighting */}
        <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 -z-10 w-[960px] h-[480px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#86a018]/25 via-emerald-500/10 to-transparent blur-[110px] opacity-90 dark:opacity-75" />
        <div className="pointer-events-none absolute top-1/4 -right-28 -z-10 size-[380px] bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#18201c_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] dark:opacity-[0.035]" />

        <div className="mx-auto max-w-[1240px] px-3 sm:px-6 lg:px-8">
          <div className="apple-liquid-glass rounded-[32px] p-5 sm:p-8 lg:p-10 relative overflow-hidden">
            {/* Top Specular Razor Rim Light */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/40 to-transparent" />

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              {/* Left Column: Brand & Manifesto */}
              <div className="max-w-2xl space-y-3 sm:space-y-4">
                {/* Status Beacon Capsule */}
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 dark:bg-emerald-400/10 border border-emerald-500/25 dark:border-emerald-400/25 px-3 py-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
                  <span className="relative flex size-2 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full size-2 bg-emerald-500" />
                  </span>
                  <span>10-Min Live Express Dispatch</span>
                  <span className="opacity-40">|</span>
                  <span className="font-semibold text-stone-600 dark:text-stone-300">Bengaluru South Dark Store</span>
                </div>

                <div className="flex items-center gap-3">
                  <CraveLogo variant="cravexp" size="lg" theme="auto" />
                </div>

                <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#18201c] dark:text-white leading-[1.05]">
                  Fresh Groceries &amp; Daily Essentials.{' '}
                  <span className="bg-gradient-to-r from-[#86a018] to-emerald-600 dark:from-[#d9f447] dark:to-emerald-400 bg-clip-text text-transparent">
                    In 10 Minutes.
                  </span>
                </h1>

                <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-normal leading-relaxed max-w-xl">
                  Automated cold-chain fulfillment from our local micro-warehouse. Farm milk, brown eggs, crisp fruits, chilled cold brew, and daily essentials delivered at honest table rates.
                </p>

                {/* Specular Feature Badges */}
                <div className="pt-2 flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-semibold text-stone-600 dark:text-stone-300">
                  <div className="flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 px-3 py-1">
                    <Clock className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
                    <span>~3.8 min packing latency</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 px-3 py-1">
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>4°C cold-chain preservation</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 px-3 py-1">
                    <Package className="size-3.5 text-[#86a018] dark:text-[#d9f447]" />
                    <span>Holographic tamper-evident seal</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Quick Status & Cart CTA Card (Desktop) */}
              <div className="hidden lg:flex flex-col items-end gap-3 shrink-0">
                <div className="apple-glass-card rounded-[26px] p-5 w-72 text-left space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#18201c] dark:text-white">Active Micro-Hub</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#86a018]/15 text-[#5e8210] dark:text-[#a0c21e] text-[10px] font-extrabold uppercase">
                      Open Now
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-tight">
                    {CRAVEXP_DARK_STORE_INFO.address}
                  </p>
                  
                  <button
                    type="button"
                    onClick={handleCheckoutClick}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#86a018] hover:opacity-95 text-white dark:text-[#18201c] px-4 py-3 text-xs font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <ShoppingCart className="size-4" />
                    <span>{cartTotalItems > 0 ? `View Cart (${cartTotalItems})` : 'Start Cart'}</span>
                    {cartSubtotal > 0 && <span className="font-extrabold">· ₹{cartSubtotal}</span>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. FLOATING SEARCH, FILTERS & CONTROLS CAPSULE ── */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-6 lg:px-8 pt-2">
        <div className="apple-liquid-glass rounded-[26px] p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input Bar */}
          <div className="relative flex-1 flex items-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] border border-black/5 dark:border-white/10 px-4 py-2.5 focus-within:border-[#86a018] dark:focus-within:border-[#d9f447] transition">
            <Search className="size-4 text-stone-400 mr-2.5 shrink-0" />
            <input
              type="text"
              aria-label="Search fresh groceries and essentials"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search farm milk, sourdough bread, eggs, cold brew, chips..."
              className="w-full bg-transparent text-xs font-medium text-[#18201c] dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="grid size-5 place-items-center rounded-full bg-black/10 dark:bg-white/15 text-stone-600 dark:text-stone-200 hover:scale-110 transition cursor-pointer"
                title="Clear search"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Quick Filters Group */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Apple UISwitch In-Stock Filter */}
            <div className="flex items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 px-3.5 py-1.5">
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                />
                <span className="ios-switch-track" />
                <span className="ios-switch-thumb" />
              </label>
              <span className="text-xs font-bold text-stone-700 dark:text-stone-300 select-none">
                In Stock Only
              </span>
            </div>

            {/* Sort Selector */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort products"
                className="appearance-none rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/5 dark:border-white/10 px-4 py-2.5 pr-8 text-xs font-bold text-stone-700 dark:text-stone-300 outline-none hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition cursor-pointer"
              >
                <option value="featured">Featured Picks</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="discount">Biggest Savings</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-3 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Quick Search Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 scrollbar-none text-[11px]">
          <span className="text-stone-400 dark:text-stone-500 font-medium mr-1 shrink-0">
            Trending in 10m:
          </span>
          {QUICK_SEARCH_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setSearchQuery(chip)}
              className="rounded-full bg-black/[0.04] dark:bg-white/[0.05] hover:bg-[#86a018]/15 hover:text-[#5e8210] dark:hover:text-[#a0c21e] border border-black/5 dark:border-white/10 text-stone-600 dark:text-stone-300 px-3 py-1 font-medium shrink-0 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* ── 3. DYNAMIC CATEGORY PILLS BAR (CONTINUOUS SQUIRCLES) ── */}
      <section className="mx-auto max-w-[1240px] px-3 sm:px-6 lg:px-8 pt-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon
            const isActive = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 rounded-[20px] px-4 py-2.5 text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#18201c] text-white dark:bg-white dark:text-[#18201c] shadow-md scale-[1.02]'
                    : 'apple-glass-card text-stone-600 dark:text-stone-300 hover:text-[#18201c] dark:hover:text-white'
                }`}
              >
                <Icon
                  className={`size-3.5 ${
                    isActive
                      ? 'text-[#86a018] dark:text-[#5e8210]'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}
                />
                <span>{cat.name}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-extrabold ${
                    isActive
                      ? 'bg-white/20 dark:bg-black/20 text-inherit'
                      : 'bg-black/5 dark:bg-white/10 text-stone-500 dark:text-stone-400'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 4. PRODUCT GRID & REFINED APPLE CARDS ── */}
      <main className="mx-auto max-w-[1240px] px-3 sm:px-6 lg:px-8 pt-6 pb-28">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-[#18201c] dark:text-white">
              {selectedCategory}
            </h2>
            <span className="rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-0.5 text-xs font-bold text-stone-600 dark:text-stone-300">
              {filteredItems.length} {filteredItems.length === 1 ? 'product' : 'products'}
            </span>
          </div>
        </div>

        {/* LOADING SKELETON */}
        {isLoadingItems ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4.5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <div
                key={n}
                className="h-80 rounded-[28px] bg-black/5 dark:bg-white/5 animate-pulse border border-black/5 dark:border-white/5"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* EMPTY STATE */
          <div className="apple-liquid-glass rounded-[32px] p-8 sm:p-14 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-[#86a018]/15 text-[#86a018] mb-4">
              <Sparkles className="size-8" />
            </div>

            {searchQuery ? (
              <>
                <h3 className="text-xl font-bold text-[#18201c] dark:text-white">
                  No items found matching &ldquo;{searchQuery}&rdquo;
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md mx-auto leading-relaxed">
                  Try searching for another product or clear your search to explore all available instant groceries.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#86a018] px-6 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <RotateCcw className="size-3.5" />
                    <span>Clear Search Filter</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-[#18201c] dark:text-white">
                  No items in &ldquo;{selectedCategory}&rdquo;
                </h3>
                <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-2 max-w-md mx-auto leading-relaxed">
                  We are restocking this section. Switch to another category or browse all available products.
                </p>
                <div className="mt-6 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All Items')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#86a018] px-6 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>View All Products</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          /* VIBRANT PRODUCT GRID */
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4.5">
            {filteredItems.map((item) => {
              const qty = getItemQty(item.id)
              const hasDiscount = item.mrp > item.price

              return (
                <div
                  key={item.id}
                  className="apple-glass-card rounded-[28px] p-3.5 sm:p-4 flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Specular Rim */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 dark:via-white/30 to-transparent" />

                  {/* Top Badges & Food Symbol Row */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1.5">
                      {/* Veg / Non-Veg Indicator */}
                      <span
                        className={`size-3 rounded-xs border flex items-center justify-center p-0.5 shrink-0 ${
                          item.is_veg
                            ? 'border-emerald-600 bg-white dark:bg-black/50'
                            : 'border-rose-600 bg-white dark:bg-black/50'
                        }`}
                        title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span
                          className={`size-1.5 rounded-full ${
                            item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                          }`}
                        />
                      </span>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                        10m
                      </span>
                    </div>

                    {item.discount ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 text-[10px] font-extrabold uppercase">
                        {item.discount}
                      </span>
                    ) : hasDiscount ? (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-400 text-[10px] font-extrabold uppercase">
                        Save ₹{item.mrp - item.price}
                      </span>
                    ) : null}
                  </div>

                  {/* Product Image Frame */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-stone-100 dark:bg-stone-900/60 mb-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src =
                          'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500'
                      }}
                    />
                  </div>

                  {/* Product Information */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                      <span className="truncate">{item.unit}</span>
                      {item.category && (
                        <>
                          <span className="opacity-40">&bull;</span>
                          <span className="truncate">{item.category}</span>
                        </>
                      )}
                    </div>

                    <h3 className="text-xs sm:text-sm font-bold text-[#18201c] dark:text-white line-clamp-2 leading-snug min-h-[36px]">
                      {item.name}
                    </h3>
                  </div>

                  {/* Price & Stepper Button Row */}
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-black/5 dark:border-white/10">
                    <div>
                      {hasDiscount && (
                        <span className="block text-[10px] text-stone-400 line-through leading-none mb-0.5">
                          ₹{item.mrp}
                        </span>
                      )}
                      <span className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white">
                        ₹{item.price}
                      </span>
                    </div>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => updateItemQty(item, 1)}
                        className="rounded-xl border border-black/15 dark:border-white/20 bg-white dark:bg-white/10 hover:bg-[#18201c] hover:text-white dark:hover:bg-[#86a018] dark:hover:text-[#18201c] px-3.5 py-1.5 text-xs font-bold text-[#18201c] dark:text-white shadow-xs hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer"
                      >
                        + ADD
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-xl bg-[#18201c] dark:bg-[#86a018] px-2 py-1 text-white dark:text-[#18201c] shadow-md">
                        <button
                          type="button"
                          onClick={() => updateItemQty(item, -1)}
                          className="grid size-5 place-items-center hover:bg-white/20 dark:hover:bg-black/20 rounded-md transition cursor-pointer"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3 text-current" />
                        </button>
                        <span className="text-xs font-bold px-1.5 text-current">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(item, 1)}
                          className="grid size-5 place-items-center hover:bg-white/20 dark:hover:bg-black/20 rounded-md transition cursor-pointer"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3 text-current" />
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

      {/* ── 5. FLOATING VISIONOS LIQUID GLASS CART DRAWER ── */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] left-3 right-3 sm:left-auto sm:right-6 sm:w-[440px] z-[80] animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="apple-liquid-glass rounded-[28px] p-3 sm:p-3.5 flex items-center justify-between shadow-[0_25px_60px_rgba(0,0,0,0.35)] border border-white/25">
            <div className="flex items-center gap-3">
              <div className="grid size-10 sm:size-11 place-items-center rounded-2xl bg-[#86a018] text-white shadow-md shadow-[#86a018]/30 shrink-0">
                <ShoppingBag className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#86a018] dark:text-[#d9f447] truncate">
                  {cartTotalItems} {cartTotalItems === 1 ? 'ITEM' : 'ITEMS'} IN CART
                </p>
                <p className="text-base sm:text-lg font-bold text-[#18201c] dark:text-white leading-tight">
                  ₹{cartSubtotal}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCheckoutClick}
              className="flex items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#86a018] hover:opacity-95 px-5 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shrink-0"
            >
              <span>Review Cart</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useCart } from '@/lib/cart-context'
import {
  CRAVEXP_DARK_STORE_ID,
  CRAVEXP_DARK_STORE_INFO,
  CraveXPGroceryItem,
  fetchCraveXPGroceryItems,
} from '@/lib/cravexp-grocery-catalog'
import { useWebSocket } from '@/lib/websocket'
import {
  Apple as AppleIcon,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Cookie,
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
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type GroceryItem = CraveXPGroceryItem

/** Canonical CraveXP category definition — single source of truth shared by tabs AND category cards */
export interface CraveXPCategory {
  id: string
  label: string
  icon: React.ElementType
  image: string
}

export const CANONICAL_CATEGORY_ORDER = [
  'Dairy, Bread & Eggs',
  'Fruits & Veggies',
  'Snacks & Munchies',
  'Cold Drinks & Juices',
  'Instant Food & Noodles',
  'Sweet Tooth & Ice Creams',
]

export const CRAVEXP_CATEGORIES: CraveXPCategory[] = [
  {
    id: 'Dairy, Bread & Eggs',
    label: 'Dairy, Bread & Eggs',
    icon: Milk,
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
  },
  {
    id: 'Fruits & Veggies',
    label: 'Fruits & Vegetables',
    icon: AppleIcon,
    image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400',
  },
  {
    id: 'Snacks & Munchies',
    label: 'Snacks & Munchies',
    icon: Cookie,
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400',
  },
  {
    id: 'Cold Drinks & Juices',
    label: 'Cold Drinks & Juices',
    icon: Coffee,
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400',
  },
  {
    id: 'Instant Food & Noodles',
    label: 'Instant Food',
    icon: Package,
    image: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=400',
  },
  {
    id: 'Sweet Tooth & Ice Creams',
    label: 'Ice Creams & Sweets',
    icon: Sparkles,
    image: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400',
  },
]

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
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [inStockOnly, setInStockOnly] = useState(false)
  const [vegOnly, setVegOnly] = useState(false)
  const [groceryItems, setGroceryItems] = useState<CraveXPGroceryItem[]>([])
  const [isLoadingItems, setIsLoadingItems] = useState(true)

  // Rotating search placeholder state (matching Zepto)
  const placeholderPhrases = useMemo(
    () => ['"cheese slices"', '"milk & bread"', '"chilled coke"', '"maggi noodles"', '"farm eggs"', '"ice cream"'],
    []
  )
  const [currentPlaceholderIdx, setCurrentPlaceholderIdx] = useState(0)

  // Quick View Modal
  const [activeQuickViewItem, setActiveQuickViewItem] = useState<CraveXPGroceryItem | null>(null)

  // Location text from cache / storage
  const [deliveryLocation, setDeliveryLocation] = useState('Select Location')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('crave_selected_address')
      if (saved) {
        setDeliveryLocation(saved.split(',')[0] || saved)
      } else {
        setDeliveryLocation('Kanakapura Rd, Bengaluru')
      }
    }
  }, [])

  // Cycle animated search placeholder
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholderIdx((prev) => (prev + 1) % placeholderPhrases.length)
    }, 2800)
    return () => clearInterval(interval)
  }, [placeholderPhrases])

  // Load items from database API
  const loadCatalog = useCallback(async () => {
    try {
      setIsLoadingItems(true)
      const items = await fetchCraveXPGroceryItems()
      // Filter out any paan items
      const nonPaanItems = items.filter(
        (i) => !i.category?.toLowerCase().includes('paan') && !i.name.toLowerCase().includes('paan')
      )
      setGroceryItems(nonPaanItems)
    } catch (err) {
      console.error('Failed to load CraveXP catalog:', err)
    } finally {
      setIsLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  // Real-time WebSocket sync
  useWebSocket({
    channels: ['cravexp_products'],
    onMessage: (msg) => {
      if (msg.channel === 'cravexp_products') {
        void loadCatalog()
      }
    },
  })

  // Filter items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()

    return groceryItems.filter((i) => {
      const matchesCategory =
        selectedCategory === 'All Items' ||
        (i.category && i.category.trim().toLowerCase() === selectedCategory.toLowerCase())

      const matchesSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.unit && i.unit.toLowerCase().includes(q))

      const matchesStock = !inStockOnly || i.inStock
      const matchesVeg = !vegOnly || i.isVeg !== false

      return matchesCategory && matchesSearch && matchesStock && matchesVeg
    })
  }, [groceryItems, selectedCategory, searchQuery, inStockOnly, vegOnly])

  // Real-time instant search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return groceryItems
      .filter((i) => i.name.toLowerCase().includes(q) || (i.category && i.category.toLowerCase().includes(q)))
      .slice(0, 5)
  }, [groceryItems, searchQuery])

  // Distinct categories available in items (excluding Paan), sorted by canonical priority
  const distinctCategories = useMemo(() => {
    const set = new Set<string>()
    groceryItems.forEach((i) => {
      if (i.category && !i.category.toLowerCase().includes('paan')) {
        set.add(i.category.trim())
      }
    })
    return Array.from(set).sort((a, b) => {
      const idxA = CANONICAL_CATEGORY_ORDER.indexOf(a)
      const idxB = CANONICAL_CATEGORY_ORDER.indexOf(b)
      if (idxA !== -1 && idxB !== -1) return idxA - idxB
      if (idxA !== -1) return -1
      if (idxB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [groceryItems])

  // Cart helper functions
  const getItemQty = useCallback(
    (id: string) => {
      const cartItem = globalCartItems.find((ci) => ci.id === id)
      return cartItem ? cartItem.qty : 0
    },
    [globalCartItems]
  )

  const updateItemQty = useCallback(
    (item: CraveXPGroceryItem, delta: number) => {
      const current = getItemQty(item.id)

      if (current === 0 && delta > 0) {
        addItem({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: 1,
          restaurantId: CRAVEXP_DARK_STORE_ID,
          restaurantName: CRAVEXP_DARK_STORE_INFO.name,
          image: item.image,
          detail: item.unit,
          veg: item.isVeg,
        })
      } else {
        updateGlobalQty(item.id, delta)
      }
    },
    [addItem, getItemQty, updateGlobalQty]
  )

  // Subtotal for CraveXP items
  const cartSubtotal = useMemo(() => {
    return globalCartItems
      .filter((i) => i.restaurantId === CRAVEXP_DARK_STORE_ID)
      .reduce((sum, item) => sum + item.price * item.qty, 0)
  }, [globalCartItems])

  // Free delivery progress (Threshold: ₹199)
  const freeDeliveryThreshold = 199
  const amountForFreeDelivery = Math.max(0, freeDeliveryThreshold - cartSubtotal)
  const freeDeliveryProgress = Math.min(100, (cartSubtotal / freeDeliveryThreshold) * 100)

  // Scroll helper for horizontal carousels
  const scrollRail = (railId: string, direction: 'left' | 'right') => {
    const el = document.getElementById(railId)
    if (el) {
      const scrollAmount = direction === 'left' ? -380 : 380
      el.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Smooth scroll to category rail on the page with header offset
  const scrollToCategory = useCallback((catId: string) => {
    const targetId = `rail_section_${catId.replace(/[^a-zA-Z0-9]/g, '_')}`
    const el = document.getElementById(targetId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      setSelectedCategory(catId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-[#1A1A1A] pb-28 font-sans antialiased selection:bg-[#8B1EEF]/20 selection:text-[#8B1EEF]">
      {/* ── STICKY SUB-HEADER: search + category tabs only (logo/cart/nav come from app layout) ── */}
      <div className="sticky top-[60px] z-40 bg-white border-b border-gray-100 shadow-xs">
        {/* Search row */}
        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10 py-2.5">
          <div className="relative flex items-center rounded-xl bg-white border border-gray-200 px-3.5 py-2.5 focus-within:border-[#8B1EEF] focus-within:ring-2 focus-within:ring-[#8B1EEF]/20 transition-all">
            <Search className="size-4 text-gray-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 250)}
              placeholder={`Search for ${placeholderPhrases[currentPlaceholderIdx]}`}
              className="w-full bg-transparent text-xs sm:text-[13px] font-medium outline-none placeholder:text-gray-400 text-[#1A1A1A]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="grid size-5 place-items-center rounded-full bg-gray-100 text-gray-500 hover:text-black transition cursor-pointer"
                title="Clear"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          {/* Instant Search Suggestions Dropdown */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <div className="absolute left-4 right-4 sm:left-8 sm:right-8 lg:left-10 lg:right-10 mt-2 z-50 rounded-2xl bg-white border border-gray-100 shadow-2xl p-3 text-[#1A1A1A] animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100">
                <span>Matching Products ({searchSuggestions.length})</span>
                <span>Instant Add</span>
              </div>

              {searchSuggestions.length === 0 ? (
                <p className="text-xs text-gray-400 py-4 text-center">
                  No products found.
                </p>
              ) : (
                <div className="divide-y divide-gray-50 mt-1">
                  {searchSuggestions.map((item) => {
                    const qty = getItemQty(item.id)
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-gray-50 rounded-xl transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="size-11 rounded-lg object-contain bg-white border border-gray-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate max-w-[190px] sm:max-w-xs text-[#1A1A1A]">
                              {item.name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                              {item.unit} &bull; <span className="font-black text-[#1A1A1A]">₹{item.price}</span>
                            </p>
                          </div>
                        </div>

                        {qty === 0 ? (
                          <button
                            onMouseDown={(e) => { e.preventDefault(); updateItemQty(item, 1) }}
                            className="rounded-lg border border-[#FF3269] text-[#FF3269] bg-white hover:bg-[#FFF0F4] active:scale-95 px-3.5 py-1 text-xs font-black uppercase transition shadow-xs cursor-pointer"
                          >
                            ADD
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 rounded-lg bg-[#FF3269] px-2 py-0.5 text-white">
                            <button onMouseDown={(e) => { e.preventDefault(); updateItemQty(item, -1) }} className="size-4 grid place-items-center cursor-pointer">
                              <Minus className="size-2.5" />
                            </button>
                            <span className="text-xs font-black px-1">{qty}</span>
                            <button onMouseDown={(e) => { e.preventDefault(); updateItemQty(item, 1) }} className="size-4 grid place-items-center cursor-pointer">
                              <Plus className="size-2.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Category tabs */}
        <div className="border-t border-gray-100 bg-white">
          <div className="mx-auto flex max-w-[1440px] items-center gap-6 sm:gap-8 px-4 sm:px-8 lg:px-10 overflow-x-auto scrollbar-none text-xs sm:text-[13px] font-bold">
            <button
              onClick={() => { setSelectedCategory('All Items'); setSearchQuery('') }}
              className={`flex items-center gap-1.5 py-2.5 sm:py-3 border-b-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedCategory === 'All Items'
                  ? 'border-[#8B1EEF] text-[#8B1EEF] font-black'
                  : 'border-transparent text-gray-600 hover:text-[#1A1A1A]'
              }`}
            >
              <ShoppingBag className="size-4 shrink-0" />
              <span>All</span>
            </button>
            {CRAVEXP_CATEGORIES.map((cat) => {
              const Icon = cat.icon
              const isActive = selectedCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setSearchQuery('') }}
                  className={`flex items-center gap-1.5 py-2.5 sm:py-3 border-b-2 whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                    isActive
                      ? 'border-[#8B1EEF] text-[#8B1EEF] font-black'
                      : 'border-transparent text-gray-600 hover:text-[#1A1A1A]'
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span>{cat.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 3. HERO PROMO BANNER (CYAN/TEAL GROCERY THEME - NO PAAN) ────────── */}
      {selectedCategory === 'All Items' && !searchQuery && (
        <section className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10 pt-4 sm:pt-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#D7F5F7] via-[#E4FAF9] to-[#C9F3F6] border border-[#BCE8EB] p-6 sm:p-8 lg:p-12 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xs">
            {/* Left Content */}
            <div className="z-10 max-w-xl text-center md:text-left">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#005C6E]/10 px-3.5 py-1 text-xs font-black text-[#005C6E] uppercase tracking-wider mb-2.5">
                <span className="size-2 rounded-full bg-[#00A878] animate-ping" />
                <span>Instant 10-Min Dark Store</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#005C6E] tracking-tight uppercase leading-tight">
                CraveXP Grocery Hub
              </h1>
              <p className="mt-2 text-sm sm:text-base font-semibold text-[#026E80] leading-relaxed max-w-lg">
                Farm-fresh produce, chilled dairy, snacks &amp; daily essentials delivered in 10 minutes!
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <button
                  onClick={() => {
                    const el = document.getElementById('shop-by-category')
                    el?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="rounded-full bg-[#0C1A1E] hover:bg-black text-white font-black text-xs sm:text-sm px-7 py-3 shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span>Explore Catalog</span>
                  <ChevronRight className="size-4 stroke-[3]" />
                </button>
                <div className="flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-xs px-4 py-2.5 text-xs font-bold text-[#005C6E] border border-white/80 shadow-xs">
                  <Zap className="size-3.5 fill-[#FF9500] text-[#FF9500]" />
                  <span>Free delivery above ₹199</span>
                </div>
              </div>
            </div>

            {/* Right Side: High-res Full Product Pack Arrangement */}
            <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-4 shrink-0">
              <div className="w-24 sm:w-32 md:w-36 aspect-3/4 rounded-2xl overflow-hidden shadow-md border-2 border-white/90 group">
                <img
                  src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600"
                  alt="Farm Fresh Milk & Dairy"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="w-28 sm:w-36 md:w-40 aspect-3/4 rounded-2xl overflow-hidden shadow-lg border-2 border-white/90 -translate-y-2 group">
                <img
                  src="https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=600"
                  alt="Organic Fruits & Vegetables"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="w-24 sm:w-32 md:w-36 aspect-3/4 rounded-2xl overflow-hidden shadow-md border-2 border-white/90 group hidden sm:block">
                <img
                  src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600"
                  alt="Crispy Snacks & Munchies"
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SHOP BY CATEGORY GRID (Full-bleed images — single source of truth) ── */}
      {selectedCategory === 'All Items' && !searchQuery && (
        <section id="shop-by-category" className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10 pt-6 sm:pt-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-[#1A1A1A] tracking-tight">
                Shop by Category
              </h2>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                Curated daily essentials organized for rapid 10-minute dispatch
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3.5 sm:gap-4">
            {CRAVEXP_CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className="group relative overflow-hidden rounded-2xl border border-gray-100 bg-white hover:border-[#8B1EEF]/30 hover:shadow-xl transition-all duration-300 cursor-pointer hover:-translate-y-1 flex flex-col"
              >
                {/* Full-bleed category photo */}
                <div className="relative aspect-4/3 w-full overflow-hidden bg-gray-100">
                  <img
                    src={cat.image}
                    alt={cat.label}
                    className="size-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                </div>
                {/* Category label bar */}
                <div className="p-2.5 sm:p-3 text-center bg-white flex-1 flex items-center justify-center">
                  <h3 className="text-xs sm:text-[13px] font-black text-[#1A1A1A] group-hover:text-[#8B1EEF] transition-colors line-clamp-2 leading-tight">
                    {cat.label}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── PRODUCT RAILS & CAROUSELS ── */}
      <main className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-10 pt-6 sm:pt-8">
        {isLoadingItems ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-gray-100 animate-pulse border border-gray-200"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          /* Empty State */
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-xs">
            <h3 className="text-lg font-bold text-[#1A1A1A]">
              {searchQuery
                ? `No products found for "${searchQuery}"`
                : `No items in "${selectedCategory}"`}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Try switching categories or clearing search keywords.
            </p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedCategory('All Items')
              }}
              className="mt-4 rounded-full bg-[#8B1EEF] text-white font-bold text-xs px-5 py-2.5 shadow-sm hover:bg-[#7818cf] transition"
            >
              Reset Filters
            </button>
          </div>
        ) : selectedCategory === 'All Items' && !searchQuery ? (
          /* ── ALL CATEGORIES AS SEPARATE HORIZONTAL RAILS ── */
          <div className="space-y-8 sm:space-y-10">
            {distinctCategories.map((catName) => {
              const catItems = groceryItems.filter((i) => i.category === catName)
              if (catItems.length === 0) return null
              const railId = `rail_${catName.replace(/[^a-zA-Z0-9]/g, '_')}`
              const sectionId = `rail_section_${catName.replace(/[^a-zA-Z0-9]/g, '_')}`

              return (
                <div key={catName} id={sectionId} className="relative scroll-mt-36">
                  {/* Category Rail Header */}
                  <div className="flex items-center justify-between mb-3.5">
                    <h2 className="text-base sm:text-lg font-black text-[#1A1A1A] tracking-tight">
                      {catName}
                    </h2>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedCategory(catName)}
                        className="text-xs font-black text-[#FF3269] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <span>See All</span>
                        <ChevronRight className="size-3.5 stroke-[3]" />
                      </button>

                      {/* Rail Left/Right Scroll Arrows (Zepto Style) */}
                      <div className="hidden sm:flex items-center gap-1.5">
                        <button
                          onClick={() => scrollRail(railId, 'left')}
                          className="grid size-7 place-items-center rounded-full bg-black text-white hover:bg-gray-800 transition active:scale-90 cursor-pointer shadow-xs"
                          aria-label="Scroll left"
                        >
                          <ChevronLeft className="size-4 stroke-[2.5]" />
                        </button>
                        <button
                          onClick={() => scrollRail(railId, 'right')}
                          className="grid size-7 place-items-center rounded-full bg-black text-white hover:bg-gray-800 transition active:scale-90 cursor-pointer shadow-xs"
                          aria-label="Scroll right"
                        >
                          <ChevronRight className="size-4 stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Product Track */}
                  <div
                    id={railId}
                    className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto pb-2 scrollbar-none scroll-smooth"
                  >
                    {catItems.map((item) => (
                      <CraveXPProductCard
                        key={item.id}
                        item={item}
                        qty={getItemQty(item.id)}
                        onUpdateQty={(delta) => updateItemQty(item, delta)}
                        onQuickView={() => setActiveQuickViewItem(item)}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ── FILTERED OR SEARCHED GRID VIEW ── */
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-black text-[#1A1A1A]">
                {selectedCategory} ({filteredItems.length})
              </h2>
              {selectedCategory !== 'All Items' && (
                <button
                  onClick={() => setSelectedCategory('All Items')}
                  className="text-xs font-bold text-[#8B1EEF] hover:underline cursor-pointer"
                >
                  &larr; Back to all categories
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {filteredItems.map((item) => (
                <CraveXPProductCard
                  key={item.id}
                  item={item}
                  qty={getItemQty(item.id)}
                  onUpdateQty={(delta) => updateItemQty(item, delta)}
                  onQuickView={() => setActiveQuickViewItem(item)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── PRODUCT QUICK-VIEW MODAL ── */}
      {activeQuickViewItem && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setActiveQuickViewItem(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image */}
            <div className="relative aspect-square max-h-[280px] w-full bg-gray-50 flex items-center justify-center p-6">
              <img
                src={activeQuickViewItem.image}
                alt={activeQuickViewItem.name}
                className="size-full object-contain"
              />
              <button
                onClick={() => setActiveQuickViewItem(null)}
                className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
              >
                <X className="size-4" />
              </button>
              <div className="absolute bottom-3 left-4 flex items-center gap-2">
                <span className="rounded bg-[#00B259] text-white text-[11px] font-black px-2 py-0.5">
                  ⚡ 10 Mins Delivery
                </span>
                <span className="rounded bg-gray-200 text-gray-700 text-[11px] font-bold px-2 py-0.5">
                  {activeQuickViewItem.category}
                </span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-3.5">
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  {activeQuickViewItem.unit}
                </span>
                <h2 className="text-base sm:text-lg font-black text-[#1A1A1A] mt-0.5 leading-snug">
                  {activeQuickViewItem.name}
                </h2>
              </div>

              {/* Price Row */}
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#00B259] text-white text-base font-black px-2 py-0.5">
                  ₹{activeQuickViewItem.price}
                </span>
                {activeQuickViewItem.mrp > activeQuickViewItem.price && (
                  <span className="text-sm text-gray-400 line-through">
                    ₹{activeQuickViewItem.mrp}
                  </span>
                )}
              </div>

              {/* Description */}
              {activeQuickViewItem.description && (
                <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-3 rounded-xl border border-gray-100">
                  {activeQuickViewItem.description}
                </p>
              )}

              {/* Guarantee */}
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                <span>100% Quality Assured &bull; Direct from Hub</span>
              </div>

              {/* Cart CTA */}
              <div className="pt-2">
                {getItemQty(activeQuickViewItem.id) === 0 ? (
                  <button
                    onClick={() => updateItemQty(activeQuickViewItem, 1)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#FF3269] bg-[#FF3269] hover:bg-[#e0265c] text-white py-3 text-sm font-black uppercase shadow-md active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="size-4 stroke-[3]" />
                    <span>ADD TO CART &bull; ₹{activeQuickViewItem.price}</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl bg-[#FF3269] p-2 text-white">
                    <span className="text-xs font-black ml-3">Item in Cart</span>
                    <div className="flex items-center gap-3 bg-white/20 rounded-lg px-3 py-1">
                      <button
                        onClick={() => updateItemQty(activeQuickViewItem, -1)}
                        className="grid size-6 place-items-center hover:bg-white/20 rounded-md transition cursor-pointer"
                      >
                        <Minus className="size-3.5 stroke-[2.5]" />
                      </button>
                      <span className="text-sm font-black px-1">
                        {getItemQty(activeQuickViewItem.id)}
                      </span>
                      <button
                        onClick={() => updateItemQty(activeQuickViewItem, 1)}
                        className="grid size-6 place-items-center hover:bg-white/20 rounded-md transition cursor-pointer"
                      >
                        <Plus className="size-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STICKY FLOATING CART BAR ── */}
      {cartTotalItems > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-[460px] z-50 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex flex-col rounded-2xl bg-[#2B0054] text-white shadow-2xl border border-purple-400/30 p-3 sm:p-4">
            {/* Free Delivery Meter */}
            {amountForFreeDelivery > 0 ? (
              <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-purple-200">
                <span>Add ₹{amountForFreeDelivery} more for FREE Delivery</span>
                <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00D26A] transition-all duration-300"
                    style={{ width: `${freeDeliveryProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-2 flex items-center gap-1.5 text-[11px] font-black text-[#00D26A] uppercase tracking-wider">
                <Check className="size-3 stroke-[3]" />
                <span>Unlocked FREE Delivery!</span>
              </div>
            )}

            {/* Cart Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-9 place-items-center rounded-xl bg-white/10 text-white shrink-0">
                  <ShoppingBag className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-200">
                    {cartTotalItems} {cartTotalItems === 1 ? 'ITEM' : 'ITEMS'} IN CART
                  </p>
                  <p className="text-base font-black text-white leading-tight">
                    ₹{cartSubtotal}
                  </p>
                </div>
              </div>

              <button
                onClick={() => router.push('/user/cart')}
                className="flex items-center gap-1.5 rounded-xl bg-[#00D26A] hover:bg-[#00ba5e] px-5 py-2.5 text-xs font-black text-[#0E0616] shadow-lg active:scale-95 transition cursor-pointer shrink-0 uppercase tracking-wide"
              >
                <span>VIEW CART</span>
                <ArrowRight className="size-4 stroke-[3]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** ── CRAVEXP PRODUCT CARD ── */
interface CraveXPProductCardProps {
  item: CraveXPGroceryItem
  qty: number
  onUpdateQty: (delta: number) => void
  onQuickView: () => void
}

function CraveXPProductCard({ item, qty, onUpdateQty, onQuickView }: CraveXPProductCardProps) {
  const hasDiscount = item.mrp > item.price
  const discountPercent = hasDiscount
    ? Math.round(((item.mrp - item.price) / item.mrp) * 100)
    : 0

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl bg-white p-3 sm:p-3.5 border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 min-w-[185px] sm:min-w-[215px] max-w-[235px] shrink-0">
      <div>
        {/* Top Badges: Veg indicator & 10 Mins Delivery */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {/* Indian Food Veg/Non-Veg symbol */}
            <span
              className={`inline-flex items-center justify-center size-3.5 rounded-xs border ${
                item.isVeg !== false ? 'border-emerald-600 bg-white' : 'border-red-600 bg-white'
              }`}
              title={item.isVeg !== false ? 'Vegetarian' : 'Non-Vegetarian'}
            >
              <span
                className={`size-1.5 rounded-full ${
                  item.isVeg !== false ? 'bg-emerald-600' : 'bg-red-600'
                }`}
              />
            </span>
            <span className="text-[10px] font-black tracking-wider text-gray-400 uppercase">
              10 MINS
            </span>
          </div>

          {/* Discount Tag */}
          {hasDiscount && discountPercent > 0 && (
            <span className="rounded bg-[#00B259]/10 text-[#008A44] text-[10px] font-black px-1.5 py-0.5 leading-none">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        {/* Product Image Frame: Full-bleed product display without thick white padding */}
        <div
          onClick={onQuickView}
          className="relative aspect-square w-full rounded-xl overflow-hidden bg-gray-50/50 flex items-center justify-center p-1.5 mb-2.5 cursor-pointer group-hover:bg-gray-100/60 transition-colors"
        >
          <img
            src={item.image}
            alt={item.name}
            loading="lazy"
            className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400'
            }}
          />

          {/* Floating Zepto ADD / Stepper Button */}
          <div className="absolute bottom-1.5 right-1.5 z-10">
            {qty === 0 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onUpdateQty(1)
                }}
                className="rounded-lg border-2 border-[#FF3269] text-[#FF3269] bg-white hover:bg-[#FF3269] hover:text-white active:scale-95 px-3.5 py-1 text-xs font-black uppercase transition-all shadow-sm cursor-pointer tracking-wider"
              >
                ADD
              </button>
            ) : (
              <div
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 rounded-lg bg-[#FF3269] px-2 py-0.5 text-white shadow-md animate-in zoom-in-95 duration-100"
              >
                <button
                  onClick={() => onUpdateQty(-1)}
                  className="size-4 grid place-items-center hover:bg-white/20 rounded transition cursor-pointer"
                  aria-label="Decrease"
                >
                  <Minus className="size-2.5 stroke-[3]" />
                </button>
                <span className="text-xs font-black px-1">{qty}</span>
                <button
                  onClick={() => onUpdateQty(1)}
                  className="size-4 grid place-items-center hover:bg-white/20 rounded transition cursor-pointer"
                  aria-label="Increase"
                >
                  <Plus className="size-2.5 stroke-[3]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Price & MRP Row */}
        <div className="flex items-baseline gap-1.5 mt-1">
          <span className="text-sm sm:text-base font-black text-[#1A1A1A]">
            ₹{item.price}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through font-medium">
              ₹{item.mrp}
            </span>
          )}
        </div>

        {/* Product Title */}
        <h3
          onClick={onQuickView}
          className="mt-1 text-xs sm:text-[13px] font-bold text-[#1A1A1A] line-clamp-2 leading-snug group-hover:text-[#8B1EEF] transition-colors cursor-pointer min-h-[34px]"
        >
          {item.name}
        </h3>
      </div>

      {/* Unit / Pack Size */}
      <div className="mt-2 pt-1.5 border-t border-gray-50 flex items-center justify-between text-[11px] text-gray-500 font-medium">
        <span className="truncate">{item.unit || '1 pack'}</span>
      </div>
    </div>
  )
}

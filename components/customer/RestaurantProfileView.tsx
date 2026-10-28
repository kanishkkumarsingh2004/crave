'use client'

import React, { useMemo, useState } from 'react'
import {
  ArrowLeft,
  Clock,
  MapPin,
  Minus,
  Navigation,
  Plus,
  Search,
  Share2,
  Sparkles,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import type { CartItem, LatLngCoords, MenuItem, MenuItemVariant, Restaurant } from './types'
import { useMenuItemUpdates } from '@/lib/websocket'

interface RestaurantProfileViewProps {
  restaurant: Restaurant
  menuItemsList: MenuItem[]
  cart: CartItem[]
  onAddToCart: (item: MenuItem, variant?: MenuItemVariant) => void
  onUpdateQty: (itemId: string, delta: number) => void
  onBack: () => void
  customerLocation?: LatLngCoords | null
  customerAddress?: string
  triggerToast?: (msg: string) => void
}

/**
 * Calculates road distance accounting for city street grid circuity (~1.3x haversine)
 */
export function calculateEstimatedDistanceKm(
  restLat?: number | string | null,
  restLng?: number | string | null,
  custLat?: number | string | null,
  custLng?: number | string | null
): number {
  const rLat = Number(restLat)
  const rLng = Number(restLng)
  const cLat = Number(custLat)
  const cLng = Number(custLng)

  if (!rLat || !rLng || !cLat || !cLng || isNaN(rLat) || isNaN(rLng) || isNaN(cLat) || isNaN(cLng)) {
    return 2.4
  }

  const R = 6371
  const dLat = ((cLat - rLat) * Math.PI) / 180
  const dLon = ((cLng - rLng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((rLat * Math.PI) / 180) *
      Math.cos((cLat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const straightLine = R * c
  return Math.max(0.8, Number((straightLine * 1.3).toFixed(1)))
}

export default function RestaurantProfileView({
  restaurant,
  menuItemsList: initialMenuItems,
  cart,
  onAddToCart,
  onUpdateQty,
  onBack,
  customerLocation,
  customerAddress,
  triggerToast,
}: RestaurantProfileViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [vegOnly, setVegOnly] = useState(false)
  const [nonVegOnly, setNonVegOnly] = useState(false)
  const [bestsellerOnly, setBestsellerOnly] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  // Real-time local state synced across WebSockets and props
  const [liveItems, setLiveItems] = useState<MenuItem[]>(initialMenuItems)

  // Sync whenever initialMenuItems changes
  React.useEffect(() => {
    setLiveItems(initialMenuItems)
  }, [initialMenuItems])

  // Instant real-time WebSocket listener when vendor marks out-of-stock
  useMenuItemUpdates(restaurant.id, (updatedItem: any) => {
    if (!updatedItem?.id) return
    setLiveItems((prev) =>
      prev.map((item) => {
        if (item.id === updatedItem.id) {
          const isNowInStock =
            updatedItem.in_stock !== false &&
            (updatedItem.stock_count == null || updatedItem.stock_count > 0)
          return {
            ...item,
            in_stock: isNowInStock,
            inStock: isNowInStock,
            stock_count: updatedItem.stock_count ?? item.stock_count,
            price: updatedItem.price != null ? Number(updatedItem.price) : item.price,
            name: updatedItem.name || item.name,
            detail: updatedItem.description || item.detail,
          }
        }
        return item
      })
    )
  })

  // Dynamic distance & average preparation time calculation
  const distanceKm = useMemo(() => {
    return calculateEstimatedDistanceKm(
      restaurant.latitude,
      restaurant.longitude,
      customerLocation?.lat ?? 12.9352,
      customerLocation?.lng ?? 77.6245
    )
  }, [restaurant.latitude, restaurant.longitude, customerLocation])

  // Kitchen preparation time (from real delivery_minutes) + road travel (~2.5 mins/km)
  const prepTimeMinutes = Number(restaurant.delivery_minutes || restaurant.deliveryMinutes) || 20
  const roadTravelMinutes = Math.max(3, Math.round(distanceKm * 2.5))
  const totalEtaMinutesMin = prepTimeMinutes + roadTravelMinutes
  const totalEtaMinutesMax = prepTimeMinutes + roadTravelMinutes + 5

  // Variant selector modal state
  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null)
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')

  const handleOpenVariantPicker = (item: MenuItem) => {
    setVariantPickerItem(item)
    if (item.variants && item.variants.length > 0) {
      const defaultVar = item.variants.find((v) => v.isDefault) || item.variants[0]
      setSelectedVariantId(defaultVar.id)
    }
  }

  const handleConfirmVariant = () => {
    if (!variantPickerItem) return
    const chosenVariant = variantPickerItem.variants?.find((v) => v.id === selectedVariantId)
    onAddToCart(variantPickerItem, chosenVariant)
    setVariantPickerItem(null)
  }

  // Categories extraction
  const categories = useMemo(() => {
    const cats = Array.from(new Set(liveItems.map((i) => i.category || 'Recommended')))
    return ['All', ...cats]
  }, [liveItems])

  // Filtering
  const filteredDishes = useMemo(() => {
    return liveItems.filter((dish) => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !q ||
        dish.name.toLowerCase().includes(q) ||
        dish.detail.toLowerCase().includes(q) ||
        (dish.category && dish.category.toLowerCase().includes(q))

      const matchesVeg = vegOnly ? dish.veg : true
      const matchesNonVeg = nonVegOnly ? !dish.veg : true
      const matchesBestseller = bestsellerOnly ? Boolean(dish.bestseller || dish.price >= 250) : true
      const matchesCategory =
        selectedCategory === 'All' || (dish.category || 'Recommended') === selectedCategory

      return matchesSearch && matchesVeg && matchesNonVeg && matchesBestseller && matchesCategory
    })
  }, [liveItems, searchQuery, vegOnly, nonVegOnly, bestsellerOnly, selectedCategory])

  // Group dishes by category for clean sectioning
  const groupedDishes = useMemo(() => {
    const groups: Record<string, MenuItem[]> = {}
    for (const dish of filteredDishes) {
      const cat = dish.category || 'Recommended'
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(dish)
    }
    return groups
  }, [filteredDishes])

  const destinationLabel = customerAddress || 'Your location'

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] text-[#121815] dark:text-white pb-28 pt-2">
      <div className="mx-auto max-w-[1080px] px-3 sm:px-6 space-y-6">
        {/* Navigation & Real URL Share */}
        <div className="flex items-center justify-between py-2 text-xs text-stone-500 dark:text-gray-400">
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <button
              onClick={onBack}
              className="hover:text-[#121815] dark:hover:text-white transition flex items-center gap-1 font-bold cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              <span>Explore</span>
            </button>
            <span>/</span>
            <span className="font-semibold text-[#121815] dark:text-white truncate">
              {restaurant.name}
            </span>
          </div>

          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                const url = `${window.location.origin}/user/explore?restaurant=${restaurant.id}`
                navigator.clipboard.writeText(url)
                triggerToast?.('Restaurant link copied to clipboard!')
              }
            }}
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold bg-stone-100 dark:bg-[#1a231d] hover:bg-stone-200 dark:hover:bg-[#25332a] text-[#121815] dark:text-white transition cursor-pointer"
            title="Share"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </button>
        </div>

        {/* Restaurant Title */}
        <div>
          <h1 className="text-2xl sm:text-4xl font-black text-[#121815] dark:text-white tracking-tight">
            {restaurant.name}
          </h1>
        </div>

        {/* Hero Food Photo Banner */}
        <div className="relative w-full h-56 sm:h-80 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xs group">
          <img
            src={
              restaurant.image ||
              'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80'
            }
            alt={restaurant.name}
            className="size-full object-cover group-hover:scale-105 transition duration-700"
          />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-medium text-white tracking-wide uppercase border border-white/15 shadow-sm">
              {restaurant.tag || 'Crave Partner'}
            </span>
            {restaurant.isPureVeg && (
              <span className="rounded-full bg-black/40 backdrop-blur-md px-3 py-1 text-xs font-medium text-white tracking-wide border border-white/15 shadow-sm flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-[#34C759]" />
                Pure Veg
              </span>
            )}
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
            <div className="text-white">
              <span className="text-xs uppercase tracking-widest font-bold text-white/90">
                Authentic Kitchen
              </span>
              <p className="text-sm font-semibold opacity-90 drop-shadow-sm">
                Fresh gourmet dining delivered straight to your door
              </p>
            </div>
            {restaurant.isOpen !== false ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm">
                <span className="size-2 rounded-full bg-white animate-pulse" />
                Open Now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 backdrop-blur-md px-3 py-1 text-xs font-bold text-white shadow-sm">
                Closed Now
              </span>
            )}
          </div>
        </div>

        {/* Swiggy Style Restaurant Info & Delivery Timeline Card */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-5 sm:p-6 shadow-sm space-y-4">
          {/* Cost & Cuisines (Ratings removed per user instruction) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 dark:border-[#1d2920] pb-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {restaurant.costForTwo && (
                  <span className="font-extrabold text-sm text-[#121815] dark:text-white">
                    {restaurant.costForTwo}
                  </span>
                )}
                {restaurant.costForTwo && restaurant.cuisine && (
                  <span className="text-stone-400">•</span>
                )}
                {restaurant.cuisine && (
                  <p className="text-xs font-bold text-[#f97316] dark:text-[#d9f447]">
                    {restaurant.cuisine}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs font-semibold text-stone-500 dark:text-gray-400">
              <span className="font-bold text-emerald-600 dark:text-emerald-400">Open now</span> • Closes 11:30 pm
            </div>
          </div>

          {/* Vertical Route & Distance / Prep Time Timeline */}
          <div className="relative pl-6 py-1 space-y-4">
            {/* Vertical connector line */}
            <div className="absolute left-2.5 top-3.5 bottom-3.5 w-0.5 bg-stone-300 dark:bg-[#2b3a30]" />

            {/* Top Node: Outlet */}
            <div className="relative flex items-start gap-3">
              <div className="absolute -left-6 top-1 grid size-5 place-items-center rounded-full bg-stone-200 dark:bg-[#25332a] text-stone-700 dark:text-gray-300 ring-4 ring-white dark:ring-[#131c16]">
                <MapPin className="size-2.5" />
              </div>
              <div>
                <span className="text-xs font-black text-[#121815] dark:text-white uppercase tracking-wider mr-2">
                  Outlet
                </span>
                <span className="text-xs font-semibold text-stone-600 dark:text-gray-300">
                  {restaurant.address || 'Indiranagar, Bengaluru'}
                </span>
              </div>
            </div>

            {/* Bottom Node: Dynamically Calculated Delivery ETA & Travel */}
            <div className="relative flex items-start gap-3">
              <div className="absolute -left-6 top-1 grid size-5 place-items-center rounded-full bg-[#f97316] dark:bg-[#d9f447] text-white dark:text-[#0c120e] ring-4 ring-white dark:ring-[#131c16]">
                <Clock className="size-2.5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white">
                    {totalEtaMinutesMin}-{totalEtaMinutesMax} mins
                  </span>
                  <span className="rounded-md bg-stone-100 dark:bg-[#1a241d] px-2 py-0.5 text-[11px] font-extrabold text-stone-700 dark:text-gray-200">
                    {distanceKm} km away
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-gray-400 mt-0.5">
                  ~{prepTimeMinutes} mins avg kitchen prep + ~{roadTravelMinutes} mins road delivery to{' '}
                  <span className="font-bold text-stone-700 dark:text-gray-300 truncate max-w-[300px] inline-block align-bottom">
                    {destinationLabel}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu & Dishes */}
        <div className="space-y-6">
            {/* Search and Dietary Filter Bar */}
            <div className="sticky top-2 z-20 rounded-2xl border border-stone-200/90 dark:border-[#223026] bg-white/95 dark:bg-[#131c16]/95 backdrop-blur-md p-3 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search in Restaurant */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search dishes in ${restaurant.name}...`}
                  className="w-full rounded-full border border-stone-200 dark:border-[#243328] bg-stone-50 dark:bg-[#0f1611] pl-9 pr-4 py-2 text-xs font-semibold text-[#121815] dark:text-white focus:outline-none focus:ring-2 focus:ring-[#f97316] dark:focus:ring-[#d9f447]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-white"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Veg / Non-Veg / Bestseller Filter Pills */}
              <div className="flex items-center gap-2 shrink-0 overflow-x-auto py-1">
                {/* Veg Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setVegOnly(!vegOnly)
                    if (!vegOnly) setNonVegOnly(false)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                    vegOnly
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'border-stone-200 dark:border-[#26352a] text-stone-600 dark:text-gray-300 hover:border-emerald-500'
                  }`}
                >
                  <span className="grid size-3.5 place-items-center rounded-xs border border-emerald-600 p-0.5">
                    <span className="size-1.5 rounded-full bg-emerald-600" />
                  </span>
                  <span>Veg</span>
                </button>

                {/* Non-Veg Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    setNonVegOnly(!nonVegOnly)
                    if (!nonVegOnly) setVegOnly(false)
                  }}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                    nonVegOnly
                      ? 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'border-stone-200 dark:border-[#26352a] text-stone-600 dark:text-gray-300 hover:border-rose-500'
                  }`}
                >
                  <span className="grid size-3.5 place-items-center rounded-xs border border-rose-600 p-0.5">
                    <span className="size-1.5 rounded-full bg-rose-600" />
                  </span>
                  <span>Non-Veg</span>
                </button>

                {/* Bestseller Toggle */}
                <button
                  type="button"
                  onClick={() => setBestsellerOnly(!bestsellerOnly)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition border cursor-pointer ${
                    bestsellerOnly
                      ? 'border-[#f97316] bg-orange-50 text-[#f97316] dark:bg-orange-950/40 dark:text-orange-300'
                      : 'border-stone-200 dark:border-[#26352a] text-stone-600 dark:text-gray-300 hover:border-orange-500'
                  }`}
                >
                  <Sparkles className="size-3" />
                  <span>Bestseller</span>
                </button>
              </div>
            </div>

            {/* Category Pills Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#121815] text-white dark:bg-[#d9f447] dark:text-[#0c120e]'
                      : 'bg-stone-100 text-stone-600 dark:bg-[#18221b] dark:text-gray-300 hover:bg-stone-200 dark:hover:bg-[#202d24]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Dish Sections */}
            {filteredDishes.length === 0 ? (
              <div className="rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-12 text-center">
                <UtensilsCrossed className="size-10 text-stone-400 mx-auto mb-2 opacity-60" />
                <h4 className="text-base font-bold text-[#121815] dark:text-white">
                  No matching dishes found
                </h4>
                <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">
                  Try clearing your filters or search keywords to view the full menu.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setVegOnly(false)
                    setNonVegOnly(false)
                    setBestsellerOnly(false)
                    setSelectedCategory('All')
                  }}
                  className="mt-4 rounded-full bg-stone-100 dark:bg-[#1a231d] px-4 py-2 text-xs font-bold text-[#121815] dark:text-white hover:bg-stone-200 dark:hover:bg-[#25332a] cursor-pointer"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              Object.entries(groupedDishes).map(([categoryName, dishes]) => (
                <div
                  key={categoryName}
                  className="rounded-2xl sm:rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#131c16] p-4 sm:p-6 shadow-xs space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#1d2920] pb-3">
                    <h2 className="text-base sm:text-lg font-black text-[#121815] dark:text-white flex items-center gap-2">
                      <span>{categoryName}</span>
                      <span className="text-xs font-bold text-stone-400 dark:text-gray-500">
                        ({dishes.length})
                      </span>
                    </h2>
                  </div>

                  {/* Dishes in this category */}
                  <div className="divide-y divide-stone-100 dark:divide-[#1d2920]">
                    {dishes.map((item) => {
                      const hasVariants = Boolean(item.variants && item.variants.length > 0)
                      const variantItemsInCart = hasVariants
                        ? cart.filter(
                            (c) =>
                              c.id === item.id ||
                              c.menuItemId === item.id ||
                              ((c as any).variantId && item.variants?.some((v) => v.id === (c as any).variantId))
                          )
                        : []
                      const variantQtyTotal = variantItemsInCart.reduce((sum, c) => sum + c.qty, 0)
                      const inCart = hasVariants ? undefined : cart.find((i) => i.id === item.id)
                      const isOutOfStock =
                        item.in_stock === false ||
                        item.inStock === false ||
                        (item.stock_count != null && item.stock_count <= 0)

                      return (
                        <div
                          key={item.id}
                          className="py-5 flex items-start justify-between gap-4 sm:gap-6 group transition"
                        >
                          {/* Left: Dish Information */}
                          <div className="min-w-0 flex-1 space-y-1">
                            {/* Veg / Non-Veg square badge */}
                            <div className="flex items-center gap-2">
                              <span
                                className={`grid size-4 place-items-center rounded-xs border p-0.5 ${
                                  item.veg
                                    ? 'border-emerald-600 text-emerald-600'
                                    : 'border-rose-600 text-rose-600'
                                }`}
                                title={item.veg ? 'Pure Vegetarian' : 'Non-Vegetarian'}
                              >
                                <span
                                  className={`size-2 rounded-full ${
                                    item.veg ? 'bg-emerald-600' : 'bg-rose-600'
                                  }`}
                                />
                              </span>

                              {(item.bestseller || item.price >= 300) && (
                                <span className="inline-flex items-center gap-1 rounded-sm bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                  <Sparkles className="size-2.5" />
                                  <span>Bestseller</span>
                                </span>
                              )}
                            </div>

                            {/* Dish Name */}
                            <h3 className="font-extrabold text-sm sm:text-base text-[#121815] dark:text-white leading-snug">
                              {item.name}
                            </h3>

                            {/* Price */}
                            <div className="font-black text-sm text-[#121815] dark:text-white">
                              {hasVariants ? 'From ' : ''}₹{item.price}
                            </div>

                            {/* Description */}
                            {item.detail && (
                              <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-2 leading-relaxed pt-0.5">
                                {item.detail}
                              </p>
                            )}
                          </div>

                          {/* Right: Dish Photo & Swiggy-style Add Button */}
                          <div className="relative shrink-0 flex flex-col items-center">
                            <div className="relative w-32 h-28 sm:w-36 sm:h-32 rounded-2xl overflow-hidden bg-stone-100 dark:bg-[#1a231d] shadow-xs border border-stone-200/60 dark:border-[#243328]">
                              <img
                                src={
                                  item.image ||
                                  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500'
                                }
                                alt={item.name}
                                className={`size-full object-cover transition duration-300 ${
                                  isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'
                                }`}
                              />

                              {/* Real-time Out of Stock Overlay */}
                              {isOutOfStock && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center animate-fade-in">
                                  <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                                    Out of Stock
                                  </span>
                                  <span className="text-[10px] text-white/80 font-medium mt-1">
                                    Restocking soon
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Swiggy ADD Button (Overlapping Photo Bottom) */}
                            <div className="relative -mt-4 z-10">
                              {isOutOfStock ? (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-200 dark:bg-[#202a23] px-5 py-1.5 text-xs font-black text-stone-400 dark:text-stone-500 cursor-not-allowed shadow-xs"
                                >
                                  Out of Stock
                                </button>
                              ) : hasVariants ? (
                                <div className="flex flex-col items-center">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVariantPicker(item)}
                                    className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-black shadow-sm active:scale-95 transition cursor-pointer min-h-[36px] ${
                                      variantQtyTotal > 0
                                        ? 'border-emerald-500/50 dark:border-[#d9f447]/50 bg-emerald-50 dark:bg-[#1a2920] text-emerald-700 dark:text-[#d9f447]'
                                        : 'border-stone-200 dark:border-[#2c3d31] bg-white dark:bg-[#17221b] text-emerald-600 dark:text-[#d9f447] hover:bg-stone-50 dark:hover:bg-[#1e2d24]'
                                    }`}
                                  >
                                    <span>{variantQtyTotal > 0 ? `${variantQtyTotal} ADDED` : 'ADD'}</span>
                                    <Plus className="size-3.5 stroke-[2.5]" />
                                  </button>
                                  <span className="text-[9px] font-bold text-stone-400 dark:text-gray-500 mt-0.5">
                                    Customisable
                                  </span>
                                </div>
                              ) : inCart ? (
                                <div className="flex items-center rounded-xl border border-emerald-600/30 bg-white dark:bg-[#17221b] shadow-sm overflow-hidden">
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.id, -1)}
                                    className="size-8 grid place-items-center text-stone-600 dark:text-stone-300 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer active:scale-90"
                                    title="Decrease quantity"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="size-3.5 stroke-[2.5]" />
                                  </button>
                                  <span className="min-w-6 text-center text-xs font-mono font-black text-[#121815] dark:text-white px-1">
                                    {inCart.qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => onUpdateQty(item.id, 1)}
                                    className="size-8 grid place-items-center text-stone-600 dark:text-stone-300 hover:text-emerald-500 hover:bg-emerald-500/10 transition cursor-pointer active:scale-90"
                                    title="Increase quantity"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="size-3.5 stroke-[2.5]" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => onAddToCart(item)}
                                  className="flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-[#2c3d31] bg-white dark:bg-[#17221b] px-5 py-2 text-xs font-black text-emerald-600 dark:text-[#d9f447] shadow-sm hover:bg-stone-50 dark:hover:bg-[#1e2d24] active:scale-95 transition cursor-pointer min-h-[36px]"
                                >
                                  <span>ADD</span>
                                  <Plus className="size-3.5 stroke-[2.5]" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
      </div>

      {/* Variant Selector Modal */}
      {variantPickerItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
          onClick={() => setVariantPickerItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-stone-200 dark:border-[#2d3b32] bg-white dark:bg-[#18231c] p-6 shadow-2xl text-[#121815] dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-stone-100 dark:border-[#243328] pb-3">
              <div>
                <h4 className="text-base font-black">{variantPickerItem.name}</h4>
                <p className="text-xs text-stone-500 dark:text-gray-400">Select portion or size</p>
              </div>
              <button
                onClick={() => setVariantPickerItem(null)}
                className="grid size-7 place-items-center rounded-full bg-stone-100 dark:bg-[#121815] text-stone-500 hover:text-[#121815] dark:hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {variantPickerItem.variants?.map((v) => (
                <label
                  key={v.id}
                  className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                    selectedVariantId === v.id
                      ? 'border-black/[0.15] dark:border-white/[0.2] bg-stone-100 dark:bg-white/10'
                      : 'border-black/[0.06] dark:border-white/[0.06] hover:bg-stone-50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="variant-select"
                      checked={selectedVariantId === v.id}
                      onChange={() => setSelectedVariantId(v.id)}
                      className="accent-[#1D1D1F] dark:accent-white size-4"
                    />
                    <span className="text-xs font-semibold">{v.name}</span>
                  </div>
                  <span className="text-xs font-bold">₹{v.price}</span>
                </label>
              ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVariantPickerItem(null)}
                className="px-4 py-2.5 rounded-full text-xs font-semibold text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-white/10 transition cursor-pointer min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmVariant}
                className="px-6 py-2.5 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer min-h-[44px]"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import CraveLogo from '@/components/CraveLogo'
import {
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Heart,
  Leaf,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  UtensilsCrossed,
  X,
  Flame,
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CartItem, LatLngCoords, MenuItem, MenuItemVariant, Restaurant } from './types'
import RestaurantProfileView, { calculateEstimatedDistanceKm } from './RestaurantProfileView'
import OrderAgainStrip from './OrderAgainStrip'

const CATEGORY_LIST = [
  { id: 'All', label: 'All Cravings', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80' },
  { id: 'Biryani', label: 'Dum Biryani', image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80' },
  { id: 'Pizza', label: 'Artisanal Pizza', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80' },
  { id: 'North Indian', label: 'North Indian', image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80' },
  { id: 'Burgers', label: 'Gourmet Burgers', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80' },
  { id: 'Starters', label: 'Asian Momos', image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80' },
  { id: 'Chinese', label: 'Wok & Chinese', image: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=300&q=80' },
  { id: 'Pasta', label: 'Italian Pasta', image: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80' },
  { id: 'South Indian', label: 'South Indian', image: 'https://images.unsplash.com/photo-1610192244261-3f33de3f55e4?auto=format&fit=crop&w=300&q=80' },
  { id: 'Healthy', label: 'Healthy Bowls', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80' },
  { id: 'Wraps', label: 'Wraps & Rolls', image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80' },
  { id: 'Kebabs', label: 'Tandoor & Kebabs', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=300&q=80' },
  { id: 'Chaat', label: 'Street Chaat', image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&q=80' },
  { id: 'Chicken', label: 'Crispy Chicken', image: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=300&q=80' },
  { id: 'Sandwich', label: 'Gourmet Subs', image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=300&q=80' },
  { id: 'Desserts', label: 'Cakes & Treats', image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80' },
  { id: 'Ice Cream', label: 'Ice Creams', image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=300&q=80' },
  { id: 'Beverages', label: 'Brews & Shakes', image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=300&q=80' },
  { id: 'Coffee', label: 'Specialty Coffee', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=300&q=80' },
  { id: 'Thali', label: 'Royal Thalis', image: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=300&q=80' },
]

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  All: [],
  Biryani: ['biryani', 'hyderabadi', 'mughlai', 'rice'],
  Pizza: ['pizza', 'italian', 'crust', 'woodfired'],
  'North Indian': ['north indian', 'punjabi', 'curry', 'roti', 'dal'],
  Burgers: ['burger', 'burgers', 'american', 'fast food', 'slider'],
  Starters: ['momo', 'momos', 'dimsum', 'starter', 'starters', 'appetizer', 'asian'],
  Chinese: ['chinese', 'noodle', 'noodles', 'manchurian', 'wok', 'asian', 'fried rice'],
  Pasta: ['pasta', 'italian', 'spaghetti', 'lasagna', 'penne'],
  'South Indian': ['south indian', 'dosa', 'idli', 'vada', 'filter coffee', 'udupi'],
  Healthy: ['healthy', 'salad', 'bowl', 'diet', 'fit', 'organic', 'vegan'],
  Wraps: ['wrap', 'wraps', 'roll', 'rolls', 'shawarma', 'frankie'],
  Kebabs: ['kebab', 'kebabs', 'tandoor', 'tandoori', 'grill', 'bbq', 'tikka'],
  Chaat: ['chaat', 'street', 'pani puri', 'samosa', 'bhel', 'snack'],
  Chicken: ['chicken', 'crispy', 'wings', 'fried chicken', 'poultry'],
  Sandwich: ['sandwich', 'sandwiches', 'sub', 'subs', 'toast', 'panini', 'cafe'],
  Desserts: ['dessert', 'desserts', 'cake', 'sweet', 'bakery', 'pastry', 'waffle'],
  'Ice Cream': ['ice cream', 'gelato', 'sundae', 'kulfi', 'dessert'],
  Beverages: ['beverage', 'beverages', 'drink', 'drinks', 'shake', 'smoothie', 'juice', 'soda'],
  Coffee: ['coffee', 'cafe', 'latte', 'espresso', 'cappuccino', 'cold brew'],
  Thali: ['thali', 'combo', 'meal', 'meals', 'platter', 'indian'],
}

interface ExploreViewProps {
  restaurantsList: Restaurant[]
  menuItemsList: MenuItem[]
  cart: CartItem[]
  onAddToCart: (item: MenuItem, variant?: MenuItemVariant) => void
  onUpdateQty: (itemId: string, delta: number) => void
  selectedRestaurant: Restaurant | null
  onSelectRestaurant: (rest: Restaurant | null) => void
  triggerToast: (msg: string) => void
  customerLocation?: LatLngCoords | null
  customerAddress?: string
}

export default function ExploreView({
  restaurantsList,
  menuItemsList,
  cart,
  onAddToCart,
  onUpdateQty,
  selectedRestaurant,
  onSelectRestaurant,
  triggerToast,
  customerLocation,
  customerAddress,
}: ExploreViewProps) {
  // When a restaurant is clicked, seamlessly open the full Swiggy-style Restaurant Profile
  if (selectedRestaurant) {
    return (
      <RestaurantProfileView
        restaurant={selectedRestaurant}
        menuItemsList={menuItemsList}
        cart={cart}
        onAddToCart={onAddToCart}
        onUpdateQty={onUpdateQty}
        onBack={() => onSelectRestaurant(null)}
        customerLocation={customerLocation}
        customerAddress={customerAddress}
        triggerToast={triggerToast}
      />
    )
  }

  const router = useRouter()
  const categoryScrollRef = useRef<HTMLDivElement>(null)

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)

  // Hero Carousel State
  const [heroSlideIndex, setHeroSlideIndex] = useState(0)
  const [heroAutoplayPaused, setHeroAutoplayPaused] = useState(false)
  const [copiedPromoCode, setCopiedPromoCode] = useState<string | null>(null)

  // Autoplay hero carousel (5s interval, paused on hover)
  useEffect(() => {
    if (heroAutoplayPaused) return
    const timer = setInterval(() => {
      setHeroSlideIndex((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(timer)
  }, [heroAutoplayPaused])

  // Variant Picker State
  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null)
  const [variantPickerSelection, setVariantPickerSelection] = useState('')

  // Favorite Kitchens State
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('crave_favorite_restaurants')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const toggleFavorite = (id: string, name: string) => {
    setFavoriteIds((prev) => {
      const exists = prev.includes(id)
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id]
      try {
        localStorage.setItem('crave_favorite_restaurants', JSON.stringify(next))
      } catch {}
      triggerToast(exists ? `Removed ${name} from saved favorites` : `Added ${name} to saved favorites!`)
      return next
    })
  }

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  const filteredRestaurants = useMemo(() => {
    return restaurantsList.filter((rest) => {
      const query = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !query ||
        rest.name.toLowerCase().includes(query) ||
        rest.cuisine.toLowerCase().includes(query) ||
        (rest.tag && rest.tag.toLowerCase().includes(query))

      let matchesTag = selectedTag === 'All'
      if (!matchesTag) {
        const tagKeywords = CATEGORY_SYNONYMS[selectedTag] || [selectedTag.toLowerCase()]
        const restText = `${rest.cuisine} ${rest.tag || ''} ${rest.name}`.toLowerCase()
        matchesTag = tagKeywords.some((kw) => restText.includes(kw))
      }

      const matchesPureVeg = pureVegOnly ? rest.isPureVeg : true
      const matchesOffers = offersOnly ? Boolean(rest.offer) : true
      const matchesFast = fastDeliveryOnly ? parseInt(rest.eta) <= 25 : true

      return matchesSearch && matchesTag && matchesPureVeg && matchesOffers && matchesFast
    })
  }, [restaurantsList, searchQuery, selectedTag, pureVegOnly, offersOnly, fastDeliveryOnly])

  const menuItemDisplayPrice = (item: MenuItem) => {
    if (!item.variants?.length) return item.price
    const availablePrices = item.variants.filter((v) => v.inStock).map((v) => v.price)
    return availablePrices.length > 0 ? Math.min(...availablePrices) : item.price
  }

  const openVariantPicker = (item: MenuItem) => {
    const defaultVariant = item.variants?.find((v) => v.isDefault && v.inStock) || item.variants?.find((v) => v.inStock)
    setVariantPickerItem(item)
    setVariantPickerSelection(defaultVariant?.id || '')
  }

  const confirmVariantSelection = () => {
    if (!variantPickerItem) return
    const variant = variantPickerItem.variants?.find((v) => v.id === variantPickerSelection)
    if (!variant || !variant.inStock) {
      triggerToast('Please select an available size.')
      return
    }
    onAddToCart(variantPickerItem, variant)
    setVariantPickerItem(null)
    setVariantPickerSelection('')
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8">
      {/* ── ULTRA-PREMIUM HERO BANNER (ZEPTO / SWIGGY STYLE) ── */}
      <div
        onMouseEnter={() => setHeroAutoplayPaused(true)}
        onMouseLeave={() => setHeroAutoplayPaused(false)}
        className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-black/10 dark:border-white/10 group/hero"
      >
        <div className="relative min-h-[440px] sm:min-h-[460px] md:min-h-[480px] lg:min-h-[500px] w-full flex items-stretch">
          {/* SLIDE 0: Crave Gourmet Feasts */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-stretch ${
              heroSlideIndex === 0 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Ambient Background & Radial Glow */}
            <div className="absolute inset-0 bg-[#0A0D12] -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_45%,rgba(245,158,11,0.22),rgba(239,68,68,0.12)_35%,transparent_70%)] pointer-events-none -z-10" />

            {/* Split Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 w-full items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 gap-6 relative z-10">
              {/* Left Column: Headlines, Promo Code & CTAs */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 max-w-2xl">
                {/* Brand & Offer Pill */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <CraveLogo variant="full" size="md" theme="light" />

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold tracking-wide backdrop-blur-md">
                    <Flame className="size-3 text-amber-400 fill-amber-400" />
                    <span>Flat ₹120 Off Gourmet</span>
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (typeof navigator !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText('CRAVEFEAST')
                        setCopiedPromoCode('CRAVEFEAST')
                        triggerToast('Promo code CRAVEFEAST copied!')
                        setTimeout(() => setCopiedPromoCode(null), 3000)
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[11px] font-mono font-medium transition cursor-pointer backdrop-blur-md active:scale-95 shadow-xs"
                    title="Click to copy coupon code"
                  >
                    {copiedPromoCode === 'CRAVEFEAST' ? (
                      <>
                        <Check className="size-3 text-[#34C759] stroke-[2.5]" />
                        <span className="text-[#34C759] font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3 text-white/80" />
                        <span>Code: CRAVEFEAST</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Main Headline */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-[-0.03em] leading-[1.12]">
                  Savor Gourmet Feasts Delivered Fresh In 25 Mins.
                </h2>

                <p className="text-xs sm:text-sm text-gray-300 max-w-xl font-normal leading-relaxed">
                  Steaming handi dum biryani, woodfired artisanal pizzas, smash burgers &amp; sizzling fries cooked fresh on order.
                </p>

                {/* Micro Benefit Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Live Kitchen Prep</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Clock className="size-3 text-amber-400" />
                    <span>20–25 Min Doorstep</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Tag className="size-3 text-amber-400" />
                    <span>Zero Markup Prices</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => document.getElementById('dishes-section')?.scrollIntoView({ behavior: 'smooth' })}
                    className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-stone-100 text-[#12161A] font-extrabold px-6 py-3 text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <span>Explore Signature Dishes</span>
                    <ChevronRight className="size-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/user/cravexp')}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-5 py-3 text-xs sm:text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                  >
                    <CraveLogo variant="cravexp" size="sm" theme="light" />
                    <span>10-Min Store</span>
                    <ChevronRight className="size-4 stroke-[2.5] text-white/80" />
                  </button>
                </div>
              </div>

              {/* Right Column: Full-Bleed Image with Seamless Blending */}
              <div className="md:col-span-5 relative h-64 sm:h-72 md:h-[380px] lg:h-[420px] w-full flex items-center justify-center">
                <div className="relative size-full rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/banners/gourmet-feast.jpg"
                    alt="Gourmet Feasts"
                    className="size-full object-cover object-center scale-[1.02] hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Floating Glass Pill */}
                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <Clock className="size-3.5 text-amber-400 stroke-[2.5]" />
                    <span>20–25 Mins Delivery</span>
                  </div>

                  <div className="absolute bottom-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-400" />
                    <span>Chef-Curated Kitchens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 1: craveXP Instant 10-Min Store */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-stretch ${
              heroSlideIndex === 1 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Ambient Background & Radial Glow */}
            <div className="absolute inset-0 bg-[#04140F] -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_45%,rgba(16,185,129,0.25),rgba(5,150,105,0.12)_35%,transparent_70%)] pointer-events-none -z-10" />

            {/* Split Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 w-full items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 gap-6 relative z-10">
              {/* Left Column: Headlines & CTAs */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 max-w-2xl">
                {/* Brand & Offer Pill */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <CraveLogo variant="cravexp" size="lg" theme="light" />

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-bold tracking-wide backdrop-blur-md">
                    <Zap className="size-3 text-emerald-400 fill-emerald-400" />
                    <span>10-Min Flash Drop</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md">
                    <span>Free Delivery &gt; ₹199</span>
                  </span>
                </div>

                {/* Main Headline */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-[-0.03em] leading-[1.12]">
                  Ultra-Fast Grocery &amp; Daily Essentials.
                </h2>

                <p className="text-xs sm:text-sm text-gray-300 max-w-xl font-normal leading-relaxed">
                  Farm-fresh milk, organic avocados, fresh berries, chilled nitro cold brew &amp; pantry snacks in 10 minutes flat.
                </p>

                {/* Micro Benefit Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Dark Store Dispatch</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Clock className="size-3 text-emerald-400" />
                    <span>10 Mins Guaranteed</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Sparkles className="size-3 text-emerald-400" />
                    <span>Cold-Chain Maintained</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push('/user/cravexp')}
                    className="inline-flex items-center gap-2 rounded-full bg-[#10B981] hover:bg-[#059669] text-white font-extrabold px-7 py-3 text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <Zap className="size-4 fill-white" />
                    <span>Open CraveXP Store</span>
                    <ChevronRight className="size-4 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* Right Column: Full-Bleed Image with Seamless Blending */}
              <div className="md:col-span-5 relative h-64 sm:h-72 md:h-[380px] lg:h-[420px] w-full flex items-center justify-center">
                <div className="relative size-full rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/banners/cravexp-grocery.jpg"
                    alt="10-Minute Grocery Delivery Items"
                    className="size-full object-cover object-center scale-[1.02] hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Floating Glass Pill */}
                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <Zap className="size-3.5 text-emerald-400 fill-emerald-400" />
                    <span>10 Min Flash Drop</span>
                  </div>

                  <div className="absolute bottom-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <Clock className="size-3.5 text-emerald-400 stroke-[2]" />
                    <span>Live Central Dark Store</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SLIDE 2: After-Hours Midnight Cravings */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-stretch ${
              heroSlideIndex === 2 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            {/* Ambient Background & Radial Glow */}
            <div className="absolute inset-0 bg-[#0D0B1A] -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_85%_45%,rgba(139,92,246,0.25),rgba(236,72,153,0.12)_35%,transparent_70%)] pointer-events-none -z-10" />

            {/* Split Content Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 w-full items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 gap-6 relative z-10">
              {/* Left Column: Headlines & CTAs */}
              <div className="md:col-span-7 flex flex-col justify-center space-y-4 max-w-2xl">
                {/* Brand & Offer Pill */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <CraveLogo variant="full" size="md" theme="light" />

                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-[11px] font-bold tracking-wide backdrop-blur-md">
                    <span>🌙 Open Till 4 AM</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-[11px] font-semibold backdrop-blur-md">
                    <span>Midnight Cravings</span>
                  </span>
                </div>

                {/* Main Headline */}
                <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-[-0.03em] leading-[1.12]">
                  Satisfy Your Late-Night Cravings.
                </h2>

                <p className="text-xs sm:text-sm text-gray-300 max-w-xl font-normal leading-relaxed">
                  Sizzling peri-peri wings, loaded queso nachos, warm molten chocolate lava cakes &amp; chilled boba tea delivered all night long.
                </p>

                {/* Micro Benefit Chips */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <span className="size-1.5 rounded-full bg-purple-400 animate-pulse" />
                    <span>Night Fleet Active</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Clock className="size-3 text-purple-400" />
                    <span>Direct Doorstep</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] font-medium text-white/90 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full backdrop-blur-xs">
                    <Sparkles className="size-3 text-purple-400" />
                    <span>Contactless Delivery</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('Wings')
                      document.getElementById('dishes-section')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-stone-100 text-[#12161A] font-extrabold px-7 py-3 text-xs sm:text-sm shadow-md hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer"
                  >
                    <span>Order Late Night Bites</span>
                    <ChevronRight className="size-4 stroke-[2.5]" />
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push('/user/cravexp')}
                    className="inline-flex items-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold px-5 py-3 text-xs sm:text-sm backdrop-blur-md hover:scale-[1.02] active:scale-[0.97] transition-all cursor-pointer shadow-xs"
                  >
                    <CraveLogo variant="cravexp" size="sm" theme="light" />
                    <span>Munchies</span>
                    <ChevronRight className="size-4 stroke-[2.5] text-white/80" />
                  </button>
                </div>
              </div>

              {/* Right Column: Full-Bleed Image with Seamless Blending */}
              <div className="md:col-span-5 relative h-64 sm:h-72 md:h-[380px] lg:h-[420px] w-full flex items-center justify-center">
                <div className="relative size-full rounded-2xl overflow-hidden shadow-2xl">
                  <img
                    src="/banners/midnight-feast.jpg"
                    alt="Midnight Feast"
                    className="size-full object-cover object-center scale-[1.02] hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  {/* Floating Glass Pill */}
                  <div className="absolute top-3.5 right-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <span>🌙 Active Till 4:00 AM</span>
                  </div>

                  <div className="absolute bottom-3.5 left-3.5 rounded-full bg-black/60 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-lg flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-purple-400" />
                    <span>Wings, Nachos &amp; Desserts</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sleek Segmented Progress Indicators (Zepto/Swiggy Style - NO huge round discs) */}
        <div className="absolute bottom-4 left-6 sm:left-10 lg:left-12 z-20 flex items-center gap-2">
          {[0, 1, 2].map((idx) => {
            const isActive = heroSlideIndex === idx
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setHeroSlideIndex(idx)}
                className="group py-1 cursor-pointer"
                aria-label={`Go to slide ${idx + 1}`}
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-10 sm:w-12 bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]'
                      : 'w-3.5 sm:w-4 bg-white/30 group-hover:bg-white/60'
                  }`}
                />
              </button>
            )
          })}
        </div>

        {/* Sleek Glass Arrow Controls */}
        <div className="absolute bottom-4 right-6 sm:right-10 lg:right-12 z-20 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setHeroSlideIndex((prev) => (prev === 0 ? 2 : prev - 1))}
            className="grid size-9 place-items-center rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/15 backdrop-blur-md cursor-pointer transition active:scale-95 shadow-md"
            aria-label="Previous slide"
          >
            <ChevronLeft className="size-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => setHeroSlideIndex((prev) => (prev === 2 ? 0 : prev + 1))}
            className="grid size-9 place-items-center rounded-full bg-black/40 hover:bg-black/70 text-white border border-white/15 backdrop-blur-md cursor-pointer transition active:scale-95 shadow-md"
            aria-label="Next slide"
          >
            <ChevronRight className="size-4 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-400 group-focus-within:text-[#86a018] transition" />
            <input
              type="text"
              placeholder="Search dishes, gourmet kitchens, or cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-gray-200/80 dark:border-white/10 bg-white/90 dark:bg-[#18201c]/90 text-[#18201c] dark:text-white placeholder:text-gray-400 py-3.5 pl-11 pr-10 text-xs sm:text-sm shadow-xs outline-none focus:border-[#86a018] font-medium backdrop-blur-md"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 size-5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-300 transition"
              >
                <X className="size-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setPureVegOnly(!pureVegOnly)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                pureVegOnly
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-emerald-500'
              }`}
            >
              <Leaf className="size-3.5 text-emerald-500" />
              <span>Pure Veg</span>
            </button>

            <button
              type="button"
              onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                fastDeliveryOnly
                  ? 'bg-[#18201c] dark:bg-[#d9f447] border-[#18201c] dark:border-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                  : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-[#86a018]'
              }`}
            >
              <Zap className="size-3.5 text-amber-500" />
              <span>Fast Delivery (≤25m)</span>
            </button>

            <button
              type="button"
              onClick={() => setOffersOnly(!offersOnly)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold border transition shrink-0 cursor-pointer ${
                offersOnly
                  ? 'bg-amber-500 border-amber-500 text-[#18201c] shadow-xs font-extrabold'
                  : 'bg-white dark:bg-[#18201c] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-amber-400'
              }`}
            >
              <Tag className="size-3.5 text-amber-500" />
              <span>Offers</span>
            </button>
          </div>
        </div>

        {/* Personalized Reorder Carousel: Order Again */}
        <OrderAgainStrip triggerToast={triggerToast} />

        {/* Cuisine Categories Scroll */}
        <div className="pt-1">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white tracking-tight flex items-center gap-2">
                <span>What&apos;s on your mind?</span>
                <span className="rounded-full bg-gray-100 dark:bg-white/10 px-2 py-0.5 text-[10px] font-extrabold text-gray-500 dark:text-gray-300">
                  {CATEGORY_LIST.length} Cuisines
                </span>
              </h3>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => scrollCategories('left')}
                className="grid size-8 place-items-center rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollCategories('right')}
                className="grid size-8 place-items-center rounded-full border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 hover:bg-gray-100 transition active:scale-95 shadow-xs cursor-pointer"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>

          <div
            ref={categoryScrollRef}
            className="flex items-center gap-4 sm:gap-5 overflow-x-auto pb-3 pt-1 no-scrollbar scroll-smooth"
          >
            {CATEGORY_LIST.map((cat) => {
              const isSelected = selectedTag === cat.id
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedTag(cat.id)}
                  className="flex flex-col items-center gap-2 group shrink-0 transition cursor-pointer"
                >
                  <div
                    className={`relative size-16 sm:size-20 rounded-full overflow-hidden border-2 transition duration-300 p-0.5 ${
                      isSelected
                        ? 'border-[#18201c] dark:border-[#d9f447] ring-4 ring-[#18201c]/10 dark:ring-[#d9f447]/20 scale-105 shadow-md'
                        : 'border-transparent hover:border-gray-300 hover:scale-102'
                    }`}
                  >
                    <img
                      src={cat.image}
                      alt={cat.label}
                      className="size-full rounded-full object-cover group-hover:scale-110 transition duration-500"
                    />
                  </div>
                  <span
                    className={`text-xs tracking-tight transition max-w-[84px] text-center line-clamp-1 ${
                      isSelected
                        ? 'text-[#18201c] dark:text-[#d9f447] font-extrabold'
                        : 'text-gray-600 dark:text-gray-400 font-medium group-hover:text-[#18201c]'
                    }`}
                  >
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Signature Dishes */}
      {(menuItemsList.length > 0 || selectedRestaurant) && (
        <div id="dishes-section">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] dark:text-white flex items-center gap-2">
                <span className="grid size-6 place-items-center rounded-lg bg-[#86a018]/10 text-[#86a018]">
                  <Sparkles className="size-3.5 text-[#86a018]" />
                </span>
                <span>Signature Dishes</span>
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Specials and top-rated dishes from kitchens.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {menuItemsList.map((item) => {
              const hasVariants = Boolean(item.variants?.length)
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
                  className="group rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] p-4 flex flex-col justify-between shadow-xs hover:shadow-lg transition duration-300"
                >
                  <div>
                    <div className="relative h-44 w-full overflow-hidden rounded-2xl">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className={`h-full w-full object-cover transition duration-500 ${
                            isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-105'
                          }`}
                        />
                      ) : (
                        <div className="grid h-full w-full place-items-center bg-gray-100 text-gray-400">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}

                      {/* Out of Stock Overlay */}
                      {isOutOfStock && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center">
                          <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                            Out of Stock
                          </span>
                        </div>
                      )}

                      <div className="absolute top-2.5 left-2.5 rounded-lg bg-white/95 dark:bg-[#121815]/95 p-1 flex items-center gap-1 shadow-xs">
                        <div className={`size-3 rounded-sm border flex items-center justify-center ${item.veg ? 'border-emerald-600' : 'border-rose-600'}`}>
                          <div className={`size-1.5 rounded-full ${item.veg ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 pr-1">{item.veg ? 'Veg' : 'Non-Veg'}</span>
                      </div>
                    </div>

                    <div className="mt-3.5">
                      <p className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white line-clamp-1">{item.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">{item.detail}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/5">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Price</span>
                      <span className="font-black text-base text-[#18201c] dark:text-white">
                        {hasVariants ? 'From ' : ''}₹{menuItemDisplayPrice(item)}
                      </span>
                    </div>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="rounded-full bg-stone-200 dark:bg-[#202a23] px-4 py-2 text-xs font-bold text-stone-400 dark:text-stone-500 cursor-not-allowed shadow-xs"
                      >
                        Out of Stock
                      </button>
                    ) : hasVariants ? (
                      <button
                        type="button"
                        onClick={() => openVariantPicker(item)}
                        className={`rounded-full px-4 py-2 text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                          variantQtyTotal > 0
                            ? 'bg-emerald-600 dark:bg-[#d9f447] text-white dark:text-[#18201c] ring-2 ring-emerald-500/20'
                            : 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] hover:scale-105 active:scale-95'
                        }`}
                      >
                        {variantQtyTotal > 0 ? (
                          <>
                            <span>{variantQtyTotal} in Bag</span>
                            <Plus className="size-3.5 stroke-[2.5]" />
                          </>
                        ) : (
                          <>
                            <Plus className="size-3.5 stroke-[2.5]" />
                            <span>Options</span>
                          </>
                        )}
                      </button>
                    ) : inCart ? (
                      <div className="flex items-center rounded-full bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, -1)}
                          className="size-8 grid place-items-center hover:bg-white/20 dark:hover:bg-black/20 transition cursor-pointer active:scale-90"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5 stroke-[2.5]" />
                        </button>
                        <span className="min-w-6 text-center text-xs font-mono font-black px-1">{inCart.qty}</span>
                        <button
                          type="button"
                          onClick={() => onUpdateQty(item.id, 1)}
                          className="size-8 grid place-items-center hover:bg-white/20 dark:hover:bg-black/20 transition cursor-pointer active:scale-90"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5 stroke-[2.5]" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-5 py-2 text-xs font-bold text-white dark:text-[#18201c] hover:scale-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer min-h-[36px]"
                      >
                        <Plus className="size-3.5 stroke-[2.5]" />
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Restaurants List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] dark:text-white">
              Restaurants ({filteredRestaurants.length})
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {filteredRestaurants.length === 0
                ? 'Only verified vendor-registered kitchens appear here.'
                : 'Available partner kitchens.'}
            </p>
          </div>
        </div>

        {filteredRestaurants.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] p-10 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs">
            <div className="grid size-14 place-items-center rounded-2xl bg-black/[0.04] dark:bg-white/[0.08] text-gray-600 dark:text-gray-300 mb-4">
              <UtensilsCrossed className="size-6 stroke-[1.75]" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-[#F5F5F7]">
              No Partner Kitchens Live Yet
            </h4>
            <p className="text-xs sm:text-sm text-[#86868B] dark:text-[#98989D] max-w-md mt-1.5 leading-relaxed">
              When partner restaurants register through the vendor portal and activate their kitchen, their live menu dishes and accurate ETAs will display here.
            </p>
            <button
              type="button"
              onClick={() => router.push('/user/cravexp')}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] px-5 py-2.5 text-xs font-bold hover:scale-105 active:scale-95 transition shadow-xs cursor-pointer"
            >
              <Zap className="size-3.5 fill-current text-[#d9f447] dark:text-[#18201c]" />
              <span>Shop craveXP 10-Minute Dark Store</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((rest) => {
            // Real GPS distance calculation
            const hasCoords =
              rest.latitude != null &&
              rest.longitude != null &&
              customerLocation?.lat != null &&
              customerLocation?.lng != null
            const distanceKm = hasCoords
              ? calculateEstimatedDistanceKm(
                  rest.latitude,
                  rest.longitude,
                  customerLocation.lat,
                  customerLocation.lng
                )
              : rest.distance
              ? Number(rest.distance)
              : null

            // Real ETA: kitchen prep (delivery_minutes) + transit (~2.5 mins/km)
            const prepMinutes = Number(rest.delivery_minutes || rest.deliveryMinutes) || 20
            const travelMinutes = distanceKm ? Math.max(3, Math.round(distanceKm * 2.5)) : 5
            const totalEtaMin = prepMinutes + travelMinutes
            const displayEta = `${totalEtaMin}-${totalEtaMin + 5} min`
            const displayDistance = distanceKm ? `${distanceKm} km` : null

            // Real data only from database
            const displayOffer = rest.offer || null
            const displayCost = rest.costForTwo || null

            const isFavorited = favoriteIds.includes(rest.id)

            return (
              <div
                key={rest.id}
                onClick={() => onSelectRestaurant(rest)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_12px_32px_rgba(0,0,0,0.4)] transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] active:scale-[0.99] flex flex-col justify-between"
              >
                <div>
                  {/* Photo Visual Frame - Clean Apple Framing (Zero Gradients) */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-2xl bg-[#F2F2F7] dark:bg-[#2C2C2E]">
                    {rest.image ? (
                      <img
                        src={rest.image}
                        alt={rest.name}
                        className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="grid size-full place-items-center bg-[#F2F2F7] dark:bg-[#2C2C2E] text-[#8E8E93]">
                        <UtensilsCrossed className="size-8 stroke-[1.5]" />
                      </div>
                    )}

                    {/* Top Floating Chips & SF Action Controls */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 z-10">
                      <div className="flex items-center gap-1.5 flex-wrap pointer-events-none">
                        {rest.isPureVeg && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                            <span className="size-1.5 rounded-full bg-[#34C759]" />
                            Pure Veg
                          </span>
                        )}
                        {rest.tag && (
                          <span className="inline-flex items-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium tracking-wide uppercase text-white shadow-sm">
                            {rest.tag}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* SF Symbol Heart (Favorite Button) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(rest.id, rest.name)
                          }}
                          aria-label={isFavorited ? 'Remove from favorites' : 'Save to favorites'}
                          className="size-8 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/15 grid place-items-center text-white transition-all active:scale-90 shadow-sm cursor-pointer"
                        >
                          <Heart
                            className={`size-4 stroke-[1.75] transition-all duration-200 ${
                              isFavorited
                                ? 'fill-[#FF3B30] text-[#FF3B30] scale-105'
                                : 'text-white'
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Floating Metadata on Photo */}
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2 pointer-events-none z-10">
                      {displayOffer ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-white font-medium text-[11px] px-3 py-1 shadow-sm">
                          <Tag className="size-3 stroke-[2] text-[#FF9500]" />
                          <span>{displayOffer}</span>
                        </div>
                      ) : <div />}

                      <div className="inline-flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white shadow-sm">
                        <Clock className="size-3 stroke-[2] text-white/90" />
                        <span>{displayEta}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-4 sm:p-4.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-[17px] tracking-[-0.015em] text-[#1D1D1F] dark:text-[#F5F5F7] group-hover:text-[#007AFF] dark:group-hover:text-[#0A84FF] transition-colors flex items-center gap-1.5 truncate">
                          <span>{rest.name}</span>
                          <CheckCircle2 className="size-4 text-[#34C759] shrink-0 stroke-[2]" />
                        </h4>
                        {rest.cuisine && (
                          <p className="mt-0.5 text-[13px] text-[#86868B] dark:text-[#98989D] font-normal line-clamp-1">
                            {rest.cuisine}
                          </p>
                        )}
                      </div>

                      {displayCost && (
                        <div className="text-right shrink-0">
                          <span className="inline-block text-[12px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] bg-[#F2F2F7] dark:bg-[#2C2C2E] px-2.5 py-0.5 rounded-full">
                            {displayCost}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Maps Style Distance Row */}
                    <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-black/[0.05] dark:border-white/[0.06] text-[12px] text-[#86868B] dark:text-[#98989D]">
                      <span className="flex items-center gap-1 font-normal">
                        <MapPin className="size-3.5 text-[#86868B] dark:text-[#98989D] stroke-[1.75]" />
                        <span>{displayDistance || rest.address || 'Kitchen Live'}</span>
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-medium text-[#34C759]">
                        <Clock className="size-3.5 stroke-[1.75]" />
                        <span>Fast Doorstep Delivery</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Bar - Apple App Store Button Style */}
                <div className="px-4 sm:px-4.5 pb-4 pt-0">
                  <div className="flex items-center justify-between border-t border-black/[0.05] dark:border-white/[0.06] pt-3">
                    <span className="flex items-center gap-2 text-[12px] font-medium text-[#86868B] dark:text-[#98989D]">
                      <span className="size-2 rounded-full bg-[#34C759]" />
                      <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">Kitchen Live</span>
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F2F2F7] hover:bg-[#E5E5EA] dark:bg-[#2C2C2E] dark:hover:bg-[#3A3A3C] group-hover:bg-[#007AFF] group-hover:text-white dark:group-hover:bg-[#0A84FF] dark:group-hover:text-white text-[#007AFF] dark:text-[#0A84FF] px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-200">
                      <span>View</span>
                      <ChevronRight className="size-3.5 stroke-[2.5]" />
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>

      {/* Secondary CraveXP Card - Apple Solid Grouped Card (Zero Gradients) */}
      <div
        onClick={() => router.push('/user/cravexp')}
        className="relative overflow-hidden rounded-2xl bg-[#1C1C1E] dark:bg-[#161617] p-5 sm:p-6 border border-black/[0.08] dark:border-white/[0.08] shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group transition-all duration-200 active:scale-[0.99]"
      >
        <div className="flex items-center gap-4">
          <div className="grid size-11 place-items-center rounded-xl bg-white/10 text-white shrink-0">
            <Zap className="size-5 fill-current text-[#34C759]" />
          </div>
          <div>
            <p className="font-semibold text-sm sm:text-base text-white">
              Need Groceries or Midnight Snacks Fast?
            </p>
            <p className="text-xs text-[#86868B] mt-1 max-w-xl">
              Daily essentials, fresh milk, beverages, eggs &amp; munchies dispatched in 10 mins flat.
            </p>
          </div>
        </div>
        <span className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-white hover:bg-stone-100 text-[#1D1D1F] px-5 py-2 text-[13px] font-semibold transition shadow-sm active:scale-95">
          <span>Visit CraveXP Store</span>
          <ChevronRight className="size-3.5 stroke-[2.5]" />
        </span>
      </div>

      {/* Variant Picker Modal */}
      {variantPickerItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setVariantPickerItem(null)}
        >
          <div
            className="w-full max-w-[440px] rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#25332a] pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">Choose Size</span>
                <h3 className="text-lg font-black text-white">{variantPickerItem.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setVariantPickerItem(null)}
                className="grid size-8 place-items-center rounded-full bg-[#121815] text-[#9eb3a4] hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-2">
              {variantPickerItem.variants?.map((v) => {
                const isSelected = variantPickerSelection === v.id
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!v.inStock}
                    onClick={() => setVariantPickerSelection(v.id)}
                    className={`w-full rounded-2xl border p-3.5 flex items-center justify-between text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#d9f447] bg-[#d9f447]/10'
                        : 'border-[#27342d] bg-[#121815] hover:border-[#3a4f41]'
                    } ${!v.inStock ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div>
                      <p className="font-bold text-sm text-white">{v.name}</p>
                      <p className="text-xs text-gray-400">{v.inStock ? 'In Stock' : 'Sold Out'}</p>
                    </div>
                    <span className="font-black text-sm text-[#d9f447]">₹{v.price}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#25332a]">
              <button
                type="button"
                onClick={() => setVariantPickerItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmVariantSelection}
                className="px-5 py-2 rounded-xl bg-[#d9f447] text-[#18201c] text-xs font-black hover:bg-[#cbe838] transition cursor-pointer"
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

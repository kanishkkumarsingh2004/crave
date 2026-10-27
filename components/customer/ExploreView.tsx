'use client'

import CraveLogo from '@/components/CraveLogo'
import {
  ArrowRight,
  Award,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
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
  Zap,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import type { CartItem, LatLngCoords, MenuItem, MenuItemVariant, Restaurant } from './types'
import RestaurantProfileView from './RestaurantProfileView'
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

  // Variant Picker State
  const [variantPickerItem, setVariantPickerItem] = useState<MenuItem | null>(null)
  const [variantPickerSelection, setVariantPickerSelection] = useState('')

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
      {/* Dynamic Hero Carousel */}
      <div
        onMouseEnter={() => setHeroAutoplayPaused(true)}
        onMouseLeave={() => setHeroAutoplayPaused(false)}
        className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-white/[0.12] bg-[#0d120f] transition-all duration-500 group/hero"
      >
        <div className="relative min-h-[420px] sm:min-h-[440px] md:min-h-[460px] lg:min-h-[480px] w-full flex items-center">
          {/* Slide 0: Gourmet Feasts */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
              heroSlideIndex === 0 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#170e0a] via-[#24140d]/95 to-[#150c08] -z-10" />
            <div className="absolute -left-20 -top-20 size-80 rounded-full bg-orange-600/15 blur-3xl pointer-events-none" />
            <div className="absolute right-0 top-0 size-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

            <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                  <Sparkles className="size-3" />
                  50% OFF UP TO ₹120
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
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-orange-200 text-[11px] font-mono font-black transition cursor-pointer backdrop-blur-md active:scale-95"
                  title="Click to copy coupon code"
                >
                  {copiedPromoCode === 'CRAVEFEAST' ? (
                    <>
                      <Check className="size-3 text-emerald-400 stroke-[3]" />
                      <span className="text-emerald-300">COPIED!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3 text-orange-300" />
                      <span>CODE: CRAVEFEAST</span>
                    </>
                  )}
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Savor Gourmet Feasts Delivered Fresh In 25 Mins
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                Steaming dum biryani, woodfired pizzas, smash burgers &amp; sizzling fries cooked fresh on order.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => document.getElementById('dishes-section')?.scrollIntoView({ behavior: 'smooth' })}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-stone-950 font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Explore Signature Dishes</span>
                  <ArrowRight className="size-4 text-stone-950" />
                </button>
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-200/90 bg-white/5 border border-white/10 px-3 py-2 rounded-xl backdrop-blur-sm">
                  <span>⭐ 4.9 Master Chef Rated</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
              <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                <img
                  src="/banners/gourmet-feast.jpg"
                  alt="Gourmet Feasts"
                  className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl transform transition-transform duration-700 group-hover/hero:scale-105"
                />
                <div className="absolute top-4 right-4 rounded-full bg-black/70 backdrop-blur-md border border-white/20 px-3.5 py-1.5 text-xs font-black text-amber-300 shadow-xl flex items-center gap-1.5">
                  <Clock className="size-3.5" />
                  <span>20-25 Mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* Slide 1: craveXP Flash Drop */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
              heroSlideIndex === 1 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#07140e] via-[#0d2217]/95 to-[#050f0a] -z-10" />
            <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <CraveLogo variant="cravexp" size="lg" theme="light" />
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#d9f447] text-[#0d1410] text-[11px] font-black uppercase tracking-wider">
                  <span className="size-2 rounded-full bg-[#0d1410] animate-ping" />
                  10-Min Flash Drop
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Ultra-Fast Grocery &amp; Daily Essentials
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                Farm eggs, chilled milk, organic avocados, fresh berries &amp; pantry snacks in 10 minutes flat.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => router.push('/user/cravexp')}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-[#d9f447] hover:bg-[#cbf026] text-[#0d1410] font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Open CraveXP Store</span>
                  <ArrowRight className="size-4 text-[#0d1410]" />
                </button>
              </div>
            </div>
            <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
              <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                <img
                  src="/banners/cravexp-grocery.jpg"
                  alt="10-Minute Grocery Delivery Items"
                  className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl"
                />
              </div>
            </div>
          </div>

          {/* Slide 2: Midnight Cravings */}
          <div
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out grid grid-cols-1 md:grid-cols-12 items-center p-6 sm:p-10 lg:p-12 pb-16 sm:pb-16 md:pb-12 ${
              heroSlideIndex === 2 ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f081c] via-[#1a0e2e]/95 to-[#0b0514] -z-10" />
            <div className="md:col-span-7 z-10 flex flex-col justify-center space-y-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[11px] font-black uppercase tracking-wider w-fit">
                🌙 OPEN TILL 4 AM
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white tracking-tight leading-[1.15]">
                Satisfy Your Late-Night Cravings
              </h2>
              <p className="text-xs sm:text-sm text-stone-300 max-w-xl font-normal leading-relaxed">
                Crispy wings, loaded cheesy nachos, warm chocolate lava cakes &amp; iced drinks delivered all night.
              </p>
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('Wings')
                    document.getElementById('dishes-section')?.scrollIntoView({ behavior: 'smooth' })
                  }}
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-black px-6 sm:px-7 py-3 sm:py-3.5 text-xs sm:text-sm shadow-xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Order Late Night Munchies</span>
                  <ArrowRight className="size-4 text-white" />
                </button>
              </div>
            </div>
            <div className="md:col-span-5 relative h-64 sm:h-80 md:h-[400px] lg:h-[430px] w-full flex items-center justify-center md:justify-end mt-4 md:mt-0">
              <div className="relative w-full h-full rounded-2xl md:rounded-3xl overflow-hidden group/img">
                <img src="/banners/midnight-feast.jpg" alt="Midnight Feast" className="w-full h-full object-cover object-center rounded-2xl md:rounded-3xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Carousel Indicators & Arrows */}
        <button
          type="button"
          onClick={() => setHeroSlideIndex((prev) => (prev === 0 ? 2 : prev - 1))}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 grid size-9 place-items-center rounded-full bg-black/60 text-white/80 hover:text-white border border-white/20 backdrop-blur-md cursor-pointer"
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => setHeroSlideIndex((prev) => (prev === 2 ? 0 : prev + 1))}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 grid size-9 place-items-center rounded-full bg-black/60 text-white/80 hover:text-white border border-white/20 backdrop-blur-md cursor-pointer"
        >
          <ChevronRight className="size-5" />
        </button>
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
                        className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#18201c] hover:scale-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Options</span>
                      </button>
                    ) : inCart ? (
                      <div className="flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-2.5 py-1 text-xs font-bold text-white dark:text-[#18201c] shadow-xs">
                        <button type="button" onClick={() => onUpdateQty(item.id, -1)} className="hover:opacity-75 cursor-pointer">
                          <Minus className="size-3.5" />
                        </button>
                        <span>{inCart.qty}</span>
                        <button type="button" onClick={() => onUpdateQty(item.id, 1)} className="hover:opacity-75 cursor-pointer">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(item)}
                        className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-bold text-white dark:text-[#18201c] hover:scale-105 active:scale-95 transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="size-3.5" />
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
            <p className="text-xs text-gray-500 dark:text-gray-400">Available partner kitchens.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredRestaurants.map((rest) => (
            <div
              key={rest.id}
              onClick={() => onSelectRestaurant(rest)}
              className="group cursor-pointer overflow-hidden rounded-3xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#18201c] transition duration-300 hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 sm:h-52 w-full overflow-hidden">
                  {rest.image ? (
                    <img src={rest.image} alt={rest.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-108" />
                  ) : (
                    <div className="grid size-full place-items-center bg-gray-100 text-gray-400">
                      <MapPin className="size-8" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  <div className="absolute left-3 top-3 flex items-center gap-1.5 flex-wrap">
                    {rest.tag && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-200 bg-black/60 px-2 py-0.5 rounded-md">
                        {rest.tag}
                      </span>
                    )}
                    {rest.isPureVeg && (
                      <span className="text-[10px] font-bold uppercase text-emerald-400 bg-black/60 px-2 py-0.5 rounded-md">
                        Pure Veg
                      </span>
                    )}
                  </div>

                  {rest.rating && (
                    <div className="absolute right-3 top-3 text-[10px] font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Award className="size-3" />
                      <span>{rest.rating}</span>
                    </div>
                  )}

                  {rest.eta && (
                    <span className="absolute bottom-3 right-3 text-[10px] font-medium text-white bg-black/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock className="size-3 text-[#d9f447]" />
                      {rest.eta}
                    </span>
                  )}
                </div>

                <div className="p-4 sm:p-5">
                  <h3 className="font-extrabold text-base tracking-tight text-[#18201c] dark:text-white group-hover:text-[#86a018] transition">
                    {rest.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{rest.cuisine}</p>
                </div>
              </div>

              <div className="p-4 sm:p-5 pt-0">
                <div className="flex items-center justify-between border-t border-gray-100 dark:border-white/5 pt-3 text-xs">
                  <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    {rest.eta ? `Delivery · ${rest.eta}` : 'Available'}
                  </span>
                  <span className="font-bold text-[#86a018] flex items-center gap-1">
                    View Menu <ArrowRight className="size-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Secondary CraveXP Banner */}
      <div
        onClick={() => router.push('/user/cravexp')}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#141b17] via-[#1b2720] to-[#121915] p-5 sm:p-6 border border-emerald-500/20 hover:border-[#d9f447]/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group transition duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#d9f447]/15 border border-[#d9f447]/30 text-[#d9f447] shrink-0">
            <Zap className="size-6 fill-current text-[#d9f447]" />
          </div>
          <div>
            <p className="font-extrabold text-sm sm:text-base text-white group-hover:text-[#d9f447] transition">
              Need Groceries or Midnight Snacks Fast?
            </p>
            <p className="text-xs text-gray-300 mt-1 max-w-xl">
              Daily essentials, fresh milk, beverages, eggs &amp; munchies dispatched in 10 mins.
            </p>
          </div>
        </div>
        <span className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 group-hover:bg-[#d9f447] text-white group-hover:text-[#121815] px-4 py-2.5 text-xs font-black transition">
          <span>Visit craveXP Store</span>
          <ArrowRight className="size-3.5" />
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

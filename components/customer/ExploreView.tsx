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

const CATEGORY_IMAGE_MAP: Record<string, string> = {
  All: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
  Biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
  Pizzas: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
  Pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=300&q=80',
  Curries: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80',
  'North Indian': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=300&q=80',
  Pastas: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80',
  Pasta: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=300&q=80',
  Breads: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=300&q=80',
  Desserts: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=80',
  Italian: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80',
  Mughlai: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=300&q=80',
}

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

  // Dynamically compute cuisine/dish categories that currently exist in the database
  const availableCategories = useMemo(() => {
    const set = new Set<string>()
    menuItemsList.forEach((m) => {
      if (m.category?.trim()) set.add(m.category.trim())
    })
    restaurantsList.forEach((r) => {
      if (r.cuisine) {
        r.cuisine.split(/[,&•]/).forEach((c) => {
          const trimmed = c.trim()
          if (trimmed && trimmed.length > 2) set.add(trimmed)
        })
      }
    })

    const list = [
      { id: 'All', label: 'All Cravings', image: CATEGORY_IMAGE_MAP.All },
    ]

    Array.from(set).forEach((name) => {
      const matchKey = Object.keys(CATEGORY_IMAGE_MAP).find((k) =>
        name.toLowerCase().includes(k.toLowerCase())
      )
      const image = matchKey
        ? CATEGORY_IMAGE_MAP[matchKey]
        : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
      list.push({ id: name, label: name, image })
    })

    return list.length > 1 ? list : CATEGORY_LIST.slice(0, 6)
  }, [menuItemsList, restaurantsList])

  // Filters State
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState('All')
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)



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
                  {availableCategories.length} Categories
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
            {availableCategories.map((cat) => {
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

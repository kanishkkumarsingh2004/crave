'use client'

import { useAuth } from '@/lib/auth-context'
import {
  Navigation,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  Clock3,
  Compass,
  Filter,
  Flame,
  History,
  LocateFixed,
  MapPin,
  Minus,
  PackageCheck,
  Percent,
  PhoneCall,
  Plus,
  RotateCcw,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  User,
  UtensilsCrossed,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { FormEvent, useEffect, useMemo, useState } from 'react'

const Mapcn = dynamic(() => import('@/components/ui/mapcn'), { ssr: false })

import { Coupon, getCoupons, validateCoupon } from '@/lib/coupons'

interface Restaurant {
  id: string
  name: string
  cuisine: string
  rating: string
  ratingCount: string
  eta: string
  distance: string
  costForTwo: string
  image: string
  tag: string
  address: string
  offer?: string
  isPureVeg?: boolean
}

interface MenuItem {
  id: string
  name: string
  detail: string
  price: number
  image: string
  veg: boolean
  restaurantName?: string
}

interface CartItem extends MenuItem {
  qty: number
}

interface PastOrder {
  id: string
  restaurantName: string
  restaurantImage: string
  items: { name: string; qty: number; price: number }[]
  subtotal: number
  discount: number
  total: number
  couponCode?: string
  date: string
  time: string
  status: 'Delivered' | 'Cancelled' | 'In Progress'
  deliveryTime: string
  trackStep?: number // 0=Placed, 1=Preparing, 2=Picked Up, 3=On the way
  otp?: string
  driverName?: string
  driverPhone?: string
}

const samplePastOrders: PastOrder[] = [
  {
    id: 'DRP-8812',
    restaurantName: 'The Green Table (Indiranagar)',
    restaurantImage:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    items: [
      { name: 'Basil Pesto Quinoa Bowl', qty: 1, price: 289 },
      { name: 'Smoky Paneer Tikka Wrap', qty: 1, price: 249 },
    ],
    subtotal: 538,
    discount: 50,
    total: 513,
    couponCode: 'BLINK50',
    date: '3 Oct 2026',
    time: '1:45 PM',
    status: 'In Progress',
    deliveryTime: '—',
    trackStep: 2,
    otp: '4921',
    driverName: 'Rajesh Kumar',
    driverPhone: '+91 97444 55667',
  },
  {
    id: 'DRP-7741',
    restaurantName: 'The Green Table',
    restaurantImage:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    items: [
      { name: 'Basil Pesto Quinoa Bowl', qty: 1, price: 289 },
      { name: 'Smoky Paneer Tikka Wrap', qty: 1, price: 249 },
    ],
    subtotal: 538,
    discount: 50,
    total: 513,
    couponCode: 'BLINK50',
    date: '1 Oct 2026',
    time: '1:15 PM',
    status: 'Delivered',
    deliveryTime: '22 mins',
  },
  {
    id: 'DRP-6920',
    restaurantName: 'Casa Napoli Woodfired Pizza',
    restaurantImage:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    items: [{ name: 'Artisan Woodfired Margherita Pizza', qty: 2, price: 420 }],
    subtotal: 840,
    discount: 100,
    total: 765,
    couponCode: 'WELCOME100',
    date: '28 Sep 2026',
    time: '7:30 PM',
    status: 'Delivered',
    deliveryTime: '34 mins',
  },
  {
    id: 'DRP-5883',
    restaurantName: 'Bengaluru Spice Club',
    restaurantImage:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=85',
    items: [{ name: 'Dum Biryani Royal', qty: 1, price: 380 }],
    subtotal: 380,
    discount: 0,
    total: 405,
    date: '25 Sep 2026',
    time: '12:45 PM',
    status: 'Delivered',
    deliveryTime: '18 mins',
  },
  {
    id: 'DRP-5190',
    restaurantName: 'Boba & Artisan Brews',
    restaurantImage:
      'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=85',
    items: [
      { name: 'Iced Uji Matcha Boba Latte', qty: 2, price: 220 },
      { name: 'Brown Sugar Milk Tea', qty: 1, price: 199 },
    ],
    subtotal: 639,
    discount: 0,
    total: 639,
    date: '20 Sep 2026',
    time: '4:20 PM',
    status: 'Cancelled',
    deliveryTime: '—',
  },
]

const sampleRestaurants: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'The Green Table',
    cuisine: 'Healthy bowls · Salads · Vegan',
    rating: '4.8',
    ratingCount: '1.2k+',
    eta: '25–30 min',
    distance: '1.2 km',
    costForTwo: '₹400 for two',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    tag: 'Healthy',
    address: '100ft Rd, Indiranagar',
    offer: '50% OFF up to ₹120',
    isPureVeg: true,
  },
  {
    id: 'rest_2',
    name: 'Momo House & Asian Grill',
    cuisine: 'Asian · Dumplings · Noodles',
    rating: '4.7',
    ratingCount: '850+',
    eta: '20–25 min',
    distance: '2.4 km',
    costForTwo: '₹350 for two',
    image:
      'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=900&q=85',
    tag: 'Popular',
    address: '5th Block, Koramangala',
    offer: 'Flat ₹100 OFF',
  },
  {
    id: 'rest_3',
    name: 'Casa Napoli Woodfired Pizza',
    cuisine: 'Italian · Artisan Pizza · Pasta',
    rating: '4.9',
    ratingCount: '2.1k+',
    eta: '30–35 min',
    distance: '3.1 km',
    costForTwo: '₹600 for two',
    image:
      'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=85',
    tag: 'Top rated',
    address: 'Church Street, Mg Road',
    offer: '20% OFF up to ₹200',
  },
  {
    id: 'rest_4',
    name: 'Bengaluru Spice Club',
    cuisine: 'Biryani · South Indian · Chettinad',
    rating: '4.8',
    ratingCount: '3.4k+',
    eta: '15–20 min',
    distance: '1.8 km',
    costForTwo: '₹300 for two',
    image:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=900&q=85',
    tag: 'Fast Delivery',
    address: 'HAL 2nd Stage, Indiranagar',
    offer: 'Flat ₹50 OFF',
  },
  {
    id: 'rest_5',
    name: 'Boba & Artisan Brews',
    cuisine: 'Beverages · Matcha · Boba Tea',
    rating: '4.9',
    ratingCount: '920+',
    eta: '15–25 min',
    distance: '1.5 km',
    costForTwo: '₹250 for two',
    image:
      'https://images.unsplash.com/photo-1558857563-b371033873b8?auto=format&fit=crop&w=900&q=85',
    tag: 'Trending',
    address: 'CMH Road, Indiranagar',
    offer: '50% OFF up to ₹100',
    isPureVeg: true,
  },
  {
    id: 'rest_6',
    name: 'Truffle & Co. Gourmet Burgers',
    cuisine: 'American · Smash Burgers · Fries',
    rating: '4.7',
    ratingCount: '1.5k+',
    eta: '25–30 min',
    distance: '2.0 km',
    costForTwo: '₹450 for two',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=85',
    tag: 'Gourmet',
    address: '80ft Rd, Koramangala',
    offer: '20% OFF',
  },
]

const sampleMenuItems: MenuItem[] = [
  {
    id: 'm1',
    name: 'Basil Pesto Quinoa Bowl',
    detail: 'Roasted zucchini, cherry tomatoes, pesto, toasted seeds',
    price: 289,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'The Green Table',
  },
  {
    id: 'm2',
    name: 'Smoky Paneer Tikka Wrap',
    detail: 'Charred paneer, pickled onion, mint chutney in wheat wrap',
    price: 249,
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'The Green Table',
  },
  {
    id: 'm3',
    name: 'Steamed Truffle Edamame Momos',
    detail: 'Thin wheat skin filled with edamame & wild mushrooms',
    price: 320,
    image:
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'Momo House & Asian Grill',
  },
  {
    id: 'm4',
    name: 'Artisan Woodfired Margherita Pizza',
    detail: 'San Marzano tomato sauce, fresh buffalo mozzarella, fresh basil',
    price: 420,
    image:
      'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'Casa Napoli Woodfired Pizza',
  },
  {
    id: 'm5',
    name: 'Iced Uji Matcha Boba Latte',
    detail: 'Ceremonial grade Japanese matcha with organic oat milk & tapioca pearls',
    price: 220,
    image:
      'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'Boba & Artisan Brews',
  },
]

const categoryList = [
  { id: 'All', label: 'All Kitchens', icon: '🍽️' },
  { id: 'Healthy', label: 'Healthy Bowls', icon: '🥗' },
  { id: 'Popular', label: 'Asian & Momos', icon: '🥟' },
  { id: 'Top rated', label: 'Artisan Pizza', icon: '🍕' },
  { id: 'Fast Delivery', label: 'Biryani & Spice', icon: '🍲' },
  { id: 'Gourmet', label: 'Smash Burgers', icon: '🍔' },
  { id: 'Trending', label: 'Boba & Shakes', icon: '🥤' },
]

export default function CustomerDashboard() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)

  // Filter Toggles
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)
  const [promoSlide, setPromoSlide] = useState(0)
  const PROMO_COUNT = 3
  // Track Order modal
  const [trackingOrder, setTrackingOrder] = useState<PastOrder | null>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setPromoSlide((prev) => (prev + 1) % PROMO_COUNT)
    }, 3000)
    return () => clearInterval(timer)
  }, [])
  // Cart State
  const [cart, setCart] = useState<CartItem[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'explore' | 'live-order' | 'orders' | 'profile'>('explore')
  const [pastOrders, setPastOrders] = useState<PastOrder[]>(samplePastOrders)
  // Profile editing
  const [editAddress, setEditAddress] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.address || '100ft Rd, Indiranagar, Bengaluru'
  )

  // Coupon Engine State
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)

  // Payment State
  const [upiId, setUpiId] = useState('')
  const [utrRef, setUtrRef] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>({
    id: 'DRP-8812',
    restaurantName: 'The Green Table (Indiranagar)',
    items: [
      { name: 'Basil Pesto Quinoa Bowl', price: 289, qty: 1 },
      { name: 'Smoky Paneer Tikka Wrap', price: 249, qty: 1 },
    ],
    subtotal: 538,
    discount: 50,
    couponCode: 'BLINK50',
    total: 513,
    statusStep: 3, // Step 3: Picked from Counter (Live Road Route Map active!)
    timestamp: '1:15 PM',
    driver: {
      name: 'Rajesh Kumar',
      phone: '+91 97444 55667',
      vehicle: 'Ather EV Bike (KA 01 EV 9821)',
    },
  })

  // Notification Toast
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    setAvailableCoupons(getCoupons().filter((c) => c.isActive))
  }, [])

  function triggerToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  // Re-validate applied coupon whenever cart subtotal changes
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.qty, 0)
  }, [cart])

  const totalCartItemCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0)
  }, [cart])

  useEffect(() => {
    if (!appliedCoupon) return
    const res = validateCoupon(appliedCoupon.code, cartSubtotal)
    if (res.valid) {
      setCouponDiscount(res.discountAmount)
    } else {
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponMessage({ type: 'error', text: res.message })
    }
  }, [cartSubtotal, appliedCoupon])

  // Cart Handlers
  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...item, qty: 1 }]
    })
    triggerToast(`Added ${item.name} to cart!`)
  }

  function updateItemQty(id: string, delta: number) {
    setCart(
      (prev) =>
        prev
          .map((item) => {
            if (item.id === id) {
              const newQty = item.qty + delta
              return newQty > 0 ? { ...item, qty: newQty } : null
            }
            return item
          })
          .filter(Boolean) as CartItem[]
    )
  }

  function removeFromCart(id: string) {
    setCart((prev) => prev.filter((item) => item.id !== id))
  }

  function clearCart() {
    setCart([])
    setAppliedCoupon(null)
    setCouponDiscount(0)
    setCouponMessage(null)
  }

  // Quick Reorder Action
  function handleQuickReorder() {
    const defaultItems: CartItem[] = [
      { ...sampleMenuItems[0], qty: 1 },
      { ...sampleMenuItems[1], qty: 1 },
    ]
    setCart(defaultItems)
    triggerToast('Added previous order items to your cart!')
    setShowCartDrawer(true)
  }

  // Coupon Handlers
  function handleApplyCouponCode(codeToApply?: string) {
    const targetCode = codeToApply || couponCodeInput
    if (!targetCode.trim()) return

    const res = validateCoupon(targetCode, cartSubtotal)
    if (res.valid && res.coupon) {
      setAppliedCoupon(res.coupon)
      setCouponDiscount(res.discountAmount)
      setCouponMessage({ type: 'success', text: res.message })
      setCouponCodeInput('')
    } else {
      setCouponMessage({ type: 'error', text: res.message })
    }
  }

  function handleRemoveCoupon() {
    setAppliedCoupon(null)
    setCouponDiscount(0)
    setCouponMessage(null)
  }

  // Price Calculations
  const deliveryFee = cartSubtotal >= 500 || cartSubtotal === 0 ? 0 : 40
  const packagingFee = cartSubtotal > 0 ? 25 : 0
  const grandTotal = Math.max(0, cartSubtotal - couponDiscount + deliveryFee + packagingFee)

  // Filtered Restaurants Logic
  const filteredRestaurants = useMemo(() => {
    return sampleRestaurants.filter((rest) => {
      const matchesSearch =
        rest.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.cuisine.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rest.address.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesTag =
        selectedTag === 'All' || rest.tag.toLowerCase() === selectedTag.toLowerCase()
      const matchesPureVeg = pureVegOnly ? rest.isPureVeg : true
      const matchesOffers = offersOnly ? Boolean(rest.offer) : true
      const matchesFast = fastDeliveryOnly ? parseInt(rest.eta) <= 20 : true
      return (
        matchesSearch &&
        matchesTag &&
        matchesPureVeg &&
        matchesOffers &&
        matchesFast
      )
    })
  }, [searchQuery, selectedTag, pureVegOnly, offersOnly, fastDeliveryOnly])

  function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    if (!utrRef.trim() || !upiId.trim()) return

    const orderId = `DRP-${Math.floor(1000 + Math.random() * 9000)}`
    const newOrder = {
      id: orderId,
      restaurantName: selectedRestaurant?.name || 'The Green Table',
      items: cart,
      subtotal: cartSubtotal,
      discount: couponDiscount,
      couponCode: appliedCoupon?.code,
      total: grandTotal,
      utrRef,
      upiId,
      statusStep: 1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      driver: {
        name: 'Rajesh Kumar',
        phone: '+91 97444 55667',
        vehicle: 'Ather EV Bike (KA 01 EV 9821)',
      },
    }

    // Also add to past orders history
    const historyEntry: PastOrder = {
      id: orderId,
      restaurantName: selectedRestaurant?.name || 'The Green Table',
      restaurantImage: selectedRestaurant?.image ||
        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: cartSubtotal,
      discount: couponDiscount,
      total: grandTotal,
      couponCode: appliedCoupon?.code,
      date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'Delivered',
      deliveryTime: '22 mins',
    }
    setPastOrders((prev) => [historyEntry, ...prev])

    setActiveOrder(newOrder)
    setPaymentDone(true)
    setTimeout(() => {
      setCart([])
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setUpiId('')
      setUtrRef('')
      setPaymentDone(false)
      setShowCheckoutModal(false)
      setShowCartDrawer(false)
      setSelectedRestaurant(null)
      setActiveTab('live-order')
    }, 1800)
  }

  function handleMarkDelivered() {
    setActiveOrder((prev: any) => ({ ...prev, statusStep: 4 }))
    triggerToast('Order marked as delivered! 🎉')
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] pb-24 text-[#18201c]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles className="size-4 text-[#d9f447]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Navigation Banner */}
      <div className="sticky top-0 z-30 border-b border-[#e6eae2] bg-white/95 backdrop-blur-md px-4 py-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f1f6da] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#687b14]">
                Customer Console
              </span>
              <span className="flex items-center gap-1 text-xs text-[#727d76]">
                <LocateFixed className="size-3.5 text-[#86a018]" />
                Deliver to: <span className="font-semibold text-[#18201c]">{deliveryAddress}</span>
              </span>
            </div>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl text-[#18201c]">
              Hello, {user?.name || 'Alex Rivera'}! 👋
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Header Cart Trigger */}
            <button
              onClick={() => setShowCartDrawer(true)}
              className="relative flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition active:scale-95"
            >
              <ShoppingCart className="size-4 text-[#d9f447]" />
              <span>Cart ({totalCartItemCount})</span>
              {cartSubtotal > 0 && <span className="text-[#d9f447]">· ₹{grandTotal}</span>}
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-[#d9f447] text-[10px] font-black text-[#18201c] shadow">
                  {totalCartItemCount}
                </span>
              )}
            </button>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 rounded-2xl bg-[#f0f3eb] p-1.5 text-xs font-bold flex-wrap">
              <button
                onClick={() => setActiveTab('explore')}
                className={`rounded-xl px-3 py-2 transition ${
                  activeTab === 'explore'
                    ? 'bg-white text-[#18201c] shadow-sm'
                    : 'text-[#65716a] hover:text-[#18201c]'
                }`}
              >
                🍽️ Explore
              </button>
              <button
                onClick={() => setActiveTab('live-order')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${
                  activeTab === 'live-order'
                    ? 'bg-white text-[#18201c] shadow-sm'
                    : 'text-[#65716a] hover:text-[#18201c]'
                }`}
              >
                <Bike className="size-3.5 text-[#859f17]" />
                Track Drop
                {activeOrder && activeOrder.statusStep < 4 && (
                  <span className="size-2 rounded-full bg-[#8fa71c] animate-pulse" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${
                  activeTab === 'orders'
                    ? 'bg-white text-[#18201c] shadow-sm'
                    : 'text-[#65716a] hover:text-[#18201c]'
                }`}
              >
                <History className="size-3.5" />
                Orders
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-2 transition ${
                  activeTab === 'profile'
                    ? 'bg-white text-[#18201c] shadow-sm'
                    : 'text-[#65716a] hover:text-[#18201c]'
                }`}
              >
                <User className="size-3.5" />
                Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        {activeTab === 'explore' && (
          <div className="flex flex-col gap-8">
            {/* Overview KPI Stat Highlights Bar */}
            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                  <Tag className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    Savings &amp; Cashback
                  </p>
                  <p className="text-base font-bold text-[#18201c]">₹150 Credit Active</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-800 font-bold">
                  <Sparkles className="size-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Member Status</p>
                  <p className="text-base font-bold text-purple-900">Gold Foodie Rewards</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold">
                  <Zap className="size-5 text-blue-600 fill-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    Avg Delivery Speed
                  </p>
                  <p className="text-base font-bold text-blue-900">22 mins Ultra Fast</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e1e6df] bg-white p-4 shadow-xs flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                  <ShoppingBag className="size-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    Total Completed Drops
                  </p>
                  <p className="text-base font-bold text-[#18201c]">12 Orders Placed</p>
                </div>
              </div>
            </div>

            {/* Promotional Offer Banners — Auto Carousel */}
            <div className="relative overflow-hidden rounded-3xl">
              {/* Track */}
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${promoSlide * 100}%)` }}
              >
                {/* Slide 1 — BLINK50 */}
                <div
                  onClick={() => handleApplyCouponCode('BLINK50')}
                  className="min-w-full group cursor-pointer overflow-hidden rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-500 to-amber-600 p-5 text-white shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-100 backdrop-blur-md">
                      Promo Code: BLINK50
                    </span>
                    <Percent className="size-5 text-amber-200" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold">50% OFF Up to ₹120</h3>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Valid on healthy bowls, salads &amp; vegan kitchens.
                  </p>
                  <div className="mt-3 font-bold text-xs text-white group-hover:underline flex items-center gap-1">
                    1-Click Apply Code <ArrowRight className="size-3.5" />
                  </div>
                </div>

                {/* Slide 2 — WELCOME100 */}
                <div
                  onClick={() => handleApplyCouponCode('WELCOME100')}
                  className="min-w-full group cursor-pointer overflow-hidden rounded-3xl border border-purple-300 bg-gradient-to-r from-purple-600 to-indigo-700 p-5 text-white shadow-sm transition hover:shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-100 backdrop-blur-md">
                      Promo Code: WELCOME100
                    </span>
                    <Sparkles className="size-5 text-purple-200" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold">Flat ₹100 OFF Discount</h3>
                  <p className="text-xs text-purple-100 mt-0.5">
                    Applicable on orders above ₹299 across all stores.
                  </p>
                  <div className="mt-3 font-bold text-xs text-white group-hover:underline flex items-center gap-1">
                    1-Click Apply Code <ArrowRight className="size-3.5" />
                  </div>
                </div>

                {/* Slide 3 — Free Delivery */}
                <div className="min-w-full overflow-hidden rounded-3xl border border-emerald-300 bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-100 backdrop-blur-md">
                      Free Delivery Guarantee
                    </span>
                    <Bike className="size-5 text-emerald-200" />
                  </div>
                  <h3 className="mt-3 text-lg font-bold">₹0 Delivery Fee</h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Automatically applied on all orders above ₹500.
                  </p>
                  <div className="mt-3 font-bold text-xs text-emerald-200">
                    Unlocked automatically
                  </div>
                </div>
              </div>

              {/* Dot Indicators + Progress bar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                {Array.from({ length: PROMO_COUNT }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPromoSlide(i)}
                    className={`rounded-full transition-all duration-300 ${
                      i === promoSlide
                        ? 'w-6 h-2 bg-white'
                        : 'w-2 h-2 bg-white/50 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Quick Reorder Previous Favorite Order */}
            <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-[#f1f6da] text-[#718714] shrink-0 font-bold">
                  <RotateCcw className="size-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">
                    Recent Order History
                  </span>
                  <h4 className="font-bold text-sm text-[#18201c]">
                    The Green Table — Basil Pesto Bowl + Paneer Wrap
                  </h4>
                  <p className="text-xs text-gray-500">Ordered 2 days ago · ₹538 Total</p>
                </div>
              </div>
              <button
                onClick={handleQuickReorder}
                className="rounded-full bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition flex items-center justify-center gap-1.5 shrink-0"
              >
                <RotateCcw className="size-3.5 text-[#d9f447]" /> Reorder in 1-Click
              </button>
            </div>

            {/* Search, Food Categories & Filter Pills */}
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search restaurants, cuisines (e.g. Biryani, Pizza, Momos), location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfe4dc] bg-white py-3 pl-11 pr-4 text-xs shadow-xs outline-none transition focus:border-[#86a018] focus:ring-2 focus:ring-[#d9f447]/50 font-medium"
                />
              </div>

              {/* Category Icon Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                {categoryList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedTag(cat.id)}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 font-bold transition shrink-0 ${
                      selectedTag === cat.id
                        ? 'bg-[#18201c] text-white shadow-md'
                        : 'border border-[#dfe4dc] bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Smart Filter Chips Bar */}
              <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
                <span className="font-bold text-gray-500 flex items-center gap-1 text-[11px] uppercase mr-1">
                  <Filter className="size-3.5 text-gray-600" /> Filters:
                </span>
                <button
                  onClick={() => setPureVegOnly(!pureVegOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    pureVegOnly
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🟢 Pure Veg
                </button>
                <button
                  onClick={() => setOffersOnly(!offersOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    offersOnly
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  🏷️ Offers Only
                </button>
                <button
                  onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    fastDeliveryOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  ⚡ Under 25 Mins
                </button>
              </div>
            </div>

            {/* Trending Quick-Add Dishes Row */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base text-[#18201c] flex items-center gap-1.5">
                    <Flame className="size-4 text-amber-500 fill-amber-500" /> Trending Dishes Near
                    You
                  </h3>
                  <p className="text-xs text-gray-500">
                    Add popular dishes directly to your basket in 1-click.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                {sampleMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-3 flex flex-col justify-between shadow-xs hover:border-gray-300 transition"
                  >
                    <div>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-24 w-full rounded-xl object-cover"
                      />
                      <p className="mt-2 font-bold text-xs text-[#18201c] line-clamp-1">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-gray-500">{item.restaurantName}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-gray-100">
                      <span className="font-bold text-xs text-[#18201c]">₹{item.price}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="rounded-full bg-[#d9f447] px-3 py-1 text-[11px] font-bold text-[#18201c] hover:scale-105 transition"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Restaurant Cards Grid (6 Curated Kitchens) */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-[#18201c]">
                    Featured Kitchens ({filteredRestaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Handpicked top rated restaurants delivering to Indiranagar.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {filteredRestaurants.map((rest) => (
                  <div
                    key={rest.id}
                    onClick={() => setSelectedRestaurant(rest)}
                    className="group cursor-pointer overflow-hidden rounded-3xl border border-[#e1e6df] bg-white transition hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-48 w-full overflow-hidden">
                        <img
                          src={rest.image}
                          alt={rest.name}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                        <div className="absolute left-3 top-3 flex items-center gap-1.5">
                          <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f5f15] backdrop-blur-md shadow-xs">
                            {rest.tag}
                          </span>
                          {rest.isPureVeg && (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-xs">
                              🟢 Pure Veg
                            </span>
                          )}
                        </div>

                        <span className="absolute bottom-3 right-3 rounded-full bg-[#18201c] px-3 py-1 text-[10px] font-bold text-white shadow-xs">
                          {rest.eta}
                        </span>

                        {rest.offer && (
                          <span className="absolute bottom-3 left-3 rounded-full bg-amber-400 px-3 py-1 text-[10px] font-extrabold text-[#18201c] shadow-md flex items-center gap-1">
                            <Tag className="size-3" /> {rest.offer}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-bold text-base tracking-tight text-[#18201c]">
                              {rest.name}
                            </h3>
                            <p className="mt-0.5 text-xs text-[#737e77]">{rest.cuisine}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-[#737e77]">
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3.5 text-[#8aa31c]" /> {rest.address} (
                            {rest.distance})
                          </span>
                          <span className="font-semibold text-gray-600">{rest.costForTwo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <div className="flex items-center justify-between border-t border-[#f0f3eb] pt-3 text-xs">
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          {rest.distance === '1.2 km' || rest.distance === '1.5 km'
                            ? '⚡ Free Express Delivery'
                            : 'Standard Delivery'}
                        </span>
                        <span className="font-bold text-[#86a018] group-hover:underline flex items-center gap-1">
                          View Menu <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {filteredRestaurants.length === 0 && (
                  <div className="col-span-3 rounded-3xl border border-gray-200 bg-white p-12 text-center text-gray-500">
                    <Search className="mx-auto size-12 text-gray-300 mb-2" />
                    <p className="font-bold text-base text-[#18201c]">
                      No Kitchens Found Matching Filters
                    </p>
                    <p className="text-xs mt-1">
                      Try resetting your search query or dietary filters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Orders History Tab */}
        {activeTab === 'orders' && (
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-bold text-[#18201c]">Your Orders</h2>
              <p className="mt-0.5 text-xs text-gray-500">{pastOrders.length} orders placed</p>
            </div>

            {pastOrders.length === 0 ? (
              <div className="rounded-3xl border border-[#e1e6df] bg-white p-16 text-center">
                <ShoppingBag className="mx-auto size-14 text-gray-200 mb-3" />
                <p className="font-bold text-[#18201c]">No Orders Yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  Your order history will appear here after your first order.
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="mt-5 rounded-full bg-[#18201c] px-6 py-2.5 text-xs font-bold text-white"
                >
                  Explore Kitchens
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pastOrders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-[#e1e6df] bg-white shadow-xs"
                  >
                    {/* Order Header */}
                    <div className="flex items-center gap-4 border-b border-[#f0f3ec] p-5">
                      <img
                        src={order.restaurantImage}
                        alt={order.restaurantName}
                        className="size-14 rounded-2xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                order.status === 'Delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'In Progress'
                                    ? 'bg-blue-100 text-blue-800 animate-pulse'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {order.status === 'Delivered' ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="size-3" /> Delivered
                                </span>
                              ) : order.status === 'In Progress' ? (
                                <span className="flex items-center gap-1">
                                  <Bike className="size-3" /> Out for Delivery
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <X className="size-3" /> Cancelled
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] text-gray-400">#{order.id}</span>
                          </div>
                        <h3 className="mt-1 font-bold text-sm text-[#18201c] truncate">
                          {order.restaurantName}
                        </h3>
                        <p className="text-[11px] text-gray-500">
                          {order.date} · {order.time}
                          {order.deliveryTime !== '—' && (
                            <span className="ml-2 text-emerald-700 font-semibold">
                              · 🚀 Delivered in {order.deliveryTime}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base text-[#18201c]">₹{order.total}</p>
                        {order.discount > 0 && (
                          <p className="text-[10px] text-emerald-700 font-semibold">-₹{order.discount} saved</p>
                        )}
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="px-5 py-3 border-b border-[#f5f6f3]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Items Ordered</p>
                      <div className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700">
                              {item.qty}× {item.name}
                            </span>
                            <span className="font-semibold text-[#18201c]">₹{item.price * item.qty}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 px-5 py-4">
                      {order.status === 'In Progress' && (
                        <button
                          onClick={() => setTrackingOrder(order)}
                          className="flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition"
                        >
                          <Navigation className="size-3.5" /> Track Order
                        </button>
                      )}
                      {order.status !== 'In Progress' && (
                        <button
                          onClick={() => {
                            const reorderCart: CartItem[] = order.items.map((item, i) => ({
                              id: `reorder_${order.id}_${i}`,
                              name: item.name,
                              detail: '',
                              price: item.price,
                              image:
                                'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85',
                              veg: true,
                              qty: item.qty,
                            }))
                            setCart(reorderCart)
                            triggerToast('Previous order added to cart!')
                            setShowCartDrawer(true)
                          }}
                          className="flex items-center gap-1.5 rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#323d36] transition"
                        >
                          <RotateCcw className="size-3.5 text-[#d9f447]" /> Reorder
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl flex flex-col gap-6">
            {/* Profile Card */}
            <div className="overflow-hidden rounded-3xl border border-[#e1e6df] bg-white shadow-xs">
              <div className="bg-gradient-to-r from-[#18201c] to-[#2d3d30] p-6 text-white">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] font-black text-2xl shrink-0">
                    {(user?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Customer Profile</p>
                    <h2 className="text-xl font-bold">{user?.name || 'Alex Rivera'}</h2>
                    <p className="text-xs text-white/70">{user?.email || 'alex@blinkbite.app'}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="rounded-full bg-amber-400/20 border border-amber-400/40 px-3 py-1 text-xs font-bold text-amber-300">
                      🏅 Gold Foodie
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-[#f0f3ec] border-t border-[#f0f3ec]">
                <div className="p-4 text-center">
                  <p className="text-xl font-bold text-[#18201c]">{pastOrders.filter((o) => o.status === 'Delivered').length}</p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Orders</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-xl font-bold text-emerald-700">
                    ₹{pastOrders.reduce((a, o) => a + o.discount, 0)}
                  </p>
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Saved</p>
                </div>
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                  <MapPin className="size-4 text-[#86a018]" /> Saved Delivery Address
                </h3>
                <button
                  onClick={() => setEditAddress(!editAddress)}
                  className="text-[11px] font-bold text-[#86a018] hover:underline"
                >
                  {editAddress ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {editAddress ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="flex-1 rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018] focus:ring-2 focus:ring-[#d9f447]/40"
                  />
                  <button
                    onClick={() => setEditAddress(false)}
                    className="rounded-xl bg-[#18201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#323d36] transition"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="rounded-xl bg-[#f8f9f6] border border-[#e8ece3] p-3 flex items-center gap-3">
                  <LocateFixed className="size-5 text-[#86a018] shrink-0" />
                  <p className="text-xs font-semibold text-[#18201c]">{deliveryAddress}</p>
                </div>
              )}
            </div>

            {/* Preferences */}
            <div className="rounded-3xl border border-[#e1e6df] bg-white p-5 shadow-xs">
              <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2 mb-4">
                <UtensilsCrossed className="size-4 text-[#86a018]" /> Food Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {['Pure Veg', 'Healthy Bowls', 'Fast Delivery', 'Top Rated', 'Offers & Deals'].map((pref) => (
                  <span
                    key={pref}
                    className="rounded-full border border-[#d5e07a] bg-[#f7fce0] px-3.5 py-1.5 text-[11px] font-bold text-[#5a6d10]"
                  >
                    {pref}
                  </span>
                ))}
              </div>
            </div>

            {/* Loyalty Points */}
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Blinkbite Rewards</p>
                  <h3 className="text-2xl font-black text-amber-900 mt-0.5">1,240 pts</h3>
                  <p className="text-xs text-amber-700 mt-1">Redeem 500 pts = ₹50 cashback</p>
                </div>
                <div className="text-right">
                  <div className="text-4xl">🏅</div>
                  <p className="text-[10px] font-bold text-amber-600 mt-1">Gold Member</p>
                </div>
              </div>
              <div className="mt-4 bg-amber-200/50 rounded-full h-2">
                <div className="bg-amber-500 rounded-full h-2" style={{ width: '62%' }} />
              </div>
              <p className="mt-1.5 text-[10px] text-amber-700">760 pts to Platinum</p>
            </div>
          </div>
        )}

        {/* Live Order Tracking View */}
        {activeTab === 'live-order' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {activeOrder ? (
              <div className="overflow-hidden rounded-3xl border border-[#dfe5db] bg-white shadow-lg">
                {/* Header Banner */}
                <div className="bg-[#18201c] p-6 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block rounded-full bg-[#d9f447] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-[#18201c]">
                          Live Order #{activeOrder.id}
                        </span>
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/50">
                          {activeOrder.statusStep === 1 && 'Order Confirmed'}
                          {activeOrder.statusStep === 2 && 'Kitchen Cooking'}
                          {activeOrder.statusStep === 3 && 'Picked from Counter • Out for Delivery'}
                          {activeOrder.statusStep === 4 && 'Delivered to Doorstep'}
                        </span>
                      </div>
                      <h2 className="mt-2 text-2xl font-bold">{activeOrder.restaurantName}</h2>
                      <p className="mt-1 text-xs text-white/70">
                        Placed at {activeOrder.timestamp} · Total ₹{activeOrder.total}
                        {activeOrder.couponCode && (
                          <span className="ml-2 text-[#d9f447]">
                            ({activeOrder.couponCode} applied)
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#d9f447]">Estimated Delivery</p>
                      <p className="text-xl font-extrabold">18 - 22 mins</p>
                    </div>
                  </div>
                </div>

                {/* Progress Steps Tracker */}
                <div className="p-6 border-b border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Order Status Steps (Click any step to toggle view):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-semibold">
                    <button
                      onClick={() => setActiveOrder((prev: any) => ({ ...prev, statusStep: 1 }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition ${
                        activeOrder.statusStep >= 1 ? 'text-[#18201c]' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full font-bold transition ${
                          activeOrder.statusStep === 1
                            ? 'bg-[#d9f447] text-[#18201c] ring-4 ring-[#d9f447]/20 scale-105'
                            : activeOrder.statusStep > 1
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {activeOrder.statusStep > 1 ? <Check className="size-4" /> : '1'}
                      </span>
                      <span className="text-[11px]">1. Confirmed</span>
                    </button>

                    <button
                      onClick={() => setActiveOrder((prev: any) => ({ ...prev, statusStep: 2 }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition ${
                        activeOrder.statusStep >= 2 ? 'text-[#18201c]' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full font-bold transition ${
                          activeOrder.statusStep === 2
                            ? 'bg-[#d9f447] text-[#18201c] ring-4 ring-[#d9f447]/20 scale-105'
                            : activeOrder.statusStep > 2
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {activeOrder.statusStep > 2 ? <Check className="size-4" /> : '2'}
                      </span>
                      <span className="text-[11px]">2. Kitchen Cooking</span>
                    </button>

                    <button
                      onClick={() => setActiveOrder((prev: any) => ({ ...prev, statusStep: 3 }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition ${
                        activeOrder.statusStep >= 3 ? 'text-[#18201c]' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full font-bold transition ${
                          activeOrder.statusStep === 3
                            ? 'bg-emerald-500 text-white ring-4 ring-emerald-500/20 scale-105 animate-pulse'
                            : activeOrder.statusStep > 3
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {activeOrder.statusStep > 3 ? <Check className="size-4" /> : '3'}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">
                        3. Picked from Counter
                      </span>
                    </button>

                    <button
                      onClick={() => setActiveOrder((prev: any) => ({ ...prev, statusStep: 4 }))}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-xl transition ${
                        activeOrder.statusStep >= 4 ? 'text-[#18201c]' : 'text-gray-400'
                      }`}
                    >
                      <span
                        className={`grid size-9 place-items-center rounded-full font-bold transition ${
                          activeOrder.statusStep === 4
                            ? 'bg-emerald-600 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        4
                      </span>
                      <span className="text-[11px]">4. Delivered</span>
                    </button>
                  </div>
                </div>

                {/* LIVE MAP TRACKING CARD — UNLOCKED WHEN ORDER IS PICKED FROM COUNTER (statusStep >= 3) */}
                {activeOrder.statusStep >= 3 ? (
                  <div className="p-6 bg-[#f8f9f6] border-b border-gray-200 flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                          <Compass
                            className="size-5 text-emerald-600 animate-spin"
                            style={{ animationDuration: '6s' }}
                          />
                          Live Rider Parcel Tracking — Store to Customer Doorstep
                        </h4>
                        <p className="text-xs text-[#737e77]">
                          Parcel collected from {activeOrder.restaurantName} counter. Tracking rider
                          moving live on road to {deliveryAddress}.
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-300 shrink-0">
                        <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                        Live Road GPS Route Active
                      </span>
                    </div>

                    {/* Mapcn Component with OSRM Road Route */}
                    <Mapcn
                      pickupCoords={[12.9784, 77.6408]}
                      dropoffCoords={[12.9352, 77.6245]}
                      driverCoords={[12.958, 77.632]}
                      restaurantName={activeOrder.restaurantName}
                      customerAddress={deliveryAddress}
                      height="h-72 sm:h-80 lg:h-[380px]"
                    />
                  </div>
                ) : (
                  /* BEFORE PICKUP STATE (Step 1 & 2) */
                  <div className="p-8 text-center bg-gray-50/70 border-b border-gray-200">
                    <div className="mx-auto size-14 rounded-full bg-amber-100 text-amber-800 grid place-items-center mb-3">
                      <Clock3 className="size-7 animate-spin" style={{ animationDuration: '8s' }} />
                    </div>
                    <h4 className="font-bold text-base text-[#18201c]">
                      Order Being Prepared in Kitchen
                    </h4>
                    <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
                      Your meal is currently being freshly cooked at the kitchen counter. Live map
                      tracking will automatically unlock as soon as the rider picks up your parcel
                      from the counter!
                    </p>
                    <div className="mt-5 flex items-center gap-3 justify-center">
                      <button
                        onClick={() => setActiveOrder((prev: any) => ({ ...prev, statusStep: 3 }))}
                        className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                      >
                        <PackageCheck className="size-4" /> Simulate Rider Picking Order
                      </button>
                    </div>
                  </div>
                )}

                {/* Driver Details + Delivered Button */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[#18201c] text-white shrink-0">
                      <Bike className="size-6 text-[#d9f447]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#737e77]">Assigned Delivery Partner</p>
                      <p className="font-bold text-sm text-[#18201c]">{activeOrder.driver.name}</p>
                      <p className="text-xs text-[#849a17]">{activeOrder.driver.vehicle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${activeOrder.driver.phone}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#d8ded4] bg-white px-4 py-2 text-xs font-bold text-[#18201c] hover:bg-gray-50 transition shadow-xs"
                    >
                      <PhoneCall className="size-3.5 text-[#829b14]" />
                      Call Partner
                    </a>
                    {activeOrder.statusStep >= 3 && activeOrder.statusStep < 4 && (
                      <button
                        onClick={handleMarkDelivered}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                      >
                        <CheckCircle2 className="size-3.5" /> Mark Delivered
                      </button>
                    )}
                    {activeOrder.statusStep === 4 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-4 py-2 text-xs font-bold">
                        <Check className="size-3.5" /> Order Delivered!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#e1e6df] bg-white p-12 text-center">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5db] text-[#7f9815]">
                  <ShoppingBag className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold">No Active Order Right Now</h3>
                <p className="mt-1 text-xs text-[#747e78] max-w-sm mx-auto">
                  Browse your favourite restaurants and place an order to see live delivery tracking
                  here.
                </p>
                <button
                  onClick={() => setActiveTab('explore')}
                  className="mt-6 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white"
                >
                  Explore Kitchens
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Restaurant Menu Modal */}
      {selectedRestaurant && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#18201c]/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-[#f0f3ec] pb-4">
              <div>
                <span className="rounded-full bg-[#f1f6d9] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#5a6d10]">
                  {selectedRestaurant.tag}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-[#18201c]">
                  {selectedRestaurant.name}
                </h2>
                <p className="text-xs text-[#747f78]">
                  {selectedRestaurant.cuisine} · {selectedRestaurant.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="grid size-8 place-items-center rounded-full bg-[#f0f3ec] text-[#636e68]"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="mt-5 flex flex-col gap-4">
              {sampleMenuItems.map((item) => {
                const inCart = cart.find((i) => i.id === item.id)
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-[#e5e9e1] p-3 transition hover:border-[#a8be2b]"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="size-20 rounded-xl object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[#18201c]">{item.name}</h4>
                      <p className="text-xs text-[#727d76] line-clamp-2 mt-0.5">{item.detail}</p>
                      <p className="mt-2 text-sm font-bold text-[#18201c]">₹{item.price}</p>
                    </div>

                    {inCart ? (
                      <div className="flex items-center gap-2 rounded-full bg-[#18201c] px-3 py-1.5 text-xs font-bold text-white shadow-xs">
                        <button
                          onClick={() => updateItemQty(item.id, -1)}
                          className="hover:text-[#d9f447]"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span>{inCart.qty}</span>
                        <button
                          onClick={() => updateItemQty(item.id, 1)}
                          className="hover:text-[#d9f447]"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center gap-1.5 rounded-full bg-[#d9f447] px-4 py-2 text-xs font-bold text-[#18201c] transition hover:scale-105"
                      >
                        <Plus className="size-3.5" />
                        Add
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Sticky Cart Bar inside menu modal */}
            {cart.length > 0 && (
              <div className="sticky bottom-0 mt-6 rounded-2xl bg-[#18201c] p-4 text-white flex items-center justify-between shadow-xl border border-white/10">
                <div>
                  <p className="text-xs text-white/70">{totalCartItemCount} items in cart</p>
                  <p className="text-lg font-bold text-[#d9f447]">₹{grandTotal}</p>
                </div>
                <button
                  onClick={() => setShowCartDrawer(true)}
                  className="flex items-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-bold text-[#18201c] shadow-md hover:scale-105 transition"
                >
                  View Cart &amp; Coupons <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULL FEATURED CART DRAWER / MODAL */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
              {/* Cart Drawer Header */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#86a018] bg-[#f1f6da] px-2.5 py-0.5 rounded-full">
                    Your Shopping Basket
                  </span>
                  <h3 className="text-xl font-bold text-[#18201c] mt-1">
                    Items in Cart ({totalCartItemCount})
                  </h3>
                </div>
                <button
                  onClick={() => setShowCartDrawer(false)}
                  className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Cart Items List */}
              {cart.length > 0 ? (
                <div className="mt-4 flex flex-col gap-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 p-3 bg-gray-50/50"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-12 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-bold text-xs text-[#18201c]">{item.name}</p>
                          <p className="text-[11px] text-gray-500">₹{item.price} each</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-xl bg-white border border-gray-200 px-2.5 py-1 text-xs font-bold shadow-xs">
                          <button
                            onClick={() => updateItemQty(item.id, -1)}
                            className="text-gray-600 hover:text-black"
                          >
                            <Minus className="size-3" />
                          </button>
                          <span>{item.qty}</span>
                          <button
                            onClick={() => updateItemQty(item.id, 1)}
                            className="text-gray-600 hover:text-black"
                          >
                            <Plus className="size-3" />
                          </button>
                        </div>
                        <span className="font-bold text-xs text-[#18201c] w-12 text-right">
                          ₹{item.price * item.qty}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-rose-500 hover:text-rose-700 transition"
                          title="Remove Item"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* PROMOTIONAL COUPON SECTION */}
                  <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                        <Tag className="size-4 text-purple-600" /> Apply Coupon &amp; Offers
                      </span>
                      {appliedCoupon && (
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-[11px] font-bold text-rose-600 hover:underline"
                        >
                          Remove Coupon
                        </button>
                      )}
                    </div>

                    {/* Active Coupon Badge or Input */}
                    {appliedCoupon ? (
                      <div className="mt-3 flex items-center justify-between rounded-xl bg-white p-3 border border-purple-300 shadow-xs">
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-lg bg-purple-100 text-purple-800 font-bold font-mono text-xs">
                            🎟️
                          </span>
                          <div>
                            <p className="font-bold text-xs text-purple-950 font-mono tracking-wider">
                              '{appliedCoupon.code}' APPLIED!
                            </p>
                            <p className="text-[10px] text-emerald-700 font-semibold">
                              You save ₹{couponDiscount} on this order!
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          -₹{couponDiscount}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          placeholder="Enter Promo Code (e.g. BLINK50)"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                          className="flex-1 rounded-xl border border-purple-300 px-3.5 py-2 text-xs font-mono font-bold uppercase outline-none focus:border-purple-600 bg-white"
                        />
                        <button
                          onClick={() => handleApplyCouponCode()}
                          className="rounded-xl bg-purple-900 px-4 py-2 text-xs font-bold text-white hover:bg-purple-950 transition shadow-xs"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {/* Alert Feedback */}
                    {couponMessage && (
                      <div
                        className={`mt-2 rounded-xl p-2.5 text-[11px] font-medium flex items-center gap-1.5 ${
                          couponMessage.type === 'success'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                        }`}
                      >
                        {couponMessage.type === 'success' ? (
                          <Sparkles className="size-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="size-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{couponMessage.text}</span>
                      </div>
                    )}

                    {/* Quick Available Coupons List */}
                    {!appliedCoupon && availableCoupons.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-200/60">
                        <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
                          Available Promo Codes:
                        </span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {availableCoupons.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleApplyCouponCode(c.code)}
                              className="group flex items-center gap-1.5 rounded-xl border border-purple-300 bg-white px-3 py-1.5 text-[11px] font-bold text-purple-950 shadow-xs hover:bg-purple-900 hover:text-white transition"
                            >
                              <span className="font-mono text-purple-700 group-hover:text-amber-300">
                                {c.code}
                              </span>
                              <span className="text-[9px] text-gray-500 group-hover:text-purple-200">
                                (
                                {c.discountType === 'percentage'
                                  ? `${c.discountValue}% OFF`
                                  : `₹${c.discountValue} OFF`}
                                )
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Price Summary Breakdown */}
                  <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-xs flex flex-col gap-2 border border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Items</span>
                      <span className="font-semibold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>

                    {couponDiscount > 0 && (
                      <div className="flex justify-between font-bold text-emerald-700">
                        <span>Promo Coupon Discount ({appliedCoupon?.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Packaging &amp; Restaurant Taxes</span>
                      <span className="font-semibold text-[#18201c]">₹{packagingFee}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      {deliveryFee === 0 ? (
                        <span className="font-bold text-emerald-700">FREE (Orders &gt; ₹500)</span>
                      ) : (
                        <span className="font-semibold text-[#18201c]">₹{deliveryFee}</span>
                      )}
                    </div>

                    <div className="flex justify-between border-t border-gray-200 pt-2 font-bold text-sm text-[#18201c]">
                      <span>To Pay Total</span>
                      <span className="text-emerald-700 text-base">₹{grandTotal}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-500">
                  <ShoppingCart className="mx-auto size-12 text-gray-300 mb-2" />
                  <p className="font-bold text-[#18201c]">Your Cart is Empty</p>
                  <p className="mt-1">Add delicious items from kitchens to get started!</p>
                </div>
              )}
            </div>

            {/* Cart Footer Action */}
            {cart.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-4 flex gap-3">
                <button
                  onClick={clearCart}
                  className="rounded-full border border-gray-300 px-4 py-3 text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setShowCartDrawer(false)
                    setShowCheckoutModal(true)
                  }}
                  className="flex-1 rounded-full bg-[#18201c] py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition flex items-center justify-center gap-2"
                >
                  Proceed to Payment (₹{grandTotal}){' '}
                  <ArrowRight className="size-4 text-[#d9f447]" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout & UPI Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[500px] rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#eff2ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">
                  Secure Checkout
                </p>
                <h3 className="text-xl font-bold">Complete Payment</h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="grid size-8 place-items-center rounded-full bg-gray-100"
              >
                <X className="size-4" />
              </button>
            </div>

            {paymentDone ? (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#d9f447] text-[#18201c]">
                  <Check className="size-8" />
                </div>
                <h4 className="mt-4 text-xl font-bold">Payment Submitted!</h4>
                <p className="mt-1 text-xs text-[#737e77]">
                  Your reference UTR has been logged. Preparing your food!
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 flex flex-col gap-4">
                <div className="rounded-2xl bg-[#f8f9f6] p-4 text-xs">
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Items Subtotal ({totalCartItemCount} items)</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between py-1 font-bold text-emerald-700">
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Delivery &amp; Taxes</span>
                    <span>₹{deliveryFee + packagingFee}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#e2e7dd] font-bold text-sm text-[#18201c]">
                    <span>Total Amount</span>
                    <span className="text-emerald-700">₹{grandTotal}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">Your UPI VPA / ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. alex@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">
                    12-digit UTR / Payment Ref Number
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 428190021389"
                    value={utrRef}
                    onChange={(e) => setUtrRef(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018]"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36]"
                >
                  Confirm &amp; Submit Order (₹{grandTotal})
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Track Order Modal */}
      {trackingOrder && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-[#18201c]/70 p-0 sm:p-4 backdrop-blur-sm">
          <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f3ec] shrink-0">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">Live Tracking</p>
                <h3 className="font-bold text-base text-[#18201c]">Order #{trackingOrder.id}</h3>
                <p className="text-[11px] text-gray-500">{trackingOrder.restaurantName}</p>
              </div>
              <button
                onClick={() => setTrackingOrder(null)}
                className="grid size-8 place-items-center rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 flex flex-col gap-5 p-5">

              {/* 4-Step Status Timeline */}
              {(() => {
                const steps = [
                  { label: 'Order Placed', icon: CheckCircle2, color: 'emerald' },
                  { label: 'Preparing', icon: Clock3, color: 'amber' },
                  { label: 'Picked Up', icon: PackageCheck, color: 'blue' },
                  { label: 'On the way', icon: Bike, color: 'blue' },
                ]
                const step = trackingOrder.trackStep ?? 2
                return (
                  <div className="flex items-center justify-between gap-1">
                    {steps.map((s, i) => {
                      const Icon = s.icon
                      const done = i <= step
                      const active = i === step
                      return (
                        <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                          <div
                            className={`grid size-9 place-items-center rounded-full transition ${
                              active
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110'
                                : done
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-gray-100 text-gray-300'
                            }`}
                          >
                            <Icon className="size-4" />
                          </div>
                          <span className={`text-[9px] font-bold text-center leading-tight ${active ? 'text-blue-700' : done ? 'text-emerald-700' : 'text-gray-400'}`}>
                            {s.label}
                          </span>
                          {i < steps.length - 1 && (
                            <div className={`absolute hidden`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Progress Bar */}
              <div className="h-1.5 bg-gray-100 rounded-full -mt-2">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-700"
                  style={{ width: `${(((trackingOrder.trackStep ?? 2) + 1) / 4) * 100}%` }}
                />
              </div>

              {/* Map */}
              <div className="rounded-2xl overflow-hidden h-44 border border-[#e1e6df] relative">
                <Mapcn className="w-full h-full" />
                {/* Driver pin overlay */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 pointer-events-none">
                  <div className="grid size-10 place-items-center rounded-full bg-blue-600 text-white shadow-xl border-2 border-white animate-bounce">
                    <Bike className="size-5" />
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-blue-800 shadow border border-blue-200">
                    {trackingOrder.driverName || 'Rajesh Kumar'} • ~8 mins
                  </span>
                </div>
              </div>

              {/* Driver Info */}
              <div className="flex items-center justify-between rounded-2xl bg-[#f8f9f6] border border-[#e8ece3] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold text-xs shrink-0">
                    {(trackingOrder.driverName || 'RK').split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#18201c]">{trackingOrder.driverName || 'Rajesh Kumar'}</p>
                    <p className="text-[10px] text-gray-500">Your delivery partner</p>
                  </div>
                </div>
                <a
                  href={`tel:${trackingOrder.driverPhone || '+919744455667'}`}
                  className="flex items-center gap-1.5 rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  <PhoneCall className="size-3.5" /> Call
                </a>
              </div>

              {/* OTP + QR Code */}
              <div className="rounded-2xl border border-[#e1e6df] bg-white p-4 flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Delivery OTP — Share with driver
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    {(trackingOrder.otp || '4921').split('').map((digit, i) => (
                      <span
                        key={i}
                        className="grid size-12 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] text-2xl font-black tracking-widest shadow-md"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2 text-[10px] text-gray-400">
                    Only share when driver arrives at your door
                  </p>
                </div>

                {/* QR Code */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=90x90&data=${trackingOrder.otp || '4921'}&bgcolor=ffffff&color=18201c&margin=4`}
                    alt={`QR for OTP ${trackingOrder.otp || '4921'}`}
                    className="size-[90px] rounded-xl border border-[#e1e6df] shadow-sm"
                  />
                  <span className="text-[9px] text-gray-400 font-semibold">Scan QR</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

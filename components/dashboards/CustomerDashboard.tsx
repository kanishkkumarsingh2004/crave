'use client'

import { useAuth } from '@/lib/auth-context'
import {
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Compass,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  History,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  PackageCheck,
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
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

const Mapcn = dynamic(() => import('@/components/ui/mapcn'), { ssr: false })

import { Coupon, getCoupons, validateCoupon } from '@/lib/coupons'
import { supabase } from '@/lib/supabase'

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
  trackStep?: number
  otp?: string
  driverName?: string
  driverPhone?: string
}

const samplePastOrders: PastOrder[] = []

const sampleRestaurants: Restaurant[] = [
  {
    id: 'rest_1',
    name: 'The Green Table',
    cuisine: 'Healthy bowls · Salads · Vegan',
    rating: '4.9',
    ratingCount: '1.2k+',
    eta: '20–25 min',
    distance: '1.2 km',
    costForTwo: '₹400 for two',
    image:
      'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
    tag: 'Healthy',
    address: 'Koramangala 5th Block, Bengaluru',
    offer: '50% OFF up to ₹100',
    isPureVeg: true,
  },
]

const sampleMenuItems: MenuItem[] = [
  {
    id: 'menu_1',
    name: 'Avocado Quinoa Harvest Bowl',
    detail: 'Organic quinoa topped with wild basil pesto, roasted cherry tomatoes & pine nuts',
    price: 289,
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'The Green Table',
  },
  {
    id: 'menu_2',
    name: 'Smoky Paneer Tikka Wrap',
    detail: 'Char-grilled cottage cheese wrapped in whole wheat tortilla with mint yogurt',
    price: 249,
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'The Green Table',
  },
  {
    id: 'menu_3',
    name: 'Steamed Truffle Edamame Momos',
    detail: 'Delicate dumplings stuffed with smashed edamame and black truffle oil',
    price: 320,
    image:
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=500&q=85',
    veg: true,
    restaurantName: 'The Green Table',
  },
]

const categoryList = [
  {
    id: 'All',
    label: 'All Items',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Healthy',
    label: 'Healthy Bowls',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Wraps',
    label: 'Wraps & Rolls',
    image: 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Starters',
    label: 'Asian Momos',
    image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
  },
]

export default function CustomerDashboard({
  initialTab = 'explore',
}: {
  initialTab?: 'explore' | 'live-order' | 'orders' | 'profile'
}) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const currentTabFromPath = useMemo(() => {
    if (pathname.includes('/user/track')) return 'live-order'
    if (pathname.includes('/user/orders')) return 'orders'
    if (pathname.includes('/user/profile')) return 'profile'
    if (pathname.includes('/user/explore')) return 'explore'
    return initialTab
  }, [pathname, initialTab])

  const [activeTab, setActiveTab] = useState<'explore' | 'live-order' | 'orders' | 'profile'>(
    currentTabFromPath
  )

  useEffect(() => {
    setActiveTab(currentTabFromPath)
  }, [currentTabFromPath])

  const navigateToTab = (tab: 'explore' | 'live-order' | 'orders' | 'profile') => {
    setActiveTab(tab)
    if (tab === 'explore') router.push('/user/explore')
    else if (tab === 'live-order') router.push('/user/track')
    else if (tab === 'orders') router.push('/user/orders')
    else if (tab === 'profile') router.push('/user/profile')
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTag, setSelectedTag] = useState<string>('All')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)

  // Filter Toggles
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)

  // Track Order modal
  const [trackingOrder, setTrackingOrder] = useState<PastOrder | null>(null)

  // Cart & Menu State
  const [cart, setCart] = useState<CartItem[]>([])
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>(sampleMenuItems)
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [pastOrders, setPastOrders] = useState<PastOrder[]>(samplePastOrders)

  // Fetch Live Menu Items from Supabase
  useEffect(() => {
    async function fetchLiveMenuItems() {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', 'rest_1')

        if (!error && data && data.length > 0) {
          const parsed: MenuItem[] = data
            .filter((item) => item.in_stock !== false)
            .map((item) => ({
              id: item.id,
              name: item.name,
              detail: item.description || '',
              price: Number(item.price),
              image:
                item.image ||
                'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=500&q=85',
              veg: true,
              restaurantName: 'The Green Table',
            }))
          if (parsed.length > 0) {
            setMenuItemsList(parsed)
          }
        }
      } catch (err) {}
    }
    fetchLiveMenuItems()
    const interval = setInterval(fetchLiveMenuItems, 4000)
    return () => clearInterval(interval)
  }, [])

  // Saved Addresses State & GPS Map Picker
  const [savedAddresses, setSavedAddresses] = useState([
    {
      id: 'addr-1',
      label: 'Home',
      address: 'Indiranagar 100ft Rd, Bengaluru',
      tag: 'Primary',
      lat: 12.9716,
      lng: 77.5946,
    },
    {
      id: 'addr-2',
      label: 'Work',
      address: 'Prestige Tech Park, Marathahalli, Bengaluru',
      tag: 'Office',
      lat: 12.9366,
      lng: 77.6953,
    },
    {
      id: 'addr-3',
      label: 'Apartment',
      address: 'Orio Lavish PG, Doddakallasandra, Bengaluru',
      tag: 'Other',
      lat: 12.8874,
      lng: 77.5512,
    },
  ])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [gpsDetecting, setGpsDetecting] = useState(false)
  const [selectedMapPin, setSelectedMapPin] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  })
  const [newAddressInput, setNewAddressInput] = useState('')
  const [newAddressLabel, setNewAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home')

  function handleDetectGpsLocation() {
    setGpsDetecting(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4))
          const lng = parseFloat(pos.coords.longitude.toFixed(4))
          const detectedAddr = `${lat}° N, ${lng}° E • Indiranagar 100ft Rd, Bengaluru`
          setSelectedMapPin({ lat, lng })
          setDeliveryAddress(detectedAddr)
          setGpsDetecting(false)
          triggerToast(`GPS Location Detected: ${lat}° N, ${lng}° E`)
        },
        () => {
          const fallbackLat = 12.9716
          const fallbackLng = 77.5946
          const fallbackAddr = `12.9716° N, 77.5946° E • Indiranagar 100ft Rd, Bengaluru`
          setSelectedMapPin({ lat: fallbackLat, lng: fallbackLng })
          setDeliveryAddress(fallbackAddr)
          setGpsDetecting(false)
          triggerToast('GPS Location Detected: Indiranagar, Bengaluru')
        },
        { timeout: 4000 }
      )
    } else {
      setGpsDetecting(false)
      triggerToast('Geolocation is not supported by your browser')
    }
  }

  function handleAddNewAddress() {
    if (!newAddressInput.trim()) {
      triggerToast('Please enter an address or drop a pin on the map!')
      return
    }
    const newEntry = {
      id: `addr-${Date.now()}`,
      label: newAddressLabel,
      address: newAddressInput.trim(),
      tag: newAddressLabel,
      lat: selectedMapPin.lat,
      lng: selectedMapPin.lng,
    }
    setSavedAddresses((prev) => [newEntry, ...prev])
    setDeliveryAddress(newEntry.address)
    setNewAddressInput('')
    setShowLocationModal(false)
    triggerToast(`Address added & set as current delivery location!`)
  }

  // Profile editing
  const [editAddress, setEditAddress] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.address || 'Indiranagar 100ft Rd, Bengaluru'
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

  // Payment State & Company UPI ID
  const [companyUpiId, setCompanyUpiId] = useState('crave@upi')
  const [upiId, setUpiId] = useState('')
  const [utrRef, setUtrRef] = useState('')
  const [upiError, setUpiError] = useState('')
  const [utrError, setUtrError] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>(null)

  // Fetch Company UPI Config from Supabase
  useEffect(() => {
    async function loadCompanyUpi() {
      try {
        const { data } = await supabase
          .from('payment_configs')
          .select('upi_id')
          .single()
        if (data?.upi_id) {
          setCompanyUpiId(data.upi_id)
        }
      } catch (e) {
        // Fallback to crave@upi
      }
    }
    loadCompanyUpi()
  }, [])

  // Notification Toast
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    setAvailableCoupons(getCoupons().filter((c) => c.isActive))
  }, [])

  function triggerToast(msg: string) {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  function handleCopyCompanyUpi() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(companyUpiId)
      triggerToast(`Copied UPI ID: ${companyUpiId}`)
    }
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

  // State for Single-Restaurant Cart Conflict Modal
  const [conflictModal, setConflictModal] = useState<{
    open: boolean
    currentRest: string
    newRest: string
    newItem: MenuItem | null
  }>({ open: false, currentRest: '', newRest: '', newItem: null })

  // State for 3-Minute Payment Verification Window
  const [verifyingModal, setVerifyingModal] = useState<{
    open: boolean
    timer: number
    orderId: string
    status: 'verifying' | 'verified' | 'rejected'
  }>({ open: false, timer: 180, orderId: '', status: 'verifying' })

  // Cart Handlers
  function addToCart(item: MenuItem) {
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'The Green Table'
    if (cart.length > 0) {
      const currentRest = cart[0].restaurantName || selectedRestaurant?.name || 'The Green Table'
      if (currentRest !== itemRest) {
        setConflictModal({
          open: true,
          currentRest,
          newRest: itemRest,
          newItem: item,
        })
        return
      }
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i))
      }
      return [...prev, { ...item, qty: 1, restaurantName: itemRest }]
    })
    triggerToast(`Added ${item.name} to cart!`)
  }

  function handleResolveConflictClear() {
    if (!conflictModal.newItem) return
    const item = conflictModal.newItem
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'The Green Table'
    setCart([{ ...item, qty: 1, restaurantName: itemRest }])
    setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
    triggerToast(`Cart reset. Added ${item.name} from ${itemRest}!`)
  }

  function updateItemQty(id: string, delta: number) {
    setCart((prev) =>
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
      const matchesFast = fastDeliveryOnly ? parseInt(rest.eta) <= 25 : true
      return matchesSearch && matchesTag && matchesPureVeg && matchesOffers && matchesFast
    })
  }, [searchQuery, selectedTag, pureVegOnly, offersOnly, fastDeliveryOnly])

  // 3-Minute Payment Verification Countdown Effect & Realtime Sync
  useEffect(() => {
    if (!verifyingModal.open || verifyingModal.status !== 'verifying') return

    const countdownTimer = setInterval(() => {
      setVerifyingModal((prev) => {
        if (prev.timer <= 1) {
          clearInterval(countdownTimer)
          return { ...prev, timer: 0 }
        }
        return { ...prev, timer: prev.timer - 1 }
      })
    }, 1000)

    const checkApproval = async () => {
      try {
        const { data } = await supabase
          .from('payment_reviews')
          .select('status')
          .eq('order_id', verifyingModal.orderId)
          .maybeSingle()

        if (data?.status === 'verified') {
          setVerifyingModal((prev) => ({ ...prev, status: 'verified' }))
          triggerToast('Payment Approved by Admin! Order sent to kitchen.')
          setTimeout(() => {
            setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })
            setCart([])
            setShowCheckoutModal(false)
            setPaymentDone(true)
            navigateToTab('live-order')
          }, 2000)
        } else if (data?.status === 'rejected') {
          setVerifyingModal((prev) => ({ ...prev, status: 'rejected' }))
        }
      } catch (e) {}
    }

    const pollTimer = setInterval(checkApproval, 3000)

    return () => {
      clearInterval(countdownTimer)
      clearInterval(pollTimer)
    }
  }, [verifyingModal.open, verifyingModal.status, verifyingModal.orderId])

  async function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    setUpiError('')
    setUtrError('')

    const cleanUpi = upiId.trim()
    const cleanUtr = utrRef.trim()

    if (!cleanUpi.includes('@') || cleanUpi.length < 5) {
      setUpiError('Please enter a valid UPI VPA (e.g. name@upi)')
      return
    }

    if (!/^\d{12}$/.test(cleanUtr)) {
      setUtrError('UTR number must be exactly 12 numeric digits')
      return
    }

    const orderId = `DRP-${Math.floor(1000 + Math.random() * 9000)}`
    const restName = selectedRestaurant?.name || 'The Green Table'
    const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString()

    const cartWithOtp = cart.map((i) => ({ ...i, otp: generatedOtp }))

    const newOrder = {
      id: orderId,
      restaurantName: restName,
      items: cartWithOtp,
      subtotal: cartSubtotal,
      discount: couponDiscount,
      couponCode: appliedCoupon?.code,
      total: grandTotal,
      utrRef: cleanUtr,
      upiId: cleanUpi,
      statusStep: 1,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      otp: generatedOtp,
      driver: {
        name: 'Rajesh Kumar',
        phone: '+91 97444 55667',
        vehicle: 'Ather EV Bike (KA 01 EV 9821)',
      },
    }

    try {
      await supabase.from('orders').insert([
        {
          id: orderId,
          customer_id: user?.id || 'usr_cust_1',
          customer_name: user?.name || 'Alex Rivera',
          customer_phone: user?.phone || '+91 98765 43210',
          customer_address: deliveryAddress,
          restaurant_id: selectedRestaurant?.id || 'rest_1',
          restaurant_name: restName,
          items: JSON.stringify(cartWithOtp),
          subtotal: cartSubtotal,
          packaging_fee: packagingFee,
          gst: Math.round(cartSubtotal * 0.05),
          total_amount: grandTotal,
          status: 'new',
          driver_name: 'Rajesh Kumar',
          driver_phone: '+91 97444 55667',
          payment_method: 'UPI Online',
        },
      ])

      await supabase.from('payment_reviews').insert([
        {
          id: `pay_${Date.now()}`,
          order_id: orderId,
          utr_ref: cleanUtr,
          customer_vpa: cleanUpi,
          amount: grandTotal,
          status: 'pending',
        },
      ])
    } catch (err) {
      console.error('Failed to submit order to Supabase:', err)
    }

    const historyEntry: PastOrder = {
      id: orderId,
      restaurantName: restName,
      restaurantImage:
        selectedRestaurant?.image ||
        'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85',
      items: cart.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
      subtotal: cartSubtotal,
      discount: couponDiscount,
      total: grandTotal,
      couponCode: appliedCoupon?.code,
      date: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'In Progress',
      deliveryTime: '22 mins',
      otp: generatedOtp,
    }

    setPastOrders((prev) => [historyEntry, ...prev])
    setActiveOrder(newOrder)

    setVerifyingModal({
      open: true,
      timer: 180,
      orderId,
      status: 'verifying',
    })

    navigateToTab('live-order')
  }

  function handleMarkDelivered() {
    setActiveOrder((prev: any) => ({ ...prev, statusStep: 4 }))
    triggerToast('Order marked as delivered!')
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
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-4 py-3 sm:px-8 shadow-sm">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          {/* Left Block: Logo + Location Selector */}
          <div className="flex items-center justify-between lg:justify-start gap-3 min-w-0">
            <Link href="/" className="font-black text-2xl sm:text-3xl tracking-tighter text-[#18201c] shrink-0 hover:opacity-90 transition">
              crave<span className="text-[#86a018]">.</span>
            </Link>

            <div className="hidden lg:block h-7 w-px bg-gray-200 mx-1 shrink-0" />

            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2.5 text-left group min-w-0 rounded-2xl p-1 -ml-1 hover:bg-gray-50 transition"
            >
              <div className="grid size-9 sm:size-10 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] shrink-0 shadow-xs">
                <MapPin className="size-4 sm:size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                    DELIVER TO
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#86a018] group-hover:underline">
                    (Change)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#18201c] truncate mt-0.5">
                  <span className="truncate max-w-[160px] sm:max-w-[220px] lg:max-w-[280px]">{deliveryAddress}</span>
                  <ChevronDown className="size-3.5 text-gray-500 shrink-0 group-hover:translate-y-0.5 transition" />
                </div>
              </div>
            </button>

            <button
              onClick={() => setShowCartDrawer(true)}
              className="lg:hidden relative flex items-center gap-1.5 rounded-xl bg-[#18201c] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#2a3831] transition active:scale-95 shrink-0"
            >
              <ShoppingCart className="size-4 text-[#d9f447]" />
              <span>Cart ({totalCartItemCount})</span>
            </button>
          </div>

          {/* Center Block: Page Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 lg:pb-0 no-scrollbar text-xs sm:text-sm font-bold justify-start lg:justify-center">
            <button
              onClick={() => navigateToTab('explore')}
              className={`rounded-2xl px-4 lg:px-5 py-2 lg:py-2.5 transition shrink-0 border ${
                activeTab === 'explore'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-sm'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              Explore
            </button>
            <button
              onClick={() => navigateToTab('live-order')}
              className={`flex items-center gap-2 rounded-2xl px-4 lg:px-5 py-2 lg:py-2.5 transition shrink-0 border ${
                activeTab === 'live-order'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-sm'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <Bike className="size-4" />
              <span>Track Drop</span>
              {activeOrder && activeOrder.statusStep < 4 && (
                <span className="size-2 rounded-full bg-[#d9f447] animate-pulse" />
              )}
            </button>
            <button
              onClick={() => navigateToTab('orders')}
              className={`flex items-center gap-2 rounded-2xl px-4 lg:px-5 py-2 lg:py-2.5 transition shrink-0 border ${
                activeTab === 'orders'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-sm'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <History className="size-4" />
              <span>Orders</span>
            </button>
            <button
              onClick={() => navigateToTab('profile')}
              className={`flex items-center gap-2 rounded-2xl px-4 lg:px-5 py-2 lg:py-2.5 transition shrink-0 border ${
                activeTab === 'profile'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-sm'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <User className="size-4" />
              <span>Profile</span>
            </button>
          </div>

          {/* Right Block: Laptop Cart Button */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowCartDrawer(true)}
              className="relative flex items-center gap-2.5 rounded-2xl bg-[#18201c] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#2a3831] transition active:scale-95"
            >
              <ShoppingCart className="size-4 text-[#d9f447]" />
              <span>Cart ({totalCartItemCount})</span>
              {cartSubtotal > 0 && (
                <span className="text-[#d9f447] font-semibold">&bull; ₹{grandTotal}</span>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8">
        {activeTab === 'explore' && (
          <div className="flex flex-col gap-8">
            {/* craveXP 10-Min Instamart Store Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-[#18201c] p-6 text-white shadow-xl border border-[#2a3831] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-[#d9f447] text-[#121815] font-black text-2xl shadow-lg shrink-0">
                  <Zap className="size-8 fill-current text-[#121815]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      crave<span className="text-[#d9f447]">XP</span> Instamart
                    </span>
                    <span className="text-xs font-semibold text-gray-400">
                      10-Minute Dark Store Express Drop
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-300 max-w-lg">
                    Milk, Eggs, Bread, Cold Drinks, Chips &amp; Fresh Veggies delivered from our nearest dark store in 10 minutes.
                  </p>
                </div>
              </div>

              <Link
                href="/user/cravexp"
                className="rounded-2xl bg-[#d9f447] px-6 py-3.5 text-xs font-black text-[#121815] shadow-xl hover:bg-[#c2dc37] transition hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
              >
                Open craveXP Instamart Store
                <ArrowRight className="size-4" />
              </Link>
            </div>

            {/* Search, Food Categories & Filters */}
            <div className="flex flex-col gap-5">
              <div className="relative w-full">
                <Search className="absolute left-4 top-3.5 size-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dishes or cuisines..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl border border-[#dfe4dc] bg-white py-3 pl-11 pr-4 text-xs shadow-xs outline-none transition focus:border-[#86a018] focus:ring-2 focus:ring-[#d9f447]/50 font-medium"
                />
              </div>

              {/* What's on your mind? Circular Food Categories */}
              <div>
                <h3 className="text-sm font-bold text-[#18201c] mb-3 tracking-tight">
                  What&apos;s on your mind?
                </h3>
                <div className="flex items-center gap-5 overflow-x-auto pb-2 no-scrollbar">
                  {categoryList.map((cat) => {
                    const isSelected = selectedTag === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedTag(cat.id)}
                        className="flex flex-col items-center gap-1.5 group shrink-0 transition"
                      >
                        <div
                          className={`relative size-16 sm:size-20 rounded-full overflow-hidden border-2 transition ${
                            isSelected
                              ? 'border-[#18201c] ring-2 ring-[#18201c]/20 scale-105'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={cat.image}
                            alt={cat.label}
                            className="size-full object-cover group-hover:scale-110 transition duration-300"
                          />
                        </div>
                        <span
                          className={`text-xs tracking-tight ${
                            isSelected ? 'text-[#18201c] font-bold' : 'text-gray-600 font-medium'
                          }`}
                        >
                          {cat.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
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
                  Pure Veg
                </button>
                <button
                  onClick={() => setOffersOnly(!offersOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    offersOnly
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Offers Only
                </button>
                <button
                  onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    fastDeliveryOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  Under 25 Mins
                </button>
              </div>
            </div>

            {/* Trending Quick-Add Dishes */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-base text-[#18201c] flex items-center gap-1.5">
                    <Flame className="size-4 text-amber-500 fill-amber-500" /> Signature Dishes
                  </h3>
                  <p className="text-xs text-gray-500">
                    Freshly prepared gourmet dishes at The Green Table.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                {menuItemsList.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-gray-200 bg-white p-4 flex flex-col justify-between shadow-xs hover:border-gray-300 transition"
                  >
                    <div>
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-36 w-full rounded-xl object-cover"
                      />
                      <p className="mt-3 font-bold text-sm text-[#18201c]">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.detail}</p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100">
                      <span className="font-bold text-sm text-[#18201c]">₹{item.price}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="rounded-full bg-[#d9f447] px-4 py-1.5 text-xs font-bold text-[#18201c] hover:scale-105 transition shadow-xs"
                      >
                        + Add to Cart
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Restaurant Card */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-[#18201c]">
                    Tested Kitchen ({filteredRestaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500">
                    Live tested kitchen available for ordering.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                              Pure Veg
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
                            <MapPin className="size-3.5 text-[#8aa31c]" /> {rest.address} ({rest.distance})
                          </span>
                          <span className="font-semibold text-gray-600">{rest.costForTwo}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 pt-0">
                      <div className="flex items-center justify-between border-t border-[#f0f3eb] pt-3 text-xs">
                        <span className="text-emerald-700 font-semibold text-[11px]">
                          Express Delivery
                        </span>
                        <span className="font-bold text-[#86a018] group-hover:underline flex items-center gap-1">
                          View Menu <ArrowRight className="size-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
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
                  Your order history will appear here after placing an order.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
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
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base text-[#18201c]">₹{order.total}</p>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-b border-[#f5f6f3]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Items Ordered
                      </p>
                      <div className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700">
                              {item.qty}× {item.name}
                            </span>
                            <span className="font-semibold text-[#18201c]">
                              ₹{item.price * item.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-12">
            <div className="rounded-2xl border border-[#2a3831] bg-[#18201c] p-6 text-white sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid size-16 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] font-black text-2xl shrink-0">
                    {(user?.name || 'C').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                      <span>Verified Customer Account</span>
                    </div>
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">{user?.name || 'Customer Account'}</h2>
                    <p className="mt-0.5 text-xs text-gray-300 font-medium">
                      {user?.email || 'authenticated@crave.com'} {user?.phone ? `• ${user.phone}` : ''}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => logout()}
                  className="self-start sm:self-center rounded-xl bg-white/10 hover:bg-rose-600 border border-white/20 px-5 py-2.5 text-xs font-semibold text-white transition"
                >
                  Sign Out Account
                </button>
              </div>

              <div className="mt-6 grid grid-cols-2 divide-x divide-[#2a3831] border-t border-[#2a3831] pt-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {pastOrders.filter((o) => o.status === 'Delivered' || o.status === 'In Progress').length}
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    Orders Placed
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-[#d9f447]">
                    ₹{pastOrders.reduce((a, o) => a + (o.discount || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-1">
                    Total Savings
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4 mb-4">
                    <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                      <User className="size-4 text-[#18201c]" /> Personal Details &amp; Delivery Address
                    </h3>
                    <button
                      onClick={() => setEditAddress(!editAddress)}
                      className="text-xs font-semibold text-[#18201c] hover:underline"
                    >
                      {editAddress ? 'Cancel' : 'Edit Info'}
                    </button>
                  </div>

                  {editAddress ? (
                    <div className="space-y-4 text-xs">
                      <div>
                        <label className="font-semibold text-gray-700">Delivery Address</label>
                        <textarea
                          rows={3}
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-[#e2e8f0] p-3 font-medium outline-none focus:border-[#18201c]"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setEditAddress(false)
                          triggerToast('Profile & Address details saved!')
                        }}
                        className="w-full rounded-xl bg-[#18201c] py-2.5 font-semibold text-white hover:bg-[#2a3831] transition"
                      >
                        Save Personal Info
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5 text-xs">
                      <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <div className="flex items-start gap-3">
                          <MapPin className="size-4 text-[#18201c] shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-gray-500">
                              Primary Delivery Address
                            </p>
                            <p className="font-medium text-[#18201c] mt-1">{deliveryAddress}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                        <div className="flex items-center gap-3">
                          <PhoneCall className="size-4 text-[#18201c]" />
                          <span className="font-medium text-[#18201c]">
                            {user?.phone || 'Phone Not Registered'}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-emerald-700">
                          {user?.phone ? 'Verified' : 'Unverified'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 flex flex-col justify-between">
                <div>
                  <div className="border-b border-[#e2e8f0] pb-4 mb-4">
                    <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-[#18201c]" /> Privacy &amp; Data Policy
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Your privacy and data protection terms
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                      <p className="font-bold text-[#18201c]">End-to-End Encryption &amp; Security</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        All user accounts, delivery coordinates, and payment records are secured using TLS encryption and Supabase PostgreSQL Row Level Security (RLS).
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                      <p className="font-bold text-[#18201c]">Zero Third-Party Data Selling</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        crave. never sells, rents, or trades your personal phone number, location history, or order data to external advertising networks.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                      <p className="font-bold text-[#18201c]">Payment Verification</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Payment UTR references submitted for manual verification are cleared directly with verified platform admin records and purged after processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Order Tracking View */}
        {activeTab === 'live-order' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            {activeOrder ? (
              <div className="overflow-hidden rounded-3xl border border-[#dfe5db] bg-white shadow-lg">
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
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#d9f447]">Estimated Delivery</p>
                      <p className="text-xl font-extrabold">18 - 22 mins</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-b border-gray-100">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-3">
                    Order Status Steps:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs font-semibold">
                    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${activeOrder.statusStep >= 1 ? 'text-[#18201c]' : 'text-gray-400'}`}>
                      <span className="grid size-9 place-items-center rounded-full font-bold bg-[#d9f447] text-[#18201c]">
                        {activeOrder.statusStep > 1 ? <Check className="size-4" /> : '1'}
                      </span>
                      <span className="text-[11px]">1. Confirmed</span>
                    </div>

                    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${activeOrder.statusStep >= 2 ? 'text-[#18201c]' : 'text-gray-400'}`}>
                      <span className={`grid size-9 place-items-center rounded-full font-bold ${activeOrder.statusStep >= 2 ? 'bg-[#d9f447] text-[#18201c]' : 'bg-gray-100 text-gray-400'}`}>
                        {activeOrder.statusStep > 2 ? <Check className="size-4" /> : '2'}
                      </span>
                      <span className="text-[11px]">2. Kitchen Cooking</span>
                    </div>

                    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${activeOrder.statusStep >= 3 ? 'text-[#18201c]' : 'text-gray-400'}`}>
                      <span className={`grid size-9 place-items-center rounded-full font-bold ${activeOrder.statusStep >= 3 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        {activeOrder.statusStep > 3 ? <Check className="size-4" /> : '3'}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700">3. Out for Delivery</span>
                    </div>

                    <div className={`flex flex-col items-center gap-1.5 p-2 rounded-xl ${activeOrder.statusStep >= 4 ? 'text-[#18201c]' : 'text-gray-400'}`}>
                      <span className={`grid size-9 place-items-center rounded-full font-bold ${activeOrder.statusStep === 4 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                        4
                      </span>
                      <span className="text-[11px]">4. Delivered</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#f8f9f6] border-b border-gray-200 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                        <Compass className="size-5 text-emerald-600 animate-spin" style={{ animationDuration: '6s' }} />
                        Live Rider Delivery Route
                      </h4>
                      <p className="text-xs text-[#737e77]">
                        Tracking rider moving live on road from kitchen counter to {deliveryAddress}.
                      </p>
                    </div>
                  </div>

                  <Mapcn
                    pickupCoords={[12.9784, 77.6408]}
                    dropoffCoords={[12.9352, 77.6245]}
                    driverCoords={[12.958, 77.632]}
                    restaurantName={activeOrder.restaurantName}
                    customerAddress={deliveryAddress}
                    height="h-72 sm:h-80 lg:h-[380px]"
                  />
                </div>

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
                    {activeOrder.statusStep < 4 && (
                      <button
                        onClick={handleMarkDelivered}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition shadow-xs"
                      >
                        <CheckCircle2 className="size-3.5" /> Mark Delivered
                      </button>
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
                  Browse your favourite dishes and place an order to see live delivery tracking here.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
                  className="mt-6 rounded-full bg-[#18201c] px-6 py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
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

            <div className="mt-5 flex flex-col gap-4">
              {menuItemsList.map((item) => {
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
                  View Cart <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {showCartDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200 max-h-[90vh] overflow-y-auto flex flex-col justify-between">
            <div>
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

                  <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-xs flex flex-col gap-2 border border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Items</span>
                      <span className="font-semibold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Packaging &amp; Restaurant Taxes</span>
                      <span className="font-semibold text-[#18201c]">₹{packagingFee}</span>
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      {deliveryFee === 0 ? (
                        <span className="font-bold text-emerald-700">FREE</span>
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

      {/* Checkout & Real UPI Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-[500px] rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#eff2ec] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#86a018]">
                  Direct Company UPI Payment
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
                  Your 12-digit UTR reference has been logged for verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 flex flex-col gap-4">
                {/* Company UPI Box */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        Company Official UPI ID
                      </p>
                      <p className="font-mono text-base font-bold text-emerald-950 mt-0.5">
                        {companyUpiId}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCompanyUpi}
                      className="flex items-center gap-1 rounded-xl bg-white border border-emerald-300 px-3 py-1.5 font-bold text-emerald-900 shadow-xs hover:bg-emerald-100 transition"
                    >
                      <Copy className="size-3.5" /> Copy
                    </button>
                  </div>

                  <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-800">Amount to pay: <strong>₹{grandTotal}</strong></span>
                    <a
                      href={`upi://pay?pa=${encodeURIComponent(companyUpiId)}&pn=Crave%20Food&am=${grandTotal}&cu=INR`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 underline hover:text-emerald-700"
                    >
                      Open UPI App <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#f8f9f6] p-4 text-xs">
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Items Subtotal ({totalCartItemCount} items)</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
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
                  <label className="text-xs font-bold text-[#18201c]">Your UPI ID / VPA</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourname@upi"
                    value={upiId}
                    onChange={(e) => {
                      setUpiId(e.target.value)
                      setUpiError('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018] font-medium"
                  />
                  {upiError && <p className="mt-1 text-[11px] font-bold text-rose-600">{upiError}</p>}
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">
                    12-Digit UTR Payment Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 428190021389"
                    value={utrRef}
                    onChange={(e) => {
                      setUtrRef(e.target.value.replace(/\D/g, ''))
                      setUtrError('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018] font-mono font-bold"
                  />
                  {utrError && <p className="mt-1 text-[11px] font-bold text-rose-600">{utrError}</p>}
                </div>

                <button
                  type="submit"
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36] shadow-md"
                >
                  Submit Order &amp; Start Verification (₹{grandTotal})
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* 3-Minute Payment Verification Modal */}
      {verifyingModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shadow-md animate-pulse">
              <Sparkles className="size-7 fill-current" />
            </div>

            <h3 className="mt-4 text-xl font-bold text-[#18201c]">Verifying Payment Details</h3>
            <p className="mt-1 text-xs text-gray-500">
              Order ID: <strong className="font-mono text-[#18201c]">{verifyingModal.orderId}</strong>
            </p>

            {verifyingModal.status === 'verifying' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[#f8f9f6] p-4 border border-[#e2e7dc]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Verification Window Remaining
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-[#18201c]">
                    {Math.floor(verifyingModal.timer / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(verifyingModal.timer % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Cross-referencing your 12-digit UTR reference with bank records.
                  </p>
                </div>
              </div>
            )}

            {verifyingModal.status === 'verified' && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <p className="text-sm font-bold text-emerald-900">✓ Payment Approved!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your order has been accepted and dispatched to the kitchen. Redirecting to live tracking...
                </p>
              </div>
            )}

            {verifyingModal.status === 'rejected' && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200">
                  <p className="text-sm font-bold text-rose-900">✕ Payment Verification Failed</p>
                  <p className="text-xs text-rose-700 mt-1">
                    The UTR reference entered could not be verified. Please verify your UTR number.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })}
                  className="w-full rounded-full bg-[#18201c] py-2.5 text-xs font-bold text-white"
                >
                  Close &amp; Retry UTR
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Location Selector & GPS Map Pin Drop Modal */}
      {showLocationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-[#18201c] text-white">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] font-bold">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Select Delivery Location</h3>
                  <p className="text-xs text-gray-300">Choose a saved address or drop map pin</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationModal(false)}
                className="grid size-8 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <button
                type="button"
                onClick={handleDetectGpsLocation}
                disabled={gpsDetecting}
                className="w-full flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-900 hover:bg-emerald-100/70 transition shadow-xs group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="grid size-10 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition">
                    {gpsDetecting ? (
                      <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <LocateFixed className="size-5" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm">
                      {gpsDetecting ? 'Detecting Precise GPS Location...' : 'Use Current GPS Location'}
                    </p>
                    <p className="text-xs text-emerald-700">
                      Auto-detect latitude &amp; longitude via browser geolocation
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-700 bg-white px-3 py-1 rounded-full border border-emerald-200">
                  {gpsDetecting ? 'Locating...' : 'Detect'}
                </span>
              </button>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Saved Addresses ({savedAddresses.length})
                </h4>
                <div className="space-y-3">
                  {savedAddresses.map((addr) => {
                    const isSelected = deliveryAddress === addr.address
                    return (
                      <div
                        key={addr.id}
                        onClick={() => {
                          setDeliveryAddress(addr.address)
                          setSelectedMapPin({ lat: addr.lat, lng: addr.lng })
                          setShowLocationModal(false)
                          triggerToast(`Switched delivery address to ${addr.label}!`)
                        }}
                        className={`flex items-start justify-between rounded-2xl p-4 border cursor-pointer transition ${
                          isSelected
                            ? 'border-[#18201c] bg-[#18201c]/5 shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`grid size-9 place-items-center rounded-xl shrink-0 mt-0.5 ${
                            isSelected ? 'bg-[#18201c] text-white' : 'bg-gray-100 text-gray-700'
                          }`}>
                            <MapPin className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-[#18201c]">{addr.label}</span>
                              <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded-md">
                                {addr.tag}
                              </span>
                            </div>
                            <p className="text-xs text-gray-600 mt-1 font-medium">{addr.address}</p>
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                              Coordinates: {addr.lat}&deg; N, {addr.lng}&deg; E
                            </p>
                          </div>
                        </div>

                        {isSelected && (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                            Active
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Interactive Map Pin Placement
                  </h4>
                  <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {selectedMapPin.lat.toFixed(4)}&deg; N, {selectedMapPin.lng.toFixed(4)}&deg; E
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const x = (e.clientX - rect.left) / rect.width
                    const y = (e.clientY - rect.top) / rect.height
                    const newLat = parseFloat((12.9 + y * 0.1).toFixed(4))
                    const newLng = parseFloat((77.5 + x * 0.2).toFixed(4))
                    setSelectedMapPin({ lat: newLat, lng: newLng })
                    setNewAddressInput(`Dropped Pin (${newLat}° N, ${newLng}° E) • Indiranagar, Bengaluru`)
                  }}
                  className="relative h-48 w-full rounded-2xl overflow-hidden border border-gray-300 bg-[#e5e9e2] cursor-crosshair shadow-inner group"
                >
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#18201c_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="absolute top-1/2 left-0 right-0 h-4 bg-white/70 -translate-y-1/2" />
                  <div className="absolute left-1/3 top-0 bottom-0 w-4 bg-white/70" />
                  <div className="absolute right-1/4 top-0 bottom-0 w-3 bg-white/50" />

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-transform duration-200 group-active:scale-110">
                    <div className="grid size-9 place-items-center rounded-full bg-[#18201c] text-[#d9f447] shadow-xl border-2 border-white ring-4 ring-[#18201c]/20 animate-bounce">
                      <MapPin className="size-5" />
                    </div>
                    <span className="mt-1 text-[10px] font-bold bg-[#18201c] text-white px-2 py-0.5 rounded-md shadow-md">
                      Drop Location
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-semibold text-gray-700 shadow-xs border border-gray-200">
                    Click anywhere on map canvas to shift drop pin location
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 bg-gray-50 space-y-3">
                <h4 className="text-xs font-bold text-[#18201c]">Add New Custom Address</h4>
                
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 font-semibold">Label:</span>
                  {(['Home', 'Work', 'Other'] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setNewAddressLabel(lbl)}
                      className={`px-3 py-1 rounded-full font-bold border transition ${
                        newAddressLabel === lbl
                          ? 'bg-[#18201c] text-white border-[#18201c]'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Enter building, apartment, street address details..."
                  value={newAddressInput}
                  onChange={(e) => setNewAddressInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-3 text-xs font-medium outline-none focus:border-[#18201c] bg-white"
                />

                <button
                  type="button"
                  onClick={handleAddNewAddress}
                  className="w-full rounded-xl bg-[#18201c] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#2a3831] transition"
                >
                  Save &amp; Set as Active Delivery Address
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useToast } from '@/lib/toast-context'
import { useOrderUpdates, useApprovalUpdates, useDriverLocation } from '@/lib/websocket'
import {
  AlertTriangle,
  ArrowRight,
  Bike,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  History,
  LocateFixed,
  LogOut,
  MapPin,
  Menu,
  Minus,
  PhoneCall,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Trash2,
  User,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Coupon, fetchCouponsFromSupabase, validateCoupon } from '@/lib/coupons'
import { loadPaymentConfig } from '@/lib/payment-config'
import { supabase } from '@/lib/supabase'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full rounded-2xl bg-gray-100 flex items-center justify-center text-xs text-gray-500 font-bold animate-pulse">
      Loading Live Interactive Map...
    </div>
  ),
})

const LiveDriverMap = dynamic(() => import('@/components/LiveDriverMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-72 w-full rounded-2xl bg-[#09090b] border border-[#27272a] flex flex-col items-center justify-center gap-2 text-xs text-gray-400 font-bold animate-pulse">
      <div className="size-8 border-2 border-[#d9f447] border-t-transparent rounded-full animate-spin mb-1" />
      <span>Loading Mapcn Live Rider Map...</span>
    </div>
  ),
})

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

interface CustomerAddress {
  id: string
  label: string
  address: string
  tag: string
  lat: number | null
  lng: number | null
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

interface CheckoutConfig {
  merchantVpa: string
  deliveryFee: number
  handlingFee: number
  freeDeliveryThreshold: number
  gstRate: number
}

const categoryList = [
  {
    id: 'All',
    label: 'All Items',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Healthy',
    label: 'Healthy Bowls',
    image:
      'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Wraps',
    label: 'Wraps & Rolls',
    image:
      'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 'Starters',
    label: 'Asian Momos',
    image:
      'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80',
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
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([])
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showMobileSideMenu, setShowMobileSideMenu] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([])

  useEffect(() => {
    const handleToggleSidebar = () => {
      setShowMobileSideMenu((prev) => !prev)
    }
    window.addEventListener('toggle-mobile-sidebar', handleToggleSidebar)
    return () => window.removeEventListener('toggle-mobile-sidebar', handleToggleSidebar)
  }, [])

  const { items: globalCartItems, setItems: setGlobalItems, isLoaded: globalCartLoaded } = useCart()
  const [isCartInitialized, setIsCartInitialized] = useState(false)

  // Sync initial cart state from CartProvider / localStorage on mount
  useEffect(() => {
    if (!isCartInitialized) {
      if (globalCartItems.length > 0) {
        setCart(globalCartItems as CartItem[])
        setIsCartInitialized(true)
      } else if (globalCartLoaded) {
        const stored = typeof window !== 'undefined' ? localStorage.getItem('crave_cart') : null
        if (stored) {
          try {
            const parsed = JSON.parse(stored)
            if (Array.isArray(parsed) && parsed.length > 0) {
              setCart(parsed)
            }
          } catch {}
        }
        setIsCartInitialized(true)
      }
    }
  }, [globalCartItems, globalCartLoaded, isCartInitialized])

  // Sync local cart updates to CartContext once initialized
  useEffect(() => {
    if (isCartInitialized) {
      setGlobalItems(
        cart.map((item) => ({
          id: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price,
          detail: item.detail,
          image: item.image,
          veg: item.veg,
          restaurantName: item.restaurantName,
        }))
      )
    }
  }, [cart, isCartInitialized, setGlobalItems])

  // Fetch Live Restaurants / Vendors from local DB
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        let parsed: Restaurant[] = []
        const res = await fetch('/api/restaurants', { cache: 'no-store' })
        const json = await res.json()
        const restData = json.restaurants || []

        if (restData.length > 0) {
          parsed = restData
            .filter((r: any) => r.id !== 'cravexp_dark_store_01' && r.is_dark_store === false)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              cuisine: r.cuisine ?? '',
              rating: r.rating == null ? '4.8' : String(r.rating),
              ratingCount:
                r.rating_count == null ? '1.2k+' : Number(r.rating_count).toLocaleString(),
              eta: r.delivery_minutes == null ? '25 min' : `${r.delivery_minutes} min`,
              distance: '1.8 km',
              costForTwo: r.cost_for_two == null ? '₹350 for two' : `₹${r.cost_for_two} for two`,
              image:
                r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
              tag: r.cuisine?.split(' ')[0] ?? 'Popular',
              address: r.address ?? 'Bengaluru',
              offer: r.offer ?? '40% OFF',
              isPureVeg: r.is_pure_veg ?? false,
            }))
        }
        setRestaurantsList(parsed)
      } catch (err) {
        setRestaurantsList([])
      }
    }
    fetchRestaurants()
    const interval = setInterval(fetchRestaurants, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch Live Menu Items from local DB
  useEffect(() => {
    async function fetchLiveMenuItems() {
      try {
        if (!selectedRestaurant) {
          setMenuItemsList([])
          return
        }
        const res = await fetch(`/api/menu-items?restaurantId=${selectedRestaurant.id}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        const menuData = json.items || []

        if (menuData.length > 0) {
          const parsed: MenuItem[] = menuData.map((item: any) => ({
            id: item.id,
            name: item.name,
            detail: item.description || '',
            price: Number(item.price) || 0,
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            veg: Boolean(item.is_veg ?? true),
            restaurantName: selectedRestaurant?.name || 'Partner Kitchen',
          }))
          setMenuItemsList(parsed)
        } else {
          setMenuItemsList([])
        }
      } catch (err) {
        console.error('Error fetching live menu items:', err)
        setMenuItemsList([])
      }
    }

    fetchLiveMenuItems()
    const interval = setInterval(fetchLiveMenuItems, 15000)
    return () => clearInterval(interval)
  }, [selectedRestaurant?.id, selectedRestaurant?.name, restaurantsList])

  const [ordersData, setOrdersData] = useState<any[]>([])

  // WebSocket provides live updates; initial fetch on mount
  useEffect(() => {
    if (!user?.id) return
    async function fetchInitialOrders() {
      try {
        const res = await fetch(`/api/orders?customerId=${user!.id}`)
        const json = await res.json()
        if (json.success && Array.isArray(json.orders)) {
          setOrdersData(json.orders)
        }
      } catch (e) {}
    }
    fetchInitialOrders()
  }, [user?.id])

  // Live order updates via WebSocket
  useOrderUpdates(user?.id, (orders) => {
    setOrdersData(orders)
  })

  // Parse ordersData into PastOrder[] whenever it changes
  useEffect(() => {
    const statusMap: Record<string, PastOrder['status']> = {
      completed: 'Delivered',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      new: 'In Progress',
      preparing: 'In Progress',
      ready: 'In Progress',
      accepted: 'In Progress',
      out_for_delivery: 'In Progress',
    }

    const parsed: PastOrder[] = ordersData.map((o: any) => {
      let itemsArr: { name: string; qty: number; price: number }[] = []
      try {
        const raw = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        if (Array.isArray(raw))
          itemsArr = raw.map((i: any) => ({
            name: i.name,
            qty: i.qty ?? 1,
            price: i.price ?? 0,
          }))
      } catch {}

      const rawDate = o.createdAt || o.created_at
      return {
        id: o.id,
        restaurantName: o.restaurant_name ?? o.restaurantName ?? 'Crave Kitchen Store',
        restaurantImage: '',
        items: itemsArr,
        subtotal: Number(o.subtotal ?? 0),
        discount: Number(o.discount_amount ?? 0),
        total: Number(o.total_amount ?? 0),
        date: rawDate
          ? new Date(rawDate).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '',
        time: rawDate
          ? new Date(rawDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : '',
        status: statusMap[o.status] ?? 'In Progress',
        deliveryTime: '',
        driverName: o.driver_name || undefined,
        driverPhone: o.driver_phone || undefined,
      }
    })
    setPastOrders(parsed)
  }, [ordersData])

  // Saved Addresses State & GPS Map Picker
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [gpsDetecting, setGpsDetecting] = useState(false)
  const [selectedMapPin, setSelectedMapPin] = useState<{ lat: number; lng: number } | null>(null)
  const [newAddressInput, setNewAddressInput] = useState('')
  const [newAddressLabel, setNewAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home')

  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([])
      return
    }
    const loadAddresses = async () => {
      try {
        const { data, error } = await supabase
          .from('customer_addresses')
          .select('*')
          .eq('customer_id', user.id)
          .order('created_at', { ascending: false })

        if (!error && data && data.length > 0) {
          setSavedAddresses(
            data.map((row: any) => ({
              id: row.id,
              label: row.label,
              address: row.address,
              tag: row.is_default ? 'Primary' : row.label,
              lat: row.latitude == null ? null : Number(row.latitude),
              lng: row.longitude == null ? null : Number(row.longitude),
            }))
          )
          return
        }
      } catch (err) {}

      if (user.address) {
        setSavedAddresses([
          {
            id: 'addr_default',
            label: 'Home',
            address: user.address,
            tag: 'Primary',
            lat: 12.9716,
            lng: 77.5946,
          },
        ])
      } else {
        setSavedAddresses([])
      }
    }
    loadAddresses()
  }, [user?.id, user?.address])

  function handleDetectGpsLocation() {
    setGpsDetecting(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(4))
          const lng = parseFloat(pos.coords.longitude.toFixed(4))
          setSelectedMapPin({ lat, lng })
          setDeliveryAddress(`${lat}, ${lng}`)
          setGpsDetecting(false)
          triggerToast(`GPS Location Detected: ${lat}° N, ${lng}° E`)
        },
        () => {
          setGpsDetecting(false)
          triggerToast('Could not determine your current location.')
        },
        { timeout: 4000 }
      )
    } else {
      setGpsDetecting(false)
      triggerToast('Geolocation is not supported by your browser')
    }
  }

  async function handleAddNewAddress() {
    if (!user?.id || !newAddressInput.trim()) {
      triggerToast('Please enter an address or drop a pin on the map!')
      return
    }
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert([
        {
          id: crypto.randomUUID(),
          customer_id: user.id,
          label: newAddressLabel,
          address: newAddressInput.trim(),
          latitude: selectedMapPin?.lat ?? null,
          longitude: selectedMapPin?.lng ?? null,
          is_default: savedAddresses.length === 0,
        },
      ])
      .select('*')
      .single()
    if (error || !data) {
      triggerToast('Could not save this address to your account.')
      return
    }
    const newEntry: CustomerAddress = {
      id: data.id,
      label: data.label,
      address: data.address,
      tag: data.is_default ? 'Primary' : data.label,
      lat: data.latitude == null ? null : Number(data.latitude),
      lng: data.longitude == null ? null : Number(data.longitude),
    }
    setSavedAddresses((prev) => [newEntry, ...prev])
    setDeliveryAddress(data.address)
    setNewAddressInput('')
    setShowLocationModal(false)
    triggerToast(`Address added & set as current delivery location!`)
  }

  // Profile editing
  const [editAddress, setEditAddress] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')

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
  const [companyUpiId, setCompanyUpiId] = useState('')
  const [companyMerchantName, setCompanyMerchantName] = useState('')
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null)
  const [upiId, setUpiId] = useState('')
  const [utrRef, setUtrRef] = useState('')
  const [upiError, setUpiError] = useState('')
  const [utrError, setUtrError] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [liveDriverPos, setLiveDriverPos] = useState<{ lat: number; lng: number } | null>(null)

  // Subscribe to live driver location updates via WebSocket
  useDriverLocation(activeOrder?.id, (data: any) => {
    setLiveDriverPos({ lat: data.lat, lng: data.lng })
  })

  // Set active order from WebSocket stream
  useEffect(() => {
    if (!user?.id || !ordersData.length) {
      setActiveOrder(null)
      setLiveDriverPos(null)
      return
    }

    const active = ordersData
      .slice()
      .reverse()
      .find(
        (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
      )

    if (active) {
      let statusStep = 1
      if (active.status === 'delivered' || active.status === 'completed') {
        statusStep = 4
      } else if (
        active.status === 'out_for_delivery' ||
        active.status === 'picked_up' ||
        active.status === 'arrived_customer'
      ) {
        statusStep = 3
      } else if (
        active.status === 'preparing' ||
        active.status === 'cooking' ||
        active.status === 'ready' ||
        active.status === 'accepted' ||
        active.status === 'at_restaurant' ||
        active.payment_status === 'verified'
      ) {
        statusStep = 2
      }

      let itemsArr: CartItem[] = []
      try {
        itemsArr = typeof active.items === 'string' ? JSON.parse(active.items) : active.items || []
      } catch (e) {}

      const formattedTime = active.createdAt
        ? new Date(active.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setActiveOrder({
        id: active.id,
        restaurantName: active.restaurant_name || active.restaurantName || 'Crave Kitchen Store',
        items: itemsArr,
        subtotal: Number(active.subtotal || 0),
        total: Number(active.total_amount || 0),
        statusStep,
        otp: active.delivery_otp || '1234',
        driverName: active.driver_name || null,
        driverPhone: active.driver_phone || null,
        driverLat: liveDriverPos?.lat ?? active.driver_lat ?? active.driver_latitude ?? null,
        driverLng: liveDriverPos?.lng ?? active.driver_lng ?? active.driver_longitude ?? null,
        timestamp: formattedTime,
        paymentStatus: active.payment_status || 'pending',
      })
    } else {
      setActiveOrder(null)
    }
  }, [user?.id, ordersData, liveDriverPos])

  // Fetch Company UPI Config dynamically & listen for admin updates
  useEffect(() => {
    async function refreshPaymentConfig() {
      const cfg = await loadPaymentConfig()
      setCheckoutConfig({
        merchantVpa: cfg.upiVpa,
        deliveryFee: cfg.baseDeliveryFee,
        handlingFee: cfg.handlingFee,
        freeDeliveryThreshold: cfg.freeDeliveryThreshold,
        gstRate: 5,
      })
      setCompanyUpiId(cfg.upiVpa)
      setCompanyMerchantName(cfg.merchantName)
    }
    refreshPaymentConfig()

    window.addEventListener('crave_payment_config_updated', refreshPaymentConfig)
    window.addEventListener('storage', refreshPaymentConfig)
    return () => {
      window.removeEventListener('crave_payment_config_updated', refreshPaymentConfig)
      window.removeEventListener('storage', refreshPaymentConfig)
    }
  }, [])

  // Notification Toast
  const { toast } = useToast()

  useEffect(() => {
    fetchCouponsFromSupabase().then((coupons) => {
      setAvailableCoupons(coupons.filter((c) => c.isActive))
    })
  }, [])

  function triggerToast(msg: string) {
    // Strip leading emoji/special chars for cleaner display; variant is auto-detected below.
    const clean = msg.replace(/^[^\w\s₹]+\s*/, '')
    const isError = /could not|failed|error|unable|invalid/i.test(clean)
    toast(clean, isError ? 'error' : 'success')
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
    const currentRestId = (cart[0] as any)?.restaurantId || (selectedRestaurant as any)?.id
    const res = validateCoupon(appliedCoupon.code, cartSubtotal, availableCoupons, currentRestId)
    if (res.valid) {
      setCouponDiscount(res.discountAmount)
    } else {
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponMessage({ type: 'error', text: res.message })
    }
  }, [cartSubtotal, appliedCoupon, cart, selectedRestaurant])

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
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    if (cart.length > 0) {
      const currentRest = cart[0].restaurantName || selectedRestaurant?.name || 'Kitchen Store'
      if (
        currentRest !== itemRest &&
        currentRest !== 'Kitchen Store' &&
        itemRest !== 'Kitchen Store'
      ) {
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
    triggerToast(`🛒 Added ${item.name} to cart!`)
  }

  function handleResolveConflictClear() {
    if (!conflictModal.newItem) return
    const item = conflictModal.newItem
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    setCart([{ ...item, qty: 1, restaurantName: itemRest }])
    setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
    triggerToast(`🛒 Cart reset. Added ${item.name}!`)
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

  // Coupon Handlers
  function handleApplyCouponCode(codeToApply?: string) {
    const targetCode = codeToApply || couponCodeInput
    if (!targetCode.trim()) return

    const currentRestId = (cart[0] as any)?.restaurantId || (selectedRestaurant as any)?.id
    const res = validateCoupon(targetCode, cartSubtotal, availableCoupons, currentRestId)
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
  const deliveryFee =
    checkoutConfig && cartSubtotal > 0 && cartSubtotal < checkoutConfig.freeDeliveryThreshold
      ? checkoutConfig.deliveryFee
      : 0
  const packagingFee = cartSubtotal > 0 ? (checkoutConfig?.handlingFee ?? 0) : 0
  const taxAmount = checkoutConfig ? Math.round((cartSubtotal * checkoutConfig.gstRate) / 100) : 0
  const grandTotal = Math.max(
    0,
    cartSubtotal - couponDiscount + deliveryFee + packagingFee + taxAmount
  )

  // Filtered Restaurants Logic
  const filteredRestaurants = useMemo(() => {
    return restaurantsList.filter((rest) => {
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
  }, [restaurantsList, searchQuery, selectedTag, pureVegOnly, offersOnly, fastDeliveryOnly])

  // 3-Minute Payment Verification Countdown Effect & Realtime Sync
  const [approvalStatus, setApprovalStatus] = useState<string>('pending')

  useApprovalUpdates(
    verifyingModal.orderId && verifyingModal.open && verifyingModal.status === 'verifying'
      ? verifyingModal.orderId
      : undefined,
    (status) => {
      setApprovalStatus(status)
      if (status === 'verified') {
        setVerifyingModal((prev) => ({ ...prev, status: 'verified' }))
        triggerToast('Payment Approved by Admin! Order sent to kitchen.')
        setTimeout(() => {
          setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })
          setCart([])
          setShowCheckoutModal(false)
          setPaymentDone(true)
          navigateToTab('live-order')
        }, 2000)
      } else if (status === 'rejected') {
        setVerifyingModal((prev) => ({ ...prev, status: 'rejected' }))
      }
    }
  )

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

    return () => {
      clearInterval(countdownTimer)
    }
  }, [verifyingModal.open, verifyingModal.status, verifyingModal.orderId])

  async function handleCheckoutSubmit(e: FormEvent) {
    e.preventDefault()
    setUtrError('')

    const cleanUtr = utrRef.trim()

    const targetAddress = (deliveryAddress || user?.address || 'Kanakapura Road, Bengaluru').trim()
    const targetRestaurantId =
      selectedRestaurant?.id ||
      (cart[0] as any)?.restaurantId ||
      (cart[0] as any)?.vendorId ||
      restaurantsList[0]?.id ||
      'vnd_default'
    const targetRestaurantName =
      selectedRestaurant?.name ||
      cart[0]?.restaurantName ||
      restaurantsList[0]?.name ||
      'Crave Kitchen Store'

    if (!user?.id) {
      setUtrError('Please sign in with a customer account to place an order.')
      return
    }

    if (!targetAddress) {
      setUtrError('Please enter or select a delivery address.')
      return
    }

    if (!checkoutConfig || !companyUpiId) {
      setUtrError('Online payment is not configured for this store.')
      return
    }

    const orderId = crypto.randomUUID()
    const otpBytes = new Uint32Array(1)
    crypto.getRandomValues(otpBytes)
    const generatedOtp = String(1000 + (otpBytes[0] % 9000))
    const restName = targetRestaurantName

    const cartWithOtp = cart.map((item) => ({
      ...item,
      menu_item_id: item.id,
      otp: generatedOtp,
    }))

    try {
      const orderPayload = {
        id: orderId,
        customer_id: user.id,
        customer_name: user.name,
        customer_phone: user?.phone || null,
        customer_address: targetAddress,
        restaurant_id: targetRestaurantId,
        restaurant_name: restName,
        items: cartWithOtp,
        subtotal: cartSubtotal,
        packaging_fee: packagingFee,
        gst: taxAmount,
        total_amount: grandTotal,
        status: 'new',
        payment_method: 'UPI Online',
        delivery_otp: generatedOtp,
        utr_ref: cleanUtr,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      })

      const resData = await res.json()
      if (!res.ok || !resData.success) {
        throw new Error(resData.error || 'Failed to submit order.')
      }

      const savedOrder = resData.order

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setActiveOrder({
        id: savedOrder.id,
        restaurantName: savedOrder.restaurant_name,
        items: cartWithOtp,
        subtotal: Number(savedOrder.subtotal),
        total: Number(savedOrder.total_amount),
        statusStep: 1,
        otp: generatedOtp,
        driverName: null,
        driverPhone: null,
        timestamp: nowTime,
      })
    } catch (err: any) {
      const errorMsg =
        err?.message || (typeof err === 'string' ? err : 'Order creation fallback activated')
      console.warn('Order submission notice, using client fallback:', errorMsg)

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setActiveOrder({
        id: orderId,
        restaurantName: restName,
        items: cartWithOtp,
        subtotal: Number(cartSubtotal),
        total: Number(grandTotal),
        statusStep: 1,
        otp: generatedOtp,
        driverName: null,
        driverPhone: null,
        timestamp: nowTime,
      })
    }

    setShowCheckoutModal(false)
    setPaymentDone(true)

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
      {/* Top Header Navigation Banner */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-3 py-2.5 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-2 sm:gap-4">
          {/* Left Block: Logo + Location Selector */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-xl sm:text-2xl lg:text-3xl tracking-tighter text-[#18201c] shrink-0 hover:opacity-90 transition"
            >
              crave<span className="text-[#86a018]">.</span>
            </Link>

            <div className="hidden lg:block h-7 w-px bg-gray-200 mx-1 shrink-0" />

            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 text-left group min-w-0 rounded-2xl p-1 hover:bg-gray-100/80 transition"
            >
              <div className="grid size-8 sm:size-9 lg:size-10 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] shrink-0 shadow-xs">
                <MapPin className="size-3.5 sm:size-4 lg:size-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                    DELIVER TO
                  </span>
                  <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-bold text-[#86a018] group-hover:underline">
                    (Change)
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#18201c] truncate">
                  <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]">
                    {deliveryAddress}
                  </span>
                  <ChevronDown className="size-3.5 text-gray-500 shrink-0 group-hover:translate-y-0.5 transition" />
                </div>
              </div>
            </button>
          </div>

          {/* Center Block: Desktop Page Navigation Tabs (Hidden on small screens) */}
          <div className="hidden lg:flex items-center gap-1.5 text-sm font-bold justify-center">
            <button
              onClick={() => navigateToTab('explore')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'explore'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-xs'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <Compass
                className={`size-4 ${activeTab === 'explore' ? 'text-[#d9f447]' : 'text-[#859d19]'}`}
              />
              <span>Explore</span>
            </button>

            <button
              onClick={() => navigateToTab('live-order')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'live-order'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-xs'
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
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'orders'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-xs'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <History className="size-4" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => navigateToTab('profile')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'profile'
                  ? 'bg-[#18201c] text-white border-[#18201c] shadow-xs'
                  : 'bg-[#f8fafc] text-gray-600 border-[#e2e8f0] hover:text-[#18201c] hover:bg-white'
              }`}
            >
              <User className="size-4" />
              <span>Profile</span>
            </button>
          </div>

          {/* Right Block: Cart (Desktop only) + Mobile 3-Line Hamburger Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowCartDrawer(true)}
              className="hidden lg:flex relative items-center gap-2 rounded-2xl bg-[#18201c] px-5 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#2a3831] transition active:scale-95 shrink-0"
            >
              <ShoppingCart className="size-4 text-[#d9f447]" />
              <span>Cart ({totalCartItemCount})</span>
              {cartSubtotal > 0 && (
                <span className="text-[#d9f447] font-semibold">&bull; ₹{grandTotal}</span>
              )}
            </button>

            {/* 3-Line Hamburger Side Menu Trigger Button on Mobile */}
            <button
              onClick={() => setShowMobileSideMenu(true)}
              className="lg:hidden grid size-9 sm:size-10 place-items-center rounded-2xl border border-gray-200 bg-white text-[#18201c] shadow-xs hover:bg-gray-100 transition active:scale-95 shrink-0"
              aria-label="Open side menu"
            >
              <Menu className="size-5 text-[#18201c]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Side Menu Bar Drawer Backdrop & Aside */}
      <div
        onClick={() => setShowMobileSideMenu(false)}
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          showMobileSideMenu ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        aria-label="Side menu options"
        className={`fixed inset-y-0 right-0 z-[90] flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          showMobileSideMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Side Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 bg-[#f9faf7]">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="size-10 rounded-full object-cover border border-[#d9f447]"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-2xl bg-[#18201c] text-[#d9f447] text-sm font-black shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#18201c] truncate">
                {user?.name || 'Customer'}
              </p>
              <p className="text-[11px] text-gray-500 font-medium truncate">
                {user?.email || 'Logged in'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileSideMenu(false)}
            className="grid size-9 place-items-center rounded-2xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close menu"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Side Drawer Navigation Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <p className="px-3 pt-2 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Navigation
          </p>

          <button
            onClick={() => {
              navigateToTab('explore')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'explore'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'text-[#18201c] hover:bg-[#f3f6ee]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Compass
                className={`size-5 ${activeTab === 'explore' ? 'text-[#d9f447]' : 'text-[#859d19]'}`}
              />
              Explore Kitchens
            </span>
          </button>

          <button
            onClick={() => {
              navigateToTab('live-order')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'live-order'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'text-[#18201c] hover:bg-[#f3f6ee]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bike
                className={`size-5 ${activeTab === 'live-order' ? 'text-[#d9f447]' : 'text-[#859d19]'}`}
              />
              Track Drop
            </span>
            {activeOrder && activeOrder.statusStep < 4 && (
              <span className="flex items-center gap-1 rounded-full bg-[#d9f447] px-2.5 py-0.5 text-[10px] font-black text-[#18201c]">
                <span className="size-1.5 rounded-full bg-emerald-700 animate-ping" />
                Live
              </span>
            )}
          </button>

          <button
            onClick={() => {
              navigateToTab('orders')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'orders'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'text-[#18201c] hover:bg-[#f3f6ee]'
            }`}
          >
            <span className="flex items-center gap-3">
              <History
                className={`size-5 ${activeTab === 'orders' ? 'text-[#d9f447]' : 'text-[#859d19]'}`}
              />
              Orders History
            </span>
            {pastOrders.length > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-extrabold text-gray-700">
                {pastOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              navigateToTab('profile')
              setShowMobileSideMenu(false)
            }}
            className={`w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
              activeTab === 'profile'
                ? 'bg-[#18201c] text-white shadow-xs'
                : 'text-[#18201c] hover:bg-[#f3f6ee]'
            }`}
          >
            <span className="flex items-center gap-3">
              <User
                className={`size-5 ${activeTab === 'profile' ? 'text-[#d9f447]' : 'text-[#859d19]'}`}
              />
              Profile & Account
            </span>
          </button>

          <button
            onClick={() => {
              setShowMobileSideMenu(false)
              setShowCartDrawer(true)
            }}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-[#18201c] hover:bg-[#f3f6ee] transition"
          >
            <span className="flex items-center gap-3">
              <ShoppingCart className="size-5 text-[#859d19]" />
              My Cart
            </span>
            {totalCartItemCount > 0 && (
              <span className="rounded-full bg-[#18201c] px-2.5 py-0.5 text-xs font-bold text-[#d9f447]">
                {totalCartItemCount} items
              </span>
            )}
          </button>

          <div className="my-3 border-t border-gray-100" />
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Quick Access
          </p>

          <Link
            href="/user/cravexp"
            onClick={() => setShowMobileSideMenu(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition"
          >
            <Zap className="size-5 text-emerald-600 fill-emerald-600" />
            <span>craveXP Instamart (10 Min)</span>
          </Link>

          <Link
            href="/vendor/crave-ep"
            onClick={() => setShowMobileSideMenu(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#18201c] bg-[#f0f3eb] hover:bg-[#e2e7dc] transition"
          >
            <Store className="size-5 text-[#859d19]" />
            <span>craveXP Partner Console</span>
          </Link>
        </div>

        {/* Side Drawer Footer / Sign Out */}
        <div className="border-t border-gray-100 p-4 bg-[#f9faf7]">
          <button
            onClick={async () => {
              setShowMobileSideMenu(false)
              await logout()
              router.push('/login')
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="size-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

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
                      10-Minute Express Drop
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-300 max-w-lg">
                    Milk, Eggs, Bread, Cold Drinks, Chips &amp; Fresh Veggies delivered from our
                    nearest craveXP store in 10 minutes.
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
                    {selectedRestaurant?.name
                      ? `Menu items from ${selectedRestaurant.name}.`
                      : 'Menu items from available restaurants.'}
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
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="grid h-36 w-full place-items-center rounded-xl bg-gray-100 text-gray-400">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}
                      <p className="mt-3 font-bold text-sm text-[#18201c]">{item.name}</p>
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
                    Restaurants ({filteredRestaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500">Available restaurants from the database.</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRestaurants.length === 0 ? (
                  <p className="col-span-full rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
                    No restaurants match these filters.
                  </p>
                ) : (
                  filteredRestaurants.map((rest) => (
                    <div
                      key={rest.id}
                      onClick={() => setSelectedRestaurant(rest)}
                      className="group cursor-pointer overflow-hidden rounded-3xl border border-[#e1e6df] bg-white transition hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-48 w-full overflow-hidden">
                          {rest.image ? (
                            <img
                              src={rest.image}
                              alt={rest.name}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="grid size-full place-items-center bg-gray-100 text-gray-400">
                              <MapPin className="size-8" />
                            </div>
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            {rest.tag && (
                              <span className="rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f5f15] backdrop-blur-md shadow-xs">
                                {rest.tag}
                              </span>
                            )}
                            {rest.isPureVeg && (
                              <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white shadow-xs">
                                Pure Veg
                              </span>
                            )}
                          </div>

                          {rest.eta && (
                            <span className="absolute bottom-3 right-3 rounded-full bg-[#18201c] px-3 py-1 text-[10px] font-bold text-white shadow-xs">
                              {rest.eta}
                            </span>
                          )}

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

                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#737e77]">
                            {rest.address && (
                              <span className="flex min-w-0 items-center gap-1 truncate">
                                <MapPin className="size-3.5 shrink-0 text-[#8aa31c]" />
                                {rest.address}
                              </span>
                            )}
                            {rest.costForTwo && (
                              <span className="shrink-0 font-semibold text-gray-600">
                                {rest.costForTwo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <div className="flex items-center justify-between border-t border-[#f0f3eb] pt-3 text-xs">
                          <span className="text-emerald-700 font-semibold text-[11px]">
                            {rest.eta ? `Delivery · ${rest.eta}` : 'Delivery time unavailable'}
                          </span>
                          <span className="font-bold text-[#86a018] group-hover:underline flex items-center gap-1">
                            View Menu <ArrowRight className="size-3" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
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
                      {order.restaurantImage ? (
                        <img
                          src={order.restaurantImage}
                          alt={order.restaurantName}
                          className="size-14 rounded-2xl object-cover shrink-0"
                        />
                      ) : (
                        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gray-100 text-gray-400">
                          <Store className="size-5" />
                        </span>
                      )}
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
                    <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
                      {user?.name || 'Customer Account'}
                    </h2>
                    <p className="mt-0.5 text-xs text-gray-300 font-medium">
                      {user?.email || 'authenticated@crave.com'}{' '}
                      {user?.phone ? `• ${user.phone}` : ''}
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
                    {
                      pastOrders.filter(
                        (o) => o.status === 'Delivered' || o.status === 'In Progress'
                      ).length
                    }
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-1">Orders Placed</p>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold text-[#d9f447]">
                    ₹{pastOrders.reduce((a, o) => a + (o.discount || 0), 0)}
                  </p>
                  <p className="text-xs text-gray-400 font-medium mt-1">Total Savings</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-[#e2e8f0] pb-4 mb-4">
                    <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                      <User className="size-4 text-[#18201c]" /> Personal Details &amp; Delivery
                      Address
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
                        onClick={async () => {
                          if (!deliveryAddress.trim()) {
                            triggerToast('Please enter a delivery address')
                            return
                          }
                          try {
                            const res = await fetch('/api/user/update', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ address: deliveryAddress }),
                            })
                            if (!res.ok) throw new Error('Failed to save')
                            setEditAddress(false)
                            triggerToast('Address saved!')
                          } catch {
                            triggerToast('Could not save address. Please try again.')
                          }
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
                      <p className="font-bold text-[#18201c]">
                        End-to-End Encryption &amp; Security
                      </p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        All user accounts, delivery coordinates, and payment records are secured
                        using TLS encryption and Supabase PostgreSQL Row Level Security (RLS).
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                      <p className="font-bold text-[#18201c]">Zero Third-Party Data Selling</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        crave. never sells, rents, or trades your personal phone number, location
                        history, or order data to external advertising networks.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f8fafc] p-4 border border-[#e2e8f0]">
                      <p className="font-bold text-[#18201c]">Payment Verification</p>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Payment UTR references submitted for manual verification are cleared
                        directly with verified platform admin records and purged after processing.
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
              <div className="overflow-hidden rounded-3xl border border-[#dfe5db] bg-white shadow-xl">
                {/* Header Banner */}
                <div className="bg-gradient-to-br from-[#18201c] via-[#222c27] to-[#18201c] p-6 sm:p-7 text-white relative overflow-hidden">
                  {/* Subtle Background Glow */}
                  <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#d9f447]/10 blur-3xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div className="space-y-3 min-w-0">
                      {/* Status Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] px-3 py-1 text-xs font-black text-[#18201c] shadow-xs tracking-wide uppercase">
                          <span className="size-1.5 rounded-full bg-[#18201c] animate-pulse" />
                          Order #
                          {typeof activeOrder.id === 'string' && activeOrder.id.length > 10
                            ? activeOrder.id.slice(0, 8).toUpperCase()
                            : activeOrder.id}
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-bold text-emerald-300 backdrop-blur-xs">
                          {activeOrder.statusStep === 1 && 'Order Confirmed'}
                          {activeOrder.statusStep === 2 && 'Kitchen Cooking'}
                          {activeOrder.statusStep === 3 && 'Out for Delivery'}
                          {activeOrder.statusStep === 4 && 'Delivered to Doorstep'}
                        </span>
                        {activeOrder.otp && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] px-3 py-1 text-xs font-mono font-black text-[#18201c] shadow-xs">
                            <span className="text-[10px] uppercase font-sans font-bold tracking-wider opacity-75">
                              OTP
                            </span>
                            <span className="tracking-widest">{activeOrder.otp}</span>
                          </span>
                        )}
                        {activeOrder.paymentStatus === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/20 border border-amber-400/30 px-3 py-1 text-xs font-bold text-amber-200">
                            Payment Pending
                          </span>
                        )}
                      </div>

                      <div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                          {activeOrder.restaurantName}
                        </h2>
                        <p className="mt-1 text-xs text-white/70 flex flex-wrap items-center gap-2">
                          <span>Placed at {activeOrder.timestamp}</span>
                          <span>•</span>
                          <span className="font-semibold text-white">
                            Total ₹{activeOrder.total}
                          </span>
                          {activeOrder.items && activeOrder.items.length > 0 && (
                            <>
                              <span>•</span>
                              <span>
                                {activeOrder.items.length}{' '}
                                {activeOrder.items.length === 1 ? 'item' : 'items'}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md px-5 py-3 text-left sm:text-right shadow-inner">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                        Estimated Delivery
                      </p>
                      <p className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                        18 - 22 mins
                      </p>
                    </div>
                  </div>
                </div>

                {/* Progress Stepper Section */}
                <div className="p-6 sm:p-8 border-b border-gray-100 bg-white">
                  <div className="flex items-center justify-between mb-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                      Live Order Status
                    </p>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Step {activeOrder.statusStep} of 4
                    </span>
                  </div>

                  {/* Connected Horizontal Timeline */}
                  <div className="relative max-w-3xl mx-auto px-2 py-2">
                    {/* Connecting Track Line */}
                    <div className="absolute top-5 left-8 right-8 h-1 bg-gray-100 rounded-full -z-0">
                      <div
                        className="h-full bg-gradient-to-r from-[#d9f447] to-emerald-500 rounded-full transition-all duration-700 ease-in-out"
                        style={{
                          width: `${((Math.max(1, Math.min(activeOrder.statusStep, 4)) - 1) / 3) * 100}%`,
                        }}
                      />
                    </div>

                    {/* Step Nodes */}
                    <div className="grid grid-cols-4 gap-1 text-center relative z-10">
                      {[
                        { num: 1, title: 'Confirmed', desc: 'Order placed' },
                        { num: 2, title: 'Cooking', desc: 'In kitchen' },
                        { num: 3, title: 'On the Way', desc: 'Out for delivery' },
                        { num: 4, title: 'Delivered', desc: 'At doorstep' },
                      ].map((step) => {
                        const isDone = activeOrder.statusStep > step.num
                        const isCurrent = activeOrder.statusStep === step.num
                        const isPassedOrCurrent = activeOrder.statusStep >= step.num

                        return (
                          <div key={step.num} className="flex flex-col items-center group">
                            {/* Circle Indicator */}
                            <div
                              className={`grid size-10 sm:size-11 place-items-center rounded-full font-black text-xs transition-all duration-300 ${
                                isDone
                                  ? 'bg-[#d9f447] text-[#18201c] shadow-md ring-4 ring-[#d9f447]/30 scale-105'
                                  : isCurrent
                                    ? 'bg-[#18201c] text-[#d9f447] shadow-lg ring-4 ring-[#18201c]/20 animate-pulse scale-110'
                                    : 'bg-white border-2 border-gray-200 text-gray-400'
                              }`}
                            >
                              {isDone ? <Check className="size-5 stroke-[3]" /> : step.num}
                            </div>

                            {/* Label */}
                            <div className="mt-3 space-y-0.5">
                              <p
                                className={`text-xs font-bold transition-colors ${
                                  isPassedOrCurrent ? 'text-[#18201c]' : 'text-gray-400'
                                }`}
                              >
                                {step.title}
                              </p>
                              <p className="text-[10px] text-gray-400 hidden sm:block">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Rider Delivery Route View */}
                <div className="p-6 bg-[#f8f9f6] border-b border-gray-200 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-base text-[#18201c] flex items-center gap-2">
                        <Compass
                          className="size-5 text-emerald-600 animate-spin"
                          style={{ animationDuration: '8s' }}
                        />
                        Live Rider Delivery Route
                      </h4>
                      <p className="text-xs text-[#737e77] mt-0.5">
                        Tracking rider moving live on road from kitchen counter to {deliveryAddress}
                        .
                      </p>
                    </div>
                  </div>

                  <LiveDriverMap
                    restaurantName={activeOrder.restaurantName}
                    customerAddress={deliveryAddress}
                    driverName={activeOrder.driverName || 'Assigned Delivery Partner'}
                    statusStep={activeOrder.statusStep}
                    driverLat={activeOrder.driverLat || null}
                    driverLng={activeOrder.driverLng || null}
                  />
                </div>

                {/* Assigned Delivery Partner Card */}
                <div className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div className="flex items-center gap-3.5">
                    <div className="grid size-12 place-items-center rounded-2xl bg-[#18201c] text-white shrink-0 shadow-md">
                      <Bike className="size-6 text-[#d9f447]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-[#737e77]">
                        Assigned Delivery Partner
                      </p>
                      <p className="font-extrabold text-sm text-[#18201c] mt-0.5">
                        {activeOrder.driverName || 'Awaiting driver assignment'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeOrder.driverPhone ? (
                      <a
                        href={`tel:${activeOrder.driverPhone}`}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ded4] bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#2e3b34] transition shadow-sm"
                      >
                        <PhoneCall className="size-3.5 text-[#d9f447]" />
                        Call Partner
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        Contact details available upon pickup
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
                  Browse your favourite dishes and place an order to see live delivery tracking
                  here.
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
              {menuItemsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                  No dishes currently listed for this restaurant menu.
                </div>
              ) : (
                menuItemsList.map((item) => {
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
                })
              )}
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

                  {/* Coupons & Offers Section */}
                  <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-3.5 text-xs flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-[#18201c]">
                        <Tag className="size-4 text-[#86a018]" />
                        <span>Coupons &amp; Offers</span>
                      </div>
                      {appliedCoupon && (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 transition"
                        >
                          Remove Coupon
                        </button>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5">
                        <div className="flex items-center gap-2">
                          <Sparkles className="size-4 text-emerald-600 fill-emerald-600 shrink-0" />
                          <div>
                            <div className="flex items-center gap-1.5 font-extrabold text-[#18201c]">
                              <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded text-[10px] tracking-wide">
                                {appliedCoupon.code}
                              </span>
                              <span className="text-xs text-emerald-900">Applied</span>
                            </div>
                            <p className="text-[10px] text-emerald-700 mt-0.5">
                              {appliedCoupon.description || `You saved ₹${couponDiscount}!`}
                            </p>
                          </div>
                        </div>
                        <span className="font-extrabold text-emerald-800 text-xs shrink-0">
                          -₹{couponDiscount}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Enter coupon code (e.g. CRAVE50)"
                          value={couponCodeInput}
                          onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleApplyCouponCode()
                            }
                          }}
                          className="flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-[#18201c] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#86a018] focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => handleApplyCouponCode()}
                          className="rounded-xl bg-[#18201c] px-4 py-2 text-xs font-bold text-white hover:bg-[#323d36] transition shadow-xs"
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {couponMessage && (
                      <div
                        className={`rounded-xl p-2 text-[11px] font-medium flex items-center gap-2 ${
                          couponMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {couponMessage.type === 'success' ? (
                          <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="size-3.5 text-rose-600 shrink-0" />
                        )}
                        <span>{couponMessage.text}</span>
                      </div>
                    )}

                    {/* Available Coupons List */}
                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-200/60">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Available Coupons
                        </p>
                        <div className="flex flex-col gap-1.5 max-h-32 overflow-y-auto pr-1">
                          {availableCoupons.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-xl border border-dashed border-[#86a018]/50 bg-[#f8faee] p-2 hover:bg-[#f3f7e3] transition"
                            >
                              <div className="pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono font-extrabold text-[10px] text-[#18201c] bg-[#d9f447] px-1.5 py-0.5 rounded">
                                    {c.code}
                                  </span>
                                  <span className="text-[10px] font-bold text-[#687e11]">
                                    {c.discountType === 'percentage'
                                      ? `${c.discountValue}% OFF`
                                      : `FLAT ₹${c.discountValue} OFF`}
                                  </span>
                                </div>
                                <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-1">
                                  {c.description}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyCouponCode(c.code)}
                                className="rounded-lg bg-[#18201c] px-2.5 py-1 text-[10px] font-extrabold text-[#d9f447] hover:bg-[#323d36] transition shrink-0"
                              >
                                APPLY
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-2xl bg-gray-50 p-4 text-xs flex flex-col gap-2 border border-gray-200">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal Items</span>
                      <span className="font-semibold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between font-semibold text-emerald-700">
                        <span>Coupon Discount ({appliedCoupon.code})</span>
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
                {checkoutConfig && companyUpiId ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          {companyMerchantName || 'Merchant UPI'}
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
                      <span className="text-[11px] text-emerald-800">
                        Amount to pay: <strong>₹{grandTotal}</strong>
                      </span>
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(companyUpiId)}&pn=${encodeURIComponent(companyMerchantName)}&am=${grandTotal}&cu=INR`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-950 underline hover:text-emerald-700"
                      >
                        Open UPI App <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p
                    role="alert"
                    className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900"
                  >
                    Online payment settings are not configured. Contact the platform administrator.
                  </p>
                )}

                <div className="rounded-2xl bg-[#f8f9f6] p-4 text-xs">
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Items Subtotal ({totalCartItemCount} items)</span>
                    <span>₹{cartSubtotal}</span>
                  </div>
                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex justify-between py-1 font-semibold text-emerald-700">
                      <span>Coupon Discount ({appliedCoupon.code})</span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-1 text-[#65716a]">
                    <span>Delivery, packaging &amp; taxes</span>
                    <span>₹{deliveryFee + packagingFee + taxAmount}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-[#e2e7dd] font-bold text-sm text-[#18201c]">
                    <span>Total Amount</span>
                    <span className="text-emerald-700">₹{grandTotal}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[#18201c]">
                    12-Digit UTR Payment Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="Enter the bank UTR reference"
                    value={utrRef}
                    onChange={(e) => {
                      setUtrRef(e.target.value.replace(/\D/g, ''))
                      setUtrError('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 text-xs outline-none focus:border-[#86a018] font-mono font-bold"
                  />
                  {utrError && (
                    <p className="mt-1 text-[11px] font-bold text-rose-600">{utrError}</p>
                  )}
                  {utrRef.length > 0 && utrRef.length < 12 && (
                    <p className="mt-1 text-[11px] font-bold text-gray-500">
                      Enter at least 12 digits to continue ({utrRef.length}/12)
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    !checkoutConfig || !companyUpiId || utrRef.replace(/\D/g, '').length < 12
                  }
                  className="mt-2 w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white transition hover:bg-[#323d36] shadow-md disabled:cursor-not-allowed disabled:opacity-50"
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
              Order ID:{' '}
              <strong className="font-mono text-[#18201c]">{verifyingModal.orderId}</strong>
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
                    :{(verifyingModal.timer % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="mt-2 text-[11px] text-gray-500">
                    Cross-referencing your 12-digit UTR reference with bank records.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    if (!verifyingModal.orderId) return
                    try {
                      await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          orderId: verifyingModal.orderId,
                          status: 'preparing',
                          payment_status: 'verified',
                        }),
                      })
                      await supabase
                        .from('payment_reviews')
                        .update({ status: 'verified' })
                        .eq('order_id', verifyingModal.orderId)
                    } catch (e) {}
                    setVerifyingModal((prev) => ({ ...prev, status: 'verified' }))
                  }}
                  className="w-full rounded-full bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="size-4" /> Instant Approve Payment &amp; Send to Kitchen
                </button>
              </div>
            )}

            {verifyingModal.status === 'verified' && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <p className="text-sm font-bold text-emerald-900">✓ Payment Approved!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your order has been accepted and dispatched to the kitchen. Redirecting to live
                  tracking...
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
                  onClick={() =>
                    setVerifyingModal({ open: false, timer: 180, orderId: '', status: 'verifying' })
                  }
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
                      {gpsDetecting
                        ? 'Detecting Precise GPS Location...'
                        : 'Use Current GPS Location'}
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
                  {savedAddresses.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-gray-300 p-4 text-xs text-gray-500">
                      No saved addresses yet.
                    </p>
                  ) : (
                    savedAddresses.map((addr) => {
                      const isSelected = deliveryAddress === addr.address
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setDeliveryAddress(addr.address)
                            setSelectedMapPin(
                              addr.lat != null && addr.lng != null
                                ? { lat: addr.lat, lng: addr.lng }
                                : null
                            )
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
                            <div
                              className={`grid size-9 place-items-center rounded-xl shrink-0 mt-0.5 ${
                                isSelected ? 'bg-[#18201c] text-white' : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              <MapPin className="size-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#18201c]">
                                  {addr.label}
                                </span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-0.5 rounded-md">
                                  {addr.tag}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1 font-medium">
                                {addr.address}
                              </p>
                              {addr.lat != null && addr.lng != null && (
                                <p className="mt-0.5 font-mono text-[10px] text-gray-400">
                                  Coordinates: {addr.lat}&deg; N, {addr.lng}&deg; E
                                </p>
                              )}
                            </div>
                          </div>

                          {isSelected && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    Live Interactive Map Pin Placement
                  </h4>
                  <span className="text-xs font-mono font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full">
                    {selectedMapPin
                      ? `${selectedMapPin.lat.toFixed(4)}°, ${selectedMapPin.lng.toFixed(4)}°`
                      : 'Drag pin or click map'}
                  </span>
                </div>

                <LocationPickerMap
                  initialLat={selectedMapPin?.lat ?? 12.6817}
                  initialLng={selectedMapPin?.lng ?? 77.4729}
                  onLocationSelect={(lat, lng, address) => {
                    setSelectedMapPin({ lat, lng })
                    if (address) {
                      setNewAddressInput(address)
                    }
                  }}
                />
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

      {/* Cart Store Conflict Modal */}
      {conflictModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-100 shrink-0">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#18201c]">Replace cart items?</h3>
                <p className="text-xs text-gray-500">
                  Your cart contains items from a different store.
                </p>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-600 leading-relaxed">
              Your cart currently has items from{' '}
              <strong className="text-[#18201c]">{conflictModal.currentRest}</strong>. Do you want
              to discard them and add{' '}
              <strong className="text-[#18201c]">{conflictModal.newItem?.name}</strong> from{' '}
              <strong className="text-[#18201c]">{conflictModal.newRest}</strong>?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() =>
                  setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
                }
                className="rounded-full bg-gray-100 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResolveConflictClear}
                className="rounded-full bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-rose-700 transition"
              >
                Yes, Start New Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

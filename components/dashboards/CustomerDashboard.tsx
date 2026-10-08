'use client'

import ThemeSelector from '@/components/ThemeSelector'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { useToast } from '@/lib/toast-context'
import { useOrderUpdates, useApprovalUpdates, useDriverLocation } from '@/lib/websocket'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Bell,
  Bike,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  Gift,
  Heart,
  HelpCircle,
  History,
  Home,
  KeyRound,
  Leaf,
  LocateFixed,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Minus,
  Moon,
  PhoneCall,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Store,
  Sun,
  Tag,
  Trash2,
  User,
  Utensils,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import InvoiceModal, { InvoiceOrderData } from '@/components/InvoiceModal'
import { usePathname, useRouter } from 'next/navigation'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { Coupon, fetchCouponsFromSupabase, validateCoupon } from '@/lib/coupons'
import { loadPaymentConfig } from '@/lib/payment-config'
import { calculateRoadTravelDistanceKm, calculateCheckoutPricing } from '@/lib/distance-pricing'
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

type Restaurant = {
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
  latitude?: number | string | null
  longitude?: number | string | null
}

type MenuItem = {
  id: string
  name: string
  detail: string
  price: number
  image: string
  veg: boolean
  restaurantName?: string
  restaurantId?: string
  vendorId?: string
}

type CartItem = MenuItem & {
  qty: number
}

type CustomerAddress = {
  id: string
  label: string
  address: string
  tag: string
  lat: number | null
  lng: number | null
}

interface LatLngCoords {
  lat: number
  lng: number
}

interface CouponMessageState {
  type: 'success' | 'error'
  text: string
}

interface ConflictModalState {
  open: boolean
  currentRest: string
  newRest: string
  newItem: MenuItem | null
}

interface VerifyingModalState {
  open: boolean
  timer: number
  orderId: string
  status: 'verifying' | 'verified' | 'rejected'
}

type PastOrder = {
  id: string
  restaurantName: string
  restaurantImage: string
  items: Array<{ name: string; qty: number; price: number }>
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

type CheckoutConfig = {
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

type CustomerTab = 'explore' | 'live-order' | 'orders' | 'profile'

export default function CustomerDashboard({
  initialTab = 'explore',
  initialOrderId,
}: {
  initialTab?: 'explore' | 'live-order' | 'orders' | 'profile'
  initialOrderId?: string
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

  const [activeTab, setActiveTab] = useState(currentTabFromPath)

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
  const [selectedTag, setSelectedTag] = useState('All')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)

  // Filter Toggles
  const [pureVegOnly, setPureVegOnly] = useState(false)
  const [offersOnly, setOffersOnly] = useState(false)
  const [fastDeliveryOnly, setFastDeliveryOnly] = useState(false)

  // Track Order modal
  const [trackingOrder, setTrackingOrder] = useState<PastOrder | null>(null)

  // Cart & Menu State
  const [cart, setCart] = useState<Array<CartItem>>([])
  const [menuItemsList, setMenuItemsList] = useState<Array<MenuItem>>([])
  const [restaurantsList, setRestaurantsList] = useState<Array<Restaurant>>([])
  const [showCartDrawer, setShowCartDrawer] = useState(false)
  const [showMobileSideMenu, setShowMobileSideMenu] = useState(false)
  const [showCheckoutModal, setShowCheckoutModal] = useState(false)
  const [pastOrders, setPastOrders] = useState<Array<PastOrder>>([])

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
          restaurantId: item.restaurantId,
          vendorId: item.vendorId,
        }))
      )
    }
  }, [cart, isCartInitialized, setGlobalItems])

  // Fetch Live Restaurants / Vendors from local DB
  useEffect(() => {
    async function fetchRestaurants() {
      try {
        let parsed: Array<Restaurant> = []
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
          const parsed: Array<MenuItem> = menuData.map((item: any) => ({
            id: item.id,
            name: item.name,
            detail: item.description || '',
            price: Number(item.price) || 0,
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            veg: Boolean(item.is_veg ?? true),
            restaurantName: selectedRestaurant?.name || 'Partner Kitchen',
            restaurantId: selectedRestaurant?.id || item.restaurant_id || item.restaurantId,
            vendorId: selectedRestaurant?.id || item.restaurant_id || item.restaurantId,
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
  }, [selectedRestaurant?.id, selectedRestaurant?.name, restaurantsList])

  const [ordersData, setOrdersData] = useState<Array<any>>([])

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

    const parsed: Array<PastOrder> = ordersData.map((o: any) => {
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
  const [savedAddresses, setSavedAddresses] = useState<Array<CustomerAddress>>([])
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [gpsDetecting, setGpsDetecting] = useState(false)
  const [selectedMapPin, setSelectedMapPin] = useState<LatLngCoords | null>(null)
  const [newAddressInput, setNewAddressInput] = useState('')
  const [newAddressLabel, setNewAddressLabel] = useState('Home')
  const [dietaryPref, setDietaryPref] = useState<'all' | 'veg' | 'non-veg'>('all')
  const [optCutlery, setOptCutlery] = useState(false)
  const [optContactless, setOptContactless] = useState(false)
  const [optNotifications, setOptNotifications] = useState(true)
  const [craveCoins, setCraveCoins] = useState(480)
  const [walletBalance, setWalletBalance] = useState(150)

  useEffect(() => {
    if (!user?.id) {
      setSavedAddresses([])
      return
    }
    const loadAddresses = async () => {
      try {
        const res = await fetch('/api/user/addresses')
        if (res.ok) {
          const json = await res.json()
          if (json.addresses && Array.isArray(json.addresses) && json.addresses.length > 0) {
            const mapped = json.addresses.map((row: any) => ({
              id: row.id,
              label: row.label,
              address: row.address,
              tag: row.is_default ? 'Primary' : row.label,
              lat: row.latitude == null ? null : Number(row.latitude),
              lng: row.longitude == null ? null : Number(row.longitude),
              isDefault: Boolean(row.is_default),
            }))
            setSavedAddresses(mapped)

            const primary = mapped.find((a: any) => a.isDefault) || mapped[0]
            const stored =
              typeof window !== 'undefined' ? localStorage.getItem('crave_selected_address') : null
            const chosen = stored || primary?.address || user?.address || ''

            if (chosen) {
              setDeliveryAddress(chosen)
              const matchedObj = mapped.find((a: any) => a.address === chosen) || primary
              if (matchedObj?.lat != null && matchedObj?.lng != null) {
                setSelectedMapPin({ lat: matchedObj.lat, lng: matchedObj.lng })
              }
            }
            return
          }
        }
      } catch (err) {}

      if (user.address) {
        setSavedAddresses([
          {
            id: 'addr_default',
            label: 'Home',
            address: user.address,
            tag: 'Primary',
            lat: 12.679898,
            lng: 77.469493,
          },
        ])
        setDeliveryAddress((prev) => prev || user.address || '')
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
          updateDeliveryAddress(`${lat}, ${lng}`)
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

    try {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: newAddressLabel,
          address: newAddressInput.trim(),
          latitude: selectedMapPin?.lat ?? null,
          longitude: selectedMapPin?.lng ?? null,
          is_default: true,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.address) {
        triggerToast(json.error || 'Could not save this address to your account.')
        return
      }

      const data = json.address
      const newEntry: CustomerAddress = {
        id: data.id,
        label: data.label,
        address: data.address,
        tag: data.is_default ? 'Primary' : data.label,
        lat: data.latitude == null ? null : Number(data.latitude),
        lng: data.longitude == null ? null : Number(data.longitude),
      }

      setSavedAddresses((prev) => [newEntry, ...prev.filter((a) => a.id !== newEntry.id)])
      updateDeliveryAddress(data.address)
      setNewAddressInput('')
      setShowLocationModal(false)
      triggerToast(`Address & coordinates saved & set as current delivery location!`)
    } catch (err) {
      triggerToast('Could not save this address to your account.')
    }
  }

  // Profile editing
  const [editAddress, setEditAddress] = useState(false)
  const [deliveryAddress, setDeliveryAddress] = useState('')

  const updateDeliveryAddress = (addr: string) => {
    const trimmed = (addr || '').trim()
    setDeliveryAddress(trimmed)
    if (typeof window !== 'undefined' && trimmed) {
      try {
        localStorage.setItem('crave_selected_address', trimmed)
      } catch {}
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crave_selected_address')
      if (stored) {
        setDeliveryAddress(stored)
      } else if (user?.address) {
        setDeliveryAddress(user.address)
      }
    }
  }, [user?.address])

  // Coupon Engine State
  const [availableCoupons, setAvailableCoupons] = useState<Array<Coupon>>([])
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<CouponMessageState | null>(null)

  // Payment State & Company UPI ID
  const [companyUpiId, setCompanyUpiId] = useState('')
  const [companyMerchantName, setCompanyMerchantName] = useState('')
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null)
  const [upiId, setUpiId] = useState('')
  const [utrRef, setUtrRef] = useState('')
  const [upiError, setUpiError] = useState('')
  const [utrError, setUtrError] = useState('')
  const [paymentDone, setPaymentDone] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState(initialOrderId)
  const [activeOrder, setActiveOrder] = useState<any>(null)
  const [liveDriverPos, setLiveDriverPos] = useState<LatLngCoords | null>(null)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<InvoiceOrderData | null>(null)

  useEffect(() => {
    if (initialOrderId) {
      setSelectedOrderId(initialOrderId)
    }
  }, [initialOrderId])

  const inProgressOrders = useMemo(() => {
    if (!user?.id || !ordersData.length) return []
    return ordersData.filter(
      (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    )
  }, [user?.id, ordersData])

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

    const activeList = ordersData.filter(
      (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    )

    let active = null
    if (selectedOrderId) {
      active = ordersData.find((o: any) => String(o.id) === String(selectedOrderId))
    }
    if (!active && activeList.length > 0) {
      active = activeList[0]
    }

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
        active.status === 'sent_to_vendor' ||
        active.status === 'accepted' ||
        active.status === 'preparing' ||
        active.status === 'cooking' ||
        active.status === 'packing' ||
        active.status === 'ready' ||
        active.status === 'ready_for_pickup' ||
        active.status === 'rider_assigned' ||
        active.status === 'at_restaurant' ||
        active.payment_status === 'verified'
      ) {
        statusStep = 2
      } else {
        statusStep = 1
      }

      const statusTextMap: Record<string, string> = {
        payment_submitted: 'Order Confirmed',
        payment_verified: 'Payment Verified',
        sent_to_vendor: 'Order Sent to Kitchen',
        accepted: 'Vendor Accepted Order',
        preparing: 'Kitchen Preparing Food',
        cooking: 'Chef Cooking Order',
        packing: 'Order Being Packed',
        ready: 'Food Ready for Pickup',
        ready_for_pickup: 'Food Ready for Pickup',
        rider_assigned: 'Rider Assigned & Ready for Pickup',
        at_restaurant: 'Rider Arrived at Kitchen',
        picked_up: 'Food Picked Up by Rider',
        out_for_delivery: 'Rider Out for Delivery',
        arrived_customer: 'Rider Arrived at Doorstep',
        delivered: 'Delivered to Doorstep',
        completed: 'Order Completed',
        cancelled: 'Order Cancelled',
      }
      const rawStatusStr = typeof active.status === 'string' ? active.status : ''
      const statusText =
        statusTextMap[rawStatusStr] || rawStatusStr.replace(/_/g, ' ') || 'Order Confirmed'

      let itemsArr: Array<CartItem> = []
      try {
        itemsArr = typeof active.items === 'string' ? JSON.parse(active.items) : active.items || []
      } catch (e) {}

      const rawDateVal =
        active.created_at || active.createdAt || active.timestamp || active.created_time
      let formattedTime = ''
      if (rawDateVal) {
        const d = new Date(rawDateVal)
        if (!isNaN(d.getTime())) {
          const timeStr = d.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
          const now = new Date()
          const isToday = d.toDateString() === now.toDateString()
          formattedTime = isToday
            ? timeStr
            : `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`
        }
      }
      if (!formattedTime) {
        formattedTime = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      }

      setActiveOrder({
        id: active.id,
        restaurantName: active.restaurant_name || active.restaurantName || 'Crave Kitchen Store',
        items: itemsArr,
        subtotal: Number(active.subtotal || 0),
        total: Number(active.total_amount || 0),
        statusStep,
        statusText,
        rawStatus: active.status,
        otp: active.delivery_otp || active.deliveryOtp || undefined,
        driverName: active.driver_name || null,
        driverPhone: active.driver_phone || null,
        driverLat: liveDriverPos?.lat ?? active.driver_lat ?? active.driver_latitude ?? null,
        driverLng: liveDriverPos?.lng ?? active.driver_lng ?? active.driver_longitude ?? null,
        restaurantLat: active.restaurant_lat ?? active.restaurant_latitude ?? null,
        restaurantLng: active.restaurant_lng ?? active.restaurant_longitude ?? null,
        customerLat: active.customer_lat ?? active.delivery_lat ?? active.latitude ?? null,
        customerLng: active.customer_lng ?? active.delivery_lng ?? active.longitude ?? null,
        timestamp: formattedTime,
        paymentStatus: active.payment_status || 'pending',
      })
    } else {
      setActiveOrder(null)
    }
  }, [user?.id, ordersData, selectedOrderId, liveDriverPos])

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
  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    open: false,
    currentRest: '',
    newRest: '',
    newItem: null,
  })

  // State for 3-Minute Payment Verification Window
  const [verifyingModal, setVerifyingModal] = useState<VerifyingModalState>({
    open: false,
    timer: 180,
    orderId: '',
    status: 'verifying',
  })

  // Cart Handlers
  function addToCart(item: MenuItem) {
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    const itemRestId = item.restaurantId || item.vendorId || selectedRestaurant?.id
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
      return [
        ...prev,
        {
          ...item,
          qty: 1,
          restaurantName: itemRest,
          restaurantId: itemRestId,
          vendorId: itemRestId,
        },
      ]
    })
    triggerToast(`Added ${item.name} to cart!`)
  }

  function handleResolveConflictClear() {
    if (!conflictModal.newItem) return
    const item = conflictModal.newItem
    const itemRest = item.restaurantName || selectedRestaurant?.name || 'Kitchen Store'
    setCart([{ ...item, qty: 1, restaurantName: itemRest }])
    setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
    triggerToast(`Cart reset. Added ${item.name}!`)
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

  // Dynamic Road Distance & Admin Payment Config Pricing Engine
  const activeRestaurantLat =
    selectedRestaurant?.latitude != null ? Number(selectedRestaurant.latitude) : 12.679898
  const activeRestaurantLng =
    selectedRestaurant?.longitude != null ? Number(selectedRestaurant.longitude) : 77.469493
  const activeDestLat = selectedMapPin?.lat ?? 12.679898
  const activeDestLng = selectedMapPin?.lng ?? 77.469493

  const calculatedRoadDistanceKm = useMemo(() => {
    return calculateRoadTravelDistanceKm(
      activeRestaurantLat,
      activeRestaurantLng,
      activeDestLat,
      activeDestLng
    )
  }, [activeRestaurantLat, activeRestaurantLng, activeDestLat, activeDestLng])

  const [calculatorApiBreakdown, setCalculatorApiBreakdown] = useState<any>(null)

  useEffect(() => {
    if (cart.length === 0) {
      setCalculatorApiBreakdown(null)
      return
    }
    let isMounted = true
    const restId =
      selectedRestaurant?.id ||
      cart[0]?.restaurantId ||
      cart[0]?.vendorId ||
      (cart[0] as any)?.restaurant_id ||
      undefined

    fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: cartSubtotal,
        distanceKm: calculatedRoadDistanceKm,
        restaurantId: restId,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.breakdown?.customerBilling) {
          setCalculatorApiBreakdown(data.breakdown.customerBilling)
        }
      })
      .catch((err) => {
        console.warn('Calculator API fetch failed in CustomerDashboard:', err)
      })

    return () => {
      isMounted = false
    }
  }, [
    cartSubtotal,
    calculatedRoadDistanceKm,
    selectedRestaurant,
    cart,
    appliedCoupon,
    couponDiscount,
  ])

  const pricingBreakdown = useMemo(() => {
    const localBreakdown = calculateCheckoutPricing({
      cartSubtotal,
      roadDistanceKm: calculatedRoadDistanceKm,
      config: checkoutConfig,
      couponDiscount,
    })

    if (calculatorApiBreakdown) {
      return {
        ...localBreakdown,
        deliveryFee: calculatorApiBreakdown.deliveryFee ?? localBreakdown.deliveryFee,
        handlingFee: calculatorApiBreakdown.handlingFee ?? localBreakdown.handlingFee,
        platformFee: calculatorApiBreakdown.platformFee ?? localBreakdown.platformFee,
        gstAmount: calculatorApiBreakdown.gstAmount ?? 0,
        grandTotal: calculatorApiBreakdown.grandTotal ?? localBreakdown.grandTotal,
      }
    }

    return {
      ...localBreakdown,
      gstAmount: 0,
    }
  }, [
    cartSubtotal,
    calculatedRoadDistanceKm,
    checkoutConfig,
    couponDiscount,
    calculatorApiBreakdown,
  ])

  const deliveryFee = pricingBreakdown.deliveryFee
  const packagingFee = pricingBreakdown.handlingFee
  const platformFee = pricingBreakdown.platformFee
  const taxAmount = pricingBreakdown.gstAmount ?? 0
  const grandTotal = pricingBreakdown.grandTotal

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
  const [approvalStatus, setApprovalStatus] = useState('pending')

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
    const generatedOtp = String(100000 + (otpBytes[0] % 900000))
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
        packaging_fee: pricingBreakdown.handlingFee,
        delivery_fee: pricingBreakdown.deliveryFee,
        platform_fee: pricingBreakdown.platformFee,
        distance: `${pricingBreakdown.roadDistanceKm} km`,
        discount_amount: couponDiscount,
        coupon_code: appliedCoupon?.code,
        gst: pricingBreakdown.gstAmount ?? 0,
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

      const rawDateVal = savedOrder.created_at || savedOrder.createdAt || savedOrder.timestamp
      const nowTime =
        rawDateVal && !isNaN(new Date(rawDateVal).getTime())
          ? new Date(rawDateVal).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })

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

      const nowTime = new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })

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
    <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#121815] pb-24 text-[#18201c] dark:text-white">
      {/* Top Header Navigation Banner */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] dark:border-[#27342d] bg-white/95 dark:bg-[#121815]/95 backdrop-blur-md px-3 py-2.5 sm:px-6 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-2 sm:gap-4">
          {/* Left Block: Logo + Location Selector */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link
              href="/"
              className="font-black text-xl sm:text-2xl lg:text-3xl tracking-tighter text-[#18201c] dark:text-white shrink-0 hover:opacity-90 transition"
            >
              crave<span className="text-[#86a018]">.</span>
            </Link>

            <div className="hidden lg:block h-7 w-px bg-gray-200 dark:bg-gray-800 mx-1 shrink-0" />

            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-2 text-left group min-w-0 rounded-2xl p-1 hover:bg-gray-100/80 dark:hover:bg-[#18201c] transition"
            >
              <div className="grid size-8 sm:size-9 lg:size-10 place-items-center rounded-xl bg-[#18201c] dark:bg-[#27342d] text-[#d9f447] shrink-0 shadow-xs">
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
                <div className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#18201c] dark:text-white truncate">
                  <span className="truncate max-w-[110px] xs:max-w-[140px] sm:max-w-[200px] lg:max-w-[280px]">
                    {deliveryAddress || user?.address || 'Select Delivery Location'}
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
                  ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] border-[#18201c] dark:border-[#d9f447] shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-[#18201c] text-gray-600 dark:text-gray-300 border-[#e2e8f0] dark:border-[#27342d] hover:text-[#18201c] dark:hover:text-white hover:bg-white dark:hover:bg-[#27342d]'
              }`}
            >
              <Compass
                className={`size-4 ${activeTab === 'explore' ? 'text-[#d9f447] dark:text-[#18201c]' : 'text-[#b5de28]'}`}
              />
              <span>Explore</span>
            </button>

            <button
              onClick={() => navigateToTab('live-order')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'live-order'
                  ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] border-[#18201c] dark:border-[#d9f447] shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-[#18201c] text-gray-600 dark:text-gray-300 border-[#e2e8f0] dark:border-[#27342d] hover:text-[#18201c] dark:hover:text-white hover:bg-white dark:hover:bg-[#27342d]'
              }`}
            >
              <Bike className="size-4" />
              <span>Track Drop</span>
              {activeOrder && activeOrder.statusStep < 4 && (
                <span className="size-2 rounded-full bg-[#d9f447] dark:bg-[#18201c] animate-pulse" />
              )}
            </button>

            <button
              onClick={() => navigateToTab('orders')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'orders'
                  ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] border-[#18201c] dark:border-[#d9f447] shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-[#18201c] text-gray-600 dark:text-gray-300 border-[#e2e8f0] dark:border-[#27342d] hover:text-[#18201c] dark:hover:text-white hover:bg-white dark:hover:bg-[#27342d]'
              }`}
            >
              <History className="size-4" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => navigateToTab('profile')}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 transition shrink-0 border ${
                activeTab === 'profile'
                  ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] border-[#18201c] dark:border-[#d9f447] shadow-xs'
                  : 'bg-[#f8fafc] dark:bg-[#18201c] text-gray-600 dark:text-gray-300 border-[#e2e8f0] dark:border-[#27342d] hover:text-[#18201c] dark:hover:text-white hover:bg-white dark:hover:bg-[#27342d]'
              }`}
            >
              <User className="size-4" />
              <span>Profile</span>
            </button>
          </div>

          {/* Right Block: Cart (Desktop only) + Mobile 3-Line Hamburger Button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => router.push('/user/cart')}
              className="hidden lg:flex relative items-center gap-2 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-5 py-2.5 text-sm font-bold text-white dark:text-[#18201c] shadow-md hover:bg-[#2a3831] dark:hover:bg-[#c8e434] transition active:scale-95 shrink-0"
            >
              <ShoppingCart className="size-4 text-[#d9f447] dark:text-[#18201c]" />
              <span>Cart ({totalCartItemCount})</span>
              {cartSubtotal > 0 && (
                <span className="text-[#d9f447] dark:text-[#18201c] font-semibold">
                  &bull; ₹{grandTotal}
                </span>
              )}
            </button>

            {/* Quick Mobile Cart Button */}
            <button
              onClick={() => router.push('/user/cart')}
              className="lg:hidden relative grid size-9 sm:size-10 place-items-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-xs hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shrink-0"
              aria-label="View Cart"
            >
              <ShoppingCart className="size-4 text-[#18201c] dark:text-white" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-[#b5de28] text-[9px] font-black text-white shadow-sm">
                  {totalCartItemCount}
                </span>
              )}
            </button>

            {/* 3-Line Hamburger Side Menu Trigger Button on Mobile */}
            <button
              onClick={() => setShowMobileSideMenu(true)}
              className="lg:hidden grid size-9 sm:size-10 place-items-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-xs hover:bg-gray-100 dark:hover:bg-[#27342d] transition active:scale-95 shrink-0"
              aria-label="Open side menu"
            >
              <Menu className="size-5 text-[#18201c] dark:text-white" />
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
        className={`fixed inset-y-0 right-0 z-[90] flex w-80 max-w-[85vw] flex-col bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          showMobileSideMenu ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Side Drawer Header */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] px-5 py-4 bg-[#f9faf7] dark:bg-[#121815]">
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="size-10 rounded-full object-cover border border-[#d9f447]"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-2xl bg-[#18201c] dark:bg-[#27342d] text-[#d9f447] text-sm font-black shadow-xs">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-[#18201c] dark:text-white truncate">
                {user?.name || 'Customer'}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                {user?.email || 'Logged in'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowMobileSideMenu(false)}
            className="grid size-9 place-items-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#27342d] transition"
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
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Compass
                className={`size-5 ${
                  activeTab === 'explore'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
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
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <Bike
                className={`size-5 ${
                  activeTab === 'live-order'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
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
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <History
                className={`size-5 ${
                  activeTab === 'orders'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Orders History
            </span>
            {pastOrders.length > 0 && (
              <span className="rounded-full bg-gray-100 dark:bg-[#27342d] px-2 py-0.5 text-xs font-extrabold text-gray-700 dark:text-gray-200">
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
                ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] shadow-xs'
                : 'text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d]'
            }`}
          >
            <span className="flex items-center gap-3">
              <User
                className={`size-5 ${
                  activeTab === 'profile'
                    ? 'text-[#d9f447] dark:text-[#18201c]'
                    : 'text-[#b5de28] dark:text-[#d9f447]'
                }`}
              />
              Profile &amp; Account
            </span>
          </button>

          <button
            onClick={() => {
              setShowMobileSideMenu(false)
              router.push('/user/cart')
            }}
            className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-[#18201c] dark:text-gray-200 hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] transition"
          >
            <span className="flex items-center gap-3">
              <ShoppingCart className="size-5 text-[#b5de28] dark:text-[#d9f447]" />
              My Cart
            </span>
            {totalCartItemCount > 0 && (
              <span className="rounded-full bg-[#18201c] dark:bg-[#d9f447] px-2.5 py-0.5 text-xs font-bold text-[#d9f447] dark:text-[#18201c]">
                {totalCartItemCount} items
              </span>
            )}
          </button>

          <div className="my-3 border-t border-gray-100 dark:border-[#27342d]" />
          <p className="px-3 text-[10px] font-black uppercase tracking-wider text-gray-400">
            Quick Access
          </p>

          <Link
            href="/user/cravexp"
            onClick={() => setShowMobileSideMenu(false)}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition"
          >
            <Zap className="size-5 text-emerald-600 fill-emerald-600" />
            <span>craveXP Instamart (10 Min)</span>
          </Link>
        </div>

        {/* Side Drawer Footer / Sign Out */}
        <div className="border-t border-gray-100 dark:border-[#27342d] p-4 bg-[#f9faf7] dark:bg-[#121815]">
          <button
            onClick={async () => {
              setShowMobileSideMenu(false)
              await logout()
              router.push('/login')
            }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
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
                className="rounded-2xl bg-[#d9f447] px-6 py-3.5 text-xs font-black text-[#121815] shadow-xl hover:bg-[#c8e434] transition hover:scale-105 active:scale-95 shrink-0 flex items-center gap-2"
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
                  className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white placeholder:text-gray-400 py-3 pl-11 pr-4 text-xs shadow-xs outline-none transition focus:border-[#86a018] focus:ring-2 focus:ring-[#d9f447]/50 font-medium"
                />
              </div>

              {/* What's on your mind? Circular Food Categories */}
              <div>
                <h3 className="text-sm font-bold text-[#18201c] dark:text-white mb-3 tracking-tight">
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
                              ? 'border-[#18201c] dark:border-[#d9f447] ring-2 ring-[#18201c]/20 dark:ring-[#d9f447]/30 scale-105'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
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
                            isSelected
                              ? 'text-[#18201c] dark:text-white font-bold'
                              : 'text-gray-600 dark:text-gray-400 font-medium'
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
                <span className="font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1 text-[11px] uppercase mr-1">
                  <Filter className="size-3.5 text-gray-600 dark:text-gray-400" /> Filters:
                </span>
                <button
                  onClick={() => setPureVegOnly(!pureVegOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    pureVegOnly
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#27342d] hover:bg-gray-50 dark:hover:bg-[#27342d]'
                  }`}
                >
                  Pure Veg
                </button>
                <button
                  onClick={() => setOffersOnly(!offersOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    offersOnly
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#27342d] hover:bg-gray-50 dark:hover:bg-[#27342d]'
                  }`}
                >
                  Offers Only
                </button>
                <button
                  onClick={() => setFastDeliveryOnly(!fastDeliveryOnly)}
                  className={`rounded-full px-3.5 py-1.5 font-bold border transition ${
                    fastDeliveryOnly
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-[#18201c] text-gray-700 dark:text-gray-200 border-gray-300 dark:border-[#27342d] hover:bg-gray-50 dark:hover:bg-[#27342d]'
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
                  <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-1.5">
                    <Flame className="size-4 text-amber-500 fill-amber-500" /> Signature Dishes
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
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
                    className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 flex flex-col justify-between shadow-xs hover:border-gray-300 dark:hover:border-gray-600 transition"
                  >
                    <div>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="h-36 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <div className="grid h-36 w-full place-items-center rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400">
                          <ShoppingBag className="size-8" />
                        </div>
                      )}
                      <p className="mt-3 font-bold text-sm text-[#18201c] dark:text-white">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.detail}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-100 dark:border-[#27342d]">
                      <span className="font-bold text-sm text-[#18201c] dark:text-white">
                        ₹{item.price}
                      </span>
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
                  <h3 className="font-bold text-lg text-[#18201c] dark:text-white">
                    Restaurants ({filteredRestaurants.length})
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Available restaurants from the database.
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredRestaurants.length === 0 ? (
                  <p className="col-span-full rounded-2xl border border-dashed border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-8 text-center text-sm text-gray-600 dark:text-gray-400">
                    No restaurants match these filters.
                  </p>
                ) : (
                  filteredRestaurants.map((rest) => (
                    <div
                      key={rest.id}
                      onClick={() => setSelectedRestaurant(rest)}
                      className="group cursor-pointer overflow-hidden rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] transition hover:-translate-y-1 hover:shadow-xl flex flex-col justify-between"
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
                            <div className="grid size-full place-items-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                              <MapPin className="size-8" />
                            </div>
                          )}
                          <div className="absolute left-3 top-3 flex items-center gap-1.5">
                            {rest.tag && (
                              <span className="rounded-full bg-white/95 dark:bg-[#18201c]/95 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4f5f15] dark:text-[#d9f447] backdrop-blur-md shadow-xs">
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
                              <h3 className="font-bold text-base tracking-tight text-[#18201c] dark:text-white">
                                {rest.name}
                              </h3>
                              <p className="mt-0.5 text-xs text-[#737e77] dark:text-gray-400">
                                {rest.cuisine}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#737e77] dark:text-gray-400">
                            {rest.address && (
                              <span className="flex min-w-0 items-center gap-1 truncate">
                                <MapPin className="size-3.5 shrink-0 text-[#8aa31c]" />
                                {rest.address}
                              </span>
                            )}
                            {rest.costForTwo && (
                              <span className="shrink-0 font-semibold text-gray-600 dark:text-gray-400">
                                {rest.costForTwo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 pt-0">
                        <div className="flex items-center justify-between border-t border-[#f0f3eb] dark:border-[#27342d] pt-3 text-xs">
                          <span className="text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
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
              <h2 className="text-2xl font-bold text-[#18201c] dark:text-white">Your Orders</h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                {pastOrders.length} orders placed
              </p>
            </div>

            {pastOrders.length === 0 ? (
              <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-16 text-center">
                <ShoppingBag className="mx-auto size-14 text-gray-200 dark:text-gray-700 mb-3" />
                <p className="font-bold text-[#18201c] dark:text-white">No Orders Yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your order history will appear here after placing an order.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
                  className="mt-5 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-2.5 text-xs font-bold text-white dark:text-[#18201c]"
                >
                  Explore Kitchens
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {pastOrders.map((order) => (
                  <div
                    key={order.id}
                    className="overflow-hidden rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] shadow-xs"
                  >
                    <div className="flex items-center gap-4 border-b border-[#f0f3ec] dark:border-[#27342d] p-5">
                      {order.restaurantImage ? (
                        <img
                          src={order.restaurantImage}
                          alt={order.restaurantName}
                          className="size-14 rounded-2xl object-cover shrink-0"
                        />
                      ) : (
                        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400">
                          <Store className="size-5" />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              order.status === 'Delivered'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : order.status === 'In Progress'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 animate-pulse'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
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
                        <h3 className="mt-1 font-bold text-sm text-[#18201c] dark:text-white truncate">
                          {order.restaurantName}
                        </h3>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                          {order.date} · {order.time}
                        </p>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <p className="font-bold text-base text-[#18201c] dark:text-white">
                          ₹{order.total}
                        </p>
                        {order.status === 'In Progress' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrderId(String(order.id))
                              router.push(`/user/track/${order.id}`)
                            }}
                            className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                          >
                            <Bike className="size-3" /> Track Live Order
                          </button>
                        )}
                        {(order.status === 'Delivered' ||
                          (order.status as string) === 'completed') && (
                          <button
                            type="button"
                            onClick={() =>
                              setInvoiceModalOrder({
                                id: order.id,
                                restaurantName: order.restaurantName,
                                customerName: user?.name || 'Customer',
                                customerAddress: user?.address || 'Bengaluru',
                                timestamp: `${order.date}, ${order.time}`,
                                items: order.items,
                                total: order.total,
                                status: order.status,
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-black dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                          >
                            <FileText className="size-3" /> View Invoice
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="px-5 py-3 border-b border-[#f5f6f3] dark:border-[#27342d]">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                        Items Ordered
                      </p>
                      <div className="flex flex-col gap-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-gray-700 dark:text-gray-300">
                              {item.qty}× {item.name}
                            </span>
                            <span className="font-semibold text-[#18201c] dark:text-white">
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
          <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-16">
            {/* 1. Hero Profile Card with Vibrant Accents & Stats */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-linear-to-br from-white via-[#fbfcf9] to-[#f4f7ed] dark:from-[#18201c] dark:via-[#1c2621] dark:to-[#141b17] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="relative">
                    <div className="grid size-16 sm:size-20 place-items-center rounded-2xl bg-linear-to-tr from-[#b5de28] to-[#d9f447] text-[#18201c] font-black text-2xl sm:text-3xl shadow-md">
                      {(user?.name || 'C').charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full bg-emerald-500 text-white ring-2 ring-white dark:ring-[#18201c]">
                      <Check className="size-3.5 stroke-[3]" />
                    </span>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                        <ShieldCheck className="size-3" /> Verified Customer
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                        <Crown className="size-3" /> Crave Gold Member
                      </span>
                    </div>

                    <h2 className="mt-1.5 text-xl sm:text-2xl font-black tracking-tight text-[#18201c] dark:text-white">
                      {user?.name || 'Customer Account'}
                    </h2>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#55635a] dark:text-gray-300 font-medium">
                      <span className="flex items-center gap-1">
                        <Mail className="size-3 text-[#b5de28]" />
                        {user?.email || 'authenticated@crave.com'}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1">
                        <PhoneCall className="size-3 text-[#b5de28]" />
                        {user?.phone || '+91 98765 43210'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    onClick={() => setEditAddress(!editAddress)}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] px-4 py-2 text-xs font-bold text-[#18201c] dark:text-white hover:bg-[#f4f7ed] dark:hover:bg-[#27342d] transition shadow-xs"
                  >
                    <User className="size-3.5" />
                    {editAddress ? 'Close Edit' : 'Edit Profile'}
                  </button>
                  <button
                    onClick={() => logout()}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition shadow-xs"
                  >
                    <LogOut className="size-3.5" />
                    Sign Out
                  </button>
                </div>
              </div>

              {/* 3 Quick Interactive Stats Pills */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#e5e9e0] dark:border-[#27342d] pt-6">
                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                    <ShoppingBag className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#18201c] dark:text-white">
                      {pastOrders.filter((o) => o.status === 'Delivered' || o.status === 'In Progress').length}
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">Orders Delivered</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                    <Tag className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400">
                      ₹{pastOrders.reduce((a, o) => a + (o.discount || 0), 0) + 120}
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">Lifetime Saved</p>
                  </div>
                </div>

                <div className="flex items-center gap-3.5 rounded-2xl bg-white dark:bg-[#121815] p-3.5 border border-[#e5e9e0] dark:border-[#27342d] shadow-2xs">
                  <div className="grid size-11 place-items-center rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                    <Gift className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {craveCoins} Coins
                    </p>
                    <p className="text-[11px] font-semibold text-[#66756c] dark:text-gray-400">Worth ₹{Math.floor(craveCoins / 10)} Off</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Crave Gold VIP Membership Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-amber-300/80 dark:border-amber-600/40 bg-linear-to-r from-amber-500/10 via-yellow-500/5 to-amber-500/15 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-amber-950/30 p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="grid size-11 place-items-center rounded-2xl bg-linear-to-tr from-amber-500 to-yellow-400 text-white shadow-md shrink-0">
                    <Crown className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#18201c] dark:text-white">
                        crave. Gold VIP Club
                      </h3>
                      <span className="rounded-full bg-amber-400 text-[#18201c] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        Active
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#55635a] dark:text-gray-300 font-medium leading-relaxed max-w-xl">
                      Enjoy <strong className="text-amber-800 dark:text-amber-300">Unlimited Free Delivery</strong> on all orders above ₹199, zero rain surge fees, and VIP priority kitchen dispatch.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/50 px-3 py-1.5 rounded-xl border border-amber-300/80 dark:border-amber-700/60">
                    Auto-renews monthly
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Personal Info Drawer / Form if active */}
            {editAddress && (
              <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-md animate-in slide-in-from-top-4 duration-200">
                <h3 className="text-sm font-bold text-[#18201c] dark:text-white mb-3 flex items-center gap-2">
                  <User className="size-4 text-[#b5de28]" /> Edit Profile &amp; Contact Details
                </h3>
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="font-bold text-[#55635a] dark:text-gray-400 block mb-1">
                      Primary Doorstep Address
                    </label>
                    <textarea
                      rows={2}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-3 font-medium outline-none focus:border-[#b5de28]"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditAddress(false)}
                      className="rounded-xl border border-gray-200 dark:border-[#27342d] px-4 py-2 font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
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
                          triggerToast('Personal details updated successfully!')
                        } catch {
                          triggerToast('Could not save address. Please try again.')
                        }
                      }}
                      className="rounded-xl bg-[#b5de28] px-5 py-2 font-black text-white hover:bg-[#728812] transition shadow-xs"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Appearance & Theme Settings (User Requirement: Default Light, Switch to Dark in Accounts) */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] gap-2 mb-5">
                <div>
                  <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <Sun className="size-4 text-[#b5de28]" />
                    <span>App Theme &amp; Visual Appearance</span>
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 mt-1 font-medium">
                    Crave defaults to fresh <strong className="text-[#b5de28]">Light Theme</strong>. If you prefer low-light viewing, select <strong className="text-[#18201c] dark:text-white">Dark Mode</strong> below anytime.
                  </p>
                </div>
                <span className="self-start sm:self-center inline-flex items-center gap-1.5 rounded-full bg-[#f4f7ed] dark:bg-[#27342d] px-3 py-1 text-[11px] font-bold text-[#b5de28] dark:text-[#d9f447]">
                  <Sparkles className="size-3" /> Live Switching
                </span>
              </div>
              <ThemeSelector />
            </div>

            {/* 4. Saved Delivery Locations Quick Selector */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 sm:p-7 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] mb-4">
                <div>
                  <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <MapPin className="size-4 text-[#b5de28]" />
                    <span>Saved Delivery Addresses</span>
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 mt-0.5 font-medium">
                    Manage your doorstep drop-off destinations ({savedAddresses.length} saved)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowLocationModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#b5de28] hover:bg-[#728812] px-3.5 py-1.5 text-xs font-black text-white transition shadow-xs"
                >
                  <Plus className="size-3.5" />
                  <span>Add New</span>
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {savedAddresses.length === 0 ? (
                  <div className="sm:col-span-2 rounded-2xl border border-dashed border-[#dfe4dc] dark:border-[#27342d] p-6 text-center">
                    <MapPin className="size-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                    <p className="text-xs font-bold text-[#18201c] dark:text-white">No saved addresses yet</p>
                    <p className="text-[11px] text-gray-500 mt-1">Tap Add New to drop a pin or save your home/work address.</p>
                  </div>
                ) : (
                  savedAddresses.map((addr) => {
                    const isSelected = deliveryAddress === addr.address
                    return (
                      <div
                        key={addr.id}
                        className={`flex flex-col justify-between rounded-2xl p-4 border transition-all ${
                          isSelected
                            ? 'border-[#b5de28] dark:border-[#d9f447] bg-[#f8fbf4] dark:bg-[#151f19] shadow-xs'
                            : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="grid size-7 place-items-center rounded-lg bg-[#f0f3eb] dark:bg-[#27342d] text-[#d9f447] text-xs font-bold">
                              {addr.label.toLowerCase().includes('work') ? (
                                <Building2 className="size-3.5 text-[#d9f447]" />
                              ) : addr.label.toLowerCase().includes('home') ? (
                                <Home className="size-3.5 text-[#d9f447]" />
                              ) : (
                                <MapPin className="size-3.5 text-[#d9f447]" />
                              )}
                            </span>
                            <span className="font-extrabold text-xs text-[#18201c] dark:text-white capitalize">
                              {addr.label}
                            </span>
                          </div>
                          {isSelected && (
                            <span className="rounded-full bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 uppercase">
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#55635a] dark:text-gray-300 font-medium my-2.5 line-clamp-2 leading-relaxed">
                          {addr.address}
                        </p>

                        <button
                          type="button"
                          onClick={() => {
                            updateDeliveryAddress(addr.address)
                            setSelectedMapPin(addr.lat != null && addr.lng != null ? { lat: addr.lat, lng: addr.lng } : null)
                            triggerToast(`Switched active delivery location to ${addr.label}!`)
                          }}
                          className={`w-full py-1.5 rounded-xl text-xs font-bold transition ${
                            isSelected
                              ? 'bg-[#d9f447] text-[#18201c]'
                              : 'bg-[#f4f7ed] dark:bg-[#27342d] text-[#18201c] dark:text-white hover:bg-[#e2e7dc]'
                          }`}
                        >
                          {isSelected ? 'Delivering Here' : 'Deliver Here'}
                        </button>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* 5. Food Preferences & Dietary Settings */}
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
                <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2 pb-3 border-b border-[#f0f3eb] dark:border-[#27342d] mb-4">
                  <Utensils className="size-4 text-[#d9f447]" /> Dining &amp; Dietary Preferences
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-[#55635a] dark:text-gray-400 block mb-2">
                      Preferred Food Menu Filter
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'all', label: 'All Dishes', icon: Utensils },
                        { id: 'veg', label: 'Veg Only', icon: Leaf },
                        { id: 'non-veg', label: 'Non-Veg', icon: Flame },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setDietaryPref(item.id as any)
                            triggerToast(`Set food preference to ${item.label}`)
                          }}
                          className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-2xl border text-xs font-bold transition ${
                            dietaryPref === item.id
                              ? 'border-[#b5de28] bg-[#f4f7ed] dark:bg-[#27342d] text-[#18201c] dark:text-white ring-1 ring-[#b5de28]'
                              : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <item.icon className="size-4 mb-1 text-[#d9f447]" />
                          <span>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="pr-4">
                        <p className="text-xs font-bold text-[#18201c] dark:text-white">Eco-friendly Cutlery</p>
                        <p className="text-[11px] text-[#66756c] dark:text-gray-400">Skip disposable plastic spoons &amp; tissues</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={optCutlery}
                        onChange={(e) => {
                          setOptCutlery(e.target.checked)
                          triggerToast(e.target.checked ? 'Eco-cutlery preference saved' : 'Cutlery opt-in saved')
                        }}
                        className="size-4 accent-[#b5de28] rounded cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer">
                      <div className="pr-4">
                        <p className="text-xs font-bold text-[#18201c] dark:text-white">Contactless Doorstep Drop-off</p>
                        <p className="text-[11px] text-[#66756c] dark:text-gray-400">Riders leave delivery outside door/gate</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={optContactless}
                        onChange={(e) => {
                          setOptContactless(e.target.checked)
                          triggerToast(e.target.checked ? 'Contactless drop enabled' : 'Hand-to-hand delivery enabled')
                        }}
                        className="size-4 accent-[#b5de28] rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* 6. Crave Cash Wallet & Payment Methods */}
              <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="font-black text-base text-[#18201c] dark:text-white flex items-center gap-2 pb-3 border-b border-[#f0f3eb] dark:border-[#27342d] mb-4">
                    <Wallet className="size-4 text-[#b5de28]" /> Crave Cash &amp; Payments
                  </h3>

                  <div className="rounded-2xl bg-linear-to-tr from-[#18201c] to-[#26352c] p-4 text-white shadow-sm mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#9eb3a4]">Instant Refund &amp; Cashback Balance</span>
                      <Wallet className="size-4 text-[#d9f447]" />
                    </div>
                    <p className="text-2xl font-black text-[#d9f447] mt-1">₹{walletBalance}.00</p>
                    <p className="text-[10px] text-gray-300 mt-1">Applied automatically at checkout for instant 1-tap discounts.</p>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-[#fbfcf9] dark:bg-[#121815] p-3">
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="size-4 text-[#b5de28]" />
                        <div>
                          <p className="text-xs font-bold text-[#18201c] dark:text-white">UPI Direct Transfer</p>
                          <p className="text-[10px] text-gray-500 font-mono">crave@upi &bull; Verified Receiver</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5">
                        Default
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-[#fbfcf9] dark:bg-[#121815] p-3">
                      <div className="flex items-center gap-2.5">
                        <Smartphone className="size-4 text-[#b5de28]" />
                        <div>
                          <p className="text-xs font-bold text-[#18201c] dark:text-white">App Notifications</p>
                          <p className="text-[10px] text-gray-500">Live order status SMS &amp; WhatsApp alerts</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={optNotifications}
                        onChange={(e) => setOptNotifications(e.target.checked)}
                        className="size-4 accent-[#b5de28] rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#f0f3eb] dark:border-[#27342d] flex items-center justify-between text-[11px] text-[#66756c] dark:text-gray-400">
                  <span className="flex items-center gap-1 font-semibold">
                    <Lock className="size-3 text-emerald-600" /> 256-Bit TLS Bank Encrypted
                  </span>
                  <Link href="/policies/security" className="font-bold text-[#b5de28] hover:underline">
                    Security Details
                  </Link>
                </div>
              </div>
            </div>

            {/* 7. Help, Support & Trust Policies Footer Bar */}
            <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-left">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0">
                  <HelpCircle className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white">Need help with an ongoing order?</h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Our Bengaluru support team is online 24/7 to resolve queries.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href="/policies"
                  className="rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition shadow-2xs"
                >
                  Trust Center
                </Link>
                <Link
                  href="/policies/fssai"
                  className="rounded-xl bg-[#18201c] dark:bg-[#d9f447] px-4 py-2 text-xs font-black text-white dark:text-[#18201c] hover:bg-[#2a3831] transition shadow-xs"
                >
                  FSSAI Hygiene
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Live Order Tracking View */}
        {activeTab === 'live-order' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6 px-1 sm:px-0">
            {activeOrder ? (
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center justify-between px-1">
                  <button
                    onClick={() => {
                      setSelectedOrderId(undefined)
                      router.push('/user/track')
                    }}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600 hover:text-[#18201c] transition"
                  >
                    <ArrowLeft className="size-4" />
                    <span>All Active Orders</span>
                  </button>
                </div>

                <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#dfe5db] bg-white shadow-xl">
                  {/* Header Banner */}
                  <div className="bg-gradient-to-br from-[#18201c] via-[#222c27] to-[#18201c] p-4 sm:p-7 text-white relative overflow-hidden">
                    {/* Subtle Background Glow */}
                    <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#d9f447]/10 blur-3xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
                      <div className="space-y-2.5 sm:space-y-3 min-w-0">
                        {/* Status Badges */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black text-[#18201c] shadow-xs tracking-wide uppercase">
                            <span className="size-1.5 rounded-full bg-[#18201c] animate-pulse" />
                            Order #
                            {typeof activeOrder.id === 'string' && activeOrder.id.length > 10
                              ? activeOrder.id.slice(0, 8).toUpperCase()
                              : activeOrder.id}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold text-emerald-300 backdrop-blur-xs">
                            {activeOrder.statusText || 'Order Confirmed'}
                          </span>
                          {activeOrder.otp &&
                            (activeOrder.statusStep >= 3 ||
                              activeOrder.rawStatus === 'ready' ||
                              activeOrder.rawStatus === 'ready_for_pickup' ||
                              activeOrder.rawStatus === 'rider_assigned' ||
                              activeOrder.rawStatus === 'out_for_delivery' ||
                              activeOrder.rawStatus === 'picked_up' ||
                              activeOrder.rawStatus === 'arrived_customer') && (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-mono font-black text-[#18201c] shadow-xs">
                                <span className="text-[9px] sm:text-[10px] uppercase font-sans font-bold tracking-wider opacity-75">
                                  Delivery OTP
                                </span>
                                <span className="tracking-widest">{activeOrder.otp}</span>
                              </span>
                            )}
                          {activeOrder.paymentStatus === 'pending' && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100/20 border border-amber-400/30 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold text-amber-200">
                              Payment Pending
                            </span>
                          )}
                          {(activeOrder.statusStep === 4 ||
                            activeOrder.rawStatus === 'delivered' ||
                            activeOrder.rawStatus === 'completed') && (
                            <button
                              type="button"
                              onClick={() =>
                                setInvoiceModalOrder({
                                  id: activeOrder.id,
                                  restaurantName: activeOrder.restaurantName,
                                  customerName: user?.name || 'Customer',
                                  customerAddress: deliveryAddress,
                                  customerPhone: user?.phone,
                                  timestamp: activeOrder.timestamp,
                                  items: activeOrder.items,
                                  subtotal: activeOrder.subtotal,
                                  total: activeOrder.total,
                                  paymentMethod:
                                    activeOrder.paymentStatus === 'verified' ? 'UPI Online' : 'UPI',
                                  otp: activeOrder.otp,
                                  status: activeOrder.statusText,
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] hover:bg-[#b8d629] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black text-[#18201c] shadow-md transition cursor-pointer shrink-0"
                            >
                              <FileText className="size-3 sm:size-3.5 text-[#18201c]" /> View Tax
                              Invoice
                            </button>
                          )}
                        </div>

                        <div>
                          <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                            {activeOrder.restaurantName}
                          </h2>
                          <p className="mt-1 text-[11px] sm:text-xs text-white/70 flex flex-wrap items-center gap-1.5 sm:gap-2">
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

                      <div className="shrink-0 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md p-3 sm:px-5 sm:py-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shadow-inner">
                        <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                          Estimated Delivery
                        </p>
                        <p className="text-lg sm:text-2xl font-black text-white sm:mt-0.5 tracking-tight">
                          {activeOrder.statusStep === 4
                            ? 'Delivered'
                            : `${Math.max(
                                10,
                                Math.round(
                                  calculateRoadTravelDistanceKm(
                                    activeOrder.restaurantLat
                                      ? Number(activeOrder.restaurantLat)
                                      : 12.6817,
                                    activeOrder.restaurantLng
                                      ? Number(activeOrder.restaurantLng)
                                      : 77.4729,
                                    activeOrder.customerLat
                                      ? Number(activeOrder.customerLat)
                                      : (selectedMapPin?.lat ?? 12.679898),
                                    activeOrder.customerLng
                                      ? Number(activeOrder.customerLng)
                                      : (selectedMapPin?.lng ?? 77.469493)
                                  ) *
                                    3 +
                                    10
                                )
                              )} - ${Math.max(
                                15,
                                Math.round(
                                  calculateRoadTravelDistanceKm(
                                    activeOrder.restaurantLat
                                      ? Number(activeOrder.restaurantLat)
                                      : 12.6817,
                                    activeOrder.restaurantLng
                                      ? Number(activeOrder.restaurantLng)
                                      : 77.4729,
                                    activeOrder.customerLat
                                      ? Number(activeOrder.customerLat)
                                      : (selectedMapPin?.lat ?? 12.679898),
                                    activeOrder.customerLng
                                      ? Number(activeOrder.customerLng)
                                      : (selectedMapPin?.lng ?? 77.469493)
                                  ) *
                                    3 +
                                    15
                                )
                              )} mins`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Progress Stepper Section */}
                  <div className="p-4 sm:p-8 border-b border-gray-100 dark:border-[#27342d] bg-white dark:bg-[#18201c]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
                      <div>
                        <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-[#d9f447]">
                          Live Order Progress
                        </p>
                        <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                          <span>{activeOrder.statusText}</span>
                          {activeOrder.paymentStatus === 'verified' && (
                            <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                              Payment Verified
                            </span>
                          )}
                        </h3>
                      </div>
                      <span className="self-start sm:self-center text-[10px] sm:text-xs font-extrabold text-emerald-700 dark:text-[#d9f447] bg-emerald-50 dark:bg-[#d9f447]/10 px-3 py-1 rounded-full border border-emerald-200 dark:border-[#d9f447]/30 flex items-center gap-1.5 shadow-xs">
                        <span className="size-2 rounded-full bg-emerald-500 dark:bg-[#d9f447] animate-ping" />
                        Step {activeOrder.statusStep} of 4
                      </span>
                    </div>

                    {/* Connected Horizontal Timeline */}
                    <div className="relative max-w-3xl mx-auto px-2 py-4">
                      {/* Connecting Track Line (Background & Filled Animated Progress) */}
                      <div className="absolute top-[26px] sm:top-[30px] left-8 right-8 sm:left-12 sm:right-12 h-1.5 bg-gray-100 dark:bg-[#253229] rounded-full z-0 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 via-[#d9f447] to-emerald-400 rounded-full transition-all duration-700 ease-out shadow-[0_0_12px_rgba(217,244,71,0.5)]"
                          style={{
                            width: `${((Math.max(1, Math.min(activeOrder.statusStep, 4)) - 1) / 3) * 100}%`,
                          }}
                        />
                      </div>

                      {/* Step Nodes */}
                      <div className="grid grid-cols-4 gap-2 text-center relative z-10">
                        {[
                          {
                            num: 1,
                            title: 'Confirmed',
                            desc:
                              activeOrder.paymentStatus === 'verified' ||
                              activeOrder.rawStatus === 'sent_to_vendor'
                                ? 'Payment Verified'
                                : 'Order Placed',
                          },
                          {
                            num: 2,
                            title: 'Cooking',
                            desc:
                              activeOrder.rawStatus === 'sent_to_vendor'
                                ? 'Sent to Kitchen'
                                : activeOrder.rawStatus === 'packing'
                                  ? 'Packing Order'
                                  : 'Preparing Food',
                          },
                          {
                            num: 3,
                            title:
                              activeOrder.rawStatus === 'ready' ||
                              activeOrder.rawStatus === 'ready_for_pickup' ||
                              activeOrder.rawStatus === 'rider_assigned' ||
                              activeOrder.rawStatus === 'at_restaurant'
                                ? 'Ready / Assigned'
                                : 'On the Way',
                            desc:
                              activeOrder.rawStatus === 'ready' ||
                              activeOrder.rawStatus === 'ready_for_pickup' ||
                              activeOrder.rawStatus === 'rider_assigned' ||
                              activeOrder.rawStatus === 'at_restaurant'
                                ? 'Food Prepared'
                                : 'Out for Delivery',
                          },
                          { num: 4, title: 'Delivered', desc: 'At Doorstep' },
                        ].map((step) => {
                          const isDone = activeOrder.statusStep > step.num
                          const isCurrent = activeOrder.statusStep === step.num
                          const isPassedOrCurrent = activeOrder.statusStep >= step.num

                          return (
                            <div key={step.num} className="flex flex-col items-center group">
                              {/* Circle Indicator */}
                              <div
                                className={`grid size-9 sm:size-12 place-items-center rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md ${
                                  isDone
                                    ? 'bg-emerald-500 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/20 dark:ring-[#d9f447]/30 scale-105'
                                    : isCurrent
                                      ? 'bg-emerald-600 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/30 dark:ring-[#d9f447]/40 scale-110 font-black shadow-lg animate-pulse'
                                      : 'bg-white dark:bg-[#121815] border-2 border-gray-200 dark:border-[#28372e] text-gray-400 dark:text-gray-500'
                                }`}
                              >
                                {isDone ? (
                                  <Check className="size-4 sm:size-6 stroke-[3]" />
                                ) : (
                                  <span>{step.num}</span>
                                )}
                              </div>

                              {/* Step Label & Subtitle */}
                              <div className="mt-2.5 sm:mt-3.5 space-y-0.5">
                                <p
                                  className={`text-xs sm:text-sm font-extrabold transition-colors leading-tight ${
                                    isPassedOrCurrent
                                      ? 'text-gray-900 dark:text-white'
                                      : 'text-gray-400 dark:text-gray-500'
                                  }`}
                                >
                                  {step.title}
                                </p>
                                <p
                                  className={`text-[10px] sm:text-xs leading-tight transition-colors hidden sm:block ${
                                    isCurrent
                                      ? 'text-emerald-600 dark:text-[#d9f447] font-semibold'
                                      : isPassedOrCurrent
                                        ? 'text-gray-500 dark:text-gray-400 font-medium'
                                        : 'text-gray-400 dark:text-gray-600'
                                  }`}
                                >
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
                  <div className="p-4 sm:p-6 bg-[#f8f9f6] border-b border-gray-200 flex flex-col gap-3 sm:gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-extrabold text-sm sm:text-base text-[#18201c] flex items-center gap-2">
                          <Compass
                            className="size-4 sm:size-5 text-emerald-600 animate-spin"
                            style={{ animationDuration: '8s' }}
                          />
                          Live Rider Delivery Route
                        </h4>
                        <p className="text-[11px] sm:text-xs text-[#737e77] mt-0.5">
                          {activeOrder.driverName && activeOrder.driverName !== 'Unassigned'
                            ? `Tracking rider moving live on road from kitchen counter to ${deliveryAddress}.`
                            : 'Live GPS route mapping will activate once a driver accepts your pickup.'}
                        </p>
                      </div>
                    </div>

                    {activeOrder.driverName && activeOrder.driverName !== 'Unassigned' ? (
                      <LiveDriverMap
                        restaurantName={activeOrder.restaurantName}
                        customerAddress={deliveryAddress}
                        driverName={activeOrder.driverName}
                        statusStep={activeOrder.statusStep}
                        driverLat={
                          liveDriverPos?.lat ??
                          (activeOrder.driverLat ? Number(activeOrder.driverLat) : null)
                        }
                        driverLng={
                          liveDriverPos?.lng ??
                          (activeOrder.driverLng ? Number(activeOrder.driverLng) : null)
                        }
                        restaurantLat={
                          activeOrder.restaurantLat ? Number(activeOrder.restaurantLat) : undefined
                        }
                        restaurantLng={
                          activeOrder.restaurantLng ? Number(activeOrder.restaurantLng) : undefined
                        }
                        customerLat={
                          activeOrder.customerLat
                            ? Number(activeOrder.customerLat)
                            : (selectedMapPin?.lat ?? undefined)
                        }
                        customerLng={
                          activeOrder.customerLng
                            ? Number(activeOrder.customerLng)
                            : (selectedMapPin?.lng ?? undefined)
                        }
                      />
                    ) : (
                      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-2.5 sm:gap-3 shadow-xs">
                        <div className="size-11 sm:size-12 rounded-2xl bg-[#f0f5db] text-[#7f9815] flex items-center justify-center shadow-xs">
                          <Bike className="size-5 sm:size-6 animate-pulse" />
                        </div>
                        <div>
                          <h5 className="font-extrabold text-xs sm:text-sm text-[#18201c]">
                            Awaiting Driver Acceptance
                          </h5>
                          <p className="text-[11px] sm:text-xs text-[#737e77] max-w-md mt-1 leading-relaxed">
                            Your order is confirmed and being prepared. The live GPS map will be
                            displayed here as soon as a delivery partner accepts the pickup request.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned Delivery Partner Card */}
                  <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#18201c]">
                    <div className="flex items-center gap-3">
                      <div className="grid size-10 sm:size-12 place-items-center rounded-xl sm:rounded-2xl bg-[#18201c] dark:bg-[#27342d] text-white shrink-0 shadow-md">
                        <Bike className="size-5 sm:size-6 text-[#d9f447]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-medium text-[#737e77] dark:text-gray-400">
                          Assigned Delivery Partner
                        </p>
                        <p className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white mt-0.5 truncate">
                          {activeOrder.driverName || 'Awaiting driver assignment'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                      {activeOrder.driverPhone ? (
                        <a
                          href={`tel:${activeOrder.driverPhone}`}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ded4] dark:border-[#27342d] bg-[#18201c] dark:bg-[#d9f447] px-4 sm:px-5 py-2.5 text-xs font-bold text-white dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] transition shadow-sm"
                        >
                          <PhoneCall className="size-3.5 text-[#d9f447] dark:text-[#18201c]" />
                          Call Partner
                        </a>
                      ) : (
                        <span className="text-[11px] sm:text-xs text-gray-400 italic">
                          Contact details available upon pickup
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer Delivery OTP Card */}
                  {activeOrder.otp && (
                    <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-[#27342d] bg-[#f7faef] dark:bg-[#1f2822] flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-b-3xl">
                      <div className="flex items-center gap-3">
                        <div className="grid size-10 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] shrink-0 shadow-xs">
                          <KeyRound className="size-5 font-bold" />
                        </div>
                        <div>
                          <p className="text-[10px] sm:text-[11px] font-extrabold uppercase text-[#7a9317] dark:text-[#d9f447] tracking-wider">
                            Delivery Verification OTP
                          </p>
                          <p className="text-xs font-bold text-[#18201c] dark:text-gray-200 mt-0.5">
                            Share this OTP with driver upon arrival
                          </p>
                        </div>
                      </div>
                      <span className="font-mono font-black text-base sm:text-lg text-[#18201c] dark:text-[#d9f447] bg-white dark:bg-[#121815] border border-[#d9f447]/60 px-4 py-1.5 rounded-xl shadow-xs tracking-widest text-center self-start sm:self-auto">
                        {activeOrder.otp}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : inProgressOrders.length > 0 ? (
              <div className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-[#dfe5db] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <span className="relative flex size-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d9f447] opacity-75"></span>
                      <span className="relative inline-flex rounded-full size-2.5 bg-[#b5de28]"></span>
                    </span>
                    Active Orders Under Process ({inProgressOrders.length})
                  </h3>
                  <span className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:inline">
                    Click an order to view live map &amp; status
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {inProgressOrders.map((ord: any) => {
                    const isCurrentSelected =
                      activeOrder && String(activeOrder.id) === String(ord.id)
                    let itemsArr: any[] = []
                    try {
                      itemsArr =
                        typeof ord.items === 'string'
                          ? JSON.parse(ord.items || '[]')
                          : ord.items || []
                    } catch (e) {}

                    const statusTextMap: Record<string, string> = {
                      payment_submitted: 'Order Confirmed',
                      payment_verified: 'Payment Verified',
                      sent_to_vendor: 'Sent to Kitchen',
                      accepted: 'Accepted',
                      preparing: 'Preparing Food',
                      cooking: 'Cooking',
                      packing: 'Packing Food',
                      ready: 'Ready for Pickup',
                      at_restaurant: 'Rider at Kitchen',
                      picked_up: 'Food Picked Up',
                      out_for_delivery: 'Out for Delivery',
                      arrived_customer: 'Rider Arrived',
                    }
                    const ordStatusText =
                      statusTextMap[ord.status] || ord.status?.replace(/_/g, ' ') || 'In Progress'

                    const rawDateVal = ord.created_at || ord.createdAt || ord.timestamp
                    const timeStr =
                      rawDateVal && !isNaN(new Date(rawDateVal).getTime())
                        ? new Date(rawDateVal).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : ''

                    return (
                      <div
                        key={ord.id}
                        onClick={() => {
                          setSelectedOrderId(String(ord.id))
                          router.push(`/user/track/${ord.id}`)
                        }}
                        className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                          isCurrentSelected
                            ? 'bg-[#18201c] text-white border-[#18201c] shadow-lg ring-2 ring-[#d9f447]'
                            : 'bg-[#f8f9f6] text-[#18201c] border-[#e1e6df] hover:border-gray-300 hover:shadow-md'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 min-w-0">
                          <div className="min-w-0">
                            <p
                              className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${isCurrentSelected ? 'text-[#d9f447]' : 'text-gray-400'}`}
                            >
                              Order #{String(ord.id).slice(0, 8).toUpperCase()}
                            </p>
                            <h4 className="font-extrabold text-xs sm:text-sm truncate mt-0.5">
                              {ord.restaurant_name || ord.restaurantName || 'Crave Kitchen Store'}
                            </h4>
                          </div>
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                              isCurrentSelected
                                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            }`}
                          >
                            {ordStatusText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between border-t border-white/10 pt-2.5 text-xs">
                          <div className="min-w-0 flex flex-col">
                            <span className={isCurrentSelected ? 'text-gray-300' : 'text-gray-500'}>
                              {itemsArr.length} {itemsArr.length === 1 ? 'item' : 'items'} &bull; ₹
                              {ord.total_amount || ord.subtotal || 0}
                            </span>
                            {timeStr && (
                              <span
                                className={`text-[10px] ${isCurrentSelected ? 'text-gray-400' : 'text-gray-400'}`}
                              >
                                Placed at {timeStr}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedOrderId(String(ord.id))
                              router.push(`/user/track/${ord.id}`)
                            }}
                            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition shadow-xs shrink-0 ${
                              isCurrentSelected
                                ? 'bg-[#d9f447] text-[#18201c] hover:bg-[#c8e434]'
                                : 'bg-[#18201c] text-[#ffffff] hover:bg-[#2e3b34]'
                            }`}
                          >
                            <Bike className="size-3" />
                            <span>{isCurrentSelected ? 'Live' : 'Track Order'}</span>
                            <ArrowRight className="size-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-12 text-center text-[#18201c] dark:text-white">
                <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5db] dark:bg-[#27342d] text-[#7f9815] dark:text-[#d9f447]">
                  <ShoppingBag className="size-8" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">
                  No Active Order Right Now
                </h3>
                <p className="mt-1 text-xs text-[#747e78] dark:text-gray-300 max-w-sm mx-auto">
                  Browse your favourite dishes and place an order to see live delivery tracking
                  here.
                </p>
                <button
                  onClick={() => navigateToTab('explore')}
                  className="mt-6 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c8e434] transition"
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
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-md sm:items-center sm:p-4">
          <div className="max-h-[90vh] w-full max-w-[600px] overflow-y-auto rounded-t-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white sm:rounded-3xl">
            <div className="flex items-start justify-between border-b border-[#25332a] pb-4">
              <div>
                <span className="rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#d9f447]">
                  {selectedRestaurant.tag}
                </span>
                <h2 className="mt-1 text-2xl font-bold text-white">{selectedRestaurant.name}</h2>
                <p className="text-xs text-[#9eb3a4]">
                  {selectedRestaurant.cuisine} · {selectedRestaurant.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedRestaurant(null)}
                className="grid size-8 place-items-center rounded-full bg-[#121815] border border-[#25332a] text-[#9eb3a4] hover:text-white hover:border-[#2d3b32] transition"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              {menuItemsList.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9eb3a4] border border-dashed border-[#25332a] bg-[#121815] rounded-2xl">
                  No dishes currently listed for this restaurant menu.
                </div>
              ) : (
                menuItemsList.map((item) => {
                  const inCart = cart.find((i) => i.id === item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 rounded-2xl border border-[#25332a] bg-[#121815] p-3 text-white transition hover:border-[#d9f447]/50"
                    >
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-20 rounded-xl object-cover shrink-0"
                        />
                      ) : (
                        <div className="size-20 rounded-xl bg-[#1c2620] border border-[#25332a] shrink-0 flex items-center justify-center text-[10px] text-[#9eb3a4]">
                          No image
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-white">{item.name}</h4>
                        {item.detail && (
                          <p className="text-xs text-[#9eb3a4] line-clamp-2 mt-0.5">
                            {item.detail}
                          </p>
                        )}
                        <p className="mt-2 text-sm font-bold text-[#d9f447]">₹{item.price}</p>
                      </div>

                      {inCart ? (
                        <div className="flex items-center gap-2 rounded-full bg-[#1c2620] border border-[#25332a] px-3 py-1.5 text-xs font-bold text-white shadow-xs">
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
                          className="flex items-center gap-1.5 rounded-full bg-[#d9f447] px-4 py-2 text-xs font-extrabold text-[#121815] transition hover:scale-105 hover:bg-[#c2dc3a]"
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
              <div className="sticky bottom-0 mt-6 rounded-2xl bg-[#121815] p-4 text-white flex items-center justify-between shadow-2xl border border-[#25332a]">
                <div>
                  <p className="text-xs text-[#9eb3a4]">{totalCartItemCount} items in cart</p>
                  <p className="text-lg font-bold text-[#d9f447]">₹{grandTotal}</p>
                </div>
                <button
                  onClick={() => router.push('/user/cart')}
                  className="flex items-center gap-2 rounded-full bg-[#d9f447] px-5 py-2.5 text-xs font-extrabold text-[#121815] shadow-md hover:scale-105 transition hover:bg-[#c2dc3a]"
                >
                  View Cart <ArrowRight className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout & Real UPI Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-[500px] rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white">
            <div className="flex items-start justify-between border-b border-[#25332a] pb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                  Direct Company UPI Payment
                </p>
                <h3 className="text-xl font-bold text-white">Complete Payment</h3>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="grid size-8 place-items-center rounded-full bg-[#121815] border border-[#25332a] text-[#9eb3a4] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {paymentDone ? (
              <div className="py-8 text-center">
                <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#d9f447] text-[#121815]">
                  <Check className="size-8" />
                </div>
                <h4 className="mt-4 text-xl font-bold text-white">Payment Submitted!</h4>
                <p className="mt-1 text-xs text-[#9eb3a4]">
                  Your 12-digit UTR reference has been logged for verification.
                </p>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="mt-4 flex flex-col gap-4">
                {/* Company UPI Box */}
                {checkoutConfig && companyUpiId ? (
                  <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-xs text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {companyMerchantName || 'Merchant UPI'}
                        </p>
                        <p className="font-mono text-base font-bold text-white mt-0.5">
                          {companyUpiId}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyCompanyUpi}
                        className="flex items-center gap-1 rounded-xl bg-[#121815] border border-emerald-500/40 px-3 py-1.5 font-bold text-emerald-300 shadow-xs hover:bg-emerald-500/20 transition"
                      >
                        <Copy className="size-3.5" /> Copy
                      </button>
                    </div>

                    <div className="mt-3 pt-3 border-t border-emerald-500/30 flex items-center justify-between">
                      <span className="text-[11px] text-[#9eb3a4]">
                        Amount to pay: <strong className="text-[#d9f447]">₹{grandTotal}</strong>
                      </span>
                      <a
                        href={`upi://pay?pa=${encodeURIComponent(companyUpiId)}&pn=${encodeURIComponent(companyMerchantName)}&am=${grandTotal}&cu=INR`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300 underline hover:text-emerald-200"
                      >
                        Open UPI App <ExternalLink className="size-3" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <p
                    role="alert"
                    className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-300"
                  >
                    Online payment settings are not configured. Contact the platform administrator.
                  </p>
                )}

                <div className="rounded-2xl bg-[#121815] p-4 text-xs space-y-2 border border-[#25332a]">
                  <div className="flex items-center justify-between font-semibold text-white">
                    <span className="flex items-center gap-1.5">
                      <ShoppingBag className="size-3.5 text-[#9eb3a4]" />
                      Items Subtotal ({totalCartItemCount} items)
                    </span>
                    <span>₹{cartSubtotal}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span className="flex items-center gap-1.5">
                      <Bike className="size-3.5 text-[#9eb3a4]" />
                      Delivery Partner Fee
                    </span>
                    {pricingBreakdown.isFreeDelivery ? (
                      <span className="font-bold text-[#d9f447] bg-[#d9f447]/20 border border-[#d9f447]/40 px-2 py-0.5 rounded-full text-[10px]">
                        FREE
                      </span>
                    ) : (
                      <span className="font-bold text-white">₹{pricingBreakdown.deliveryFee}</span>
                    )}
                  </div>

                  {(pricingBreakdown.surgeFee > 0 ||
                    pricingBreakdown.rainFee > 0 ||
                    pricingBreakdown.nightSurgeFee > 0) && (
                    <div className="flex items-center justify-between text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                      <span>Demand &amp; Weather Surge</span>
                      <span className="font-bold">
                        +₹
                        {pricingBreakdown.surgeFee +
                          pricingBreakdown.rainFee +
                          pricingBreakdown.nightSurgeFee}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span>Packaging &amp; Handling</span>
                    <span className="font-bold text-white">₹{pricingBreakdown.handlingFee}</span>
                  </div>

                  <div className="flex items-center justify-between text-[#9eb3a4]">
                    <span>Platform Service Fee</span>
                    <span className="font-bold text-white">₹{pricingBreakdown.platformFee}</span>
                  </div>

                  {(pricingBreakdown.gstAmount ?? 0) >= 0 && (
                    <div className="flex items-center justify-between text-[#9eb3a4]">
                      <span>GST &amp; Taxes</span>
                      <span className="font-bold text-white">
                        ₹{pricingBreakdown.gstAmount ?? 0}
                      </span>
                    </div>
                  )}

                  {appliedCoupon && couponDiscount > 0 && (
                    <div className="flex items-center justify-between font-bold text-[#d9f447] bg-[#d9f447]/10 p-2 rounded-xl border border-[#d9f447]/30">
                      <span className="flex items-center gap-1">
                        <Tag className="size-3.5 text-[#d9f447]" />
                        Coupon ({appliedCoupon.code})
                      </span>
                      <span>-₹{couponDiscount}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-2.5 border-t border-[#25332a] font-black text-sm text-white">
                    <span>Final Customer Total</span>
                    <span className="text-[#d9f447] text-base">₹{grandTotal}</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-white">
                    12-Digit UTR Payment Reference Number
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={25}
                    placeholder="Enter the bank UTR reference"
                    value={utrRef}
                    onChange={(e) => {
                      setUtrRef(e.target.value.replace(/\D/g, ''))
                      setUtrError('')
                    }}
                    className="mt-1.5 w-full rounded-xl border border-[#25332a] bg-[#121815] px-3.5 py-2.5 text-xs text-white outline-none focus:border-[#d9f447] font-mono font-bold"
                  />
                  {utrError && (
                    <p className="mt-1 text-[11px] font-bold text-rose-400">{utrError}</p>
                  )}
                  {utrRef.length > 0 && utrRef.length < 10 && (
                    <p className="mt-1 text-[11px] font-bold text-amber-400">
                      Enter at least 10 digits to enable confirmation ({utrRef.length}/10)
                    </p>
                  )}
                  {utrRef.length >= 10 && (
                    <p className="mt-1 text-[11px] font-bold text-[#d9f447] flex items-center gap-1">
                      <CheckCircle2 className="size-3" /> Valid UTR Reference length (
                      {utrRef.length} digits)
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={
                    !checkoutConfig || !companyUpiId || utrRef.replace(/\D/g, '').length < 10
                  }
                  className="mt-2 w-full rounded-full bg-[#d9f447] py-3.5 text-xs font-extrabold text-[#121815] transition hover:bg-[#c2dc3a] shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-gray-600"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-2xl text-white text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#d9f447] text-[#121815] shadow-md animate-pulse">
              <Sparkles className="size-7 fill-current" />
            </div>

            <h3 className="mt-4 text-xl font-bold text-white">Verifying Payment Details</h3>
            <p className="mt-1 text-xs text-[#9eb3a4]">
              Order ID: <strong className="font-mono text-white">{verifyingModal.orderId}</strong>
            </p>

            {verifyingModal.status === 'verifying' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl bg-[#121815] p-4 border border-[#25332a]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9eb3a4]">
                    Verification Window Remaining
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-[#d9f447]">
                    {Math.floor(verifyingModal.timer / 60)
                      .toString()
                      .padStart(2, '0')}
                    :{(verifyingModal.timer % 60).toString().padStart(2, '0')}
                  </p>
                  <p className="mt-2 text-[11px] text-[#9eb3a4]">
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
                  className="w-full rounded-full bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="size-4" /> Instant Approve Payment &amp; Send to Kitchen
                </button>
              </div>
            )}

            {verifyingModal.status === 'verified' && (
              <div className="mt-5 rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <p className="text-sm font-bold text-emerald-900">Payment Approved!</p>
                <p className="text-xs text-emerald-700 mt-1">
                  Your order has been accepted and dispatched to the kitchen. Redirecting to live
                  tracking...
                </p>
              </div>
            )}

            {verifyingModal.status === 'rejected' && (
              <div className="mt-5 space-y-3">
                <div className="rounded-2xl bg-rose-50 p-4 border border-rose-200">
                  <p className="text-sm font-bold text-rose-900">Payment Verification Failed</p>
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
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 p-0 sm:p-4 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowLocationModal(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-t-[2rem] sm:rounded-3xl bg-white shadow-2xl border-t sm:border border-gray-200 flex flex-col max-h-[85vh] sm:max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 pb-safe"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Drag Handle */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

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
                            updateDeliveryAddress(addr.address)
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
                  initialLat={selectedMapPin?.lat ?? 12.679898}
                  initialLng={selectedMapPin?.lng ?? 77.469493}
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

      {/* Invoice Modal */}
      {invoiceModalOrder && (
        <InvoiceModal order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}

      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121815]/95 border-t border-gray-200 dark:border-[#27342d] backdrop-blur-md lg:hidden px-2 py-1.5 shadow-lg pb-safe"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <button
            onClick={() => navigateToTab('explore')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'explore'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <Compass
              className={`size-5 ${
                activeTab === 'explore'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Explore</span>
          </button>

          <button
            onClick={() => navigateToTab('live-order')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative ${
              activeTab === 'live-order'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <div className="relative">
              <Bike
                className={`size-5 ${
                  activeTab === 'live-order'
                    ? 'text-[#b5de28] dark:text-[#d9f447]'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
              />
              {activeOrder && activeOrder.statusStep < 4 && (
                <span className="absolute -top-1 -right-1 size-2 rounded-full bg-[#d9f447] animate-ping" />
              )}
            </div>
            <span className="text-[10px]">Track</span>
          </button>

          <button
            onClick={() => navigateToTab('orders')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'orders'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <History
              className={`size-5 ${
                activeTab === 'orders'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Orders</span>
          </button>

          <button
            onClick={() => router.push('/user/cart')}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative text-gray-400 dark:text-gray-500 font-bold"
          >
            <div className="relative">
              <ShoppingCart className="size-5 text-gray-400 dark:text-gray-500" />
              {totalCartItemCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {totalCartItemCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Cart</span>
          </button>

          <button
            onClick={() => navigateToTab('profile')}
            className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition ${
              activeTab === 'profile'
                ? 'text-[#18201c] dark:text-white font-black'
                : 'text-gray-400 dark:text-gray-500 font-bold'
            }`}
          >
            <User
              className={`size-5 ${
                activeTab === 'profile'
                  ? 'text-[#b5de28] dark:text-[#d9f447]'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            />
            <span className="text-[10px]">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}

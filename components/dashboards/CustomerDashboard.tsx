'use client'

import AddressModal from '@/components/AddressModal'
import CraveLogo from '@/components/CraveLogo'
import InvoiceModal, { InvoiceOrderData } from '@/components/InvoiceModal'
import ExploreView from '@/components/customer/ExploreView'
import HelpView from '@/components/customer/HelpView'
import LiveOrderView from '@/components/customer/LiveOrderView'
import OrdersView from '@/components/customer/OrdersView'
import ProfileView from '@/components/customer/ProfileView'
import type {
  CartItem,
  CustomerAddress,
  LatLngCoords,
  MenuItem,
  MenuItemVariant,
  PastOrder,
  Restaurant,
} from '@/components/customer/types'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { getCachedLocation } from '@/lib/client-location'
import {
  getOrderStatusNotification,
  showBrowserNotification,
} from '@/lib/notifications/web-notification'
import { useToast } from '@/lib/toast-context'
import { useDriverLocation, useMenuItemUpdates, useOrderUpdates } from '@/lib/websocket'
import {
  Bike,
  Compass,
  HelpCircle,
  History,
  MapPin,
  Menu,
  ShoppingCart,
  Store,
  User,
  X,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface CustomerDashboardProps {
  initialTab?: 'explore' | 'live-order' | 'orders' | 'profile' | 'help'
  initialOrderId?: string
}

export default function CustomerDashboard({
  initialTab = 'explore',
  initialOrderId,
}: CustomerDashboardProps) {
  const { user, logout, updateUser } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()

  const {
    items: cart,
    addItem,
    updateItemQty,
    removeItem,
    clearCart,
    totalCount: totalCartItemCount,
  } = useCart()

  // Tab State & Navigation
  const currentTabFromPath = useMemo(() => {
    if (pathname.includes('/user/help')) return 'help'
    if (pathname.includes('/user/track')) return 'live-order'
    if (initialOrderId || pathname.match(/\/user\/orders\/[^\/]+/)) return 'live-order'
    if (pathname.includes('/user/orders')) return 'orders'
    if (pathname.includes('/user/profile')) return 'profile'
    if (pathname.includes('/user/explore')) return 'explore'
    return initialTab
  }, [pathname, initialTab, initialOrderId])

  const [activeTab, setActiveTab] = useState(currentTabFromPath)

  useEffect(() => {
    setActiveTab(currentTabFromPath)
  }, [currentTabFromPath])

  const navigateToTab = (tab: 'explore' | 'live-order' | 'orders' | 'profile' | 'help') => {
    setActiveTab(tab)
    if (tab === 'explore') router.push('/user/explore')
    else if (tab === 'live-order') router.push('/user/track')
    else if (tab === 'orders') router.push('/user/orders')
    else if (tab === 'profile') router.push('/user/profile')
    else if (tab === 'help') router.push('/user/help')
  }

  // Header scroll visibility
  const [headerVisible, setHeaderVisible] = useState(true)
  const lastScrollYRef = useRef(0)

  useEffect(() => {
    let ticking = false
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentY = window.scrollY
          if (currentY < 30) setHeaderVisible(true)
          else if (currentY > lastScrollYRef.current + 10) setHeaderVisible(false)
          else if (currentY < lastScrollYRef.current - 10) setHeaderVisible(true)
          lastScrollYRef.current = currentY
          ticking = false
        })
        ticking = true
      }
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Mobile sidebar
  const [showMobileSideMenu, setShowMobileSideMenu] = useState(false)

  // Modals & Selection
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [invoiceModalOrder, setInvoiceModalOrder] = useState<InvoiceOrderData | null>(null)
  const [conflictModal, setConflictModal] = useState<{
    open: boolean
    currentRest: string
    newRest: string
    newItem: MenuItem | null
    variant?: MenuItemVariant
  }>({ open: false, currentRest: '', newRest: '', newItem: null })

  // Addresses & Selected Location
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([])
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [selectedMapPin, setSelectedMapPin] = useState<LatLngCoords | null>(() => {
    const cached = getCachedLocation()
    return cached?.lat && cached?.lng ? { lat: cached.lat, lng: cached.lng } : null
  })

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch('/api/user/addresses')
      if (res.ok) {
        const json = await res.json()
        if (Array.isArray(json.addresses) && json.addresses.length > 0) {
          const mapped: CustomerAddress[] = json.addresses.map((row: any) => ({
            id: row.id,
            label: row.label,
            address: row.address,
            tag: row.is_default ? 'Primary' : row.label,
            lat: row.latitude != null ? Number(row.latitude) : null,
            lng: row.longitude != null ? Number(row.longitude) : null,
            isDefault: Boolean(row.is_default),
          }))
          setSavedAddresses(mapped)
          const primary = mapped.find((a) => a.isDefault) || mapped[0]
          const stored =
            typeof window !== 'undefined' ? localStorage.getItem('crave_selected_address') : null
          const chosen = stored || primary?.address || user?.address || ''
          if (chosen) {
            setDeliveryAddress(chosen)
            const matched = mapped.find((a) => a.address === chosen) || primary
            if (matched.lat != null && matched.lng != null) {
              setSelectedMapPin({ lat: matched.lat, lng: matched.lng })
            }
          }
        }
      }
    } catch {}
  }, [user?.id, user?.address])

  useEffect(() => {
    loadAddresses()
  }, [loadAddresses])

  // Restaurants & Dishes
  const [restaurantsList, setRestaurantsList] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([])

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const res = await fetch('/api/restaurants', { cache: 'no-store' })
        const json = await res.json()
        const restData = json.restaurants || []
        const parsed = restData
          .filter((r: any) => r.id !== 'cravexp_dark_store_01' && !r.is_dark_store)
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            cuisine: r.cuisine ?? '',
            rating: r.rating != null ? String(r.rating) : '',
            ratingCount: r.rating_count != null ? Number(r.rating_count).toLocaleString() : '',
            eta: r.delivery_minutes != null ? `${r.delivery_minutes} min` : '25 min',
            distance: r.distance ? String(r.distance) : '',
            costForTwo: r.cost_for_two != null ? `₹${r.cost_for_two} for two` : '',
            image: r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
            tag: r.cuisine?.split(' ')[0] ?? '',
            address: r.address ?? '',
            offer: r.offer ? String(r.offer) : undefined,
            isPureVeg: r.is_pure_veg ?? false,
            isOpen: r.is_open ?? true,
            latitude: r.latitude != null ? Number(r.latitude) : undefined,
            longitude: r.longitude != null ? Number(r.longitude) : undefined,
            delivery_minutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
            deliveryMinutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
          }))
        setRestaurantsList(parsed)

        // Check if a real restaurant URL query parameter exists on initial load
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search)
          const targetId = searchParams.get('restaurant') || searchParams.get('restaurantId')
          if (targetId) {
            let found = parsed.find((p: any) => p.id === targetId)
            if (!found) {
              try {
                const singleRes = await fetch(
                  `/api/restaurants?restaurantId=${encodeURIComponent(targetId)}`,
                  { cache: 'no-store' }
                )
                const singleJson = await singleRes.json()
                const r = singleJson.restaurants?.[0]
                if (r) {
                  found = {
                    id: r.id,
                    name: r.name,
                    cuisine: r.cuisine ?? '',
                    rating: r.rating != null ? String(r.rating) : '4.8',
                    ratingCount:
                      r.rating_count != null ? Number(r.rating_count).toLocaleString() : '50',
                    eta: r.delivery_minutes != null ? `${r.delivery_minutes} min` : '25 min',
                    distance: r.distance ? String(r.distance) : '',
                    costForTwo: r.cost_for_two != null ? `₹${r.cost_for_two} for two` : '',
                    image:
                      r.image ||
                      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
                    tag: r.cuisine?.split(' ')[0] ?? '',
                    address: r.address ?? '',
                    offer: r.offer ? String(r.offer) : undefined,
                    isPureVeg: r.is_pure_veg ?? false,
                    isOpen: r.is_open ?? true,
                    latitude: r.latitude != null ? Number(r.latitude) : undefined,
                    longitude: r.longitude != null ? Number(r.longitude) : undefined,
                    delivery_minutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
                    deliveryMinutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
                  }
                }
              } catch (err) {
                console.error('Failed to fetch target restaurant:', err)
              }
            }
            if (found) setSelectedRestaurant(found)
          }
        }
      } catch {
        setRestaurantsList([])
      }
    }
    fetchRestaurants()
  }, [])

  // Listen for browser forward/back buttons to keep selected restaurant in sync with URL
  useEffect(() => {
    const handlePopState = async () => {
      if (typeof window === 'undefined') return
      const searchParams = new URLSearchParams(window.location.search)
      const targetId = searchParams.get('restaurant') || searchParams.get('restaurantId')
      if (targetId) {
        let found = restaurantsList.find((r) => r.id === targetId)
        if (!found) {
          try {
            const singleRes = await fetch(
              `/api/restaurants?restaurantId=${encodeURIComponent(targetId)}`,
              { cache: 'no-store' }
            )
            const singleJson = await singleRes.json()
            const r = singleJson.restaurants?.[0]
            if (r) {
              found = {
                id: r.id,
                name: r.name,
                cuisine: r.cuisine ?? '',
                rating: r.rating != null ? String(r.rating) : '4.8',
                ratingCount:
                  r.rating_count != null ? Number(r.rating_count).toLocaleString() : '50',
                eta: r.delivery_minutes != null ? `${r.delivery_minutes} min` : '25 min',
                distance: r.distance ? String(r.distance) : '',
                costForTwo: r.cost_for_two != null ? `₹${r.cost_for_two} for two` : '',
                image:
                  r.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500',
                tag: r.cuisine?.split(' ')[0] ?? '',
                address: r.address ?? '',
                offer: r.offer ? String(r.offer) : undefined,
                isPureVeg: r.is_pure_veg ?? false,
                isOpen: r.is_open ?? true,
                latitude: r.latitude != null ? Number(r.latitude) : undefined,
                longitude: r.longitude != null ? Number(r.longitude) : undefined,
                delivery_minutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
                deliveryMinutes: r.delivery_minutes != null ? Number(r.delivery_minutes) : 25,
              }
            }
          } catch {}
        }
        if (found) setSelectedRestaurant(found)
      } else {
        setSelectedRestaurant(null)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [restaurantsList])

  // Real URL synchronizer when selecting/unselecting a restaurant
  const handleSelectRestaurant = useCallback((rest: Restaurant | null) => {
    setSelectedRestaurant(rest)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (rest?.id) {
        url.searchParams.set('restaurant', rest.id)
        window.history.pushState({ modal: 'restaurant', id: rest.id }, '', url.toString())
      } else {
        url.searchParams.delete('restaurant')
        url.searchParams.delete('restaurantId')
        // Clean in-app state replacement: unselecting restaurant returns to explore feed cleanly
        // Never call history.back() to avoid bouncing user into previous pages or CraveXP loops!
        window.history.replaceState({}, '', url.pathname)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchLiveMenuItems() {
      if (!selectedRestaurant) {
        setMenuItemsList([])
        return
      }
      try {
        const res = await fetch(`/api/menu-items?restaurantId=${selectedRestaurant.id}`, {
          cache: 'no-store',
        })
        const json = await res.json()
        const items = json.items || []
        setMenuItemsList(
          items.map((item: any) => ({
            id: item.id,
            name: item.name,
            detail: item.description || '',
            price: Number(item.price) || 0,
            image: item.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
            veg: Boolean(item.is_veg ?? true),
            restaurantName: selectedRestaurant.name,
            restaurantId: selectedRestaurant.id,
            vendorId: selectedRestaurant.id,
            category: item.category || 'Recommended',
            in_stock: item.in_stock !== false && (item.stock_count == null || item.stock_count > 0),
            inStock: item.in_stock !== false && (item.stock_count == null || item.stock_count > 0),
            stock_count: item.stock_count ?? 10,
            bestseller: item.bestseller ?? item.price >= 250,
            variants: Array.isArray(item.variants)
              ? item.variants
                  .filter((v: any) => v.in_stock !== false)
                  .map((v: any) => ({
                    id: v.id,
                    name: v.name,
                    price: Number(v.price) || 0,
                    inStock: v.in_stock !== false,
                    isDefault: v.is_default === true,
                  }))
              : [],
          }))
        )
      } catch {
        setMenuItemsList([])
      }
    }
    fetchLiveMenuItems()
  }, [selectedRestaurant])

  // Real-time synchronization of menu items when vendor toggles out-of-stock
  useMenuItemUpdates(selectedRestaurant?.id, (updatedItem: any) => {
    if (!updatedItem?.id) return
    setMenuItemsList((prev) =>
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

  // Orders State & WebSocket Updates
  const [ordersData, setOrdersData] = useState<any[]>([])
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>(initialOrderId)
  const [liveDriverPos, setLiveDriverPos] = useState<LatLngCoords | null>(null)
  const [isDriverGpsStale, setIsDriverGpsStale] = useState(false)
  const [otpCopied, setOtpCopied] = useState(false)
  const prevStatusesRef = useRef<Map<string, string>>(new Map())

  useEffect(() => {
    if (!user?.id) return
    fetch(`/api/orders?customerId=${user.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.orders)) {
          json.orders.forEach((o: any) => {
            if (o?.id && o?.status) prevStatusesRef.current.set(o.id, o.status)
          })
          setOrdersData(json.orders)
        }
      })
      .catch(() => {})
  }, [user?.id])

  useOrderUpdates(user?.id, (orders) => {
    if (Array.isArray(orders)) {
      orders.forEach((o: any) => {
        if (!o?.id) return
        const prevStatus = prevStatusesRef.current.get(o.id)
        if (prevStatus && prevStatus !== o.status) {
          const notif = getOrderStatusNotification(o)
          if (notif) {
            void showBrowserNotification({
              title: notif.title,
              body: notif.body,
              tag: `order-${o.id}`,
              sound: true,
            })
            toast(`${notif.title} — ${notif.body}`, 'info')
          }
        }
        if (o.status) prevStatusesRef.current.set(o.id, o.status)
      })
      setOrdersData((prev) => {
        if (!prev || prev.length === 0) return orders
        const map = new Map(prev.map((o) => [String(o.id), o]))
        orders.forEach((incoming) => {
          if (!incoming?.id) return
          const existing = map.get(String(incoming.id))
          map.set(String(incoming.id), existing ? { ...existing, ...incoming } : incoming)
        })
        return Array.from(map.values())
      })
    }
  })

  const inProgressOrders = useMemo(() => {
    if (!ordersData.length) return []
    return ordersData.filter(
      (o: any) => o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
    )
  }, [ordersData])

  const activeOrder = useMemo(() => {
    if (!ordersData.length) return null
    let found = selectedOrderId
      ? ordersData.find((o) => String(o.id) === String(selectedOrderId))
      : null
    if (!found && inProgressOrders.length > 0) found = inProgressOrders[0]
    if (!found) return null

    let statusStep = 1
    if (found.status === 'delivered' || found.status === 'completed') statusStep = 4
    else if (
      found.status === 'out_for_delivery' ||
      found.status === 'picked_up' ||
      found.status === 'arrived_customer'
    )
      statusStep = 3
    else if (
      found.status === 'sent_to_vendor' ||
      found.status === 'accepted' ||
      found.status === 'preparing' ||
      found.status === 'cooking' ||
      found.status === 'packing' ||
      found.status === 'ready' ||
      found.status === 'ready_for_pickup' ||
      found.status === 'rider_assigned' ||
      found.status === 'at_restaurant'
    )
      statusStep = 2

    const statusTextMap: Record<string, string> = {
      new: 'Order Placed',
      payment_submitted: 'Order Confirmed',
      payment_verified: 'Payment Verified',
      sent_to_vendor: 'Order Sent to Kitchen',
      accepted: 'Vendor Accepted Order',
      preparing: 'Kitchen Preparing Food',
      cooking: 'Chef Cooking Order',
      packing: 'Order Being Packed',
      ready: 'Food Ready for Pickup',
      ready_for_pickup: 'Food Ready for Pickup',
      rider_assigned: 'Rider Assigned',
      at_restaurant: 'Rider at Kitchen',
      picked_up: 'Food Picked Up by Rider',
      out_for_delivery: 'Out for Delivery',
      arrived_customer: 'Rider Arrived at Doorstep',
      delivered: 'Order Delivered',
      completed: 'Order Delivered',
      cancelled: 'Order Cancelled',
    }

    let itemsArr: any[] = []
    try {
      itemsArr = typeof found.items === 'string' ? JSON.parse(found.items) : found.items || []
    } catch {}

    const rawDate = found.createdAt || found.created_at
    const timeStr = rawDate
      ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''

    const restLat = Number(
      found.restaurant?.latitude ?? found.restaurant_latitude ?? found.restaurantLat ?? 12.9716
    )
    const restLng = Number(
      found.restaurant?.longitude ?? found.restaurant_longitude ?? found.restaurantLng ?? 77.6412
    )
    const custLat = Number(
      found.delivery_latitude ??
        found.customer_lat ??
        found.customerLat ??
        selectedMapPin?.lat ??
        12.9716
    )
    const custLng = Number(
      found.delivery_longitude ??
        found.customer_lng ??
        found.customerLng ??
        selectedMapPin?.lng ??
        77.5946
    )

    return {
      ...found,
      statusStep,
      statusText: statusTextMap[found.status] || found.status?.replace(/_/g, ' ') || 'In Progress',
      items: itemsArr,
      total: Number(found.total_amount || 0),
      subtotal: Number(found.subtotal || 0),
      timestamp: timeStr,
      restaurantLat: restLat,
      restaurantLng: restLng,
      customerLat: custLat,
      customerLng: custLng,
      restaurantName:
        found.restaurant?.name ||
        found.restaurant_name ||
        found.restaurantName ||
        'Crave Kitchen Store',
      driverName: found.driver_name || null,
      driverPhone: found.driver_phone || null,
      otp: found.delivery_otp || found.otp || null,
    }
  }, [ordersData, selectedOrderId, inProgressOrders, selectedMapPin])

  useDriverLocation(activeOrder?.id, (data: any) => {
    if (data?.lat != null && data?.lng != null) {
      setLiveDriverPos({ lat: Number(data.lat), lng: Number(data.lng) })
      setIsDriverGpsStale(Boolean(data.isStale))
    }
  })

  // Real-time polling fallback: poll active order status & driver location every 3s so steps advance without reloading
  useEffect(() => {
    if (!activeOrder?.id || activeOrder.statusStep >= 4) return
    const pollTimer = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders?orderId=${encodeURIComponent(activeOrder.id)}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.order) {
            setOrdersData((prev) => {
              const map = new Map(prev.map((o) => [String(o.id), o]))
              const existing = map.get(String(data.order.id))
              map.set(String(data.order.id), existing ? { ...existing, ...data.order } : data.order)
              return Array.from(map.values())
            })
            if (data.driverLocation?.lat != null && data.driverLocation?.lng != null) {
              setLiveDriverPos({
                lat: Number(data.driverLocation.lat),
                lng: Number(data.driverLocation.lng),
              })
              setIsDriverGpsStale(Boolean(data.driverLocation.isStale))
            }
          }
        }
      } catch (e) {}
    }, 3000)
    return () => clearInterval(pollTimer)
  }, [activeOrder?.id, activeOrder?.statusStep])

  // Past Orders List
  const pastOrders: PastOrder[] = useMemo(() => {
    const statusMap: Record<string, PastOrder['status']> = {
      completed: 'Delivered',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      new: 'In Progress',
      preparing: 'In Progress',
      ready: 'In Progress',
      accepted: 'In Progress',
      out_for_delivery: 'In Progress',
      payment_pending: 'Pending',
      payment_submitted: 'Pending',
      payment_verified: 'In Progress',
    }
    return ordersData.map((o: any) => {
      let itemsArr: { name: string; qty: number; price: number }[] = []
      try {
        const raw = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
        if (Array.isArray(raw)) {
          itemsArr = raw.map((i: any) => ({ name: i.name, qty: i.qty ?? 1, price: i.price ?? 0 }))
        }
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
          ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
        status: statusMap[o.status] ?? 'In Progress',
        deliveryTime: '',
        driverName: o.driver_name || undefined,
        driverPhone: o.driver_phone || undefined,
        restaurantId: o.restaurant_id || o.restaurantId || undefined,
      }
    })
  }, [ordersData])

  // 15-Second Cancellation Countdown
  const [cancelTimeRemaining, setCancelTimeRemaining] = useState(0)

  useEffect(() => {
    if (!activeOrder?.created_at && !activeOrder?.createdAt) {
      setCancelTimeRemaining(0)
      return
    }
    const orderCreatedAtMs = new Date(activeOrder.created_at || activeOrder.createdAt).getTime()
    const updateCountdown = () => {
      const elapsedSeconds = Math.floor((Date.now() - orderCreatedAtMs) / 1000)
      const remaining = Math.max(0, 15 - elapsedSeconds)
      setCancelTimeRemaining(remaining)
    }
    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [activeOrder?.created_at, activeOrder?.createdAt])

  const handleCancelOrder = async (orderId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ orderId, status: 'cancelled' }),
      })
      if (res.ok) {
        toast('Order cancelled successfully. Refund queued.', 'success')
        setOrdersData((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
        )
      } else {
        const json = await res.json()
        toast(json.error || 'Cancellation window has expired.', 'error')
      }
    } catch {
      toast('Failed to cancel order.', 'error')
    }
  }

  // Cart Handlers
  const handleAddToCart = (item: MenuItem, variant?: MenuItemVariant) => {
    if (item.in_stock === false || item.inStock === false) {
      toast(`${item.name} is currently out of stock.`, 'error')
      return
    }

    const itemRestId = item.restaurantId || item.vendorId || selectedRestaurant?.id || ''
    const currentRestId = cart[0]?.restaurantId || cart[0]?.vendorId || ''

    if (cart.length > 0 && currentRestId && itemRestId && currentRestId !== itemRestId) {
      setConflictModal({
        open: true,
        currentRest: cart[0]?.restaurantName || 'Current Kitchen',
        newRest: item.restaurantName || selectedRestaurant?.name || 'New Kitchen',
        newItem: item,
        variant,
      })
      return
    }

    const cartEntry = {
      id: variant ? `${item.id}-${variant.id}` : item.id,
      menuItemId: item.id,
      name: item.name,
      price: variant ? variant.price : item.price,
      qty: 1,
      detail: item.detail,
      image: item.image,
      veg: item.veg,
      restaurantName: item.restaurantName || selectedRestaurant?.name || 'Kitchen',
      restaurantId: itemRestId,
      vendorId: itemRestId,
      variantId: variant?.id,
      variantName: variant?.name,
    }

    addItem(cartEntry)
    toast(`Added ${item.name}${variant ? ` (${variant.name})` : ''} to cart!`, 'success')
  }

  const handleCopyOtp = (otp: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(String(otp))
      setOtpCopied(true)
      toast('Delivery OTP copied to clipboard!', 'success')
      setTimeout(() => setOtpCopied(false), 2500)
    }
  }

  const handleSaveProfile = async (name: string, phone: string, address: string) => {
    const res = await fetch('/api/user/update', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), phone: phone.trim(), address: address.trim() }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) throw new Error(json.error || 'Failed to update profile')

    if (updateUser) updateUser({ name, phone, address })
    setDeliveryAddress(address)
    toast('Profile updated successfully!', 'success')
  }

  const handleDeleteSavedAddress = async (id: string, label: string) => {
    const res = await fetch(`/api/user/addresses?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setSavedAddresses((prev) => prev.filter((a) => a.id !== id))
      toast(`Address "${label}" deleted`, 'success')
    } else {
      toast('Could not delete address', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-[#fafbf9] dark:bg-[#0c100e] pb-32 sm:pb-36 lg:pb-12 text-[#18201c] dark:text-white transition-colors duration-200">
      {/* Top Header Navigation Banner */}
      <header
        className={`sticky top-0 z-40 pt-[env(safe-area-inset-top,0px)] border-b border-gray-200/70 dark:border-white/10 bg-white/85 dark:bg-[#0c100e]/85 backdrop-blur-xl px-3 py-2.5 sm:px-6 sm:py-3 shadow-2xs transition-all duration-300 ${
          headerVisible ? 'translate-y-0' : '-translate-y-full lg:translate-y-0'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-1.5 sm:gap-4">
          {/* Logo & Location */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <Link
              href="/"
              className="shrink-0 hover:opacity-90 flex items-center"
              aria-label="crave home"
            >
              <CraveLogo variant="full" size="md" />
            </Link>

            <button
              onClick={() => setShowLocationModal(true)}
              className="flex items-center gap-1.5 rounded-full border border-gray-200/80 dark:border-white/10 bg-gray-50/80 dark:bg-white/5 px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-[#86a018] transition max-w-[180px] sm:max-w-xs truncate cursor-pointer"
            >
              <MapPin className="size-3 text-[#86a018] shrink-0" />
              <span className="truncate">
                {deliveryAddress ? deliveryAddress.split(',')[0] : 'Set Location'}
              </span>
            </button>
          </div>

          {/* Center Tabs: Segmented Control */}
          <nav className="hidden lg:flex items-center gap-1 text-sm font-bold justify-center bg-gray-100/80 dark:bg-white/[0.06] p-1 rounded-full border border-gray-200/60 dark:border-white/10 backdrop-blur-xl">
            <button
              onClick={() => navigateToTab('explore')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'explore'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <Compass
                className={`size-4 ${activeTab === 'explore' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'}`}
              />
              <span>Explore</span>
            </button>

            <button
              onClick={() => router.push('/user/cravexp')}
              className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition shrink-0 cursor-pointer text-gray-700 dark:text-gray-300 hover:text-[#18201c] dark:hover:text-white hover:bg-white/80 dark:hover:bg-white/10 group"
              title="craveXP 10-Minute Dark Store"
            >
              <CraveLogo variant="cravexp" size="sm" />
              <span className="text-xs font-semibold text-[#86a018]">Store</span>
            </button>

            <button
              onClick={() => navigateToTab('live-order')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'live-order'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <Bike className="size-4" />
              <span>Track Drop</span>
            </button>

            <button
              onClick={() => navigateToTab('orders')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <History className="size-4" />
              <span>Orders</span>
            </button>

            <button
              onClick={() => navigateToTab('profile')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <User className="size-4" />
              <span>Profile</span>
            </button>

            <button
              onClick={() => navigateToTab('help')}
              className={`flex items-center gap-2 rounded-full px-4 py-2 transition shrink-0 cursor-pointer ${
                activeTab === 'help'
                  ? 'bg-white dark:bg-[#18201c] text-[#18201c] dark:text-[#d9f447] shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
              }`}
            >
              <HelpCircle className="size-4" />
              <span>Help</span>
            </button>
          </nav>

          {/* Right Header Actions: Cart & Mobile Menu */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/user/cart')}
              className="relative inline-flex items-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] px-4 py-2 text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition cursor-pointer"
            >
              <ShoppingCart className="size-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalCartItemCount > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-emerald-500 text-white text-[10px] font-black">
                  {totalCartItemCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setShowMobileSideMenu(true)}
              className="lg:hidden grid size-9 place-items-center rounded-full border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition cursor-pointer"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-[1600px] px-3 pt-4 sm:px-6 sm:pt-6">
        {activeTab === 'explore' && (
          <ExploreView
            restaurantsList={restaurantsList}
            menuItemsList={menuItemsList}
            cart={cart as CartItem[]}
            onAddToCart={handleAddToCart}
            onUpdateQty={updateItemQty}
            selectedRestaurant={selectedRestaurant}
            onSelectRestaurant={handleSelectRestaurant}
            triggerToast={(m) => toast(m, 'info')}
            customerLocation={selectedMapPin}
            customerAddress={deliveryAddress || user?.address}
          />
        )}

        {activeTab === 'live-order' && (
          <LiveOrderView
            activeOrder={activeOrder}
            inProgressOrders={inProgressOrders}
            deliveryAddress={deliveryAddress}
            activeOrderEta={{ displayText: '25 mins', distanceKm: 2.5 }}
            cancelTimeRemaining={cancelTimeRemaining}
            liveDriverPos={liveDriverPos}
            isDriverGpsStale={isDriverGpsStale}
            selectedMapPin={selectedMapPin}
            otpCopied={otpCopied}
            onCopyOtp={handleCopyOtp}
            onCancelOrder={handleCancelOrder}
            onSelectOrder={(id) => {
              setSelectedOrderId(id)
              router.push(`/user/track/${id}`)
            }}
            onClearSelectedOrder={() => {
              setSelectedOrderId(undefined)
              router.push('/user/track')
            }}
            onViewInvoice={setInvoiceModalOrder}
            onNavigateToExplore={() => navigateToTab('explore')}
            onNavigateToOrders={() => navigateToTab('orders')}
            user={user}
          />
        )}

        {activeTab === 'orders' && (
          <OrdersView
            pastOrders={pastOrders}
            onNavigateToExplore={() => navigateToTab('explore')}
            onTrackLiveOrder={(id) => {
              setSelectedOrderId(id)
              navigateToTab('live-order')
            }}
            onPayNow={(id) => router.push(`/user/track/${id}`)}
            onViewInvoice={setInvoiceModalOrder}
            customerName={user?.name}
            customerAddress={deliveryAddress}
            onReorder={(order) => {
              if (!order.items?.length) return
              order.items.forEach((item, idx) => {
                addItem({
                  id: `reorder_${order.id}_${idx}_${Date.now()}`,
                  name: item.name,
                  price: item.price,
                  qty: item.qty || 1,
                  variantName: item.variantName,
                  restaurantName: order.restaurantName,
                  restaurantId: order.restaurantId,
                  veg: true,
                  detail: '',
                  image: order.restaurantImage || '',
                })
              })
              toast(
                `Added ${order.items.length} ${order.items.length === 1 ? 'item' : 'items'} to cart!`,
                'success'
              )
              router.push('/user/cart')
            }}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            user={user}
            logout={logout}
            pastOrdersCount={pastOrders.length}
            savedAddresses={savedAddresses}
            deliveryAddress={deliveryAddress}
            onSaveProfile={handleSaveProfile}
            onDeleteAddress={handleDeleteSavedAddress}
            onSelectAddress={(addr, coords) => {
              setDeliveryAddress(addr)
              if (coords) setSelectedMapPin(coords)
              localStorage.setItem('crave_selected_address', addr)
              toast(`Switched active location to ${addr.split(',')[0]}`, 'success')
            }}
            onOpenAddAddressModal={() => setShowLocationModal(true)}
            onNavigateToHelp={() => navigateToTab('help')}
          />
        )}

        {activeTab === 'help' && <HelpView onViewActiveOrder={() => navigateToTab('live-order')} />}
      </main>

      {/* Floating Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200/80 dark:border-white/10 bg-white/95 dark:bg-[#0c100e]/95 backdrop-blur-xl py-2 px-3 lg:hidden">
        <button
          onClick={() => navigateToTab('explore')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
            activeTab === 'explore' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'
          }`}
        >
          <Compass className="size-5" />
          <span>Explore</span>
        </button>

        <button
          onClick={() => router.push('/user/cravexp')}
          className="flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer text-gray-400 hover:text-[#86a018] dark:hover:text-white"
        >
          <Store className="size-5 text-emerald-600" />
          <span className="text-[9px] font-semibold text-[#86a018]">XP Store</span>
        </button>

        <button
          onClick={() => navigateToTab('live-order')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer relative ${
            activeTab === 'live-order' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'
          }`}
        >
          <Bike className="size-5" />
          <span>Track</span>
          {inProgressOrders.length > 0 && (
            <span className="absolute -top-1 right-1 size-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </button>

        <button
          onClick={() => navigateToTab('orders')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
            activeTab === 'orders' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'
          }`}
        >
          <History className="size-5" />
          <span>Orders</span>
        </button>

        <button
          onClick={() => navigateToTab('profile')}
          className={`flex flex-col items-center gap-1 text-[10px] font-bold cursor-pointer ${
            activeTab === 'profile' ? 'text-[#86a018] dark:text-[#d9f447]' : 'text-gray-400'
          }`}
        >
          <User className="size-5" />
          <span>Profile</span>
        </button>
      </nav>

      {/* Mobile Sidebar Drawer */}
      {showMobileSideMenu && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden animate-in fade-in"
          onClick={() => setShowMobileSideMenu(false)}
        >
          <div
            className="w-4/5 max-w-xs bg-white dark:bg-[#141b17] h-full p-6 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/10">
                <span className="font-black text-xl text-[#18201c] dark:text-white">Menu</span>
                <button onClick={() => setShowMobileSideMenu(false)} className="p-1 text-gray-400">
                  <X className="size-5" />
                </button>
              </div>

              <div className="space-y-2">
                {[
                  { id: 'explore', label: 'Explore Kitchens', icon: Compass },
                  { id: 'live-order', label: 'Track Drop', icon: Bike },
                  { id: 'orders', label: 'Orders History', icon: History },
                  { id: 'profile', label: 'Profile & Account', icon: User },
                  { id: 'help', label: 'Help & Support', icon: HelpCircle },
                ].map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigateToTab(item.id as any)
                        setShowMobileSideMenu(false)
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl text-sm font-bold text-[#18201c] dark:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                      <Icon className="size-4 text-[#86a018]" />
                      <span>{item.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-2">
              <button
                onClick={() => {
                  logout()
                  setShowMobileSideMenu(false)
                }}
                className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-bold text-xs"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart Restaurant Conflict Modal */}
      {conflictModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#18201c] p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-lg text-[#18201c] dark:text-white">
              Replace Cart Items?
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Your cart already contains dishes from{' '}
              <strong className="text-[#18201c] dark:text-white">
                {conflictModal.currentRest}
              </strong>
              . Would you like to discard them and add items from{' '}
              <strong className="text-[#18201c] dark:text-white">{conflictModal.newRest}</strong>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() =>
                  setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
                }
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white cursor-pointer"
              >
                Keep Current
              </button>
              <button
                onClick={() => {
                  clearCart()
                  if (conflictModal.newItem) {
                    const item = conflictModal.newItem
                    const variant = conflictModal.variant
                    const cartEntry = {
                      id: variant ? `${item.id}-${variant.id}` : item.id,
                      menuItemId: item.id,
                      name: item.name,
                      price: variant ? variant.price : item.price,
                      qty: 1,
                      detail: item.detail,
                      image: item.image,
                      veg: item.veg,
                      restaurantName: conflictModal.newRest,
                      restaurantId: item.restaurantId || item.vendorId || '',
                      vendorId: item.restaurantId || item.vendorId || '',
                      variantId: variant?.id,
                      variantName: variant?.name,
                    }
                    addItem(cartEntry)
                    toast(`Cart reset. Added ${item.name}!`, 'success')
                  }
                  setConflictModal({ open: false, currentRest: '', newRest: '', newItem: null })
                }}
                className="px-5 py-2 rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] text-xs font-black shadow-md cursor-pointer"
              >
                Discard &amp; Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {invoiceModalOrder && (
        <InvoiceModal order={invoiceModalOrder} onClose={() => setInvoiceModalOrder(null)} />
      )}

      {/* Address Picker Modal */}
      <AddressModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onSelectAddress={(addr) => {
          setShowLocationModal(false)
          setDeliveryAddress(addr.address)
          if (addr.latitude != null && addr.longitude != null) {
            setSelectedMapPin({ lat: Number(addr.latitude), lng: Number(addr.longitude) })
          }
          localStorage.setItem('crave_selected_address', addr.address)
          toast(`Switched delivery address to ${addr.label}!`, 'success')
        }}
      />
    </div>
  )
}

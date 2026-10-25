'use client'

import { CraveSpinner } from '@/components/ui/ModernPreloader'
import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { playChimeSound, useVendorOrderUpdates } from '@/lib/websocket'
import { showBrowserNotification } from '@/lib/notifications/web-notification'
import {
  AlertCircle,
  Bell,
  Check,
  CheckCircle2,
  ChefHat,
  ChevronRight,
  Clock,
  CookingPot,
  DollarSign,
  Eye,
  Flame,
  LayoutGrid,
  ListFilter,
  Maximize2,
  Menu,
  Package,
  PackageCheck,
  Phone,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Star,
  Timer,
  TrendingUp,
  Truck,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export interface KitchenItem {
  name: string
  qty: number
  price?: number
}

export interface KitchenOrder {
  id: string
  customerName: string
  customerPhone?: string
  itemsText: string
  itemsList: KitchenItem[]
  subtotal: number
  totalAmount: number
  status: string
  paymentStatus: string
  time: string
  createdAt?: string
  address: string
  utrRef?: string
}

export default function VendorDashboard() {
  const { user } = useAuth()

  // Primary state
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([])
  const [resolvedRestaurantId, setResolvedRestaurantId] = useState<string | null>(
    () => user?.restaurantId || null
  )
  const [activeFilter, setActiveFilter] = useState<'all' | 'new' | 'preparing' | 'ready'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'tickets'>('grid')
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<KitchenOrder | null>(null)

  // Banner notification for live new orders
  const [liveBanner, setLiveBanner] = useState<{
    id: string
    customerName: string
    totalAmount: number
  } | null>(null)

  // Optimistic locking for updates
  const [pendingOrders, setPendingOrders] = useState<Record<string, boolean>>({})
  const pendingOrdersRef = useRef<Record<string, boolean>>({})

  // Stability refs to prevent flickering / infinite fetch loops
  const hasResolvedRef = useRef(false)
  const ordersCacheRef = useRef<KitchenOrder[]>([])
  const soundEnabledRef = useRef(soundEnabled)
  soundEnabledRef.current = soundEnabled

  // Synchronize restaurantId if user auth object updates with restaurantId
  useEffect(() => {
    if (user?.restaurantId && user.restaurantId !== resolvedRestaurantId) {
      setResolvedRestaurantId(user.restaurantId)
    }
  }, [user?.restaurantId, resolvedRestaurantId])

  // Resolve vendor's restaurant ID once from DB if missing from context
  useEffect(() => {
    if (!user?.id || resolvedRestaurantId || hasResolvedRef.current) return
    hasResolvedRef.current = true

    async function resolveVendorRestaurant() {
      try {
        const res = await fetch(`/api/restaurants?ownerId=${encodeURIComponent(user!.id)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.success && Array.isArray(data.restaurants) && data.restaurants.length > 0) {
            setResolvedRestaurantId(data.restaurants[0].id)
          }
        }
      } catch (e) {
        console.error('Failed to resolve vendor restaurant:', e)
      }
    }
    void resolveVendorRestaurant()
  }, [user?.id, resolvedRestaurantId])

  // Compare order lists to prevent re-rendering identical state
  const areOrdersIdentical = (curr: KitchenOrder[], next: KitchenOrder[]) => {
    if (curr.length !== next.length) return false
    for (let i = 0; i < curr.length; i++) {
      if (
        curr[i].id !== next[i].id ||
        curr[i].status !== next[i].status ||
        curr[i].paymentStatus !== next[i].paymentStatus
      ) {
        return false
      }
    }
    return true
  }

  // Fetch live kitchen orders with diff-checking
  const loadLiveKitchenOrders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true)
    try {
      const targetRestId = resolvedRestaurantId || user?.restaurantId || user?.id
      const query = targetRestId
        ? `vendorId=${encodeURIComponent(targetRestId)}`
        : user?.restaurantName
          ? `vendorName=${encodeURIComponent(user.restaurantName)}`
          : ''
      const res = await fetch(query ? `/api/orders?${query}` : '/api/orders')
      if (!res.ok) return

      const json = await res.json()
      let ordersData: any[] = []
      if (json.success && Array.isArray(json.orders)) {
        ordersData = json.orders
      }

      // Filter orders belonging to this vendor
      const vendorFiltered = ordersData.filter((o) => {
        if (resolvedRestaurantId && o.restaurant_id === resolvedRestaurantId) return true
        if (user?.restaurantId && o.restaurant_id === user.restaurantId) return true
        if (user?.id && (o.restaurant_id === user.id || o.vendor_id === user.id)) return true
        if (
          user?.restaurantName &&
          o.restaurant_name &&
          o.restaurant_name.trim().toLowerCase() === user.restaurantName.trim().toLowerCase()
        ) {
          return true
        }
        return false
      })

      if (
        vendorFiltered.length > 0 ||
        (ordersData.length > 0 && (resolvedRestaurantId || user?.restaurantId))
      ) {
        ordersData = vendorFiltered
      }

      // Approved & active orders in kitchen queue
      const approvedOrders = ordersData.filter(
        (o) =>
          o.payment_status === 'verified' ||
          [
            'sent_to_vendor',
            'new',
            'accepted',
            'preparing',
            'cooking',
            'packing',
            'ready',
            'ready_for_pickup',
            'rider_assigned',
            'picked_up',
            'out_for_delivery',
            'delivered',
            'completed',
          ].includes(o.status)
      )

      const parsed: KitchenOrder[] = approvedOrders.map((o: any) => {
        let itemsList: KitchenItem[] = []
        let itemNames = 'Order Items'
        try {
          const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
          if (Array.isArray(arr)) {
            itemsList = arr.map((i: any) => ({
              name: i.name || 'Dish',
              qty: Number(i.qty || 1),
              price: Number(i.price || 0),
            }))
            itemNames = itemsList.map((i) => `${i.qty}x ${i.name}`).join(', ')
          }
        } catch {}

        const rawDate = o.createdAt || o.created_at
        const formattedTime = rawDate
          ? new Date(rawDate).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'Just now'

        return {
          id: o.id,
          customerName: o.customer_name || 'Customer',
          customerPhone: o.customer_phone || undefined,
          itemsText: itemNames,
          itemsList,
          subtotal: Number(o.subtotal || 0),
          totalAmount: Number(o.total_amount || 0),
          status: o.status || 'new',
          paymentStatus: o.payment_status || 'pending',
          time: formattedTime,
          createdAt: rawDate,
          address: o.customer_address || 'Bengaluru',
          utrRef: o.utrRef || o.utr_ref || undefined,
        }
      })

      // Only update state if order data changed (prevent layout repaints & flickering)
      if (!areOrdersIdentical(ordersCacheRef.current, parsed)) {
        ordersCacheRef.current = parsed
        setKitchenOrders(parsed)
      }
    } catch (err) {
      console.error('Failed to load kitchen orders:', err)
    } finally {
      if (isManualRefresh) {
        setTimeout(() => setIsRefreshing(false), 400)
      }
    }
  }, [resolvedRestaurantId, user?.restaurantId, user?.id, user?.restaurantName])

  // Initial fetch and auto-refresh intervals
  useEffect(() => {
    void loadLiveKitchenOrders()

    // Smooth background polling fallback (12 seconds) without page flashes
    const interval = setInterval(() => {
      void loadLiveKitchenOrders()
    }, 12000)

    return () => clearInterval(interval)
  }, [loadLiveKitchenOrders])

  // Stable WebSocket listener for new live orders
  const handleLiveOrderEvent = useCallback(
    (data: any) => {
      const o = data.order || data
      if (!o || !o.id) return

      const isMatch =
        (!resolvedRestaurantId && !user?.restaurantId && !user?.restaurantName) ||
        (resolvedRestaurantId && o.restaurant_id === resolvedRestaurantId) ||
        (user?.restaurantId && o.restaurant_id === user.restaurantId) ||
        (user?.id && (o.restaurant_id === user.id || o.vendor_id === user.id)) ||
        (user?.restaurantName &&
          o.restaurant_name &&
          o.restaurant_name.trim().toLowerCase() === user.restaurantName.trim().toLowerCase())

      const isApproved =
        o.payment_status === 'verified' ||
        !['payment_pending', 'payment_submitted'].includes(o.status)

      if (isMatch && isApproved) {
        if (soundEnabledRef.current) {
          playChimeSound()
        }
        void loadLiveKitchenOrders()
        setLiveBanner({
          id: o.id,
          customerName: o.customer_name || 'Customer',
          totalAmount: Number(o.total_amount || 0),
        })
        void showBrowserNotification({
          title: 'New Kitchen Order! 🔔',
          body: `${o.customer_name || 'Customer'} placed an order (#${o.id.slice(-6).toUpperCase()}) for ₹${Number(o.total_amount || 0).toLocaleString('en-IN')}`,
          tag: `vendor-order-${o.id}`,
          sound: false,
        })
      }
    },
    [resolvedRestaurantId, user?.restaurantId, user?.id, user?.restaurantName, loadLiveKitchenOrders]
  )

  useVendorOrderUpdates(handleLiveOrderEvent)

  // Status progression action
  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    if (pendingOrdersRef.current[orderId]) return
    pendingOrdersRef.current[orderId] = true
    setPendingOrders((prev) => ({ ...prev, [orderId]: true }))

    try {
      const response = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          status: nextStatus,
        }),
      })
      if (!response.ok) throw new Error('Order status update failed')

      // Optimistic instant state update
      setKitchenOrders((prev) => {
        const updated = prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        ordersCacheRef.current = updated
        return updated
      })

      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null))
      }
    } catch (err) {
      console.error('Failed to update kitchen order status:', err)
    } finally {
      pendingOrdersRef.current[orderId] = false
      setPendingOrders((prev) => {
        const next = { ...prev }
        delete next[orderId]
        return next
      })
    }
  }

  // Derived counts
  const newOrders = useMemo(
    () =>
      kitchenOrders.filter(
        (o) =>
          o.status === 'new' ||
          o.status === 'sent_to_vendor' ||
          o.status === 'accepted' ||
          o.status === 'payment_verified'
      ),
    [kitchenOrders]
  )

  const prepOrders = useMemo(
    () =>
      kitchenOrders.filter(
        (o) => o.status === 'preparing' || o.status === 'cooking' || o.status === 'packing'
      ),
    [kitchenOrders]
  )

  const readyOrders = useMemo(
    () =>
      kitchenOrders.filter(
        (o) => o.status === 'ready' || o.status === 'ready_for_pickup' || o.status === 'rider_assigned'
      ),
    [kitchenOrders]
  )

  const completedOrders = useMemo(
    () =>
      kitchenOrders.filter(
        (o) =>
          o.status === 'delivered' ||
          o.status === 'completed' ||
          o.status === 'picked_up' ||
          o.status === 'out_for_delivery'
      ),
    [kitchenOrders]
  )

  const activeOrdersCount = newOrders.length + prepOrders.length
  const totalDailyRevenue = useMemo(
    () =>
      kitchenOrders.reduce(
        (acc, o) => acc + (o.subtotal > 0 ? o.subtotal : o.totalAmount),
        0
      ),
    [kitchenOrders]
  )

  const completionRate =
    kitchenOrders.length > 0
      ? Math.round((completedOrders.length / kitchenOrders.length) * 100)
      : 100

  // Filtered orders for queue
  const filteredOrders = useMemo(() => {
    switch (activeFilter) {
      case 'new':
        return newOrders
      case 'preparing':
        return prepOrders
      case 'ready':
        return readyOrders
      default:
        return kitchenOrders.filter((o) => o.status !== 'cancelled')
    }
  }, [activeFilter, newOrders, prepOrders, readyOrders, kitchenOrders])

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] pb-28 lg:pb-12 text-[#121815] dark:text-stone-100 lg:pl-64 custom-scrollbar overflow-x-hidden w-full max-w-full transition-colors duration-200">
      <VendorSidebar />

      <div className="mx-auto max-w-[1280px] w-full px-2.5 pt-3 sm:px-4 lg:px-6 space-y-3.5 sm:space-y-4 overflow-hidden min-w-0">
        {/* Live Order Arrival Notification Banner */}
        {liveBanner && (
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-white/95 dark:bg-[#141d18]/95 p-3.5 text-[#121815] dark:text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center justify-between w-full min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-[#0d1310] animate-bounce shadow-md shrink-0">
                <Bell className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
                    NEW ORDER ARRIVED
                  </span>
                  <span className="font-mono text-[10px] font-bold text-stone-500 dark:text-gray-400">
                    #{liveBanner.id.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-black truncate">
                  {liveBanner.customerName} · ₹{liveBanner.totalAmount.toLocaleString('en-IN')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveBanner(null)}
              className="rounded-full bg-stone-100 dark:bg-white/10 p-1.5 text-stone-600 dark:text-white hover:bg-stone-200 dark:hover:bg-white/20 transition shrink-0 ml-2"
              aria-label="Dismiss banner"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        {/* Top Kitchen Console Header */}
        <div className="rounded-2xl sm:rounded-3xl border border-stone-200/80 dark:border-[#223026] bg-white/90 dark:bg-[#121815]/90 backdrop-blur-md p-3.5 sm:p-5 shadow-xs relative overflow-hidden w-full min-w-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between relative z-10 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Kitchen Active · Realtime Synced
                </span>
                <span className="text-[10px] font-mono font-bold text-stone-400 dark:text-stone-500">
                  {resolvedRestaurantId || user?.restaurantId || 'KITCHEN-01'}
                </span>
              </div>
              <h1 className="mt-1.5 text-lg sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight truncate flex items-center gap-2">
                <span>{user?.restaurantName || 'Crave Kitchen & Gourmet Grills'}</span>
              </h1>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                Chef console ·{' '}
                <span className="text-stone-700 dark:text-stone-300 font-semibold">
                  {user?.cuisine || 'North Indian, Continental & Biryani'}
                </span>
              </p>
            </div>

            {/* Quick Kitchen Action Toolbar */}
            <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto flex-wrap">
              {/* Sound chime toggle */}
              <button
                type="button"
                onClick={() => setSoundEnabled((prev) => !prev)}
                className={`rounded-xl border px-2.5 py-1.5 text-[11px] font-extrabold transition-all flex items-center gap-1.5 shadow-2xs ${
                  soundEnabled
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                    : 'bg-stone-100 dark:bg-[#18221c] border-stone-200 dark:border-[#27352d] text-stone-500 dark:text-gray-400'
                }`}
                title={soundEnabled ? 'Chime sound is enabled' : 'Chime sound is muted'}
              >
                {soundEnabled ? (
                  <>
                    <Volume2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Chime On</span>
                  </>
                ) : (
                  <>
                    <VolumeX className="size-3.5 text-stone-400" />
                    <span>Muted</span>
                  </>
                )}
              </button>

              {/* View mode toggle (4x4 Grid vs Ticket List) */}
              <div className="flex items-center rounded-xl bg-stone-100 dark:bg-[#1a241e] border border-stone-200 dark:border-[#27352d] p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-xs'
                      : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                  title="Compact 4x4 Grid Board"
                >
                  <LayoutGrid className="size-3" />
                  <span>4×4 Grid</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('tickets')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all ${
                    viewMode === 'tickets'
                      ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-xs'
                      : 'text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
                  }`}
                  title="Detailed Ticket View"
                >
                  <ListFilter className="size-3" />
                  <span>Tickets</span>
                </button>
              </div>

              {/* Manual refresh button */}
              <button
                type="button"
                onClick={() => void loadLiveKitchenOrders(true)}
                disabled={isRefreshing}
                className="grid size-8 place-items-center rounded-xl bg-stone-100 dark:bg-[#1a241e] border border-stone-200 dark:border-[#27352d] text-stone-700 dark:text-gray-300 hover:text-stone-900 dark:hover:text-white transition active:scale-95 disabled:opacity-60"
                title="Refresh Kitchen Queue"
              >
                <RefreshCw className={`size-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Menu link */}
              <Link
                href="/vendor/menu"
                className="hidden sm:flex items-center gap-1 rounded-xl bg-[#d9f447] text-[#0d1310] px-3 py-1.5 text-[11px] font-black hover:bg-[#cbe638] transition shadow-xs active:scale-95"
              >
                <UtensilsCrossed className="size-3.5" />
                <span>Menu</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 
          MOBILE 4*4 GRID METRIC TILES:
          Row 1: 4 Cards in a row (Active, In Prep, Ready, Revenue)
          Row 2: 4 Cards in a row (Avg Prep, Accuracy, Dispatches, Rating)
          Total: 4x4 / 4-column compact matrix on mobile devices
        */}
        <div className="space-y-1.5 sm:space-y-3">
          {/* Row 1: Live Queue Metrics (4-Column Grid on Mobile) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
            {/* Card 1: New / Active */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'new' ? 'all' : 'new')}
              className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
                activeFilter === 'new'
                  ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-amber-500/30'
                  : 'border-stone-200 dark:border-[#202c24] bg-white dark:bg-[#121815] hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
                  New
                </span>
                <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                  <Flame className="size-2.5 sm:size-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
                  {newOrders.length}
                </span>
                <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
                  To Accept
                </span>
              </div>
            </button>

            {/* Card 2: In Prep */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'preparing' ? 'all' : 'preparing')}
              className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
                activeFilter === 'preparing'
                  ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/15 ring-2 ring-orange-500/30'
                  : 'border-stone-200 dark:border-[#202c24] bg-white dark:bg-[#121815] hover:border-orange-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 truncate">
                  Cooking
                </span>
                <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0">
                  <CookingPot className="size-2.5 sm:size-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
                  {prepOrders.length}
                </span>
                <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
                  In Kitchen
                </span>
              </div>
            </button>

            {/* Card 3: Ready */}
            <button
              type="button"
              onClick={() => setActiveFilter(activeFilter === 'ready' ? 'all' : 'ready')}
              className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
                activeFilter === 'ready'
                  ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30'
                  : 'border-stone-200 dark:border-[#202c24] bg-white dark:bg-[#121815] hover:border-emerald-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
                  Ready
                </span>
                <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <PackageCheck className="size-2.5 sm:size-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
                  {readyOrders.length}
                </span>
                <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
                  For Pickup
                </span>
              </div>
            </button>

            {/* Card 4: Daily Sales Revenue */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200 dark:border-[#202c24] bg-white dark:bg-[#121815] p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs">
              <div className="flex items-center justify-between gap-1 w-full">
                <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-[#d9f447] truncate">
                  Sales
                </span>
                <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-blue-500/10 dark:bg-[#d9f447]/15 text-blue-600 dark:text-[#d9f447] shrink-0">
                  <DollarSign className="size-2.5 sm:size-3.5" />
                </div>
              </div>
              <div className="mt-1.5 sm:mt-2">
                <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block truncate">
                  ₹{totalDailyRevenue > 999 ? `${(totalDailyRevenue / 1000).toFixed(1)}k` : totalDailyRevenue}
                </span>
                <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
                  Today Total
                </span>
              </div>
            </div>
          </div>

          {/* Row 2: Secondary Performance Metrics (4-Column Grid on Mobile) */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
            {/* Card 5: Avg Prep Time */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 dark:border-[#1d2720] bg-white/70 dark:bg-[#0f1512] p-2 sm:p-3 text-left flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
                  Prep SLA
                </span>
                <Timer className="size-2.5 sm:size-3 text-stone-400 shrink-0" />
              </div>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
                  18 mins
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
                  Fast Kitchen
                </span>
              </div>
            </div>

            {/* Card 6: Fulfillment Rate */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 dark:border-[#1d2720] bg-white/70 dark:bg-[#0f1512] p-2 sm:p-3 text-left flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
                  Accuracy
                </span>
                <Sparkles className="size-2.5 sm:size-3 text-[#86a018] dark:text-[#d9f447] shrink-0" />
              </div>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
                  {completionRate}%
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-stone-500 dark:text-gray-400 font-bold block truncate">
                  Dispatched
                </span>
              </div>
            </div>

            {/* Card 7: Rider Dispatches */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 dark:border-[#1d2720] bg-white/70 dark:bg-[#0f1512] p-2 sm:p-3 text-left flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
                  Dispatched
                </span>
                <Truck className="size-2.5 sm:size-3 text-blue-500 shrink-0" />
              </div>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
                  {completedOrders.length}
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-bold block truncate">
                  Courier Drops
                </span>
              </div>
            </div>

            {/* Card 8: Rating */}
            <div className="rounded-xl sm:rounded-2xl border border-stone-200/80 dark:border-[#1d2720] bg-white/70 dark:bg-[#0f1512] p-2 sm:p-3 text-left flex flex-col justify-between">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
                  Rating
                </span>
                <Star className="size-2.5 sm:size-3 fill-amber-400 text-amber-400 shrink-0" />
              </div>
              <div className="mt-1">
                <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
                  4.8 ★
                </span>
                <span className="text-[7.5px] sm:text-[9px] text-stone-500 dark:text-gray-400 font-bold block truncate">
                  Customer Score
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 4-Item Quick Status Filter Tabs on Mobile */}
        <div className="grid grid-cols-4 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full pt-1">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`rounded-xl py-1.5 px-2 sm:px-3.5 text-center text-[10px] sm:text-xs font-black transition-all ${
              activeFilter === 'all'
                ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-xs'
                : 'bg-white dark:bg-[#141b17] border border-stone-200 dark:border-[#202c24] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            All ({kitchenOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('new')}
            className={`rounded-xl py-1.5 px-2 sm:px-3.5 text-center text-[10px] sm:text-xs font-black transition-all ${
              activeFilter === 'new'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141b17] border border-stone-200 dark:border-[#202c24] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            New ({newOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('preparing')}
            className={`rounded-xl py-1.5 px-2 sm:px-3.5 text-center text-[10px] sm:text-xs font-black transition-all ${
              activeFilter === 'preparing'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-white dark:bg-[#141b17] border border-stone-200 dark:border-[#202c24] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Cooking ({prepOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter('ready')}
            className={`rounded-xl py-1.5 px-2 sm:px-3.5 text-center text-[10px] sm:text-xs font-black transition-all ${
              activeFilter === 'ready'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-[#141b17] border border-stone-200 dark:border-[#202c24] text-stone-600 dark:text-gray-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Ready ({readyOrders.length})
          </button>
        </div>

        {/* 
          MAIN ORDERS CONTAINER:
          Supports 4x4 Grid Board (default on mobile) OR Detailed Tickets
        */}
        <div className="w-full min-w-0">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl sm:rounded-3xl border border-dashed border-stone-300 dark:border-[#243329] bg-white dark:bg-[#121815] p-8 sm:p-12 text-center shadow-xs">
              <div className="grid size-12 place-items-center rounded-2xl bg-stone-100 dark:bg-white/5 mx-auto text-stone-400">
                <CookingPot className="size-6" />
              </div>
              <h3 className="mt-3 text-sm sm:text-base font-black text-[#121815] dark:text-white">
                No orders in this queue
              </h3>
              <p className="mt-1 text-xs text-stone-500 dark:text-gray-400 max-w-sm mx-auto">
                Incoming orders will appear here automatically via realtime sync.
              </p>
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-4 py-1.5 text-xs font-black"
              >
                <span>View All Orders ({kitchenOrders.length})</span>
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            /* 
              4*4 GRID BOARD ON MOBILE:
              Arranged as grid-cols-4 on mobile devices (< sm / < md)
              for ultra-compact, high-density kitchen ticket visibility!
            */
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
              {filteredOrders.map((order) => {
                const isPending = !!pendingOrders[order.id]
                const isNew =
                  order.status === 'new' ||
                  order.status === 'sent_to_vendor' ||
                  order.status === 'accepted' ||
                  order.status === 'payment_verified'
                const isCooking =
                  order.status === 'preparing' ||
                  order.status === 'cooking' ||
                  order.status === 'packing'
                const isReady =
                  order.status === 'ready' ||
                  order.status === 'ready_for_pickup' ||
                  order.status === 'rider_assigned'
                const isEnRoute =
                  order.status === 'picked_up' || order.status === 'out_for_delivery'
                const isDone = order.status === 'delivered' || order.status === 'completed'

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className={`rounded-xl sm:rounded-2xl border p-2 sm:p-3 bg-white dark:bg-[#141b17] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer relative group ${
                      isNew
                        ? 'border-amber-400/80 dark:border-amber-500/60 ring-1 ring-amber-400/20'
                        : isCooking
                          ? 'border-orange-400/80 dark:border-orange-500/60 ring-1 ring-orange-400/20'
                          : isReady
                            ? 'border-emerald-400/80 dark:border-emerald-500/60'
                            : 'border-stone-200 dark:border-[#222e26]'
                    }`}
                  >
                    {/* Top: Order Token & Time */}
                    <div className="flex items-center justify-between gap-1 w-full border-b border-stone-100 dark:border-[#1d2720] pb-1.5">
                      <span className="font-mono text-[9px] sm:text-[11px] font-black text-stone-800 dark:text-stone-200 truncate">
                        #{order.id.slice(0, 5)}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-stone-400 font-semibold shrink-0">
                        {order.time}
                      </span>
                    </div>

                    {/* Middle: Dish summary & price */}
                    <div className="py-1.5 sm:py-2 flex-1 min-w-0">
                      <p className="text-[9px] sm:text-xs font-black text-[#121815] dark:text-white line-clamp-2 leading-tight">
                        {order.itemsText || 'Order Items'}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-[10px] sm:text-xs font-black text-emerald-700 dark:text-[#d9f447]">
                          ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
                        </span>
                        <span className="text-[8px] sm:text-[9px] font-bold text-stone-500 dark:text-stone-400 truncate max-w-[60px] sm:max-w-[100px]">
                          {order.customerName}
                        </span>
                      </div>
                    </div>

                    {/* Bottom: Fast Action Button */}
                    <div className="pt-1 w-full" onClick={(e) => e.stopPropagation()}>
                      {isNew && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="w-full rounded-lg bg-[#d9f447] py-1 px-1 text-[9px] sm:text-[11px] font-black text-[#0d1310] hover:bg-[#cbe638] active:scale-95 transition flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          {isPending ? (
                            <CraveSpinner size="xs" variant="dark" />
                          ) : (
                            <>
                              <Check className="size-2.5 sm:size-3" />
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                      )}

                      {isCooking && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                          className="w-full rounded-lg bg-orange-500 py-1 px-1 text-[9px] sm:text-[11px] font-black text-white hover:bg-orange-600 active:scale-95 transition flex items-center justify-center gap-1 shadow-2xs disabled:opacity-50"
                        >
                          {isPending ? (
                            <CraveSpinner size="xs" variant="white" />
                          ) : (
                            <>
                              <CookingPot className="size-2.5 sm:size-3" />
                              <span>Mark Ready</span>
                            </>
                          )}
                        </button>
                      )}

                      {isReady && (
                        <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 truncate">
                          Ready for Driver
                        </div>
                      )}

                      {isEnRoute && (
                        <div className="rounded-lg bg-blue-500/15 border border-blue-500/30 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 truncate">
                          Out 🛵
                        </div>
                      )}

                      {isDone && (
                        <div className="rounded-lg bg-stone-100 dark:bg-white/10 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-black text-stone-500 dark:text-stone-300 truncate">
                          Delivered ✓
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* 
              TICKET / DETAILED VIEW:
              Full-width tickets with complete item breakdown & notes
            */
            <div className="space-y-3 w-full min-w-0">
              {filteredOrders.map((order) => {
                const isPending = !!pendingOrders[order.id]
                const isNew =
                  order.status === 'new' ||
                  order.status === 'sent_to_vendor' ||
                  order.status === 'accepted' ||
                  order.status === 'payment_verified'
                const isCooking =
                  order.status === 'preparing' ||
                  order.status === 'cooking' ||
                  order.status === 'packing'
                const isReady =
                  order.status === 'ready' ||
                  order.status === 'ready_for_pickup' ||
                  order.status === 'rider_assigned'

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-stone-200 dark:border-[#222e26] bg-white dark:bg-[#141b17] p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-[#86a018]/40 dark:hover:border-[#34463a]"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-[#202b23] pb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-black text-stone-900 dark:text-white">
                            #{order.id.slice(0, 8)}
                          </span>
                          <span className="text-[10px] font-semibold text-stone-500 dark:text-gray-400">
                            · {order.time}
                          </span>
                          {order.paymentStatus === 'verified' && (
                            <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                              Payment Verified
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm sm:text-base font-black text-[#121815] dark:text-white mt-0.5">
                          {order.customerName}
                        </h4>
                        <p className="text-xs text-stone-500 dark:text-gray-400 truncate">
                          {order.address}
                        </p>
                      </div>

                      <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 shrink-0">
                        <span className="text-base sm:text-lg font-black text-[#5e700a] dark:text-[#d9f447]">
                          ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
                        </span>

                        <div className="flex items-center gap-2">
                          {isNew && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="rounded-xl bg-[#d9f447] px-3.5 py-1.5 text-xs font-black text-[#0d1310] hover:bg-[#cbe638] active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                            >
                              {isPending ? (
                                <CraveSpinner size="xs" variant="dark" />
                              ) : (
                                <>
                                  <Check className="size-3.5" />
                                  <span>Start Cooking</span>
                                </>
                              )}
                            </button>
                          )}

                          {isCooking && (
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                              className="rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white hover:bg-orange-600 active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                            >
                              {isPending ? (
                                <CraveSpinner size="xs" variant="white" />
                              ) : (
                                <>
                                  <CookingPot className="size-3.5" />
                                  <span>Mark Ready for Pickup</span>
                                </>
                              )}
                            </button>
                          )}

                          {isReady && (
                            <span className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                              Ready for Driver
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Itemized Recipe Ticket */}
                    <div className="rounded-xl bg-stone-50 dark:bg-[#0f1512] border border-stone-200/80 dark:border-[#202b23] p-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                        Kitchen Ticket Items
                      </p>
                      {order.itemsList.length > 0 ? (
                        <div className="divide-y divide-stone-200/60 dark:divide-[#202b23]">
                          {order.itemsList.map((item, idx) => (
                            <div key={idx} className="py-1 flex items-center justify-between text-xs">
                              <span className="font-bold text-[#121815] dark:text-stone-200">
                                <span className="font-mono font-black text-amber-600 dark:text-[#d9f447] mr-1.5">
                                  {item.qty}×
                                </span>
                                {item.name}
                              </span>
                              {item.price ? (
                                <span className="font-mono text-stone-500 dark:text-stone-400">
                                  ₹{item.price * item.qty}
                                </span>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                          {order.itemsText}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 
        ORDER DETAIL MODAL:
        Inspect full dish list, special requests, and address
      */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-stone-200 dark:border-[#223026] bg-white dark:bg-[#141b17] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-[#202b23] pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-stone-500 dark:text-gray-400">
                  Ticket #{selectedOrder.id}
                </span>
                <h3 className="text-lg font-black text-[#121815] dark:text-white">
                  {selectedOrder.customerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center rounded-xl bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-white hover:bg-stone-200 transition"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl bg-stone-50 dark:bg-[#0f1512] p-3.5 border border-stone-200 dark:border-[#202b23] space-y-2">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Order Breakdown
                </p>
                {selectedOrder.itemsList.length > 0 ? (
                  <div className="divide-y divide-stone-200/60 dark:divide-[#202b23]">
                    {selectedOrder.itemsList.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#121815] dark:text-stone-200">
                          <span className="font-mono font-black text-amber-600 dark:text-[#d9f447] mr-2">
                            {item.qty}×
                          </span>
                          {item.name}
                        </span>
                        {item.price ? (
                          <span className="font-mono font-bold text-stone-600 dark:text-stone-300">
                            ₹{item.price * item.qty}
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-semibold">{selectedOrder.itemsText}</p>
                )}
                <div className="pt-2 border-t border-stone-200 dark:border-[#202b23] flex items-center justify-between font-black text-sm">
                  <span>Total Amount</span>
                  <span className="text-emerald-600 dark:text-[#d9f447]">
                    ₹{selectedOrder.subtotal > 0 ? selectedOrder.subtotal : selectedOrder.totalAmount}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl bg-stone-50 dark:bg-[#0f1512] p-3.5 border border-stone-200 dark:border-[#202b23] space-y-1 text-xs">
                <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
                  Delivery Destination
                </p>
                <p className="font-semibold text-stone-800 dark:text-stone-200">
                  {selectedOrder.address}
                </p>
                {selectedOrder.customerPhone && (
                  <p className="text-stone-500 dark:text-stone-400 font-mono text-[11px] pt-1">
                    Phone: {selectedOrder.customerPhone}
                  </p>
                )}
                {selectedOrder.utrRef && (
                  <p className="text-stone-500 dark:text-stone-400 font-mono text-[10px]">
                    Payment UTR: {selectedOrder.utrRef}
                  </p>
                )}
              </div>
            </div>

            {/* Modal action bar */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-xl border border-stone-200 dark:border-[#202b23] px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition"
              >
                Close
              </button>

              {(selectedOrder.status === 'new' ||
                selectedOrder.status === 'sent_to_vendor' ||
                selectedOrder.status === 'accepted' ||
                selectedOrder.status === 'payment_verified') && (
                <button
                  type="button"
                  disabled={!!pendingOrders[selectedOrder.id]}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                  className="rounded-xl bg-[#d9f447] text-[#0d1310] px-4 py-2 text-xs font-black hover:bg-[#cbe638] transition active:scale-95 disabled:opacity-50"
                >
                  Accept &amp; Cook
                </button>
              )}

              {(selectedOrder.status === 'preparing' ||
                selectedOrder.status === 'cooking' ||
                selectedOrder.status === 'packing') && (
                <button
                  type="button"
                  disabled={!!pendingOrders[selectedOrder.id]}
                  onClick={() => updateOrderStatus(selectedOrder.id, 'ready_for_pickup')}
                  className="rounded-xl bg-orange-500 text-white px-4 py-2 text-xs font-black hover:bg-orange-600 transition active:scale-95 disabled:opacity-50"
                >
                  Mark Ready for Pickup
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

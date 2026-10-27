'use client'

import VendorSidebar from '@/components/VendorSidebar'
import KitchenGridCard from '@/components/vendor/KitchenGridCard'
import KitchenMetrics from '@/components/vendor/KitchenMetrics'
import KitchenTicketCard from '@/components/vendor/KitchenTicketCard'
import OrderDetailsModal from '@/components/vendor/OrderDetailsModal'
import type { KitchenItem, KitchenOrder } from '@/components/vendor/types'
import { useAuth } from '@/lib/auth-context'
import { showBrowserNotification } from '@/lib/notifications/web-notification'
import { playChimeSound, useVendorOrderUpdates } from '@/lib/websocket'
import {
  Bell,
  CookingPot,
  LayoutGrid,
  ListFilter,
  RefreshCw,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

export type { KitchenItem, KitchenOrder }

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
  const isFetchingRef = useRef(false)
  const lastFetchRef = useRef(0)
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

  // Fetch live kitchen orders with diff-checking and 2.5s throttling
  const loadLiveKitchenOrders = useCallback(
    async (isManualRefresh = false) => {
      const now = Date.now()
      if (!isManualRefresh && (isFetchingRef.current || now - lastFetchRef.current < 2500)) {
        return
      }
      isFetchingRef.current = true
      lastFetchRef.current = now

      if (isManualRefresh) setIsRefreshing(true)

      try {
        const targetRestId = resolvedRestaurantId || user?.restaurantId || 'rest_demo_01'
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
        isFetchingRef.current = false
        if (isManualRefresh) {
          setTimeout(() => setIsRefreshing(false), 400)
        }
      }
    },
    [resolvedRestaurantId, user?.restaurantId, user?.id, user?.restaurantName]
  )

  const loadOrdersRef = useRef(loadLiveKitchenOrders)
  loadOrdersRef.current = loadLiveKitchenOrders

  // Initial fetch and auto-refresh intervals
  useEffect(() => {
    void loadOrdersRef.current()
    const interval = setInterval(() => {
      void loadOrdersRef.current()
    }, 15000)
    return () => clearInterval(interval)
  }, [resolvedRestaurantId, user?.id])

  // Stable WebSocket listener for new live orders
  const handleLiveOrderEvent = useCallback((data: any) => {
    const o = data.order || data
    if (!o || !o.id) return

    if (soundEnabledRef.current) {
      playChimeSound()
    }
    void loadOrdersRef.current()
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
  }, [])

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
        (o) =>
          o.status === 'ready' || o.status === 'ready_for_pickup' || o.status === 'rider_assigned'
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

  const totalDailyRevenue = useMemo(
    () => kitchenOrders.reduce((acc, o) => acc + (o.subtotal > 0 ? o.subtotal : o.totalAmount), 0),
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

        {/* 4*4 Grid Performance Metrics */}
        <KitchenMetrics
          newCount={newOrders.length}
          prepCount={prepOrders.length}
          readyCount={readyOrders.length}
          totalDailyRevenue={totalDailyRevenue}
          completionRate={completionRate}
          completedCount={completedOrders.length}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* 4-Item Quick Status Filter Tabs */}
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

        {/* Main Orders Display */}
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
            <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
              {filteredOrders.map((order) => (
                <KitchenGridCard
                  key={order.id}
                  order={order}
                  isPending={!!pendingOrders[order.id]}
                  onSelect={() => setSelectedOrder(order)}
                  onStatusUpdate={updateOrderStatus}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3 w-full min-w-0">
              {filteredOrders.map((order) => (
                <KitchenTicketCard
                  key={order.id}
                  order={order}
                  isPending={!!pendingOrders[order.id]}
                  onStatusUpdate={updateOrderStatus}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Order Detail Inspection Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isPending={!!(selectedOrder && pendingOrders[selectedOrder.id])}
        onClose={() => setSelectedOrder(null)}
        onStatusUpdate={updateOrderStatus}
      />
    </div>
  )
}

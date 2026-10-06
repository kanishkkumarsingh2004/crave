'use client'

import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { useLanguage } from '@/lib/language-context'
import { useVendorOrderUpdates, playChimeSound } from '@/lib/websocket'
import {
  ArrowUpRight,
  Bell,
  ChartColumn,
  CheckCircle2,
  CookingPot,
  PackageCheck,
  ShoppingBag,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface KitchenOrder {
  id: string
  customerName: string
  customerPhone?: string
  itemsText: string
  subtotal: number
  totalAmount: number
  status: string
  paymentStatus: string
  time: string
  address: string
  deliveryOtp?: string
  utrRef?: string
}

export default function VendorDashboard() {
  const { user, logout } = useAuth()
  const { t } = useLanguage()
  const router = useRouter()
  const pathname = usePathname()
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([])
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [liveBanner, setLiveBanner] = useState<{
    id: string
    customerName: string
    totalAmount: number
  } | null>(null)

  const loadLiveKitchenOrders = async () => {
    try {
      let ordersData: any[] = []
      const vendorId = user?.restaurantId || user?.id
      const query = vendorId
        ? `vendorId=${encodeURIComponent(vendorId)}`
        : user?.restaurantName
          ? `vendorName=${encodeURIComponent(user.restaurantName)}`
          : ''
      const res = await fetch(query ? `/api/orders?${query}` : '/api/orders')
      const json = await res.json()
      if (json.success && Array.isArray(json.orders)) {
        ordersData = json.orders
      }

      if (vendorId && ordersData.length > 0) {
        const vendorFiltered = ordersData.filter(
          (o) =>
            o.restaurant_id === vendorId ||
            o.vendor_id === vendorId ||
            (user?.restaurantName && o.restaurant_name === user.restaurantName)
        )
        if (vendorFiltered.length > 0) {
          ordersData = vendorFiltered
        }
      }

      const parsed: KitchenOrder[] = ordersData.map((o: any) => {
        let itemNames = 'Order Items'
        try {
          const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
          if (Array.isArray(arr)) {
            itemNames = arr.map((i: any) => `${i.qty || 1}x ${i.name}`).join(', ')
          }
        } catch (e) {}

        const formattedTime =
          o.createdAt || o.created_at
            ? new Date(o.createdAt || o.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Just now'

        return {
          id: o.id,
          customerName: o.customer_name || 'Customer',
          customerPhone: o.customer_phone || undefined,
          itemsText: itemNames,
          subtotal: Number(o.subtotal || 0),
          totalAmount: Number(o.total_amount || 0),
          status: o.status || 'new',
          paymentStatus: o.payment_status || 'pending',
          time: formattedTime,
          address: o.customer_address || 'Bengaluru',
          deliveryOtp: o.delivery_otp || undefined,
          utrRef: o.utr_ref || undefined,
        }
      })
      setKitchenOrders(parsed)
    } catch (err) {
      console.error('Failed to load kitchen orders:', err)
    }
  }

  useEffect(() => {
    loadLiveKitchenOrders()
  }, [user?.id, user?.restaurantId, user?.restaurantName])

  // Live WebSocket order update listener for instant kitchen popups
  useVendorOrderUpdates((data) => {
    const o = data.order || data
    if (!o || !o.id) return

    const vendorId = user?.restaurantId || user?.id
    const isMatch =
      !vendorId ||
      o.restaurant_id === vendorId ||
      o.vendor_id === vendorId ||
      (user?.restaurantName && o.restaurant_name === user.restaurantName)

    if (isMatch) {
      playChimeSound()
      loadLiveKitchenOrders()
      setLiveBanner({
        id: o.id,
        customerName: o.customer_name || 'Customer',
        totalAmount: Number(o.total_amount || 0),
      })
    }
  })

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
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
    } catch (err) {
      console.error('Failed to update kitchen order status:', err)
    }
    setKitchenOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    )
  }

  const openCount = kitchenOrders.filter(
    (o) => o.status === 'new' || o.status === 'preparing'
  ).length
  const readyCount = kitchenOrders.filter((o) => o.status === 'ready').length
  const completedDropsCount = kitchenOrders.filter(
    (o) => o.status === 'delivered' || o.status === 'out_for_delivery'
  ).length
  const totalDailyRevenue = kitchenOrders.reduce((acc, o) => acc + o.totalAmount, 0)
  const completionRate =
    kitchenOrders.length > 0 ? Math.round((completedDropsCount / kitchenOrders.length) * 100) : 0

  const orderStats = [
    { label: 'Active Orders', value: openCount.toString(), tone: 'amber' },
    { label: 'Ready for Pickup', value: readyCount.toString(), tone: 'green' },
    { label: 'Daily Sales', value: `₹${totalDailyRevenue}`, tone: 'blue' },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9f7] pb-16 text-[#18201c] lg:pl-64">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Live Order Arrival Popup Banner */}
        {liveBanner && (
          <div className="rounded-3xl border-2 border-[#d9f447] bg-[#18201c] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] animate-bounce">
                <Bell className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#d9f447] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#18201c]">
                    LIVE NEW ORDER
                  </span>
                  <span className="font-mono text-xs font-bold text-gray-400">
                    #{liveBanner.id.slice(0, 8)}
                  </span>
                </div>
                <p className="mt-1 text-sm font-extrabold">
                  Order placed by <span className="text-[#d9f447]">{liveBanner.customerName}</span>{' '}
                  · Total: ₹{liveBanner.totalAmount}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveBanner(null)}
              className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
              aria-label="Dismiss banner"
            >
              <X className="size-4" />
            </button>
          </div>
        )}

        {/* Welcome Kitchen Banner */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                  Kitchen Active • Accepting Orders
                </span>
              </div>
              <h2 className="mt-1.5 text-2xl font-bold text-[#18201c]">
                Welcome back, {user?.name || 'Chef'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Managing kitchen operations for{' '}
                <strong className="text-[#18201c]">
                  {user?.restaurantName || 'The Green Table'}
                </strong>
              </p>
            </div>
          </div>
        </div>

        {/* 3 Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {orderStats.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  {item.label}
                </span>
                <div
                  className={`grid size-9 place-items-center rounded-2xl ${
                    item.tone === 'amber'
                      ? 'bg-amber-50 text-amber-800'
                      : item.tone === 'green'
                        ? 'bg-emerald-50 text-emerald-800'
                        : 'bg-blue-50 text-blue-800'
                  }`}
                >
                  {item.tone === 'amber' ? (
                    <ShoppingBag className="size-4" />
                  ) : item.tone === 'green' ? (
                    <PackageCheck className="size-4" />
                  ) : (
                    <ChartColumn className="size-4" />
                  )}
                </div>
              </div>
              <p className="mt-4 text-2xl font-bold text-[#18201c]">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Orders Queue & Kitchen Performance Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">Live Kitchen Orders</h3>
                <p className="text-xs text-gray-500">
                  Customer orders requiring food preparation &amp; dispatch
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Active Orders ({openCount})
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {kitchenOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 border border-dashed border-gray-200 rounded-2xl">
                  No orders currently in kitchen queue.
                </div>
              ) : (
                kitchenOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-gray-200 p-4 bg-white shadow-xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-500">
                            #{order.id.slice(0, 8)}...
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase ${
                              order.paymentStatus === 'verified'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}
                          >
                            {order.paymentStatus === 'verified'
                              ? '✓ Payment Verified'
                              : '⏳ Payment Pending'}
                          </span>
                          {order.deliveryOtp && (
                            <span className="rounded-full bg-[#d9f447] px-2.5 py-0.5 text-[10px] font-mono font-black text-[#18201c]">
                              OTP: {order.deliveryOtp}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-base text-[#18201c] mt-1">
                          {order.customerName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {order.address} ·{' '}
                          <span className="font-semibold text-gray-700">{order.time}</span>
                        </p>
                        {order.utrRef && (
                          <p className="text-[10px] font-mono text-gray-400 mt-0.5">
                            UTR: {order.utrRef}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-base font-black text-emerald-700">
                          ₹{order.totalAmount}
                        </span>
                        <div className="mt-1">
                          <span
                            className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                              order.status === 'ready' || order.status === 'out_for_delivery'
                                ? 'bg-emerald-600 text-white'
                                : order.status === 'preparing'
                                  ? 'bg-amber-500 text-white'
                                  : order.status === 'delivered'
                                    ? 'bg-gray-800 text-white'
                                    : 'bg-blue-600 text-white'
                            }`}
                          >
                            {order.status === 'new' && 'New Order'}
                            {order.status === 'preparing' && 'Kitchen Cooking'}
                            {order.status === 'ready' && 'Ready for Pickup'}
                            {order.status === 'out_for_delivery' && 'Out for Delivery'}
                            {order.status === 'delivered' && 'Delivered'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-800 bg-[#f8f9f7] p-3 rounded-xl border border-gray-200">
                      🍱 {order.itemsText}
                    </p>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-gray-100">
                      {(order.status === 'new' || order.status === 'preparing') && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#323d36] transition flex items-center gap-1.5"
                        >
                          <CookingPot className="size-3.5 text-[#d9f447]" /> Start Preparing
                        </button>
                      )}
                      {(order.status === 'new' || order.status === 'preparing') && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" /> Mark Ready for Pickup
                        </button>
                      )}
                      {(order.status === 'ready' || order.status === 'preparing') && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'out_for_delivery')}
                          className="rounded-full bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition flex items-center gap-1.5"
                        >
                          <PackageCheck className="size-3.5" /> Dispatch Out for Delivery
                        </button>
                      )}
                      {order.status === 'out_for_delivery' && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'delivered')}
                          className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" /> Mark Delivered
                        </button>
                      )}
                      {order.status === 'delivered' && (
                        <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                          <CheckCircle2 className="size-4 text-emerald-600" /> Order Completed &amp;
                          Delivered
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-lg font-bold text-[#18201c]">Kitchen Performance</h3>
            <div className="space-y-4">
              <div className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Gross Orders Revenue</span>
                  <span>₹{totalDailyRevenue}</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-[#86a018] transition-all duration-500"
                    style={{ width: totalDailyRevenue > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Order Completion Rate</span>
                  <span>{completionRate}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Completed Customer Drops</span>
                  <span>{completedDropsCount} orders</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all duration-500"
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

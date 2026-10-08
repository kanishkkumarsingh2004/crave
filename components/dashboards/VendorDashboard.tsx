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

      const approvedOrders = ordersData.filter(
        (o) =>
          o.payment_status === 'verified' ||
          !['payment_pending', 'payment_submitted'].includes(o.status)
      )

      const parsed: KitchenOrder[] = approvedOrders.map((o: any) => {
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
          utrRef: o.utrRef || o.utr_ref || undefined,
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

  // Live WebSocket order update listener for instant kitchen popups (triggered only on admin approval)
  useVendorOrderUpdates((data) => {
    const o = data.order || data
    if (!o || !o.id) return

    const vendorId = user?.restaurantId || user?.id
    const isMatch =
      !vendorId ||
      o.restaurant_id === vendorId ||
      o.vendor_id === vendorId ||
      (user?.restaurantName && o.restaurant_name === user.restaurantName)

    const isApproved =
      o.payment_status === 'verified' ||
      (o.status && !['payment_pending', 'payment_submitted'].includes(o.status))

    if (isMatch && isApproved) {
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
  const totalDailyRevenue = kitchenOrders.reduce(
    (acc, o) => acc + (o.subtotal > 0 ? o.subtotal : o.totalAmount),
    0
  )
  const completionRate =
    kitchenOrders.length > 0 ? Math.round((completedDropsCount / kitchenOrders.length) * 100) : 0

  const orderStats = [
    { label: 'Active Orders', value: openCount.toString(), tone: 'amber' },
    { label: 'Ready for Pickup', value: readyCount.toString(), tone: 'green' },
    { label: 'Daily Sales', value: `₹${totalDailyRevenue}`, tone: 'blue' },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f0d] pb-16 text-white lg:pl-64 custom-scrollbar">
      <VendorSidebar />

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        {/* Live Order Arrival Popup Banner */}
        {liveBanner && (
          <div className="rounded-3xl border-2 border-[#d9f447] bg-[#141d18] p-5 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-[#d9f447] text-[#0d1310] animate-bounce shadow-md">
                <Bell className="size-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#d9f447] px-2.5 py-0.5 text-[10px] font-black uppercase text-[#0d1310]">
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
        <div className="rounded-3xl border border-[#233027] bg-gradient-to-r from-[#141b17] via-[#111614] to-[#18231c] p-6 shadow-xl relative overflow-hidden">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between relative z-10">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-block size-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#d9f447] animate-pulse" />
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                  Kitchen Active • Accepting Orders
                </span>
              </div>
              <h2 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                Welcome back, <span className="text-[#d9f447]">{user?.name || 'Chef'}</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Managing kitchen operations for{' '}
                <strong className="text-white">{user?.restaurantName || 'The Green Table'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/vendor/menu"
                className="rounded-full bg-[#1e2822] border border-[#2d3d33] px-4 py-2 text-xs font-extrabold text-white hover:border-[#d9f447] transition flex items-center gap-1.5"
              >
                Manage Menu
              </Link>
            </div>
          </div>
        </div>

        {/* 3 Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          {orderStats.map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-[#222e27] bg-[#121815] p-5 shadow-lg hover:border-[#d9f447]/40 transition-all duration-300 group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  {item.label}
                </span>
                <div
                  className={`grid size-9 place-items-center rounded-2xl border ${
                    item.tone === 'amber'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : item.tone === 'green'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
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
              <p className="mt-4 text-3xl font-black text-white tracking-tight">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Orders Queue & Kitchen Performance Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
          {/* Live Kitchen Orders Card */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#202b24] pb-4">
              <div>
                <h3 className="text-lg font-black text-white">Live Kitchen Orders</h3>
                <p className="text-xs text-gray-400">
                  Customer orders requiring food preparation &amp; dispatch
                </p>
              </div>
              <span className="rounded-full bg-[#d9f447]/10 px-3 py-1 text-[10px] font-black text-[#d9f447] border border-[#d9f447]/30">
                Active Orders ({openCount})
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {kitchenOrders.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 border border-dashed border-[#222e27] rounded-2xl bg-[#0e1311]">
                  No orders currently in kitchen queue.
                </div>
              ) : (
                kitchenOrders.map((order) => (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-[#25322a] p-4 bg-[#171f1b] shadow-md space-y-3 hover:border-[#34463a] transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#222e27] pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-400">
                            #{order.id.slice(0, 8)}...
                          </span>
                          {order.paymentStatus === 'verified' && (
                            <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Payment Verified
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-base text-white mt-1">
                          {order.customerName}
                        </h4>
                        <p className="text-xs text-gray-400">
                          {order.address} ·{' '}
                          <span className="font-semibold text-gray-300">{order.time}</span>
                        </p>
                        {order.utrRef && (
                          <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                            UTR: {order.utrRef}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-[#d9f447]">
                          ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
                        </span>
                        {order.subtotal > 0 && order.subtotal !== order.totalAmount && (
                          <p className="text-[10px] text-gray-400 font-medium">
                            Customer Total: ₹{order.totalAmount}
                          </p>
                        )}
                        <div className="mt-1 flex justify-end">
                          {(order.status === 'new' ||
                            order.status === 'payment_submitted' ||
                            order.status === 'payment_verified' ||
                            order.status === 'sent_to_vendor' ||
                            order.status === 'payment_pending' ||
                            order.status === 'accepted') && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="rounded-full bg-[#d9f447] px-4 py-1.5 text-xs font-black text-[#0d1310] shadow-md hover:bg-[#c8e434] active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CheckCircle2 className="size-3.5 text-[#0d1310]" />
                              <span>Accept Order</span>
                            </button>
                          )}

                          {(order.status === 'preparing' ||
                            order.status === 'cooking' ||
                            order.status === 'packing') && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatus(order.id, 'ready_for_pickup')}
                              className="rounded-full bg-amber-400 px-4 py-1.5 text-xs font-black text-[#0d1310] shadow-md hover:bg-amber-300 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
                            >
                              <CookingPot className="size-3.5" />
                              <span>Mark Ready</span>
                            </button>
                          )}

                          {(order.status === 'ready' ||
                            order.status === 'ready_for_pickup' ||
                            order.status === 'rider_assigned') && (
                            <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-emerald-400" /> Ready for Pickup
                            </span>
                          )}

                          {(order.status === 'picked_up' ||
                            order.status === 'out_for_delivery' ||
                            order.status === 'arrived_customer') && (
                            <span className="rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              Out for Delivery
                            </span>
                          )}

                          {(order.status === 'delivered' || order.status === 'completed') && (
                            <span className="rounded-full bg-[#243028] text-emerald-300 border border-[#304036] px-3 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle2 className="size-3 text-emerald-400" /> Delivered
                            </span>
                          )}

                          {order.status === 'cancelled' && (
                            <span className="rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                              Cancelled
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-semibold text-gray-200 bg-[#121714] p-3 rounded-xl border border-[#222e27]">
                      {order.itemsText}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Kitchen Performance Card */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-black text-white">Kitchen Performance</h3>
            <div className="overflow-hidden rounded-2xl border border-[#222e27] bg-[#171f1b]">
              <table className="w-full text-left text-xs text-gray-300">
                <thead>
                  <tr className="border-b border-[#222e27] bg-[#121815] text-gray-400 uppercase tracking-wider text-[10px] font-extrabold">
                    <th className="py-3 px-4">Performance Metric</th>
                    <th className="py-3 px-4 text-right">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222e27] bg-[#171f1b]">
                  <tr className="hover:bg-[#1c2620] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-300">Gross Orders Revenue</td>
                    <td className="py-3.5 px-4 text-right font-black text-[#d9f447]">
                      ₹{totalDailyRevenue}
                    </td>
                  </tr>
                  <tr className="hover:bg-[#1c2620] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-300">Order Completion Rate</td>
                    <td className="py-3.5 px-4 text-right font-black text-white">
                      {completionRate}%
                    </td>
                  </tr>
                  <tr className="hover:bg-[#1c2620] transition-colors">
                    <td className="py-3.5 px-4 font-medium text-gray-300">
                      Completed Customer Drops
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-white">
                      {completedDropsCount} orders
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

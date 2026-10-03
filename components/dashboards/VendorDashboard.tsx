'use client'

import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import {
  ArrowUpRight,
  ChartColumn,
  CheckCircle2,
  CookingPot,
  LogOut,
  PackageCheck,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface KitchenOrder {
  id: string
  customerName: string
  itemsText: string
  subtotal: number
  totalAmount: number
  status: string
  time: string
  address: string
}

export default function VendorDashboard() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrder[]>([])

  const loadLiveKitchenOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const parsed: KitchenOrder[] = data.map((o) => {
          let itemNames = 'Order Items'
          try {
            const arr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items
            if (Array.isArray(arr)) {
              itemNames = arr.map((i: any) => `${i.qty || 1}x ${i.name}`).join(', ')
            }
          } catch (e) {}

          return {
            id: o.id,
            customerName: o.customer_name || 'Customer',
            itemsText: itemNames,
            subtotal: o.subtotal || 0,
            totalAmount: o.total_amount || 0,
            status: o.status || 'new',
            time: o.created_at
              ? new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now',
            address: o.customer_address || 'Bengaluru',
          }
        })
        setKitchenOrders(parsed)
      }
    } catch (err) {
      console.error('Failed to load kitchen orders:', err)
    }
  }

  useEffect(() => {
    loadLiveKitchenOrders()
    const timer = setInterval(loadLiveKitchenOrders, 5000)
    return () => clearInterval(timer)
  }, [])

  const updateOrderStatus = async (orderId: string, nextStatus: string) => {
    try {
      await supabase.from('orders').update({ status: nextStatus }).eq('id', orderId)
    } catch (err) {
      console.error('Failed to update kitchen order status:', err)
    }
    setKitchenOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    )
  }

  const openCount = kitchenOrders.filter((o) => o.status === 'new' || o.status === 'preparing').length
  const readyCount = kitchenOrders.filter((o) => o.status === 'ready').length
  const totalDailyRevenue = kitchenOrders.reduce((acc, o) => acc + o.totalAmount, 0)

  const orderStats = [
    { label: 'Active Orders', value: openCount.toString(), tone: 'amber' },
    { label: 'Ready for Pickup', value: readyCount.toString(), tone: 'green' },
    { label: 'Daily Sales', value: `₹${totalDailyRevenue}`, tone: 'blue' },
    { label: 'Kitchen Rating', value: '4.9 ★', tone: 'purple' },
  ]

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-16">
      {/* Top Vendor Header Navigation Bar */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Brand Logo & Kitchen Name */}
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link href="/" className="font-black text-2xl sm:text-3xl tracking-tighter text-[#18201c] shrink-0">
              crave<span className="text-[#86a018]">.</span>
            </Link>
            <span className="rounded-full bg-[#18201c] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#d9f447]">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#18201c] truncate">
              <Store className="size-4 text-[#86a018] shrink-0" />
              <span className="truncate max-w-[200px]">{user?.restaurantName || 'The Green Table'}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
            <button
              onClick={() => router.push('/vendor/dashboard')}
              className="rounded-2xl bg-[#18201c] text-white px-4 py-2 transition shrink-0 shadow-xs"
            >
              Kitchen Orders
            </button>
            <Link
              href="/vendor/menu"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <UtensilsCrossed className="size-3.5 text-amber-600" />
              <span>Menu Management</span>
            </Link>
            <Link
              href="/vendor/sales"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ChartColumn className="size-3.5 text-[#86a018]" />
              <span>Sales &amp; Earnings</span>
            </Link>
            <Link
              href="/vendor/coupons"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Percent className="size-3.5 text-purple-600" />
              <span>Store Offers</span>
            </Link>
            <Link
              href="/vendor/settings"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Settings className="size-3.5 text-gray-600" />
              <span>Bank &amp; Settings</span>
            </Link>
            <button
              onClick={() => logout()}
              className="rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 transition shrink-0 hover:bg-rose-100 flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
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
                <strong className="text-[#18201c]">{user?.restaurantName || 'The Green Table'}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/vendor/coupons"
                className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#323d36] transition"
              >
                Create Promo Offer <ArrowUpRight className="size-3.5 text-[#d9f447]" />
              </Link>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {orderStats.map((item) => (
            <div key={item.label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xs">
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
                        : item.tone === 'blue'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-purple-50 text-purple-800'
                  }`}
                >
                  {item.tone === 'amber' ? (
                    <ShoppingBag className="size-4" />
                  ) : item.tone === 'green' ? (
                    <PackageCheck className="size-4" />
                  ) : item.tone === 'blue' ? (
                    <ChartColumn className="size-4" />
                  ) : (
                    <Star className="size-4" />
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
                Active Orders ({kitchenOrders.length})
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
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-mono text-xs font-bold text-gray-500">#{order.id}</span>
                        <h4 className="font-bold text-sm text-[#18201c]">{order.customerName}</h4>
                        <p className="text-[11px] text-gray-500">{order.address} · {order.time}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-emerald-700">₹{order.totalAmount}</span>
                        <div className="mt-1">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                              order.status === 'ready'
                                ? 'bg-emerald-100 text-emerald-800'
                                : order.status === 'preparing'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs font-medium text-gray-800 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      🍱 {order.itemsText}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
                      {order.status === 'new' && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'preparing')}
                          className="rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#323d36] transition flex items-center gap-1.5"
                        >
                          <CookingPot className="size-3.5 text-[#d9f447]" /> Accept &amp; Start Preparing
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button
                          type="button"
                          onClick={() => updateOrderStatus(order.id, 'ready')}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="size-3.5" /> Mark Ready for Pickup
                        </button>
                      )}
                      {order.status === 'ready' && (
                        <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                          <PackageCheck className="size-4" /> Ready for Driver Pickup
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
                  <div className="h-full w-[85%] rounded-full bg-[#86a018]" />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>On-Time Food Prep</span>
                  <span>98%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-[98%] rounded-full bg-emerald-500" />
                </div>
              </div>

              <div className="rounded-2xl bg-[#f7f8f3] p-4">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>Completed Customer Drops</span>
                  <span>{kitchenOrders.length} orders</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                  <div className="h-full w-[100%] rounded-full bg-blue-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

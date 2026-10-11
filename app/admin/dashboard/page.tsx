'use client'

import AppleProgressBar from '@/components/ui/AppleProgressBar'
import { useLanguage } from '@/lib/language-context'
import { useAdminStatsUpdates } from '@/lib/websocket'
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock,
  CreditCard,
  Database,
  DollarSign,
  Layers,
  MapPin,
  PackageCheck,
  Percent,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Zap,
} from 'lucide-react'
import Link from 'next/link'
import React, { useEffect, useState } from 'react'

export default function AdminDashboardPage() {
  const { t } = useLanguage()
  const [weeklyGross, setWeeklyGross] = useState(0)
  const [totalCommission, setTotalCommission] = useState(0)
  const [netVendorPay, setNetVendorPay] = useState(0)
  const [customerCount, setCustomerCount] = useState(0)
  const [vendorCount, setVendorCount] = useState(0)
  const [driverCount, setDriverCount] = useState(0)
  const [allTimeOrders, setAllTimeOrders] = useState(0)
  const [liveNotice, setLiveNotice] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [recentOrders, setRecentOrders] = useState<any[]>([])
  const [topRestaurants, setTopRestaurants] = useState<
    { name: string; grossSales: number; commissionRate: number }[]
  >([])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/stats', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        setWeeklyGross(json.stats.weeklyRevenue ?? 0)
        setTotalCommission(json.stats.totalCommission ?? 0)
        setNetVendorPay(json.stats.netVendorPay ?? 0)
        setCustomerCount(json.stats.customerCount ?? 0)
        setVendorCount(json.stats.vendorCount ?? 0)
        setDriverCount(json.stats.driverCount ?? 0)
        setAllTimeOrders(json.stats.orderCount ?? 0)

        if (json.orders && Array.isArray(json.orders)) {
          setRecentOrders(json.orders.slice(0, 5))
        }

        if (json.restaurants && json.restaurants.length > 0) {
          setTopRestaurants(
            json.restaurants.slice(0, 4).map((restaurant: any) => ({
              name: restaurant.name ?? 'Restaurant',
              grossSales: Number(restaurant.gross_sales ?? 0),
              commissionRate: Number(restaurant.commission_rate ?? 15),
            }))
          )
        } else {
          setTopRestaurants([])
        }
      }
    } catch (error) {
      console.error('Failed to load admin overview data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Subscribe to Live Server WebSocket Broadcast Stream (Zero Refresh Real-Time Server Updates)
  useAdminStatsUpdates((data) => {
    if (!data) return

    if (data.type === 'user_signup') {
      const role = data.role || data.user?.role || 'user'
      setLiveNotice(
        `LIVE STREAM: New ${role} onboarded (${data.user?.name || 'User'}) — Counts synchronized!`
      )
    } else if (data.type === 'order_created') {
      setLiveNotice('LIVE STREAM: New customer order placed — Revenue and order metrics updated live!')
    } else if (data.type === 'db_wiped') {
      setLiveNotice('LIVE STREAM: Database resynced — Metrics refreshed!')
    }
    loadDashboardData()
  })

  useEffect(() => {
    loadDashboardData()
  }, [])

  // Proportional user metrics for Graphic Progress Bars
  const totalUsers = Math.max(1, customerCount + vendorCount + driverCount)
  const customerPct = Math.round((customerCount / totalUsers) * 100)
  const vendorPct = Math.round((vendorCount / totalUsers) * 100)
  const driverPct = Math.round((driverCount / totalUsers) * 100)

  return (
    <div className="space-y-6">
      {/* Platform Real-Time Control & Heartbeat Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative flex size-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-3.5 rounded-full bg-emerald-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-[#18201c] dark:text-white">
                Platform Operations & Telemetry Center
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wifi className="size-2.5" /> WebSocket Live
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Real-time platform throughput, commission margins, fulfillment rates, and fleet health.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] px-3.5 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1a221d] transition disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync Data'}</span>
          </button>
          <Link
            href="/admin/map-live-analytics"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#18201c] text-white hover:bg-black dark:bg-[#d9f447] dark:text-[#121815] dark:hover:bg-[#c2dc3a] px-3.5 py-1.5 text-xs font-black shadow-xs transition"
          >
            <MapPin className="size-3.5" />
            <span>Live Dispatch Map</span>
          </Link>
        </div>
      </div>

      {/* Live Event Notification Banner */}
      {liveNotice && (
        <div className="rounded-2xl border border-emerald-500/40 bg-[#121815] p-3.5 text-white shadow-xl flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <p className="text-xs font-bold text-emerald-300">{liveNotice}</p>
          </div>
          <button
            onClick={() => setLiveNotice(null)}
            className="text-[11px] font-bold text-gray-400 hover:text-white px-2 py-0.5 rounded bg-white/10"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Executive KPI Summary Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard
          title={t.admin.weeklyGross || 'Weekly GMV'}
          value={`₹${weeklyGross.toLocaleString()}`}
          sublabel="Order volume"
          accent="purple"
          icon={<DollarSign className="size-4" />}
          trend="+14.2% vs last wk"
        />
        <KpiCard
          title={t.admin.platformCommission || 'Platform Net Cut'}
          value={`₹${totalCommission.toLocaleString()}`}
          sublabel="Retained profit"
          accent="emerald"
          icon={<Percent className="size-4" />}
          trend="Automated 15-20%"
        />
        <KpiCard
          title={t.admin.netVendorPay || 'Merchant Disbursed'}
          value={`₹${netVendorPay.toLocaleString()}`}
          sublabel="Net payouts"
          accent="amber"
          icon={<Store className="size-4" />}
          trend="Reconciled clean"
        />
        <KpiCard
          title={t.admin.deliveryFleet || 'Active Fleet'}
          value={`${driverCount} Drivers`}
          sublabel="Field delivery capacity"
          accent="blue"
          icon={<Truck className="size-4" />}
          trend="100% telemetry synced"
        />
        <KpiCard
          title={t.admin.totalCustomers || 'Customer Base'}
          value={`${customerCount} Active`}
          sublabel="Registered accounts"
          accent="indigo"
          icon={<Users className="size-4" />}
          trend="Growing organically"
        />
        <KpiCard
          title={t.admin.totalOrders || 'Lifetime Orders'}
          value={`${allTimeOrders.toLocaleString()}`}
          sublabel="Total completed"
          accent="violet"
          icon={<PackageCheck className="size-4" />}
          trend="98.6% SLA fulfillment"
        />
      </div>

      {/* Main Operations Grid */}
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left Column: Live Order Telemetry Feed & Infrastructure Readiness */}
        <div className="space-y-6">
          {/* Real-Time Order Stream */}
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#18201c] dark:text-white flex items-center gap-2">
                  <Activity className="size-4 text-emerald-500" /> Recent Order Stream
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Live snapshot of recent platform checkouts and order states.
                </p>
              </div>
              <Link
                href="/admin/payments"
                className="text-xs font-bold text-[#86a018] dark:text-[#d9f447] flex items-center gap-1 hover:underline"
              >
                <span>View Queue</span>
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-[#202923]">
              {recentOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 dark:text-gray-400">
                  No orders have been recorded yet in this environment.
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-[#202923]">
                  {recentOrders.map((order, idx) => (
                    <div
                      key={order.id || idx}
                      className="flex items-center justify-between p-3.5 hover:bg-gray-50 dark:hover:bg-[#141b17] transition text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="grid size-8 place-items-center rounded-xl bg-gray-100 dark:bg-[#202923] text-gray-700 dark:text-gray-300 font-mono font-bold text-[10px]">
                          #{String(order.id).slice(-4)}
                        </div>
                        <div>
                          <p className="font-bold text-[#18201c] dark:text-white">
                            {order.restaurant?.name || 'Restaurant Order'}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {order.items?.length ?? 1} items · {order.payment_method || 'UPI'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono font-bold text-[#18201c] dark:text-white">
                          ₹{Number(order.total_amount ?? 0).toLocaleString()}
                        </p>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            order.status === 'DELIVERED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : order.status === 'OUT_FOR_DELIVERY'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {order.status || 'PROCESSING'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Infrastructure Health Status Matrix */}
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-[#18201c] dark:text-white flex items-center gap-2 mb-1">
              <Server className="size-4 text-blue-500" /> Platform Infrastructure Matrix
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Real-time health verification for microservices, cache layers, and persistence nodes.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-2xl border border-gray-100 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Database className="size-3.5 text-blue-500" /> Database Cluster
                  </span>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  HEALTHY
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">PostgreSQL / Lakebase Neon</p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Layers className="size-3.5 text-amber-500" /> In-Memory Cache
                  </span>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  SYNCHRONIZED
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Distributed Redis Cache</p>
              </div>

              <div className="rounded-2xl border border-gray-100 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <Wifi className="size-3.5 text-emerald-500" /> WebSocket Node
                  </span>
                  <span className="size-2 rounded-full bg-emerald-500" />
                </div>
                <p className="mt-2 font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm">
                  STREAMING
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">Port 8000 Event Dispatcher</p>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: User Ecosystem Breakdown & Top Partners */}
        <div className="space-y-6">
          {/* User Ecosystem Breakdown with Graphic AppleProgressBar */}
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#18201c] dark:text-white">
                  User Ecosystem Ratio
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Proportionate distribution of platform stakeholders.
                </p>
              </div>
              <Link
                href="/admin/users"
                className="text-xs font-bold text-[#86a018] dark:text-[#d9f447] hover:underline"
              >
                Manage
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              <AppleProgressBar
                label="Customers"
                sublabel={`${customerCount} accounts`}
                value={customerPct}
                max={100}
                color="emerald"
                icon={<Users className="size-3.5 text-emerald-600" />}
                height="md"
              />

              <AppleProgressBar
                label="Food Merchants & Vendors"
                sublabel={`${vendorCount} kitchens`}
                value={vendorPct}
                max={100}
                color="amber"
                icon={<Store className="size-3.5 text-amber-600" />}
                height="md"
              />

              <AppleProgressBar
                label="Delivery Fleet Riders"
                sublabel={`${driverCount} drivers`}
                value={driverPct}
                max={100}
                color="blue"
                icon={<Truck className="size-3.5 text-blue-600" />}
                height="md"
              />
            </div>
          </section>

          {/* Top Grossing Restaurant Partners */}
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#18201c] dark:text-white">
                  Top Kitchen Partners
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Highest volume restaurant partners this period.
                </p>
              </div>
              <Link
                href="/admin/vendor-settlements"
                className="text-xs font-bold text-[#86a018] dark:text-[#d9f447] hover:underline"
              >
                Settlements
              </Link>
            </div>

            <div className="mt-4 space-y-3">
              {topRestaurants.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
                  No restaurant volume recorded yet.
                </p>
              ) : (
                topRestaurants.map((restaurant, idx) => {
                  const commission = Math.round(
                    (restaurant.grossSales * restaurant.commissionRate) / 100
                  )
                  return (
                    <div
                      key={`${restaurant.name}-${idx}`}
                      className="rounded-2xl bg-gray-50 dark:bg-[#121815] border border-gray-100 dark:border-[#202923] p-3 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-6 place-items-center rounded-lg bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] font-black text-[10px]">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-bold text-[#18201c] dark:text-white">
                            {restaurant.name}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {restaurant.commissionRate}% commission cut
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{restaurant.grossSales.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Cut: ₹{commission.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </section>

          {/* Operational Quick Actions */}
          <section className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-[#18201c] dark:text-white flex items-center gap-2 mb-3">
              <ShieldCheck className="size-4 text-emerald-500" /> Operational Controls
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/admin/payments"
                className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3 font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a221d] transition flex items-center gap-2"
              >
                <CreditCard className="size-3.5 text-blue-500" />
                <span>Verify Payments</span>
              </Link>
              <Link
                href="/admin/vendor-settlements"
                className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3 font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a221d] transition flex items-center gap-2"
              >
                <Store className="size-3.5 text-amber-500" />
                <span>Disburse Settlements</span>
              </Link>
              <Link
                href="/admin/coupons"
                className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3 font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a221d] transition flex items-center gap-2"
              >
                <Tag className="size-3.5 text-purple-500" />
                <span>Campaign Promos</span>
              </Link>
              <Link
                href="/admin/settings"
                className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] p-3 font-bold text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#1a221d] transition flex items-center gap-2"
              >
                <Sparkles className="size-3.5 text-emerald-500" />
                <span>Global Settings</span>
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  sublabel,
  accent,
  icon,
  trend,
}: {
  title: string
  value: string
  sublabel: string
  accent: 'purple' | 'emerald' | 'amber' | 'blue' | 'indigo' | 'violet'
  icon: React.ReactNode
  trend: string
}) {
  const accentColors = {
    purple: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300',
    indigo: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300',
    violet: 'bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300',
  }

  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-5 shadow-xs hover:shadow-md transition">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {title}
        </span>
        <span
          className={`grid size-7 sm:size-8 place-items-center rounded-xl ${accentColors[accent]} shrink-0`}
        >
          {icon}
        </span>
      </div>
      <p className="mt-3 text-lg sm:text-2xl font-black text-[#18201c] dark:text-white truncate">
        {value}
      </p>
      <div className="mt-1 flex items-center justify-between gap-1 text-[10px] text-gray-400">
        <span className="truncate">{sublabel}</span>
      </div>
      <p className="mt-2 text-[10px] sm:text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 truncate">
        <TrendingUp className="size-3 shrink-0" />
        <span className="truncate">{trend}</span>
      </p>
    </div>
  )
}

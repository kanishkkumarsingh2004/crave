'use client'

import {
  BarChart3,
  DollarSign,
  PieChart,
  ShoppingBag,
  Star,
  Store,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function AdminAnalyticsPage() {
  const [liveGrossRevenue, setLiveGrossRevenue] = useState(0)
  const [liveCompletedOrders, setLiveCompletedOrders] = useState(0)
  const [liveUserCount, setLiveUserCount] = useState(0)
  const [topVendors, setTopVendors] = useState<
    { name: string; revenue: number; orders: number; rating: number; model: string }[]
  >([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/stats', { cache: 'no-store' })
        const json = await res.json()
        if (json.success) {
          setLiveUserCount(json.stats.totalUsers ?? 0)
          setLiveGrossRevenue(json.stats.weeklyRevenue ?? 0)
          setLiveCompletedOrders(json.stats.orderCount ?? 0)
          if (json.restaurants && json.restaurants.length > 0) {
            setTopVendors(
              json.restaurants.slice(0, 4).map((restaurant: any, index: number) => ({
                name: restaurant.name ?? `Restaurant ${index + 1}`,
                revenue: Number(restaurant.gross_revenue ?? 0),
                orders: Number(restaurant.total_orders ?? 0),
                rating: Number(restaurant.rating ?? 0),
                model: restaurant.payment_model === 'markup' ? 'Price Markup' : 'Commission',
              }))
            )
          } else {
            setTopVendors([])
          }
        }
      } catch (error) {
        console.error('Failed to load analytics.', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [])

  const aov = liveCompletedOrders > 0 ? liveGrossRevenue / liveCompletedOrders : 0

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-8 shadow-sm text-center">
          <p className="text-sm text-gray-500">Loading analytics data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e2e7dd] dark:border-[#27342d] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#b5de28] dark:text-[#d9f447]">
            Executive intelligence
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Platform analytics
          </h2>
        </div>
        <div className="rounded-full border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-300">
          This month
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross revenue"
          value={`₹${liveGrossRevenue.toLocaleString('en-IN')}`}
          trend={liveGrossRevenue > 0 ? '+data' : 'No data yet'}
          icon={<DollarSign className="size-4" />}
        />
        <MetricCard
          title="Orders"
          value={liveCompletedOrders.toLocaleString()}
          trend={liveCompletedOrders > 0 ? '+data' : 'No data yet'}
          icon={<ShoppingBag className="size-4" />}
        />
        <MetricCard
          title="AOV"
          value={`₹${aov.toFixed(0)}`}
          trend={aov > 0 ? '+data' : 'No data yet'}
          icon={<BarChart3 className="size-4" />}
        />
        <MetricCard
          title="Users"
          value={liveUserCount.toLocaleString()}
          trend={liveUserCount > 0 ? '+data' : 'No data yet'}
          icon={<Users className="size-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c] dark:text-white">
            <TrendingUp className="size-5 text-[#b5de28] dark:text-[#d9f447]" /> Revenue trend
          </h3>

          <div className="mt-6 flex h-56 items-end gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[40px] rounded-t-2xl bg-gradient-to-t from-gray-200 to-gray-100 dark:from-[#202923] dark:to-[#d9f447]/40"
                  style={{ height: `${Math.max(5, (liveGrossRevenue / 800000) * 100)}%` }}
                />
                <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-500">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c] dark:text-white">
            <PieChart className="size-5 text-[#b5de28] dark:text-[#d9f447]" /> Category mix
          </h3>

          <div className="mt-6 space-y-4">
            {[
              { label: 'Data unavailable', percent: 100, color: 'bg-gray-300 dark:bg-gray-700' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                  <span>{item.label}</span>
                  <span>—</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-[#121815]">
                  <div className={`h-full w-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c] dark:text-white">
            <Store className="size-5 text-[#b5de28] dark:text-[#d9f447]" /> Top performing vendors
          </h3>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Live snapshot</span>
        </div>

        <div className="space-y-3">
          {topVendors.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No vendor data available yet</p>
          ) : (
            topVendors.map((vendor, index) => (
              <div
                key={vendor.name}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-200 dark:border-[#27342d] p-3 bg-[#f8f9f7]/50 sm:bg-white dark:bg-[#121815]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-8 sm:size-9 place-items-center rounded-xl bg-gray-100 dark:bg-[#1a221d] text-xs font-bold text-gray-700 dark:text-gray-300 shrink-0">
                    #{index + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white truncate">
                      {vendor.name}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 truncate">
                      {vendor.model}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 text-xs text-gray-600 dark:text-gray-300 border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100 dark:border-[#27342d]">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white">
                      ₹{vendor.revenue.toLocaleString('en-IN')}
                    </div>
                    <div className="text-[10px] text-gray-400">Revenue</div>
                  </div>
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#18201c] dark:text-white">
                      {vendor.orders}
                    </div>
                    <div className="text-[10px] text-gray-400">Orders</div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200 dark:border-amber-800 text-[11px]">
                    <Star className="size-3 fill-current" /> {vendor.rating.toFixed(1)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  trend,
  icon,
}: {
  title: string
  value: string
  trend: string
  icon: React.ReactNode
}) {
  const isPositive = trend.startsWith('+')
  return (
    <div className="rounded-2xl sm:rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 truncate">
          {title}
        </span>
        <span className="grid size-7 sm:size-9 place-items-center rounded-xl sm:rounded-2xl bg-[#f1f6d9] dark:bg-[#d9f447]/20 text-[#6a8014] dark:text-[#d9f447] shrink-0">
          {icon}
        </span>
      </div>
      <p className="mt-2 sm:mt-4 text-lg sm:text-2xl font-bold text-[#18201c] dark:text-white truncate">
        {value}
      </p>
      <div
        className={`mt-1 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs font-bold ${
          isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
        }`}
      >
        <TrendingUp className="size-3.5" /> {trend}
      </div>
    </div>
  )
}

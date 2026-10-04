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
        const res = await fetch('/api/admin/stats')
        const json = await res.json()
        if (json.success) {
          setLiveUserCount(json.stats.totalUsers ?? 0)
          setLiveGrossRevenue(json.stats.weeklyRevenue ?? 0)
          setLiveCompletedOrders(json.stats.orderCount ?? 0)
          if (json.restaurants) {
            setTopVendors(
              json.restaurants.slice(0, 4).map((restaurant: any, index: number) => ({
                name: restaurant.name ?? `Restaurant ${index + 1}`,
                revenue: Number(restaurant.gross_revenue ?? 0),
                orders: Number(restaurant.total_orders ?? 0),
                rating: Number(restaurant.rating ?? 0),
                model: restaurant.payment_model === 'markup' ? 'Price Markup' : 'Commission',
              }))
            )
          }
        }
      } catch (error) {
        console.error('Failed to load analytics.', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
    const interval = setInterval(loadAnalytics, 30000)
    return () => clearInterval(interval)
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
      <div className="flex items-center justify-between border-b border-[#e2e7dd] pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">
            Executive intelligence
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">Platform analytics</h2>
        </div>
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-700">
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
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c]">
            <TrendingUp className="size-5 text-[#859d19]" /> Revenue trend
          </h3>

          <div className="mt-6 flex h-56 items-end gap-3">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full max-w-[40px] rounded-t-2xl bg-gradient-to-t from-gray-200 to-gray-100"
                  style={{ height: `${Math.max(5, (liveGrossRevenue / 800000) * 100)}%` }}
                />
                <span className="text-[10px] font-bold uppercase text-gray-400">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'][index]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c]">
            <PieChart className="size-5 text-[#859d19]" /> Category mix
          </h3>

          <div className="mt-6 space-y-4">
            {[{ label: 'Data unavailable', percent: 100, color: 'bg-gray-300' }].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>{item.label}</span>
                  <span>—</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div className={`h-full w-full rounded-full ${item.color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between border-b border-[#f0f3ec] pb-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c]">
            <Store className="size-5 text-[#859d19]" /> Top performing vendors
          </h3>
          <span className="text-xs font-bold text-gray-500">Live snapshot</span>
        </div>

        <div className="space-y-3">
          {topVendors.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No vendor data available yet</p>
          ) : (
            topVendors.map((vendor, index) => (
              <div
                key={vendor.name}
                className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 place-items-center rounded-full bg-gray-100 text-xs font-bold text-gray-700">
                    #{index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-[#18201c]">{vendor.name}</p>
                    <p className="text-[11px] text-gray-500">{vendor.model}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-600">
                  <div>
                    <div className="font-bold text-[#18201c]">
                      ₹{vendor.revenue.toLocaleString('en-IN')}
                    </div>
                    <div>Revenue</div>
                  </div>
                  <div>
                    <div className="font-bold text-[#18201c]">{vendor.orders}</div>
                    <div>Orders</div>
                  </div>
                  <div className="flex items-center gap-1 font-bold text-amber-600">
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
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
          {title}
        </span>
        <span className="grid size-9 place-items-center rounded-2xl bg-[#f1f6d9] text-[#6a8014]">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-2xl font-bold text-[#18201c]">{value}</p>
      <div
        className={`mt-2 flex items-center gap-1 text-xs font-bold ${
          isPositive ? 'text-emerald-600' : 'text-gray-400'
        }`}
      >
        <TrendingUp className="size-3.5" /> {trend}
      </div>
    </div>
  )
}

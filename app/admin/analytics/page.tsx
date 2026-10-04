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

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const res = await fetch('/api/admin/stats')
        const json = await res.json()
        if (json.success) {
          setLiveUserCount(json.stats.totalUsers ?? 0)
          setLiveGrossRevenue(json.stats.weeklyGross ?? 0)
          setLiveCompletedOrders(json.stats.completedOrders || 1280)
          if (json.restaurants) {
            setTopVendors(
              json.restaurants.slice(0, 4).map((restaurant: any, index: number) => ({
                name: restaurant.name ?? `Restaurant ${index + 1}`,
                revenue: Number(restaurant.gross_sales ?? 200000 + index * 10000),
                orders: Number(restaurant.orders ?? 280 + index * 35),
                rating: Number(restaurant.rating ?? 4.8),
                model: restaurant.payment_model === 'markup' ? 'Price Markup' : 'Commission',
              }))
            )
          }
        }
      } catch (error) {
        console.error('Failed to load analytics.', error)
      }
    }

    loadAnalytics()
  }, [])

  const aov = liveCompletedOrders > 0 ? liveGrossRevenue / liveCompletedOrders : 0

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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Gross revenue"
          value={`₹${liveGrossRevenue.toLocaleString()}`}
          trend="+18.4%"
          icon={<DollarSign className="size-4" />}
        />
        <MetricCard
          title="Orders"
          value={liveCompletedOrders.toLocaleString()}
          trend="+12.1%"
          icon={<ShoppingBag className="size-4" />}
        />
        <MetricCard
          title="AOV"
          value={`₹${aov.toFixed(0)}`}
          trend="+4.2%"
          icon={<BarChart3 className="size-4" />}
        />
        <MetricCard
          title="Users"
          value={liveUserCount.toLocaleString()}
          trend="+8.5%"
          icon={<Users className="size-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-bold text-[#18201c]">
            <TrendingUp className="size-5 text-[#859d19]" /> Revenue trend
          </h3>

          <div className="mt-6 flex h-56 items-end gap-3">
            {[42, 58, 60, 74, 88, 96, 80, 102].map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-2xl bg-gradient-to-t from-[#d9f447] to-[#8aa4c3]"
                  style={{ height: `${value}%` }}
                />
                <span className="text-[10px] font-bold uppercase text-gray-500">
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
            {[
              { label: 'Healthy bowls', percent: 38, color: 'bg-emerald-500' },
              { label: 'Snacks & sides', percent: 24, color: 'bg-yellow-400' },
              { label: 'Desserts', percent: 18, color: 'bg-purple-500' },
              { label: 'Beverages', percent: 20, color: 'bg-blue-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>{item.label}</span>
                  <span>{item.percent}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${item.color}`}
                    style={{ width: `${item.percent}%` }}
                  />
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
          {topVendors.map((vendor, index) => (
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
                  <div className="font-bold text-[#18201c]">₹{vendor.revenue.toLocaleString()}</div>
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
          ))}
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
      <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
        <TrendingUp className="size-3.5" /> {trend}
      </div>
    </div>
  )
}

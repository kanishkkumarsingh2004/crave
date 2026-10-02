'use client'

import React, { useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Award,
  Clock,
  ArrowUpRight,
  Calendar,
  Filter,
  PieChart,
  Store,
  Zap,
  Sparkles,
  ChevronDown
} from 'lucide-react'

export default function AdminAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'quarter' | 'year'>('month')

  const monthlyRevenueData = [
    { month: 'Jan', revenue: 9.2, orders: 18400 },
    { month: 'Feb', revenue: 10.1, orders: 20200 },
    { month: 'Mar', revenue: 11.5, orders: 23000 },
    { month: 'Apr', revenue: 10.8, orders: 21600 },
    { month: 'May', revenue: 12.4, orders: 24800 },
    { month: 'Jun', revenue: 13.1, orders: 26200 },
    { month: 'Jul', revenue: 12.8, orders: 25600 },
    { month: 'Aug', revenue: 13.9, orders: 27800 },
    { month: 'Sep', revenue: 14.2, orders: 28400 },
    { month: 'Oct', revenue: 14.8, orders: 32450 },
  ]

  const maxRevenue = Math.max(...monthlyRevenueData.map((d) => d.revenue))

  const topVendors = [
    { name: 'The Green Table', revenue: '₹2,45,000', orders: '1,420', rating: '4.9 ★', model: '15% Commission' },
    { name: 'Momo House & Asian Grill', revenue: '₹1,98,400', orders: '1,280', rating: '4.8 ★', model: 'Price Markup' },
    { name: 'Spice Route Bistro', revenue: '₹1,76,200', orders: '940', rating: '4.7 ★', model: '15% Commission' },
    { name: 'Biryani Blues Express', revenue: '₹1,54,000', orders: '1,150', rating: '4.8 ★', model: '12% Commission' },
    { name: 'Urban Juice & Bowl Co.', revenue: '₹1,22,800', orders: '890', rating: '4.9 ★', model: '15% Commission' },
  ]

  const categoryBreakdown = [
    { name: 'Biryani & Rice Bowls', percentage: 35, revenue: '₹5,19,000', color: 'bg-[#d9f447]' },
    { name: 'Healthy Salads & Bowls', percentage: 22, revenue: '₹3,26,200', color: 'bg-emerald-500' },
    { name: 'Momos & Asian Street Food', percentage: 18, revenue: '₹2,66,900', color: 'bg-amber-500' },
    { name: 'Desserts & Smoothies', percentage: 15, revenue: '₹2,22,400', color: 'bg-purple-500' },
    { name: 'Fast Food & Burgers', percentage: 10, revenue: '₹1,48,400', color: 'bg-blue-500' },
  ]

  const hourlyDistribution = [
    { label: 'Breakfast (7 AM - 11 AM)', percent: 15, count: '4,860 orders', color: 'bg-amber-400' },
    { label: 'Lunch Rush (12 PM - 3 PM)', percent: 42, count: '13,629 orders', color: 'bg-emerald-500' },
    { label: 'Evening Snacks (4 PM - 7 PM)', percent: 18, count: '5,841 orders', color: 'bg-blue-500' },
    { label: 'Dinner & Late Night (8 PM - 12 AM)', percent: 25, count: '8,120 orders', color: 'bg-purple-500' },
  ]

  return (
    <div className="flex flex-col gap-8 max-w-6xl pb-16">
      {/* Top Banner & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e7dd] pb-5 gap-4">
        <div>
          <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014]">
            Executive Intelligence
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">
            Platform Analytics & Financial Insights
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76]">
            Real-time revenue growth, order distribution, category performance, and kitchen partner metrics.
          </p>
        </div>

        {/* Time Range Pills */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-gray-200 p-1.5 shadow-sm text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'This Week' },
            { id: 'month', label: 'This Month' },
            { id: 'quarter', label: 'Quarter' },
            { id: 'year', label: 'YTD' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTimeRange(t.id as any)}
              className={`rounded-xl px-3 py-1.5 font-bold transition ${
                timeRange === t.id
                  ? 'bg-[#18201c] text-white shadow-sm'
                  : 'text-gray-600 hover:text-[#18201c]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Gross Platform Revenue</span>
            <span className="grid size-9 place-items-center rounded-2xl bg-[#f1f6d9] text-[#6a8014]">
              <DollarSign className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#18201c]">₹14,82,900</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp className="size-3.5" /> +18.4% <span className="text-gray-400 font-normal">vs last month</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Completed Orders</span>
            <span className="grid size-9 place-items-center rounded-2xl bg-blue-50 text-blue-700">
              <ShoppingBag className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#18201c]">32,450</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp className="size-3.5" /> +12.1% <span className="text-gray-400 font-normal">vs last month</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Average Order Value (AOV)</span>
            <span className="grid size-9 place-items-center rounded-2xl bg-purple-50 text-purple-700">
              <Sparkles className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#18201c]">₹456.80</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp className="size-3.5" /> +4.2% <span className="text-gray-400 font-normal">higher basket value</span>
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Active Platform Users</span>
            <span className="grid size-9 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <Users className="size-5" />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-[#18201c]">12,480</p>
          <div className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600">
            <TrendingUp className="size-3.5" /> +8.5% <span className="text-gray-400 font-normal">new registrations</span>
          </div>
        </div>
      </div>

      {/* Main Bar Chart Section: Revenue & Order Volume Trend */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f0f3ec] pb-4 gap-2">
          <div>
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <BarChart3 className="size-5 text-[#859d19]" /> Monthly Revenue & Order Growth Trend (Lakhs INR)
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Gross sales trajectory across 2026 calendar months. Peak revenue recorded in October.
            </p>
          </div>
          <span className="text-xs font-bold text-[#6a8014] bg-[#f1f6d9] px-3 py-1 rounded-full self-start sm:self-auto">
            Peak: ₹14.8L (Oct)
          </span>
        </div>

        {/* Visual Bar Chart */}
        <div className="mt-8 flex h-64 items-end justify-between gap-3 pt-6 pb-2 px-2">
          {monthlyRevenueData.map((d) => {
            const heightPercent = Math.round((d.revenue / maxRevenue) * 100)
            const isHighest = d.revenue === maxRevenue

            return (
              <div key={d.month} className="flex flex-1 flex-col items-center gap-2 h-full justify-end group">
                <div className="text-[10px] font-bold text-gray-500 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                  ₹{d.revenue}L
                </div>
                <div className="w-full max-w-[48px] rounded-2xl bg-gray-100 p-1 flex items-end h-full">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full rounded-xl transition-all duration-500 ${
                      isHighest
                        ? 'bg-[#d9f447] shadow-[0_4px_16px_rgba(217,244,71,0.5)] border border-[#b5d326]'
                        : 'bg-[#18201c] group-hover:bg-[#323d36]'
                    }`}
                  />
                </div>
                <span className="text-xs font-bold text-[#18201c]">{d.month}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Grid Row 2: Category Breakdown & Peak Hour Distribution */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Share Breakdown */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2 border-b border-[#f0f3ec] pb-4">
            <PieChart className="size-5 text-[#859d19]" /> Cuisine & Category Revenue Share
          </h3>
          <div className="mt-5 space-y-4">
            {categoryBreakdown.map((cat) => (
              <div key={cat.name} className="text-xs">
                <div className="flex justify-between font-bold mb-1.5">
                  <span className="text-[#18201c]">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{cat.revenue}</span>
                    <span className="font-bold text-[#18201c] bg-gray-100 px-2 py-0.5 rounded-full">
                      {cat.percentage}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${cat.color}`} style={{ width: `${cat.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Peak Rush Hours Distribution */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2 border-b border-[#f0f3ec] pb-4">
            <Clock className="size-5 text-[#859d19]" /> Order Time Window Distribution
          </h3>
          <div className="mt-5 space-y-4">
            {hourlyDistribution.map((h) => (
              <div key={h.label} className="text-xs">
                <div className="flex justify-between font-bold mb-1.5">
                  <span className="text-[#18201c]">{h.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{h.count}</span>
                    <span className="font-bold text-[#18201c] bg-gray-100 px-2 py-0.5 rounded-full">
                      {h.percent}%
                    </span>
                  </div>
                </div>
                <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
                  <div className={`h-full ${h.color}`} style={{ width: `${h.percent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Row 3: Top Kitchen Vendors */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
          <div>
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <Store className="size-5 text-[#859d19]" /> Top Performing Kitchen Partners
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Highest revenue generating restaurant partners on the platform.
            </p>
          </div>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="flex flex-col gap-3 mt-4 block md:hidden">
          {topVendors.map((v, idx) => (
            <div key={v.name} className="rounded-2xl border border-gray-200 p-4 bg-white flex flex-col gap-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#18201c] flex items-center gap-1.5">
                  <span className="grid size-5 place-items-center rounded-full bg-gray-100 font-mono text-[10px] text-gray-700">
                    #{idx + 1}
                  </span>
                  {v.name}
                </span>
                <span className="font-extrabold text-amber-600 text-xs">★ {v.rating}</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Revenue</span>
                  <span className="font-bold text-emerald-700">{v.revenue}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Orders</span>
                  <span className="font-semibold text-gray-700 font-mono">{v.orders}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">Model</span>
                  <span className="font-medium text-gray-600">{v.model}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Rank / Partner Kitchen</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Gross Sales</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Completed Orders</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Rating</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Partner Model</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {topVendors.map((v, idx) => (
                <tr key={v.name} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3.5 font-bold text-[#18201c] whitespace-nowrap">
                    <span className="inline-block size-5 rounded-full bg-gray-100 text-center font-mono text-[11px] leading-5 mr-2">
                      #{idx + 1}
                    </span>
                    {v.name}
                  </td>
                  <td className="px-4 py-3.5 font-bold text-[#18201c] whitespace-nowrap">{v.revenue}</td>
                  <td className="px-4 py-3.5 text-gray-600 font-mono whitespace-nowrap">{v.orders}</td>
                  <td className="px-4 py-3.5 font-bold text-amber-600 whitespace-nowrap">{v.rating}</td>
                  <td className="px-4 py-3.5 text-right font-medium text-gray-500 whitespace-nowrap">{v.model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

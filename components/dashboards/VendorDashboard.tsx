'use client'

import { ArrowUpRight, Bell, ChartColumn, ChefHat, Clock3, PackageCheck, ShoppingBag, Star, TrendingUp } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function VendorDashboard() {
  const { user } = useAuth()

  const orderStats = [
    { label: 'Open orders', value: '18', tone: 'amber' },
    { label: 'Ready for pickup', value: '6', tone: 'green' },
    { label: 'Conversion', value: '24.8%', tone: 'blue' },
    { label: 'Avg rating', value: '4.8', tone: 'purple' },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">Kitchen console</p>
            <h2 className="mt-2 text-2xl font-bold text-[#18201c]">Welcome back, {user?.name ?? 'Chef'}</h2>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-4 py-2 text-xs font-bold text-white">
            Schedule promo <ArrowUpRight className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {orderStats.map((item) => (
          <div key={item.label} className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.label}</span>
              <div className={`grid size-9 place-items-center rounded-2xl ${
                item.tone === 'amber' ? 'bg-amber-50 text-amber-800' :
                item.tone === 'green' ? 'bg-emerald-50 text-emerald-800' :
                item.tone === 'blue' ? 'bg-blue-50 text-blue-800' : 'bg-purple-50 text-purple-800'
              }`}>
                {item.tone === 'amber' ? <ShoppingBag className="size-4" /> :
                 item.tone === 'green' ? <PackageCheck className="size-4" /> :
                 item.tone === 'blue' ? <ChartColumn className="size-4" /> : <Star className="size-4" />}
              </div>
            </div>
            <p className="mt-4 text-2xl font-bold text-[#18201c]">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="text-lg font-bold text-[#18201c]">Current kitchen queue</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">8 minutes avg</span>
          </div>

          <div className="mt-4 space-y-3">
            {[
              { name: 'Wild Mushroom Bowl', time: '12:40 PM', status: 'Cooking' },
              { name: 'Crispy Tofu Wrap', time: '12:55 PM', status: 'Queued' },
              { name: 'Protein Power Salad', time: '1:10 PM', status: 'Ready' },
            ].map((order) => (
              <div key={order.name} className="flex items-center justify-between rounded-2xl border border-gray-200 p-3">
                <div>
                  <div className="font-bold text-[#18201c]">{order.name}</div>
                  <div className="text-[11px] text-gray-500">{order.time}</div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                  order.status === 'Ready' ? 'bg-emerald-100 text-emerald-800' :
                  order.status === 'Cooking' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700'
                }`}>
                  {order.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#18201c]">Performance</h3>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[#f7f8f3] p-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Daily sales</span>
                <span>₹16,480</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-[78%] rounded-full bg-[#d9f447]" />
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f8f3] p-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>On-time prep</span>
                <span>94%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-[94%] rounded-full bg-emerald-500" />
              </div>
            </div>

            <div className="rounded-2xl bg-[#f7f8f3] p-3">
              <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                <span>Repeat customer rate</span>
                <span>61%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
                <div className="h-full w-[61%] rounded-full bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
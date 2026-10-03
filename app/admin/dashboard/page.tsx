'use client'

import { ArrowUpRight, DollarSign, Percent, Store, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'

export default function AdminOverviewPage() {
  const pendingPayments = [
    {
      id: 'pay_1',
      orderId: '#CRV-9021',
      customerUpi: 'alex@upi',
      utrRef: '428190021389',
      amount: 867,
    },
  ]

  const topRestaurantsFinancials = [
    { name: 'The Green Table', grossSales: 148200, commissionRate: 15 },
    { name: 'Momo House & Asian Grill', grossSales: 194500, commissionRate: 15 },
    { name: 'Casa Napoli Pizza', grossSales: 215000, commissionRate: 12 },
  ]

  return (
    <div className="flex flex-col gap-6">
      {/* Metric Cards - Optimized for Mobile Grid & Scaling */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
              Weekly Gross
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-purple-100 text-purple-800">
              <DollarSign className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-[#18201c]">
            ₹6,44,100
          </p>
          <p className="mt-1 text-[10px] sm:text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="size-3 sm:size-3.5" /> +24% growth
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
              Our Commission
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-800">
              <Percent className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-700">
            ₹94,205
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77]">Net revenue cut</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
              Net Vendor Pay
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-amber-100 text-amber-800">
              <Store className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-amber-700">
            ₹5,49,895
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77]">Total disbursement</p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] bg-white p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77]">
              Delivery Fleet
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-blue-100 text-blue-800">
              <Zap className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-blue-700">
            185 Active
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77]">94% Fleet</p>
        </div>
      </div>

      {/* Top Restaurants Revenue & Settlement Summary Table */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
          <div>
            <h3 className="font-bold text-lg text-[#18201c]">
              Top Restaurant Revenue & Settlement Overview
            </h3>
            <p className="text-xs text-[#737e77]">
              Weekly gross sales, platform commission cut, and net vendor settlement amounts.
            </p>
          </div>
          <Link
            href="/admin/vendor-settlements"
            className="flex items-center gap-1 text-xs font-bold text-[#86a018] hover:underline"
          >
            Open Full Settlements Playground <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* Mobile Cards (< md) */}
        <div className="flex flex-col gap-3 mt-4 block md:hidden">
          {topRestaurantsFinancials.map((r, idx) => {
            const commissionCut = (r.grossSales * r.commissionRate) / 100
            const vendorNet = r.grossSales - commissionCut
            return (
              <div
                key={idx}
                className="rounded-2xl border border-gray-200 p-4 bg-white flex flex-col gap-2.5 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#18201c]">{r.name}</h4>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                    {r.commissionRate}% Cut
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-gray-100 pt-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Weekly Gross
                    </span>
                    <span className="font-bold text-[#18201c]">
                      ₹{r.grossSales.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Our Commission
                    </span>
                    <span className="font-bold text-emerald-700">
                      ₹{commissionCut.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-dashed border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Net Vendor Pay
                    </span>
                    <span className="font-extrabold text-blue-700">
                      ₹{vendorNet.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="pt-1 text-right">
                  <Link
                    href="/admin/vendor-settlements"
                    className="inline-block rounded-full border border-gray-300 px-3 py-1 text-xs font-bold text-gray-700 hover:bg-gray-100"
                  >
                    Manage & Alter
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop Table (>= md) */}
        <div className="mt-4 hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-gray-200 bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Restaurant Name</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Weekly Gross Sales</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Platform Cut (%)</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Our Commission Cut (₹)</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Net Vendor Settlement (₹)</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {topRestaurantsFinancials.map((r, idx) => {
                const commissionCut = (r.grossSales * r.commissionRate) / 100
                const vendorNet = r.grossSales - commissionCut
                return (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3.5 font-bold text-[#18201c] text-sm whitespace-nowrap">
                      {r.name}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-[#18201c] whitespace-nowrap">
                      ₹{r.grossSales.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                        {r.commissionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-emerald-700 whitespace-nowrap">
                      ₹{commissionCut.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-blue-700 whitespace-nowrap">
                      ₹{vendorNet.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <Link
                        href="/admin/vendor-settlements"
                        className="rounded-full border border-gray-300 px-3 py-1 text-[11px] font-bold text-gray-700 hover:bg-gray-100"
                      >
                        Manage & Alter
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
            <h3 className="font-bold text-base text-[#18201c]">Pending Verification Queue</h3>
            <Link
              href="/admin/payments"
              className="text-xs font-bold text-[#86a018] hover:underline flex items-center gap-1"
            >
              View All <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {pendingPayments.map((pay) => (
              <div
                key={pay.id}
                className="flex items-center justify-between rounded-2xl bg-[#f8f9f6] p-3 text-xs"
              >
                <div>
                  <p className="font-bold text-[#18201c]">
                    {pay.orderId} · UTR: {pay.utrRef}
                  </p>
                  <p className="text-[11px] text-gray-500">Customer VPA: {pay.customerUpi}</p>
                </div>
                <span className="font-bold text-sm text-[#18201c]">₹{pay.amount}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#f0f3ec] pb-4">
            <h3 className="font-bold text-base text-[#18201c]">Role Distribution breakdown</h3>
            <Link
              href="/admin/users"
              className="text-xs font-bold text-[#86a018] hover:underline flex items-center gap-1"
            >
              Manage Accounts <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Customers / End Users</span>
                <span>11,200 (89%)</span>
              </div>
              <div className="h-2 rounded-full bg-emerald-100 overflow-hidden">
                <div className="h-full bg-emerald-500 w-[89%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Kitchen Vendors</span>
                <span>340 (3%)</span>
              </div>
              <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full bg-amber-500 w-[3%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Delivery Drivers</span>
                <span>185 (2%)</span>
              </div>
              <div className="h-2 rounded-full bg-blue-100 overflow-hidden">
                <div className="h-full bg-blue-500 w-[2%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

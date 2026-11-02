'use client'

import { CreditCard, Search, Sliders } from 'lucide-react'
import { getVendorFinancials, type VendorFinancialRecord } from './settlement-types'

interface VendorSettlementsTableProps {
  vendors: VendorFinancialRecord[]
  searchQuery: string
  setSearchQuery: (q: string) => void
  statusFilter: 'all' | 'pending' | 'settled'
  setStatusFilter: (s: 'all' | 'pending' | 'settled') => void
  onOpenDisburse: (vendor: VendorFinancialRecord) => void
  onSelectVendor: (vendor: VendorFinancialRecord) => void
}

export default function VendorSettlementsTable({
  vendors,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onOpenDisburse,
  onSelectVendor,
}: VendorSettlementsTableProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#18201c] dark:text-white">
            Kitchen Vendor Financial Breakdown
          </h3>
          <p className="text-xs text-[#717c76] dark:text-gray-400">
            Select any restaurant to alter custom commission, set pricing, or disburse custom
            settlements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurant or owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#86a018]"
            />
          </div>

          <div className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-[#121815] p-1 text-xs font-bold">
            {(['all', 'pending', 'settled'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-full px-3 py-1 text-[11px] capitalize transition ${
                  statusFilter === st
                    ? 'bg-[#18201c] dark:bg-[#86a018] text-white dark:text-[#121815]'
                    : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile Vendor Cards (< md) */}
      <div className="flex flex-col gap-3.5 mt-6 block md:hidden">
        {vendors.map((v) => {
          const fin = getVendorFinancials(v)
          return (
            <div
              key={v.id}
              className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 bg-white dark:bg-[#18201c] flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-[#18201c] dark:text-white">{v.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {v.ownerName} · {v.phone}
                  </p>
                </div>
                <span
                  className={`text-xs font-bold uppercase ${
                    v.settlementStatus === 'settled'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {v.settlementStatus}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-y border-gray-100 dark:border-[#27342d] py-2.5 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Weekly Gross
                  </span>
                  <span className="font-bold text-[#18201c] dark:text-white text-sm">
                    ₹{v.weeklyGrossSales.toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block">
                    Commission Cut ({v.commissionRate}%)
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                    ₹{fin.commissionCut.toLocaleString()}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-dashed border-gray-100 dark:border-[#27342d] flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-gray-400">
                    {v.settlementStatus === 'settled' && v.disbursedAmount
                      ? 'Disbursed Payout'
                      : 'Net Payable'}
                  </span>
                  <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                    ₹
                    {v.settlementStatus === 'settled' && v.disbursedAmount
                      ? v.disbursedAmount.toLocaleString()
                      : fin.netPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 gap-2">
                <button
                  onClick={() => onOpenDisburse(v)}
                  className="rounded-full bg-[#d9f447] text-[#121815] px-3.5 py-1.5 text-xs font-black transition hover:bg-[#c8e434] flex items-center gap-1"
                >
                  <CreditCard className="size-3.5" /> Disburse Payout
                </button>
                <button
                  onClick={() => onSelectVendor(v)}
                  className="rounded-full bg-[#18201c] dark:bg-[#202b24] border border-[#27342d] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#323d36] flex items-center gap-1.5"
                >
                  <Sliders className="size-3.5 text-[#d9f447]" /> Alter &amp; Inspect
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop & Tablet Table (>= md) */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#27342d]">
        <table className="w-full text-left text-xs min-w-[850px]">
          <thead className="border-b border-gray-200 dark:border-[#27342d] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="px-4 py-3.5 whitespace-nowrap">Restaurant & Owner</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Cuisine / Location</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Weekly Gross Sales</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Commission Cut (%)</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Our Platform Cut</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Net Vendor Settlement</th>
              <th className="px-4 py-3.5 whitespace-nowrap">Payout Status</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] bg-white dark:bg-[#18201c]">
            {vendors.map((v) => {
              const fin = getVendorFinancials(v)
              return (
                <tr
                  key={v.id}
                  className="hover:bg-gray-50/60 dark:hover:bg-[#202923]/60 transition"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-bold text-[#18201c] dark:text-white text-sm">{v.name}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {v.ownerName} ({v.phone})
                    </p>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-700 dark:text-gray-300">{v.cuisine}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{v.address}</p>
                  </td>
                  <td className="px-4 py-4 font-bold text-base text-[#18201c] dark:text-white whitespace-nowrap">
                    ₹{v.weeklyGrossSales.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {v.commissionRate}%
                    </span>
                  </td>
                  <td className="px-4 py-4 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    ₹{fin.commissionCut.toLocaleString()}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <p className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                      ₹
                      {v.settlementStatus === 'settled' && v.disbursedAmount
                        ? v.disbursedAmount.toLocaleString()
                        : fin.netPayable.toLocaleString()}
                    </p>
                    {v.settlementStatus === 'settled' &&
                      v.disbursedAmount &&
                      v.disbursedAmount !== fin.netPayable && (
                        <p className="text-[10px] text-amber-500 font-semibold">Custom Disbursed</p>
                      )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span
                      className={`text-xs font-bold capitalize ${
                        v.settlementStatus === 'settled'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {v.settlementStatus}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onOpenDisburse(v)}
                        className="rounded-full bg-[#d9f447] text-[#121815] px-3 py-1.5 text-[11px] font-black transition hover:bg-[#c8e434] flex items-center gap-1 shadow-xs"
                      >
                        <CreditCard className="size-3" /> Disburse Payout
                      </button>
                      <button
                        onClick={() => onSelectVendor(v)}
                        className="rounded-full bg-[#18201c] dark:bg-[#202b24] border border-[#27342d] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#323d36] flex items-center gap-1"
                      >
                        <Sliders className="size-3 text-[#d9f447]" /> Alter &amp; Inspect
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

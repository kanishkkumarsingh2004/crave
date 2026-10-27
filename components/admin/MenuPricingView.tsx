'use client'

import { Trash2, Utensils } from 'lucide-react'
import { VendorStore } from './types'

interface MenuPricingViewProps {
  vendorsList: VendorStore[]
  onOpenMenuDrawer: (vendor: VendorStore) => void
  onDeleteVendor: (target: { id: string; name: string }) => void
}

export default function MenuPricingView({
  vendorsList,
  onOpenMenuDrawer,
  onDeleteVendor,
}: MenuPricingViewProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-white dark:bg-[#1c2620] p-5 shadow-sm dark:shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 dark:border-[#25332a] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-[#d9f447]">
              Master Catalog &amp; Pricing Controls
            </span>
            <h3 className="text-lg font-bold text-[#18201c] dark:text-white mt-0.5">
              Store Menu &amp; Price Alteration Controls
            </h3>
            <p className="text-xs text-gray-500 dark:text-[#9eb3a4] mt-0.5">
              Access any store menu, alter item prices, and configure bulk imports.
            </p>
          </div>
        </div>

        {/* Vendor Selector Grid */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vendorsList.map((vendor) => {
            const isXP = vendor.description?.toLowerCase().includes('xp')
            return (
              <div
                key={vendor.id}
                className="rounded-2xl border border-gray-200 dark:border-[#2d3b32] bg-gray-50/60 dark:bg-[#121815] p-4 shadow-sm dark:shadow-xl flex flex-col justify-between hover:border-gray-400 dark:hover:border-[#d9f447] transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40">
                      {isXP ? 'XP Store' : 'Restaurant'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                      {vendor.commissionRate}% Cut
                    </span>
                  </div>
                  <h4 className="font-bold text-base text-[#18201c] dark:text-white">{vendor.storeName}</h4>
                  <p className="text-xs text-gray-500 dark:text-[#9eb3a4] mt-0.5 truncate">
                    {vendor.address || 'Bengaluru, India'}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    onClick={() => onOpenMenuDrawer(vendor)}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] px-3 py-2 text-xs font-bold hover:bg-[#2e3a32] dark:hover:bg-[#cbe338] transition cursor-pointer"
                  >
                    <Utensils className="size-4" /> Menu &amp; Prices
                  </button>
                  <button
                    onClick={() => onDeleteVendor({ id: vendor.id, name: vendor.storeName })}
                    className="rounded-xl border border-rose-300 dark:border-rose-500/40 bg-rose-50 dark:bg-rose-500/20 p-2 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition shrink-0 cursor-pointer"
                    title="Delete Store"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            )
          })}

          {vendorsList.length === 0 && (
            <div className="col-span-full p-8 text-center text-xs text-gray-500 dark:text-[#9eb3a4] border border-dashed border-gray-300 dark:border-[#2d3b32] rounded-2xl bg-gray-50 dark:bg-[#121815]">
              No restaurant stores found in the database.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

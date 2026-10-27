'use client'

import React from 'react'
import { Percent } from 'lucide-react'
import { handleNumInput } from './types'

interface PlatformFeesSectionProps {
  platformFee: number | ''
  setPlatformFee: (val: number | '') => void
  handlingFee: number | ''
  setHandlingFee: (val: number | '') => void
  vendorCommission: number | ''
  setVendorCommission: (val: number | '') => void
  packagingCap: number | ''
  setPackagingCap: (val: number | '') => void
  gstRatePercent: number | ''
  setGstRatePercent: (val: number | '') => void
}

export function PlatformFeesSection({
  platformFee,
  setPlatformFee,
  handlingFee,
  setHandlingFee,
  vendorCommission,
  setVendorCommission,
  packagingCap,
  setPackagingCap,
  gstRatePercent,
  setGstRatePercent,
}: PlatformFeesSectionProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-[#86a018]/15 dark:bg-[#d9f447]/15 text-[#5e730f] dark:text-[#d9f447]">
          <Percent className="size-4" />
        </span>
        <div>
          <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
            Platform Service Fees &amp; Revenue Split
          </h2>
          <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
            Set baseline order convenience fees, kitchen commission, packaging limits, and GST rate.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
        {/* Platform Service Fee */}
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#18201c] dark:text-white">Platform Fee</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#86a018]/15 text-[#5e730f] dark:text-[#d9f447]">
                Per Order
              </span>
            </div>
            <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
              Flat convenience charge retained by platform
            </p>
          </div>
          <div className="mt-3 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={platformFee}
              onChange={(e) => setPlatformFee(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
            />
          </div>
        </div>

        {/* Handling Charge */}
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#18201c] dark:text-white">Handling Charge</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                Processing
              </span>
            </div>
            <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
              Gateway &amp; secure checkout handling fee
            </p>
          </div>
          <div className="mt-3 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={handlingFee}
              onChange={(e) => setHandlingFee(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
            />
          </div>
        </div>

        {/* Vendor Commission */}
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#18201c] dark:text-white">Vendor Cut</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Commission
              </span>
            </div>
            <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
              % cut from partner restaurant food subtotal
            </p>
          </div>
          <div className="mt-3 relative">
            <input
              type="number"
              value={vendorCommission}
              onChange={(e) => setVendorCommission(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-8 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              %
            </span>
          </div>
        </div>

        {/* Max Packaging Cap */}
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#18201c] dark:text-white">Packaging Cap</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-500/10 text-stone-600 dark:text-stone-400">
                Container
              </span>
            </div>
            <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
              Maximum container charge per order
            </p>
          </div>
          <div className="mt-3 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={packagingCap}
              onChange={(e) => setPackagingCap(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
            />
          </div>
        </div>

        {/* Default GST Rate */}
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#18201c] dark:text-white">Default GST Rate</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                Standard
              </span>
            </div>
            <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
              Restaurant services tax standard (5% / 18%)
            </p>
          </div>
          <div className="mt-3 relative">
            <input
              type="number"
              value={gstRatePercent}
              onChange={(e) => setGstRatePercent(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-8 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              %
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

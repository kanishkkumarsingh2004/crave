'use client'

import React from 'react'
import { Truck } from 'lucide-react'
import AppleSlider from '@/components/ui/AppleSlider'
import { getNum, handleNumInput } from './types'

interface DeliveryTariffSectionProps {
  baseDeliveryFee: number | ''
  setBaseDeliveryFee: (val: number | '') => void
  baseDistanceKm: number | ''
  setBaseDistanceKm: (val: number | '') => void
  perKmRate: number | ''
  setPerKmRate: (val: number | '') => void
  freeDeliveryThreshold: number | ''
  setFreeDeliveryThreshold: (val: number | '') => void
  driverPayoutShare: number
  setDriverPayoutShare: (val: number) => void
}

export function DeliveryTariffSection({
  baseDeliveryFee,
  setBaseDeliveryFee,
  baseDistanceKm,
  setBaseDistanceKm,
  perKmRate,
  setPerKmRate,
  freeDeliveryThreshold,
  setFreeDeliveryThreshold,
  driverPayoutShare,
  setDriverPayoutShare,
}: DeliveryTariffSectionProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Truck className="size-4" />
        </span>
        <div>
          <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
            Distance-Based Delivery Engine
          </h2>
          <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
            Distance fare structure, free delivery threshold, and driver payout allocation.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs">
        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
          <label className="font-bold text-[#18201c] dark:text-white block">
            Base Delivery Fee
          </label>
          <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
            Fixed charge for first {getNum(baseDistanceKm)} km
          </p>
          <div className="mt-2.5 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={baseDeliveryFee}
              onChange={(e) => setBaseDeliveryFee(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
          <label className="font-bold text-[#18201c] dark:text-white block">
            Base Distance Radius
          </label>
          <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
            Distance covered in base delivery fare
          </p>
          <div className="mt-2.5 relative">
            <input
              type="number"
              value={baseDistanceKm}
              onChange={(e) => setBaseDistanceKm(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-10 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#88968e]">
              km
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
          <label className="font-bold text-[#18201c] dark:text-white block">
            Per-KM Rate Beyond Base
          </label>
          <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
            Extra fee added per additional road km
          </p>
          <div className="mt-2.5 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={perKmRate}
              onChange={(e) => setPerKmRate(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-12 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#88968e]">
              /km
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
          <label className="font-bold text-[#18201c] dark:text-white block">
            Free Delivery Threshold
          </label>
          <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
            Qualifying order subtotal for free delivery
          </p>
          <div className="mt-2.5 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
              ₹
            </span>
            <input
              type="number"
              value={freeDeliveryThreshold}
              onChange={(e) => setFreeDeliveryThreshold(handleNumInput(e.target.value))}
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>
        </div>

        <div className="sm:col-span-2 pt-2">
          <AppleSlider
            label="Driver Delivery Fee Share"
            unit="%"
            value={driverPayoutShare}
            min={50}
            max={100}
            step={5}
            onChange={setDriverPayoutShare}
            iconVariant="percent"
            accentColor="emerald"
            minLabel="50% (Standard)"
            maxLabel="100% (Full)"
          />
          <p className="mt-2 text-[11px] text-[#717f77] dark:text-[#88968e]">
            Couriers receive {driverPayoutShare}% of delivery fee + 100% of customer tips directly.
            Platform retains {100 - driverPayoutShare}%.
          </p>
        </div>
      </div>
    </div>
  )
}

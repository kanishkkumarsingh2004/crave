'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import AppleSlider from '@/components/ui/AppleSlider'
import { getNum } from './types'

export interface PlaygroundCalculation {
  rawDelivery: number
  extraDistanceFee: number
  isFreeDelivery: boolean
  finalDeliveryFee: number
  surgeAddon: number
  totalDeliveryCharges: number
  handlingFee: number
  platformFee: number
  packagingFee: number
  gstAmount: number
  customerTotal: number
  vendorCommissionAmount: number
  vendorPayout: number
  driverPayout: number
  platformNetProfit: number
  platformMarginPct: number
}

interface PricingPlaygroundProps {
  testOrderValue: number
  setTestOrderValue: (val: number) => void
  testDistanceKm: number
  setTestDistanceKm: (val: number) => void
  baseDistanceKm: number | ''
  baseDeliveryFee: number | ''
  perKmRate: number | ''
  platformFee: number | ''
  handlingFee: number | ''
  vendorCommission: number | ''
  driverPayoutShare: number
  playgroundCalc: PlaygroundCalculation
}

export function PricingPlayground({
  testOrderValue,
  setTestOrderValue,
  testDistanceKm,
  setTestDistanceKm,
  baseDistanceKm,
  baseDeliveryFee,
  perKmRate,
  platformFee,
  handlingFee,
  vendorCommission,
  driverPayoutShare,
  playgroundCalc,
}: PricingPlaygroundProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-md">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6a8014] dark:text-[#d9f447]">
          <Sparkles className="size-3.5" /> Live Economics Engine
        </span>
        <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          100% Synced
        </span>
      </div>

      <h3 className="mt-2 text-xl font-black text-[#18201c] dark:text-white">
        Dynamic Pricing Playground
      </h3>
      <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
        Simulate an order to test live customer breakdown, kitchen payouts, and platform margin.
      </p>

      {/* Test Controls */}
      <div className="mt-5 flex flex-col gap-4 bg-[#f8f9f6] dark:bg-[#0e1310] p-4 rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] text-xs">
        <AppleSlider
          label="Simulated Food Subtotal"
          unit="₹"
          value={testOrderValue}
          min={100}
          max={1500}
          step={50}
          onChange={setTestOrderValue}
          iconVariant="currency"
          accentColor="lime"
          minLabel="₹100"
          maxLabel="₹1,500"
        />

        <AppleSlider
          label="Simulated Travel Distance"
          unit="km"
          value={testDistanceKm}
          min={1}
          max={15}
          step={0.5}
          onChange={setTestDistanceKm}
          iconVariant="distance"
          accentColor="blue"
          minLabel="1 km"
          maxLabel="15 km"
        />
      </div>

      {/* Customer Bill Breakdown Card */}
      <div className="mt-5 rounded-2xl bg-[#18201c] dark:bg-[#0c100e] p-5 text-white space-y-3 text-xs border border-transparent dark:border-[#222c26]">
        <div className="flex justify-between text-white/70">
          <span>Food Items Order Subtotal</span>
          <span className="font-extrabold text-white">₹{testOrderValue}</span>
        </div>

        {playgroundCalc.packagingFee > 0 && (
          <div className="flex justify-between text-white/70">
            <span>Packaging Charge</span>
            <span className="font-extrabold text-white">₹{playgroundCalc.packagingFee}</span>
          </div>
        )}

        <div className="flex justify-between text-white/70">
          <span>Base Delivery ({getNum(baseDistanceKm)} km)</span>
          <span className="font-extrabold text-white">₹{getNum(baseDeliveryFee)}</span>
        </div>

        {testDistanceKm > getNum(baseDistanceKm) && (
          <div className="flex justify-between text-white/70">
            <span>
              Extra Distance ({Math.ceil(testDistanceKm - getNum(baseDistanceKm))} km @ ₹
              {getNum(perKmRate)}/km)
            </span>
            <span className="font-extrabold text-white">+₹{playgroundCalc.extraDistanceFee}</span>
          </div>
        )}

        {playgroundCalc.isFreeDelivery && (
          <div className="flex justify-between text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
            <span>Free Delivery Threshold Met</span>
            <span>-₹{playgroundCalc.rawDelivery}</span>
          </div>
        )}

        {playgroundCalc.surgeAddon > 0 && (
          <div className="flex justify-between text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-1 rounded-lg">
            <span>Surge &amp; Weather Surcharges</span>
            <span>+₹{playgroundCalc.surgeAddon}</span>
          </div>
        )}

        <div className="flex justify-between text-white/70">
          <span>Platform Service Fee</span>
          <span className="font-extrabold text-white">₹{getNum(platformFee)}</span>
        </div>

        <div className="flex justify-between text-white/70">
          <span>Order Handling Charge</span>
          <span className="font-extrabold text-white">₹{getNum(handlingFee)}</span>
        </div>

        <div className="flex justify-between text-[#d9f447]/90 font-semibold">
          <div>
            <span>Taxes &amp; GST</span>
            <span className="block text-[10px] text-white/50 font-normal">
              (18% platform tax; restaurant GST in food)
            </span>
          </div>
          <span className="font-extrabold">₹{playgroundCalc.gstAmount}</span>
        </div>

        {/* Total To Pay */}
        <div className="pt-3.5 border-t border-white/15 flex justify-between items-baseline font-black text-lg text-[#d9f447]">
          <span>Customer Grand Total</span>
          <span>₹{playgroundCalc.customerTotal}</span>
        </div>

        {/* Visual Economics Payout Split */}
        <div className="mt-5 pt-4 border-t border-white/15 space-y-2.5 text-[11px]">
          <p className="font-black text-white/50 uppercase tracking-wider text-[9px]">
            Settlement &amp; Economics Allocation
          </p>

          {/* Progress bar visual */}
          <div className="h-2 w-full rounded-full bg-white/10 flex overflow-hidden">
            <div
              style={{
                width: `${Math.min(100, (playgroundCalc.vendorPayout / playgroundCalc.customerTotal) * 100)}%`,
              }}
              className="bg-amber-400 h-full"
              title="Vendor Payout"
            />
            <div
              style={{
                width: `${Math.min(100, (playgroundCalc.driverPayout / playgroundCalc.customerTotal) * 100)}%`,
              }}
              className="bg-blue-400 h-full"
              title="Driver Earnings"
            />
            <div
              style={{
                width: `${Math.min(100, (playgroundCalc.platformNetProfit / playgroundCalc.customerTotal) * 100)}%`,
              }}
              className="bg-emerald-400 h-full"
              title="Platform Net Profit"
            />
          </div>

          <div className="flex justify-between text-amber-300">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-400" />
              Kitchen Payout ({100 - getNum(vendorCommission)}%):
            </span>
            <span className="font-extrabold">₹{playgroundCalc.vendorPayout}</span>
          </div>
          <div className="flex justify-between text-blue-300">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-400" />
              Driver Earnings ({driverPayoutShare}%):
            </span>
            <span className="font-extrabold">₹{playgroundCalc.driverPayout}</span>
          </div>
          <div className="flex justify-between text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-400" />
              Platform Net Margin ({playgroundCalc.platformMarginPct}%):
            </span>
            <span className="font-black text-emerald-400">₹{playgroundCalc.platformNetProfit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

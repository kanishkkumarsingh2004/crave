'use client'

import React from 'react'
import { CloudRain, Flame, Zap } from 'lucide-react'
import AppleToggle from '@/components/ui/AppleToggle'
import { handleNumInput } from './types'

interface SurgeWeatherSectionProps {
  surgeMultiplier: number
  setSurgeMultiplier: (val: number) => void
  isRainModeActive: boolean
  setIsRainModeActive: (val: boolean) => void
  rainFee: number | ''
  setRainFee: (val: number | '') => void
  isNightSurgeActive: boolean
  setIsNightSurgeActive: (val: boolean) => void
  nightSurgeFee: number | ''
  setNightSurgeFee: (val: number | '') => void
}

export function SurgeWeatherSection({
  surgeMultiplier,
  setSurgeMultiplier,
  isRainModeActive,
  setIsRainModeActive,
  rainFee,
  setRainFee,
  isNightSurgeActive,
  setIsNightSurgeActive,
  nightSurgeFee,
  setNightSurgeFee,
}: SurgeWeatherSectionProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Zap className="size-4" />
        </span>
        <div>
          <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
            Dynamic Surge Pricing &amp; Weather Controls
          </h2>
          <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
            Manage rush hour surge multipliers and severe weather hazard bonuses.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 text-xs">
        {/* Surge Multiplier Cards */}
        <div>
          <label className="font-bold text-[#18201c] dark:text-white mb-2.5 block">
            Rush Demand Multiplier
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[
              { label: 'Normal', mult: '1.0x', val: 1.0 },
              { label: 'Peak Rush', mult: '1.25x', val: 1.25 },
              { label: 'High Demand', mult: '1.5x', val: 1.5 },
              { label: 'Extreme Surge', mult: '2.0x', val: 2.0 },
            ].map((s) => (
              <button
                key={s.val}
                type="button"
                onClick={() => setSurgeMultiplier(s.val)}
                className={`rounded-2xl border p-3 text-center transition-all ${
                  surgeMultiplier === s.val
                    ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/30 font-extrabold shadow-xs'
                    : 'border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#0e1310] text-[#4b5550] dark:text-[#97a59d] hover:bg-black/5 dark:hover:bg-white/5 font-semibold'
                }`}
              >
                <span className="block text-sm font-black">{s.mult}</span>
                <span className="block text-[10px] mt-0.5 opacity-80">{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Rain & Night Toggles */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                <CloudRain className="size-4 text-blue-600 dark:text-blue-400" /> Rain Weather Fee
              </span>
              <AppleToggle
                checked={isRainModeActive}
                onChange={setIsRainModeActive}
                iconVariant="rain"
                activeColor="bg-blue-600"
                ariaLabel="Rain surge mode"
              />
            </div>
            <div className="mt-3.5">
              <label className="text-[11px] font-bold text-blue-900/80 dark:text-blue-300">
                Rain Bonus Fee (₹)
              </label>
              <input
                type="number"
                value={rainFee}
                onChange={(e) => setRainFee(handleNumInput(e.target.value))}
                className="mt-1 w-full rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-[#101713] text-[#18201c] dark:text-white px-3 py-2 font-extrabold text-sm outline-none"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                <Flame className="size-4 text-purple-600 dark:text-purple-400" /> Late Night Rush
              </span>
              <AppleToggle
                checked={isNightSurgeActive}
                onChange={setIsNightSurgeActive}
                iconVariant="moon"
                activeColor="bg-purple-600"
                ariaLabel="Late night rush mode"
              />
            </div>
            <div className="mt-3.5">
              <label className="text-[11px] font-bold text-purple-900/80 dark:text-purple-300">
                Night Surge Fee (₹)
              </label>
              <input
                type="number"
                value={nightSurgeFee}
                onChange={(e) => setNightSurgeFee(handleNumInput(e.target.value))}
                className="mt-1 w-full rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-[#101713] text-[#18201c] dark:text-white px-3 py-2 font-extrabold text-sm outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

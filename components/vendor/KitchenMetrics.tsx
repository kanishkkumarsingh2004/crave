'use client'

import {
  CookingPot,
  DollarSign,
  Flame,
  PackageCheck,
  Sparkles,
  Star,
  Timer,
  Truck,
} from 'lucide-react'

interface KitchenMetricsProps {
  newCount: number
  prepCount: number
  readyCount: number
  totalDailyRevenue: number
  completionRate: number
  completedCount: number
  activeFilter: 'all' | 'new' | 'preparing' | 'ready'
  onFilterChange: (filter: 'all' | 'new' | 'preparing' | 'ready') => void
}

export default function KitchenMetrics({
  newCount,
  prepCount,
  readyCount,
  totalDailyRevenue,
  completionRate,
  completedCount,
  activeFilter,
  onFilterChange,
}: KitchenMetricsProps) {
  return (
    <div className="space-y-1.5 sm:space-y-3">
      {/* Row 1: Live Queue Metrics (4-Column Grid on Mobile) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
        {/* Card 1: New / Active */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'new' ? 'all' : 'new')}
          className={`rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
            activeFilter === 'new'
              ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/15 ring-2 ring-amber-500/30'
              : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 truncate">
              New
            </span>
            <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
              <Flame className="size-2.5 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
              {newCount}
            </span>
            <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
              To Accept
            </span>
          </div>
        </button>

        {/* Card 2: In Prep */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'preparing' ? 'all' : 'preparing')}
          className={`rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
            activeFilter === 'preparing'
              ? 'border-orange-500 bg-orange-500/10 dark:bg-orange-500/15 ring-2 ring-orange-500/30'
              : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] hover:border-orange-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400 truncate">
              Cooking
            </span>
            <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-orange-500/15 text-orange-600 dark:text-orange-400 shrink-0">
              <CookingPot className="size-2.5 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
              {prepCount}
            </span>
            <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
              In Kitchen
            </span>
          </div>
        </button>

        {/* Card 3: Ready */}
        <button
          type="button"
          onClick={() => onFilterChange(activeFilter === 'ready' ? 'all' : 'ready')}
          className={`rounded-2xl border p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs group cursor-pointer ${
            activeFilter === 'ready'
              ? 'border-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/15 ring-2 ring-emerald-500/30'
              : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 truncate">
              Ready
            </span>
            <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <PackageCheck className="size-2.5 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block">
              {readyCount}
            </span>
            <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
              For Pickup
            </span>
          </div>
        </button>

        {/* Card 4: Daily Sales Revenue */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-2 sm:p-3.5 text-left transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between gap-1 w-full">
            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 truncate">
              Sales
            </span>
            <div className="grid size-5 sm:size-7 place-items-center rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shrink-0">
              <DollarSign className="size-2.5 sm:size-3.5" />
            </div>
          </div>
          <div className="mt-1.5 sm:mt-2">
            <span className="text-base sm:text-2xl font-black text-[#121815] dark:text-white tracking-tight block truncate">
              ₹
              {totalDailyRevenue > 999
                ? `${(totalDailyRevenue / 1000).toFixed(1)}k`
                : totalDailyRevenue}
            </span>
            <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-gray-400 font-semibold truncate block">
              Today Total
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Performance Metrics (4-Column Grid on Mobile) */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-3 w-full min-w-0">
        {/* Card 5: Avg Prep Time */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617] p-2 sm:p-3 text-left flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
              Prep SLA
            </span>
            <Timer className="size-2.5 sm:size-3 text-stone-400 shrink-0" />
          </div>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
              18 mins
            </span>
            <span className="text-[7.5px] sm:text-[9px] text-emerald-600 dark:text-emerald-400 font-bold block truncate">
              Fast Kitchen
            </span>
          </div>
        </div>

        {/* Card 6: Fulfillment Rate */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617] p-2 sm:p-3 text-left flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
              Accuracy
            </span>
            <Sparkles className="size-2.5 sm:size-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          </div>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
              {completionRate}%
            </span>
            <span className="text-[7.5px] sm:text-[9px] text-stone-500 dark:text-gray-400 font-bold block truncate">
              Dispatched
            </span>
          </div>
        </div>

        {/* Card 7: Rider Dispatches */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617] p-2 sm:p-3 text-left flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
              Dispatched
            </span>
            <Truck className="size-2.5 sm:size-3 text-blue-500 shrink-0" />
          </div>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
              {completedCount}
            </span>
            <span className="text-[7.5px] sm:text-[9px] text-blue-600 dark:text-blue-400 font-bold block truncate">
              Courier Drops
            </span>
          </div>
        </div>

        {/* Card 8: Rating */}
        <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#161617] p-2 sm:p-3 text-left flex flex-col justify-between">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-gray-400 truncate">
              Rating
            </span>
            <Star className="size-2.5 sm:size-3 fill-amber-400 text-amber-400 shrink-0" />
          </div>
          <div className="mt-1">
            <span className="text-xs sm:text-sm font-black text-[#121815] dark:text-white block">
              4.8 ★
            </span>
            <span className="text-[7.5px] sm:text-[9px] text-stone-500 dark:text-gray-400 font-bold block truncate">
              Customer Score
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

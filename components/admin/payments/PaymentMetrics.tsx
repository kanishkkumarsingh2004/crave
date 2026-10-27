'use client'

import React from 'react'
import { ArrowUpRight, Coins, CreditCard, Percent, Zap } from 'lucide-react'
import { formatCurrency } from './types'

interface PaymentMetricsProps {
  metrics: {
    totalGross: number
    onlineVolume: number
    codVolume: number
    totalPlatformProfit: number
    successRate: string
    totalCount: number
  }
}

export function PaymentMetrics({ metrics }: PaymentMetricsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Metric 1: Total Captured Gross */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#717f77] dark:text-[#97a59d]">
            Total Captured Volume
          </span>
          <span className="grid size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Coins className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#18201c] dark:text-white tracking-tight">
            {formatCurrency(metrics.totalGross)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
          <ArrowUpRight className="size-3" /> 100% processed without manual delays
        </p>
      </div>

      {/* Metric 2: Gateway Success Rate */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#717f77] dark:text-[#97a59d]">
            Gateway Success Rate
          </span>
          <span className="grid size-9 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Zap className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#18201c] dark:text-white tracking-tight">
            {metrics.successRate}%
          </span>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
            Razorpay Active
          </span>
        </div>
        <p className="mt-1 text-[11px] text-[#717f77] dark:text-[#88968e]">
          {metrics.totalCount} orders tracked in ledger
        </p>
      </div>

      {/* Metric 3: Online vs COD Split */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#717f77] dark:text-[#97a59d]">
            Razorpay Online Volume
          </span>
          <span className="grid size-9 place-items-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <CreditCard className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#18201c] dark:text-white tracking-tight">
            {formatCurrency(metrics.onlineVolume)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-purple-600 dark:text-purple-400 font-bold">
          UPI, Debit/Credit Cards &amp; NetBanking
        </p>
      </div>

      {/* Metric 4: Platform Retained Margin */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#717f77] dark:text-[#97a59d]">
            Platform Net Retained
          </span>
          <span className="grid size-9 place-items-center rounded-xl bg-[#86a018]/15 dark:bg-[#d9f447]/15 text-[#5e730f] dark:text-[#d9f447]">
            <Percent className="size-4.5" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-2xl font-black text-[#18201c] dark:text-white tracking-tight">
            {formatCurrency(metrics.totalPlatformProfit)}
          </span>
        </div>
        <p className="mt-1 text-[11px] text-[#5e730f] dark:text-[#d9f447] font-bold">
          Platform fees, commission &amp; handling
        </p>
      </div>
    </div>
  )
}

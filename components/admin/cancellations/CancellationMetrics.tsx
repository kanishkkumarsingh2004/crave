'use client'

import React from 'react'
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react'
import { formatInr, Metrics } from './types'

interface CancellationMetricsProps {
  metrics: Metrics
}

export function CancellationMetrics({ metrics }: CancellationMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Total Cancelled
          </span>
          <div className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <XCircle className="size-4" />
          </div>
        </div>
        <p className="text-2xl font-black text-[#18201c] dark:text-white mt-2">
          {metrics.totalCancelledCount}
        </p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
          Audited cancellations in system
        </p>
      </div>

      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
            Pending Refund Review
          </span>
          <div className="grid size-8 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
            <Clock className="size-4" />
          </div>
        </div>
        <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-2">
          {formatInr(metrics.pendingRefundsRupees)}
        </p>
        <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1">
          {metrics.pendingRefundsCount} {metrics.pendingRefundsCount === 1 ? 'order' : 'orders'}{' '}
          waiting in queue
        </p>
      </div>

      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
            Refunds Disbursed
          </span>
          <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="size-4" />
          </div>
        </div>
        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
          {formatInr(metrics.approvedRefundsRupees)}
        </p>
        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-1">
          Approved &amp; reconciled in ledger
        </p>
      </div>

      <div className="rounded-2xl border border-[#dfe5db] dark:border-[#27342d] bg-white dark:bg-[#121815] p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            15s Rule Protection
          </span>
          <div className="grid size-8 place-items-center rounded-xl bg-[#d9f447]/20 text-[#718b0f] dark:text-[#d9f447]">
            <ShieldCheck className="size-4" />
          </div>
        </div>
        <p className="text-2xl font-black text-[#18201c] dark:text-white mt-2">Strict 15s Lock</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
          Zero vendor losses post kitchen prep
        </p>
      </div>
    </div>
  )
}

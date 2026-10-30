'use client'

import React from 'react'
import { Tag, CheckCircle2, TrendingUp, DollarSign } from 'lucide-react'
import { Coupon } from '@/lib/coupons'

interface CouponKpisProps {
  coupons: Coupon[]
}

export function CouponKpis({ coupons }: CouponKpisProps) {
  const activeCount = coupons.filter((c) => c.isActive).length
  const totalRedemptions = coupons.reduce((sum, c) => sum + c.usedCount, 0)
  const totalDiscountGiven = coupons.reduce(
    (sum, c) => sum + c.usedCount * (c.discountType === 'flat' ? c.discountValue : 85),
    0
  )

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total Promo Codes
          </p>
          <Tag className="size-4 text-purple-600 dark:text-purple-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-[#18201c] dark:text-white">{coupons.length}</p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {activeCount} currently active
        </p>
      </div>

      <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Active Coupons
          </p>
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-emerald-700 dark:text-emerald-400">
          {activeCount}
        </p>
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          Ready in Customer Checkout
        </p>
      </div>

      <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total Redemptions
          </p>
          <TrendingUp className="size-4 text-blue-600 dark:text-blue-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-blue-700 dark:text-blue-400">
          {totalRedemptions.toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Orders processed with discounts
        </p>
      </div>

      <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            Total Discount Savings
          </p>
          <DollarSign className="size-4 text-amber-600 dark:text-amber-400" />
        </div>
        <p className="mt-2 text-3xl font-bold text-amber-700 dark:text-amber-400">
          ₹{totalDiscountGiven.toLocaleString('en-IN')}
        </p>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Customer savings delivered</p>
      </div>
    </div>
  )
}

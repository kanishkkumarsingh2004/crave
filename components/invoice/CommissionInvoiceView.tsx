'use client'

import React from 'react'
import { Building2 } from 'lucide-react'

interface CommissionInvoiceViewProps {
  storeName: string
  orderId: string
  finalSubtotal: number
  vendorCommissionRate: number
  vendorCommissionAmount: number
  vendorNetPayout: number
}

export function CommissionInvoiceView({
  storeName,
  orderId,
  finalSubtotal,
  vendorCommissionRate,
  vendorCommissionAmount,
  vendorNetPayout,
}: CommissionInvoiceViewProps) {
  return (
    <div className="space-y-4 text-xs">
      <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 text-xs">
            <Building2 className="size-4 text-purple-600 dark:text-purple-400" /> Platform
            Commission &amp; Tax Settlement
          </span>
          <span className="font-mono text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300 px-2.5 py-0.5 rounded-md font-bold">
            SAC Code: 998311 (Platform Service)
          </span>
        </div>
        <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-1">
          Official statement of platform commission fee charged to <strong>{storeName}</strong> for
          Order #{orderId}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-[#121815] p-4 rounded-2xl border border-gray-200 dark:border-[#27342d]">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Gross Order Sales</span>
          <p className="font-extrabold text-base text-[#18201c] dark:text-white">
            ₹{finalSubtotal}
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            Contract Commission Rate
          </span>
          <p className="font-extrabold text-base text-purple-700 dark:text-purple-400">
            {vendorCommissionRate}% (ORDER_SUBTOTAL)
          </p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            Platform Service Commission
          </span>
          <p className="font-bold text-[#18201c] dark:text-white">₹{vendorCommissionAmount}</p>
        </div>

        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase">
            GST on Commission (18%)
          </span>
          <p className="font-bold text-emerald-700 dark:text-emerald-400">
            ₹{Math.ceil(vendorCommissionAmount * 0.18)}
          </p>
        </div>

        <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-[#27342d] flex justify-between items-center">
          <span className="font-bold text-[#18201c] dark:text-white">
            Total Vendor Deduction (Commission + GST)
          </span>
          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
            -₹{Math.ceil(vendorCommissionAmount * 1.18)}
          </span>
        </div>

        <div className="col-span-2 bg-emerald-100/70 dark:bg-emerald-950/60 p-3 rounded-xl flex justify-between items-center border border-emerald-300 dark:border-emerald-800">
          <div>
            <span className="font-bold text-emerald-950 dark:text-emerald-200 block text-xs">
              Net Bank Settlement Payout to Kitchen
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
              After deducting commission &amp; vendor discount share
            </span>
          </div>
          <span className="font-black text-emerald-900 dark:text-emerald-300 text-lg">
            ₹{vendorNetPayout}
          </span>
        </div>
      </div>
    </div>
  )
}

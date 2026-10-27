'use client'

import React from 'react'
import {
  Banknote,
  ChevronRight,
  Clock,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  Store,
  Wallet,
  Zap,
} from 'lucide-react'
import { formatCurrency, formatTimeAgo, TransactionRecord } from './types'

interface PaymentLedgerTableProps {
  loading: boolean
  transactions: TransactionRecord[]
  onSelectTx: (tx: TransactionRecord) => void
}

export function PaymentLedgerTable({
  loading,
  transactions,
  onSelectTx,
}: PaymentLedgerTableProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] shadow-xs overflow-hidden">
      {loading ? (
        <div className="py-20 text-center text-xs text-[#717f77] dark:text-[#97a59d] flex flex-col items-center gap-3">
          <RefreshCw className="size-6 animate-spin text-[#86a018] dark:text-[#d9f447]" />
          <span>Synchronizing live payment transactions ledger...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-20 text-center text-xs text-[#717f77] dark:text-[#97a59d] space-y-2">
          <CreditCard className="size-8 mx-auto text-[#88968e] opacity-40" />
          <p className="font-bold text-sm text-[#18201c] dark:text-white">
            No transactions match your search
          </p>
          <p className="text-[11px]">Try adjusting your search query or status filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[850px]">
            <thead>
              <tr className="border-b border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] text-[10px] font-black uppercase tracking-wider text-[#717f77] dark:text-[#88968e]">
                <th className="px-5 py-3.5">Order / Gateway ID</th>
                <th className="px-5 py-3.5">Customer &amp; Merchant</th>
                <th className="px-5 py-3.5">Channel / Gateway</th>
                <th className="px-5 py-3.5 text-right">Customer Bill</th>
                <th className="px-5 py-3.5 text-right">Settlement Split</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f3ed] dark:divide-[#1a231e]">
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  onClick={() => onSelectTx(tx)}
                  className="hover:bg-[#f8f9f6] dark:hover:bg-[#18211b] transition-colors cursor-pointer group"
                >
                  {/* Order & Date */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-mono font-extrabold text-[#18201c] dark:text-white group-hover:text-[#5e730f] dark:group-hover:text-[#d9f447] transition">
                        #{tx.orderId.slice(-8)}
                      </span>
                      <span className="text-[10px] text-[#717f77] dark:text-[#88968e] mt-0.5">
                        {formatTimeAgo(tx.createdAt)}
                      </span>
                    </div>
                  </td>

                  {/* Customer & Merchant */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-bold text-[#18201c] dark:text-white">
                        {tx.customerName}
                      </span>
                      <span className="text-[11px] text-[#717f77] dark:text-[#97a59d] flex items-center gap-1 mt-0.5">
                        <Store className="size-3 text-[#88968e]" />
                        {tx.restaurantName}
                      </span>
                    </div>
                  </td>

                  {/* Payment Channel */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {tx.paymentMethod === 'razorpay' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold text-[11px]">
                          <Zap className="size-3 text-blue-600 dark:text-blue-400" />
                          <span>Razorpay Online</span>
                        </div>
                      ) : tx.paymentMethod === 'cod' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-[11px]">
                          <Banknote className="size-3 text-amber-600 dark:text-amber-400" />
                          <span>Cash on Delivery</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold text-[11px]">
                          <Wallet className="size-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Direct UPI</span>
                        </div>
                      )}
                    </div>
                    {tx.gatewayPaymentId && (
                      <p className="font-mono text-[9px] text-[#88968e] mt-1 truncate max-w-[130px]">
                        {tx.gatewayPaymentId}
                      </p>
                    )}
                  </td>

                  {/* Total Amount */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <span className="font-black text-sm text-[#18201c] dark:text-white">
                      {formatCurrency(tx.amount)}
                    </span>
                    <span className="block text-[10px] text-[#717f77] dark:text-[#88968e]">
                      {tx.itemsCount} {tx.itemsCount === 1 ? 'item' : 'items'}
                    </span>
                  </td>

                  {/* Settlement Split */}
                  <td className="px-5 py-4 text-right whitespace-nowrap text-[10px]">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-amber-700 dark:text-amber-400 font-bold">
                        Kitchen: {formatCurrency(tx.vendorCut)}
                      </span>
                      <span className="text-blue-700 dark:text-blue-400 font-bold">
                        Driver: {formatCurrency(tx.driverCut)}
                      </span>
                      <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                        Crave Cut: {formatCurrency(tx.platformCut)}
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="px-5 py-4 text-center whitespace-nowrap">
                    {tx.paymentStatus === 'paid' || tx.paymentStatus === 'verified' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                        <span className="size-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                        Captured &amp; Settled
                      </span>
                    ) : tx.paymentStatus === 'rejected' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 text-rose-800 dark:text-rose-300 text-[10px] font-black uppercase tracking-wider">
                        <ShieldAlert className="size-3" /> Flagged
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] font-black uppercase tracking-wider">
                        <Clock className="size-3" /> Pending Delivery
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectTx(tx)
                      }}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-[#1a231e] dark:hover:bg-[#222d27] text-gray-700 dark:text-gray-300 transition"
                      title="View Detailed Financial Breakdown"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

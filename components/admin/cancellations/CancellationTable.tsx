'use client'

import React from 'react'
import { CheckCircle2, Clock, Eye, RefreshCw, XCircle } from 'lucide-react'
import { CancelledOrder } from './types'

interface CancellationTableProps {
  isLoading: boolean
  orders: CancelledOrder[]
  searchQuery: string
  statusFilter: string
  actionLoading: boolean
  onSelectOrder: (order: CancelledOrder) => void
  onApproveRefund: (order: CancelledOrder) => void
  onOpenRejectModal: (order: CancelledOrder) => void
}

export function CancellationTable({
  isLoading,
  orders,
  searchQuery,
  statusFilter,
  actionLoading,
  onSelectOrder,
  onApproveRefund,
  onOpenRejectModal,
}: CancellationTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] shadow-xs">
      {isLoading ? (
        <div className="p-16 text-center">
          <RefreshCw className="size-8 mx-auto animate-spin text-[#d9f447]" />
          <p className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
            Loading cancellations and refund queue…
          </p>
        </div>
      ) : orders.length === 0 ? (
        <div className="p-16 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 mx-auto">
            <CheckCircle2 className="size-6 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-[#18201c] dark:text-white mt-3">
            No Cancelled Orders Found
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search criteria or filter pills.'
              : 'All orders are operating smoothly with zero cancellations.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#27342d] bg-gray-50/75 dark:bg-[#18201c]/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Order &amp; Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Restaurant</th>
                <th className="py-3 px-4">Amount &amp; Method</th>
                <th className="py-3 px-4">Refund Queue</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1e2722]">
              {orders.map((ord) => {
                const refund = ord.refund
                const isPendingRefund = refund?.status === 'pending'
                const isApprovedRefund = refund?.status === 'completed'
                const isRejectedRefund = refund?.status === 'failed'

                return (
                  <tr
                    key={ord.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition"
                  >
                    {/* Order & Date */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-xs text-[#18201c] dark:text-white">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          Cancelled
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(ord.createdAt).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#18201c] dark:text-white truncate max-w-[150px]">
                        {ord.customer.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{ord.customer.phone}</p>
                    </td>

                    {/* Restaurant */}
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#18201c] dark:text-white truncate max-w-[150px]">
                        {ord.restaurant.name}
                      </p>
                      <p className="text-[11px] text-gray-400">{ord.items.length} items</p>
                    </td>

                    {/* Amount & Method */}
                    <td className="py-3.5 px-4">
                      <p className="font-black text-[#18201c] dark:text-white">
                        ₹{ord.totalAmount}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate max-w-[120px]">
                        {ord.paymentMethod} {ord.utrRef ? `· UTR: ${ord.utrRef.slice(-4)}` : ''}
                      </p>
                    </td>

                    {/* Refund Status */}
                    <td className="py-3.5 px-4">
                      {isPendingRefund ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
                          <Clock className="size-3 animate-spin" />
                          <span>Pending Review (₹{refund?.amount})</span>
                        </div>
                      ) : isApprovedRefund ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="size-3" />
                          <span>Refunded (₹{refund?.amount})</span>
                        </div>
                      ) : isRejectedRefund ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:text-rose-400">
                          <XCircle className="size-3" />
                          <span>Refund Declined</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">
                          No refund queued (Unpaid)
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSelectOrder(ord)}
                          className="inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-2.5 py-1.5 text-xs font-bold text-[#18201c] dark:text-white transition"
                          title="View Full Order Details"
                        >
                          <Eye className="size-3.5" />
                          <span className="hidden sm:inline">Details</span>
                        </button>

                        {isPendingRefund && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => onApproveRefund(ord)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#d9f447] hover:bg-[#c8e434] px-2.5 py-1.5 text-xs font-black text-[#18201c] transition shadow-xs disabled:opacity-50"
                              title="Approve Refund for Customer"
                            >
                              <CheckCircle2 className="size-3.5" />
                              <span>Approve</span>
                            </button>

                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => onOpenRejectModal(ord)}
                              className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                              title="Reject Refund"
                            >
                              <XCircle className="size-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

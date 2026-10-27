'use client'

import React from 'react'
import { Store, User, UtensilsCrossed, X } from 'lucide-react'
import { CancelledOrder } from './types'

interface CancellationDetailModalProps {
  selectedOrder: CancelledOrder | null
  onClose: () => void
  actionLoading: boolean
  onApproveRefund: (order: CancelledOrder) => void
  onOpenRejectModal: (order: CancelledOrder) => void
}

export function CancellationDetailModal({
  selectedOrder,
  onClose,
  actionLoading,
  onApproveRefund,
  onOpenRejectModal,
}: CancellationDetailModalProps) {
  if (!selectedOrder) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#141b17] p-6 shadow-2xl text-[#18201c] dark:text-white animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#25332a] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                Cancelled Order
              </span>
              <span className="text-xs text-gray-400 font-mono">#{selectedOrder.id}</span>
            </div>
            <h3 className="text-xl font-extrabold text-[#18201c] dark:text-white mt-1">
              Cancellation &amp; Audit Inspection
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#18201c] text-gray-400 hover:text-black dark:hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="mt-5 space-y-5 text-xs">
          {/* Customer & Restaurant Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                <User className="size-3 text-[#d9f447]" /> Customer Details
              </p>
              <p className="font-extrabold text-sm text-[#18201c] dark:text-white">
                {selectedOrder.customer.name}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Email:{' '}
                <span className="text-[#18201c] dark:text-white font-mono">
                  {selectedOrder.customer.email}
                </span>
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Phone:{' '}
                <span className="text-[#18201c] dark:text-white font-mono">
                  {selectedOrder.customer.phone}
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                <Store className="size-3 text-[#d9f447]" /> Restaurant Details
              </p>
              <p className="font-extrabold text-sm text-[#18201c] dark:text-white">
                {selectedOrder.restaurant.name}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Address: {selectedOrder.restaurant.address || 'Address not registered'}
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                Phone: {selectedOrder.restaurant.phone || 'N/A'}
              </p>
            </div>
          </div>

          {/* Items List */}
          <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-3">
              <UtensilsCrossed className="size-3 text-[#d9f447]" /> Ordered Dishes (
              {selectedOrder.items.length})
            </p>
            <div className="divide-y divide-gray-200 dark:divide-[#25332a]">
              {selectedOrder.items.map((item, idx) => (
                <div key={idx} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-[#18201c] dark:text-white">{item.name}</span>
                    {item.variantName && (
                      <span className="ml-1.5 text-gray-400">({item.variantName})</span>
                    )}
                    <span className="ml-2 text-gray-400 font-mono">x{item.qty}</span>
                  </div>
                  <span className="font-mono font-bold text-[#18201c] dark:text-white">
                    ₹{(item.price || 0) * (item.qty || 1)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Snapshot */}
          <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a] space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Financial Breakdown
            </p>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Items Subtotal</span>
              <span className="font-mono text-[#18201c] dark:text-white">
                ₹{selectedOrder.subtotal}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Delivery Partner Fee</span>
              <span className="font-mono text-[#18201c] dark:text-white">
                ₹{selectedOrder.deliveryFee}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Packaging &amp; Handling</span>
              <span className="font-mono text-[#18201c] dark:text-white">
                ₹{(selectedOrder.packagingFee || 0) + (selectedOrder.handlingFee || 0)}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Platform Fee</span>
              <span className="font-mono text-[#18201c] dark:text-white">
                ₹{selectedOrder.platformFee}
              </span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>GST &amp; Taxes</span>
              <span className="font-mono text-[#18201c] dark:text-white">
                ₹{selectedOrder.gst}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 dark:border-[#25332a] pt-2 text-sm font-black text-[#18201c] dark:text-white">
              <span>Total Order Value</span>
              <span className="text-emerald-600 dark:text-[#d9f447] font-mono">
                ₹{selectedOrder.totalAmount}
              </span>
            </div>
          </div>

          {/* Refund Queue Status Card */}
          <div className="rounded-2xl bg-[#121815] p-5 text-white border border-[#25332a]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Refund Review Status
              </p>
              {selectedOrder.refund ? (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    selectedOrder.refund.status === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : selectedOrder.refund.status === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {selectedOrder.refund.status.toUpperCase()}
                </span>
              ) : (
                <span className="text-gray-500 italic">No refund in queue</span>
              )}
            </div>

            {selectedOrder.refund && (
              <div className="mt-3 space-y-1">
                <p className="text-xs text-gray-300">
                  Refund Amount:{' '}
                  <strong className="text-[#d9f447] text-sm">
                    ₹{selectedOrder.refund.amount}
                  </strong>
                </p>
                <p className="text-[11px] text-gray-400">
                  Reason: <span className="text-white">{selectedOrder.refund.reason}</span>
                </p>
                {selectedOrder.refund.processedAt && (
                  <p className="text-[11px] text-gray-400">
                    Processed At:{' '}
                    {new Date(selectedOrder.refund.processedAt).toLocaleString('en-IN')}
                  </p>
                )}
              </div>
            )}

            {/* Action buttons inside drawer */}
            {selectedOrder.refund?.status === 'pending' && (
              <div className="mt-4 pt-4 border-t border-[#25332a] flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onOpenRejectModal(selectedOrder)}
                  className="rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                >
                  Reject Refund
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => onApproveRefund(selectedOrder)}
                  className="rounded-xl bg-[#d9f447] hover:bg-[#c8e434] text-[#18201c] px-5 py-2 text-xs font-extrabold transition shadow-md disabled:opacity-50"
                >
                  {actionLoading
                    ? 'Processing…'
                    : `Approve & Refund ₹${selectedOrder.refund.amount}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

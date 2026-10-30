'use client'

import React from 'react'
import { Percent, Sparkles, Store, Truck, X } from 'lucide-react'
import { formatCurrency, TransactionRecord } from './types'

interface TransactionDetailModalProps {
  selectedTx: TransactionRecord | null
  onClose: () => void
  onTriggerRouteSync: (txId: string) => void
}

export function TransactionDetailModal({
  selectedTx,
  onClose,
  onTriggerRouteSync,
}: TransactionDetailModalProps) {
  if (!selectedTx) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#131b16] border border-[#dfe4dc] dark:border-[#222c26] p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#e8ece5] dark:border-[#1e2722] pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#5e730f] dark:text-[#d9f447]">
              <Sparkles className="size-3.5" /> Transaction Audit Slip
            </span>
            <h3 className="mt-1 text-xl font-black text-[#18201c] dark:text-white">
              Order #{selectedTx.orderId}
            </h3>
            <p className="text-xs text-[#717f77] dark:text-[#97a59d]">
              {new Date(selectedTx.createdAt).toLocaleString('en-IN', {
                dateStyle: 'full',
                timeStyle: 'medium',
              })}
            </p>
          </div>

          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl bg-black/5 dark:bg-white/10 text-gray-700 dark:text-white hover:bg-black/10 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Customer & Merchant Info Box */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 rounded-2xl bg-[#f8f9f6] dark:bg-[#0e1310] border border-[#e8ece5] dark:border-[#1e2722]">
            <span className="text-[10px] font-bold text-[#717f77] dark:text-[#88968e] uppercase">
              Customer
            </span>
            <p className="font-extrabold text-[#18201c] dark:text-white mt-1">
              {selectedTx.customerName}
            </p>
            <p className="text-[11px] text-[#717f77] dark:text-[#97a59d] mt-0.5">
              {selectedTx.customerPhone}
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#f8f9f6] dark:bg-[#0e1310] border border-[#e8ece5] dark:border-[#1e2722]">
            <span className="text-[10px] font-bold text-[#717f77] dark:text-[#88968e] uppercase">
              Fulfilling Kitchen
            </span>
            <p className="font-extrabold text-[#18201c] dark:text-white mt-1">
              {selectedTx.restaurantName}
            </p>
            <p className="text-[11px] text-[#717f77] dark:text-[#97a59d] mt-0.5">
              ID: {selectedTx.restaurantId || 'Standard Kitchen'}
            </p>
          </div>
        </div>

        {/* Itemized Financial Breakdown */}
        <div className="rounded-2xl bg-[#18201c] dark:bg-[#0c100e] text-white p-5 text-xs space-y-2.5">
          <p className="text-[10px] font-black uppercase tracking-wider text-white/50 mb-1">
            Itemized Customer Invoice
          </p>

          <div className="flex justify-between text-white/80">
            <span>Food Items Subtotal</span>
            <span className="font-bold text-white">{formatCurrency(selectedTx.subtotal)}</span>
          </div>

          {selectedTx.packagingFee > 0 && (
            <div className="flex justify-between text-white/80">
              <span>Restaurant Packaging Fee</span>
              <span className="font-bold text-white">
                {formatCurrency(selectedTx.packagingFee)}
              </span>
            </div>
          )}

          <div className="flex justify-between text-white/80">
            <span>Distance Delivery Tariff</span>
            <span className="font-bold text-white">{formatCurrency(selectedTx.deliveryFee)}</span>
          </div>

          <div className="flex justify-between text-white/80">
            <span>Platform Service Fee</span>
            <span className="font-bold text-white">{formatCurrency(selectedTx.platformFee)}</span>
          </div>

          <div className="flex justify-between text-white/80">
            <span>Order Handling Charge</span>
            <span className="font-bold text-white">{formatCurrency(selectedTx.handlingFee)}</span>
          </div>

          <div className="flex justify-between text-[#d9f447]/90 font-medium">
            <span>Taxes &amp; GST</span>
            <span className="font-bold">{formatCurrency(selectedTx.gst)}</span>
          </div>

          <div className="pt-3 border-t border-white/15 flex justify-between items-baseline font-black text-base text-[#d9f447]">
            <span>Customer Grand Total</span>
            <span>{formatCurrency(selectedTx.amount)}</span>
          </div>
        </div>

        {/* Three-Way Economics Split Box */}
        <div className="rounded-2xl border border-[#dfe4dc] dark:border-[#222c26] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 text-xs space-y-3">
          <p className="font-black text-[10px] uppercase tracking-wider text-[#717f77] dark:text-[#88968e]">
            Automated Route Settlement Allocation
          </p>

          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 text-amber-900 dark:text-amber-300">
            <span className="font-bold flex items-center gap-1.5">
              <Store className="size-3.5" /> Kitchen Net Payout (Food + Packaging - Comm)
            </span>
            <span className="font-black text-sm">{formatCurrency(selectedTx.vendorCut)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-blue-500/10 text-blue-900 dark:text-blue-300">
            <span className="font-bold flex items-center gap-1.5">
              <Truck className="size-3.5" /> Driver Courier Payout (Tariff + Tip)
            </span>
            <span className="font-black text-sm">{formatCurrency(selectedTx.driverCut)}</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-500/10 text-emerald-900 dark:text-emerald-300">
            <span className="font-bold flex items-center gap-1.5">
              <Percent className="size-3.5" /> Crave Platform Net Margin
            </span>
            <span className="font-black text-sm text-emerald-700 dark:text-emerald-400">
              {formatCurrency(selectedTx.platformCut)}
            </span>
          </div>
        </div>

        {/* Gateway Metadata */}
        <div className="rounded-2xl bg-gray-50 dark:bg-[#151d18] p-3 text-[11px] text-[#717f77] dark:text-[#88968e] space-y-1 font-mono">
          <p>
            <strong className="text-[#18201c] dark:text-white">Gateway:</strong>{' '}
            {selectedTx.paymentMethod.toUpperCase()} (Razorpay Route)
          </p>
          {selectedTx.gatewayPaymentId && (
            <p>
              <strong className="text-[#18201c] dark:text-white">Payment Ref:</strong>{' '}
              {selectedTx.gatewayPaymentId}
            </p>
          )}
          {selectedTx.gatewayOrderId && (
            <p>
              <strong className="text-[#18201c] dark:text-white">Gateway Order:</strong>{' '}
              {selectedTx.gatewayOrderId}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => onTriggerRouteSync(selectedTx.id)}
            className="px-4 py-2.5 rounded-2xl bg-[#86a018]/15 dark:bg-[#d9f447]/15 text-[#5e730f] dark:text-[#d9f447] font-extrabold text-xs hover:bg-[#86a018]/25 transition"
          >
            Re-sync Route Settlement
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] font-black text-xs hover:opacity-95 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

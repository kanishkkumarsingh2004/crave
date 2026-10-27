'use client'

import { X } from 'lucide-react'
import type { KitchenOrder } from './types'

interface OrderDetailsModalProps {
  order: KitchenOrder | null
  isPending: boolean
  onClose: () => void
  onStatusUpdate: (orderId: string, nextStatus: string) => void
}

export default function OrderDetailsModal({
  order,
  isPending,
  onClose,
  onStatusUpdate,
}: OrderDetailsModalProps) {
  if (!order) return null

  const isNew =
    order.status === 'new' ||
    order.status === 'sent_to_vendor' ||
    order.status === 'accepted' ||
    order.status === 'payment_verified'
  const isCooking =
    order.status === 'preparing' || order.status === 'cooking' || order.status === 'packing'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto custom-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
          <div>
            <span className="font-mono text-xs font-semibold text-stone-500 dark:text-stone-400">
              Ticket #{order.id}
            </span>
            <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
              {order.customerName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-stone-100 dark:bg-white/10 text-stone-600 dark:text-stone-300 hover:bg-stone-200 transition"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl bg-stone-50 dark:bg-white/[0.03] p-3.5 border border-black/[0.05] dark:border-white/[0.05] space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Order Breakdown
            </p>
            {order.itemsList.length > 0 ? (
              <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {order.itemsList.map((item, idx) => (
                  <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1D1D1F] dark:text-stone-200">
                      <span className="font-mono font-bold text-[#1D1D1F] dark:text-white mr-2">
                        {item.qty}×
                      </span>
                      {item.name}
                    </span>
                    {item.price ? (
                      <span className="font-mono font-semibold text-stone-600 dark:text-stone-300">
                        ₹{item.price * item.qty}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-semibold">{order.itemsText}</p>
            )}
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between font-bold text-sm">
              <span>Total Amount</span>
              <span className="text-[#1D1D1F] dark:text-white">
                ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-stone-50 dark:bg-white/[0.03] p-3.5 border border-black/[0.05] dark:border-white/[0.05] space-y-1 text-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              Delivery Destination
            </p>
            <p className="font-medium text-stone-800 dark:text-stone-200">{order.address}</p>
            {order.customerPhone && (
              <p className="text-stone-500 dark:text-stone-400 font-mono text-[11px] pt-1">
                Phone: {order.customerPhone}
              </p>
            )}
            {order.utrRef && (
              <p className="text-stone-500 dark:text-stone-400 font-mono text-[10px]">
                Payment UTR: {order.utrRef}
              </p>
            )}
          </div>
        </div>

        {/* Modal action bar */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-black/[0.08] dark:border-white/[0.08] px-4 py-2 text-xs font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-white/5 transition"
          >
            Close
          </button>

          {isNew && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onStatusUpdate(order.id, 'preparing')}
              className="rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] px-4 py-2 text-xs font-semibold hover:bg-[#2C2C2E] dark:hover:bg-stone-200 transition active:scale-95 disabled:opacity-50"
            >
              Accept &amp; Cook
            </button>
          )}

          {isCooking && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onStatusUpdate(order.id, 'ready_for_pickup')}
              className="rounded-full bg-orange-600 text-white px-4 py-2 text-xs font-semibold hover:bg-orange-700 transition active:scale-95 disabled:opacity-50"
            >
              Mark Ready for Pickup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

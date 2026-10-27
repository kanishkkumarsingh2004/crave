'use client'

import { CraveSpinner } from '@/components/ui/ModernPreloader'
import { Check, CookingPot } from 'lucide-react'
import type { KitchenOrder } from './types'

interface KitchenTicketCardProps {
  order: KitchenOrder
  isPending: boolean
  onStatusUpdate: (orderId: string, nextStatus: string) => void
}

export default function KitchenTicketCard({
  order,
  isPending,
  onStatusUpdate,
}: KitchenTicketCardProps) {
  const isNew =
    order.status === 'new' ||
    order.status === 'sent_to_vendor' ||
    order.status === 'accepted' ||
    order.status === 'payment_verified'
  const isCooking =
    order.status === 'preparing' || order.status === 'cooking' || order.status === 'packing'
  const isReady =
    order.status === 'ready' ||
    order.status === 'ready_for_pickup' ||
    order.status === 'rider_assigned'

  return (
    <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-black/20 dark:hover:border-white/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-semibold text-[#1D1D1F] dark:text-white">
              #{order.id.slice(0, 8)}
            </span>
            <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400">
              · {order.time}
            </span>
            {order.paymentStatus === 'verified' && (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">
                Payment Verified
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-[#1D1D1F] dark:text-white mt-0.5">
            {order.customerName}
          </h4>
          <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{order.address}</p>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 shrink-0">
          <span className="text-base sm:text-lg font-bold text-[#1D1D1F] dark:text-white">
            ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
          </span>

          <div className="flex items-center gap-2">
            {isNew && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onStatusUpdate(order.id, 'preparing')}
                className="rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 px-4 py-1.5 text-xs font-semibold active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isPending ? (
                  <CraveSpinner size="xs" variant="dark" />
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>Start Cooking</span>
                  </>
                )}
              </button>
            )}

            {isCooking && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onStatusUpdate(order.id, 'ready_for_pickup')}
                className="rounded-full bg-orange-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {isPending ? (
                  <CraveSpinner size="xs" variant="white" />
                ) : (
                  <>
                    <CookingPot className="size-3.5" />
                    <span>Mark Ready for Pickup</span>
                  </>
                )}
              </button>
            )}

            {isReady && (
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                Ready for Driver
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Recipe Ticket */}
      <div className="rounded-2xl bg-stone-50 dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.05] p-3.5 space-y-1.5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          Kitchen Ticket Items
        </p>
        {order.itemsList.length > 0 ? (
          <div className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
            {order.itemsList.map((item, idx) => (
              <div key={idx} className="py-1.5 flex items-center justify-between text-xs">
                <span className="font-medium text-[#1D1D1F] dark:text-stone-200">
                  <span className="font-mono font-bold text-[#1D1D1F] dark:text-white mr-1.5">
                    {item.qty}×
                  </span>
                  {item.name}
                </span>
                {item.price ? (
                  <span className="font-mono text-stone-500 dark:text-stone-400">
                    ₹{item.price * item.qty}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            {order.itemsText}
          </p>
        )}
      </div>
    </div>
  )
}

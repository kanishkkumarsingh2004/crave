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
    <div className="rounded-2xl border border-stone-200 dark:border-[#222e26] bg-white dark:bg-[#141b17] p-4 sm:p-5 shadow-xs space-y-3 transition-all hover:border-[#86a018]/40 dark:hover:border-[#34463a]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 dark:border-[#202b23] pb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-black text-stone-900 dark:text-white">
              #{order.id.slice(0, 8)}
            </span>
            <span className="text-[10px] font-semibold text-stone-500 dark:text-gray-400">
              · {order.time}
            </span>
            {order.paymentStatus === 'verified' && (
              <span className="rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                Payment Verified
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-black text-[#121815] dark:text-white mt-0.5">
            {order.customerName}
          </h4>
          <p className="text-xs text-stone-500 dark:text-gray-400 truncate">{order.address}</p>
        </div>

        <div className="flex items-center sm:flex-col sm:items-end justify-between gap-1.5 shrink-0">
          <span className="text-base sm:text-lg font-black text-[#5e700a] dark:text-[#d9f447]">
            ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
          </span>

          <div className="flex items-center gap-2">
            {isNew && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => onStatusUpdate(order.id, 'preparing')}
                className="rounded-xl bg-[#d9f447] px-3.5 py-1.5 text-xs font-black text-[#0d1310] hover:bg-[#cbe638] active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
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
                className="rounded-xl bg-orange-500 px-3.5 py-1.5 text-xs font-black text-white hover:bg-orange-600 active:scale-95 transition flex items-center gap-1.5 shadow-xs disabled:opacity-50"
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
              <span className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-xs font-black text-emerald-600 dark:text-emerald-400">
                Ready for Driver
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Itemized Recipe Ticket */}
      <div className="rounded-xl bg-stone-50 dark:bg-[#0f1512] border border-stone-200/80 dark:border-[#202b23] p-3 space-y-1.5">
        <p className="text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-gray-400">
          Kitchen Ticket Items
        </p>
        {order.itemsList.length > 0 ? (
          <div className="divide-y divide-stone-200/60 dark:divide-[#202b23]">
            {order.itemsList.map((item, idx) => (
              <div key={idx} className="py-1 flex items-center justify-between text-xs">
                <span className="font-bold text-[#121815] dark:text-stone-200">
                  <span className="font-mono font-black text-amber-600 dark:text-[#d9f447] mr-1.5">
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

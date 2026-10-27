'use client'

import { CraveSpinner } from '@/components/ui/ModernPreloader'
import { Check, CookingPot } from 'lucide-react'
import type { KitchenOrder } from './types'

interface KitchenGridCardProps {
  order: KitchenOrder
  isPending: boolean
  onSelect: () => void
  onStatusUpdate: (orderId: string, nextStatus: string) => void
}

export default function KitchenGridCard({
  order,
  isPending,
  onSelect,
  onStatusUpdate,
}: KitchenGridCardProps) {
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
  const isEnRoute = order.status === 'picked_up' || order.status === 'out_for_delivery'
  const isDone = order.status === 'delivered' || order.status === 'completed'

  return (
    <div
      onClick={onSelect}
      className={`rounded-2xl border p-2.5 sm:p-3 bg-white dark:bg-[#161617] shadow-2xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden cursor-pointer relative group ${
        isNew
          ? 'border-amber-400/80 dark:border-amber-500/60 ring-1 ring-amber-400/20'
          : isCooking
            ? 'border-orange-400/80 dark:border-orange-500/60 ring-1 ring-orange-400/20'
            : isReady
              ? 'border-emerald-400/80 dark:border-emerald-500/60'
              : 'border-black/[0.08] dark:border-white/[0.08]'
      }`}
    >
      {/* Top: Order Token & Time */}
      <div className="flex items-center justify-between gap-1 w-full border-b border-black/[0.06] dark:border-white/[0.06] pb-1.5">
        <span className="font-mono text-[9px] sm:text-[11px] font-bold text-stone-800 dark:text-stone-200 truncate">
          #{order.id.slice(0, 5)}
        </span>
        <span className="text-[8px] sm:text-[10px] text-stone-500 dark:text-stone-400 font-medium shrink-0">
          {order.time}
        </span>
      </div>

      {/* Middle: Dish summary & price */}
      <div className="py-1.5 sm:py-2 flex-1 min-w-0">
        <p className="text-[9px] sm:text-xs font-semibold text-[#1D1D1F] dark:text-white line-clamp-2 leading-tight">
          {order.itemsText || 'Order Items'}
        </p>
        <div className="mt-1 flex items-center justify-between gap-1">
          <span className="text-[10px] sm:text-xs font-bold text-[#1D1D1F] dark:text-white">
            ₹{order.subtotal > 0 ? order.subtotal : order.totalAmount}
          </span>
          <span className="text-[8px] sm:text-[9px] font-medium text-stone-500 dark:text-stone-400 truncate max-w-[60px] sm:max-w-[100px]">
            {order.customerName}
          </span>
        </div>
      </div>

      {/* Bottom: Fast Action Button */}
      <div className="pt-1 w-full" onClick={(e) => e.stopPropagation()}>
        {isNew && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onStatusUpdate(order.id, 'preparing')}
            className="w-full rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 py-1 px-1 text-[9px] sm:text-[11px] font-semibold active:scale-95 transition flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
          >
            {isPending ? (
              <CraveSpinner size="xs" variant="dark" />
            ) : (
              <>
                <Check className="size-2.5 sm:size-3" />
                <span>Accept</span>
              </>
            )}
          </button>
        )}

        {isCooking && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onStatusUpdate(order.id, 'ready_for_pickup')}
            className="w-full rounded-full bg-orange-600 text-white hover:bg-orange-700 py-1 px-1 text-[9px] sm:text-[11px] font-semibold active:scale-95 transition flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
          >
            {isPending ? (
              <CraveSpinner size="xs" variant="white" />
            ) : (
              <>
                <CookingPot className="size-2.5 sm:size-3" />
                <span>Mark Ready</span>
              </>
            )}
          </button>
        )}

        {isReady && (
          <div className="rounded-full bg-emerald-500/10 border border-emerald-500/20 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
            Ready for Driver
          </div>
        )}

        {isEnRoute && (
          <div className="rounded-full bg-blue-500/10 border border-blue-500/20 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-semibold text-blue-600 dark:text-blue-400 truncate">
            Out 🛵
          </div>
        )}

        {isDone && (
          <div className="rounded-full bg-stone-100 dark:bg-white/10 py-0.5 sm:py-1 px-1 text-center text-[8px] sm:text-[10px] font-semibold text-stone-500 dark:text-stone-300 truncate">
            Delivered ✓
          </div>
        )}
      </div>
    </div>
  )
}

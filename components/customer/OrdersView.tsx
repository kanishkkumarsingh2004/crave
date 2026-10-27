'use client'

import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  RotateCcw,
  ShoppingBag,
  Sparkles,
  Store,
  Zap,
} from 'lucide-react'
import type { PastOrder } from './types'

interface OrdersViewProps {
  pastOrders: PastOrder[]
  onNavigateToExplore: () => void
  onTrackLiveOrder: (orderId: string) => void
  onPayNow: (orderId: string, amount: number) => void
  onReorder?: (order: PastOrder) => void
  onViewInvoice: (order: {
    id: string
    restaurantName: string
    customerName: string
    customerAddress: string
    timestamp: string
    items: Array<{ name: string; qty: number; price: number; variantName?: string }>
    total: number
    status: string
  }) => void
  customerName?: string
  customerAddress?: string
}

export default function OrdersView({
  pastOrders,
  onNavigateToExplore,
  onTrackLiveOrder,
  onPayNow,
  onReorder,
  onViewInvoice,
  customerName = 'Customer',
  customerAddress = 'Bengaluru',
}: OrdersViewProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-[#18201c] dark:text-white">Your Orders</h2>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
          {pastOrders.length} {pastOrders.length === 1 ? 'order' : 'orders'} placed
        </p>
      </div>

      {pastOrders.length === 0 ? (
        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-16 text-center">
          <ShoppingBag className="mx-auto size-14 text-gray-200 dark:text-gray-700 mb-3" />
          <p className="font-bold text-[#18201c] dark:text-white">No Orders Yet</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your order history will appear here after placing an order.
          </p>
          <button
            onClick={onNavigateToExplore}
            className="mt-5 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-2.5 text-xs font-bold text-white dark:text-[#18201c] cursor-pointer hover:opacity-90 transition active:scale-95"
          >
            Explore Kitchens
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {pastOrders.map((order) => {
            const isDelivered = order.status === 'Delivered' || (order.status as string) === 'completed'
            const isInProgress = order.status === 'In Progress'
            const isPending = order.status === 'Pending'
            const isCancelled = order.status === 'Cancelled'

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-[26px] border border-stone-200/80 dark:border-white/10 bg-white/95 dark:bg-[#141d18]/95 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition duration-300 hover:shadow-md hover:border-emerald-500/20"
              >
                {/* Header: Restaurant, Status & Total */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-white/5 p-4 sm:p-5 bg-stone-50/50 dark:bg-white/[0.02]">
                  <div className="flex items-center gap-3.5 min-w-0">
                    {order.restaurantImage ? (
                      <img
                        src={order.restaurantImage}
                        alt={order.restaurantName}
                        className="size-12 rounded-2xl object-cover shrink-0 border border-black/5 dark:border-white/10 shadow-xs"
                      />
                    ) : (
                      <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-stone-100 dark:bg-white/5 text-stone-600 dark:text-stone-300 border border-black/5 dark:border-white/10 font-black text-sm">
                        <Store className="size-5 text-emerald-600 dark:text-[#d9f447]" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white truncate">
                          {order.restaurantName}
                        </h3>
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 inline" />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                        <span className="font-mono text-stone-400">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-stone-400" />
                          {order.date} · {order.time}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-1 shrink-0 pt-2 sm:pt-0 border-t border-stone-200/50 sm:border-t-0 dark:border-white/5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                        isDelivered
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25'
                          : isInProgress
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/25'
                            : isPending
                              ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/25'
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${isDelivered ? 'bg-emerald-500' : isInProgress ? 'bg-sky-500 animate-ping' : isPending ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      <span>{order.status === 'Delivered' ? 'Delivered' : isInProgress ? 'Out for Delivery' : isPending ? 'Payment Pending' : 'Cancelled'}</span>
                    </span>

                    <p className="font-black text-base text-[#18201c] dark:text-white font-mono">
                      ₹{order.total}
                    </p>
                  </div>
                </div>

                {/* Body: Itemized Food Details */}
                <div className="p-4 sm:p-5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-stone-500 mb-2.5">
                    Order Items ({order.items.length})
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="inline-flex items-center gap-2 rounded-xl bg-stone-50 dark:bg-white/[0.03] border border-stone-200/70 dark:border-white/10 px-3 py-1.5 text-xs text-stone-700 dark:text-stone-300"
                      >
                        <span className="font-extrabold text-emerald-700 dark:text-[#d9f447]">{item.qty}×</span>
                        <span className="font-semibold">{item.name}</span>
                        {item.variantName && (
                          <span className="text-[10px] font-bold text-stone-400">({item.variantName})</span>
                        )}
                        <span className="font-mono font-bold text-stone-500 dark:text-stone-400 ml-1">
                          ₹{item.price * item.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer: Delivery Info & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-stone-100 dark:border-white/5 p-4 sm:p-5 bg-stone-50/30 dark:bg-transparent">
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 font-medium truncate max-w-sm">
                    <MapPin className="size-3.5 text-emerald-600 dark:text-[#d9f447] shrink-0" />
                    <span className="truncate">Delivered to: {customerAddress}</span>
                  </div>

                  <div className="flex items-center gap-2 justify-end shrink-0">
                    {isInProgress && (
                      <button
                        type="button"
                        onClick={() => onTrackLiveOrder(String(order.id))}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-4 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Bike className="size-3.5" />
                        <span>Track Live</span>
                        <ArrowRight className="size-3.5" />
                      </button>
                    )}

                    {isPending && (
                      <button
                        type="button"
                        onClick={() => onPayNow(String(order.id), order.total)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-4 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                      >
                        <Zap className="size-3.5" />
                        <span>Complete Payment ₹{order.total}</span>
                      </button>
                    )}

                    {isDelivered && (
                      <>
                        {onReorder && (
                          <button
                            type="button"
                            onClick={() => onReorder(order)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 dark:bg-[#d9f447] text-white dark:text-stone-950 hover:bg-emerald-600 dark:hover:bg-[#cbf026] px-4 py-2 text-xs font-black shadow-xs transition active:scale-95 cursor-pointer"
                          >
                            <RotateCcw className="size-3.5" />
                            <span>1-Click Reorder</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            onViewInvoice({
                              id: order.id,
                              restaurantName: order.restaurantName,
                              customerName,
                              customerAddress,
                              timestamp: `${order.date}, ${order.time}`,
                              items: order.items,
                              total: order.total,
                              status: order.status,
                            })
                          }
                          className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-white/5 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-white/10 px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          <FileText className="size-3.5" />
                          <span>Invoice</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { Bike, FileText, ShoppingBag, Store, Zap } from 'lucide-react'
import type { PastOrder } from './types'

interface OrdersViewProps {
  pastOrders: PastOrder[]
  onNavigateToExplore: () => void
  onTrackLiveOrder: (orderId: string) => void
  onPayNow: (orderId: string, amount: number) => void
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
          {pastOrders.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] shadow-xs"
            >
              <div className="flex items-center gap-4 border-b border-[#f0f3ec] dark:border-[#27342d] p-5">
                {order.restaurantImage ? (
                  <img
                    src={order.restaurantImage}
                    alt={order.restaurantName}
                    className="size-14 rounded-2xl object-cover shrink-0"
                  />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400">
                    <Store className="size-5" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-bold uppercase ${
                        order.status === 'Delivered'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : order.status === 'In Progress'
                            ? 'text-blue-600 dark:text-blue-400'
                            : order.status === 'Pending'
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {order.status === 'Delivered'
                        ? 'Delivered'
                        : order.status === 'In Progress'
                          ? 'Out for Delivery'
                          : order.status === 'Pending'
                            ? 'Payment Pending'
                            : 'Cancelled'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
                  </div>
                  <h3 className="mt-1 font-bold text-sm text-[#18201c] dark:text-white truncate">
                    {order.restaurantName}
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {order.date} · {order.time}
                  </p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  <p className="font-bold text-base text-[#18201c] dark:text-white">
                    ₹{order.total}
                  </p>
                  {order.status === 'In Progress' && (
                    <button
                      type="button"
                      onClick={() => onTrackLiveOrder(String(order.id))}
                      className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                    >
                      <Bike className="size-3" /> Track Live Order
                    </button>
                  )}
                  {order.status === 'Pending' && (
                    <button
                      type="button"
                      onClick={() => onPayNow(String(order.id), order.total)}
                      className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                    >
                      <Zap className="size-3" /> Pay Now ₹{order.total}
                    </button>
                  )}
                  {(order.status === 'Delivered' || (order.status as string) === 'completed') && (
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
                      className="inline-flex items-center gap-1 rounded-full bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] hover:bg-black dark:hover:bg-[#c8e434] px-2.5 py-1 text-[10px] font-bold shadow-xs transition cursor-pointer"
                    >
                      <FileText className="size-3" /> View Invoice
                    </button>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-b border-[#f5f6f3] dark:border-[#27342d]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Items Ordered
                </p>
                <div className="flex flex-col gap-1">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-gray-700 dark:text-gray-300">
                        {item.qty}× {item.name}
                        {item.variantName ? ` (${item.variantName})` : ''}
                      </span>
                      <span className="font-semibold text-[#18201c] dark:text-white">
                        ₹{item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

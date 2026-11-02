'use client'

import React, { useMemo } from 'react'
import { ArrowRight, Bike, Camera, Check, CheckCircle2, Clock, Package, QrCode } from 'lucide-react'
import { IncomingGroceryOrder } from './types'

interface StoreOrdersViewProps {
  orders: IncomingGroceryOrder[]
  barcodeQuery: string
  setBarcodeQuery: (q: string) => void
  orderFilter: 'all' | 'new' | 'packing' | 'ready'
  setOrderFilter: (f: 'all' | 'new' | 'packing' | 'ready') => void
  onBarcodeSubmit: (e: React.FormEvent) => void
  onOpenScanner: () => void
  onToggleItemPacked: (orderId: string, itemIdx: number) => void
  onUpdateStatus: (orderId: string, status: 'packing' | 'ready' | 'picked_up') => void
}

export default function StoreOrdersView({
  orders,
  barcodeQuery,
  setBarcodeQuery,
  orderFilter,
  setOrderFilter,
  onBarcodeSubmit,
  onOpenScanner,
  onToggleItemPacked,
  onUpdateStatus,
}: StoreOrdersViewProps) {
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === 'all') return true
      return o.status === orderFilter
    })
  }, [orders, orderFilter])

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Barcode Scanner & Quick Filter Bar */}
      <div className="grid items-center gap-3 sm:gap-4 md:grid-cols-12">
        <div className="md:col-span-6">
          <form
            onSubmit={onBarcodeSubmit}
            className="relative flex min-h-12 items-center rounded-2xl border-2 border-[#18201c]/20 bg-white px-3 py-2.5 shadow-sm focus-within:border-emerald-600 sm:px-3.5"
          >
            <QrCode className="size-4 text-emerald-700 mr-2 shrink-0" />
            <input
              type="text"
              value={barcodeQuery}
              onChange={(e) => setBarcodeQuery(e.target.value)}
              placeholder="Scan barcode or enter SKU..."
              className="min-w-0 w-full bg-transparent text-xs font-bold text-[#18201c] outline-none placeholder:font-normal placeholder:text-gray-400"
            />
            <button
              type="button"
              onClick={onOpenScanner}
              className="min-h-10 shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition mr-1 flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Camera className="size-3.5" />
              <span>Camera Scan</span>
            </button>
            <button
              type="submit"
              className="min-h-10 shrink-0 rounded-xl bg-[#18201c] px-2.5 py-1.5 text-[10px] font-bold text-white sm:px-3 sm:text-[11px] cursor-pointer"
            >
              Scan Barcode
            </button>
          </form>
        </div>

        <div className="scrollbar-none flex min-w-0 items-center justify-start gap-2 overflow-x-auto text-xs font-bold md:col-span-6 md:justify-end">
          <span className="shrink-0 text-[#627068]">Status:</span>
          {(['all', 'new', 'packing', 'ready'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setOrderFilter(st)}
              className={`min-h-10 shrink-0 rounded-xl px-3 py-2 capitalize transition touch-manipulation cursor-pointer ${
                orderFilter === st
                  ? 'bg-[#18201c] text-[#d9f447]'
                  : 'bg-white border border-[#e2e7dc] text-[#5c6861] hover:text-[#18201c]'
              }`}
            >
              {st === 'all' ? 'All Orders' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOrders.length === 0 ? (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-[#e2e7dc] bg-white">
            <Package className="mx-auto size-10 text-gray-300 mb-3" />
            <p className="text-base font-bold text-[#18201c]">No active orders in the database.</p>
            <p className="text-xs text-gray-500 mt-1">
              New customer orders for this store will appear here.
            </p>
          </div>
        ) : (
          filteredOrders.map((order) => {
            const allItemsPacked = order.items.every((i) => i.packed)
            return (
              <div
                key={order.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-[#e2e7dc] bg-white p-4 shadow-sm transition hover:border-[#18201c] hover:shadow-xl sm:rounded-3xl sm:p-6"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-[#f0f4eb] pb-3 mb-4">
                    <div>
                      <span className="font-mono text-sm font-black text-[#18201c]">
                        #{order.id}
                      </span>
                      <p className="text-[11px] text-[#627068] mt-0.5">
                        {order.time}
                        {order.distance ? ` · ${order.distance}` : ''}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        order.status === 'new'
                          ? 'bg-rose-100 text-rose-900 border border-rose-200 animate-pulse'
                          : order.status === 'packing'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                      }`}
                    >
                      {order.status === 'new'
                        ? 'NEW ORDER'
                        : order.status === 'packing'
                          ? 'PACKING'
                          : 'READY FOR RIDER'}
                    </span>
                  </div>

                  {/* Customer & Address */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-[#18201c]">{order.customerName}</p>
                      <span className="text-[10px] font-bold text-gray-500">{order.batchZone}</span>
                    </div>
                    <p className="text-[11px] text-[#627068] line-clamp-1">{order.address}</p>
                  </div>

                  {/* SLA Countdown Timer */}
                  {order.packTimerSeconds != null && order.status !== 'ready' && (
                    <div className="rounded-2xl bg-[#f8f9f6] p-3 border border-[#e8ece3] mb-4 flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-[#5c6861]">
                        <Clock className="size-4 text-emerald-700" /> Pack SLA Target:
                      </span>
                      <span className="font-mono text-emerald-800 text-sm font-black">
                        {formatTimer(order.packTimerSeconds)}
                      </span>
                    </div>
                  )}

                  {/* Interactive Picker Packing Checklist */}
                  <div className="rounded-2xl bg-[#f8f9f6] p-3.5 border border-[#e8ece3] mb-4">
                    <div className="flex items-center justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      <span>Picker Checklist ({order.items.length} SKUs)</span>
                      <span>{order.pickerName}</span>
                    </div>

                    <div className="flex flex-col gap-2">
                      {order.items.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => onToggleItemPacked(order.id, idx)}
                          className={`flex items-center justify-between text-xs p-2 rounded-xl text-left border transition cursor-pointer ${
                            item.packed
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-white border-[#e2e7dc] text-[#18201c] hover:border-gray-400'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={`grid size-4 place-items-center rounded ${
                                item.packed
                                  ? 'bg-emerald-600 text-white'
                                  : 'border border-gray-300 bg-white'
                              }`}
                            >
                              {item.packed && <Check className="size-3 stroke-[3]" />}
                            </span>
                            <span
                              className={
                                item.packed ? 'line-through text-gray-400' : 'font-semibold'
                              }
                            >
                              {item.qty}x {item.name}
                            </span>
                          </span>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {item.skuCode}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold border-t border-[#f0f4eb] pt-3 mb-3 text-[#5c6861]">
                    <span>
                      Total Paid: ₹{order.total} ({order.paymentMethod})
                    </span>
                  </div>

                  {order.status === 'new' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'packing')}
                      className="w-full rounded-2xl bg-[#18201c] py-3 text-xs font-black text-[#d9f447] hover:bg-[#323f37] transition shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Accept &amp; Assign to Picker</span>
                      <ArrowRight className="size-4" />
                    </button>
                  )}

                  {order.status === 'packing' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'ready')}
                      disabled={!allItemsPacked}
                      className={`w-full rounded-2xl py-3 text-xs font-black transition shadow flex items-center justify-center gap-2 ${
                        allItemsPacked
                          ? 'bg-amber-400 text-black hover:bg-amber-500 cursor-pointer'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <span>
                        {allItemsPacked ? 'Mark Packed & Print Barcode' : 'Check All Items First'}
                      </span>
                      <CheckCircle2 className="size-4" />
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => onUpdateStatus(order.id, 'picked_up')}
                      className="w-full rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white hover:bg-emerald-700 transition shadow flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bike className="size-4" />
                      <span>Handover to Rider (Dispatch Drop)</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

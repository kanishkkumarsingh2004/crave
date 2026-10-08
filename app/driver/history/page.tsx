'use client'

import { useDriver } from '@/lib/driver-context'
import { Check, FileText } from 'lucide-react'
import { useState } from 'react'
import InvoiceModal, { InvoiceOrderData } from '@/components/InvoiceModal'

export default function DriverHistoryPage() {
  const { completedTrips } = useDriver()
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceOrderData | null>(null)

  return (
    <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl text-white space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2d3b32] pb-4">
        <div>
          <h3 className="text-xl font-bold text-white">Completed Delivery History</h3>
          <p className="text-xs text-[#a0ab9f]">
            Detailed logs of all completed drops and payouts.
          </p>
        </div>
        <span className="mt-2 sm:mt-0 text-xs font-extrabold text-[#d9f447] bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 self-start sm:self-auto">
          {completedTrips.length} Total Deliveries Completed Today
        </span>
      </div>

      {completedTrips.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {completedTrips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-2xl border border-[#25332a] p-4 bg-[#121815] hover:border-[#b5de28] transition shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="grid size-10 place-items-center rounded-2xl bg-emerald-500/20 text-[#d9f447] border border-emerald-500/30 font-bold shrink-0">
                  <Check className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{trip.order}</span>
                    <span className="text-[10px] text-[#a0ab9f] font-mono">{trip.time}</span>
                  </div>
                  <p className="text-xs font-semibold text-white/90 mt-1">
                    {trip.restaurant} &rarr; {trip.customer}
                  </p>
                  <p className="text-[11px] text-[#a0ab9f] mt-0.5 font-mono">
                    Distance: {trip.distance}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#202923] text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedInvoice({
                      id: trip.order.replace('#', ''),
                      restaurantName: trip.restaurant,
                      customerName: trip.customer,
                      timestamp: trip.time,
                      subtotal: trip.baseEarnings,
                      tip: trip.tip,
                      total: trip.total,
                      status: 'Delivered',
                    })
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#d9f447] text-[#121815] hover:bg-[#c2dc3a] px-3.5 py-1.5 text-xs font-extrabold shadow-md transition cursor-pointer"
                >
                  <FileText className="size-3.5 text-[#121815]" /> Invoice
                </button>
                <div className="text-right">
                  <p className="text-[10px] text-[#a0ab9f] font-bold uppercase">Total Earned</p>
                  <p className="text-base font-extrabold text-[#d9f447]">₹{trip.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-[#2d3b32] bg-[#121815] p-8 text-center text-xs text-[#a0ab9f]">
          No completed trips recorded today. Turn duty status ON to accept delivery orders and view
          trip history logs.
        </div>
      )}

      {/* Tax Invoice Modal */}
      <InvoiceModal order={selectedInvoice} onClose={() => setSelectedInvoice(null)} />
    </div>
  )
}

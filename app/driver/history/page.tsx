'use client'

import { useDriver } from '@/lib/driver-context'
import { Check } from 'lucide-react'

export default function DriverHistoryPage() {
  const { completedTrips } = useDriver()

  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
        <div>
          <h3 className="text-xl font-bold text-[#18201c]">Completed Delivery History</h3>
          <p className="text-xs text-gray-500">Detailed logs of all completed drops and payouts.</p>
        </div>
        <span className="mt-2 sm:mt-0 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
          {completedTrips.length} Total Deliveries Completed Today
        </span>
      </div>

      {completedTrips.length > 0 ? (
        <div className="mt-6 flex flex-col gap-4">
          {completedTrips.map((trip) => (
            <div
              key={trip.id}
              className="rounded-2xl border border-gray-200 p-4 bg-white hover:border-gray-300 transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="grid size-10 place-items-center rounded-2xl bg-emerald-100 text-emerald-800 font-bold shrink-0">
                  <Check className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#18201c]">{trip.order}</span>
                    <span className="text-[10px] text-gray-500 font-mono">{trip.time}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 mt-1">
                    {trip.restaurant} ➔ {trip.customer}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Distance: {trip.distance}</p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 text-xs">
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Breakdown</p>
                  <p className="text-[11px] text-gray-600">
                    Base ₹{trip.baseEarnings} + Surge ₹{trip.surge} + Tip ₹{trip.tip}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-emerald-700 font-bold uppercase">Total Earned</p>
                  <p className="text-base font-extrabold text-emerald-700">₹{trip.total}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center text-xs text-gray-500">
          No completed trips recorded today. Turn duty status ON to accept delivery orders and view
          trip history logs.
        </div>
      )}
    </div>
  )
}

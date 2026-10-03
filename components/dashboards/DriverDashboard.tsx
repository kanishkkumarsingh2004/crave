'use client'

import { CheckCircle2, CircleDollarSign, Clock3, MapPinned, Navigation, Radio, ShieldCheck, Wallet } from 'lucide-react'
import { useDriver } from '@/lib/driver-context'

export default function DriverDashboard() {
  const { isOnline, activeTask, completedTrips, payoutLogs, savedUpiList } = useDriver()

  const totalEarnings = completedTrips.reduce((sum, trip) => sum + trip.total, 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="grid gap-4 md:grid-cols-3">
        <MiniCard title="Online status" value={isOnline ? 'Available' : 'Offline'} tone="green" icon={<Radio className="size-4" />} />
        <MiniCard title="This week" value={`₹${totalEarnings}`} tone="amber" icon={<CircleDollarSign className="size-4" />} />
        <MiniCard title="Saved UPI" value={`${savedUpiList.length} linked`} tone="blue" icon={<Wallet className="size-4" />} />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">Active delivery</p>
            <h3 className="mt-1 text-xl font-bold text-[#18201c]">Driver workflow</h3>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {activeTask ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-700">Order {activeTask.orderNumber}</div>
                  <div className="mt-1 text-lg font-bold text-[#18201c]">{activeTask.restaurantName}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Trip payout</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700">₹{activeTask.payout + activeTask.tip}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow icon={<MapPinned className="size-4" />} label="Pickup" value={activeTask.restaurantAddress} />
              <InfoRow icon={<Navigation className="size-4" />} label="Distance" value={activeTask.distance} />
              <InfoRow icon={<Clock3 className="size-4" />} label="Step" value={activeTask.step} />
              <InfoRow icon={<ShieldCheck className="size-4" />} label="Customer" value={activeTask.customerName} />
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600">
            No active delivery task. The driver is ready to receive live order broadcasts.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#18201c]">Recent trips</h3>
          <div className="mt-4 space-y-3">
            {completedTrips.map((trip) => (
              <div key={trip.id} className="rounded-2xl border border-gray-200 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[#18201c]">{trip.order}</div>
                    <div className="text-[11px] text-gray-500">{trip.restaurant}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-700">₹{trip.total}</div>
                    <div className="text-[11px] text-gray-500">{trip.time}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#18201c]">Payouts</h3>
          <div className="mt-4 space-y-3">
            {payoutLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between rounded-2xl bg-gray-50 p-3">
                <div>
                  <div className="font-bold text-[#18201c]">₹{log.amount}</div>
                  <div className="text-[11px] text-gray-500">{log.date}</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                  {log.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniCard({ title, value, tone, icon }: { title: string; value: string; tone: 'green' | 'amber' | 'blue'; icon: React.ReactNode }) {
  const style = {
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-blue-50 text-blue-800',
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{title}</span>
        <span className={`grid size-8 place-items-center rounded-xl ${style[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xl font-bold text-[#18201c]">{value}</p>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-[#18201c]">{value}</div>
    </div>
  )
}
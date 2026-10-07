'use client'

import { useDriver } from '@/lib/driver-context'
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  KeyRound,
  MapPinned,
  Navigation,
  Radio,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

export default function DriverDashboard() {
  const {
    isOnline,
    activeTask,
    broadcastOffer,
    offerTimer,
    acceptBroadcastOffer,
    advanceStep,
    completeDelivery,
    completedTrips,
    payoutLogs,
    savedUpiList,
    triggerSimulatedOffer,
  } = useDriver()

  const [otpValue, setOtpValue] = useState('')
  const [otpError, setOtpError] = useState('')

  const totalEarnings = completedTrips.reduce((sum, trip) => sum + trip.total, 0)

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const result = completeDelivery(otpValue)
    if (!result.success) {
      setOtpError(result.message)
    } else {
      setOtpError('')
      setOtpValue('')
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Broadcast Offer Modal */}
      {broadcastOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
                <Zap className="size-3.5 fill-current" /> New Order Request ({offerTimer}s)
              </span>
              <span className="font-mono text-xs font-bold text-gray-400">
                {broadcastOffer.orderNumber}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <h3 className="text-lg font-bold text-[#18201c]">{broadcastOffer.restaurantName}</h3>
              <p className="text-gray-500 font-medium">
                Pickup: {broadcastOffer.restaurantAddress}
              </p>
              <div className="rounded-2xl bg-gray-50 p-3 flex justify-between font-bold">
                <span>Trip Distance:</span>
                <span className="text-blue-700">{broadcastOffer.distance}</span>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-900 space-y-1.5 border border-emerald-200">
                <div className="flex justify-between font-bold text-sm">
                  <span>Driver Trip Earnings:</span>
                  <span className="text-emerald-700 font-extrabold text-base">
                    ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-800/80 pt-1 border-t border-emerald-200/60 font-medium">
                  <span>Base Pay: ₹{broadcastOffer.basePayout}</span>
                  {broadcastOffer.surgeBonus > 0 && (
                    <span>Surge: +₹{broadcastOffer.surgeBonus}</span>
                  )}
                  {broadcastOffer.tip > 0 && (
                    <span className="font-bold text-emerald-900">Tip: +₹{broadcastOffer.tip}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => acceptBroadcastOffer()}
                className="w-full rounded-full bg-[#18201c] py-3 text-xs font-bold text-white shadow-md hover:bg-black transition flex items-center justify-center gap-1"
              >
                Accept Order <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => triggerSimulatedOffer()}
                className="w-full rounded-full border border-gray-200 py-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
              >
                Decline / Next
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MiniCard
          title="Online status"
          value={isOnline ? 'Available' : 'Offline'}
          tone="green"
          icon={<Radio className="size-4" />}
        />
        <MiniCard
          title="This week"
          value={`₹${totalEarnings}`}
          tone="amber"
          icon={<CircleDollarSign className="size-4" />}
        />
        <MiniCard
          title="Saved UPI"
          value={`${savedUpiList.length} linked`}
          tone="blue"
          icon={<Wallet className="size-4" />}
        />
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#859d19]">
              Active delivery workflow
            </p>
            <h3 className="mt-1 text-xl font-bold text-[#18201c]">Fleet Order Status</h3>
          </div>
          <button
            type="button"
            onClick={triggerSimulatedOffer}
            className="rounded-full bg-[#18201c] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#323d36] transition flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5 text-[#d9f447]" /> Find Nearby Order
          </button>
        </div>

        {activeTask ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-blue-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-blue-700">
                    Order {activeTask.orderNumber}
                  </div>
                  <div className="mt-1 text-lg font-bold text-[#18201c]">
                    {activeTask.restaurantName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-gray-500">Trip payout</div>
                  <div className="mt-1 text-lg font-bold text-emerald-700">
                    ₹{activeTask.payout + activeTask.tip}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <InfoRow
                icon={<MapPinned className="size-4" />}
                label="Pickup"
                value={activeTask.restaurantAddress}
              />
              <InfoRow
                icon={<Navigation className="size-4" />}
                label="Trip Distance"
                value={activeTask.distance}
              />
              <InfoRow icon={<Clock3 className="size-4" />} label="Step" value={activeTask.step} />
              <InfoRow
                icon={<ShieldCheck className="size-4" />}
                label="Customer"
                value={activeTask.customerName}
              />
            </div>

            {/* Workflow Action Steps */}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
              {activeTask.step !== 'arrived_customer' ? (
                <button
                  type="button"
                  onClick={advanceStep}
                  className="w-full rounded-2xl bg-[#18201c] py-3 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition flex items-center justify-center gap-2"
                >
                  {activeTask.step === 'assigned'
                    ? 'Confirm Arrived at Restaurant →'
                    : activeTask.step === 'at_restaurant'
                      ? 'Confirm Order Picked Up →'
                      : 'Arrived at Customer Location →'}
                </button>
              ) : (
                <form
                  onSubmit={handleOtpSubmit}
                  className="space-y-3 rounded-2xl bg-amber-50 p-4 border border-amber-200"
                >
                  <label className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <KeyRound className="size-4 text-amber-600" /> Enter Customer 6-Digit Delivery
                    OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    className="w-full rounded-xl border border-amber-300 bg-white p-2.5 font-mono text-center text-base font-bold outline-none"
                  />
                  {otpError && <p className="text-[11px] font-bold text-rose-700">{otpError}</p>}
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="size-4" /> Verify OTP &amp; Complete Delivery
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-xs text-gray-600">
            No active delivery task. Driver is online and scanning for nearby order requests.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#18201c]">Recent trips</h3>
          <div className="mt-4 space-y-3">
            {completedTrips.length > 0 ? (
              completedTrips.map((trip) => (
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
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                No recent completed trips.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold text-[#18201c]">Payouts</h3>
          <div className="mt-4 space-y-3">
            {payoutLogs.length > 0 ? (
              payoutLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl bg-gray-50 p-3"
                >
                  <div>
                    <div className="font-bold text-[#18201c]">₹{log.amount}</div>
                    <div className="text-[11px] text-gray-500">{log.date}</div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                    {log.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-500">
                No payout logs recorded yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniCard({
  title,
  value,
  tone,
  icon,
}: {
  title: string
  value: string
  tone: 'green' | 'amber' | 'blue'
  icon: React.ReactNode
}) {
  const style = {
    green: 'bg-emerald-50 text-emerald-800',
    amber: 'bg-amber-50 text-amber-800',
    blue: 'bg-blue-50 text-blue-800',
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
          {title}
        </span>
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

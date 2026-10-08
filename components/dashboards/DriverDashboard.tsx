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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-[#1c2620] border border-[#2d3b32] p-6 shadow-2xl text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-[#25332a] pb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400">
                <Zap className="size-3.5 fill-current" /> New Order Request ({offerTimer}s)
              </span>
              <span className="font-mono text-xs font-bold text-[#9eb3a4]">
                {broadcastOffer.orderNumber}
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <h3 className="text-lg font-bold text-white">{broadcastOffer.restaurantName}</h3>
              <p className="text-[#9eb3a4] font-medium">
                Pickup: {broadcastOffer.restaurantAddress}
              </p>
              <div className="rounded-2xl bg-[#121815] border border-[#25332a] p-3 flex justify-between font-bold text-white">
                <span>Trip Distance:</span>
                <span className="text-sky-400">{broadcastOffer.distance}</span>
              </div>
              <div className="rounded-2xl bg-[#d9f447]/10 p-3 text-white space-y-1.5 border border-[#d9f447]/30">
                <div className="flex justify-between font-bold text-sm">
                  <span>Driver Trip Earnings:</span>
                  <span className="text-[#d9f447] font-extrabold text-base">
                    ₹{broadcastOffer.basePayout + broadcastOffer.surgeBonus + broadcastOffer.tip}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-[#9eb3a4] pt-1 border-t border-[#d9f447]/20 font-medium">
                  <span>Base Pay: ₹{broadcastOffer.basePayout}</span>
                  {broadcastOffer.surgeBonus > 0 && (
                    <span>Surge: +₹{broadcastOffer.surgeBonus}</span>
                  )}
                  {broadcastOffer.tip > 0 && (
                    <span className="font-bold text-[#d9f447]">Tip: +₹{broadcastOffer.tip}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => acceptBroadcastOffer()}
                className="w-full rounded-full bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition flex items-center justify-center gap-1"
              >
                Accept Order <ArrowRight className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => triggerSimulatedOffer()}
                className="w-full rounded-full border border-[#25332a] bg-[#121815] py-3 text-xs font-bold text-white hover:bg-[#25332a] transition"
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

      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-xl text-white">
        <div className="flex items-center justify-between border-b border-[#25332a] pb-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
              Active delivery workflow
            </p>
            <h3 className="mt-1 text-xl font-bold text-white">Fleet Order Status</h3>
          </div>
          <button
            type="button"
            onClick={triggerSimulatedOffer}
            className="rounded-full bg-[#d9f447] px-3.5 py-1.5 text-xs font-extrabold text-[#121815] hover:bg-[#c2dc3a] transition flex items-center gap-1.5"
          >
            <Sparkles className="size-3.5 text-[#121815]" /> Find Nearby Order
          </button>
        </div>

        {activeTask ? (
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl bg-[#121815] border border-[#25332a] p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-sky-400">
                    Order {activeTask.orderNumber}
                  </div>
                  <div className="mt-1 text-lg font-bold text-white">
                    {activeTask.restaurantName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-[#9eb3a4]">Trip payout</div>
                  <div className="mt-1 text-lg font-bold text-[#d9f447]">
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
            <div className="pt-3 border-t border-[#25332a] flex flex-col gap-3">
              {activeTask.step !== 'arrived_customer' ? (
                <button
                  type="button"
                  onClick={advanceStep}
                  className="w-full rounded-2xl bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-md hover:bg-[#c2dc3a] transition flex items-center justify-center gap-2"
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
                  className="space-y-3 rounded-2xl bg-[#121815] p-4 border border-[#25332a]"
                >
                  <label className="text-xs font-bold text-[#d9f447] flex items-center gap-1.5">
                    <KeyRound className="size-4 text-[#d9f447]" /> Enter Customer 6-Digit Delivery
                    OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 123456"
                    value={otpValue}
                    onChange={(e) => setOtpValue(e.target.value)}
                    className="w-full rounded-xl border border-[#25332a] bg-[#1c2620] p-2.5 font-mono text-center text-base font-bold text-white outline-none focus:border-[#d9f447]"
                  />
                  {otpError && <p className="text-[11px] font-bold text-rose-400">{otpError}</p>}
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#d9f447] py-3 text-xs font-extrabold text-[#121815] shadow-md hover:bg-[#c2dc3a] transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="size-4" /> Verify OTP &amp; Complete Delivery
                  </button>
                </form>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-[#25332a] bg-[#121815] p-6 text-center text-xs text-[#9eb3a4]">
            No active delivery task. Driver is online and scanning for nearby order requests.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-xl text-white">
          <h3 className="text-lg font-bold text-white">Recent trips</h3>
          <div className="mt-4 space-y-3">
            {completedTrips.length > 0 ? (
              completedTrips.map((trip) => (
                <div
                  key={trip.id}
                  className="rounded-2xl border border-[#25332a] bg-[#121815] p-3 text-white"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{trip.order}</div>
                      <div className="text-[11px] text-[#9eb3a4]">{trip.restaurant}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-[#d9f447]">₹{trip.total}</div>
                      <div className="text-[11px] text-[#9eb3a4]">{trip.time}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#25332a] bg-[#121815] p-4 text-center text-xs text-[#9eb3a4]">
                No recent completed trips.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-xl text-white">
          <h3 className="text-lg font-bold text-white">Payouts</h3>
          <div className="mt-4 space-y-3">
            {payoutLogs.length > 0 ? (
              payoutLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-2xl border border-[#25332a] bg-[#121815] p-3 text-white"
                >
                  <div>
                    <div className="font-bold text-white">₹{log.amount}</div>
                    <div className="text-[11px] text-[#9eb3a4]">{log.date}</div>
                  </div>
                  <span className="rounded-full bg-[#d9f447]/20 border border-[#d9f447]/40 px-2.5 py-1 text-[10px] font-bold text-[#d9f447]">
                    {log.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#25332a] bg-[#121815] p-4 text-center text-xs text-[#9eb3a4]">
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
    green: 'bg-[#d9f447]/20 text-[#d9f447] border border-[#d9f447]/30',
    amber: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    blue: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  }

  return (
    <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-4 shadow-xl text-white">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9eb3a4]">
          {title}
        </span>
        <span className={`grid size-8 place-items-center rounded-xl ${style[tone]}`}>{icon}</span>
      </div>
      <p className="mt-4 text-xl font-bold text-white">{value}</p>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#25332a] bg-[#121815] p-3 text-white">
      <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#9eb3a4]">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-sm font-bold text-white">{value}</div>
    </div>
  )
}

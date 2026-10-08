'use client'

import { useDriver } from '@/lib/driver-context'
import {
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquare,
  Navigation,
  PhoneCall,
  Power,
  Radio,
  Sparkles,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function DriverDashboardPage() {
  const {
    isOnline,
    setIsOnline,
    activeTask,
    triggerSimulatedOffer,
    advanceStep,
    completeDelivery,
  } = useDriver()

  const [otpInput, setOtpInput] = useState('')
  const [delayModalOpen, setDelayModalOpen] = useState(false)
  const [smsDrawerOpen, setSmsDrawerOpen] = useState(false)
  const [sentSmsMsg, setSentSmsMsg] = useState('')

  function sendQuickSms(templateText: string) {
    setSentSmsMsg(`SMS Sent to customer: "${templateText}"`)
    setTimeout(() => {
      setSentSmsMsg('')
      setSmsDrawerOpen(false)
    }, 2500)
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      {/* STATE A: DRIVER OFFLINE */}
      {!isOnline && (
        <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-8 shadow-xl text-center flex flex-col items-center justify-center min-h-[320px]">
          <div className="size-16 rounded-full bg-[#121815] border border-[#25332a] flex items-center justify-center text-[#9eb3a4] mb-4">
            <Power className="size-8" />
          </div>
          <h3 className="text-xl font-bold text-white">You're Currently Offline</h3>
          <p className="text-xs text-[#9eb3a4] max-w-sm mt-1.5">
            Turn your duty status ON to start receiving high-payout food delivery orders in your
            zone.
          </p>
          <button
            onClick={() => setIsOnline(true)}
            className="mt-6 rounded-full bg-[#d9f447] px-8 py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition"
          >
            Go Online &amp; Start Looking for Orders
          </button>
        </div>
      )}

      {/* STATE B: DRIVER ONLINE & SEARCHING FOR ORDERS */}
      {isOnline && !activeTask && (
        <div className="rounded-3xl border border-[#d9f447]/40 bg-[#1c2620] p-8 shadow-xl text-white flex flex-col items-center justify-center min-h-[340px] text-center relative overflow-hidden">
          {/* Pulsing Background Rings */}
          <div className="absolute size-64 rounded-full border border-[#d9f447]/20 animate-ping" />
          <div className="absolute size-48 rounded-full border border-[#d9f447]/30 animate-pulse" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="size-16 rounded-full bg-[#d9f447] text-[#121815] grid place-items-center shadow-lg mb-4 animate-bounce">
              <Radio className="size-8" />
            </div>
            <span className="rounded-full bg-[#d9f447]/20 px-3 py-1 text-[10px] font-extrabold uppercase text-[#d9f447] border border-[#d9f447]/40 tracking-wider">
              Radar Active • Searching Orders
            </span>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white">
              Looking for nearby delivery orders...
            </h3>
            <p className="mt-1.5 text-xs text-[#9eb3a4] max-w-md">
              Scanning kitchen queues in Indiranagar &amp; Koramangala. Stay online to receive
              instant delivery broadcast offers.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3 justify-center">
              <button
                onClick={triggerSimulatedOffer}
                className="rounded-full bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-[#121815] shadow-lg hover:bg-[#c2dc3a] transition flex items-center gap-2"
              >
                <Sparkles className="size-4" /> Find Nearby Order Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STATE C: ACTIVE ORDER WORKFLOW STEP PROGRESS */}
      {isOnline && activeTask && (
        <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-4 sm:p-6 shadow-xl text-white">
          {/* Active Order Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#25332a] pb-3 sm:pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-sky-500/20 border border-sky-500/40 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-extrabold text-sky-400 uppercase tracking-wider">
                  Active Task Workflow
                </span>
                <span className="text-xs font-bold text-[#d9f447] bg-[#d9f447]/10 px-2.5 py-0.5 rounded-full border border-[#d9f447]/30">
                  {activeTask.step === 'assigned' && 'Step 1: Going to Pickup'}
                  {activeTask.step === 'at_restaurant' && 'Step 2: Arrived at Kitchen'}
                  {activeTask.step === 'picked_up' && 'Step 3: En Route to Drop-off'}
                  {activeTask.step === 'arrived_customer' && 'Step 4: Customer Handoff'}
                </span>
              </div>
              <h3 className="mt-1 text-base sm:text-xl font-bold text-white truncate">
                Order {activeTask.orderNumber} ({activeTask.distance})
              </h3>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] sm:text-xs text-[#9eb3a4] font-semibold">Trip Payout</p>
              <p className="text-base sm:text-xl font-extrabold text-[#d9f447]">
                ₹{activeTask.payout + activeTask.tip}
              </p>
            </div>
          </div>

          {/* Step Visualizer Card Content */}
          <div className="mt-6 flex flex-col gap-5">
            {/* Step 1 & 2: Restaurant Pickup Section */}
            <div
              className={`rounded-2xl p-4 border transition ${
                activeTask.step === 'assigned' || activeTask.step === 'at_restaurant'
                  ? 'border-amber-500/50 bg-amber-500/10 shadow-sm'
                  : 'border-[#25332a] bg-[#121815]/60 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                    <MapPin className="size-3 text-amber-400" /> Kitchen Pickup Location
                  </span>
                  <h4 className="font-bold text-base text-white mt-0.5">
                    {activeTask.restaurantName}
                  </h4>
                  <p className="text-xs text-[#9eb3a4] mt-0.5">{activeTask.restaurantAddress}</p>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeTask.restaurantLat || 12.6817},${activeTask.restaurantLng || 77.4729}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 self-start rounded-full border border-amber-500/50 bg-[#121815] px-3.5 py-1.5 text-xs font-bold text-amber-300 flex items-center gap-1 shadow-sm hover:bg-amber-500/20"
                >
                  <Navigation className="size-3 text-amber-400" /> GPS Map
                </a>
              </div>

              {activeTask.step === 'at_restaurant' && (
                <div className="mt-3 pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-300 flex items-center gap-1">
                    <Clock3 className="size-3.5" /> Order is being prepared in kitchen
                  </span>
                  <button
                    onClick={() => setDelayModalOpen(true)}
                    className="text-[11px] font-bold text-rose-400 hover:underline"
                  >
                    Report Order Delay
                  </button>
                </div>
              )}
            </div>

            {/* Step 3 & 4: Customer Drop-off Section */}
            <div
              className={`rounded-2xl p-4 border transition ${
                activeTask.step === 'picked_up' || activeTask.step === 'arrived_customer'
                  ? 'border-sky-500/50 bg-sky-500/10 shadow-sm'
                  : 'border-[#25332a] bg-[#121815]/60 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1">
                    <User className="size-3 text-sky-400" /> Customer Delivery Doorstep
                  </span>
                  <h4 className="font-bold text-base text-white mt-0.5">
                    {activeTask.customerName}
                  </h4>
                  <p className="text-xs text-[#9eb3a4] mt-0.5">{activeTask.customerAddress}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSmsDrawerOpen(true)}
                    className="rounded-full border border-sky-500/50 bg-[#121815] px-3 py-1.5 text-xs font-bold text-sky-300 flex items-center gap-1 shadow-sm hover:bg-sky-500/20"
                  >
                    <MessageSquare className="size-3 text-sky-400" /> SMS
                  </button>
                  <a
                    href={`tel:${activeTask.customerPhone}`}
                    className="rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-bold text-slate-950 flex items-center gap-1 shadow-sm hover:bg-sky-400"
                  >
                    <PhoneCall className="size-3" /> Call
                  </a>
                </div>
              </div>

              {activeTask.step === 'arrived_customer' && (
                <div className="mt-4 pt-3 border-t border-sky-500/30 bg-[#121815] p-3.5 rounded-xl border border-[#25332a]">
                  <label className="block text-xs font-bold text-white mb-1">
                    Ask Customer for 6-Digit Delivery OTP:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-36 rounded-xl border border-sky-500/50 bg-[#1c2620] px-3 py-2 text-center text-base font-extrabold tracking-widest text-white outline-none focus:border-sky-400 font-mono"
                      placeholder="xxxxxx"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Primary Workflow CTA Action Button */}
            {activeTask.step === 'assigned' && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${activeTask.restaurantLat || 12.6817},${activeTask.restaurantLng || 77.4729}`}
                target="_blank"
                rel="noreferrer"
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-[#d9f447] py-3.5 text-xs font-extrabold text-[#121815] shadow-lg transition hover:bg-[#c2dc3a] flex items-center justify-center gap-2"
              >
                <Navigation className="size-4 text-[#121815]" /> Navigate to Pickup Kitchen
              </a>
            )}

            {activeTask.step === 'at_restaurant' && (
              <button
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-amber-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg transition hover:bg-amber-400 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-4 text-slate-950" /> Confirm Pickup &amp; Collect Bag
              </button>
            )}

            {activeTask.step === 'picked_up' && (
              <button
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-sky-500 py-3.5 text-xs font-extrabold text-slate-950 shadow-lg transition hover:bg-sky-400 flex items-center justify-center gap-2"
              >
                <Navigation className="size-4 text-slate-950" /> Arrived at Customer Doorstep
              </button>
            )}

            {activeTask.step === 'arrived_customer' && (
              <button
                onClick={() => {
                  const res = completeDelivery(otpInput)
                  if (!res.success) {
                    alert(res.message)
                  }
                }}
                className="mt-2 w-full rounded-full bg-[#d9f447] py-3.5 text-xs font-extrabold text-[#121815] shadow-lg transition hover:bg-[#c2dc3a] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-4 text-[#121815]" /> Verify OTP &amp; Complete
                Delivery
              </button>
            )}
          </div>
        </div>
      )}

      {/* KITCHEN DELAY MODAL */}
      {delayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-2xl text-left text-white">
            <div className="flex items-center justify-between border-b border-[#25332a] pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-white">Report Kitchen Delay</h3>
              <button
                onClick={() => setDelayModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-[#9eb3a4] mb-2.5">Select the reason for delay at kitchen:</p>

            <div className="flex flex-col gap-2 text-xs">
              {[
                'Order is still being cooked',
                'Kitchen is heavily rushed',
                'Packaging item missing',
                'Other delay reason',
              ].map((reason, idx) => (
                <button
                  key={idx}
                  onClick={() => setDelayModalOpen(false)}
                  className="rounded-xl border border-[#25332a] bg-[#121815] p-2.5 text-left font-semibold text-white hover:bg-[#25332a] hover:border-amber-400/50 transition"
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QUICK SMS TEMPLATE DRAWER */}
      {smsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-2xl text-left text-white">
            <div className="flex items-center justify-between border-b border-[#25332a] pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <MessageSquare className="size-4 text-sky-400" /> Send Quick Customer SMS
              </h3>
              <button
                onClick={() => setSmsDrawerOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {sentSmsMsg ? (
              <div className="rounded-2xl bg-sky-500/20 p-3.5 text-center text-xs font-bold text-sky-300 border border-sky-500/40">
                {sentSmsMsg}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  "I'm at the kitchen collecting your fresh food order!",
                  'On my way with your order! ETA ~10 minutes.',
                  'I have arrived at your building doorstep / lobby.',
                  'Please share your 6-digit OTP for order delivery.',
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuickSms(txt)}
                    className="rounded-xl border border-[#25332a] bg-[#121815] p-2.5 text-left text-xs font-medium text-white hover:bg-[#25332a] hover:border-sky-400/50 transition"
                  >
                    "{txt}"
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

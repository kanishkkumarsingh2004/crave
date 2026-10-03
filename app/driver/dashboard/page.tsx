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
import { useState } from 'react'

export default function DriverDashboardPage() {
  const {
    isOnline,
    setIsOnline,
    activeTask,
    triggerSimulatedOffer,
    advanceStep,
    completeDelivery,
  } = useDriver()

  const [otpInput, setOtpInput] = useState('4921')
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
        <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-md text-center flex flex-col items-center justify-center min-h-[320px]">
          <div className="size-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mb-4">
            <Power className="size-8" />
          </div>
          <h3 className="text-xl font-bold text-[#18201c]">You're Currently Offline</h3>
          <p className="text-xs text-[#737e77] max-w-sm mt-1.5">
            Turn your duty status ON to start receiving high-payout food delivery orders in your
            zone.
          </p>
          <button
            onClick={() => setIsOnline(true)}
            className="mt-6 rounded-full bg-emerald-600 px-8 py-3 text-xs font-bold text-white shadow-lg hover:bg-emerald-700 transition"
          >
            Go Online &amp; Start Looking for Orders
          </button>
        </div>
      )}

      {/* STATE B: DRIVER ONLINE & SEARCHING FOR ORDERS */}
      {isOnline && !activeTask && (
        <div className="rounded-3xl border border-[#d9f447] bg-[#121815] p-8 shadow-xl text-white flex flex-col items-center justify-center min-h-[340px] text-center relative overflow-hidden">
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
            <p className="mt-1.5 text-xs text-white/70 max-w-md">
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
        <div className="rounded-3xl border border-blue-200 bg-white p-4 sm:p-6 shadow-md">
          {/* Active Order Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0f3ec] pb-3 sm:pb-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-block rounded-full bg-blue-100 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-[10px] font-extrabold text-blue-800 uppercase tracking-wider">
                  Active Task Workflow
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {activeTask.step === 'assigned' && 'Step 1: Going to Pickup'}
                  {activeTask.step === 'at_restaurant' && 'Step 2: Arrived at Kitchen'}
                  {activeTask.step === 'picked_up' && 'Step 3: En Route to Drop-off'}
                  {activeTask.step === 'arrived_customer' && 'Step 4: Customer Handoff'}
                </span>
              </div>
              <h3 className="mt-1 text-base sm:text-xl font-bold text-[#18201c] truncate">
                Order {activeTask.orderNumber} ({activeTask.distance})
              </h3>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] sm:text-xs text-[#737e77] font-semibold">Trip Payout</p>
              <p className="text-base sm:text-xl font-extrabold text-emerald-700">
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
                  ? 'border-amber-400 bg-amber-50/70 shadow-sm'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <MapPin className="size-3 text-amber-600" /> Kitchen Pickup Location
                  </span>
                  <h4 className="font-bold text-base text-[#18201c] mt-0.5">
                    {activeTask.restaurantName}
                  </h4>
                  <p className="text-xs text-[#6e7771] mt-0.5">{activeTask.restaurantAddress}</p>
                </div>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(activeTask.restaurantAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 self-start rounded-full border border-amber-400 bg-white px-3.5 py-1.5 text-xs font-bold text-amber-900 flex items-center gap-1 shadow-sm hover:bg-amber-50"
                >
                  <Navigation className="size-3 text-amber-700" /> GPS Map
                </a>
              </div>

              {activeTask.step === 'at_restaurant' && (
                <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-900 flex items-center gap-1">
                    <Clock3 className="size-3.5" /> Order is being prepared in kitchen
                  </span>
                  <button
                    onClick={() => setDelayModalOpen(true)}
                    className="text-[11px] font-bold text-rose-700 hover:underline"
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
                  ? 'border-blue-400 bg-blue-50/70 shadow-sm'
                  : 'border-gray-200 bg-gray-50 opacity-60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                    <User className="size-3 text-blue-600" /> Customer Delivery Doorstep
                  </span>
                  <h4 className="font-bold text-base text-[#18201c] mt-0.5">
                    {activeTask.customerName}
                  </h4>
                  <p className="text-xs text-[#6e7771] mt-0.5">{activeTask.customerAddress}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSmsDrawerOpen(true)}
                    className="rounded-full border border-blue-300 bg-white px-3 py-1.5 text-xs font-bold text-blue-900 flex items-center gap-1 shadow-sm hover:bg-blue-50"
                  >
                    <MessageSquare className="size-3 text-blue-600" /> SMS
                  </button>
                  <a
                    href={`tel:${activeTask.customerPhone}`}
                    className="rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white flex items-center gap-1 shadow-sm hover:bg-blue-700"
                  >
                    <PhoneCall className="size-3" /> Call
                  </a>
                </div>
              </div>

              {activeTask.step === 'arrived_customer' && (
                <div className="mt-4 pt-3 border-t border-blue-200 bg-white p-3.5 rounded-xl border">
                  <label className="block text-xs font-bold text-[#18201c] mb-1">
                    Ask Customer for 4-Digit Delivery PIN:
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      maxLength={4}
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-32 rounded-xl border border-blue-300 px-3 py-2 text-center text-base font-extrabold tracking-widest outline-none focus:border-blue-600"
                      placeholder="4921"
                    />
                    <span className="text-xs text-[#737e77] font-medium">Default PIN: 4921</span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Workflow CTA Action Button */}
            {activeTask.step === 'assigned' && (
              <button
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-[#18201c] py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-[#323d36] flex items-center justify-center gap-2"
              >
                <Navigation className="size-4 text-[#d9f447]" /> Navigate to Pickup Kitchen
              </button>
            )}

            {activeTask.step === 'at_restaurant' && (
              <button
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-amber-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-amber-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-4 text-white" /> Confirm Pickup &amp; Collect Bag
              </button>
            )}

            {activeTask.step === 'picked_up' && (
              <button
                onClick={advanceStep}
                className="mt-2 w-full rounded-full bg-blue-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-blue-700 flex items-center justify-center gap-2"
              >
                <Navigation className="size-4 text-white" /> Arrived at Customer Doorstep
              </button>
            )}

            {activeTask.step === 'arrived_customer' && (
              <button
                onClick={() => completeDelivery()}
                className="mt-2 w-full rounded-full bg-emerald-600 py-3.5 text-xs font-bold text-white shadow-md transition hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="size-4 text-white" /> Verify PIN &amp; Complete Delivery
              </button>
            )}
          </div>
        </div>
      )}

      {/* KITCHEN DELAY MODAL */}
      {delayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c]">Report Kitchen Delay</h3>
              <button
                onClick={() => setDelayModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-2.5">Select the reason for delay at kitchen:</p>

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
                  className="rounded-xl border border-gray-200 p-2.5 text-left font-semibold text-[#18201c] hover:bg-amber-50 hover:border-amber-300 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <MessageSquare className="size-4 text-blue-600" /> Send Quick Customer SMS
              </h3>
              <button
                onClick={() => setSmsDrawerOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            {sentSmsMsg ? (
              <div className="rounded-2xl bg-blue-100 p-3.5 text-center text-xs font-bold text-blue-900 border border-blue-200">
                {sentSmsMsg}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {[
                  "I'm at the kitchen collecting your fresh food order!",
                  'On my way with your order! ETA ~10 minutes.',
                  'I have arrived at your building doorstep / lobby.',
                  'Please share your 4-digit PIN for order delivery.',
                ].map((txt, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendQuickSms(txt)}
                    className="rounded-xl border border-gray-200 p-2.5 text-left text-xs font-medium text-[#18201c] hover:bg-blue-50 hover:border-blue-300 transition"
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

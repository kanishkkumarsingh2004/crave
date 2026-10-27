'use client'

import {
  ArrowLeft,
  ArrowRight,
  Bike,
  Check,
  Compass,
  Copy,
  FileText,
  KeyRound,
  PhoneCall,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { CraveSpinner } from '@/components/ui/ModernPreloader'
import type { LatLngCoords } from './types'

const LiveDriverMap = dynamic(() => import('@/components/LiveDriverMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-72 w-full rounded-2xl bg-[#121815] border border-[#27342d] flex flex-col items-center justify-center gap-3 text-xs text-[#9eb3a4] font-bold">
      <CraveSpinner size="lg" variant="crave" />
      <span className="tracking-wider uppercase text-[11px] text-white">
        Connecting Live Rider GPS Map...
      </span>
    </div>
  ),
})

interface LiveOrderViewProps {
  activeOrder: any
  inProgressOrders: any[]
  deliveryAddress: string
  activeOrderEta: any
  cancelTimeRemaining: number
  liveDriverPos: LatLngCoords | null
  isDriverGpsStale: boolean
  selectedMapPin: LatLngCoords | null
  otpCopied: boolean
  onCopyOtp: (otp: string) => void
  onCancelOrder: (orderId: string) => void
  onSelectOrder: (orderId: string) => void
  onClearSelectedOrder: () => void
  onViewInvoice: (order: any) => void
  onNavigateToExplore: () => void
  onNavigateToOrders: () => void
  user: any
}

export default function LiveOrderView({
  activeOrder,
  inProgressOrders,
  deliveryAddress,
  activeOrderEta,
  cancelTimeRemaining,
  liveDriverPos,
  isDriverGpsStale,
  selectedMapPin,
  otpCopied,
  onCopyOtp,
  onCancelOrder,
  onSelectOrder,
  onClearSelectedOrder,
  onViewInvoice,
  onNavigateToExplore,
  onNavigateToOrders,
  user,
}: LiveOrderViewProps) {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-4 sm:gap-6 px-1 sm:px-0">
      {activeOrder ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="flex items-center justify-between px-1">
            <button
              onClick={onClearSelectedOrder}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white transition cursor-pointer"
            >
              <ArrowLeft className="size-4" />
              <span>All Active Orders</span>
            </button>
            <button
              onClick={onNavigateToExplore}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline transition cursor-pointer"
            >
              <UtensilsCrossed className="size-3.5" />
              <span>Browse Kitchens</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl sm:rounded-3xl border border-[#dfe5db] bg-white shadow-xl">
            {/* Header Banner */}
            <div className="bg-gradient-to-br from-[#18201c] via-[#222c27] to-[#18201c] p-4 sm:p-7 text-white relative overflow-hidden">
              <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[#d9f447]/10 blur-3xl pointer-events-none" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
                <div className="space-y-2.5 sm:space-y-3 min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-white/80 uppercase">
                      Order #
                      {typeof activeOrder.id === 'string' && activeOrder.id.length > 10
                        ? activeOrder.id.slice(0, 8).toUpperCase()
                        : activeOrder.id}
                    </span>
                    <span className="text-xs font-bold text-emerald-400">
                      {activeOrder.statusText || 'Order Confirmed'}
                    </span>
                    {activeOrder.otp && (
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        Delivery OTP: {activeOrder.otp}
                      </span>
                    )}
                    {cancelTimeRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => onCancelOrder(activeOrder.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 border border-rose-500/30 px-2.5 py-0.5 text-[11px] font-black text-rose-300 hover:bg-rose-500/30 transition cursor-pointer shrink-0"
                        title={`Order can be cancelled within 15 seconds (${cancelTimeRemaining}s remaining)`}
                      >
                        <Trash2 className="size-3 text-rose-300" /> Cancel Order ({cancelTimeRemaining}s)
                      </button>
                    )}
                    {(activeOrder.statusStep === 4 ||
                      activeOrder.rawStatus === 'delivered' ||
                      activeOrder.rawStatus === 'completed') && (
                      <button
                        type="button"
                        onClick={() =>
                          onViewInvoice({
                            id: activeOrder.id,
                            restaurantName: activeOrder.restaurantName,
                            customerName: user?.name || 'Customer',
                            customerAddress: deliveryAddress,
                            customerPhone: user?.phone,
                            timestamp: activeOrder.timestamp,
                            items: activeOrder.items,
                            subtotal: activeOrder.subtotal,
                            total: activeOrder.total,
                            paymentMethod: 'Razorpay Online',
                            otp: activeOrder.otp,
                            status: activeOrder.statusText,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#d9f447] hover:bg-[#b8d629] px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-black text-[#18201c] shadow-md transition cursor-pointer shrink-0"
                      >
                        <FileText className="size-3 sm:size-3.5 text-[#18201c]" /> View Tax Invoice
                      </button>
                    )}
                  </div>

                  <div>
                    <h2 className="text-xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                      {activeOrder.restaurantName}
                    </h2>
                    <p className="mt-1 text-[11px] sm:text-xs text-white/70 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span>Placed at {activeOrder.timestamp}</span>
                      <span>•</span>
                      <span className="font-semibold text-white">Total ₹{activeOrder.total}</span>
                      {activeOrder.items && activeOrder.items.length > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {activeOrder.items.length} {activeOrder.items.length === 1 ? 'item' : 'items'}
                          </span>
                        </>
                      )}
                      {activeOrderEta && activeOrderEta.distanceKm > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-[#d9f447] font-semibold">
                            {activeOrderEta.distanceKm <= 20
                              ? `${activeOrderEta.distanceKm} km from kitchen`
                              : 'City Express Delivery'}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl sm:rounded-2xl bg-white/10 border border-white/10 backdrop-blur-md p-3 sm:px-5 sm:py-3 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shadow-inner text-right min-w-[140px]">
                  <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[#d9f447]">
                    Estimated Delivery
                  </p>
                  <p className="text-lg sm:text-2xl font-black text-white sm:mt-0.5 tracking-tight">
                    {activeOrder.statusStep === 4 ? 'Delivered' : activeOrderEta?.displayText || '25 mins'}
                  </p>
                  {activeOrder.statusStep !== 4 && activeOrderEta?.arrivalSubtitle && (
                    <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-300 sm:mt-0.5">
                      {activeOrderEta.arrivalSubtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 15-Second Instant Cancellation Grace Window */}
            {cancelTimeRemaining > 0 ? (
              <div className="bg-gradient-to-r from-rose-950/90 via-zinc-900 to-rose-950/90 border-b border-rose-500/30 p-3.5 sm:px-6 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-white backdrop-blur-md">
                <div className="flex items-center gap-3.5">
                  <div className="relative size-12 sm:size-14 shrink-0 grid place-items-center">
                    <svg className="size-full -rotate-90 transform" viewBox="0 0 44 44">
                      <circle cx="22" cy="22" r="18" className="stroke-white/15 fill-none" strokeWidth="3.5" />
                      <circle
                        cx="22"
                        cy="22"
                        r="18"
                        className="stroke-rose-400 fill-none transition-all duration-1000 ease-linear"
                        strokeWidth="3.5"
                        strokeDasharray={113.1}
                        strokeDashoffset={113.1 * (1 - cancelTimeRemaining / 15)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute font-mono font-black text-xs sm:text-sm text-rose-300">
                      {cancelTimeRemaining}s
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-rose-400 animate-ping" />
                      <p className="text-xs sm:text-sm font-black text-rose-200 tracking-tight">
                        15-Second Cancellation Window Active
                      </p>
                    </div>
                    <p className="text-[11px] text-white/70 mt-0.5 max-w-lg leading-relaxed">
                      Cancel now for an immediate refund routed directly to our admin settlement queue.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelOrder(activeOrder.id)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-500 px-4 py-2 sm:py-2.5 text-xs font-black text-white shadow-lg shadow-rose-950/50 hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="size-3.5 text-white" />
                  <span>Cancel Order &amp; Refund</span>
                </button>
              </div>
            ) : activeOrder.statusStep < 4 ? (
              <div className="bg-[#121815] border-b border-[#27342d] px-4 py-2 sm:px-6 flex items-center justify-between gap-2 text-white">
                <div className="flex items-center gap-2 text-[11px] text-gray-300">
                  <span className="text-emerald-400 font-extrabold flex items-center gap-1.5">
                    <span className="size-1.5 rounded-full bg-emerald-400" />
                    Kitchen Locked
                  </span>
                  <span className="text-gray-400">•</span>
                  <span>Food is actively being prepared fresh. 15-second grace window concluded.</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider hidden sm:inline font-mono">
                  Freshness Guaranteed
                </span>
              </div>
            ) : null}

            {/* Stepper Section */}
            <div className="p-4 sm:p-8 border-b border-gray-100 dark:border-[#27342d] bg-white dark:bg-[#18201c]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 sm:mb-8">
                <div>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-[#d9f447]">
                    Live Order Progress
                  </p>
                  <h3 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white mt-0.5 flex items-center gap-2">
                    <span>{activeOrder.statusText}</span>
                  </h3>
                </div>
                <span className="self-start sm:self-center text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-1.5 shadow-xs">
                  <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-ping" />
                  Step {activeOrder.statusStep} of 4
                </span>
              </div>

              <div className="relative max-w-3xl mx-auto px-2 py-4">
                <div className="absolute top-[26px] sm:top-[30px] left-8 right-8 sm:left-12 sm:right-12 h-1.5 bg-gray-100 dark:bg-[#253229] rounded-full z-0 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-700 ease-out shadow-sm"
                    style={{
                      width: `${((Math.max(1, Math.min(activeOrder.statusStep, 4)) - 1) / 3) * 100}%`,
                    }}
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 text-center relative z-10">
                  {[
                    { num: 1, title: 'Confirmed', desc: 'Order Placed' },
                    { num: 2, title: 'Cooking', desc: 'Preparing Food' },
                    { num: 3, title: 'On the Way', desc: 'Out for Delivery' },
                    { num: 4, title: 'Delivered', desc: 'At Doorstep' },
                  ].map((step) => {
                    const isDone = activeOrder.statusStep > step.num
                    const isCurrent = activeOrder.statusStep === step.num
                    const isPassedOrCurrent = activeOrder.statusStep >= step.num

                    return (
                      <div key={step.num} className="flex flex-col items-center group">
                        <div
                          className={`grid size-9 sm:size-12 place-items-center rounded-full font-black text-xs sm:text-sm transition-all duration-300 shadow-md ${
                            isDone
                              ? 'bg-emerald-500 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/20 dark:ring-[#d9f447]/30 scale-105'
                              : isCurrent
                                ? 'bg-emerald-600 dark:bg-[#d9f447] text-white dark:text-[#0d1310] ring-4 ring-emerald-500/30 dark:ring-[#d9f447]/40 scale-110 font-black shadow-lg animate-pulse'
                                : 'bg-white dark:bg-[#121815] border-2 border-gray-200 dark:border-[#28372e] text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          {isDone ? <Check className="size-4 sm:size-6 stroke-[3]" /> : <span>{step.num}</span>}
                        </div>
                        <div className="mt-2.5 sm:mt-3.5 space-y-0.5">
                          <p
                            className={`text-xs sm:text-sm font-extrabold transition-colors leading-tight ${
                              isPassedOrCurrent ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                            }`}
                          >
                            {step.title}
                          </p>
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Live Driver Map */}
            <div className="p-4 sm:p-6 bg-[#f8f9f6] dark:bg-[#151c18] border-b border-gray-200 dark:border-[#27342d] flex flex-col gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white flex items-center gap-2">
                    <Compass className="size-4 sm:size-5 text-emerald-600 dark:text-[#d9f447]" />
                    Live Rider Delivery Route
                  </h4>
                  <p className="text-[11px] sm:text-xs text-[#737e77] dark:text-gray-400 mt-0.5">
                    {activeOrder.driverName && activeOrder.driverName !== 'Unassigned'
                      ? `Tracking rider moving live on road from kitchen counter to ${deliveryAddress}.`
                      : 'Live GPS route mapping will activate once a driver accepts your pickup.'}
                  </p>
                </div>
              </div>

              {activeOrder.driverName && activeOrder.driverName !== 'Unassigned' ? (
                <LiveDriverMap
                  restaurantName={activeOrder.restaurantName || activeOrder.restaurant?.name || activeOrder.restaurant_name || 'Crave Kitchen Store'}
                  driverName={activeOrder.driverName || activeOrder.driver_name}
                  statusStep={activeOrder.statusStep}
                  driverLat={liveDriverPos?.lat ?? (activeOrder.driverLat ? Number(activeOrder.driverLat) : null)}
                  driverLng={liveDriverPos?.lng ?? (activeOrder.driverLng ? Number(activeOrder.driverLng) : null)}
                  restaurantLat={Number(activeOrder.restaurantLat ?? activeOrder.restaurant?.latitude ?? 12.9716)}
                  restaurantLng={Number(activeOrder.restaurantLng ?? activeOrder.restaurant?.longitude ?? 77.6412)}
                  customerLat={Number(activeOrder.customerLat ?? activeOrder.delivery_latitude ?? selectedMapPin?.lat ?? 12.9716)}
                  customerLng={Number(activeOrder.customerLng ?? activeOrder.delivery_longitude ?? selectedMapPin?.lng ?? 77.5946)}
                  isStale={isDriverGpsStale}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-gray-300 dark:border-[#28372e] bg-white dark:bg-[#121815] p-6 sm:p-8 text-center flex flex-col items-center justify-center gap-2.5 sm:gap-3 shadow-xs">
                  <div className="size-11 sm:size-12 rounded-2xl bg-[#f0f5db] dark:bg-[#d9f447]/10 text-[#7f9815] dark:text-[#d9f447] flex items-center justify-center shadow-xs">
                    <Bike className="size-5 sm:size-6 animate-pulse" />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white">
                      Awaiting Driver Acceptance
                    </h5>
                    <p className="text-[11px] sm:text-xs text-[#737e77] dark:text-gray-400 max-w-md mt-1 leading-relaxed">
                      Your order is confirmed and being prepared. The live GPS map will be displayed as soon as a delivery partner accepts the request.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Partner */}
            <div className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-[#18201c]">
              <div className="flex items-center gap-3">
                <div className="grid size-10 sm:size-12 place-items-center rounded-xl sm:rounded-2xl bg-[#18201c] dark:bg-[#27342d] text-white shrink-0 shadow-md">
                  <Bike className="size-5 sm:size-6 text-[#d9f447]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-[#737e77] dark:text-gray-400">
                    Assigned Delivery Partner
                  </p>
                  <p className="font-extrabold text-xs sm:text-sm text-[#18201c] dark:text-white mt-0.5 truncate">
                    {activeOrder.driverName || 'Awaiting driver assignment'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                {activeOrder.driverPhone ? (
                  <a
                    href={`tel:${activeOrder.driverPhone}`}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-[#d8ded4] dark:border-[#27342d] bg-[#18201c] dark:bg-[#d9f447] px-4 sm:px-5 py-2.5 text-xs font-bold text-white dark:text-[#18201c] hover:bg-[#2e3b34] dark:hover:bg-[#c8e434] transition shadow-sm"
                  >
                    <PhoneCall className="size-3.5 text-[#d9f447] dark:text-[#18201c]" />
                    Call Partner
                  </a>
                ) : (
                  <span className="text-[11px] sm:text-xs text-gray-400 italic">
                    Contact details available upon pickup
                  </span>
                )}
              </div>
            </div>

            {/* Confidential Delivery OTP */}
            {activeOrder.otp && (
              <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-[#27342d] bg-gradient-to-r from-[#f7faef] via-white to-[#f7faef] dark:from-[#1b251e] dark:via-[#161f19] dark:to-[#1b251e] flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-b-3xl">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-11 place-items-center rounded-2xl bg-[#d9f447] text-[#18201c] shrink-0 shadow-md">
                    <KeyRound className="size-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-black uppercase text-[#5e8210] dark:text-[#d9f447] tracking-wider">
                        Delivery Verification OTP
                      </span>
                      <span className="rounded-full bg-emerald-500/10 dark:bg-[#d9f447]/10 text-emerald-700 dark:text-[#d9f447] text-[9px] font-extrabold px-2 py-0.5 border border-emerald-500/20 dark:border-[#d9f447]/30">
                        CONFIDENTIAL
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-[#18201c] dark:text-gray-200 mt-0.5 leading-relaxed">
                      Share this 6-digit code only upon driver arrival with your food
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                  <div className="flex items-center gap-1 sm:gap-1.5" aria-label="Delivery OTP digits">
                    {String(activeOrder.otp)
                      .padStart(6, '0')
                      .split('')
                      .map((digit, i) => (
                        <span
                          key={i}
                          className="grid size-8 sm:size-9 place-items-center rounded-xl bg-white dark:bg-[#101713] border-2 border-emerald-500/30 dark:border-[#d9f447]/40 font-mono font-black text-sm sm:text-base text-emerald-700 dark:text-[#d9f447] shadow-sm select-all"
                        >
                          {digit}
                        </span>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopyOtp(activeOrder.otp)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#18201c] border border-gray-200 dark:border-[#27342d] px-3 py-2 text-xs font-black text-[#18201c] dark:text-white hover:bg-gray-50 dark:hover:bg-[#232f28] active:scale-95 transition shadow-xs cursor-pointer ml-1"
                    title="Copy OTP to clipboard"
                  >
                    {otpCopied ? (
                      <>
                        <Check className="size-3.5 text-emerald-500 stroke-[3]" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-gray-500" />
                        <span>Copy OTP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Handover confirmed */}
            {!activeOrder.otp && activeOrder.otpConsumed && (
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-[#27342d] bg-[#f7faef] dark:bg-[#1f2822] flex items-center gap-3 rounded-b-3xl">
                <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                    Delivery Verified
                  </p>
                  <p className="text-xs font-bold text-[#18201c] dark:text-gray-200 mt-0.5">
                    Your delivery code was verified — the order was handed over successfully
                  </p>
                </div>
              </div>
            )}

            {/* Order Delivered Action */}
            {(activeOrder.statusStep >= 4 ||
              activeOrder.status === 'delivered' ||
              activeOrder.status === 'completed') && (
              <div className="p-5 sm:p-6 border-t border-gray-100 dark:border-[#27342d] bg-[#f8f9f6] dark:bg-[#151c18] flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-b-3xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <h4 className="text-sm font-black text-[#18201c] dark:text-white">Order Delivered Successfully</h4>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Hope you enjoyed your meal!</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={onNavigateToExplore}
                    className="px-5 py-2.5 rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] text-xs font-black shadow-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UtensilsCrossed className="size-3.5" />
                    <span>Explore Kitchens & Order Again</span>
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToOrders}
                    className="px-4 py-2.5 rounded-xl border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/5 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-black/5 dark:hover:bg-white/10 backdrop-blur-sm active:scale-95 transition-all cursor-pointer"
                  >
                    <span>All Orders</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : inProgressOrders.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-[#dfe5db] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm sm:text-base text-[#18201c] dark:text-white">
              Active Orders Under Process ({inProgressOrders.length})
            </h3>
            <span className="text-[10px] sm:text-xs text-gray-500 font-medium hidden sm:inline">
              Click an order to view live map &amp; status
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inProgressOrders.map((ord: any) => {
              let itemsArr: any[] = []
              try {
                itemsArr = typeof ord.items === 'string' ? JSON.parse(ord.items || '[]') : ord.items || []
              } catch {}

              const ordStatusText = ord.status?.replace(/_/g, ' ') || 'In Progress'

              return (
                <div
                  key={ord.id}
                  onClick={() => onSelectOrder(String(ord.id))}
                  className="p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 bg-[#f8f9f6] text-[#18201c] border-[#e1e6df] hover:border-gray-300 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0">
                      <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gray-400">
                        Order #{String(ord.id).slice(0, 8).toUpperCase()}
                      </p>
                      <h4 className="font-extrabold text-xs sm:text-sm truncate mt-0.5">
                        {ord.restaurant_name || ord.restaurantName || 'Crave Kitchen Store'}
                      </h4>
                    </div>
                    <span className="text-xs font-bold shrink-0 text-emerald-600 dark:text-emerald-400 capitalize">
                      {ordStatusText}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-2.5 text-xs">
                    <div className="min-w-0 flex flex-col text-gray-500">
                      <span>{itemsArr.length} items &bull; ₹{ord.total_amount || ord.subtotal || 0}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onSelectOrder(String(ord.id))
                      }}
                      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold transition shadow-xs shrink-0 bg-[#18201c] text-white hover:bg-[#2e3b34] cursor-pointer"
                    >
                      <Bike className="size-3" />
                      <span>Track</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-[#e1e6df] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-12 text-center text-[#18201c] dark:text-white">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#f0f5db] dark:bg-[#27342d] text-[#7f9815] dark:text-[#d9f447]">
            <ShoppingBag className="size-8" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-[#18201c] dark:text-white">No Active Order Right Now</h3>
          <p className="mt-1 text-xs text-[#747e78] dark:text-gray-300 max-w-sm mx-auto">
            Browse delicious dishes and place an order to see live delivery tracking here.
          </p>
          <button
            onClick={onNavigateToExplore}
            className="mt-6 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-bold text-white dark:text-[#18201c] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c8e434] transition cursor-pointer"
          >
            Explore Kitchens
          </button>
        </div>
      )}
    </div>
  )
}

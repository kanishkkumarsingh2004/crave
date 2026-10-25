'use client'

import AppleSlider from '@/components/ui/AppleSlider'
import AppleToggle from '@/components/ui/AppleToggle'
import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'
import { loadPaymentConfig, PaymentConfig, savePaymentConfig } from '@/lib/payment-config'
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CloudRain,
  Coins,
  CreditCard,
  Flame,
  Layers,
  Moon,
  Package,
  Percent,
  Receipt,
  Save,
  ShieldCheck,
  Sliders,
  Sparkles,
  Store,
  TrendingUp,
  Truck,
  Wallet,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

function handleNumInput(val: string): number | '' {
  if (val === '') return ''
  const parsed = parseFloat(val)
  return isNaN(parsed) ? '' : parsed
}

function getNum(val: number | '' | undefined | null): number {
  if (typeof val === 'number' && !isNaN(val)) return val
  if (typeof val === 'string') {
    const p = parseFloat(val)
    return isNaN(p) ? 0 : p
  }
  return 0
}

export default function AdminPaymentConfigPage() {
  // 1. Payee & Business Identity
  const [upiVpa, setUpiVpa] = useState('crave@upi')
  const [merchantName, setMerchantName] = useState('crave. Hyperlocal Delivery')
  const [thankYouMessage, setThankYouMessage] = useState(
    'Thank you for ordering with crave! Your payment has been received and your order is being prepared.'
  )
  const [mccCode, setMccCode] = useState('5812')
  const [ifscCode, setIfscCode] = useState('HDFC0001234')
  const [accountNumber, setAccountNumber] = useState('50100293849281')

  // 2. Platform & Revenue Rates
  const [platformFee, setPlatformFee] = useState<number | ''>(6)
  const [handlingFee, setHandlingFee] = useState<number | ''>(5)
  const [vendorCommission, setVendorCommission] = useState<number | ''>(15)
  const [packagingCap, setPackagingCap] = useState<number | ''>(20)
  const [gstRatePercent, setGstRatePercent] = useState<number | ''>(18)

  // 3. Delivery Fee Rules
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number | ''>(30)
  const [baseDistanceKm, setBaseDistanceKm] = useState<number | ''>(3)
  const [perKmRate, setPerKmRate] = useState<number | ''>(10)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | ''>(500)
  const [driverPayoutShare, setDriverPayoutShare] = useState<number>(80)

  // 4. Surge & Weather Surcharges
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0)
  const [rainFee, setRainFee] = useState<number | ''>(20)
  const [nightSurgeFee, setNightSurgeFee] = useState<number | ''>(15)
  const [isRainModeActive, setIsRainModeActive] = useState<boolean>(false)
  const [isNightSurgeActive, setIsNightSurgeActive] = useState<boolean>(false)

  // 5. Payment Options & Gateway Controls
  const [enableCashOnDelivery, setEnableCashOnDelivery] = useState(false)
  const [enableUpiDeepLink, setEnableUpiDeepLink] = useState(true)
  const [requireUtrNumber, setRequireUtrNumber] = useState(false)
  const [razorpayEnabled, setRazorpayEnabled] = useState(true)
  const [razorpayRouteEnabled, setRazorpayRouteEnabled] = useState(true)
  const [razorpayTransferRelease, setRazorpayTransferRelease] = useState<
    'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'
  >('DELIVERY_COMPLETE')
  const [razorpayEnvEnabled, setRazorpayEnvEnabled] = useState(true)
  const [razorpayRouteEnvEnabled, setRazorpayRouteEnvEnabled] = useState(true)

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // 6. Interactive Simulator State
  const [testOrderValue, setTestOrderValue] = useState<number>(450)
  const [testDistanceKm, setTestDistanceKm] = useState<number>(4.2)

  // Load saved configuration on mount
  useEffect(() => {
    loadPaymentConfig().then((cfg) => {
      setUpiVpa(cfg.upiVpa || 'crave@upi')
      setMerchantName(cfg.merchantName || 'crave. Hyperlocal Delivery')
      setThankYouMessage(
        cfg.thankYouMessage ||
          'Thank you for ordering with crave! Your payment has been received and your order is being prepared.'
      )
      setMccCode(cfg.mccCode || '5812')
      setIfscCode(cfg.ifscCode || '')
      setAccountNumber(cfg.accountNumber || '')
      setPlatformFee(cfg.platformFee ?? 6)
      setHandlingFee(cfg.handlingFee ?? 5)
      setVendorCommission(cfg.vendorCommission ?? 15)
      setPackagingCap(cfg.packagingCap ?? 20)
      setGstRatePercent(cfg.gstRatePercent ?? 18)
      setBaseDeliveryFee(cfg.baseDeliveryFee ?? 30)
      setBaseDistanceKm(cfg.baseDistanceKm ?? 3)
      setPerKmRate(cfg.perKmRate ?? 10)
      setFreeDeliveryThreshold(cfg.freeDeliveryThreshold ?? 500)
      setDriverPayoutShare(cfg.driverPayoutShare ?? 80)
      setSurgeMultiplier(cfg.surgeMultiplier ?? 1.0)
      setRainFee(cfg.rainFee ?? 20)
      setNightSurgeFee(cfg.nightSurgeFee ?? 15)
      setIsRainModeActive(Boolean(cfg.isRainModeActive))
      setIsNightSurgeActive(Boolean(cfg.isNightSurgeActive))
      setEnableCashOnDelivery(Boolean(cfg.enableCashOnDelivery))
      setEnableUpiDeepLink(Boolean(cfg.enableUpiDeepLink ?? true))
      setRequireUtrNumber(Boolean(cfg.requireUtrNumber))
      setRazorpayEnabled(Boolean(cfg.razorpayEnabled ?? true))
      setRazorpayRouteEnabled(Boolean(cfg.razorpayRouteEnabled ?? true))
      setRazorpayTransferRelease(cfg.razorpayTransferRelease ?? 'DELIVERY_COMPLETE')
      setRazorpayEnvEnabled(Boolean((cfg as any).razorpayEnvEnabled ?? true))
      setRazorpayRouteEnvEnabled(Boolean((cfg as any).razorpayRouteEnvEnabled ?? true))
    })
  }, [])

  // Live Playground Calculation
  const playgroundCalc = useMemo(() => {
    const input: CalculatorInput = {
      subtotal: testOrderValue,
      distanceKm: testDistanceKm,
      packagingFee: getNum(packagingCap),
      platformFee: getNum(platformFee),
      handlingFee: getNum(handlingFee),
      vendorCommissionPercent: getNum(vendorCommission),
      baseDeliveryFee: getNum(baseDeliveryFee),
      baseDistanceKm: getNum(baseDistanceKm),
      perKmRate: getNum(perKmRate),
      freeDeliveryThreshold: getNum(freeDeliveryThreshold),
      driverPayoutSharePercent: driverPayoutShare,
      surgeMultiplier,
      rainFee: getNum(rainFee),
      nightSurgeFee: getNum(nightSurgeFee),
      isRainModeActive,
      isNightSurgeActive,
      gstRatePercent: gstRatePercent === '' ? 18 : getNum(gstRatePercent),
      priceTaxMode: 'TAX_INCLUSIVE',
    }

    const calc = calculateFullBreakdown(input)
    const b = calc.customerBilling
    const v = calc.vendorSettlement
    const d = calc.driverEarnings
    const p = calc.platformEconomics

    const rawDelivery = b.baseDeliveryFee + b.extraDistanceFee
    const surgeAddon = b.surgeFee + b.rainFee + b.nightSurgeFee

    return {
      rawDelivery,
      extraDistanceFee: b.extraDistanceFee,
      isFreeDelivery: b.isFreeDelivery,
      finalDeliveryFee: b.netDeliveryFee,
      surgeAddon,
      totalDeliveryCharges: b.netDeliveryFee,
      handlingFee: b.handlingFee,
      platformFee: b.platformFee,
      packagingFee: b.packagingFee,
      gstAmount: b.gstAmount,
      customerTotal: b.grandTotal,
      vendorCommissionAmount: v.commissionDeducted,
      vendorPayout: v.netVendorPayout,
      driverPayout: d.totalDriverEarnings,
      platformNetProfit: p.platformNetProfit,
      platformMarginPct: p.profitMarginPercent,
    }
  }, [
    testOrderValue,
    testDistanceKm,
    platformFee,
    handlingFee,
    vendorCommission,
    packagingCap,
    gstRatePercent,
    baseDeliveryFee,
    baseDistanceKm,
    perKmRate,
    freeDeliveryThreshold,
    driverPayoutShare,
    surgeMultiplier,
    rainFee,
    nightSurgeFee,
    isRainModeActive,
    isNightSurgeActive,
  ])

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setSaveError('')
    const fullConfig: PaymentConfig = {
      upiVpa,
      merchantName,
      thankYouMessage,
      mccCode,
      ifscCode,
      accountNumber,
      platformFee: getNum(platformFee),
      handlingFee: getNum(handlingFee),
      vendorCommission: getNum(vendorCommission),
      packagingCap: getNum(packagingCap),
      gstRatePercent: gstRatePercent === '' ? 18 : getNum(gstRatePercent),
      baseDeliveryFee: getNum(baseDeliveryFee),
      baseDistanceKm: getNum(baseDistanceKm),
      perKmRate: getNum(perKmRate),
      freeDeliveryThreshold: getNum(freeDeliveryThreshold),
      driverPayoutShare,
      surgeMultiplier,
      rainFee: getNum(rainFee),
      nightSurgeFee: getNum(nightSurgeFee),
      isRainModeActive,
      isNightSurgeActive,
      enableCashOnDelivery,
      enableUpiDeepLink,
      requireUtrNumber,
      razorpayEnabled,
      razorpayRouteEnabled,
      razorpayTransferRelease,
    }

    const saved = await savePaymentConfig(fullConfig)
    setIsSaving(false)
    if (!saved) {
      setSavedSuccess(false)
      setSaveError('Configuration update was rejected by server. Please try again.')
      return
    }
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
    }, 3500)
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
      {/* Executive Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] dark:border-[#222c26] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#86a018]/15 dark:bg-[#d9f447]/10 border border-[#86a018]/30 dark:border-[#d9f447]/20 text-[11px] font-extrabold uppercase tracking-widest text-[#5e730f] dark:text-[#d9f447]">
            <span className="size-1.5 rounded-full bg-[#86a018] dark:bg-[#d9f447] animate-pulse" />
            Executive Financial Controls
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18201c] dark:text-white">
            Payment & Pricing Engine
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#63716a] dark:text-[#97a59d]">
            Configure customer platform fees, delivery tariffs, restaurant revenue split, surge
            rules, and gateway settlements.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 px-4 py-2.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Pricing & fee engine synchronized successfully across all apps</span>
          </div>
        )}
        {saveError && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/70 px-4 py-2.5 text-xs font-bold text-rose-800 dark:text-rose-200 shadow-sm">
            <AlertCircle className="size-4.5 text-rose-600 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12 items-start">
        {/* Form Settings Area (Left 7 Cols) */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 flex flex-col gap-6">
          {/* SECTION 1: Platform Service Fees & Revenue Architecture */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-[#86a018]/15 dark:bg-[#d9f447]/15 text-[#5e730f] dark:text-[#d9f447]">
                <Percent className="size-4" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
                  Platform Service Fees & Revenue Split
                </h2>
                <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
                  Set baseline order convenience fees, kitchen commission, packaging limits, and GST
                  rate.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              {/* Platform Service Fee */}
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18201c] dark:text-white">Platform Fee</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#86a018]/15 text-[#5e730f] dark:text-[#d9f447]">
                      Per Order
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
                    Flat convenience charge retained by platform
                  </p>
                </div>
                <div className="mt-3 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={platformFee}
                    onChange={(e) => setPlatformFee(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
                  />
                </div>
              </div>

              {/* Handling Charge */}
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18201c] dark:text-white">
                      Handling Charge
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      Processing
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
                    Gateway & secure checkout handling fee
                  </p>
                </div>
                <div className="mt-3 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={handlingFee}
                    onChange={(e) => setHandlingFee(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
                  />
                </div>
              </div>

              {/* Vendor Commission */}
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18201c] dark:text-white">Vendor Cut</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Commission
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
                    % cut from partner restaurant food subtotal
                  </p>
                </div>
                <div className="mt-3 relative">
                  <input
                    type="number"
                    value={vendorCommission}
                    onChange={(e) => setVendorCommission(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-8 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    %
                  </span>
                </div>
              </div>

              {/* Max Packaging Cap */}
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18201c] dark:text-white">Packaging Cap</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-500/10 text-stone-600 dark:text-stone-400">
                      Container
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
                    Maximum container charge per order
                  </p>
                </div>
                <div className="mt-3 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={packagingCap}
                    onChange={(e) => setPackagingCap(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
                  />
                </div>
              </div>

              {/* Default GST Rate */}
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#18201c] dark:text-white">
                      Default GST Rate
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      Standard
                    </span>
                  </div>
                  <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-1">
                    Restaurant services tax standard (5% / 18%)
                  </p>
                </div>
                <div className="mt-3 relative">
                  <input
                    type="number"
                    value={gstRatePercent}
                    onChange={(e) => setGstRatePercent(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-8 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] transition"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Delivery Charges Configuration */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Truck className="size-4" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
                  Distance-Based Delivery Engine
                </h2>
                <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
                  Distance fare structure, free delivery threshold, and driver payout allocation.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
                <label className="font-bold text-[#18201c] dark:text-white block">
                  Base Delivery Fee
                </label>
                <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
                  Fixed charge for first {getNum(baseDistanceKm)} km
                </p>
                <div className="mt-2.5 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={baseDeliveryFee}
                    onChange={(e) => setBaseDeliveryFee(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
                <label className="font-bold text-[#18201c] dark:text-white block">
                  Base Distance Radius
                </label>
                <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
                  Distance covered in base delivery fare
                </p>
                <div className="mt-2.5 relative">
                  <input
                    type="number"
                    value={baseDistanceKm}
                    onChange={(e) => setBaseDistanceKm(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-3.5 pr-10 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#88968e]">
                    km
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
                <label className="font-bold text-[#18201c] dark:text-white block">
                  Per-KM Rate Beyond Base
                </label>
                <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
                  Extra fee added per additional road km
                </p>
                <div className="mt-2.5 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={perKmRate}
                    onChange={(e) => setPerKmRate(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-12 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#88968e]">
                    /km
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] bg-[#fbfcfb] dark:bg-[#0e1310] p-4">
                <label className="font-bold text-[#18201c] dark:text-white block">
                  Free Delivery Threshold
                </label>
                <p className="text-[11px] text-[#717f77] dark:text-[#88968e] mt-0.5">
                  Qualifying order subtotal for free delivery
                </p>
                <div className="mt-2.5 relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-[#88968e]">
                    ₹
                  </span>
                  <input
                    type="number"
                    value={freeDeliveryThreshold}
                    onChange={(e) => setFreeDeliveryThreshold(handleNumInput(e.target.value))}
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white pl-8 pr-3.5 py-2.5 font-extrabold text-sm outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 pt-2">
                <AppleSlider
                  label="Driver Delivery Fee Share"
                  unit="%"
                  value={driverPayoutShare}
                  min={50}
                  max={100}
                  step={5}
                  onChange={setDriverPayoutShare}
                  iconVariant="percent"
                  accentColor="emerald"
                  minLabel="50% (Standard)"
                  maxLabel="100% (Full)"
                />
                <p className="mt-2 text-[11px] text-[#717f77] dark:text-[#88968e]">
                  Couriers receive {driverPayoutShare}% of delivery fee + 100% of customer tips
                  directly. Platform retains {100 - driverPayoutShare}%.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Dynamic Surge Pricing & Weather Charges */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Zap className="size-4" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
                  Dynamic Surge Pricing & Weather Controls
                </h2>
                <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
                  Manage rush hour surge multipliers and severe weather hazard bonuses.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 text-xs">
              {/* Surge Multiplier Cards */}
              <div>
                <label className="font-bold text-[#18201c] dark:text-white mb-2.5 block">
                  Rush Demand Multiplier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { label: 'Normal', mult: '1.0x', val: 1.0 },
                    { label: 'Peak Rush', mult: '1.25x', val: 1.25 },
                    { label: 'High Demand', mult: '1.5x', val: 1.5 },
                    { label: 'Extreme Surge', mult: '2.0x', val: 2.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setSurgeMultiplier(s.val)}
                      className={`rounded-2xl border p-3 text-center transition-all ${
                        surgeMultiplier === s.val
                          ? 'border-amber-400 dark:border-amber-500/80 bg-amber-50 dark:bg-amber-950/40 text-amber-950 dark:text-amber-200 ring-2 ring-amber-400/30 font-extrabold shadow-xs'
                          : 'border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#0e1310] text-[#4b5550] dark:text-[#97a59d] hover:bg-black/5 dark:hover:bg-white/5 font-semibold'
                      }`}
                    >
                      <span className="block text-sm font-black">{s.mult}</span>
                      <span className="block text-[10px] mt-0.5 opacity-80">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rain & Night Toggles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5 text-xs">
                      <CloudRain className="size-4 text-blue-600 dark:text-blue-400" /> Rain Weather
                      Fee
                    </span>
                    <AppleToggle
                      checked={isRainModeActive}
                      onChange={setIsRainModeActive}
                      iconVariant="rain"
                      activeColor="bg-blue-600"
                      ariaLabel="Rain surge mode"
                    />
                  </div>
                  <div className="mt-3.5">
                    <label className="text-[11px] font-bold text-blue-900/80 dark:text-blue-300">
                      Rain Bonus Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={rainFee}
                      onChange={(e) => setRainFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-blue-200 dark:border-blue-800/60 bg-white dark:bg-[#101713] text-[#18201c] dark:text-white px-3 py-2 font-extrabold text-sm outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20 p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5 text-xs">
                      <Flame className="size-4 text-purple-600 dark:text-purple-400" /> Late Night
                      Rush
                    </span>
                    <AppleToggle
                      checked={isNightSurgeActive}
                      onChange={setIsNightSurgeActive}
                      iconVariant="moon"
                      activeColor="bg-purple-600"
                      ariaLabel="Late night rush mode"
                    />
                  </div>
                  <div className="mt-3.5">
                    <label className="text-[11px] font-bold text-purple-900/80 dark:text-purple-300">
                      Night Surge Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={nightSurgeFee}
                      onChange={(e) => setNightSurgeFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-purple-200 dark:border-purple-800/60 bg-white dark:bg-[#101713] text-[#18201c] dark:text-white px-3 py-2 font-extrabold text-sm outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Payment Gateway & Payee Infrastructure */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CreditCard className="size-4" />
              </span>
              <div>
                <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
                  Payment Gateway & Payee Settings
                </h2>
                <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
                  Configure Razorpay gateway controls, automated route settlements, and merchant
                  identity.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-5 text-xs">
              {/* Razorpay Gateway Box */}
              <div className="rounded-2xl border border-[#dfe4dc] dark:border-[#222c26] bg-[#fbfcfb] dark:bg-[#0e1310] p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#e8ece5] dark:border-[#1e2722]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#18201c] dark:text-white">
                      Razorpay Gateway Engine
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        razorpayEnvEnabled
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                          : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      }`}
                    >
                      {razorpayEnvEnabled ? 'LIVE TEST KEYS CONNECTED' : 'KEYS DISCONNECTED'}
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151d18] border border-[#e8ece5] dark:border-[#1e2722]">
                    <div>
                      <span className="font-bold text-[#18201c] dark:text-white block">
                        Razorpay Checkout
                      </span>
                      <span className="text-[10px] text-[#717f77] dark:text-[#88968e]">
                        Enable live UPI, Cards & NetBanking
                      </span>
                    </div>
                    <AppleToggle
                      checked={razorpayEnabled}
                      onChange={setRazorpayEnabled}
                      iconVariant="power"
                      activeColor="bg-[#86a018] dark:bg-[#d9f447]"
                      ariaLabel="Enable Razorpay checkout"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151d18] border border-[#e8ece5] dark:border-[#1e2722]">
                    <div>
                      <span className="font-bold text-[#18201c] dark:text-white block">
                        Route Split Settlement
                      </span>
                      <span className="text-[10px] text-[#717f77] dark:text-[#88968e]">
                        Automated vendor/driver transfers
                      </span>
                    </div>
                    <AppleToggle
                      checked={razorpayRouteEnabled}
                      onChange={setRazorpayRouteEnabled}
                      iconVariant="shield"
                      activeColor="bg-[#86a018] dark:bg-[#d9f447]"
                      ariaLabel="Enable Razorpay route"
                    />
                  </div>
                </div>

                {/* Transfer release condition */}
                <div className="mt-4">
                  <label
                    htmlFor="razorpay-transfer-release"
                    className="font-bold text-[#18201c] dark:text-white block mb-1.5"
                  >
                    Route Transfer Release Condition
                  </label>
                  <select
                    id="razorpay-transfer-release"
                    value={razorpayTransferRelease}
                    onChange={(e) =>
                      setRazorpayTransferRelease(
                        e.target.value as 'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'
                      )
                    }
                    className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] px-3.5 py-2.5 font-bold text-xs text-[#18201c] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  >
                    <option value="DELIVERY_COMPLETE">
                      On Delivery Complete — Automatically release restaurant & driver splits
                    </option>
                    <option value="ADMIN_APPROVAL">
                      Hold For Admin Approval — Hold transfers in escrow until manually confirmed
                    </option>
                  </select>
                </div>
              </div>

              {/* Payee Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Merchant Payee Name
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="crave. Food Delivery Services"
                    className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Platform VPA ID
                  </label>
                  <input
                    type="text"
                    required
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="crave@upi"
                    className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-mono font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Post-Payment Customer Note
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-medium outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] py-4 px-6 text-sm font-extrabold text-[#d9f447] dark:text-[#121815] shadow-lg hover:opacity-95 active:scale-[0.99] transition disabled:opacity-60 cursor-pointer"
          >
            <Save className="size-4.5" />
            <span>
              {isSaving ? 'Synchronizing Engine...' : 'Save & Activate Pricing Configuration'}
            </span>
          </button>
        </form>

        {/* Dynamic Simulator & Economics Analyzer (Right 5 Cols Sticky) */}
        <div className="lg:col-span-5 flex flex-col gap-6 sticky top-20">
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#6a8014] dark:text-[#d9f447]">
                <Sparkles className="size-3.5" /> Live Economics Engine
              </span>
              <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                100% Synced
              </span>
            </div>

            <h3 className="mt-2 text-xl font-black text-[#18201c] dark:text-white">
              Dynamic Pricing Playground
            </h3>
            <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
              Simulate an order to test live customer breakdown, kitchen payouts, and platform
              margin.
            </p>

            {/* Test Controls */}
            <div className="mt-5 flex flex-col gap-4 bg-[#f8f9f6] dark:bg-[#0e1310] p-4 rounded-2xl border border-[#e8ece5] dark:border-[#1e2722] text-xs">
              <AppleSlider
                label="Simulated Food Subtotal"
                unit="₹"
                value={testOrderValue}
                min={100}
                max={1500}
                step={50}
                onChange={setTestOrderValue}
                iconVariant="currency"
                accentColor="lime"
                minLabel="₹100"
                maxLabel="₹1,500"
              />

              <AppleSlider
                label="Simulated Travel Distance"
                unit="km"
                value={testDistanceKm}
                min={1}
                max={15}
                step={0.5}
                onChange={setTestDistanceKm}
                iconVariant="distance"
                accentColor="blue"
                minLabel="1 km"
                maxLabel="15 km"
              />
            </div>

            {/* Customer Bill Breakdown Card */}
            <div className="mt-5 rounded-2xl bg-[#18201c] dark:bg-[#0c100e] p-5 text-white space-y-3 text-xs border border-transparent dark:border-[#222c26]">
              <div className="flex justify-between text-white/70">
                <span>Food Items Order Subtotal</span>
                <span className="font-extrabold text-white">₹{testOrderValue}</span>
              </div>

              {playgroundCalc.packagingFee > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Packaging Charge</span>
                  <span className="font-extrabold text-white">₹{playgroundCalc.packagingFee}</span>
                </div>
              )}

              <div className="flex justify-between text-white/70">
                <span>Base Delivery ({getNum(baseDistanceKm)} km)</span>
                <span className="font-extrabold text-white">₹{getNum(baseDeliveryFee)}</span>
              </div>

              {testDistanceKm > getNum(baseDistanceKm) && (
                <div className="flex justify-between text-white/70">
                  <span>
                    Extra Distance ({Math.ceil(testDistanceKm - getNum(baseDistanceKm))} km @ ₹
                    {getNum(perKmRate)}/km)
                  </span>
                  <span className="font-extrabold text-white">
                    +₹{playgroundCalc.extraDistanceFee}
                  </span>
                </div>
              )}

              {playgroundCalc.isFreeDelivery && (
                <div className="flex justify-between text-emerald-400 font-extrabold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                  <span>Free Delivery Threshold Met</span>
                  <span>-₹{playgroundCalc.rawDelivery}</span>
                </div>
              )}

              {playgroundCalc.surgeAddon > 0 && (
                <div className="flex justify-between text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-1 rounded-lg">
                  <span>Surge & Weather Surcharges</span>
                  <span>+₹{playgroundCalc.surgeAddon}</span>
                </div>
              )}

              <div className="flex justify-between text-white/70">
                <span>Platform Service Fee</span>
                <span className="font-extrabold text-white">₹{getNum(platformFee)}</span>
              </div>

              <div className="flex justify-between text-white/70">
                <span>Order Handling Charge</span>
                <span className="font-extrabold text-white">₹{getNum(handlingFee)}</span>
              </div>

              <div className="flex justify-between text-[#d9f447]/90 font-semibold">
                <div>
                  <span>Taxes &amp; GST</span>
                  <span className="block text-[10px] text-white/50 font-normal">
                    (18% platform tax; restaurant GST in food)
                  </span>
                </div>
                <span className="font-extrabold">₹{playgroundCalc.gstAmount}</span>
              </div>

              {/* Total To Pay */}
              <div className="pt-3.5 border-t border-white/15 flex justify-between items-baseline font-black text-lg text-[#d9f447]">
                <span>Customer Grand Total</span>
                <span>₹{playgroundCalc.customerTotal}</span>
              </div>

              {/* Visual Economics Payout Split */}
              <div className="mt-5 pt-4 border-t border-white/15 space-y-2.5 text-[11px]">
                <p className="font-black text-white/50 uppercase tracking-wider text-[9px]">
                  Settlement & Economics Allocation
                </p>

                {/* Progress bar visual */}
                <div className="h-2 w-full rounded-full bg-white/10 flex overflow-hidden">
                  <div
                    style={{
                      width: `${Math.min(100, (playgroundCalc.vendorPayout / playgroundCalc.customerTotal) * 100)}%`,
                    }}
                    className="bg-amber-400 h-full"
                    title="Vendor Payout"
                  />
                  <div
                    style={{
                      width: `${Math.min(100, (playgroundCalc.driverPayout / playgroundCalc.customerTotal) * 100)}%`,
                    }}
                    className="bg-blue-400 h-full"
                    title="Driver Earnings"
                  />
                  <div
                    style={{
                      width: `${Math.min(100, (playgroundCalc.platformNetProfit / playgroundCalc.customerTotal) * 100)}%`,
                    }}
                    className="bg-emerald-400 h-full"
                    title="Platform Net Profit"
                  />
                </div>

                <div className="flex justify-between text-amber-300">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-amber-400" />
                    Kitchen Payout ({100 - getNum(vendorCommission)}%):
                  </span>
                  <span className="font-extrabold">₹{playgroundCalc.vendorPayout}</span>
                </div>
                <div className="flex justify-between text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-blue-400" />
                    Driver Earnings ({driverPayoutShare}%):
                  </span>
                  <span className="font-extrabold">₹{playgroundCalc.driverPayout}</span>
                </div>
                <div className="flex justify-between text-emerald-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full bg-emerald-400" />
                    Platform Net Margin ({playgroundCalc.platformMarginPct}%):
                  </span>
                  <span className="font-black text-emerald-400">
                    ₹{playgroundCalc.platformNetProfit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

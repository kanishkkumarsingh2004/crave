'use client'

import AppleSlider from '@/components/ui/AppleSlider'
import AppleToggle from '@/components/ui/AppleToggle'
import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'
import { loadPaymentConfig, PaymentConfig, savePaymentConfig } from '@/lib/payment-config'
import {
  CheckCircle2,
  CloudRain,
  CreditCard,
  Flame,
  Percent,
  QrCode,
  Save,
  ShieldCheck,
  Sparkles,
  Truck,
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
  // 1. UPI Receiver Credentials & Customer Confirmation
  const [upiVpa, setUpiVpa] = useState('crave@upi')
  const [merchantName, setMerchantName] = useState('crave Food Delivery Services')
  const [thankYouMessage, setThankYouMessage] = useState(
    'Thank you for ordering with crave! Your payment reference has been submitted successfully and is being verified by our team.'
  )
  const [mccCode, setMccCode] = useState('5812')
  const [ifscCode, setIfscCode] = useState('HDFC0001234')
  const [accountNumber, setAccountNumber] = useState('50100293849281')

  // 2. Platform & Vendor Fees
  const [platformFee, setPlatformFee] = useState<number | ''>(6) // Flat ₹6
  const [handlingFee, setHandlingFee] = useState<number | ''>(5) // Flat ₹5 Handling Charge
  const [vendorCommission, setVendorCommission] = useState<number | ''>(15) // 15%
  const [packagingCap, setPackagingCap] = useState<number | ''>(20) // ₹20 max
  const [gstRatePercent, setGstRatePercent] = useState<number | ''>(18) // Default 18% GST

  // 3. Delivery Fee Rules
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number | ''>(30) // ₹30 for first 3 km
  const [baseDistanceKm, setBaseDistanceKm] = useState<number | ''>(3)
  const [perKmRate, setPerKmRate] = useState<number | ''>(10) // ₹10 / extra km
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | ''>(500) // ₹500
  const [driverPayoutShare, setDriverPayoutShare] = useState<number>(80) // 80% to driver

  // 4. Surge Pricing & Weather Settings
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0) // 1.0x (Normal)
  const [rainFee, setRainFee] = useState<number | ''>(20) // ₹20
  const [nightSurgeFee, setNightSurgeFee] = useState<number | ''>(15) // ₹15
  const [isRainModeActive, setIsRainModeActive] = useState<boolean>(false)
  const [isNightSurgeActive, setIsNightSurgeActive] = useState<boolean>(false)

  // Payment Options
  const [enableCashOnDelivery, setEnableCashOnDelivery] = useState(false)
  const [enableUpiDeepLink, setEnableUpiDeepLink] = useState(true)
  const [requireUtrNumber, setRequireUtrNumber] = useState(true)
  const [razorpayEnabled, setRazorpayEnabled] = useState(false)
  const [razorpayRouteEnabled, setRazorpayRouteEnabled] = useState(false)
  const [razorpayTransferRelease, setRazorpayTransferRelease] = useState<
    'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'
  >('DELIVERY_COMPLETE')
  const [razorpayEnvEnabled, setRazorpayEnvEnabled] = useState(false)
  const [razorpayRouteEnvEnabled, setRazorpayRouteEnvEnabled] = useState(false)

  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // 5. Playground Calculator State
  const [testOrderValue, setTestOrderValue] = useState<number>(400)
  const [testDistanceKm, setTestDistanceKm] = useState<number>(5.5)

  // Load saved configuration on mount
  useEffect(() => {
    loadPaymentConfig().then((cfg) => {
      setUpiVpa(cfg.upiVpa)
      setMerchantName(cfg.merchantName)
      setThankYouMessage(cfg.thankYouMessage)
      setMccCode(cfg.mccCode)
      setIfscCode(cfg.ifscCode)
      setAccountNumber(cfg.accountNumber)
      setPlatformFee(cfg.platformFee)
      setHandlingFee(cfg.handlingFee)
      setVendorCommission(cfg.vendorCommission)
      setPackagingCap(cfg.packagingCap)
      setGstRatePercent(cfg.gstRatePercent ?? 18)
      setBaseDeliveryFee(cfg.baseDeliveryFee)
      setBaseDistanceKm(cfg.baseDistanceKm)
      setPerKmRate(cfg.perKmRate)
      setFreeDeliveryThreshold(cfg.freeDeliveryThreshold)
      setDriverPayoutShare(cfg.driverPayoutShare)
      setSurgeMultiplier(cfg.surgeMultiplier)
      setRainFee(cfg.rainFee)
      setNightSurgeFee(cfg.nightSurgeFee)
      setIsRainModeActive(cfg.isRainModeActive)
      setIsNightSurgeActive(cfg.isNightSurgeActive)
      setEnableCashOnDelivery(cfg.enableCashOnDelivery)
      setEnableUpiDeepLink(cfg.enableUpiDeepLink)
      setRequireUtrNumber(cfg.requireUtrNumber)
      setRazorpayEnabled(cfg.razorpayEnabled)
      setRazorpayRouteEnabled(cfg.razorpayRouteEnabled)
      setRazorpayTransferRelease(cfg.razorpayTransferRelease ?? 'DELIVERY_COMPLETE')
      // Env kill-switch status (server-only flags surfaced by /api/payment-config)
      setRazorpayEnvEnabled((cfg as any).razorpayEnvEnabled ?? false)
      setRazorpayRouteEnvEnabled((cfg as any).razorpayRouteEnvEnabled ?? false)
    })
  }, [])

  // Live Playground Fee Calculation Math powered by central Calculator Engine (lib/calculator.ts)
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
    setSaveError('')
    const saved = await savePaymentConfig(fullConfig)
    if (!saved) {
      setSavedSuccess(false)
      setSaveError('The configuration was not saved to the database. Please try again.')
      return
    }
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
    }, 3000)
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] dark:border-[#27342d] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#b5de28] dark:text-[#d9f447]">
            Payment & Fee Engine
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Payment, Delivery & Surge Charge Playground
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76] dark:text-gray-400">
            Configure receiver UPI credentials, thank you messages, platform service fees, and test
            live order payouts.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 px-4 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" /> All UPI
            Credentials, Thank You Message & Playground Saved!
          </div>
        )}
        {saveError && (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {saveError}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Form Settings Area (Left 7 Cols) */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 flex flex-col gap-6">
          {/* SECTION 1: Platform Fees & Commission */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <Percent className="size-4 text-[#b5de28]" /> Platform Service Fees & Vendor
              Commission
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Set revenue share rates and order handling charges.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 text-xs">
              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Platform Service Fee (₹)
                </label>
                <input
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Flat fee per customer order
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Handling Charge (₹)
                </label>
                <input
                  type="number"
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Payment processing fee
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Vendor Commission (%)
                </label>
                <input
                  type="number"
                  value={vendorCommission}
                  onChange={(e) => setVendorCommission(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  % cut from food value
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Max Packaging Cap (₹)
                </label>
                <input
                  type="number"
                  value={packagingCap}
                  onChange={(e) => setPackagingCap(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Max kitchen container fee
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Default GST Rate (%)
                </label>
                <input
                  type="number"
                  value={gstRatePercent}
                  onChange={(e) => setGstRatePercent(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Configurable per vendor profile
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Delivery Charges Configuration */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <Truck className="size-4 text-[#b5de28]" /> Delivery Fee Calculation Engine
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Distance-based delivery fare structure and driver payout allocation.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Base Delivery Fee (₹)
                </label>
                <input
                  type="number"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Fixed rate for first {getNum(baseDistanceKm)} km
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Base Distance Threshold (km)
                </label>
                <input
                  type="number"
                  value={baseDistanceKm}
                  onChange={(e) => setBaseDistanceKm(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Distance included in base fare
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Per-KM Rate Beyond Base (₹/km)
                </label>
                <input
                  type="number"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Extra charge per additional km
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Free Delivery Order Threshold (₹)
                </label>
                <input
                  type="number"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Free delivery for orders above this
                </p>
              </div>

              <div className="sm:col-span-2">
                <AppleSlider
                  label="Driver Payout Share (% of delivery fee)"
                  unit="%"
                  value={driverPayoutShare}
                  min={50}
                  max={100}
                  step={5}
                  onChange={setDriverPayoutShare}
                  iconVariant="percent"
                  accentColor="emerald"
                  minLabel="50%"
                  maxLabel="100%"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Driver gets {driverPayoutShare}% of delivery fee + 100% customer tips.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Surge Pricing & Weather Charges */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <Zap className="size-4 text-amber-500 fill-amber-500" /> Dynamic Surge Pricing &
              Weather Charges
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Control surge multipliers for high demand periods, heavy rain, or peak rush hours.
            </p>

            <div className="mt-5 flex flex-col gap-5 text-xs">
              {/* Surge Multiplier Cards */}
              <div>
                <label className="font-bold text-[#18201c] dark:text-white mb-2 block">
                  Rush Demand Surge Multiplier
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: '1.0x (Normal)', val: 1.0 },
                    { label: '1.25x (Peak Rush)', val: 1.25 },
                    { label: '1.5x (High Demand)', val: 1.5 },
                    { label: '2.0x (Extreme Surge)', val: 2.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setSurgeMultiplier(s.val)}
                      className={`rounded-2xl border p-2.5 text-center font-bold transition ${
                        surgeMultiplier === s.val
                          ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 ring-2 ring-amber-400/40'
                          : 'border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#202923]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rain & Night Toggles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <CloudRain className="size-4 text-blue-600 dark:text-blue-400" /> Rain / Bad
                      Weather Fee
                    </span>
                    <AppleToggle
                      checked={isRainModeActive}
                      onChange={setIsRainModeActive}
                      iconVariant="rain"
                      activeColor="bg-blue-600"
                      ariaLabel="Rain surge fee mode"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-blue-800 dark:text-blue-300">
                      Rain Bonus Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={rainFee}
                      onChange={(e) => setRainFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-blue-200 dark:border-blue-800/50 bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3 py-1.5 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                      <Flame className="size-4 text-purple-600 dark:text-purple-400" /> Late Night
                      Rush Fee
                    </span>
                    <AppleToggle
                      checked={isNightSurgeActive}
                      onChange={setIsNightSurgeActive}
                      iconVariant="moon"
                      activeColor="bg-purple-600"
                      ariaLabel="Late night rush fee mode"
                    />
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-purple-800 dark:text-purple-300">
                      Night Surge Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={nightSurgeFee}
                      onChange={(e) => setNightSurgeFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-purple-200 dark:border-purple-800/50 bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3 py-1.5 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: UPI Receiver Credentials & Customer Thank You Message */}
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
              <QrCode className="size-4 text-[#b5de28]" /> Merchant Receiver UPI & Confirmation
              Configs
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Configure the receiver UPI ID, business payee name, and thank you message shown after
              checkout.
            </p>

            <div className="mt-4 flex flex-col gap-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Receiver UPI ID (VPA) *
                  </label>
                  <input
                    type="text"
                    required
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="e.g. crave@upi"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-mono font-bold outline-none focus:border-[#86a018]"
                  />
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    Target VPA ID for UPI payments
                  </p>
                </div>

                <div>
                  <label className="font-bold text-[#18201c] dark:text-white">
                    Receiver / Merchant Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. crave Food Delivery Services"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                  />
                  <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                    Official payee name on UPI apps
                  </p>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Customer Thank You Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="e.g. Thank you for your order! Your payment reference is recorded."
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 px-3.5 py-2.5 font-medium outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Custom message shown to customers after completing payment and submitting their
                  12-digit UTR reference.
                </p>
              </div>
            </div>

            {/* SECTION 4b: Razorpay Gateway Configuration */}
            <div className="mt-6 rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-amber-50/50 dark:bg-amber-900/10 p-4 shadow-sm">
              <h4 className="font-bold text-sm text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <CreditCard className="size-4" /> Razorpay Gateway
              </h4>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                Enable Razorpay Checkout and Route split settlement. Requires RAZORPAY_KEY_ID and
                RAZORPAY_KEY_SECRET in server environment.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#18201c] dark:text-white">
                    Enable Razorpay Checkout
                  </span>
                  <AppleToggle
                    checked={razorpayEnabled}
                    onChange={setRazorpayEnabled}
                    iconVariant="power"
                    activeColor="bg-amber-600"
                    ariaLabel="Enable Razorpay payments"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#18201c] dark:text-white">
                    Enable Route Split Settlements
                  </span>
                  <AppleToggle
                    checked={razorpayRouteEnabled}
                    onChange={setRazorpayRouteEnabled}
                    iconVariant="shield"
                    activeColor="bg-amber-600"
                    ariaLabel="Enable Razorpay Route transfers"
                  />
                </div>
              </div>

              {/* Server env kill-switch status (read-only; reflects RAZORPAY_ENABLED in env) */}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold">
                <span
                  className={
                    razorpayEnvEnabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  Gateway env: {razorpayEnvEnabled ? 'Enabled' : 'Disabled'}
                </span>
                <span
                  className={
                    razorpayRouteEnvEnabled
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-gray-500'
                  }
                >
                  Route env: {razorpayRouteEnvEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {/* Transfer release condition (only relevant when Route is enabled) */}
              <div className="mt-3 flex flex-col gap-1.5">
                <label
                  htmlFor="razorpay-transfer-release"
                  className="text-xs font-bold text-[#18201c] dark:text-white"
                >
                  Transfer release condition
                </label>
                <select
                  id="razorpay-transfer-release"
                  value={razorpayTransferRelease}
                  onChange={(e) =>
                    setRazorpayTransferRelease(
                      e.target.value as 'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'
                    )
                  }
                  className="rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] px-3 py-2 text-xs font-semibold text-[#18201c] dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="DELIVERY_COMPLETE">On delivery complete (auto-release)</option>
                  <option value="ADMIN_APPROVAL">
                    On admin approval (hold for manual release)
                  </option>
                </select>
                <p className="text-[10px] text-amber-700 dark:text-amber-300">
                  When Route is enabled, this controls when split transfers are sent to the
                  restaurant and driver linked accounts. The platform always retains the remainder.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] dark:bg-[#86a018] py-3.5 text-xs font-bold text-white dark:text-[#121815] shadow-lg transition hover:bg-[#323d36] dark:hover:bg-[#97b51b]"
          >
            <Save className="size-4" /> Save & Activate Fee & Surge Configuration
          </button>
        </form>

        {/* Dynamic Surge Simulator & Playground (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-md sticky top-24">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-[#6a8014] dark:text-[#d9f447]">
                Interactive Simulator
              </span>
            </div>
            <h3 className="mt-2 text-xl font-bold text-[#18201c] dark:text-white">
              Dynamic Pricing Playground
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Simulate an order to test real-time fee breakdowns, surge pricing, vendor cut, and
              driver payouts.
            </p>

            {/* Test Controls */}
            <div className="mt-5 flex flex-col gap-4 bg-[#f8f9f6] dark:bg-[#121815] p-4 rounded-2xl border border-gray-200 dark:border-[#27342d] text-xs">
              <AppleSlider
                label="Food Item Subtotal"
                unit="₹"
                value={testOrderValue}
                min={100}
                max={1200}
                step={50}
                onChange={setTestOrderValue}
                iconVariant="currency"
                accentColor="lime"
                minLabel="₹100"
                maxLabel="₹1,200"
              />

              <AppleSlider
                label="Delivery Distance"
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

            {/* Simulated Live Fee Breakdown Card */}
            <div className="mt-5 rounded-2xl bg-[#18201c] dark:bg-[#121815] p-5 text-white space-y-3 text-xs border border-transparent dark:border-[#27342d]">
              <div className="flex justify-between text-white/70">
                <span>Food Items Order Subtotal</span>
                <span>₹{testOrderValue}</span>
              </div>

              {playgroundCalc.packagingFee > 0 && (
                <div className="flex justify-between text-white/70">
                  <span>Max Packaging Charge</span>
                  <span>₹{playgroundCalc.packagingFee}</span>
                </div>
              )}

              <div className="flex justify-between text-white/70">
                <span>Base Delivery ({getNum(baseDistanceKm)}km)</span>
                <span>₹{getNum(baseDeliveryFee)}</span>
              </div>

              {testDistanceKm > getNum(baseDistanceKm) && (
                <div className="flex justify-between text-white/70">
                  <span>
                    Extra Distance ({Math.ceil(testDistanceKm - getNum(baseDistanceKm))}km @ ₹
                    {getNum(perKmRate)}/km)
                  </span>
                  <span>+₹{playgroundCalc.extraDistanceFee}</span>
                </div>
              )}

              {playgroundCalc.isFreeDelivery && (
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>Free Delivery Threshold Applied</span>
                  <span>-₹{playgroundCalc.rawDelivery}</span>
                </div>
              )}

              {playgroundCalc.surgeAddon > 0 && (
                <div className="flex justify-between text-amber-400 font-bold">
                  <span>Surge & Weather Addon ({surgeMultiplier}x)</span>
                  <span>+₹{playgroundCalc.surgeAddon}</span>
                </div>
              )}

              <div className="flex justify-between text-white/70">
                <span>Platform Service Fee</span>
                <span>₹{getNum(platformFee)}</span>
              </div>

              <div className="flex justify-between text-white/70">
                <span>Order Handling Charge</span>
                <span>₹{getNum(handlingFee)}</span>
              </div>

              <div className="flex justify-between text-[#d9f447]/90 font-semibold">
                <div>
                  <span>Taxes &amp; GST</span>
                  <span className="block text-[10px] text-white/50 font-normal">
                    (18% platform tax; restaurant GST in food)
                  </span>
                </div>
                <span>₹{playgroundCalc.gstAmount}</span>
              </div>

              <div className="pt-3 border-t border-white/15 flex justify-between font-bold text-base text-[#d9f447]">
                <span>Customer Grand Total</span>
                <span>₹{playgroundCalc.customerTotal}</span>
              </div>

              {/* Settlement Payout Split */}
              <div className="mt-4 pt-4 border-t border-white/15 space-y-2 text-[11px]">
                <p className="font-bold text-white/50 uppercase tracking-wider text-[9px]">
                  Settlement Payout Split
                </p>
                <div className="flex justify-between text-amber-300">
                  <span>Kitchen Vendor Payout ({100 - getNum(vendorCommission)}%):</span>
                  <span className="font-bold">₹{playgroundCalc.vendorPayout}</span>
                </div>
                <div className="flex justify-between text-blue-300">
                  <span>Driver Delivery Payout ({driverPayoutShare}%):</span>
                  <span className="font-bold">₹{playgroundCalc.driverPayout}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>Platform Net Commission Profit:</span>
                  <span className="font-bold">₹{playgroundCalc.platformNetProfit}</span>
                </div>
              </div>
            </div>

            {/* LIVE CUSTOMER CONFIRMATION & UPI PREVIEW CARD */}
            <div className="mt-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/40 p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="size-4 text-emerald-700 dark:text-emerald-400" /> Live
                  Customer Checkout Preview
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Active
                </span>
              </div>

              <div className="bg-white dark:bg-[#121815] p-3 rounded-xl border border-emerald-100 dark:border-[#27342d] space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Receiver UPI VPA:
                  </span>
                  <span className="font-mono font-bold text-[#18201c] dark:text-white">
                    {upiVpa}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Merchant Payee Name:
                  </span>
                  <span className="font-bold text-[#18201c] dark:text-white">{merchantName}</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 p-3 border border-emerald-200 dark:border-emerald-800/50 text-emerald-950 dark:text-emerald-300">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-1">
                  Customer Thank You Note
                </p>
                <p className="italic text-[11px] font-medium leading-relaxed text-emerald-900 dark:text-emerald-200">
                  "{thankYouMessage}"
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

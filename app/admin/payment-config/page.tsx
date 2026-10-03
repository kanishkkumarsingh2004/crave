'use client'

import {
  CheckCircle2,
  CloudRain,
  Flame,
  Percent,
  QrCode,
  Save,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import React, { useMemo, useState } from 'react'

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

  // 3. Delivery Fee Rules
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number | ''>(30) // ₹30 for first 3 km
  const [baseDistanceKm, setBaseDistanceKm] = useState<number | ''>(3)
  const [perKmRate, setPerKmRate] = useState<number | ''>(10) // ₹10 / extra km
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number | ''>(500) // ₹500
  const [driverPayoutShare, setDriverPayoutShare] = useState<number>(80) // 80% to driver

  // 4. Surge Pricing & Weather Settings
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.25) // 1.25x
  const [rainFee, setRainFee] = useState<number | ''>(20) // ₹20
  const [nightSurgeFee, setNightSurgeFee] = useState<number | ''>(15) // ₹15
  const [isRainModeActive, setIsRainModeActive] = useState<boolean>(false)
  const [isNightSurgeActive, setIsNightSurgeActive] = useState<boolean>(false)

  // Payment Options
  const [enableCashOnDelivery, setEnableCashOnDelivery] = useState(false)
  const [enableUpiDeepLink, setEnableUpiDeepLink] = useState(true)
  const [requireUtrNumber, setRequireUtrNumber] = useState(true)

  const [savedSuccess, setSavedSuccess] = useState(false)

  // 5. Playground Calculator State
  const [testOrderValue, setTestOrderValue] = useState<number>(400)
  const [testDistanceKm, setTestDistanceKm] = useState<number>(5.5)

  // Live Playground Fee Calculation Math
  const playgroundCalc = useMemo(() => {
    const baseFee = getNum(baseDeliveryFee)
    const baseDist = getNum(baseDistanceKm)
    const perKm = getNum(perKmRate)
    const freeThresh = getNum(freeDeliveryThreshold)
    const ordVal = getNum(testOrderValue)
    const distKm = getNum(testDistanceKm)
    const pFee = getNum(platformFee)
    const hFee = getNum(handlingFee)
    const vComm = getNum(vendorCommission)
    const rFee = getNum(rainFee)
    const nFee = getNum(nightSurgeFee)

    // Delivery fee math
    let rawDelivery = baseFee
    if (distKm > baseDist) {
      rawDelivery += (distKm - baseDist) * perKm
    }

    // Apply Free Delivery check
    const isFreeDelivery = ordVal >= freeThresh && freeThresh > 0
    let finalDeliveryFee = isFreeDelivery ? 0 : rawDelivery

    // Surge calculations
    let surgeAddon = 0
    if (surgeMultiplier > 1.0) {
      surgeAddon += finalDeliveryFee * (surgeMultiplier - 1.0)
    }
    if (isRainModeActive) {
      surgeAddon += rFee
    }
    if (isNightSurgeActive) {
      surgeAddon += nFee
    }

    const totalDeliveryCharges = Math.round((finalDeliveryFee + surgeAddon) * 100) / 100

    // Customer Grand Total (includes Subtotal + Delivery + Platform Fee + Handling Charges)
    const customerTotal = Math.round((ordVal + totalDeliveryCharges + pFee + hFee) * 100) / 100

    // Breakdown Split
    const vendorCommissionAmount = (ordVal * vComm) / 100
    const vendorPayout = ordVal - vendorCommissionAmount
    const driverPayout = Math.round(totalDeliveryCharges * (driverPayoutShare / 100))
    const platformNetProfit = Math.round((customerTotal - vendorPayout - driverPayout) * 100) / 100

    return {
      rawDelivery,
      isFreeDelivery,
      finalDeliveryFee,
      surgeAddon,
      totalDeliveryCharges,
      handlingFee: hFee,
      customerTotal,
      vendorCommissionAmount,
      vendorPayout,
      driverPayout,
      platformNetProfit,
    }
  }, [
    testOrderValue,
    testDistanceKm,
    baseDeliveryFee,
    baseDistanceKm,
    perKmRate,
    freeDeliveryThreshold,
    surgeMultiplier,
    isRainModeActive,
    rainFee,
    isNightSurgeActive,
    nightSurgeFee,
    platformFee,
    handlingFee,
    vendorCommission,
    driverPayoutShare,
  ])

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
    }, 3000)
  }

  const sampleUpiLink = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(merchantName)}&mc=${mccCode}&am=${playgroundCalc.customerTotal}&cu=INR&tn=Order%20CRV-9021`

  return (
    <div className="flex flex-col gap-8 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#849e16]">
            Payment & Fee Engine
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">
            Payment, Delivery & Surge Charge Playground
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76]">
            Configure receiver UPI credentials, thank you messages, platform service fees, and test
            live order payouts.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="size-4 text-emerald-700" /> All UPI Credentials, Thank You
            Message & Playground Saved!
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Form Settings Area (Left 7 Cols) */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 flex flex-col gap-6">
          {/* SECTION 1: Platform Fees & Commission */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <Percent className="size-4 text-[#859d19]" /> Platform Service Fees & Vendor
              Commission
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Set revenue share rates and order handling charges.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Platform Service Fee (₹)</label>
                <input
                  type="number"
                  value={platformFee}
                  onChange={(e) => setPlatformFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Flat fee per customer order</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Handling Charge (₹)</label>
                <input
                  type="number"
                  value={handlingFee}
                  onChange={(e) => setHandlingFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Payment processing fee</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Vendor Commission (%)</label>
                <input
                  type="number"
                  value={vendorCommission}
                  onChange={(e) => setVendorCommission(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">% cut from food value</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Max Packaging Cap (₹)</label>
                <input
                  type="number"
                  value={packagingCap}
                  onChange={(e) => setPackagingCap(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Max kitchen container fee</p>
              </div>
            </div>
          </div>

          {/* SECTION 2: Delivery Charges Configuration */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <Truck className="size-4 text-[#859d19]" /> Delivery Fee Calculation Engine
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Distance-based delivery fare structure and driver payout allocation.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Fixed rate for first {getNum(baseDistanceKm)} km
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Base Distance Threshold (km)</label>
                <input
                  type="number"
                  value={baseDistanceKm}
                  onChange={(e) => setBaseDistanceKm(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Distance included in base fare</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Per-KM Rate Beyond Base (₹/km)</label>
                <input
                  type="number"
                  value={perKmRate}
                  onChange={(e) => setPerKmRate(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Extra charge per additional km</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">
                  Free Delivery Order Threshold (₹)
                </label>
                <input
                  type="number"
                  value={freeDeliveryThreshold}
                  onChange={(e) => setFreeDeliveryThreshold(handleNumInput(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Free delivery for orders above this
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#18201c]">
                  Driver Payout Share (% of delivery fee)
                </label>
                <div className="mt-1.5 flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={driverPayoutShare}
                    onChange={(e) => setDriverPayoutShare(parseInt(e.target.value))}
                    className="flex-1 accent-[#86a018]"
                  />
                  <span className="font-mono font-bold text-sm bg-gray-100 px-3 py-1 rounded-xl">
                    {driverPayoutShare}%
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-gray-400">
                  Driver gets {driverPayoutShare}% of delivery fee + 100% customer tips.
                </p>
              </div>
            </div>
          </div>

          {/* SECTION 3: Surge Pricing & Weather Charges */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <Zap className="size-4 text-amber-500 fill-amber-500" /> Dynamic Surge Pricing &
              Weather Charges
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Control surge multipliers for high demand periods, heavy rain, or peak rush hours.
            </p>

            <div className="mt-5 flex flex-col gap-5 text-xs">
              {/* Surge Multiplier Cards */}
              <div>
                <label className="font-bold text-[#18201c] mb-2 block">
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
                          ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-400/40'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rain & Night Toggles */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900 flex items-center gap-1.5">
                      <CloudRain className="size-4 text-blue-600" /> Rain / Bad Weather Fee
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsRainModeActive((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        isRainModeActive ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white transition ${
                          isRainModeActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-blue-800">
                      Rain Bonus Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={rainFee}
                      onChange={(e) => setRainFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-blue-200 bg-white px-3 py-1.5 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 flex items-center gap-1.5">
                      <Flame className="size-4 text-purple-600" /> Late Night Rush Fee
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsNightSurgeActive((v) => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        isNightSurgeActive ? 'bg-purple-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block size-4 transform rounded-full bg-white transition ${
                          isNightSurgeActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-purple-800">
                      Night Surge Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={nightSurgeFee}
                      onChange={(e) => setNightSurgeFee(handleNumInput(e.target.value))}
                      className="mt-1 w-full rounded-xl border border-purple-200 bg-white px-3 py-1.5 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: UPI Receiver Credentials & Customer Thank You Message */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <QrCode className="size-4 text-[#859d19]" /> Merchant Receiver UPI & Confirmation
              Configs
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure the receiver UPI ID, business payee name, and thank you message shown after
              checkout.
            </p>

            <div className="mt-4 flex flex-col gap-4 text-xs">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Receiver UPI ID (VPA) *</label>
                  <input
                    type="text"
                    required
                    value={upiVpa}
                    onChange={(e) => setUpiVpa(e.target.value)}
                    placeholder="e.g. crave@upi"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-mono font-bold outline-none focus:border-[#86a018]"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Target VPA ID for UPI payments</p>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Receiver / Merchant Name *</label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. crave Food Delivery Services"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                  />
                  <p className="mt-1 text-[10px] text-gray-400">Official payee name on UPI apps</p>
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Customer Thank You Message *</label>
                <textarea
                  rows={3}
                  required
                  value={thankYouMessage}
                  onChange={(e) => setThankYouMessage(e.target.value)}
                  placeholder="e.g. Thank you for your order! Your payment reference is recorded."
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-medium outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Custom message shown to customers after completing payment and submitting their
                  12-digit UTR reference.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#323d36]"
          >
            <Save className="size-4" /> Save & Activate Fee & Surge Configuration
          </button>
        </form>

        {/* Dynamic Surge Simulator & Playground (Right 5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-md sticky top-24">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase text-[#6a8014]">
                Interactive Simulator
              </span>
              <Sparkles className="size-4 text-amber-500 animate-pulse" />
            </div>
            <h3 className="mt-2 text-xl font-bold text-[#18201c]">Dynamic Pricing Playground</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Simulate an order to test real-time fee breakdowns, surge pricing, vendor cut, and
              driver payouts.
            </p>

            {/* Test Controls */}
            <div className="mt-5 flex flex-col gap-4 bg-[#f8f9f6] p-4 rounded-2xl border border-gray-200 text-xs">
              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Food Item Subtotal:</span>
                  <span className="text-[#18201c]">₹{testOrderValue}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="1200"
                  step="50"
                  value={testOrderValue}
                  onChange={(e) => setTestOrderValue(parseInt(e.target.value))}
                  className="w-full accent-[#86a018]"
                />
              </div>

              <div>
                <div className="flex justify-between font-bold mb-1">
                  <span>Delivery Distance:</span>
                  <span className="text-[#18201c]">{testDistanceKm} km</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="0.5"
                  value={testDistanceKm}
                  onChange={(e) => setTestDistanceKm(parseFloat(e.target.value))}
                  className="w-full accent-[#86a018]"
                />
              </div>
            </div>

            {/* Simulated Live Fee Breakdown Card */}
            <div className="mt-5 rounded-2xl bg-[#18201c] p-5 text-white space-y-3 text-xs">
              <div className="flex justify-between text-white/70">
                <span>Food Items Order Subtotal</span>
                <span>₹{testOrderValue}</span>
              </div>

              <div className="flex justify-between text-white/70">
                <span>Base Delivery ({getNum(baseDistanceKm)}km)</span>
                <span>₹{getNum(baseDeliveryFee)}</span>
              </div>

              {testDistanceKm > getNum(baseDistanceKm) && (
                <div className="flex justify-between text-white/70">
                  <span>
                    Extra Distance ({(testDistanceKm - getNum(baseDistanceKm)).toFixed(1)}km @ ₹
                    {getNum(perKmRate)}/km)
                  </span>
                  <span>+₹{(testDistanceKm - getNum(baseDistanceKm)) * getNum(perKmRate)}</span>
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
                  <span>🏪 Kitchen Vendor Payout ({100 - getNum(vendorCommission)}%):</span>
                  <span className="font-bold">₹{playgroundCalc.vendorPayout}</span>
                </div>
                <div className="flex justify-between text-blue-300">
                  <span>🛵 Driver Delivery Payout ({driverPayoutShare}%):</span>
                  <span className="font-bold">₹{playgroundCalc.driverPayout}</span>
                </div>
                <div className="flex justify-between text-emerald-300">
                  <span>🛡️ Platform Net Commission Profit:</span>
                  <span className="font-bold">₹{playgroundCalc.platformNetProfit}</span>
                </div>
              </div>
            </div>

            {/* LIVE CUSTOMER CONFIRMATION & UPI PREVIEW CARD */}
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <ShieldCheck className="size-4 text-emerald-700" /> Live Customer Checkout Preview
                </span>
                <span className="rounded-full bg-emerald-200/70 px-2 py-0.5 text-[9px] font-extrabold text-emerald-900 uppercase">
                  Active
                </span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-emerald-100 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Receiver UPI VPA:</span>
                  <span className="font-mono font-bold text-[#18201c]">{upiVpa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-medium">Merchant Payee Name:</span>
                  <span className="font-bold text-[#18201c]">{merchantName}</span>
                </div>
              </div>

              <div className="rounded-xl bg-emerald-100/70 p-3 border border-emerald-200 text-emerald-950">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  Customer Thank You Note
                </p>
                <p className="italic text-[11px] font-medium leading-relaxed text-emerald-900">
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

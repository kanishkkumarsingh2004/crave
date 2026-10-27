'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { AlertCircle, CheckCircle2, Save } from 'lucide-react'
import { calculateFullBreakdown, CalculatorInput } from '@/lib/calculator'
import { loadPaymentConfig, PaymentConfig, savePaymentConfig } from '@/lib/payment-config'
import { getNum } from '@/components/admin/payment-config/types'
import { PlatformFeesSection } from '@/components/admin/payment-config/PlatformFeesSection'
import { DeliveryTariffSection } from '@/components/admin/payment-config/DeliveryTariffSection'
import { SurgeWeatherSection } from '@/components/admin/payment-config/SurgeWeatherSection'
import { GatewaySettingsSection } from '@/components/admin/payment-config/GatewaySettingsSection'
import {
  PricingPlayground,
  PlaygroundCalculation,
} from '@/components/admin/payment-config/PricingPlayground'

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
    })
  }, [])

  // Live Playground Calculation
  const playgroundCalc: PlaygroundCalculation = useMemo(() => {
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
            Payment &amp; Pricing Engine
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#63716a] dark:text-[#97a59d]">
            Configure customer platform fees, delivery tariffs, restaurant revenue split, surge
            rules, and gateway settlements.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 px-4 py-2.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-sm animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Pricing &amp; fee engine synchronized successfully across all apps</span>
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
          <PlatformFeesSection
            platformFee={platformFee}
            setPlatformFee={setPlatformFee}
            handlingFee={handlingFee}
            setHandlingFee={setHandlingFee}
            vendorCommission={vendorCommission}
            setVendorCommission={setVendorCommission}
            packagingCap={packagingCap}
            setPackagingCap={setPackagingCap}
            gstRatePercent={gstRatePercent}
            setGstRatePercent={setGstRatePercent}
          />

          <DeliveryTariffSection
            baseDeliveryFee={baseDeliveryFee}
            setBaseDeliveryFee={setBaseDeliveryFee}
            baseDistanceKm={baseDistanceKm}
            setBaseDistanceKm={setBaseDistanceKm}
            perKmRate={perKmRate}
            setPerKmRate={setPerKmRate}
            freeDeliveryThreshold={freeDeliveryThreshold}
            setFreeDeliveryThreshold={setFreeDeliveryThreshold}
            driverPayoutShare={driverPayoutShare}
            setDriverPayoutShare={setDriverPayoutShare}
          />

          <SurgeWeatherSection
            surgeMultiplier={surgeMultiplier}
            setSurgeMultiplier={setSurgeMultiplier}
            isRainModeActive={isRainModeActive}
            setIsRainModeActive={setIsRainModeActive}
            rainFee={rainFee}
            setRainFee={setRainFee}
            isNightSurgeActive={isNightSurgeActive}
            setIsNightSurgeActive={setIsNightSurgeActive}
            nightSurgeFee={nightSurgeFee}
            setNightSurgeFee={setNightSurgeFee}
          />

          <GatewaySettingsSection
            razorpayEnvEnabled={razorpayEnvEnabled}
            razorpayEnabled={razorpayEnabled}
            setRazorpayEnabled={setRazorpayEnabled}
            razorpayRouteEnabled={razorpayRouteEnabled}
            setRazorpayRouteEnabled={setRazorpayRouteEnabled}
            razorpayTransferRelease={razorpayTransferRelease}
            setRazorpayTransferRelease={setRazorpayTransferRelease}
            merchantName={merchantName}
            setMerchantName={setMerchantName}
            upiVpa={upiVpa}
            setUpiVpa={setUpiVpa}
            thankYouMessage={thankYouMessage}
            setThankYouMessage={setThankYouMessage}
          />

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
          <PricingPlayground
            testOrderValue={testOrderValue}
            setTestOrderValue={setTestOrderValue}
            testDistanceKm={testDistanceKm}
            setTestDistanceKm={setTestDistanceKm}
            baseDistanceKm={baseDistanceKm}
            baseDeliveryFee={baseDeliveryFee}
            perKmRate={perKmRate}
            platformFee={platformFee}
            handlingFee={handlingFee}
            vendorCommission={vendorCommission}
            driverPayoutShare={driverPayoutShare}
            playgroundCalc={playgroundCalc}
          />
        </div>
      </div>
    </div>
  )
}

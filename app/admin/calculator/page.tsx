'use client'

import DatabaseInspectorTabs from '@/components/admin/calculator/DatabaseInspectorTabs'
import EconomicsCards from '@/components/admin/calculator/EconomicsCards'
import type { DbData } from '@/components/admin/calculator/types'
import AppleSlider from '@/components/ui/AppleSlider'
import {
  calculateFullBreakdown,
  type CalculatorInput,
  type FullCalculatorResult,
} from '@/lib/calculator'
import {
  Calculator,
  CheckCircle2,
  CloudRain,
  Database,
  Layers,
  Moon,
  RefreshCw,
  Sliders,
  Sparkles,
  Store,
  Tag,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export type { DbData }

export default function CalculatorPlaygroundPage() {
  const [dbData, setDbData] = useState<DbData | null>(null)
  const [loadingDb, setLoadingDb] = useState<boolean>(true)
  const [dbError, setDbError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<
    'calculator' | 'db_config' | 'db_restaurants' | 'db_coupons' | 'db_orders'
  >('calculator')

  // Selected DB Presets
  const [selectedOrderId, setSelectedOrderId] = useState<string>('')
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>('')
  const [selectedCouponCode, setSelectedCouponCode] = useState<string>('')

  // Playground Control State
  const [subtotal, setSubtotal] = useState<number>(450)
  const [distanceKm, setDistanceKm] = useState<number>(4.2)
  const [packagingFee, setPackagingFee] = useState<number>(20)
  const [tip, setTip] = useState<number>(0)
  const [vendorCommissionPercent, setVendorCommissionPercent] = useState<number>(15)
  const [driverPayoutSharePercent, setDriverPayoutSharePercent] = useState<number>(80)
  const [platformFee, setPlatformFee] = useState<number>(6)
  const [handlingFee, setHandlingFee] = useState<number>(5)
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(30)
  const [baseDistanceKm, setBaseDistanceKm] = useState<number>(3)
  const [perKmRate, setPerKmRate] = useState<number>(10)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState<number>(500)
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(1.0)
  const [rainFee, setRainFee] = useState<number>(20)
  const [nightSurgeFee, setNightSurgeFee] = useState<number>(15)
  const [isRainModeActive, setIsRainModeActive] = useState<boolean>(false)
  const [isNightSurgeActive, setIsNightSurgeActive] = useState<boolean>(false)

  // Fetch Database Values
  const fetchDbData = async () => {
    setLoadingDb(true)
    setDbError(null)
    try {
      const res = await fetch('/api/admin/calculator')
      const json = await res.json()
      if (json.success && json.dbData) {
        setDbData(json.dbData)

        // Initialize controls with live DB payment config
        const cfg = json.dbData.paymentConfig
        if (cfg) {
          setPackagingFee(cfg.packagingCap ?? 20)
          setPlatformFee(cfg.platformFee ?? 6)
          setHandlingFee(cfg.handlingFee ?? 5)
          setVendorCommissionPercent(cfg.vendorCommission ?? 15)
          setBaseDeliveryFee(cfg.baseDeliveryFee ?? 30)
          setBaseDistanceKm(cfg.baseDistanceKm ?? 3)
          setPerKmRate(cfg.perKmRate ?? 10)
          setFreeDeliveryThreshold(cfg.freeDeliveryThreshold ?? 500)
          setDriverPayoutSharePercent(cfg.driverPayoutShare ?? 80)
          setSurgeMultiplier(cfg.surgeMultiplier ?? 1.0)
          setRainFee(cfg.rainFee ?? 20)
          setNightSurgeFee(cfg.nightSurgeFee ?? 15)
          setIsRainModeActive(cfg.isRainModeActive ?? false)
          setIsNightSurgeActive(cfg.isNightSurgeActive ?? false)
        }
      } else {
        setDbError('Could not parse database values.')
      }
    } catch (e: any) {
      setDbError(e?.message || 'Error connecting to database endpoint.')
    } finally {
      setLoadingDb(false)
    }
  }

  useEffect(() => {
    fetchDbData()
  }, [])

  // Quick Preset Handlers
  const resetToSystemDefaults = () => {
    const cfg = dbData?.paymentConfig
    setSelectedOrderId('')
    setSelectedRestaurantId('')
    setSelectedCouponCode('')
    setSubtotal(450)
    setDistanceKm(3.5)
    setPackagingFee(cfg?.packagingCap ?? 20)
    setTip(0)
    setVendorCommissionPercent(cfg?.vendorCommission ?? 15)
    setDriverPayoutSharePercent(cfg?.driverPayoutShare ?? 80)
    setPlatformFee(cfg?.platformFee ?? 6)
    setHandlingFee(cfg?.handlingFee ?? 5)
    setBaseDeliveryFee(cfg?.baseDeliveryFee ?? 30)
    setBaseDistanceKm(cfg?.baseDistanceKm ?? 3)
    setPerKmRate(cfg?.perKmRate ?? 10)
    setFreeDeliveryThreshold(cfg?.freeDeliveryThreshold ?? 500)
    setSurgeMultiplier(cfg?.surgeMultiplier ?? 1.0)
    setRainFee(cfg?.rainFee ?? 20)
    setNightSurgeFee(cfg?.nightSurgeFee ?? 15)
    setIsRainModeActive(cfg?.isRainModeActive ?? false)
    setIsNightSurgeActive(cfg?.isNightSurgeActive ?? false)
  }

  const applyRainSurgePreset = () => {
    setIsRainModeActive(true)
    setRainFee(25)
    setSurgeMultiplier(1.2)
  }

  const applyNightSurgePreset = () => {
    setIsNightSurgeActive(true)
    setNightSurgeFee(20)
    setSurgeMultiplier(1.25)
  }

  const applyHighValueOrderPreset = () => {
    setSubtotal(650)
    setFreeDeliveryThreshold(500)
    setSelectedCouponCode('')
  }

  // Handle Preset Selection: Load Order from DB
  const handleSelectDbOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    if (!orderId || !dbData?.orders) return

    const ord = dbData.orders.find((o) => o.id === orderId)
    if (ord) {
      setSubtotal(ord.subtotal || 450)
      setPackagingFee(ord.packaging_fee ?? dbData.paymentConfig?.packagingCap ?? 20)
      setTip(ord.tip || 0)
      if (ord.coupon_code) {
        setSelectedCouponCode(ord.coupon_code)
      }
      if (ord.restaurant_id) {
        setSelectedRestaurantId(ord.restaurant_id)
        const rest = dbData.restaurants?.find((r) => r.id === ord.restaurant_id)
        if (rest && rest.commission_rate != null) {
          setVendorCommissionPercent(rest.commission_rate)
        }
      }
    }
  }

  // Handle Preset Selection: Load Restaurant from DB
  const handleSelectDbRestaurant = (restId: string) => {
    setSelectedRestaurantId(restId)
    setSelectedOrderId('')
    if (!restId || !dbData?.restaurants) return
    const rest = dbData.restaurants.find((r) => r.id === restId)
    if (rest && rest.commission_rate != null) {
      setVendorCommissionPercent(rest.commission_rate)
    }
  }

  // Filtered DB Orders belonging to selected DB Restaurant
  const filteredDbOrders = useMemo(() => {
    if (!selectedRestaurantId || !dbData?.orders) return []
    const targetRest = dbData.restaurants?.find((r) => r.id === selectedRestaurantId)
    return dbData.orders.filter(
      (ord) =>
        ord.restaurant_id === selectedRestaurantId ||
        (targetRest && ord.restaurant_name === targetRest.name)
    )
  }, [selectedRestaurantId, dbData])

  // Active Coupon details for breakdown math
  const activeCouponObj = useMemo(() => {
    if (!selectedCouponCode || !dbData?.coupons) return undefined
    return dbData.coupons.find((c) => c.code.toLowerCase() === selectedCouponCode.toLowerCase())
  }, [selectedCouponCode, dbData])

  // Live Calculator Execution
  const calculatorResult: FullCalculatorResult = useMemo(() => {
    const input: CalculatorInput = {
      subtotal,
      distanceKm,
      packagingFee,
      tip,
      vendorCommissionPercent,
      driverPayoutSharePercent,
      platformFee,
      handlingFee,
      baseDeliveryFee,
      baseDistanceKm,
      perKmRate,
      freeDeliveryThreshold,
      surgeMultiplier,
      rainFee,
      nightSurgeFee,
      isRainModeActive,
      isNightSurgeActive,
      couponCode: selectedCouponCode,
    }
    return calculateFullBreakdown(input, activeCouponObj)
  }, [
    subtotal,
    distanceKm,
    packagingFee,
    tip,
    vendorCommissionPercent,
    driverPayoutSharePercent,
    platformFee,
    handlingFee,
    baseDeliveryFee,
    baseDistanceKm,
    perKmRate,
    freeDeliveryThreshold,
    surgeMultiplier,
    rainFee,
    nightSurgeFee,
    isRainModeActive,
    isNightSurgeActive,
    selectedCouponCode,
    activeCouponObj,
  ])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 dark:border-[#202923] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-800 dark:bg-[#d9f447]/10 dark:text-[#d9f447] rounded-xl border border-emerald-200 dark:border-[#d9f447]/20 shadow-xs dark:shadow-[0_0_15px_rgba(217,244,71,0.15)]">
              <Calculator className="size-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#18201c] dark:text-white">
              Unit Economics Calculator &amp; Financial Simulator
            </h1>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Real-time database integration: Fetch live parameters from PostgreSQL and simulate
            customer bills, vendor payouts, driver earnings, and platform margin.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] text-xs shadow-inner">
            <Database className="size-3.5 text-emerald-600 dark:text-[#d9f447]" />
            {loadingDb ? (
              <span className="text-amber-500 font-bold animate-pulse">Syncing DB...</span>
            ) : dbError ? (
              <span className="text-red-500 font-bold">DB Error</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-bold">
                <CheckCircle2 className="size-3.5" /> DB Connected
              </span>
            )}
          </div>

          <button
            onClick={fetchDbData}
            disabled={loadingDb}
            className="flex items-center gap-2 px-4 py-2 bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] font-extrabold rounded-xl hover:bg-[#2c372f] dark:hover:bg-[#c8e434] transition duration-200 text-xs shadow-md hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
            Fetch Live DB Values
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-[#202923] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('calculator')}
          className={`flex items-center gap-2 px-4 py-2 font-extrabold rounded-xl transition ${
            activeTab === 'calculator'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-gray-400 dark:hover:text-white dark:border-[#202923]'
          }`}
        >
          <Sliders className="size-3.5" /> Interactive Playground
        </button>
        <button
          onClick={() => setActiveTab('db_config')}
          className={`flex items-center gap-2 px-4 py-2 font-extrabold rounded-xl transition ${
            activeTab === 'db_config'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-gray-400 dark:hover:text-white dark:border-[#202923]'
          }`}
        >
          <Zap className="size-3.5" /> DB Config
        </button>
        <button
          onClick={() => setActiveTab('db_restaurants')}
          className={`flex items-center gap-2 px-4 py-2 font-extrabold rounded-xl transition ${
            activeTab === 'db_restaurants'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-gray-400 dark:hover:text-white dark:border-[#202923]'
          }`}
        >
          <Store className="size-3.5" /> DB Restaurants ({dbData?.restaurants?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('db_coupons')}
          className={`flex items-center gap-2 px-4 py-2 font-extrabold rounded-xl transition ${
            activeTab === 'db_coupons'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-gray-400 dark:hover:text-white dark:border-[#202923]'
          }`}
        >
          <Tag className="size-3.5" /> DB Coupons ({dbData?.coupons?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('db_orders')}
          className={`flex items-center gap-2 px-4 py-2 font-extrabold rounded-xl transition ${
            activeTab === 'db_orders'
              ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-sm dark:shadow-[0_4px_16px_rgba(217,244,71,0.2)]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 dark:bg-[#121815] dark:text-gray-400 dark:hover:text-white dark:border-[#202923]'
          }`}
        >
          <Layers className="size-3.5" /> DB Recent Orders ({dbData?.orders?.length || 0})
        </button>
      </div>

      {/* Tab Content: Calculator Playground */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Controls Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Presets from DB Card */}
            <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-4 shadow-sm dark:shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#202923] pb-3">
                <h3 className="text-xs font-extrabold text-emerald-700 dark:text-[#d9f447] flex items-center gap-2 uppercase tracking-wider">
                  <Database className="size-4" /> Load Real Data from Database
                </h3>
                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
                  Preset Loader
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1.5">
                      DB Restaurant:
                    </label>
                    <select
                      value={selectedRestaurantId}
                      onChange={(e) => handleSelectDbRestaurant(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-[#18201c] dark:text-white font-medium focus:border-emerald-500 dark:focus:border-[#d9f447] outline-none truncate transition"
                    >
                      <option value="">-- Choose Restaurant --</option>
                      {dbData?.restaurants?.map((rest) => (
                        <option key={rest.id} value={rest.id}>
                          {rest.name} ({rest.commission_rate ?? 15}%)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1.5">
                      DB Coupon:
                    </label>
                    <select
                      value={selectedCouponCode}
                      onChange={(e) => setSelectedCouponCode(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-[#18201c] dark:text-white font-medium focus:border-emerald-500 dark:focus:border-[#d9f447] outline-none truncate transition"
                    >
                      <option value="">None (No Discount)</option>
                      {dbData?.coupons?.map((coup) => (
                        <option key={coup.id} value={coup.code}>
                          {coup.code} (
                          {coup.discount_type === 'percentage'
                            ? `${coup.discount_value}%`
                            : `₹${coup.discount_value}`}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-gray-700 dark:text-gray-300 font-bold">
                      Select DB Recent Order:
                    </label>
                    {!selectedRestaurantId && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        Select restaurant first
                      </span>
                    )}
                  </div>
                  <select
                    value={selectedOrderId}
                    disabled={!selectedRestaurantId}
                    onChange={(e) => handleSelectDbOrder(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2 text-xs font-medium outline-none transition ${
                      !selectedRestaurantId
                        ? 'bg-gray-100 dark:bg-[#0b0f0d]/50 border-gray-200 dark:border-[#1a221d] text-gray-400 dark:text-gray-500 cursor-not-allowed'
                        : 'bg-gray-50 dark:bg-[#0b0f0d] border-gray-200 dark:border-[#202923] text-[#18201c] dark:text-white focus:border-emerald-500 dark:focus:border-[#d9f447]'
                    }`}
                  >
                    {!selectedRestaurantId ? (
                      <option value="">-- Select a Restaurant First --</option>
                    ) : filteredDbOrders.length === 0 ? (
                      <option value="">-- No Recent Orders Found for this Restaurant --</option>
                    ) : (
                      <option value="">
                        -- Choose Order from Database ({filteredDbOrders.length} available) --
                      </option>
                    )}
                    {filteredDbOrders.map((ord) => (
                      <option key={ord.id} value={ord.id}>
                        #{ord.id.slice(0, 8)} - {ord.customer_name} - ₹{ord.total_amount} [
                        {ord.status}]
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Playground Inputs & Controls */}
            <div className="bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-2xl p-5 space-y-5 shadow-sm dark:shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-[#202923] pb-3 gap-2">
                <h3 className="text-xs font-extrabold text-[#18201c] dark:text-white flex items-center gap-2 uppercase tracking-wider">
                  <Sliders className="size-4 text-emerald-600 dark:text-[#d9f447]" /> Financial
                  Simulation Parameters
                </h3>
                <button
                  onClick={resetToSystemDefaults}
                  className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-extrabold text-[#18201c] dark:text-[#d9f447] transition"
                >
                  <RefreshCw className="size-3" /> Reset to DB Config
                </button>
              </div>

              {/* Quick Simulation Presets */}
              <div className="space-y-2">
                <span className="text-[11px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
                  Quick Simulation Presets:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={resetToSystemDefaults}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-gray-700 hover:text-black dark:text-gray-200 dark:hover:text-white rounded-xl text-xs font-bold transition active:scale-95"
                  >
                    Standard Meal (₹450)
                  </button>
                  <button
                    type="button"
                    onClick={applyRainSurgePreset}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 dark:bg-blue-950/60 dark:border-blue-500/40 dark:text-blue-300 dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <CloudRain className="size-3.5" /> Heavy Rain (+₹25)
                  </button>
                  <button
                    type="button"
                    onClick={applyNightSurgePreset}
                    className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 dark:bg-purple-950/60 dark:border-purple-500/40 dark:text-purple-300 dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Moon className="size-3.5" /> Late Night Surge (+₹20)
                  </button>
                  <button
                    type="button"
                    onClick={applyHighValueOrderPreset}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 dark:bg-amber-950/60 dark:border-amber-500/40 dark:text-amber-300 dark:hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles className="size-3.5" /> High Value (Free Delivery)
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-xs">
                {/* Cart Subtotal */}
                <div className="bg-gray-50 dark:bg-[#0b0f0d] p-4 rounded-2xl border border-gray-200 dark:border-[#202923]">
                  <AppleSlider
                    label="Food Subtotal (₹)"
                    unit="₹"
                    value={subtotal}
                    min={50}
                    max={3000}
                    step={25}
                    onChange={setSubtotal}
                    iconVariant="currency"
                    accentColor="lime"
                    minLabel="₹50"
                    maxLabel="₹3,000"
                  />
                  <div className="pt-2">
                    <input
                      type="number"
                      value={subtotal}
                      onChange={(e) => setSubtotal(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-1.5 text-[#18201c] dark:text-white font-mono font-bold text-xs outline-none focus:border-[#18201c] dark:focus:border-[#d9f447]"
                    />
                  </div>
                </div>

                {/* Road Distance */}
                <div className="bg-gray-50 dark:bg-[#0b0f0d] p-4 rounded-2xl border border-gray-200 dark:border-[#202923]">
                  <AppleSlider
                    label="Delivery Distance (KM)"
                    unit="km"
                    value={distanceKm}
                    min={0.5}
                    max={25}
                    step={0.5}
                    onChange={setDistanceKm}
                    iconVariant="distance"
                    accentColor="blue"
                    minLabel="0.5 km"
                    maxLabel="25 km"
                  />
                </div>

                {/* Driver Share % */}
                <div className="bg-gray-50 dark:bg-[#0b0f0d] p-4 rounded-2xl border border-gray-200 dark:border-[#202923]">
                  <AppleSlider
                    label="Driver Payout Share (%)"
                    unit="%"
                    value={driverPayoutSharePercent}
                    min={50}
                    max={100}
                    step={5}
                    onChange={setDriverPayoutSharePercent}
                    iconVariant="percent"
                    accentColor="emerald"
                    minLabel="50%"
                    maxLabel="100%"
                  />
                </div>

                {/* Multi-column Inputs */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      Vendor Commission %
                    </label>
                    <input
                      type="number"
                      value={vendorCommissionPercent}
                      onChange={(e) => setVendorCommissionPercent(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-[#18201c] dark:text-white font-mono font-bold outline-none focus:border-[#18201c] dark:focus:border-[#d9f447]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      Platform Fee (₹)
                    </label>
                    <input
                      type="number"
                      value={platformFee}
                      onChange={(e) => setPlatformFee(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-[#18201c] dark:text-white font-mono font-bold outline-none focus:border-[#18201c] dark:focus:border-[#d9f447]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      Handling Charge (₹)
                    </label>
                    <input
                      type="number"
                      value={handlingFee}
                      onChange={(e) => setHandlingFee(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-[#18201c] dark:text-white font-mono font-bold outline-none focus:border-[#18201c] dark:focus:border-[#d9f447]"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                      Customer Tip (₹)
                    </label>
                    <input
                      type="number"
                      value={tip}
                      onChange={(e) => setTip(Number(e.target.value))}
                      className="w-full bg-white dark:bg-[#0b0f0d] border border-gray-200 dark:border-[#202923] rounded-xl px-3 py-2 text-emerald-600 dark:text-emerald-400 font-mono font-black outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Rain & Night Surge Toggles */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-[#202923]">
                  <button
                    onClick={() => setIsRainModeActive(!isRainModeActive)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isRainModeActive
                        ? 'bg-blue-50 border-blue-300 text-blue-800 dark:bg-blue-950/50 dark:border-blue-500/60 dark:text-blue-200 shadow-sm dark:shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                        : 'bg-white dark:bg-[#0b0f0d] border-gray-200 dark:border-[#202923] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <CloudRain
                        className={`size-4 ${isRainModeActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}
                      />
                      <div>
                        <p className="font-extrabold text-xs text-[#18201c] dark:text-white">
                          Rain Surge
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">+₹{rainFee}</p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isRainModeActive ? 'bg-blue-600 text-white dark:bg-blue-500' : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}
                    >
                      {isRainModeActive ? 'ON' : 'OFF'}
                    </span>
                  </button>

                  <button
                    onClick={() => setIsNightSurgeActive(!isNightSurgeActive)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition ${
                      isNightSurgeActive
                        ? 'bg-purple-50 border-purple-300 text-purple-800 dark:bg-purple-950/50 dark:border-purple-500/60 dark:text-purple-200 shadow-sm dark:shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-white dark:bg-[#0b0f0d] border-gray-200 dark:border-[#202923] text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Moon
                        className={`size-4 ${isNightSurgeActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}
                      />
                      <div>
                        <p className="font-extrabold text-xs text-[#18201c] dark:text-white">
                          Night Surge
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          +₹{nightSurgeFee}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${isNightSurgeActive ? 'bg-purple-600 text-white dark:bg-purple-500' : 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-400'}`}
                    >
                      {isNightSurgeActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Output Breakdown Column (7 cols) */}
          <div className="lg:col-span-7">
            <EconomicsCards
              calculatorResult={calculatorResult}
              distanceKm={distanceKm}
              selectedCouponCode={selectedCouponCode}
            />
          </div>
        </div>
      )}

      {/* Database Inspector Tabs */}
      {activeTab !== 'calculator' && (
        <DatabaseInspectorTabs activeTab={activeTab} dbData={dbData} />
      )}
    </div>
  )
}

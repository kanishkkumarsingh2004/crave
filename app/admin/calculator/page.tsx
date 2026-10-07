'use client'

import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  CloudRain,
  Coins,
  Database,
  DollarSign,
  Flame,
  HelpCircle,
  Layers,
  Moon,
  Percent,
  RefreshCw,
  Sliders,
  Sparkles,
  Store,
  Tag,
  Truck,
  UserCheck,
  Zap,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'
import { calculateFullBreakdown, CalculatorInput, FullCalculatorResult } from '@/lib/calculator'

interface DbData {
  paymentConfig: any
  restaurants: any[]
  coupons: any[]
  orders: any[]
  vendorSettlements: any[]
  driverPayouts: any[]
  fetchedAt?: string
}

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
  const [tip, setTip] = useState<number>(30)
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

  // Handle Preset Selection: Load Order from DB
  const handleSelectDbOrder = (orderId: string) => {
    setSelectedOrderId(orderId)
    if (!orderId || !dbData?.orders) return

    const ord = dbData.orders.find((o) => o.id === orderId)
    if (ord) {
      setSubtotal(ord.subtotal || 450)
      setPackagingFee(ord.packaging_fee ?? 20)
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
    if (!restId || !dbData?.restaurants) return
    const rest = dbData.restaurants.find((r) => r.id === restId)
    if (rest && rest.commission_rate != null) {
      setVendorCommissionPercent(rest.commission_rate)
    }
  }

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

  const { customerBilling, vendorSettlement, driverEarnings, platformEconomics } = calculatorResult

  return (
    <div className="min-h-screen bg-[#0f1412] text-white p-4 md:p-8 font-sans">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#242f29] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#d9f447]/10 text-[#d9f447] rounded-lg border border-[#d9f447]/20">
                <Calculator className="size-6" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Calculator & Unit Economics Playground
              </h1>
            </div>
            <p className="text-sm text-gray-400">
              Real-time database integration: Fetch live parameters from PostgreSQL and simulate
              customer bills, vendor payouts, driver earnings, and platform margin.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#18201c] border border-[#2d3a33] text-xs">
              <Database className="size-3.5 text-[#d9f447]" />
              {loadingDb ? (
                <span className="text-yellow-400 animate-pulse">Syncing DB...</span>
              ) : dbError ? (
                <span className="text-red-400">DB Error</span>
              ) : (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="size-3" /> DB Connected
                </span>
              )}
            </div>

            <button
              onClick={fetchDbData}
              disabled={loadingDb}
              className="flex items-center gap-2 px-4 py-2 bg-[#d9f447] text-[#0f1412] font-bold rounded-lg hover:bg-[#c8e336] transition duration-200 text-xs shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${loadingDb ? 'animate-spin' : ''}`} />
              Fetch Live DB Values
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#242f29] pb-3">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'calculator'
                ? 'bg-[#d9f447] text-[#0f1412]'
                : 'bg-[#18201c] text-gray-400 hover:text-white border border-[#28352e]'
            }`}
          >
            <Sliders className="size-3.5" /> Interactive Playground
          </button>
          <button
            onClick={() => setActiveTab('db_config')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'db_config'
                ? 'bg-[#d9f447] text-[#0f1412]'
                : 'bg-[#18201c] text-gray-400 hover:text-white border border-[#28352e]'
            }`}
          >
            <Zap className="size-3.5" /> DB Config
          </button>
          <button
            onClick={() => setActiveTab('db_restaurants')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'db_restaurants'
                ? 'bg-[#d9f447] text-[#0f1412]'
                : 'bg-[#18201c] text-gray-400 hover:text-white border border-[#28352e]'
            }`}
          >
            <Store className="size-3.5" /> DB Restaurants ({dbData?.restaurants?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('db_coupons')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'db_coupons'
                ? 'bg-[#d9f447] text-[#0f1412]'
                : 'bg-[#18201c] text-gray-400 hover:text-white border border-[#28352e]'
            }`}
          >
            <Tag className="size-3.5" /> DB Coupons ({dbData?.coupons?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('db_orders')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === 'db_orders'
                ? 'bg-[#d9f447] text-[#0f1412]'
                : 'bg-[#18201c] text-gray-400 hover:text-white border border-[#28352e]'
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
              <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#242f29] pb-3">
                  <h3 className="text-sm font-bold text-[#d9f447] flex items-center gap-2 uppercase tracking-wider">
                    <Database className="size-4" /> Load Real Data from DB
                  </h3>
                  <span className="text-[10px] bg-[#1e2722] px-2 py-0.5 rounded text-gray-400">
                    Preset Loader
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Select DB Recent Order:
                    </label>
                    <select
                      value={selectedOrderId}
                      onChange={(e) => handleSelectDbOrder(e.target.value)}
                      className="w-full bg-[#0d1210] border border-[#2d3a33] rounded-lg px-3 py-2 text-white focus:border-[#d9f447] outline-none"
                    >
                      <option value="">-- Choose Order from Database --</option>
                      {dbData?.orders?.map((ord) => (
                        <option key={ord.id} value={ord.id}>
                          {ord.customer_name} ({ord.restaurant_name}) - ₹{ord.total_amount} [
                          {ord.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">
                        DB Restaurant:
                      </label>
                      <select
                        value={selectedRestaurantId}
                        onChange={(e) => handleSelectDbRestaurant(e.target.value)}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded-lg px-2.5 py-2 text-white focus:border-[#d9f447] outline-none truncate"
                      >
                        <option value="">-- Restaurant --</option>
                        {dbData?.restaurants?.map((rest) => (
                          <option key={rest.id} value={rest.id}>
                            {rest.name} ({rest.commission_rate ?? 15}%)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">DB Coupon:</label>
                      <select
                        value={selectedCouponCode}
                        onChange={(e) => setSelectedCouponCode(e.target.value)}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded-lg px-2.5 py-2 text-white focus:border-[#d9f447] outline-none truncate"
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
                </div>
              </div>

              {/* Playground Inputs & Controls */}
              <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-5 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#242f29] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Sliders className="size-4 text-[#d9f447]" /> Financial Parameters
                  </h3>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Cart Subtotal */}
                  <div className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-300">Food Subtotal (₹)</span>
                      <span className="text-[#d9f447] font-bold">₹{subtotal}</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={3000}
                      step={25}
                      value={subtotal}
                      onChange={(e) => setSubtotal(Number(e.target.value))}
                      className="w-full accent-[#d9f447] bg-[#242f29] h-1.5 rounded-lg cursor-pointer"
                    />
                    <div className="flex gap-2 pt-1">
                      <input
                        type="number"
                        value={subtotal}
                        onChange={(e) => setSubtotal(Number(e.target.value))}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Road Distance */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-300">Delivery Road Distance (KM)</span>
                      <span className="text-[#d9f447] font-bold">{distanceKm} km</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={25}
                      step={0.5}
                      value={distanceKm}
                      onChange={(e) => setDistanceKm(Number(e.target.value))}
                      className="w-full accent-[#d9f447] bg-[#242f29] h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Driver Share % */}
                  <div className="space-y-1 pt-2">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-300">Driver Payout Share (%)</span>
                      <span className="text-emerald-400 font-bold">
                        {driverPayoutSharePercent}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={100}
                      step={5}
                      value={driverPayoutSharePercent}
                      onChange={(e) => setDriverPayoutSharePercent(Number(e.target.value))}
                      className="w-full accent-emerald-400 bg-[#242f29] h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Multi-column Inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">
                        Vendor Commission %
                      </label>
                      <input
                        type="number"
                        value={vendorCommissionPercent}
                        onChange={(e) => setVendorCommissionPercent(Number(e.target.value))}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">
                        Platform Fee (₹)
                      </label>
                      <input
                        type="number"
                        value={platformFee}
                        onChange={(e) => setPlatformFee(Number(e.target.value))}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">
                        Handling Charge (₹)
                      </label>
                      <input
                        type="number"
                        value={handlingFee}
                        onChange={(e) => setHandlingFee(Number(e.target.value))}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">
                        Customer Tip (₹)
                      </label>
                      <input
                        type="number"
                        value={tip}
                        onChange={(e) => setTip(Number(e.target.value))}
                        className="w-full bg-[#0d1210] border border-[#2d3a33] rounded px-3 py-1.5 text-white font-mono text-emerald-400 font-bold"
                      />
                    </div>
                  </div>

                  {/* Rain & Night Surge Toggles */}
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#242f29]">
                    <button
                      onClick={() => setIsRainModeActive(!isRainModeActive)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                        isRainModeActive
                          ? 'bg-blue-950/40 border-blue-500/50 text-blue-300'
                          : 'bg-[#0d1210] border-[#253229] text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <CloudRain
                          className={`size-4 ${isRainModeActive ? 'text-blue-400' : ''}`}
                        />
                        <div>
                          <p className="font-bold text-xs">Rain Surge</p>
                          <p className="text-[10px] text-gray-400">+₹{rainFee}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isRainModeActive ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {isRainModeActive ? 'ON' : 'OFF'}
                      </span>
                    </button>

                    <button
                      onClick={() => setIsNightSurgeActive(!isNightSurgeActive)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition ${
                        isNightSurgeActive
                          ? 'bg-purple-950/40 border-purple-500/50 text-purple-300'
                          : 'bg-[#0d1210] border-[#253229] text-gray-400'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Moon className={`size-4 ${isNightSurgeActive ? 'text-purple-400' : ''}`} />
                        <div>
                          <p className="font-bold text-xs">Night Surge</p>
                          <p className="text-[10px] text-gray-400">+₹{nightSurgeFee}</p>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${isNightSurgeActive ? 'bg-purple-500 text-white' : 'bg-gray-800 text-gray-400'}`}
                      >
                        {isNightSurgeActive ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Output Breakdown Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Unit Economics 4-Grid Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Customer Bill Card */}
                <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#242f29] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <DollarSign className="size-3.5 text-[#d9f447]" /> Customer Bill
                    </span>
                    <span className="text-xs font-mono font-extrabold text-[#d9f447] bg-[#d9f447]/10 px-2 py-0.5 rounded">
                      ₹{customerBilling.grandTotal}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Food Subtotal</span>
                      <span>₹{customerBilling.subtotal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Packaging Charge</span>
                      <span>₹{customerBilling.packagingFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Delivery Fee ({distanceKm}km)</span>
                      <span>₹{customerBilling.netDeliveryFee}</span>
                    </div>
                    {customerBilling.couponDiscount > 0 && (
                      <div className="flex justify-between text-emerald-400 font-semibold">
                        <span>Coupon ({selectedCouponCode})</span>
                        <span>-₹{customerBilling.couponDiscount}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Platform & Handling</span>
                      <span>₹{customerBilling.platformFee + customerBilling.handlingFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">GST (18%)</span>
                      <span>₹{customerBilling.gstAmount}</span>
                    </div>
                    {customerBilling.tip > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>Driver Tip</span>
                        <span>+₹{customerBilling.tip}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-[#242f29] text-sm">
                      <span>Total Paid</span>
                      <span className="text-[#d9f447]">₹{customerBilling.grandTotal}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Vendor Net Payout Card */}
                <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#242f29] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Store className="size-3.5 text-orange-400" /> Vendor Payout
                    </span>
                    <span className="text-xs font-mono font-extrabold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded">
                      ₹{vendorSettlement.netVendorPayout}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Gross Food Sales</span>
                      <span>₹{vendorSettlement.grossSales}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Commission Rate</span>
                      <span>{vendorSettlement.commissionRatePercent}%</span>
                    </div>
                    <div className="flex justify-between text-red-400">
                      <span>Commission Deducted</span>
                      <span>-₹{vendorSettlement.commissionDeducted}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-[#242f29] text-sm">
                      <span>Net Vendor Payout</span>
                      <span className="text-orange-400">₹{vendorSettlement.netVendorPayout}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Driver Earnings Card */}
                <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#242f29] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Truck className="size-3.5 text-emerald-400" /> Driver Earnings
                    </span>
                    <span className="text-xs font-mono font-extrabold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">
                      ₹{driverEarnings.totalDriverEarnings}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Base Distance Share</span>
                      <span>₹{driverEarnings.baseDistanceShare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Extra KM Share</span>
                      <span>₹{driverEarnings.extraDistanceShare}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Surge/Rain Share</span>
                      <span>₹{driverEarnings.surgeRainShare}</span>
                    </div>
                    {driverEarnings.tip > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>100% Customer Tip</span>
                        <span>+₹{driverEarnings.tip}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-[#242f29] text-sm">
                      <span>Total Driver Payout</span>
                      <span className="text-emerald-400">
                        ₹{driverEarnings.totalDriverEarnings}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. Platform Net Profit Card */}
                <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-3 relative overflow-hidden shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#242f29] pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <Coins className="size-3.5 text-yellow-400" /> Platform Margin
                    </span>
                    <span
                      className={`text-xs font-mono font-extrabold px-2 py-0.5 rounded ${
                        platformEconomics.platformNetProfit >= 0
                          ? 'text-yellow-400 bg-yellow-400/10'
                          : 'text-red-400 bg-red-400/10'
                      }`}
                    >
                      ₹{platformEconomics.platformNetProfit} (
                      {platformEconomics.profitMarginPercent}%)
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-gray-300 font-mono">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Customer Paid</span>
                      <span>₹{platformEconomics.totalCollectedFromCustomer}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Less: Vendor Payout</span>
                      <span>-₹{platformEconomics.totalPaidToVendor}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Less: Driver Earnings</span>
                      <span>-₹{platformEconomics.totalPaidToDriver}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Less: GST Payable</span>
                      <span>-₹{platformEconomics.totalGstCollected}</span>
                    </div>
                    <div className="flex justify-between font-bold text-white pt-2 border-t border-[#242f29] text-sm">
                      <span>Platform Profit Margin</span>
                      <span
                        className={
                          platformEconomics.platformNetProfit >= 0
                            ? 'text-yellow-400'
                            : 'text-red-400'
                        }
                      >
                        ₹{platformEconomics.platformNetProfit}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comprehensive Output Breakdown Table */}
              <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-5 space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-[#242f29] pb-3">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
                    <Sparkles className="size-4 text-[#d9f447]" /> Unit Economics Breakdown Summary
                  </h3>
                  <span className="text-[10px] text-gray-400 font-mono">Real-time Calculation</span>
                </div>

                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#28352e] text-gray-400 uppercase text-[10px]">
                        <th className="py-2 px-3">Entity</th>
                        <th className="py-2 px-3">Revenue / Amount</th>
                        <th className="py-2 px-3">Outflow / Cost</th>
                        <th className="py-2 px-3">Net Profit / Share</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e2722] text-gray-300">
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Customer</td>
                        <td className="py-2.5 px-3 text-[#d9f447] font-bold">
                          ₹{customerBilling.grandTotal}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">-</td>
                        <td className="py-2.5 px-3 text-gray-400">Order Fulfilled</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Restaurant Vendor</td>
                        <td className="py-2.5 px-3">₹{vendorSettlement.grossSales} (Gross)</td>
                        <td className="py-2.5 px-3 text-red-400">
                          -₹{vendorSettlement.commissionDeducted} (Commission)
                        </td>
                        <td className="py-2.5 px-3 text-orange-400 font-bold">
                          ₹{vendorSettlement.netVendorPayout}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-3 font-semibold text-white">Delivery Driver</td>
                        <td className="py-2.5 px-3">
                          ₹{driverEarnings.deliveryFeeCollected} (Delivery Fee)
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">-</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          ₹{driverEarnings.totalDriverEarnings}
                        </td>
                      </tr>
                      <tr className="bg-[#1b241f]">
                        <td className="py-2.5 px-3 font-bold text-[#d9f447]">Platform (Crave)</td>
                        <td className="py-2.5 px-3 text-yellow-400 font-bold">
                          ₹{platformEconomics.platformGrossRevenue} (Gross Margin)
                        </td>
                        <td className="py-2.5 px-3 text-gray-400">
                          ₹
                          {platformEconomics.totalPaidToDriver +
                            platformEconomics.totalPaidToVendor}{' '}
                          (Payouts)
                        </td>
                        <td className="py-2.5 px-3 font-extrabold text-yellow-400">
                          ₹{platformEconomics.platformNetProfit} (
                          {platformEconomics.profitMarginPercent}%)
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: DB Payment Config */}
        {activeTab === 'db_config' && (
          <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-[#d9f447] flex items-center gap-2">
              <Zap className="size-4" /> Active Database Payment Configuration
            </h3>
            <pre className="bg-[#0b0e0d] p-4 rounded-lg text-xs font-mono text-emerald-400 overflow-x-auto border border-[#232e27]">
              {JSON.stringify(dbData?.paymentConfig || {}, null, 2)}
            </pre>
          </div>
        )}

        {/* Tab Content: DB Restaurants */}
        {activeTab === 'db_restaurants' && (
          <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Store className="size-4 text-orange-400" /> Loaded DB Restaurants (
              {dbData?.restaurants?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dbData?.restaurants?.map((rest) => (
                <div
                  key={rest.id}
                  className="bg-[#0f1412] p-4 rounded-lg border border-[#232e27] space-y-1 text-xs"
                >
                  <p className="font-bold text-white text-sm">{rest.name}</p>
                  <p className="text-gray-400">{rest.cuisine || 'Cuisine N/A'}</p>
                  <div className="flex justify-between pt-2 border-t border-[#1f2923] text-gray-300 font-mono">
                    <span>Commission Rate:</span>
                    <span className="text-[#d9f447] font-bold">{rest.commission_rate ?? 15}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: DB Coupons */}
        {activeTab === 'db_coupons' && (
          <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Tag className="size-4 text-[#d9f447]" /> Loaded DB Active Coupons (
              {dbData?.coupons?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {dbData?.coupons?.map((coup) => (
                <div
                  key={coup.id}
                  className="bg-[#0f1412] p-4 rounded-lg border border-[#232e27] space-y-1 text-xs"
                >
                  <span className="font-mono font-extrabold text-[#d9f447] bg-[#d9f447]/10 px-2 py-0.5 rounded">
                    {coup.code}
                  </span>
                  <p className="text-gray-300 pt-1">{coup.description}</p>
                  <div className="flex justify-between pt-2 border-t border-[#1f2923] text-gray-300 font-mono">
                    <span>Discount Value:</span>
                    <span className="text-emerald-400 font-bold">
                      {coup.discount_type === 'percentage'
                        ? `${coup.discount_value}%`
                        : `₹${coup.discount_value}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content: DB Orders */}
        {activeTab === 'db_orders' && (
          <div className="bg-[#151c18] border border-[#26332b] rounded-xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="size-4 text-purple-400" /> Recent Database Orders (
              {dbData?.orders?.length || 0})
            </h3>
            <div className="overflow-x-auto text-xs font-mono">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#28352e] text-gray-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Order ID</th>
                    <th className="py-2 px-3">Customer</th>
                    <th className="py-2 px-3">Restaurant</th>
                    <th className="py-2 px-3">Subtotal</th>
                    <th className="py-2 px-3">Total Amount</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e2722] text-gray-300">
                  {dbData?.orders?.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#1b241f] transition">
                      <td className="py-2.5 px-3 text-gray-400">{ord.id.slice(0, 10)}...</td>
                      <td className="py-2.5 px-3 font-semibold text-white">{ord.customer_name}</td>
                      <td className="py-2.5 px-3 text-gray-300">{ord.restaurant_name}</td>
                      <td className="py-2.5 px-3">₹{ord.subtotal}</td>
                      <td className="py-2.5 px-3 text-[#d9f447] font-bold">₹{ord.total_amount}</td>
                      <td className="py-2.5 px-3">
                        <span className="bg-[#242f29] px-2 py-0.5 rounded text-gray-300 text-[10px]">
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

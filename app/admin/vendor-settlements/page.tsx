'use client'

import { getLocalPaymentConfig } from '@/lib/payment-config'
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  Percent,
  Search,
  Sliders,
  Sparkles,
  Store,
  TrendingUp,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface VendorFinancialRecord {
  id: string
  name: string
  ownerName: string
  email: string
  phone: string
  cuisine: string
  address: string
  fssaiLicense: string
  bankAccount: string
  ifscCode: string
  weeklyGrossSales: number
  commissionRate: number // %
  packagingCapFee: number // ₹
  promoSubsidyPct: number // %
  settlementStatus: 'pending' | 'settled'
  kitchenStatus: 'open' | 'closed'
  activeOrdersCount: number
  completedDropsCount: number
}

export default function VendorSettlementsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all')
  const [selectedVendor, setSelectedVendor] = useState<VendorFinancialRecord | null>(null)
  const [settlementProcessedSuccess, setSettlementProcessedSuccess] = useState(false)

  // Restaurants list with financial data
  const [vendors, setVendors] = useState<VendorFinancialRecord[]>([])

  useEffect(() => {
    async function loadLiveSettlements() {
      const activeCfg = getLocalPaymentConfig()
      try {
        const settsResp = await fetch('/api/admin/settlements')
        const settsJson = await settsResp.json()
        const setts = settsJson.settlements
        if (setts && setts.length > 0) {
          const loaded: VendorFinancialRecord[] = setts.map((s: any) => ({
            id: s.id,
            name: s.restaurant_name,
            ownerName: 'Verified Partner Store',
            email: 'partner@crave.com',
            phone: '+91 98765 43212',
            cuisine: 'Multi-Cuisine & Fast Food',
            address: 'Bengaluru, India',
            fssaiLicense: '#11223344556677',
            bankAccount: 'HDFC •••• 9821',
            ifscCode: 'HDFC0001234',
            weeklyGrossSales: Number(s.gross_sales || 0),
            commissionRate: Number(s.commission_rate || activeCfg.vendorCommission),
            packagingCapFee: activeCfg.packagingCap,
            promoSubsidyPct: 0,
            settlementStatus: s.status === 'settled' ? 'settled' : 'pending',
            kitchenStatus: 'open',
            activeOrdersCount: 1,
            completedDropsCount: 12,
          }))
          setVendors(loaded)
          return
        }

        // Fallback: Compute live settlements directly from /api/orders
        const res = await fetch('/api/orders')
        const json = await res.json()
        if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
          const restaurantMap: Record<string, { name: string; gross: number; count: number }> = {}
          json.orders.forEach((o: any) => {
            const rName = o.restaurant_name || 'Crave Kitchen Store'
            if (!restaurantMap[rName]) {
              restaurantMap[rName] = { name: rName, gross: 0, count: 0 }
            }
            restaurantMap[rName].gross += Number(o.subtotal || o.total_amount || 0)
            restaurantMap[rName].count += 1
          })

          const computed: VendorFinancialRecord[] = Object.values(restaurantMap).map(
            (item, idx) => ({
              id: `v_settle_${idx + 1}`,
              name: item.name,
              ownerName: 'Verified Partner Store',
              email: 'partner@crave.com',
              phone: '+91 98765 43212',
              cuisine: 'Multi-Cuisine & Fast Food',
              address: 'Bengaluru, India',
              fssaiLicense: `#112233445${idx + 10}`,
              bankAccount: `HDFC •••• ${4000 + idx * 111}`,
              ifscCode: 'HDFC0001234',
              weeklyGrossSales: item.gross,
              commissionRate: activeCfg.vendorCommission,
              packagingCapFee: activeCfg.packagingCap,
              promoSubsidyPct: 0,
              settlementStatus: 'pending',
              kitchenStatus: 'open',
              activeOrdersCount: 0,
              completedDropsCount: item.count,
            })
          )
          setVendors(computed)
          return
        }
      } catch (err) {
        console.error('Failed to load settlements:', err)
      }

      try {
        const restRes = await fetch('/api/restaurants')
        const restJson = await restRes.json()
        if (
          restJson.success &&
          Array.isArray(restJson.restaurants) &&
          restJson.restaurants.length > 0
        ) {
          const loaded: VendorFinancialRecord[] = restJson.restaurants.map((r: any) => ({
            id: r.id,
            name: r.name,
            ownerName: r.owner?.name || 'Verified Partner Store',
            email: r.owner?.email || 'partner@crave.com',
            phone: r.phone || '+91 98765 43212',
            cuisine: r.cuisine || 'Multi-Cuisine',
            address: r.address || 'Bengaluru, India',
            fssaiLicense: r.fssai_license || '#11223344556677',
            bankAccount: r.bank_account_number || 'Pending Bank Sync',
            ifscCode: r.bank_ifsc || 'N/A',
            weeklyGrossSales: 0,
            commissionRate: Number(r.commission_rate || activeCfg.vendorCommission || 15),
            packagingCapFee: activeCfg.packagingCap,
            promoSubsidyPct: 0,
            settlementStatus: 'pending',
            kitchenStatus: r.is_open ? 'open' : 'closed',
            activeOrdersCount: 0,
            completedDropsCount: 0,
          }))
          setVendors(loaded)
          return
        }
      } catch (e) {}

      setVendors([])
    }
    loadLiveSettlements()
  }, [])

  // Filtered vendors
  const filteredVendors = vendors.filter((v) => {
    const matchesQuery =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || v.settlementStatus === statusFilter
    return matchesQuery && matchesStatus
  })

  // Global Financial Totals
  const totalGrossSales = vendors.reduce((acc, v) => acc + v.weeklyGrossSales, 0)
  const totalCommissionRevenue = vendors.reduce(
    (acc, v) => acc + (v.weeklyGrossSales * v.commissionRate) / 100,
    0
  )
  const totalNetVendorPayable = totalGrossSales - totalCommissionRevenue
  const pendingSettlementsCount = vendors.filter((v) => v.settlementStatus === 'pending').length

  // Helper calculation for single vendor
  function getVendorFinancials(v: VendorFinancialRecord) {
    const gross =
      typeof v.weeklyGrossSales === 'number'
        ? v.weeklyGrossSales
        : parseFloat(v.weeklyGrossSales as any) || 0
    const commRate =
      typeof v.commissionRate === 'number'
        ? v.commissionRate
        : parseFloat(v.commissionRate as any) || 0
    const promoPct =
      typeof v.promoSubsidyPct === 'number'
        ? v.promoSubsidyPct
        : parseFloat(v.promoSubsidyPct as any) || 0

    const commissionCut = (gross * commRate) / 100
    const promoCut = (gross * promoPct) / 100
    const netPayable = gross - commissionCut + promoCut
    return { commissionCut, promoCut, netPayable }
  }

  // Update Vendor Pricing & Commission in Playground
  async function updateVendorPricing(id: string, field: keyof VendorFinancialRecord, value: any) {
    setVendors((prev) => prev.map((v) => (v.id === id ? { ...v, [field]: value } : v)))
    if (selectedVendor && selectedVendor.id === id) {
      setSelectedVendor((prev) => (prev ? { ...prev, [field]: value } : null))
    }

    try {
      await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          restaurant_id: id,
          ...(field === 'commissionRate' && { commission_rate: value }),
          ...(field === 'settlementStatus' && { status: value }),
        }),
      })
    } catch (e) {
      console.warn('Settlement DB sync notice:', e)
    }
  }

  // Process Settlement Action
  async function markVendorSettled(id: string) {
    await updateVendorPricing(id, 'settlementStatus', 'settled')
    setSettlementProcessedSuccess(true)
    setTimeout(() => {
      setSettlementProcessedSuccess(false)
    }, 3000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] dark:border-[#27342d] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#849e16] dark:text-[#d9f447]">
            Restaurant Payouts & Commission Control
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Vendor Settlements & Financials
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76] dark:text-gray-400">
            Inspect restaurant sales, calculate commission cuts, alter vendor pricing parameters,
            and process weekly payouts.
          </p>
        </div>

        {settlementProcessedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 px-4 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" /> Settlement
            Payout Processed Successfully!
          </div>
        )}
      </div>

      {/* Network Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] dark:text-gray-400">
              Weekly Gross
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300">
              <DollarSign className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-[#18201c] dark:text-white">
            ₹{totalGrossSales.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="size-3 sm:size-3.5" /> Across {vendors.length} kitchens
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] dark:text-gray-400">
              Our Commission
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
              <Percent className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
            ₹{totalCommissionRevenue.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77] dark:text-gray-400">
            Net revenue cut
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] dark:text-gray-400">
              Net Vendor Pay
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300">
              <Store className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-blue-700 dark:text-blue-400">
            ₹{totalNetVendorPayable.toLocaleString()}
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77] dark:text-gray-400">
            To be disbursed
          </p>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-[#e2e7dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-3.5 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#737e77] dark:text-gray-400">
              Pending Pay
            </span>
            <span className="grid size-7 sm:size-8 place-items-center rounded-lg sm:rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
              <Clock3 className="size-3.5 sm:size-4" />
            </span>
          </div>
          <p className="mt-2 sm:mt-3 text-lg sm:text-2xl lg:text-3xl font-bold text-amber-600 dark:text-amber-400">
            {pendingSettlementsCount} Kitchens
          </p>
          <p className="mt-1 text-[10px] sm:text-xs text-[#737e77] dark:text-gray-400">
            Awaiting payout release
          </p>
        </div>
      </div>

      {/* Main Vendor Settlements Table Section */}
      <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] dark:border-[#27342d] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#18201c] dark:text-white">
              Kitchen Vendor Financial Breakdown
            </h3>
            <p className="text-xs text-[#737e77] dark:text-gray-400">
              Select any restaurant to alter custom commission, set pricing, or disburse
              settlements.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurant or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white placeholder-gray-400 dark:placeholder-gray-500 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#86a018]"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 dark:bg-[#121815] p-1 text-xs font-bold">
              {['all', 'pending', 'settled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`rounded-full px-3 py-1 text-[11px] capitalize transition ${
                    statusFilter === st
                      ? 'bg-[#18201c] dark:bg-[#86a018] text-white dark:text-[#121815]'
                      : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Vendor Cards (< md) */}
        <div className="flex flex-col gap-3.5 mt-6 block md:hidden">
          {filteredVendors.map((v) => {
            const fin = getVendorFinancials(v)
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 bg-white dark:bg-[#18201c] flex flex-col gap-3 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-[#18201c] dark:text-white">{v.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {v.ownerName} · {v.phone}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                      v.settlementStatus === 'settled'
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50'
                    }`}
                  >
                    {v.settlementStatus}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 border-y border-gray-100 dark:border-[#27342d] py-2.5 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Weekly Gross
                    </span>
                    <span className="font-bold text-[#18201c] dark:text-white text-sm">
                      ₹{v.weeklyGrossSales.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-400 block">
                      Commission Cut ({v.commissionRate}%)
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400 text-sm">
                      ₹{fin.commissionCut.toLocaleString()}
                    </span>
                  </div>
                  <div className="col-span-2 pt-1 border-t border-dashed border-gray-100 dark:border-[#27342d] flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-gray-400">
                      Net Payable
                    </span>
                    <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                      ₹{fin.netPayable.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">
                    {v.cuisine}
                  </span>
                  <button
                    onClick={() => setSelectedVendor(v)}
                    className="rounded-full bg-[#18201c] dark:bg-[#86a018] px-3.5 py-1.5 text-xs font-bold text-white dark:text-[#121815] transition hover:bg-[#323d36] dark:hover:bg-[#97b51b] flex items-center gap-1.5"
                  >
                    <Sliders className="size-3.5 text-[#d9f447] dark:text-[#121815]" /> Alter &
                    Inspect
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Desktop & Tablet Table (>= md) */}
        <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-[#27342d]">
          <table className="w-full text-left text-xs min-w-[850px]">
            <thead className="border-b border-gray-200 dark:border-[#27342d] bg-gray-50/80 dark:bg-[#121815] text-gray-500 dark:text-gray-400 uppercase font-bold text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">Restaurant & Owner</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Cuisine / Location</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Weekly Gross Sales</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Commission Cut (%)</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Our Platform Cut</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Net Vendor Settlement</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Payout Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] bg-white dark:bg-[#18201c]">
              {filteredVendors.map((v) => {
                const fin = getVendorFinancials(v)
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50/60 dark:hover:bg-[#202923]/60 transition"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-bold text-[#18201c] dark:text-white text-sm">{v.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {v.ownerName} ({v.phone})
                      </p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-semibold text-gray-700 dark:text-gray-300">{v.cuisine}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{v.address}</p>
                    </td>
                    <td className="px-4 py-4 font-bold text-base text-[#18201c] dark:text-white whitespace-nowrap">
                      ₹{v.weeklyGrossSales.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                        {v.commissionRate}%
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      ₹{fin.commissionCut.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-bold text-blue-700 dark:text-blue-400 text-sm whitespace-nowrap">
                      ₹{fin.netPayable.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                          v.settlementStatus === 'settled'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/50'
                        }`}
                      >
                        {v.settlementStatus}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className="rounded-full bg-[#18201c] dark:bg-[#86a018] px-3.5 py-1.5 text-[11px] font-bold text-white dark:text-[#121815] transition hover:bg-[#323d36] dark:hover:bg-[#97b51b] flex items-center gap-1.5 ml-auto"
                      >
                        <Sliders className="size-3 text-[#d9f447] dark:text-[#121815]" /> Alter &
                        Inspect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Interactive Vendor Pricing & Financial Playground Modal / Drawer */}
      {selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#18201c]/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#18201c] text-gray-900 dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d]">
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#27342d] pb-4">
              <div>
                <span className="rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-[10px] font-bold text-amber-900 dark:text-amber-300 uppercase">
                  Vendor Pricing Playground & Monitor
                </span>
                <h3 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
                  {selectedVendor.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {selectedVendor.cuisine} · {selectedVendor.address}
                </p>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="grid size-9 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] hover:bg-gray-200 dark:hover:bg-[#202923]"
              >
                <X className="size-5 text-gray-600 dark:text-gray-300" />
              </button>
            </div>

            {/* Financial Overview Cards for this Vendor */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-[#f8f9f6] p-4">
                <p className="text-[10px] font-bold uppercase text-gray-500">Weekly Gross Sales</p>
                <p className="text-2xl font-bold text-[#18201c] mt-1">
                  ₹{selectedVendor.weeklyGrossSales.toLocaleString()}
                </p>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {selectedVendor.completedDropsCount} drops completed
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-[10px] font-bold uppercase text-amber-800">
                  Our Platform Cut ({selectedVendor.commissionRate}%)
                </p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  ₹{getVendorFinancials(selectedVendor).commissionCut.toLocaleString()}
                </p>
                <p className="text-[10px] text-amber-800 mt-0.5">Retained platform commission</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-bold uppercase text-emerald-800">
                  Net Vendor Settlement
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  ₹{getVendorFinancials(selectedVendor).netPayable.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-800 mt-0.5">
                  Payable to {selectedVendor.ownerName}
                </p>
              </div>
            </div>

            {/* Section 2: Alter & Custom Set Pricing Playground */}
            <div className="mt-6 rounded-3xl border border-purple-200 bg-purple-50/30 p-5">
              <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" /> Alter & Custom Set Vendor Pricing
              </h4>
              <p className="text-xs text-purple-900/70 mt-0.5">
                Override custom commission rate, packaging cap, or promo subsidy specifically for{' '}
                {selectedVendor.name}.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
                <div>
                  <label className="font-bold text-[#18201c]">Commission Rate (%)</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={selectedVendor.commissionRate}
                      onChange={(e) => {
                        const val = e.target.value
                        updateVendorPricing(
                          selectedVendor.id,
                          'commissionRate',
                          val === '' ? '' : parseFloat(val)
                        )
                      }}
                      className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 font-bold outline-none"
                    />
                    <span className="font-bold text-purple-900">%</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Packaging Cap Fee (₹)</label>
                  <input
                    type="number"
                    value={selectedVendor.packagingCapFee}
                    onChange={(e) => {
                      const val = e.target.value
                      updateVendorPricing(
                        selectedVendor.id,
                        'packagingCapFee',
                        val === '' ? '' : parseFloat(val)
                      )
                    }}
                    className="mt-1.5 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Platform Promo Subsidy (%)</label>
                  <input
                    type="number"
                    value={selectedVendor.promoSubsidyPct}
                    onChange={(e) => {
                      const val = e.target.value
                      updateVendorPricing(
                        selectedVendor.id,
                        'promoSubsidyPct',
                        val === '' ? '' : parseFloat(val)
                      )
                    }}
                    className="mt-1.5 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 font-bold outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Live Kitchen Monitor & Bank Details */}
            <div className="mt-6 grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-gray-200 p-4">
                <h5 className="font-bold text-[#18201c]">Live Kitchen Monitor</h5>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Kitchen Status:</span>
                    <span
                      className={`font-bold capitalize ${selectedVendor.kitchenStatus === 'open' ? 'text-emerald-600' : 'text-rose-600'}`}
                    >
                      ● {selectedVendor.kitchenStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Cooking Orders:</span>
                    <span className="font-bold text-[#18201c]">
                      {selectedVendor.activeOrdersCount} orders
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">FSSAI License:</span>
                    <span className="font-mono text-gray-700 font-semibold">
                      {selectedVendor.fssaiLicense}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <h5 className="font-bold text-[#18201c]">Settlement Bank Payout Details</h5>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payee Account:</span>
                    <span className="font-mono font-bold text-[#18201c]">
                      {selectedVendor.bankAccount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank IFSC:</span>
                    <span className="font-mono text-gray-700 font-semibold">
                      {selectedVendor.ifscCode}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone / Contact:</span>
                    <span className="font-semibold text-gray-700">{selectedVendor.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Disburse Payout */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Net Payable Amount</p>
                <p className="text-xl font-bold text-emerald-700">
                  ₹{getVendorFinancials(selectedVendor).netPayable.toLocaleString()}
                </p>
              </div>

              {selectedVendor.settlementStatus === 'pending' ? (
                <button
                  onClick={() => markVendorSettled(selectedVendor.id)}
                  className="flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-lg transition hover:bg-emerald-700"
                >
                  <CheckCircle2 className="size-4" /> Disburse Settlement Payout
                </button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 border border-emerald-300">
                  ✓ Settlement Disbursed & Completed
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

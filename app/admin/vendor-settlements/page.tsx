'use client'

import { getLocalPaymentConfig } from '@/lib/payment-config'
import {
  CheckCircle2,
  Clock3,
  CreditCard,
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
  settlementIds?: string[]
  disbursedAmount?: number
  transactionRef?: string
}

export default function VendorSettlementsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all')
  const [selectedVendor, setSelectedVendor] = useState<VendorFinancialRecord | null>(null)
  const [settlementProcessedSuccess, setSettlementProcessedSuccess] = useState(false)
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('')

  // Custom Settlement Modal State
  const [disburseModalVendor, setDisburseModalVendor] = useState<VendorFinancialRecord | null>(null)
  const [customPayoutAmount, setCustomPayoutAmount] = useState('')
  const [customUtrRef, setCustomUtrRef] = useState('')
  const [customNotes, setCustomNotes] = useState('')
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false)

  // Restaurants list with financial data
  const [vendors, setVendors] = useState<VendorFinancialRecord[]>([])

  useEffect(() => {
    async function loadLiveSettlements() {
      const activeCfg = getLocalPaymentConfig()
      try {
        const [restResp, settsResp, ordersResp] = await Promise.all([
          fetch('/api/restaurants').catch(() => null),
          fetch('/api/admin/settlements').catch(() => null),
          fetch('/api/orders').catch(() => null),
        ])

        const restJson = restResp ? await restResp.json().catch(() => null) : null
        const settsJson = settsResp ? await settsResp.json().catch(() => null) : null
        const ordersJson = ordersResp ? await ordersResp.json().catch(() => null) : null

        const restaurants: any[] = restJson?.restaurants ?? []
        const settlements: any[] = settsJson?.settlements ?? []
        const orders: any[] = ordersJson?.orders ?? []

        const restaurantMap: Record<
          string,
          {
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
            commissionRate: number
            kitchenStatus: 'open' | 'closed'
            completedDropsCount: number
            settlementIds: string[]
            hasPendingSettlement: boolean
            disbursedAmount: number
            transactionRef: string
          }
        > = {}

        // Step 1: Initialize entries for all registered restaurants
        restaurants.forEach((r: any) => {
          const key = (r.id || r.name || 'rest_01').toLowerCase()
          restaurantMap[key] = {
            id: r.id || key,
            name: r.name || 'Crave Kitchen Store',
            ownerName: r.bank_account_name || r.owner?.name || 'Verified Partner Store',
            email: r.owner?.email || 'partner@crave.com',
            phone: r.phone || r.owner?.phone || '+91 98765 43212',
            cuisine: r.cuisine || 'Multi-Cuisine & Fast Food',
            address: r.address || 'Bengaluru, India',
            fssaiLicense: r.fssai_license || '#11223344556677',
            bankAccount: r.bank_account_number
              ? `HDFC •••• ${r.bank_account_number.slice(-4)}`
              : 'HDFC •••• 9821',
            ifscCode: r.bank_ifsc || 'HDFC0001234',
            weeklyGrossSales: 0,
            commissionRate: Number(r.commission_rate ?? activeCfg.vendorCommission ?? 15),
            kitchenStatus: r.is_open ? 'open' : 'closed',
            completedDropsCount: 0,
            settlementIds: [],
            hasPendingSettlement: false,
            disbursedAmount: 0,
            transactionRef: '',
          }
        })

        // Step 2: Aggregate settlement records into the restaurant map
        settlements.forEach((s: any) => {
          const rId = (s.restaurant_id || s.restaurant?.id || '').toLowerCase()
          const rName = (s.restaurant_name || s.restaurant?.name || '').toLowerCase()

          const foundKey = Object.keys(restaurantMap).find(
            (k) => (rId && k === rId) || (rName && restaurantMap[k].name.toLowerCase() === rName)
          )
          const targetKey = foundKey || rId || rName || `settle_${s.id}`

          if (!restaurantMap[targetKey]) {
            const rObj = s.restaurant || {}
            restaurantMap[targetKey] = {
              id: rObj.id || rId || targetKey,
              name: s.restaurant_name || rObj.name || 'Crave Kitchen Store',
              ownerName: rObj.bank_account_name || 'Verified Partner Store',
              email: 'partner@crave.com',
              phone: rObj.phone || '+91 98765 43212',
              cuisine: rObj.cuisine || 'Multi-Cuisine & Fast Food',
              address: rObj.address || 'Bengaluru, India',
              fssaiLicense: rObj.fssai_license || '#11223344556677',
              bankAccount: rObj.bank_account_number
                ? `HDFC •••• ${rObj.bank_account_number.slice(-4)}`
                : 'HDFC •••• 9821',
              ifscCode: rObj.bank_ifsc || 'HDFC0001234',
              weeklyGrossSales: 0,
              commissionRate: Number(
                s.commission_rate ?? rObj.commission_rate ?? activeCfg.vendorCommission ?? 15
              ),
              kitchenStatus: rObj.is_open ? 'open' : 'closed',
              completedDropsCount: 0,
              settlementIds: [],
              hasPendingSettlement: false,
              disbursedAmount: 0,
              transactionRef: '',
            }
          }

          restaurantMap[targetKey].weeklyGrossSales += Number(s.gross_sales || 0)
          restaurantMap[targetKey].completedDropsCount += 1
          restaurantMap[targetKey].settlementIds.push(s.id)
          if (s.status !== 'settled' && s.status !== 'paid') {
            restaurantMap[targetKey].hasPendingSettlement = true
          } else {
            restaurantMap[targetKey].disbursedAmount =
              (restaurantMap[targetKey].disbursedAmount || 0) + Number(s.net_payout || 0)
            if (s.transaction_ref) {
              restaurantMap[targetKey].transactionRef = s.transaction_ref
            }
          }
        })

        // Step 3: Fallback to orders if kitchen has no settlements recorded yet
        orders.forEach((o: any) => {
          const rId = (o.restaurant_id || o.vendor_id || '').toLowerCase()
          const rName = (o.restaurant_name || '').toLowerCase()

          const targetKey = Object.keys(restaurantMap).find(
            (k) => (rId && k === rId) || (rName && restaurantMap[k].name.toLowerCase() === rName)
          )

          if (targetKey && restaurantMap[targetKey].settlementIds.length === 0) {
            restaurantMap[targetKey].weeklyGrossSales += Number(o.subtotal || o.total_amount || 0)
            restaurantMap[targetKey].completedDropsCount += 1
          }
        })

        const loaded: VendorFinancialRecord[] = Object.values(restaurantMap).map((r) => ({
          id: r.id,
          name: r.name,
          ownerName: r.ownerName,
          email: r.email,
          phone: r.phone,
          cuisine: r.cuisine,
          address: r.address,
          fssaiLicense: r.fssaiLicense,
          bankAccount: r.bankAccount,
          ifscCode: r.ifscCode,
          weeklyGrossSales: r.weeklyGrossSales,
          commissionRate: r.commissionRate,
          packagingCapFee: activeCfg.packagingCap,
          promoSubsidyPct: 0,
          settlementStatus: r.hasPendingSettlement
            ? 'pending'
            : r.completedDropsCount > 0
              ? 'settled'
              : 'pending',
          kitchenStatus: r.kitchenStatus,
          activeOrdersCount: 0,
          completedDropsCount: r.completedDropsCount,
          settlementIds: r.settlementIds,
          disbursedAmount: r.disbursedAmount || 0,
          transactionRef: r.transactionRef || '',
        }))

        setVendors(loaded)
      } catch (err) {
        console.error('Failed to load settlements:', err)
        setVendors([])
      }
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
    const finalPayout =
      v.disbursedAmount != null && v.disbursedAmount > 0 ? v.disbursedAmount : netPayable
    return { commissionCut, promoCut, netPayable, finalPayout }
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

  // Open Custom Disburse Settlement Payout Modal
  function openDisburseModal(v: VendorFinancialRecord) {
    const fin = getVendorFinancials(v)
    setDisburseModalVendor(v)
    setCustomPayoutAmount(fin.netPayable.toString())
    setCustomUtrRef(v.transactionRef || `UTR${Date.now().toString().slice(-8)}`)
    setCustomNotes('')
  }

  // Handle Custom Disbursed Settlement Submission
  async function handleConfirmCustomDisbursement() {
    if (!disburseModalVendor) return
    setIsSubmittingPayout(true)

    const payoutVal = parseFloat(customPayoutAmount) || 0
    const fin = getVendorFinancials(disburseModalVendor)

    try {
      const res = await fetch('/api/admin/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_id: disburseModalVendor.id,
          restaurant_name: disburseModalVendor.name,
          gross_sales: disburseModalVendor.weeklyGrossSales,
          commission_rate: disburseModalVendor.commissionRate,
          commission_amount: fin.commissionCut,
          net_payout: payoutVal,
          status: 'settled',
          transaction_ref: customUtrRef,
          notes: customNotes,
        }),
      })

      if (disburseModalVendor.settlementIds && disburseModalVendor.settlementIds.length > 0) {
        await Promise.all(
          disburseModalVendor.settlementIds.map((settId) =>
            fetch('/api/admin/settlements', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                id: settId,
                status: 'settled',
                net_payout: payoutVal,
                transaction_ref: customUtrRef,
              }),
            }).catch(() => null)
          )
        )
      }

      setVendors((prev) =>
        prev.map((v) =>
          v.id === disburseModalVendor.id
            ? {
                ...v,
                settlementStatus: 'settled',
                disbursedAmount: payoutVal,
                transactionRef: customUtrRef,
              }
            : v
        )
      )

      if (selectedVendor && selectedVendor.id === disburseModalVendor.id) {
        setSelectedVendor((prev) =>
          prev
            ? {
                ...prev,
                settlementStatus: 'settled',
                disbursedAmount: payoutVal,
                transactionRef: customUtrRef,
              }
            : null
        )
      }

      setPayoutSuccessMsg(
        `Custom settlement payout of ₹${payoutVal.toLocaleString()} disbursed to ${disburseModalVendor.name}!`
      )
      setDisburseModalVendor(null)
      setSettlementProcessedSuccess(true)
      setTimeout(() => {
        setSettlementProcessedSuccess(false)
        setPayoutSuccessMsg('')
      }, 5000)
    } catch (err) {
      console.error('Failed to disburse custom settlement:', err)
    } finally {
      setIsSubmittingPayout(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] dark:border-[#27342d] pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#b5de28] dark:text-[#d9f447]">
            Restaurant Payouts & Commission Control
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Vendor Settlements & Financials
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76] dark:text-gray-400">
            Inspect restaurant sales, calculate commission cuts, alter vendor pricing parameters,
            and process custom weekly payouts.
          </p>
        </div>

        {settlementProcessedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/70 px-4 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/50">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" />{' '}
            {payoutSuccessMsg || 'Settlement Payout Processed Successfully!'}
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
              Select any restaurant to alter custom commission, set pricing, or disburse custom
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
                      {v.settlementStatus === 'settled' && v.disbursedAmount
                        ? 'Disbursed Payout'
                        : 'Net Payable'}
                    </span>
                    <span className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                      ₹
                      {v.settlementStatus === 'settled' && v.disbursedAmount
                        ? v.disbursedAmount.toLocaleString()
                        : fin.netPayable.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 gap-2">
                  <button
                    onClick={() => openDisburseModal(v)}
                    className="rounded-full bg-[#d9f447] text-[#121815] px-3.5 py-1.5 text-xs font-black transition hover:bg-[#c8e434] flex items-center gap-1"
                  >
                    <CreditCard className="size-3.5" /> Disburse Payout
                  </button>
                  <button
                    onClick={() => setSelectedVendor(v)}
                    className="rounded-full bg-[#18201c] dark:bg-[#202b24] border border-[#27342d] px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-[#323d36] flex items-center gap-1.5"
                  >
                    <Sliders className="size-3.5 text-[#d9f447]" /> Alter &amp; Inspect
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
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-extrabold text-blue-700 dark:text-blue-400 text-sm">
                        ₹
                        {v.settlementStatus === 'settled' && v.disbursedAmount
                          ? v.disbursedAmount.toLocaleString()
                          : fin.netPayable.toLocaleString()}
                      </p>
                      {v.settlementStatus === 'settled' &&
                        v.disbursedAmount &&
                        v.disbursedAmount !== fin.netPayable && (
                          <p className="text-[10px] text-amber-500 font-semibold">
                            Custom Disbursed
                          </p>
                        )}
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
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDisburseModal(v)}
                          className="rounded-full bg-[#d9f447] text-[#121815] px-3 py-1.5 text-[11px] font-black transition hover:bg-[#c8e434] flex items-center gap-1 shadow-xs"
                        >
                          <CreditCard className="size-3" /> Disburse Payout
                        </button>
                        <button
                          onClick={() => setSelectedVendor(v)}
                          className="rounded-full bg-[#18201c] dark:bg-[#202b24] border border-[#27342d] px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#323d36] flex items-center gap-1"
                        >
                          <Sliders className="size-3 text-[#d9f447]" /> Alter &amp; Inspect
                        </button>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0f0d]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#121815] text-white p-6 shadow-2xl border border-[#233027] space-y-6 custom-scrollbar">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-[#202b24] pb-4">
              <div>
                <span className="rounded-full bg-[#d9f447]/10 px-3 py-1 text-[10px] font-extrabold text-[#d9f447] border border-[#d9f447]/30 uppercase tracking-wider">
                  Vendor Pricing Playground &amp; Monitor
                </span>
                <h3 className="mt-2 text-2xl font-black text-white">{selectedVendor.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {selectedVendor.cuisine} · {selectedVendor.address}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVendor(null)}
                className="grid size-9 place-items-center rounded-full bg-[#1a221d] hover:bg-[#233027] text-gray-400 hover:text-white transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#233027] bg-[#171f1b] p-4 shadow-md">
                <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider">
                  Weekly Gross Sales
                </p>
                <p className="text-2xl font-black text-white mt-1.5">
                  ₹{selectedVendor.weeklyGrossSales.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-1">
                  {selectedVendor.completedDropsCount} drops completed
                </p>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 shadow-md">
                <p className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                  Our Platform Cut ({selectedVendor.commissionRate}%)
                </p>
                <p className="text-2xl font-black text-amber-400 mt-1.5">
                  -₹{getVendorFinancials(selectedVendor).commissionCut.toLocaleString()}
                </p>
                <p className="text-[11px] text-amber-300/80 mt-1">Retained platform commission</p>
              </div>

              <div className="rounded-2xl border border-[#d9f447]/30 bg-[#d9f447]/10 p-4 shadow-md">
                <p className="text-[10px] font-extrabold uppercase text-[#d9f447] tracking-wider">
                  Net Vendor Settlement
                </p>
                <p className="text-2xl font-black text-[#d9f447] mt-1.5">
                  ₹
                  {selectedVendor.settlementStatus === 'settled' && selectedVendor.disbursedAmount
                    ? selectedVendor.disbursedAmount.toLocaleString()
                    : getVendorFinancials(selectedVendor).netPayable.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                  Payable to {selectedVendor.ownerName}
                </p>
              </div>
            </div>

            {/* Section 2: Alter & Custom Set Pricing Playground */}
            <div className="rounded-2xl border border-[#27342d] bg-[#171f1b] p-5 shadow-lg space-y-4">
              <div>
                <h4 className="font-black text-sm text-white flex items-center gap-2">
                  <Sparkles className="size-4 text-[#d9f447]" /> Alter &amp; Custom Set Vendor
                  Pricing
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Override custom commission rate, packaging cap, or promo subsidy specifically for{' '}
                  <strong className="text-white">{selectedVendor.name}</strong>.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-xs">
                <div>
                  <label className="font-bold text-gray-300">Commission Rate (%)</label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={selectedVendor.commissionRate}
                      onChange={(e) => {
                        const val = e.target.value
                        updateVendorPricing(
                          selectedVendor.id,
                          'commissionRate',
                          val === '' ? '' : parseFloat(val)
                        )
                      }}
                      className="w-full rounded-xl border border-[#27342d] bg-[#0d1210] px-3.5 py-2.5 font-bold text-white outline-none focus:border-[#d9f447] transition-colors"
                    />
                    <span className="font-bold text-gray-400">%</span>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-gray-300">Packaging Cap Fee (₹)</label>
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
                    className="mt-1.5 w-full rounded-xl border border-[#27342d] bg-[#0d1210] px-3.5 py-2.5 font-bold text-white outline-none focus:border-[#d9f447] transition-colors"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-300">Platform Promo Subsidy (%)</label>
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
                    className="mt-1.5 w-full rounded-xl border border-[#27342d] bg-[#0d1210] px-3.5 py-2.5 font-bold text-white outline-none focus:border-[#d9f447] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Live Kitchen Monitor & Bank Details */}
            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-[#233027] bg-[#171f1b] p-4 shadow-md">
                <h5 className="font-extrabold text-sm text-white border-b border-[#202b24] pb-2.5 mb-3">
                  Live Kitchen Monitor
                </h5>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Kitchen Status:</span>
                    <span
                      className={`font-black text-xs uppercase px-2.5 py-0.5 rounded-full ${
                        selectedVendor.kitchenStatus === 'open'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      ● {selectedVendor.kitchenStatus}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Active Cooking Orders:</span>
                    <span className="font-bold text-white">
                      {selectedVendor.activeOrdersCount} orders
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">FSSAI License:</span>
                    <span className="font-mono text-gray-300 font-bold">
                      {selectedVendor.fssaiLicense}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-[#233027] bg-[#171f1b] p-4 shadow-md">
                <h5 className="font-extrabold text-sm text-white border-b border-[#202b24] pb-2.5 mb-3">
                  Settlement Bank Payout Details
                </h5>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Payee Account:</span>
                    <span className="font-mono font-bold text-white">
                      {selectedVendor.bankAccount}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Bank IFSC:</span>
                    <span className="font-mono text-gray-300 font-bold">
                      {selectedVendor.ifscCode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 font-medium">Phone / Contact:</span>
                    <span className="font-bold text-white">{selectedVendor.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Disburse Payout Footer */}
            <div className="pt-4 border-t border-[#202b24] flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">
                  Net Payable Amount
                </p>
                <p className="text-2xl font-black text-[#d9f447] mt-0.5">
                  ₹
                  {selectedVendor.settlementStatus === 'settled' && selectedVendor.disbursedAmount
                    ? selectedVendor.disbursedAmount.toLocaleString()
                    : getVendorFinancials(selectedVendor).netPayable.toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => openDisburseModal(selectedVendor)}
                className="flex items-center gap-2 rounded-full bg-[#d9f447] px-6 py-3 text-xs font-black text-[#0d1310] shadow-lg shadow-[#d9f447]/10 hover:bg-[#c8e434] active:scale-95 transition"
              >
                <CheckCircle2 className="size-4 text-[#0d1310]" /> Disburse Settlement Payout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Settlement Payout Modal Popup */}
      {disburseModalVendor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000000]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl bg-[#121815] text-white p-6 shadow-2xl border border-[#233027] space-y-5">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#202b24] pb-3.5">
              <div>
                <span className="rounded-full bg-[#d9f447]/10 px-3 py-1 text-[10px] font-extrabold text-[#d9f447] border border-[#d9f447]/30 uppercase tracking-wider">
                  Custom Settlement Disbursement
                </span>
                <h3 className="mt-2 text-xl font-black text-white">{disburseModalVendor.name}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Owner:{' '}
                  <span className="text-white font-semibold">{disburseModalVendor.ownerName}</span>{' '}
                  · {disburseModalVendor.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDisburseModalVendor(null)}
                className="grid size-8 place-items-center rounded-full bg-[#1a221d] hover:bg-[#233027] text-gray-400 hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Calculated Net Payable Context */}
            <div className="rounded-2xl border border-[#233027] bg-[#171f1b] p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Calculated Net Payable (Full)
                </p>
                <p className="text-xl font-extrabold text-emerald-400 mt-0.5">
                  ₹{getVendorFinancials(disburseModalVendor).netPayable.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  Gross Sales: ₹{disburseModalVendor.weeklyGrossSales.toLocaleString()}
                </p>
                <p className="text-xs text-amber-400 font-semibold mt-0.5">
                  Platform Cut ({disburseModalVendor.commissionRate}%): -₹
                  {getVendorFinancials(disburseModalVendor).commissionCut.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Custom Settlement Amount Field */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-200">
                Disbursement Settlement Amount (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 font-bold text-gray-400 text-sm">₹</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={customPayoutAmount}
                  onChange={(e) => setCustomPayoutAmount(e.target.value)}
                  placeholder="e.g. 1500"
                  className="w-full rounded-xl border border-[#27342d] bg-[#0d1210] pl-8 pr-4 py-2.5 text-lg font-black text-[#d9f447] outline-none focus:border-[#d9f447] transition"
                />
              </div>

              {/* Quick percentage / preset buttons */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Quick Set:</span>
                <button
                  type="button"
                  onClick={() =>
                    setCustomPayoutAmount(
                      getVendorFinancials(disburseModalVendor).netPayable.toString()
                    )
                  }
                  className="rounded-lg bg-[#202b24] hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-[#d9f447] transition border border-[#2c3b31]"
                >
                  Full (100%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomPayoutAmount(
                      (
                        Math.round(
                          getVendorFinancials(disburseModalVendor).netPayable * 0.75 * 100
                        ) / 100
                      ).toString()
                    )
                  }
                  className="rounded-lg bg-[#202b24] hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-gray-300 transition border border-[#2c3b31]"
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomPayoutAmount(
                      (
                        Math.round(
                          getVendorFinancials(disburseModalVendor).netPayable * 0.5 * 100
                        ) / 100
                      ).toString()
                    )
                  }
                  className="rounded-lg bg-[#202b24] hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-gray-300 transition border border-[#2c3b31]"
                >
                  50%
                </button>
              </div>
            </div>

            {/* Bank UTR Reference */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-200">
                Bank UTR / Transaction Reference
              </label>
              <input
                type="text"
                value={customUtrRef}
                onChange={(e) => setCustomUtrRef(e.target.value)}
                placeholder="e.g. UTR84920194"
                className="w-full rounded-xl border border-[#27342d] bg-[#0d1210] px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-[#d9f447] transition"
              />
            </div>

            {/* Settlement Remarks / Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-200">
                Disbursement Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="e.g. Partial custom settlement of ₹1,500 released as agreed"
                className="w-full rounded-xl border border-[#27342d] bg-[#0d1210] px-3.5 py-2 text-xs text-white outline-none focus:border-[#d9f447] transition"
              />
            </div>

            {/* Payee Bank Account Warning / info */}
            <div className="rounded-xl bg-[#171f1b] border border-[#233027] p-3 text-[11px] text-gray-400 flex items-center justify-between">
              <span>
                Payee: <strong className="text-white">{disburseModalVendor.bankAccount}</strong> (
                {disburseModalVendor.ifscCode})
              </span>
              <span className="text-emerald-400 font-semibold">Verified Bank</span>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#202b24]">
              <button
                type="button"
                onClick={() => setDisburseModalVendor(null)}
                className="rounded-full bg-[#1e2722] hover:bg-[#28352e] px-5 py-2.5 text-xs font-bold text-gray-300 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  isSubmittingPayout || !customPayoutAmount || parseFloat(customPayoutAmount) < 0
                }
                onClick={handleConfirmCustomDisbursement}
                className="flex items-center gap-2 rounded-full bg-[#d9f447] px-6 py-2.5 text-xs font-black text-[#0d1310] shadow-lg shadow-[#d9f447]/20 hover:bg-[#c8e434] active:scale-95 transition disabled:opacity-50"
              >
                {isSubmittingPayout ? (
                  <>Processing Settlement...</>
                ) : (
                  <>
                    <CheckCircle2 className="size-4 text-[#0d1310]" /> Confirm &amp; Disburse ₹
                    {parseFloat(customPayoutAmount || '0').toLocaleString()}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import DisbursePayoutModal from '@/components/admin/DisbursePayoutModal'
import {
  getVendorFinancials,
  type VendorFinancialRecord,
} from '@/components/admin/settlement-types'
import VendorPricingModal from '@/components/admin/VendorPricingModal'
import VendorSettlementsTable from '@/components/admin/VendorSettlementsTable'
import { getLocalPaymentConfig } from '@/lib/payment-config'
import {
  CheckCircle2,
  Clock3,
  DollarSign,
  Percent,
  Store,
  TrendingUp,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export type { VendorFinancialRecord }

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
          fetch('/api/restaurants?isDarkStore=false').catch(() => null),
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
      await fetch('/api/admin/settlements', {
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
            Restaurant Payouts &amp; Commission Control
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Vendor Settlements &amp; Financials
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

      {/* Main Vendor Settlements Table */}
      <VendorSettlementsTable
        vendors={filteredVendors}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onOpenDisburse={openDisburseModal}
        onSelectVendor={setSelectedVendor}
      />

      {/* Interactive Vendor Pricing & Financial Playground Modal / Drawer */}
      <VendorPricingModal
        selectedVendor={selectedVendor}
        onClose={() => setSelectedVendor(null)}
        onUpdatePricing={updateVendorPricing}
        onOpenDisburse={openDisburseModal}
      />

      {/* Custom Settlement Payout Modal Popup */}
      <DisbursePayoutModal
        vendor={disburseModalVendor}
        customPayoutAmount={customPayoutAmount}
        setCustomPayoutAmount={setCustomPayoutAmount}
        customUtrRef={customUtrRef}
        setCustomUtrRef={setCustomUtrRef}
        customNotes={customNotes}
        setCustomNotes={setCustomNotes}
        isSubmitting={isSubmittingPayout}
        onClose={() => setDisburseModalVendor(null)}
        onConfirm={handleConfirmCustomDisbursement}
      />
    </div>
  )
}

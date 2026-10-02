'use client'

import React, { useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  DollarSign,
  Eye,
  Percent,
  Power,
  RefreshCw,
  Search,
  Sliders,
  Sparkles,
  Store,
  TrendingUp,
  Utensils,
  X,
} from 'lucide-react'

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
  const [vendors, setVendors] = useState<VendorFinancialRecord[]>([
    {
      id: 'v_1',
      name: 'The Green Table',
      ownerName: 'Maya Lin',
      email: 'green@table.com',
      phone: '+91 98111 22334',
      cuisine: 'Healthy Bowls & Salads',
      address: '100ft Rd, Indiranagar, Bengaluru',
      fssaiLicense: '#11223344556677',
      bankAccount: 'HDFC •••• 9821',
      ifscCode: 'HDFC0001234',
      weeklyGrossSales: 148200,
      commissionRate: 15,
      packagingCapFee: 20,
      promoSubsidyPct: 5,
      settlementStatus: 'pending',
      kitchenStatus: 'open',
      activeOrdersCount: 3,
      completedDropsCount: 42,
    },
    {
      id: 'v_2',
      name: 'Momo House & Asian Grill',
      ownerName: 'Tenzin Norbu',
      email: 'momo@house.com',
      phone: '+91 98450 11223',
      cuisine: 'Asian · Dumplings · Noodles',
      address: '5th Block, Koramangala, Bengaluru',
      fssaiLicense: '#22334455667788',
      bankAccount: 'ICICI •••• 4412',
      ifscCode: 'ICIC0000982',
      weeklyGrossSales: 194500,
      commissionRate: 15,
      packagingCapFee: 25,
      promoSubsidyPct: 0,
      settlementStatus: 'pending',
      kitchenStatus: 'open',
      activeOrdersCount: 5,
      completedDropsCount: 58,
    },
    {
      id: 'v_3',
      name: 'Casa Napoli Woodfired Pizza',
      ownerName: 'Marco Rossi',
      email: 'casa@napoli.com',
      phone: '+91 99100 55443',
      cuisine: 'Italian · Artisan Pizza · Pasta',
      address: 'Church Street, Mg Road, Bengaluru',
      fssaiLicense: '#33445566778899',
      bankAccount: 'AXIS •••• 1092',
      ifscCode: 'UTIB0000551',
      weeklyGrossSales: 215000,
      commissionRate: 12, // Preferred lower rate
      packagingCapFee: 30,
      promoSubsidyPct: 10,
      settlementStatus: 'settled',
      kitchenStatus: 'open',
      activeOrdersCount: 2,
      completedDropsCount: 74,
    },
    {
      id: 'v_4',
      name: 'Spice Route Bistro',
      ownerName: 'Rohan Deshmukh',
      email: 'spice@route.com',
      phone: '+91 98777 66554',
      cuisine: 'North Indian · Biryani',
      address: 'HSR Layout Sector 1, Bengaluru',
      fssaiLicense: '#44556677889900',
      bankAccount: 'SBI •••• 5590',
      ifscCode: 'SBIN0004821',
      weeklyGrossSales: 86400,
      commissionRate: 18,
      packagingCapFee: 15,
      promoSubsidyPct: 0,
      settlementStatus: 'settled',
      kitchenStatus: 'closed',
      activeOrdersCount: 0,
      completedDropsCount: 28,
    },
  ])

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
    const commissionCut = (v.weeklyGrossSales * v.commissionRate) / 100
    const promoCut = (v.weeklyGrossSales * v.promoSubsidyPct) / 100
    const netPayable = v.weeklyGrossSales - commissionCut + promoCut
    return { commissionCut, promoCut, netPayable }
  }

  // Update Vendor Pricing & Commission in Playground
  function updateVendorPricing(id: string, field: keyof VendorFinancialRecord, value: any) {
    setVendors((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    )
    if (selectedVendor && selectedVendor.id === id) {
      setSelectedVendor((prev) => (prev ? { ...prev, [field]: value } : null))
    }
  }

  // Process Settlement Action
  function markVendorSettled(id: string) {
    updateVendorPricing(id, 'settlementStatus', 'settled')
    setSettlementProcessedSuccess(true)
    setTimeout(() => {
      setSettlementProcessedSuccess(false)
    }, 3000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl pb-16">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] pb-5">
        <div>
          <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014]">
            Restaurant Payouts & Commission Control
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">Vendor Settlements & Financials</h2>
          <p className="mt-0.5 text-xs text-[#717c76]">
            Inspect restaurant sales, calculate commission cuts, alter vendor pricing parameters, and process weekly payouts.
          </p>
        </div>

        {settlementProcessedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 border border-emerald-300">
            <CheckCircle2 className="size-4 text-emerald-700" /> Settlement Payout Processed Successfully!
          </div>
        )}
      </div>

      {/* Network Financial Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Total Weekly Gross Sales</span>
            <span className="grid size-8 place-items-center rounded-xl bg-purple-100 text-purple-800">
              <DollarSign className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-[#18201c]">₹{totalGrossSales.toLocaleString()}</p>
          <p className="mt-1 text-xs font-semibold text-emerald-600 flex items-center gap-1">
            <TrendingUp className="size-3.5" /> Across {vendors.length} kitchens
          </p>
        </div>

        <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Retained Platform Commission</span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-100 text-emerald-800">
              <Percent className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-emerald-700">₹{totalCommissionRevenue.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#737e77]">Our net revenue cut</p>
        </div>

        <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Net Payable Vendor Settlement</span>
            <span className="grid size-8 place-items-center rounded-xl bg-blue-100 text-blue-800">
              <Store className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-blue-700">₹{totalNetVendorPayable.toLocaleString()}</p>
          <p className="mt-1 text-xs text-[#737e77]">To be disbursed to vendors</p>
        </div>

        <div className="rounded-3xl border border-[#e2e7dc] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#737e77]">Pending Disbursements</span>
            <span className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <Clock3 className="size-4" />
            </span>
          </div>
          <p className="mt-3 text-3xl font-bold text-amber-600">{pendingSettlementsCount} Kitchens</p>
          <p className="mt-1 text-xs text-[#737e77]">Awaiting payout release</p>
        </div>
      </div>

      {/* Main Vendor Settlements Table Section */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
          <div>
            <h3 className="text-xl font-bold">Kitchen Vendor Financial Breakdown</h3>
            <p className="text-xs text-[#737e77]">Select any restaurant to alter custom commission, set pricing, or disburse settlements.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search restaurant or owner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="rounded-full border border-[#dfe4dc] py-1.5 pl-8 pr-3 text-xs outline-none focus:border-[#86a018]"
              />
            </div>

            <div className="flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs font-bold">
              {['all', 'pending', 'settled'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`rounded-full px-3 py-1 text-[11px] capitalize transition ${
                    statusFilter === st ? 'bg-[#18201c] text-white' : 'text-gray-600'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-gray-200 text-gray-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="pb-3">Restaurant & Owner</th>
                <th className="pb-3">Cuisine / Location</th>
                <th className="pb-3">Weekly Gross Sales</th>
                <th className="pb-3">Commission Cut (%)</th>
                <th className="pb-3">Our Platform Cut</th>
                <th className="pb-3">Net Vendor Settlement</th>
                <th className="pb-3">Payout Status</th>
                <th className="pb-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredVendors.map((v) => {
                const fin = getVendorFinancials(v)
                return (
                  <tr key={v.id} className="hover:bg-gray-50/60 transition">
                    <td className="py-4">
                      <p className="font-bold text-[#18201c] text-sm">{v.name}</p>
                      <p className="text-[11px] text-gray-500">{v.ownerName} ({v.phone})</p>
                    </td>
                    <td className="py-4">
                      <p className="font-semibold text-gray-700">{v.cuisine}</p>
                      <p className="text-[10px] text-gray-400">{v.address}</p>
                    </td>
                    <td className="py-4 font-bold text-base text-[#18201c]">
                      ₹{v.weeklyGrossSales.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-800">
                        {v.commissionRate}%
                      </span>
                    </td>
                    <td className="py-4 font-bold text-emerald-700">
                      ₹{fin.commissionCut.toLocaleString()}
                    </td>
                    <td className="py-4 font-bold text-blue-700 text-sm">
                      ₹{fin.netPayable.toLocaleString()}
                    </td>
                    <td className="py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold capitalize ${
                          v.settlementStatus === 'settled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                        }`}
                      >
                        {v.settlementStatus}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => setSelectedVendor(v)}
                        className="rounded-full bg-[#18201c] px-3.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-[#323d36] flex items-center gap-1.5 ml-auto"
                      >
                        <Sliders className="size-3 text-[#d9f447]" /> Alter & Inspect
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
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-gray-200 pb-4">
              <div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-bold text-amber-900 uppercase">
                  Vendor Pricing Playground & Monitor
                </span>
                <h3 className="mt-2 text-2xl font-bold text-[#18201c]">{selectedVendor.name}</h3>
                <p className="text-xs text-gray-500">{selectedVendor.cuisine} · {selectedVendor.address}</p>
              </div>
              <button
                onClick={() => setSelectedVendor(null)}
                className="grid size-9 place-items-center rounded-full bg-gray-100 hover:bg-gray-200"
              >
                <X className="size-5 text-gray-600" />
              </button>
            </div>

            {/* Financial Overview Cards for this Vendor */}
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-[#f8f9f6] p-4">
                <p className="text-[10px] font-bold uppercase text-gray-500">Weekly Gross Sales</p>
                <p className="text-2xl font-bold text-[#18201c] mt-1">₹{selectedVendor.weeklyGrossSales.toLocaleString()}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{selectedVendor.completedDropsCount} drops completed</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
                <p className="text-[10px] font-bold uppercase text-amber-800">Our Platform Cut ({selectedVendor.commissionRate}%)</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  ₹{getVendorFinancials(selectedVendor).commissionCut.toLocaleString()}
                </p>
                <p className="text-[10px] text-amber-800 mt-0.5">Retained platform commission</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-[10px] font-bold uppercase text-emerald-800">Net Vendor Settlement</p>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  ₹{getVendorFinancials(selectedVendor).netPayable.toLocaleString()}
                </p>
                <p className="text-[10px] text-emerald-800 mt-0.5">Payable to {selectedVendor.ownerName}</p>
              </div>
            </div>

            {/* Section 2: Alter & Custom Set Pricing Playground */}
            <div className="mt-6 rounded-3xl border border-purple-200 bg-purple-50/30 p-5">
              <h4 className="font-bold text-sm text-purple-950 flex items-center gap-2">
                <Sparkles className="size-4 text-purple-600" /> Alter & Custom Set Vendor Pricing
              </h4>
              <p className="text-xs text-purple-900/70 mt-0.5">
                Override custom commission rate, packaging cap, or promo subsidy specifically for {selectedVendor.name}.
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
                      onChange={(e) =>
                        updateVendorPricing(selectedVendor.id, 'commissionRate', parseFloat(e.target.value) || 0)
                      }
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
                    onChange={(e) =>
                      updateVendorPricing(selectedVendor.id, 'packagingCapFee', parseFloat(e.target.value) || 0)
                    }
                    className="mt-1.5 w-full rounded-xl border border-purple-200 bg-white px-3 py-2 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#18201c]">Platform Promo Subsidy (%)</label>
                  <input
                    type="number"
                    value={selectedVendor.promoSubsidyPct}
                    onChange={(e) =>
                      updateVendorPricing(selectedVendor.id, 'promoSubsidyPct', parseFloat(e.target.value) || 0)
                    }
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
                    <span className={`font-bold capitalize ${selectedVendor.kitchenStatus === 'open' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ● {selectedVendor.kitchenStatus}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Active Cooking Orders:</span>
                    <span className="font-bold text-[#18201c]">{selectedVendor.activeOrdersCount} orders</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">FSSAI License:</span>
                    <span className="font-mono text-gray-700 font-semibold">{selectedVendor.fssaiLicense}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <h5 className="font-bold text-[#18201c]">Settlement Bank Payout Details</h5>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payee Account:</span>
                    <span className="font-mono font-bold text-[#18201c]">{selectedVendor.bankAccount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Bank IFSC:</span>
                    <span className="font-mono text-gray-700 font-semibold">{selectedVendor.ifscCode}</span>
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

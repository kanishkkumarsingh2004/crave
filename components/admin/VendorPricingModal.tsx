'use client'

import { CheckCircle2, Sparkles, X } from 'lucide-react'
import { getVendorFinancials, type VendorFinancialRecord } from './settlement-types'

interface VendorPricingModalProps {
  selectedVendor: VendorFinancialRecord | null
  onClose: () => void
  onUpdatePricing: (id: string, field: keyof VendorFinancialRecord, value: any) => void
  onOpenDisburse: (vendor: VendorFinancialRecord) => void
}

export default function VendorPricingModal({
  selectedVendor,
  onClose,
  onUpdatePricing,
  onOpenDisburse,
}: VendorPricingModalProps) {
  if (!selectedVendor) return null

  const financials = getVendorFinancials(selectedVendor)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-[#0a0f0d]/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#233027] space-y-6 custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#202b24] pb-4">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Vendor Pricing Playground &amp; Monitor
            </span>
            <h3 className="mt-2 text-2xl font-black text-[#18201c] dark:text-white">
              {selectedVendor.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {selectedVendor.cuisine} · {selectedVendor.address}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1a221d] dark:hover:bg-[#233027] text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Financial Overview Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 dark:border-[#233027] bg-gray-50 dark:bg-[#171f1b] p-4 shadow-sm dark:shadow-md">
            <p className="text-[10px] font-extrabold uppercase text-gray-500 dark:text-gray-400 tracking-wider">
              Weekly Gross Sales
            </p>
            <p className="text-2xl font-black text-[#18201c] dark:text-white mt-1.5">
              ₹{selectedVendor.weeklyGrossSales.toLocaleString()}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {selectedVendor.completedDropsCount} drops completed
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 dark:border-amber-500/20 bg-amber-50 dark:bg-amber-500/10 p-4 shadow-sm dark:shadow-md">
            <p className="text-[10px] font-extrabold uppercase text-amber-800 dark:text-amber-400 tracking-wider">
              Our Platform Cut ({selectedVendor.commissionRate}%)
            </p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1.5">
              -₹{financials.commissionCut.toLocaleString()}
            </p>
            <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-1">
              Retained platform commission
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 dark:border-[#d9f447]/30 bg-emerald-50 dark:bg-[#d9f447]/10 p-4 shadow-sm dark:shadow-md">
            <p className="text-[10px] font-extrabold uppercase text-emerald-800 dark:text-[#d9f447] tracking-wider">
              Net Vendor Settlement
            </p>
            <p className="text-2xl font-black text-emerald-700 dark:text-[#d9f447] mt-1.5">
              ₹
              {selectedVendor.settlementStatus === 'settled' && selectedVendor.disbursedAmount
                ? selectedVendor.disbursedAmount.toLocaleString()
                : financials.netPayable.toLocaleString()}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
              Payable to {selectedVendor.ownerName}
            </p>
          </div>
        </div>

        {/* Section 2: Alter & Custom Set Pricing Playground */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#171f1b] p-5 shadow-sm dark:shadow-lg space-y-4">
          <div>
            <h4 className="font-black text-sm text-[#18201c] dark:text-white flex items-center gap-2">
              <Sparkles className="size-4 text-[#18201c] dark:text-[#d9f447]" /> Alter &amp; Custom
              Set Vendor Pricing
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Override custom commission rate, packaging cap, or promo subsidy specifically for{' '}
              <strong className="text-[#18201c] dark:text-white">{selectedVendor.name}</strong>.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300">Commission Rate (%)</label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="50"
                  value={selectedVendor.commissionRate}
                  onChange={(e) => {
                    const val = e.target.value
                    onUpdatePricing(
                      selectedVendor.id,
                      'commissionRate',
                      val === '' ? '' : parseFloat(val)
                    )
                  }}
                  className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] px-3.5 py-2.5 font-bold text-[#18201c] dark:text-white outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition-colors"
                />
                <span className="font-bold text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300">
                Packaging Cap Fee (₹)
              </label>
              <input
                type="number"
                value={selectedVendor.packagingCapFee}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdatePricing(
                    selectedVendor.id,
                    'packagingCapFee',
                    val === '' ? '' : parseFloat(val)
                  )
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] px-3.5 py-2.5 font-bold text-[#18201c] dark:text-white outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition-colors"
              />
            </div>

            <div>
              <label className="font-bold text-gray-700 dark:text-gray-300">
                Platform Promo Subsidy (%)
              </label>
              <input
                type="number"
                value={selectedVendor.promoSubsidyPct}
                onChange={(e) => {
                  const val = e.target.value
                  onUpdatePricing(
                    selectedVendor.id,
                    'promoSubsidyPct',
                    val === '' ? '' : parseFloat(val)
                  )
                }}
                className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] px-3.5 py-2.5 font-bold text-[#18201c] dark:text-white outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Live Kitchen Monitor & Bank Details */}
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div className="rounded-2xl border border-gray-200 dark:border-[#233027] bg-gray-50 dark:bg-[#171f1b] p-4 shadow-sm dark:shadow-md">
            <h5 className="font-extrabold text-sm text-[#18201c] dark:text-white border-b border-gray-200 dark:border-[#202b24] pb-2.5 mb-3">
              Live Kitchen Monitor
            </h5>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Kitchen Status:</span>
                <span
                  className={`font-black text-xs uppercase px-2.5 py-0.5 rounded-full ${
                    selectedVendor.kitchenStatus === 'open'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                  }`}
                >
                  ● {selectedVendor.kitchenStatus}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">
                  Active Cooking Orders:
                </span>
                <span className="font-bold text-[#18201c] dark:text-white">
                  {selectedVendor.activeOrdersCount} orders
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">FSSAI License:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300 font-bold">
                  {selectedVendor.fssaiLicense}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-[#233027] bg-gray-50 dark:bg-[#171f1b] p-4 shadow-sm dark:shadow-md">
            <h5 className="font-extrabold text-sm text-[#18201c] dark:text-white border-b border-gray-200 dark:border-[#202b24] pb-2.5 mb-3">
              Settlement Bank Payout Details
            </h5>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Payee Account:</span>
                <span className="font-mono font-bold text-[#18201c] dark:text-white">
                  {selectedVendor.bankAccount}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Bank IFSC:</span>
                <span className="font-mono text-gray-700 dark:text-gray-300 font-bold">
                  {selectedVendor.ifscCode}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 dark:text-gray-400 font-medium">Phone / Contact:</span>
                <span className="font-bold text-[#18201c] dark:text-white">
                  {selectedVendor.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Disburse Payout Footer */}
        <div className="pt-4 border-t border-gray-200 dark:border-[#202b24] flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-gray-500 dark:text-gray-400 tracking-wider">
              Net Payable Amount
            </p>
            <p className="text-2xl font-black text-[#18201c] dark:text-[#d9f447] mt-0.5">
              ₹
              {selectedVendor.settlementStatus === 'settled' && selectedVendor.disbursedAmount
                ? selectedVendor.disbursedAmount.toLocaleString()
                : financials.netPayable.toLocaleString()}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onOpenDisburse(selectedVendor)}
            className="flex items-center gap-2 rounded-full bg-[#18201c] text-white hover:bg-black dark:bg-[#d9f447] dark:text-[#0d1310] px-6 py-3 text-xs font-black shadow-lg dark:shadow-[#d9f447]/10 dark:hover:bg-[#c8e434] active:scale-95 transition"
          >
            <CheckCircle2 className="size-4" /> Disburse Settlement Payout
          </button>
        </div>
      </div>
    </div>
  )
}

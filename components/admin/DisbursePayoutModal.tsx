'use client'

import { CheckCircle2, X } from 'lucide-react'
import { getVendorFinancials, type VendorFinancialRecord } from './settlement-types'

interface DisbursePayoutModalProps {
  vendor: VendorFinancialRecord | null
  customPayoutAmount: string
  setCustomPayoutAmount: (val: string) => void
  customUtrRef: string
  setCustomUtrRef: (val: string) => void
  customNotes: string
  setCustomNotes: (val: string) => void
  isSubmitting: boolean
  onClose: () => void
  onConfirm: () => void
}

export default function DisbursePayoutModal({
  vendor,
  customPayoutAmount,
  setCustomPayoutAmount,
  customUtrRef,
  setCustomUtrRef,
  customNotes,
  setCustomNotes,
  isSubmitting,
  onClose,
  onConfirm,
}: DisbursePayoutModalProps) {
  if (!vendor) return null

  const financials = getVendorFinancials(vendor)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 dark:bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#233027] space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#202b24] pb-3.5">
          <div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Custom Settlement Disbursement
            </span>
            <h3 className="mt-2 text-xl font-black text-[#18201c] dark:text-white">
              {vendor.name}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Owner:{' '}
              <span className="text-[#18201c] dark:text-white font-semibold">
                {vendor.ownerName}
              </span>{' '}
              · {vendor.phone}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1a221d] dark:hover:bg-[#233027] text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Calculated Net Payable Context */}
        <div className="rounded-2xl border border-gray-200 dark:border-[#233027] bg-gray-50 dark:bg-[#171f1b] p-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Calculated Net Payable (Full)
            </p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
              ₹{financials.netPayable.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Gross Sales: ₹{vendor.weeklyGrossSales.toLocaleString()}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
              Platform Cut ({vendor.commissionRate}%): -₹
              {financials.commissionCut.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Custom Settlement Amount Field */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
            Disbursement Settlement Amount (₹){' '}
            <span className="text-rose-500 dark:text-rose-400">*</span>
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
              className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] pl-8 pr-4 py-2.5 text-lg font-black text-[#18201c] dark:text-[#d9f447] outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition"
            />
          </div>

          {/* Quick percentage / preset buttons */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">
              Quick Set:
            </span>
            <button
              type="button"
              onClick={() => setCustomPayoutAmount(financials.netPayable.toString())}
              className="rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#202b24] dark:hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-[#18201c] dark:text-[#d9f447] transition border border-gray-200 dark:border-[#2c3b31]"
            >
              Full (100%)
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomPayoutAmount(
                  (Math.round(financials.netPayable * 0.75 * 100) / 100).toString()
                )
              }
              className="rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#202b24] dark:hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 transition border border-gray-200 dark:border-[#2c3b31]"
            >
              75%
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomPayoutAmount(
                  (Math.round(financials.netPayable * 0.5 * 100) / 100).toString()
                )
              }
              className="rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-[#202b24] dark:hover:bg-[#2c3b31] px-2.5 py-1 text-[11px] font-bold text-gray-700 dark:text-gray-300 transition border border-gray-200 dark:border-[#2c3b31]"
            >
              50%
            </button>
          </div>
        </div>

        {/* Bank UTR Reference */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
            Bank UTR / Transaction Reference
          </label>
          <input
            type="text"
            value={customUtrRef}
            onChange={(e) => setCustomUtrRef(e.target.value)}
            placeholder="e.g. UTR84920194"
            className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] px-3.5 py-2 text-xs font-mono text-[#18201c] dark:text-white outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition"
          />
        </div>

        {/* Settlement Remarks / Notes */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-700 dark:text-gray-200">
            Disbursement Notes / Remarks (Optional)
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="e.g. Partial custom settlement of ₹1,500 released as agreed"
            className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#0d1210] px-3.5 py-2 text-xs text-[#18201c] dark:text-white outline-none focus:border-[#18201c] dark:focus:border-[#d9f447] transition"
          />
        </div>

        {/* Payee Bank Account Info */}
        <div className="rounded-xl bg-gray-50 dark:bg-[#171f1b] border border-gray-200 dark:border-[#233027] p-3 text-[11px] text-gray-600 dark:text-gray-400 flex items-center justify-between">
          <span>
            Payee: <strong className="text-[#18201c] dark:text-white">{vendor.bankAccount}</strong>{' '}
            ({vendor.ifscCode})
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
            Verified Bank
          </span>
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-200 dark:border-[#202b24]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-[#1e2722] dark:hover:bg-[#28352e] px-5 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting || !customPayoutAmount || parseFloat(customPayoutAmount) < 0}
            onClick={onConfirm}
            className="flex items-center gap-2 rounded-full bg-[#18201c] text-white hover:bg-black dark:bg-[#d9f447] dark:text-[#0d1310] px-6 py-2.5 text-xs font-black shadow-lg dark:shadow-[#d9f447]/20 dark:hover:bg-[#c8e434] active:scale-95 transition disabled:opacity-50"
          >
            {isSubmitting ? (
              <>Processing Settlement...</>
            ) : (
              <>
                <CheckCircle2 className="size-4" /> Confirm &amp; Disburse ₹
                {parseFloat(customPayoutAmount || '0').toLocaleString()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { CancelledOrder } from './types'

interface RejectRefundModalProps {
  rejectModalOrder: CancelledOrder | null
  onClose: () => void
  actionLoading: boolean
  onConfirmReject: (order: CancelledOrder, reason: string) => void
}

export function RejectRefundModal({
  rejectModalOrder,
  onClose,
  actionLoading,
  onConfirmReject,
}: RejectRefundModalProps) {
  const [rejectReason, setRejectReason] = useState('')

  if (!rejectModalOrder) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#141b17] p-6 shadow-2xl text-[#18201c] dark:text-white animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="size-6" />
          <h3 className="text-lg font-black">Decline Customer Refund</h3>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Please specify the audit reason for rejecting this refund request for Order #
          {rejectModalOrder.id.slice(0, 8).toUpperCase()}.
        </p>

        <textarea
          rows={3}
          placeholder="e.g. Food preparation was completed, cancellation requested outside allowed parameters, etc."
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          className="mt-3 w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#18201c] p-3 text-xs text-[#18201c] dark:text-white placeholder-gray-400 outline-none focus:border-rose-500 transition"
        />

        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 dark:border-[#27342d] px-4 py-2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={actionLoading || !rejectReason.trim()}
            onClick={() => onConfirmReject(rejectModalOrder, rejectReason.trim())}
            className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50"
          >
            {actionLoading ? 'Declining…' : 'Confirm Decline'}
          </button>
        </div>
      </div>
    </div>
  )
}

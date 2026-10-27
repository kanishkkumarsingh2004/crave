'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Filter, RefreshCw, Search, X } from 'lucide-react'
import { apiFetch } from '@/lib/client/api-fetch'
import { CancelledOrder, Metrics } from '@/components/admin/cancellations/types'
import { CancellationMetrics } from '@/components/admin/cancellations/CancellationMetrics'
import { CancellationTable } from '@/components/admin/cancellations/CancellationTable'
import { CancellationDetailModal } from '@/components/admin/cancellations/CancellationDetailModal'
import { RejectRefundModal } from '@/components/admin/cancellations/RejectRefundModal'

export default function OrderCancellationsPage() {
  const [orders, setOrders] = useState<CancelledOrder[]>([])
  const [metrics, setMetrics] = useState<Metrics>({
    totalCancelledCount: 0,
    pendingRefundsCount: 0,
    pendingRefundsPaise: 0,
    pendingRefundsRupees: 0,
    approvedRefundsPaise: 0,
    approvedRefundsRupees: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'pending' | 'completed' | 'failed' | 'no_refund'
  >('all')
  const [selectedOrder, setSelectedOrder] = useState<CancelledOrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModalOrder, setRejectModalOrder] = useState<CancelledOrder | null>(null)
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await apiFetch('/api/admin/order-cancellations')
      const json = await res.json()

      if (json && json.orders) {
        setOrders(json.orders)
        if (json.metrics) setMetrics(json.metrics)
      }
    } catch (err) {
      console.error('Failed to load cancelled orders:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleProcessRefund = async (
    order: CancelledOrder,
    action: 'approve' | 'reject',
    notes?: string
  ) => {
    setActionLoading(true)
    try {
      const res = await apiFetch('/api/admin/order-cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          refundId: order.refund?.id,
          action,
          notes:
            notes ||
            (action === 'approve' ? 'Approved by Admin from Review Queue' : 'Rejected by Admin'),
        }),
      })
      const json = await res.json()

      if (json && json.success) {
        setActionSuccessMessage(json.message)
        setTimeout(() => setActionSuccessMessage(null), 5000)
        await loadData()
        if (selectedOrder?.id === order.id) {
          setSelectedOrder(null)
        }
        setRejectModalOrder(null)
      }
    } catch (err: any) {
      alert(`Error updating refund: ${err?.message || 'Something went wrong'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        ord.id.toLowerCase().includes(q) ||
        ord.customer.name.toLowerCase().includes(q) ||
        ord.customer.phone.toLowerCase().includes(q) ||
        ord.restaurant.name.toLowerCase().includes(q) ||
        (ord.utrRef && ord.utrRef.toLowerCase().includes(q))

      if (!matchSearch) return false

      if (statusFilter === 'all') return true
      if (statusFilter === 'no_refund') return !ord.refund
      if (statusFilter === 'pending') return ord.refund?.status === 'pending'
      if (statusFilter === 'completed') return ord.refund?.status === 'completed'
      if (statusFilter === 'failed') return ord.refund?.status === 'failed'

      return true
    })
  }, [orders, searchQuery, statusFilter])

  return (
    <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#090d0b] text-[#18201c] dark:text-[#f0f4f1] p-4 sm:p-6 lg:p-8">
      {/* Top Banner Alert */}
      {actionSuccessMessage && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 p-4 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="text-xs sm:text-sm font-bold">{actionSuccessMessage}</p>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-black uppercase tracking-wider">
              15s Cancellation Policy Control
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#18201c] dark:text-white mt-1">
            Order Cancellations &amp; Refund Queue
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Review customer cancellations placed within the 15-second window, verify payments, and
            approve refunds safely.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-[#18201c] border border-gray-200 dark:border-[#27342d] px-4 py-2.5 text-xs font-bold text-[#18201c] dark:text-white hover:bg-gray-50 dark:hover:bg-[#202c25] transition shadow-xs shrink-0"
        >
          <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Metrics Row */}
      <CancellationMetrics metrics={metrics} />

      {/* Search & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by Order ID, customer, phone, restaurant, or UTR…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] pl-10 pr-4 py-2.5 text-xs text-[#18201c] dark:text-white placeholder-gray-400 outline-none focus:border-[#d9f447] transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-gray-400 flex items-center gap-1 mr-1">
            <Filter className="size-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: 'All Cancellations' },
            { id: 'pending', label: 'Pending Review' },
            { id: 'completed', label: 'Approved & Refunded' },
            { id: 'failed', label: 'Rejected' },
            { id: 'no_refund', label: 'Unpaid / No Refund' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
                statusFilter === f.id
                  ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c]'
                  : 'bg-white dark:bg-[#121815] border border-gray-200 dark:border-[#27342d] text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#1d2722]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <CancellationTable
        isLoading={isLoading}
        orders={filteredOrders}
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        actionLoading={actionLoading}
        onSelectOrder={setSelectedOrder}
        onApproveRefund={(ord) => handleProcessRefund(ord, 'approve')}
        onOpenRejectModal={setRejectModalOrder}
      />

      {/* Full Order Details Modal */}
      <CancellationDetailModal
        selectedOrder={selectedOrder}
        onClose={() => setSelectedOrder(null)}
        actionLoading={actionLoading}
        onApproveRefund={(ord) => handleProcessRefund(ord, 'approve')}
        onOpenRejectModal={setRejectModalOrder}
      />

      {/* Reject Modal */}
      <RejectRefundModal
        rejectModalOrder={rejectModalOrder}
        onClose={() => setRejectModalOrder(null)}
        actionLoading={actionLoading}
        onConfirmReject={(ord, reason) => handleProcessRefund(ord, 'reject', reason)}
      />
    </div>
  )
}

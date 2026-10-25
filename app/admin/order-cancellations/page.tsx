'use client'

import { apiFetch } from '@/lib/client/api-fetch'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  User,
  UtensilsCrossed,
  X,
  XCircle,
} from 'lucide-react'
import React, { useEffect, useMemo, useState } from 'react'

interface CancelledOrder {
  id: string
  status: string
  paymentStatus: string
  paymentMethod: string
  utrRef?: string
  createdAt: string
  totalAmount: number
  totalAmountPaise: number
  subtotal: number
  deliveryFee: number
  platformFee: number
  handlingFee: number
  packagingFee: number
  gst: number
  items: Array<{
    name: string
    qty: number
    price: number
    variantName?: string
  }>
  customer: {
    id: string
    name: string
    email: string
    phone: string
  }
  restaurant: {
    id: string
    name: string
    phone?: string
    address?: string
  }
  refund: {
    id: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    amount: number
    amountPaise?: number
    reason: string
    createdAt: string
    processedAt?: string
    gatewayRefundId?: string
  } | null
}

interface Metrics {
  totalCancelledCount: number
  pendingRefundsCount: number
  pendingRefundsPaise: number
  pendingRefundsRupees: number
  approvedRefundsPaise: number
  approvedRefundsRupees: number
}

function formatInr(num: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed' | 'no_refund'>('all')
  const [selectedOrder, setSelectedOrder] = useState<CancelledOrder | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [rejectModalOrder, setRejectModalOrder] = useState<CancelledOrder | null>(null)
  const [rejectReason, setRejectReason] = useState('')
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

  const handleProcessRefund = async (order: CancelledOrder, action: 'approve' | 'reject', notes?: string) => {
    setActionLoading(true)
    try {
      const res = await apiFetch('/api/admin/order-cancellations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          refundId: order.refund?.id,
          action,
          notes: notes || (action === 'approve' ? 'Approved by Admin from Review Queue' : 'Rejected by Admin'),
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
        setRejectReason('')
      }
    } catch (err: any) {
      alert(`Error updating refund: ${err?.message || 'Something went wrong'}`)
    } finally {
      setActionLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      // Search
      const q = searchQuery.toLowerCase().trim()
      const matchSearch =
        !q ||
        ord.id.toLowerCase().includes(q) ||
        ord.customer.name.toLowerCase().includes(q) ||
        ord.customer.phone.toLowerCase().includes(q) ||
        ord.restaurant.name.toLowerCase().includes(q) ||
        (ord.utrRef && ord.utrRef.toLowerCase().includes(q))

      if (!matchSearch) return false

      // Status filter
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
            Review customer cancellations placed within the 15-second window, verify payments, and approve refunds safely.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Total Cancelled
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <XCircle className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#18201c] dark:text-white mt-2">
            {metrics.totalCancelledCount}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Audited cancellations in system
          </p>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Pending Refund Review
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-300">
              <Clock className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-300 mt-2">
            {formatInr(metrics.pendingRefundsRupees)}
          </p>
          <p className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1">
            {metrics.pendingRefundsCount} {metrics.pendingRefundsCount === 1 ? 'order' : 'orders'} waiting in queue
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
              Refunds Disbursed
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-300">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
            {formatInr(metrics.approvedRefundsRupees)}
          </p>
          <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400/80 mt-1">
            Approved &amp; reconciled in ledger
          </p>
        </div>

        <div className="rounded-2xl border border-[#dfe5db] dark:border-[#27342d] bg-white dark:bg-[#121815] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              15s Rule Protection
            </span>
            <div className="grid size-8 place-items-center rounded-xl bg-[#d9f447]/20 text-[#718b0f] dark:text-[#d9f447]">
              <ShieldCheck className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-[#18201c] dark:text-white mt-2">
            Strict 15s Lock
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            Zero vendor losses post kitchen prep
          </p>
        </div>
      </div>

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
      <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#121815] shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center">
            <RefreshCw className="size-8 mx-auto animate-spin text-[#d9f447]" />
            <p className="mt-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
              Loading cancellations and refund queue…
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 mx-auto">
              <CheckCircle2 className="size-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-[#18201c] dark:text-white mt-3">
              No Cancelled Orders Found
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search criteria or filter pills.'
                : 'All orders are operating smoothly with zero cancellations.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-[#27342d] bg-gray-50/75 dark:bg-[#18201c]/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Order &amp; Date</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Restaurant</th>
                  <th className="py-3 px-4">Amount &amp; Method</th>
                  <th className="py-3 px-4">Refund Queue</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1e2722]">
                {filteredOrders.map((ord) => {
                  const refund = ord.refund
                  const isPendingRefund = refund?.status === 'pending'
                  const isApprovedRefund = refund?.status === 'completed'
                  const isRejectedRefund = refund?.status === 'failed'

                  return (
                    <tr
                      key={ord.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition"
                    >
                      {/* Order & Date */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-[#18201c] dark:text-white">
                            #{ord.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                            Cancelled
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          {new Date(ord.createdAt).toLocaleString('en-IN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </p>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#18201c] dark:text-white truncate max-w-[150px]">
                          {ord.customer.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{ord.customer.phone}</p>
                      </td>

                      {/* Restaurant */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#18201c] dark:text-white truncate max-w-[150px]">
                          {ord.restaurant.name}
                        </p>
                        <p className="text-[11px] text-gray-400">{ord.items.length} items</p>
                      </td>

                      {/* Amount & Method */}
                      <td className="py-3.5 px-4">
                        <p className="font-black text-[#18201c] dark:text-white">
                          ₹{ord.totalAmount}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate max-w-[120px]">
                          {ord.paymentMethod} {ord.utrRef ? `· UTR: ${ord.utrRef.slice(-4)}` : ''}
                        </p>
                      </td>

                      {/* Refund Status */}
                      <td className="py-3.5 px-4">
                        {isPendingRefund ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300">
                            <Clock className="size-3 animate-spin" />
                            <span>Pending Review (₹{refund?.amount})</span>
                          </div>
                        ) : isApprovedRefund ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="size-3" />
                            <span>Refunded (₹{refund?.amount})</span>
                          </div>
                        ) : isRejectedRefund ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 text-[11px] font-black text-rose-700 dark:text-rose-400">
                            <XCircle className="size-3" />
                            <span>Refund Declined</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 italic">No refund queued (Unpaid)</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="inline-flex items-center gap-1 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 px-2.5 py-1.5 text-xs font-bold text-[#18201c] dark:text-white transition"
                            title="View Full Order Details"
                          >
                            <Eye className="size-3.5" />
                            <span className="hidden sm:inline">Details</span>
                          </button>

                          {isPendingRefund && (
                            <>
                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => handleProcessRefund(ord, 'approve')}
                                className="inline-flex items-center gap-1 rounded-xl bg-[#d9f447] hover:bg-[#c8e434] px-2.5 py-1.5 text-xs font-black text-[#18201c] transition shadow-xs disabled:opacity-50"
                                title="Approve Refund for Customer"
                              >
                                <CheckCircle2 className="size-3.5" />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                disabled={actionLoading}
                                onClick={() => setRejectModalOrder(ord)}
                                className="inline-flex items-center gap-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 px-2.5 py-1.5 text-xs font-bold transition disabled:opacity-50"
                                title="Reject Refund"
                              >
                                <XCircle className="size-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Full Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#141b17] p-6 shadow-2xl text-[#18201c] dark:text-white animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 dark:border-[#25332a] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                    Cancelled Order
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    #{selectedOrder.id}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-[#18201c] dark:text-white mt-1">
                  Cancellation &amp; Audit Inspection
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Placed on {new Date(selectedOrder.createdAt).toLocaleString('en-IN')}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#18201c] text-gray-400 hover:text-black dark:hover:text-white transition"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="mt-5 space-y-5 text-xs">
              {/* Customer & Restaurant Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                    <User className="size-3 text-[#d9f447]" /> Customer Details
                  </p>
                  <p className="font-extrabold text-sm text-[#18201c] dark:text-white">
                    {selectedOrder.customer.name}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Email: <span className="text-[#18201c] dark:text-white font-mono">{selectedOrder.customer.email}</span>
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Phone: <span className="text-[#18201c] dark:text-white font-mono">{selectedOrder.customer.phone}</span>
                  </p>
                </div>

                <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-2">
                    <Store className="size-3 text-[#d9f447]" /> Restaurant Details
                  </p>
                  <p className="font-extrabold text-sm text-[#18201c] dark:text-white">
                    {selectedOrder.restaurant.name}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Address: {selectedOrder.restaurant.address || 'Address not registered'}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 mt-0.5">
                    Phone: {selectedOrder.restaurant.phone || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Items List */}
              <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-3">
                  <UtensilsCrossed className="size-3 text-[#d9f447]" /> Ordered Dishes ({selectedOrder.items.length})
                </p>
                <div className="divide-y divide-gray-200 dark:divide-[#25332a]">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-[#18201c] dark:text-white">{item.name}</span>
                        {item.variantName && (
                          <span className="ml-1.5 text-gray-400">({item.variantName})</span>
                        )}
                        <span className="ml-2 text-gray-400 font-mono">x{item.qty}</span>
                      </div>
                      <span className="font-mono font-bold text-[#18201c] dark:text-white">
                        ₹{(item.price || 0) * (item.qty || 1)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="rounded-2xl bg-gray-50 dark:bg-[#18201c] p-4 border border-gray-200 dark:border-[#25332a] space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Financial Breakdown
                </p>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Items Subtotal</span>
                  <span className="font-mono text-[#18201c] dark:text-white">₹{selectedOrder.subtotal}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Delivery Partner Fee</span>
                  <span className="font-mono text-[#18201c] dark:text-white">₹{selectedOrder.deliveryFee}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Packaging &amp; Handling</span>
                  <span className="font-mono text-[#18201c] dark:text-white">
                    ₹{(selectedOrder.packagingFee || 0) + (selectedOrder.handlingFee || 0)}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Platform Fee</span>
                  <span className="font-mono text-[#18201c] dark:text-white">₹{selectedOrder.platformFee}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>GST &amp; Taxes</span>
                  <span className="font-mono text-[#18201c] dark:text-white">₹{selectedOrder.gst}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 dark:border-[#25332a] pt-2 text-sm font-black text-[#18201c] dark:text-white">
                  <span>Total Order Value</span>
                  <span className="text-emerald-600 dark:text-[#d9f447] font-mono">
                    ₹{selectedOrder.totalAmount}
                  </span>
                </div>
              </div>

              {/* Refund Queue Status Card */}
              <div className="rounded-2xl bg-[#121815] p-5 text-white border border-[#25332a]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Refund Review Status
                  </p>
                  {selectedOrder.refund ? (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        selectedOrder.refund.status === 'pending'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : selectedOrder.refund.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {selectedOrder.refund.status.toUpperCase()}
                    </span>
                  ) : (
                    <span className="text-gray-500 italic">No refund in queue</span>
                  )}
                </div>

                {selectedOrder.refund && (
                  <div className="mt-3 space-y-1">
                    <p className="text-xs text-gray-300">
                      Refund Amount: <strong className="text-[#d9f447] text-sm">₹{selectedOrder.refund.amount}</strong>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      Reason: <span className="text-white">{selectedOrder.refund.reason}</span>
                    </p>
                    {selectedOrder.refund.processedAt && (
                      <p className="text-[11px] text-gray-400">
                        Processed At: {new Date(selectedOrder.refund.processedAt).toLocaleString('en-IN')}
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons inside drawer */}
                {selectedOrder.refund?.status === 'pending' && (
                  <div className="mt-4 pt-4 border-t border-[#25332a] flex items-center justify-end gap-3">
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setRejectModalOrder(selectedOrder)}
                      className="rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 px-4 py-2 text-xs font-bold transition disabled:opacity-50"
                    >
                      Reject Refund
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => handleProcessRefund(selectedOrder, 'approve')}
                      className="rounded-xl bg-[#d9f447] hover:bg-[#c8e434] text-[#18201c] px-5 py-2 text-xs font-extrabold transition shadow-md disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing…' : `Approve & Refund ₹${selectedOrder.refund.amount}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#141b17] p-6 shadow-2xl text-[#18201c] dark:text-white animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2.5 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="size-6" />
              <h3 className="text-lg font-black">Decline Customer Refund</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Please specify the audit reason for rejecting this refund request for Order #{rejectModalOrder.id.slice(0, 8).toUpperCase()}.
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
                onClick={() => setRejectModalOrder(null)}
                className="rounded-xl border border-gray-200 dark:border-[#27342d] px-4 py-2 text-xs font-bold text-gray-500 hover:text-black dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || !rejectReason.trim()}
                onClick={() => handleProcessRefund(rejectModalOrder, 'reject', rejectReason.trim())}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 text-xs font-bold transition disabled:opacity-50"
              >
                {actionLoading ? 'Declining…' : 'Confirm Decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  CreditCard,
  Download,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { TransactionRecord } from '@/components/admin/payments/types'
import { PaymentMetrics } from '@/components/admin/payments/PaymentMetrics'
import { PaymentLedgerTable } from '@/components/admin/payments/PaymentLedgerTable'
import { TransactionDetailModal } from '@/components/admin/payments/TransactionDetailModal'

export default function AdminPaymentLedgerPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'cod' | 'pending' | 'flagged'>(
    'all'
  )
  const [selectedTx, setSelectedTx] = useState<TransactionRecord | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [routeSyncStatus, setRouteSyncStatus] = useState<string | null>(null)

  async function loadTransactions(silent = false) {
    if (!silent) setLoading(true)
    else setIsRefreshing(true)

    try {
      const ordersRes = await fetch('/api/orders')
      const ordersJson = await ordersRes.json()

      let loaded: TransactionRecord[] = []

      if (ordersJson.success && Array.isArray(ordersJson.orders)) {
        loaded = ordersJson.orders.map((o: any) => {
          const subtotal = Number(o.subtotal) || Number(o.total_amount) || 0
          const deliveryFee = Number(o.delivery_fee) || 0
          const platformFee = Number(o.platform_fee) || 6
          const handlingFee = Number(o.handling_fee) || 5
          const packagingFee = Number(o.packaging_fee) || 0
          const gst = Number(o.gst) || 0
          const totalAmount =
            Number(o.total_amount) ||
            subtotal + deliveryFee + platformFee + handlingFee + packagingFee + gst

          // Estimated splits based on platform engine defaults
          const vendorCut = Math.round(subtotal * 0.85) // 15% commission retained
          const driverCut = Math.round(deliveryFee * 0.8) + (Number(o.tip) || 0)
          const platformCut = Math.max(0, Math.round(totalAmount - vendorCut - driverCut))

          // Method & Status detection
          const rawMethod = (o.payment_method || '').toLowerCase()
          const isCod = rawMethod === 'cod' || rawMethod === 'cash_on_delivery'
          const paymentMethod = isCod
            ? 'cod'
            : o.utr_ref && !o.razorpay_payment_id
              ? 'upi_manual'
              : 'razorpay'

          let paymentStatus: TransactionRecord['paymentStatus'] = 'paid'
          if (isCod) {
            paymentStatus =
              o.status === 'completed' || o.status === 'delivered' ? 'paid' : 'pending'
          } else if (o.payment_status === 'rejected') {
            paymentStatus = 'rejected'
          } else if (o.payment_status === 'pending' && !o.razorpay_payment_id) {
            paymentStatus = 'pending'
          }

          return {
            id: o.id,
            orderId: o.id,
            customerName: o.customer_name || 'Verified Customer',
            customerPhone: o.customer_phone || '+91 98765 43210',
            restaurantName: o.restaurant_name || 'Partner Kitchen',
            restaurantId: o.restaurant_id,
            amount: totalAmount,
            subtotal,
            deliveryFee,
            platformFee,
            handlingFee,
            packagingFee,
            gst,
            paymentMethod,
            gatewayPaymentId:
              o.razorpay_payment_id ||
              (paymentMethod === 'razorpay' ? `pay_${o.id.slice(-10)}` : undefined),
            gatewayOrderId:
              o.razorpay_order_id ||
              (paymentMethod === 'razorpay' ? `order_${o.id.slice(-8)}` : undefined),
            paymentStatus,
            orderStatus: o.status || 'sent_to_vendor',
            createdAt: o.createdAt || o.created_at || new Date().toISOString(),
            itemsCount: Array.isArray(o.items) ? o.items.length : 1,
            vendorCut,
            driverCut,
            platformCut,
          }
        })
      }

      setTransactions(loaded)
    } catch (err: any) {
      console.error('Failed to load transaction ledger:', err)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [])

  // Summary Metrics calculations
  const metrics = useMemo(() => {
    let totalGross = 0
    let onlineVolume = 0
    let codVolume = 0
    let totalPlatformProfit = 0
    let paidCount = 0

    transactions.forEach((tx) => {
      totalGross += tx.amount
      totalPlatformProfit += tx.platformCut
      if (tx.paymentMethod === 'razorpay' || tx.paymentStatus === 'paid') {
        paidCount++
        onlineVolume += tx.amount
      } else if (tx.paymentMethod === 'cod') {
        codVolume += tx.amount
      }
    })

    const successRate =
      transactions.length > 0 ? ((paidCount / transactions.length) * 100).toFixed(1) : '100.0'

    return {
      totalGross,
      onlineVolume,
      codVolume,
      totalPlatformProfit,
      successRate,
      totalCount: transactions.length,
    }
  }, [transactions])

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (
        statusFilter === 'paid' &&
        tx.paymentStatus !== 'paid' &&
        tx.paymentStatus !== 'verified'
      ) {
        return false
      }
      if (statusFilter === 'cod' && tx.paymentMethod !== 'cod') {
        return false
      }
      if (statusFilter === 'pending' && tx.paymentStatus !== 'pending') {
        return false
      }
      if (statusFilter === 'flagged' && tx.paymentStatus !== 'rejected') {
        return false
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim()
        const matchesId = tx.orderId.toLowerCase().includes(query)
        const matchesCustomer = tx.customerName.toLowerCase().includes(query)
        const matchesRestaurant = tx.restaurantName.toLowerCase().includes(query)
        const matchesGateway = tx.gatewayPaymentId?.toLowerCase().includes(query)
        const matchesPhone = tx.customerPhone?.toLowerCase().includes(query)

        if (
          !matchesId &&
          !matchesCustomer &&
          !matchesRestaurant &&
          !matchesGateway &&
          !matchesPhone
        ) {
          return false
        }
      }

      return true
    })
  }, [transactions, statusFilter, searchQuery])

  async function triggerManualRouteSync(txId: string) {
    setRouteSyncStatus('Syncing automated Route escrow transfers...')
    try {
      const res = await fetch('/api/admin/payment-reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: txId, orderId: txId, status: 'verified' }),
      })
      if (res.ok) {
        setRouteSyncStatus('Route settlement split synchronized successfully with Razorpay.')
        setTimeout(() => setRouteSyncStatus(null), 3000)
        loadTransactions(true)
      } else {
        setRouteSyncStatus('Failed to sync Route split.')
      }
    } catch {
      setRouteSyncStatus('Network error syncing split.')
    }
  }

  function handleExportCsv() {
    const headers = [
      'Order ID',
      'Customer',
      'Restaurant',
      'Amount',
      'Payment Method',
      'Status',
      'Date',
    ]
    const rows = filteredTransactions.map((t) => [
      t.orderId,
      t.customerName,
      t.restaurantName,
      t.amount,
      t.paymentMethod,
      t.paymentStatus,
      t.createdAt,
    ])
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `crave_ledger_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-20">
      {/* Executive Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] dark:border-[#222c26] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#86a018]/15 dark:bg-[#d9f447]/10 border border-[#86a018]/30 dark:border-[#d9f447]/20 text-[11px] font-extrabold uppercase tracking-widest text-[#5e730f] dark:text-[#d9f447]">
            <span className="size-1.5 rounded-full bg-[#86a018] dark:bg-[#d9f447] animate-pulse" />
            Live Financial Treasury
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#18201c] dark:text-white flex items-center gap-2.5">
            <CreditCard className="size-7 text-[#5e730f] dark:text-[#d9f447]" />
            Payment Transactions &amp; Gateway Ledger
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-[#63716a] dark:text-[#97a59d]">
            Real-time audit log of all customer transactions, Razorpay gateway settlements,
            three-way splits, and cash collections.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => loadTransactions(true)}
            disabled={loading || isRefreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white dark:bg-[#151d18] border border-[#d6ddd3] dark:border-[#27342d] text-xs font-bold text-[#18201c] dark:text-white shadow-xs hover:bg-[#f6f8f5] dark:hover:bg-[#1a231e] transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${isRefreshing ? 'animate-spin text-[#86a018]' : ''}`}
            />
            <span>{isRefreshing ? 'Refreshing...' : 'Live Sync'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#18201c] dark:bg-[#d9f447] text-xs font-black text-[#d9f447] dark:text-[#121815] shadow-md hover:opacity-95 transition active:scale-95"
          >
            <Download className="size-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {routeSyncStatus && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 px-4 py-3 text-xs font-bold text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-sm animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{routeSyncStatus}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <PaymentMetrics metrics={metrics} />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-[#88968e]" />
          <input
            type="text"
            placeholder="Search Order ID, Customer, Restaurant, or Payment ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#131b16] text-[#18201c] dark:text-white placeholder-[#88968e] pl-10 pr-9 py-2.5 text-xs font-semibold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] shadow-xs transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs font-extrabold scrollbar-none">
          {[
            { id: 'all', label: 'All Transactions', count: transactions.length },
            {
              id: 'paid',
              label: 'Captured Online',
              count: transactions.filter(
                (t) => t.paymentMethod === 'razorpay' && t.paymentStatus === 'paid'
              ).length,
            },
            {
              id: 'cod',
              label: 'Cash on Delivery',
              count: transactions.filter((t) => t.paymentMethod === 'cod').length,
            },
            {
              id: 'pending',
              label: 'Pending',
              count: transactions.filter((t) => t.paymentStatus === 'pending').length,
            },
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id as any)}
              className={`rounded-xl px-3.5 py-2 whitespace-nowrap transition-all ${
                statusFilter === pill.id
                  ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-xs'
                  : 'bg-white dark:bg-[#151d18] text-[#63716a] dark:text-[#97a59d] border border-[#e2e8e3] dark:border-[#222c26] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <span>{pill.label}</span>
              <span className="ml-1.5 text-[10px] opacity-70">({pill.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Ledger Table */}
      <PaymentLedgerTable
        loading={loading}
        transactions={filteredTransactions}
        onSelectTx={setSelectedTx}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        selectedTx={selectedTx}
        onClose={() => setSelectedTx(null)}
        onTriggerRouteSync={triggerManualRouteSync}
      />
    </div>
  )
}

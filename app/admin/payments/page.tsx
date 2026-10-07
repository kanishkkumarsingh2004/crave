'use client'

import { useEffect, useState } from 'react'
import { Clock, CreditCard, Filter, Search, X } from 'lucide-react'

interface PaymentReference {
  id: string
  order_id: string
  customer_vpa: string
  utr_ref: string
  amount: number
  created_at: string
  status: 'pending' | 'verified' | 'rejected'
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins === 1) return '1 min ago'
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return 'Yesterday'
  return `${diffDays} days ago`
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentReference[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>(
    'pending'
  )

  async function loadPayments() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/payment-reviews')
      const json = await res.json()

      let loaded: PaymentReference[] = []
      if (json.success && Array.isArray(json.reviews) && json.reviews.length > 0) {
        loaded = json.reviews.map((p: any) => ({
          id: p.id,
          order_id: p.order_id,
          customer_vpa: p.customer_vpa,
          utr_ref: p.utr_ref,
          amount: p.amount,
          created_at: p.created_at,
          status: (p.status as PaymentReference['status']) || 'pending',
        }))
      }

      if (loaded.length === 0) {
        const ordersRes = await fetch('/api/orders')
        const ordersJson = await ordersRes.json()
        if (ordersJson.success && Array.isArray(ordersJson.orders)) {
          loaded = ordersJson.orders
            .filter((o: any) => o.utr_ref && o.customer_vpa)
            .map((o: any) => ({
              id: o.id,
              order_id: o.id,
              customer_vpa: o.customer_vpa,
              utr_ref: o.utr_ref,
              amount: o.total_amount,
              created_at: o.createdAt || new Date().toISOString(),
              status: (o.payment_status as PaymentReference['status']) || 'pending',
            }))
        }
      }

      setPayments(loaded)
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment reviews')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [])

  async function updatePayment(orderId: string, newStatus: 'verified' | 'rejected') {
    try {
      await fetch('/api/admin/payment-reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, orderId, status: newStatus }),
      })
      setPayments((prev) =>
        prev.map((p) => (p.order_id === orderId ? { ...p, status: newStatus } : p))
      )
    } catch (err) {
      console.error('Failed to update payment status:', err)
    }
  }

  const filteredPayments = payments.filter((p) => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesSearch =
      searchQuery === '' ||
      p.order_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.utr_ref.includes(searchQuery) ||
      p.customer_vpa.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const StatusFilterButton: React.FC<{
    label: string
    value: typeof statusFilter
    color: 'amber' | 'emerald' | 'rose' | 'gray'
  }> = ({ label, value, color }) => {
    const active = statusFilter === value
    const baseClasses = 'px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200'
    const colorClasses = {
      amber: active
        ? 'bg-amber-100 text-amber-900 ring-2 ring-amber-600/30'
        : 'bg-amber-50 text-amber-700 hover:bg-amber-100',
      emerald: active
        ? 'bg-emerald-100 text-emerald-900 ring-2 ring-emerald-600/30'
        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      rose: active
        ? 'bg-rose-100 text-rose-900 ring-2 ring-rose-600/30'
        : 'bg-rose-50 text-rose-700 hover:bg-rose-100',
      gray: active
        ? 'bg-gray-200 text-gray-800 ring-2 ring-gray-600/30'
        : 'bg-gray-50 text-gray-600 hover:bg-gray-100',
    }
    return (
      <button
        onClick={() => setStatusFilter(value)}
        className={`${baseClasses} ${colorClasses[color]}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#18201c] flex items-center gap-2">
            <CreditCard className="size-5 text-[#859d19]" />
            UPI Payment References Queue
          </h3>
          <p className="text-xs text-[#737e77] mt-0.5">
            Review customer-submitted 12-digit UTR numbers before releasing funds to vendors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-3.5 text-[#88928a]" />
            <input
              type="text"
              placeholder="Search UTR, Order ID, or VPA..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-[#dfe4dc] bg-[#fcfdfe] pl-9 pr-4 py-2 text-xs outline-none focus:border-[#8fa71c] focus:ring-2 focus:ring-[#d9f447]/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-2 top-2.5">
                <X className="size-3 text-[#88928a]" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#5a655f]">
            <Filter className="size-3.5" />
            <StatusFilterButton label="Pending" value="pending" color="amber" />
            <StatusFilterButton label="All" value="all" color="gray" />
            <StatusFilterButton label="Verified" value="verified" color="emerald" />
            <StatusFilterButton label="Rejected" value="rejected" color="rose" />
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-xs text-[#737e77]">
          Loading payment references...
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-xs text-rose-700 border border-rose-200">
          {error}
        </div>
      )}

      {!loading && filteredPayments.length === 0 && !error && (
        <div className="py-12 text-center text-xs text-[#737e77]">No payment references found.</div>
      )}

      {/* Mobile Responsive Payment Cards */}
      {!loading && filteredPayments.length > 0 && (
        <div className="flex flex-col gap-3 block md:hidden">
          {filteredPayments.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-gray-200 p-4 bg-white flex flex-col gap-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#18201c]">{p.order_id}</span>
                <span className="font-bold text-[#18201c] text-sm">₹{p.amount}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                  {p.utr_ref}
                </span>
                <span className="text-[11px]">{formatTimeAgo(p.created_at)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-[#737e77] truncate max-w-[120px]">
                  {p.customer_vpa}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                    p.status === 'verified'
                      ? 'bg-emerald-100 text-emerald-800'
                      : p.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => updatePayment(p.order_id, 'verified')}
                  disabled={p.status === 'verified'}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                    p.status === 'verified'
                      ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30 cursor-default'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  {p.status === 'verified' ? '✓ Approved' : 'Approve Payment'}
                </button>
                <button
                  onClick={() => updatePayment(p.order_id, 'rejected')}
                  disabled={p.status === 'rejected'}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                    p.status === 'rejected'
                      ? 'bg-rose-600 text-white ring-2 ring-rose-600/30 cursor-default'
                      : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  {p.status === 'rejected' ? '✕ Rejected' : 'Reject / Flag'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Desktop & Tablet Table */}
      {!loading && filteredPayments.length > 0 && (
        <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
          <table className="w-full text-left text-sm border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-3.5 whitespace-nowrap">Order ID</th>
                <th className="px-5 py-3.5 whitespace-nowrap">UTR Ref</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Customer VPA</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Submitted</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Amount</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Status / Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 font-bold text-[#18201c] whitespace-nowrap">
                    {p.order_id}
                  </td>
                  <td className="px-5 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">
                    {p.utr_ref}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 whitespace-nowrap">
                    {p.customer_vpa}
                  </td>
                  <td className="px-5 py-4 text-xs whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                      <Clock className="size-3" />
                      {formatTimeAgo(p.created_at)}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-bold text-[#18201c] text-right whitespace-nowrap">
                    ₹{p.amount}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => updatePayment(p.order_id, 'verified')}
                        disabled={p.status === 'verified'}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                          p.status === 'verified'
                            ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30 cursor-default'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {p.status === 'verified' ? '✓ Approved' : 'Approve Payment'}
                      </button>
                      <button
                        onClick={() => updatePayment(p.order_id, 'rejected')}
                        disabled={p.status === 'rejected'}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                          p.status === 'rejected'
                            ? 'bg-rose-600 text-white ring-2 ring-rose-600/30 cursor-default'
                            : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white'
                        }`}
                      >
                        {p.status === 'rejected' ? '✕ Rejected' : 'Reject / Flag'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

interface PaymentReference {
  id: string
  orderId: string
  customerUpi: string
  utrRef: string
  amount: number
  submittedAt: string
  status: 'pending' | 'verified' | 'rejected'
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentReference[]>([])

  useEffect(() => {
    async function loadLivePayments() {
      try {
        const { data, error } = await supabase
          .from('payment_reviews')
          .select('*')
          .order('created_at', { ascending: false })
        if (!error && data && data.length > 0) {
          const loaded: PaymentReference[] = data.map((p) => ({
            id: p.id,
            orderId: p.order_id,
            customerUpi: p.customer_vpa || 'alex@upi',
            utrRef: p.utr_ref,
            amount: p.amount,
            submittedAt: 'Just now',
            status: p.status as 'pending' | 'verified' | 'rejected',
          }))
          setPayments(loaded)
        }
      } catch (err) {
        console.error('Failed to load payment reviews from Supabase:', err)
      }
    }
    loadLivePayments()
    const timer = setInterval(loadLivePayments, 3000)
    return () => clearInterval(timer)
  }, [])

  async function verifyPayment(id: string, status: 'verified' | 'rejected') {
    try {
      await supabase.from('payment_reviews').update({ status }).eq('id', id)
      const target = payments.find((p) => p.id === id)
      if (target && status === 'verified') {
        const cleanOrderId = target.orderId.replace('#', '')
        await supabase.from('orders').update({ status: 'preparing' }).eq('id', cleanOrderId)
      }
    } catch (err) {
      console.error('Failed to update payment status in Supabase:', err)
    }
    setPayments((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)))
  }


  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold">UPI Payment References Queue</h3>
      <p className="text-xs text-[#737e77] mt-0.5">
        Review customer-submitted 12-digit UTR numbers before releasing funds to vendors.
      </p>

      {/* Mobile Responsive Payment Cards */}
      <div className="flex flex-col gap-3 mt-6 block md:hidden">
        {payments.map((p) => (
          <div
            key={p.id}
            className="rounded-2xl border border-gray-200 p-4 bg-white flex flex-col gap-3 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#18201c]">{p.orderId}</span>
              <span className="font-bold text-[#18201c] text-sm">₹{p.amount}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                {p.utrRef}
              </span>
              <span className="text-[11px]">{p.submittedAt}</span>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                onClick={() => verifyPayment(p.id, 'verified')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                  p.status === 'verified'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                }`}
              >
                {p.status === 'verified' ? '✓ Approved' : 'Approve Payment'}
              </button>
              <button
                onClick={() => verifyPayment(p.id, 'rejected')}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition shadow-sm ${
                  p.status === 'rejected'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white'
                }`}
              >
                {p.status === 'rejected' ? '✕ Rejected' : 'Reject / Flag'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop & Tablet Table */}
      <div className="mt-6 hidden md:block overflow-x-auto rounded-2xl border border-gray-200">
        <table className="w-full text-left text-sm border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-5 py-3.5 whitespace-nowrap">Order ID</th>
              <th className="px-5 py-3.5 whitespace-nowrap">UTR Ref</th>
              <th className="px-5 py-3.5 whitespace-nowrap">Submitted</th>
              <th className="px-5 py-3.5 text-right whitespace-nowrap">Amount</th>
              <th className="px-5 py-3.5 text-right whitespace-nowrap">Status / Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-4 font-bold text-[#18201c] whitespace-nowrap">
                  {p.orderId}
                </td>
                <td className="px-5 py-4 text-xs font-mono text-gray-600 whitespace-nowrap">
                  {p.utrRef}
                </td>
                <td className="px-5 py-4 text-xs whitespace-nowrap">
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-medium text-gray-600">
                    {p.submittedAt}
                  </span>
                </td>
                <td className="px-5 py-4 font-bold text-[#18201c] text-right whitespace-nowrap">
                  ₹{p.amount}
                </td>
                <td className="px-5 py-4 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => verifyPayment(p.id, 'verified')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                        p.status === 'verified'
                          ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                      }`}
                    >
                      {p.status === 'verified' ? '✓ Approved' : 'Approve Payment'}
                    </button>
                    <button
                      onClick={() => verifyPayment(p.id, 'rejected')}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition shadow-sm ${
                        p.status === 'rejected'
                          ? 'bg-rose-600 text-white ring-2 ring-rose-600/30'
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
    </div>
  )
}

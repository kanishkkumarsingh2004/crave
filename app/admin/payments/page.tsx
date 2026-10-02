'use client'

import React, { useState } from 'react'

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
  const [payments, setPayments] = useState<PaymentReference[]>([
    { id: 'pay_1', orderId: '#CRV-9021', customerUpi: 'alex@upi', utrRef: '428190021389', amount: 867, submittedAt: '5 mins ago', status: 'pending' },
    { id: 'pay_2', orderId: '#CRV-8840', customerUpi: 'priya@okhdfc', utrRef: '992011283741', amount: 960, submittedAt: '20 mins ago', status: 'verified' },
    { id: 'pay_3', orderId: '#CRV-8712', customerUpi: 'karan@icici', utrRef: '109283746519', amount: 289, submittedAt: '45 mins ago', status: 'verified' },
  ])

  function verifyPayment(id: string, status: 'verified' | 'rejected') {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    )
  }

  return (
    <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold">UPI Payment References Queue</h3>
      <p className="text-xs text-[#737e77] mt-0.5">
        Review customer-submitted 12-digit UTR numbers before releasing funds to vendors.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {payments.map((p) => (
          <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-gray-200 p-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#18201c]">{p.orderId}</span>
                <span className="text-xs text-gray-500 font-mono">UTR: {p.utrRef}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">{p.submittedAt}</span>
              </div>
              <p className="text-xs text-gray-600 mt-1">Customer VPA: {p.customerUpi}</p>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4">
              <span className="font-bold text-base text-[#18201c]">₹{p.amount}</span>
              {p.status === 'pending' ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => verifyPayment(p.id, 'verified')}
                    className="rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700"
                  >
                    Approve Payment
                  </button>
                  <button
                    onClick={() => verifyPayment(p.id, 'rejected')}
                    className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-rose-700"
                  >
                    Reject / Flag
                  </button>
                </div>
              ) : (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    p.status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {p.status === 'verified' ? 'Verified & Paid' : 'Flagged as Fraud'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

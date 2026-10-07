'use client'

import { useDriver } from '@/lib/driver-context'
import { Wallet, X } from 'lucide-react'
import { useState } from 'react'

export default function DriverWalletPage() {
  const { completedTrips, payoutLogs, handleInstantCashout, savedUpiList, showCustomAlert } =
    useDriver()
  const totalEarnings = completedTrips.reduce((acc, t) => acc + t.total, 0)
  const totalPayouts = payoutLogs.reduce((acc, p) => acc + p.amount, 0)
  const currentBalance = Math.max(0, totalEarnings - totalPayouts)

  const [cashoutModalOpen, setCashoutModalOpen] = useState(false)
  const [cashoutAmount, setCashoutAmount] = useState('0')
  const [cashoutSuccess, setCashoutSuccess] = useState('')

  const primaryVpa = savedUpiList.find((u) => u.isPrimary)?.vpa || 'registered-vpa@upi'

  function onConfirmCashout() {
    if (!cashoutAmount || parseFloat(cashoutAmount) <= 0) return
    const amt = parseFloat(cashoutAmount)
    if (amt > currentBalance) {
      showCustomAlert({
        title: 'Insufficient Balance',
        message: 'Cashout amount cannot exceed available wallet balance.',
        variant: 'error',
      })
      return
    }
    const success = handleInstantCashout(amt)
    if (success) {
      setCashoutSuccess(`₹${amt} successfully transferred to your UPI VPA (${primaryVpa})!`)
      setTimeout(() => {
        setCashoutSuccess('')
        setCashoutModalOpen(false)
      }, 2000)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-[#dfe4dc] bg-[#121815] p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#d9f447]">
            Available Wallet Balance
          </p>
          <h2 className="text-4xl font-extrabold mt-1 text-white">₹{currentBalance}.00</h2>
          <p className="text-xs text-white/60 mt-1">
            Direct Bank / UPI VPA Instant Transfer Available ({primaryVpa})
          </p>
        </div>
        <button
          onClick={() => {
            setCashoutAmount(currentBalance.toString())
            setCashoutModalOpen(true)
          }}
          disabled={currentBalance <= 0}
          className={`rounded-full px-6 py-3 text-xs font-extrabold shadow-md transition shrink-0 ${
            currentBalance > 0
              ? 'bg-[#d9f447] text-[#121815] hover:bg-[#c2dc3a]'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Request Instant Payout
        </button>
      </div>

      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#18201c] mb-4">Payout Transaction History</h3>
        {payoutLogs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {payoutLogs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs"
              >
                <div>
                  <p className="font-bold text-[#18201c]">{tx.status}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{tx.date}</p>
                </div>
                <span className="font-extrabold text-emerald-700 text-sm">₹{tx.amount}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
            No payout transaction history yet. Complete delivery drops to accumulate wallet
            earnings.
          </div>
        )}
      </div>

      {/* INSTANT CASHOUT MODAL */}
      {cashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-5 shadow-2xl text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <Wallet className="size-4 text-emerald-600" /> Instant Wallet Cashout
              </h3>
              <button
                onClick={() => setCashoutModalOpen(false)}
                className="text-gray-400 hover:text-black"
              >
                <X className="size-4" />
              </button>
            </div>

            {cashoutSuccess ? (
              <div className="rounded-2xl bg-emerald-100 p-3.5 text-center text-xs font-bold text-emerald-900 border border-emerald-200">
                {cashoutSuccess}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Enter Cashout Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-bold outline-none focus:border-emerald-600"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Available balance: ₹{currentBalance}.00
                  </p>
                </div>

                <div className="rounded-xl bg-gray-50 p-2.5 text-xs text-gray-600 border border-gray-200">
                  <p className="font-bold text-gray-800">Destination VPA Account:</p>
                  <p className="font-mono mt-0.5 text-emerald-700">{primaryVpa}</p>
                </div>

                <button
                  onClick={onConfirmCashout}
                  className="w-full rounded-full bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-700 transition"
                >
                  Confirm Instant Transfer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

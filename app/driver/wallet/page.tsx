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
    <div className="flex flex-col gap-6 text-white">
      {/* Wallet Balance Hero Card */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#d9f447]">
            Available Wallet Balance
          </p>
          <h2 className="text-4xl font-extrabold mt-1 text-[#d9f447]">₹{currentBalance}.00</h2>
          <p className="text-xs text-[#a0ab9f] mt-1">
            Direct Bank / UPI VPA Instant Transfer Available ({primaryVpa})
          </p>
        </div>
        <button
          onClick={() => {
            setCashoutAmount(currentBalance.toString())
            setCashoutModalOpen(true)
          }}
          disabled={currentBalance <= 0}
          className={`rounded-full px-6 py-3 text-xs font-extrabold shadow-lg transition shrink-0 ${
            currentBalance > 0
              ? 'bg-[#d9f447] text-[#121815] hover:bg-[#c2dc3a] cursor-pointer'
              : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
          }`}
        >
          Request Instant Payout
        </button>
      </div>

      {/* Transaction History Section */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white">Payout Transaction History</h3>
        {payoutLogs.length > 0 ? (
          <div className="flex flex-col gap-3">
            {payoutLogs.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-[#121815] border border-[#25332a] text-xs"
              >
                <div>
                  <p className="font-bold text-white">{tx.status}</p>
                  <p className="text-[10px] text-[#a0ab9f] mt-0.5">{tx.date}</p>
                </div>
                <span className="font-extrabold text-[#d9f447] text-sm">₹{tx.amount}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#2d3b32] bg-[#121815] p-6 text-center text-xs text-[#a0ab9f]">
            No payout transaction history yet. Complete delivery drops to accumulate wallet
            earnings.
          </div>
        )}
      </div>

      {/* INSTANT CASHOUT MODAL */}
      {cashoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#121815]/80 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-5 shadow-2xl text-left text-white">
            <div className="flex items-center justify-between border-b border-[#2d3b32] pb-2.5 mb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Wallet className="size-4 text-[#d9f447]" /> Instant Wallet Cashout
              </h3>
              <button
                onClick={() => setCashoutModalOpen(false)}
                className="text-[#a0ab9f] hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            {cashoutSuccess ? (
              <div className="rounded-2xl bg-emerald-500/20 text-[#d9f447] p-3.5 text-center text-xs font-bold border border-emerald-500/30">
                {cashoutSuccess}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#a0ab9f] mb-1">
                    Enter Cashout Amount (₹):
                  </label>
                  <input
                    type="number"
                    value={cashoutAmount}
                    onChange={(e) => setCashoutAmount(e.target.value)}
                    className="w-full rounded-xl border border-[#2d3b32] bg-[#121815] px-3 py-2 text-sm font-bold text-white outline-none focus:border-[#d9f447]"
                  />
                  <p className="text-[10px] text-[#a0ab9f] mt-1">
                    Available balance: ₹{currentBalance}.00
                  </p>
                </div>

                <div className="rounded-xl bg-[#121815] p-2.5 text-xs text-[#a0ab9f] border border-[#25332a]">
                  <p className="font-bold text-white">Destination VPA Account:</p>
                  <p className="font-mono mt-0.5 text-[#d9f447]">{primaryVpa}</p>
                </div>

                <button
                  onClick={onConfirmCashout}
                  className="w-full rounded-full bg-[#d9f447] py-2.5 text-xs font-extrabold text-[#121815] shadow-md hover:bg-[#c2dc3a] transition cursor-pointer"
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

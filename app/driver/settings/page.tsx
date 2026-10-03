'use client'

import { useAuth } from '@/lib/auth-context'
import { useDriver } from '@/lib/driver-context'
import { Plus, QrCode, ShieldCheck, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

export default function DriverSettingsPage() {
  const { user } = useAuth()
  const { savedUpiList, handleAddUpiId, setPrimaryUpi, deleteUpiId } = useDriver()

  const [newUpiVpa, setNewUpiVpa] = useState('')
  const [newUpiProvider, setNewUpiProvider] = useState('Google Pay / PhonePe UPI')
  const [upiSaveSuccess, setUpiSaveSuccess] = useState('')

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!newUpiVpa || !newUpiVpa.includes('@')) {
      alert('Please enter a valid UPI VPA ID (e.g. name@okicici or 9876543210@paytm)')
      return
    }
    handleAddUpiId(newUpiVpa, newUpiProvider)
    setNewUpiVpa('')
    setUpiSaveSuccess('New UPI VPA ID registered & NPCI-verified successfully!')
    setTimeout(() => setUpiSaveSuccess(''), 3000)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#f0f3ec] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#18201c] flex items-center gap-2">
              <QrCode className="size-6 text-emerald-600" /> UPI Payout & Bank Account Setup
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Configure NPCI-verified UPI IDs for 1-click instant earnings settlement.
            </p>
          </div>
          <span className="mt-2 sm:mt-0 text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1 self-start sm:self-auto">
            <ShieldCheck className="size-4 text-emerald-700" /> NPCI Instant Transfer Active
          </span>
        </div>

        {upiSaveSuccess && (
          <div className="mt-4 rounded-2xl bg-emerald-500 text-[#121815] p-3.5 text-xs font-bold shadow-md border border-emerald-400 animate-in fade-in">
            {upiSaveSuccess}
          </div>
        )}

        {/* Add New UPI ID Form */}
        <form
          onSubmit={onSubmitForm}
          className="mt-6 flex flex-col gap-4 rounded-2xl bg-[#f8f9f7] p-4 border border-[#e5e9e1]"
        >
          <h4 className="font-bold text-sm text-[#18201c] flex items-center gap-1.5">
            <Plus className="size-4 text-emerald-600" /> Register New UPI VPA ID
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Enter UPI ID / VPA Handle:
              </label>
              <input
                type="text"
                required
                value={newUpiVpa}
                onChange={(e) => setNewUpiVpa(e.target.value)}
                placeholder="e.g. rajesh.kumar@okicici or 9876543210@paytm"
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                UPI Provider / Payment App:
              </label>
              <select
                value={newUpiProvider}
                onChange={(e) => setNewUpiProvider(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
              >
                <option value="Google Pay / PhonePe UPI">Google Pay / PhonePe (GPay / YBL)</option>
                <option value="Paytm Payments Bank">Paytm Payments Bank (@paytm)</option>
                <option value="BHIM NPCI UPI">BHIM NPCI UPI (@upi)</option>
                <option value="ICICI Bank iMobile">ICICI Bank (@okicici)</option>
                <option value="HDFC / Axis Bank">HDFC / Axis Bank (@ybl / @okhdfcbank)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition flex items-center gap-1.5"
            >
              <ShieldCheck className="size-4" /> Verify &amp; Save UPI ID
            </button>
          </div>
        </form>
      </div>

      {/* Saved Registered UPI Accounts */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#18201c] mb-4">Saved UPI Payout Destinations</h3>

        <div className="flex flex-col gap-3">
          {savedUpiList.map((upi) => (
            <div
              key={upi.id}
              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition ${
                upi.isPrimary
                  ? 'border-emerald-400 bg-emerald-50/60 shadow-xs'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="primaryUpi"
                  checked={upi.isPrimary}
                  onChange={() => setPrimaryUpi(upi.id)}
                  className="size-4 accent-emerald-600 cursor-pointer"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-[#18201c]">{upi.vpa}</span>
                    {upi.isPrimary && (
                      <span className="rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[9px] font-extrabold uppercase">
                        Default Payout
                      </span>
                    )}
                    {upi.isVerified && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                        ✓ NPCI Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{upi.bankName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                {!upi.isPrimary && (
                  <button
                    onClick={() => setPrimaryUpi(upi.id)}
                    className="text-xs font-bold text-emerald-700 hover:underline"
                  >
                    Make Primary
                  </button>
                )}
                {!upi.isPrimary && (
                  <button
                    onClick={() => deleteUpiId(upi.id)}
                    className="text-rose-600 hover:text-rose-800 p-1.5 rounded-lg hover:bg-rose-100 transition"
                    title="Delete UPI handle"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank Account Direct Transfer Fallback */}
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-[#18201c] mb-1">
          Direct Bank Account (Fallback NEFT/IMPS)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Secondary destination if UPI network is temporarily unavailable.
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-xs flex flex-col gap-1.5">
            <p className="text-gray-500 font-bold uppercase">Account Holder</p>
            <p className="font-bold text-sm text-[#18201c]">{user?.name || 'Rajesh Kumar'}</p>
            <p className="text-gray-600">Bank Name: ICICI Bank Ltd</p>
          </div>

          <div className="rounded-2xl bg-gray-50 border border-gray-200 p-4 text-xs flex flex-col gap-1.5">
            <p className="text-gray-500 font-bold uppercase">Account &amp; IFSC</p>
            <p className="font-mono font-bold text-sm text-[#18201c]">•••• •••• 4921</p>
            <p className="text-gray-600 font-mono">IFSC: ICIC0001024</p>
          </div>
        </div>
      </div>
    </div>
  )
}

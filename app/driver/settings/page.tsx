'use client'

import ThemeSelector from '@/components/ThemeSelector'
import { useDriver } from '@/lib/driver-context'
import { Palette, Plus, QrCode, ShieldCheck, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

export default function DriverSettingsPage() {
  const { savedUpiList, handleAddUpiId, setPrimaryUpi, deleteUpiId, showCustomAlert } = useDriver()

  const [newUpiVpa, setNewUpiVpa] = useState('')
  const [newUpiProvider, setNewUpiProvider] = useState('Google Pay / PhonePe UPI')
  const [upiSaveSuccess, setUpiSaveSuccess] = useState('')

  function onSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!newUpiVpa || !newUpiVpa.includes('@')) {
      showCustomAlert({
        title: 'Invalid UPI VPA',
        message: 'Please enter a valid UPI VPA ID (e.g. name@okicici or 9876543210@paytm)',
        variant: 'error',
      })
      return
    }
    handleAddUpiId(newUpiVpa, newUpiProvider)
    setNewUpiVpa('')
    setUpiSaveSuccess('New UPI VPA ID registered & NPCI-verified successfully!')
    setTimeout(() => setUpiSaveSuccess(''), 3000)
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-28 sm:pb-16 text-[#1D1D1F] dark:text-white transition-colors duration-200">
      {/* Theme & Display Preference Card */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
          <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
            <Palette className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#1D1D1F] dark:text-white">
              Display &amp; Theme Mode
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Select your preferred mobile cockpit theme (Light, Dark, or System Sync).
            </p>
          </div>
        </div>
        <ThemeSelector />
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4 gap-3">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
              <QrCode className="size-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Payout Settings
              </span>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-white truncate">
                UPI &amp; Bank Account
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Configure NPCI-verified UPI IDs for 1-click instant earnings settlement.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            NPCI Instant Transfer Active
          </span>
        </div>

        {upiSaveSuccess && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-xs animate-in fade-in">
            {upiSaveSuccess}
          </div>
        )}

        {/* Add New UPI ID Form */}
        <form
          onSubmit={onSubmitForm}
          className="flex flex-col gap-4 rounded-2xl bg-stone-50/70 dark:bg-white/[0.03] p-5 border border-black/[0.06] dark:border-white/[0.06]"
        >
          <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-white flex items-center gap-1.5">
            <Plus className="size-4 text-stone-600 dark:text-stone-300" /> Register New UPI VPA ID
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                Enter UPI ID / VPA Handle:
              </label>
              <input
                type="text"
                required
                value={newUpiVpa}
                onChange={(e) => setNewUpiVpa(e.target.value)}
                placeholder="e.g. drivername@upi or mobile@paytm"
                className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 placeholder-stone-400 dark:placeholder-stone-500 shadow-xs transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                UPI Provider / Payment App:
              </label>
              <select
                value={newUpiProvider}
                onChange={(e) => setNewUpiProvider(e.target.value)}
                className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 shadow-xs transition-colors cursor-pointer"
              >
                <option
                  value="Google Pay / PhonePe UPI"
                  className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                >
                  Google Pay / PhonePe (GPay / YBL)
                </option>
                <option
                  value="Paytm Payments Bank"
                  className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                >
                  Paytm Payments Bank (@paytm)
                </option>
                <option
                  value="BHIM NPCI UPI"
                  className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                >
                  BHIM NPCI UPI (@upi)
                </option>
                <option
                  value="ICICI Bank iMobile"
                  className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                >
                  ICICI Bank (@okicici)
                </option>
                <option
                  value="HDFC / Axis Bank"
                  className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                >
                  HDFC / Axis Bank (@ybl / @okhdfcbank)
                </option>
              </select>
            </div>
          </div>

          <div className="flex sm:justify-end">
            <button
              type="submit"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 px-6 py-3 min-h-[48px] text-sm sm:text-xs font-semibold transition active:scale-[0.98] cursor-pointer shadow-xs"
            >
              <ShieldCheck className="size-4" /> Verify &amp; Save UPI ID
            </button>
          </div>
        </form>
      </div>

      {/* Saved Registered UPI Accounts */}
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-4">
        <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white mb-2">
          Saved UPI Payout Destinations
        </h3>

        {savedUpiList.length > 0 ? (
          <div className="flex flex-col gap-3">
            {savedUpiList.map((upi) => (
              <div
                key={upi.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition ${
                  upi.isPrimary
                    ? 'border-emerald-500/40 bg-emerald-500/10 shadow-xs'
                    : 'border-black/[0.06] dark:border-white/[0.06] bg-stone-50/70 dark:bg-white/[0.03]'
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
                      <span className="font-bold text-sm text-[#1D1D1F] dark:text-white">
                        {upi.vpa}
                      </span>
                      {upi.isPrimary && (
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider bg-emerald-500/15 px-2 py-0.5 rounded-full">
                          Default
                        </span>
                      )}
                      {upi.isVerified && (
                        <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                          NPCI Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      {upi.bankName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                  {!upi.isPrimary && (
                    <button
                      onClick={() => setPrimaryUpi(upi.id)}
                      className="text-xs font-semibold text-stone-700 dark:text-stone-300 hover:text-black dark:hover:text-white underline cursor-pointer"
                    >
                      Make Primary
                    </button>
                  )}
                  {!upi.isPrimary && (
                    <button
                      onClick={() => deleteUpiId(upi.id)}
                      className="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-500/15 transition cursor-pointer"
                      title="Delete UPI handle"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/[0.1] dark:border-white/[0.1] bg-stone-50/50 dark:bg-white/[0.02] p-6 text-center text-xs text-stone-500 dark:text-stone-400">
            No saved UPI payout handles yet. Register a new UPI VPA ID above for instant 1-click
            cashouts.
          </div>
        )}
      </div>
    </div>
  )
}

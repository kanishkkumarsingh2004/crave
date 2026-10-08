'use client'

import ThemeSelector from '@/components/ThemeSelector'
import { useAuth } from '@/lib/auth-context'
import { useDriver } from '@/lib/driver-context'
import { Palette, Plus, QrCode, ShieldCheck, Trash2 } from 'lucide-react'
import React, { useState } from 'react'

export default function DriverSettingsPage() {
  const { user } = useAuth()
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
    <div className="flex flex-col gap-6 text-white">
      {/* Theme & Display Preference Card */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-3 border-b border-[#2d3b32] pb-4">
          <div className="grid size-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
            <Palette className="size-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white">Display &amp; Theme Mode</h3>
            <p className="text-xs text-[#a0ab9f]">
              Select your preferred mobile cockpit theme (Light, Dark, or System Sync).
            </p>
          </div>
        </div>
        <ThemeSelector />
      </div>

      {/* Header Banner */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-[#2d3b32] pb-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <QrCode className="size-6 text-[#d9f447]" /> UPI Payout &amp; Bank Account Setup
            </h3>
            <p className="text-xs text-[#a0ab9f] mt-1">
              Configure NPCI-verified UPI IDs for 1-click instant earnings settlement.
            </p>
          </div>
          <span className="mt-2 sm:mt-0 text-xs font-extrabold text-[#d9f447] bg-emerald-500/20 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1 self-start sm:self-auto">
            <ShieldCheck className="size-4 text-[#d9f447]" /> NPCI Instant Transfer Active
          </span>
        </div>

        {upiSaveSuccess && (
          <div className="rounded-2xl bg-emerald-500/20 text-[#d9f447] p-3.5 text-xs font-bold shadow-md border border-emerald-500/30 animate-in fade-in">
            {upiSaveSuccess}
          </div>
        )}

        {/* Add New UPI ID Form */}
        <form
          onSubmit={onSubmitForm}
          className="flex flex-col gap-4 rounded-2xl bg-[#121815] p-4 border border-[#25332a]"
        >
          <h4 className="font-bold text-sm text-white flex items-center gap-1.5">
            <Plus className="size-4 text-[#d9f447]" /> Register New UPI VPA ID
          </h4>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-[#a0ab9f] mb-1">
                Enter UPI ID / VPA Handle:
              </label>
              <input
                type="text"
                required
                value={newUpiVpa}
                onChange={(e) => setNewUpiVpa(e.target.value)}
                placeholder="e.g. drivername@upi or mobile@paytm"
                className="w-full rounded-xl border border-[#2d3b32] bg-[#1c2620] px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-[#d9f447] shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#a0ab9f] mb-1">
                UPI Provider / Payment App:
              </label>
              <select
                value={newUpiProvider}
                onChange={(e) => setNewUpiProvider(e.target.value)}
                className="w-full rounded-xl border border-[#2d3b32] bg-[#1c2620] px-3.5 py-2.5 text-xs font-bold text-white outline-none focus:border-[#d9f447] shadow-xs"
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
              className="rounded-full bg-[#d9f447] px-6 py-2.5 text-xs font-extrabold text-[#121815] shadow-md hover:bg-[#c2dc3a] transition flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="size-4 text-[#121815]" /> Verify &amp; Save UPI ID
            </button>
          </div>
        </form>
      </div>

      {/* Saved Registered UPI Accounts */}
      <div className="rounded-3xl border border-[#2d3b32] bg-[#1c2620] p-6 shadow-xl space-y-4">
        <h3 className="text-lg font-bold text-white mb-4">Saved UPI Payout Destinations</h3>

        {savedUpiList.length > 0 ? (
          <div className="flex flex-col gap-3">
            {savedUpiList.map((upi) => (
              <div
                key={upi.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition ${
                  upi.isPrimary
                    ? 'border-emerald-500/50 bg-emerald-500/10 shadow-xs'
                    : 'border-[#25332a] bg-[#121815]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="primaryUpi"
                    checked={upi.isPrimary}
                    onChange={() => setPrimaryUpi(upi.id)}
                    className="size-4 accent-[#d9f447] cursor-pointer"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-white">{upi.vpa}</span>
                      {upi.isPrimary && (
                        <span className="rounded-full bg-[#d9f447] text-[#121815] px-2 py-0.5 text-[9px] font-extrabold uppercase">
                          Default Payout
                        </span>
                      )}
                      {upi.isVerified && (
                        <span className="text-[10px] font-bold text-[#d9f447] bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/30">
                          NPCI Verified
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#a0ab9f] mt-0.5">{upi.bankName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-3 sm:mt-0 justify-end">
                  {!upi.isPrimary && (
                    <button
                      onClick={() => setPrimaryUpi(upi.id)}
                      className="text-xs font-bold text-[#d9f447] hover:underline"
                    >
                      Make Primary
                    </button>
                  )}
                  {!upi.isPrimary && (
                    <button
                      onClick={() => deleteUpiId(upi.id)}
                      className="text-rose-400 hover:text-rose-300 p-1.5 rounded-lg hover:bg-rose-500/20 transition"
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
          <div className="rounded-2xl border border-dashed border-[#2d3b32] bg-[#121815] p-6 text-center text-xs text-[#a0ab9f]">
            No saved UPI payout handles yet. Register a new UPI VPA ID above for instant 1-click
            cashouts.
          </div>
        )}
      </div>
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/client/api-fetch'
import { useDriver } from '@/lib/driver-context'
import { Bike, CheckCircle2, Save, ShieldCheck, User } from 'lucide-react'
import React, { useEffect, useState } from 'react'

export default function DriverProfilePage() {
  const { user } = useAuth()
  const { showCustomAlert } = useDriver()
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [address, setAddress] = useState(user?.address || '')
  const [vehicleType, setVehicleType] = useState(user?.vehicleType || 'Commercial EV Scooter')
  const [licensePlate, setLicensePlate] = useState(
    user?.licensePlate || user?.vehicleNo || 'KA-01-EV-9876'
  )
  const [saveSuccess, setSaveSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return
      try {
        const res = await fetch(`/api/driver/profile?driverId=${user.id}`)
        const json = await res.json()
        if (json.success && json.profile) {
          setName(json.profile.name || user.name || '')
          setPhone(json.profile.phone || user.phone || '')
          setAddress(json.profile.address || user.address || '')
          setVehicleType(json.profile.vehicleType || user.vehicleType || 'Commercial EV Scooter')
          setLicensePlate(json.profile.licensePlate || user.licensePlate || 'KA-01-EV-9876')
        }
      } catch (e) {}
    }
    loadProfile()
  }, [user?.id, user?.name, user?.phone, user?.address, user?.vehicleType, user?.licensePlate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/driver/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user?.id,
          name,
          phone,
          address,
          vehicleType,
          licensePlate,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setSaveSuccess('Driver vehicle details & profile updated successfully in system database!')
        setTimeout(() => setSaveSuccess(''), 3000)
      } else {
        showCustomAlert({
          title: 'Update Profile Error',
          message: json.error || 'Failed to update profile.',
          variant: 'error',
        })
      }
    } catch (err) {
      showCustomAlert({
        title: 'Update Profile Error',
        message: 'Failed to update driver profile.',
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-28 sm:pb-16">
      <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-4 gap-3">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
              <User className="size-6" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                Rider Console
              </span>
              <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-white truncate">
                Driver Profile &amp; Vehicle
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Registered delivery partner vehicle specifications, contact details, and KYC status.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" /> Verified Partner
          </span>
        </div>

        {saveSuccess && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-xs animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" /> {saveSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-5 bg-stone-50/70 dark:bg-white/[0.03] flex flex-col gap-4">
              <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-white flex items-center gap-2">
                <User className="size-4 text-stone-600 dark:text-stone-300" /> Personal Details
              </h4>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Full Name:
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 placeholder-stone-400 dark:placeholder-stone-500 shadow-xs transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Registered Phone (+91):
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 placeholder-stone-400 dark:placeholder-stone-500 shadow-xs transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Operating Base Address:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100ft Rd, Indiranagar, Bengaluru"
                  className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 placeholder-stone-400 dark:placeholder-stone-500 shadow-xs transition-colors"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-black/[0.06] dark:border-white/[0.06] p-5 bg-stone-50/70 dark:bg-white/[0.03] flex flex-col gap-4">
              <h4 className="font-bold text-sm text-[#1D1D1F] dark:text-white flex items-center gap-2">
                <Bike className="size-4 text-stone-600 dark:text-stone-300" /> Vehicle &amp;
                Fleet Specs
              </h4>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Vehicle Type / Category:
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 shadow-xs transition-colors cursor-pointer"
                >
                  <option value="Commercial EV Delivery Scooter">
                    Commercial EV Delivery Scooter (Green Plate)
                  </option>
                  <option value="Petrol Two-Wheeler Motorcycle">
                    Petrol Two-Wheeler Motorcycle
                  </option>
                  <option value="Cargo E-Loader Trike">Cargo E-Loader Trike</option>
                  <option value="Bicycle Partner">Bicycle Partner</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-300 mb-1.5">
                  Registration License Plate No:
                </label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g. KA-01-EV-9876"
                  className="w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] px-3.5 py-2.5 font-mono text-base sm:text-xs font-bold uppercase text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 placeholder-stone-400 dark:placeholder-stone-500 shadow-xs transition-colors"
                />
              </div>

              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-800 dark:text-emerald-300 mt-2">
                <p className="font-bold">Active Delivery Zone:</p>
                <p className="text-stone-600 dark:text-stone-300 mt-0.5">
                  Indiranagar &amp; Koramangala 5th Block, Bengaluru
                </p>
              </div>
            </div>
          </div>

          <div className="flex sm:justify-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 px-8 py-3.5 min-h-[48px] text-sm sm:text-xs font-semibold transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
            >
              <Save className="size-4" /> {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

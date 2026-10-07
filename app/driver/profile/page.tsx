'use client'

import { useAuth } from '@/lib/auth-context'
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
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#f0f3ec] pb-4 gap-2">
          <div>
            <h3 className="text-xl font-bold text-[#18201c] flex items-center gap-2">
              <User className="size-6 text-emerald-600" /> Driver Profile &amp; Vehicle Registration
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Registered delivery partner vehicle specifications, contact details, and KYC status.
            </p>
          </div>
          <span className="text-xs font-extrabold text-emerald-800 bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1 self-start sm:self-auto">
            <ShieldCheck className="size-4 text-emerald-700" /> Verified Delivery Partner
          </span>
        </div>

        {saveSuccess && (
          <div className="rounded-2xl bg-emerald-500 text-[#121815] p-3.5 text-xs font-bold shadow-md border border-emerald-400 animate-in fade-in flex items-center gap-2">
            <CheckCircle2 className="size-4" /> {saveSuccess}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50/70 flex flex-col gap-4">
              <h4 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <User className="size-4 text-emerald-600" /> Personal Details
              </h4>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Full Name:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Registered Phone (+91):
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Operating Base Address:
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 100ft Rd, Indiranagar, Bengaluru"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 p-5 bg-gray-50/70 flex flex-col gap-4">
              <h4 className="font-bold text-sm text-[#18201c] flex items-center gap-2">
                <Bike className="size-4 text-emerald-600" /> Vehicle &amp; Fleet Specs
              </h4>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Vehicle Type / Category:
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs"
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
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Registration License Plate No:
                </label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g. KA-01-EV-9876"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-[#18201c] outline-none focus:border-emerald-600 shadow-xs uppercase font-mono"
                />
              </div>

              <div className="rounded-xl bg-emerald-100/60 p-3 text-[11px] text-emerald-900 border border-emerald-200 mt-2">
                <p className="font-bold">Active Delivery Zone:</p>
                <p className="text-gray-700 mt-0.5">
                  Indiranagar &amp; Koramangala 5th Block, Bengaluru
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-emerald-600 px-8 py-3 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 transition flex items-center gap-2"
            >
              <Save className="size-4" /> {loading ? 'Saving...' : 'Save Profile Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

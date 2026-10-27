'use client'

import { FormEvent, useState } from 'react'
import { CheckCircle2, ShieldCheck, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { DriverFormData } from './types'

interface AddDriverModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const INITIAL_FORM: DriverFormData = {
  name: '',
  email: '',
  password: '',
  phone: '',
  vehicleType: 'Electric Scooter',
  licensePlate: '',
  address: '',
}

export default function AddDriverModal({ isOpen, onClose, onSuccess }: AddDriverModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<DriverFormData>(INITIAL_FORM)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast('Please fill in all required driver onboarding fields.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/create-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          vehicle_type: form.vehicleType,
          license_plate: form.licensePlate,
          address: form.address,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Driver creation failed')
      }

      toast(`Driver '${form.name}' successfully onboarded!`, 'success')
      setForm(INITIAL_FORM)
      onClose()
      onSuccess()
    } catch (err: any) {
      toast(err.message || 'Could not onboard driver. Try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#a3c428]">
              Fleet &amp; Logistics Management
            </span>
            <h3 className="text-xl font-bold text-[#18201c] dark:text-white mt-0.5">
              Add New Delivery Driver
            </h3>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="font-bold text-[#18201c] dark:text-white">Driver Full Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ramesh Kumar"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 space-y-3">
            <p className="font-bold text-[#18201c] dark:text-amber-200 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="size-4 text-amber-700 dark:text-amber-400" /> Driver Account
              Login Credentials
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Driver Email *</label>
                <input
                  type="email"
                  required
                  placeholder="driver@crave.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  Initial Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Vehicle Type</label>
              <select
                value={form.vehicleType}
                onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-[#86a018] cursor-pointer"
              >
                <option value="Electric Scooter">Electric Scooter (EV)</option>
                <option value="Electric Bike">Electric Bike (EV)</option>
                <option value="Motorcycle">Motorcycle / Petrol Bike</option>
                <option value="Bicycle">Bicycle</option>
                <option value="Car">Delivery Car / Van</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-[#18201c] dark:text-white">
                Vehicle License Plate Number
              </label>
              <input
                type="text"
                placeholder="KA-05-EV-1234"
                value={form.licensePlate}
                onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">
                Operating Hub / Address
              </label>
              <input
                type="text"
                placeholder="Indiranagar Hub, Bengaluru"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-[#27342d]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-300 dark:border-[#27342d] px-4 py-2 font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#18201c] dark:bg-[#86a018] px-6 py-2 font-bold text-white dark:text-[#121815] shadow-md hover:bg-black dark:hover:bg-[#97b41e] transition flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="size-3 border-2 border-white dark:border-[#121815] border-t-transparent rounded-full animate-spin" />
                  <span>Onboarding Driver...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-[#d9f447] dark:text-[#121815]" /> Onboard
                  Driver
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

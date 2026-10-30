'use client'

import { FormEvent, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, Edit3, Store, X, Zap } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { AccountRecord, EditAccountFormData } from './types'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false })

interface EditAccountModalProps {
  account: AccountRecord | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditAccountModal({
  account,
  isOpen,
  onClose,
  onSuccess,
}: EditAccountModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<EditAccountFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    storeName: '',
    cuisine: '',
    commissionRate: 15,
    paymentModel: 'commission',
    vehicleType: 'Electric Scooter',
    licensePlate: '',
    bannerUrl: '',
    latitude: 12.679898,
    longitude: 77.469493,
  })

  useEffect(() => {
    if (account) {
      setForm({
        name: account.name || '',
        email: account.email || '',
        phone: account.phone || '',
        address: account.address || '',
        password: '',
        storeName: account.restaurantName || account.detail || '',
        cuisine: account.cuisine || '',
        commissionRate: account.commissionRate ?? 15,
        paymentModel: account.paymentModel || 'commission',
        vehicleType:
          account.role === 'driver' || account.role === 'rider'
            ? account.detail?.split('·')[0]?.trim() || 'Electric Scooter'
            : 'Electric Scooter',
        licensePlate:
          account.role === 'driver' || account.role === 'rider'
            ? account.detail?.split('·')[1]?.trim() || ''
            : '',
        bannerUrl: account.bannerUrl || '',
        latitude: account.latitude ?? 12.679898,
        longitude: account.longitude ?? 77.469493,
      })
    }
  }, [account])

  if (!isOpen || !account) return null

  const isVendor =
    account.role === 'vendor' ||
    account.role === 'restaurant_vendor' ||
    account.role === 'cravexp_store_vendor'
  const isDriver = account.role === 'driver' || account.role === 'rider'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch('/api/admin/edit-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          ...(form.password && { password: form.password }),
          ...(isVendor
            ? {
                storeName: form.storeName,
                cuisine: form.cuisine,
                commissionRate: form.commissionRate,
                paymentModel: form.paymentModel,
                bannerUrl: form.bannerUrl,
                latitude: form.latitude,
                longitude: form.longitude,
              }
            : {}),
          ...(isDriver
            ? {
                vehicleType: form.vehicleType,
                licensePlate: form.licensePlate,
              }
            : {}),
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to update account')
      }

      toast(`Account for '${form.name || account.name}' successfully updated!`, 'success')
      onClose()
      onSuccess()
    } catch (err: any) {
      toast(err.message || 'Could not update account.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Account Management &amp; Editing
            </span>
            <h3 className="text-xl font-bold text-[#18201c] dark:text-white mt-0.5">
              Edit{' '}
              {isVendor
                ? 'Store & Vendor'
                : isDriver
                  ? 'Driver Partner'
                  : account.role === 'admin'
                    ? 'Admin'
                    : 'Customer'}{' '}
              Details
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
            <label className="font-bold text-[#18201c] dark:text-white">
              Full Name / Owner Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Email Address *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          {isVendor && (
            <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 space-y-3">
              <p className="font-bold text-[#18201c] dark:text-amber-200 flex items-center gap-1.5 text-xs">
                <Store className="size-4 text-amber-700 dark:text-amber-400" /> Store &amp;
                Commercial Settings
              </p>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  Display Store Name *
                </label>
                <input
                  type="text"
                  required
                  value={form.storeName}
                  onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">
                    Cuisine / Category
                  </label>
                  <input
                    type="text"
                    value={form.cuisine}
                    onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={form.commissionRate}
                    onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          {isDriver && (
            <div className="rounded-xl bg-cyan-50/70 dark:bg-cyan-950/30 p-4 border border-cyan-200 dark:border-cyan-900/50 space-y-3">
              <p className="font-bold text-[#18201c] dark:text-cyan-200 flex items-center gap-1.5 text-xs">
                <Zap className="size-4 text-cyan-700 dark:text-cyan-400" /> Driver Vehicle &amp;
                Fleet Details
              </p>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Vehicle Type</label>
                  <select
                    value={form.vehicleType}
                    onChange={(e) => setForm({ ...form, vehicleType: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Electric Scooter">Electric Scooter (EV)</option>
                    <option value="Electric Bike">Electric Bike (EV)</option>
                    <option value="Motorcycle">Motorcycle / Petrol Bike</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Car">Delivery Car / Van</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">
                    License Plate Number
                  </label>
                  <input
                    type="text"
                    placeholder="KA-05-EV-1234"
                    value={form.licensePlate}
                    onChange={(e) => setForm({ ...form, licensePlate: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-mono outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-[#18201c] dark:text-white">Address / Location</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {isVendor && (
            <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-3 bg-gray-50/50 dark:bg-[#121815] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#18201c] dark:text-white flex items-center gap-1.5">
                  <span>Store Location Pin</span>
                </h4>
                <span className="text-[11px] font-mono font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-[#18201c] px-2.5 py-0.5 rounded-full border border-transparent dark:border-[#27342d]">
                  {form.latitude.toFixed(4)}°, {form.longitude.toFixed(4)}°
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Click or drag the map pin to adjust the store&apos;s exact coordinates.
              </p>
              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#27342d]">
                <LocationPickerMap
                  initialLat={form.latitude}
                  initialLng={form.longitude}
                  onLocationSelect={(lat, lng, address) => {
                    setForm((prev) => ({
                      ...prev,
                      latitude: lat,
                      longitude: lng,
                      ...(address ? { address } : {}),
                    }))
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-bold text-[#18201c] dark:text-white">
              Reset Account Password (Optional)
            </label>
            <input
              type="password"
              placeholder="Leave blank to keep unchanged"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
            />
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
              className="rounded-xl bg-blue-600 dark:bg-blue-500 px-6 py-2 font-bold text-white shadow-md hover:bg-blue-700 dark:hover:bg-blue-600 transition flex items-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-white" /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

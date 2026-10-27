'use client'

import { MapPin, Plus, Warehouse, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import type React from 'react'
import type { emptyStoreForm } from './admin-types'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false })

interface AddXPStoreModalProps {
  isOpen: boolean
  onClose: () => void
  storeForm: typeof emptyStoreForm
  setStoreForm: React.Dispatch<React.SetStateAction<typeof emptyStoreForm>>
  submitting: boolean
  onSubmit: (event: React.FormEvent) => Promise<void>
}

export default function AddXPStoreModal({
  isOpen,
  onClose,
  storeForm,
  setStoreForm,
  submitting,
  onSubmit,
}: AddXPStoreModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-xp-store-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-[#27342d] dark:bg-[#18201c]">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/80 px-5 py-4 dark:border-white/5 dark:bg-[#121815] sm:px-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#d9f447] text-[#121815] shadow-sm">
              <Warehouse className="size-5" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#6f8817] dark:text-[#d9f447]">
                New fulfillment location
              </span>
              <h3 id="add-xp-store-title" className="mt-0.5 text-lg font-black">
                Add XP Store
              </h3>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Create the store and its manager login in one secure workflow.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-100 disabled:opacity-40 dark:border-[#27342d] dark:bg-[#18201c] dark:hover:bg-white/5"
            aria-label="Close add store dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="max-h-[75vh] overflow-y-auto p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['storeName', 'Store name', 'CraveXP Jayanagar'],
              ['ownerName', 'Manager name', 'Store manager'],
              ['email', 'Manager email', 'manager@crave.com'],
              ['password', 'Temporary password', 'Minimum 8 characters'],
              ['phone', 'Phone', '+91 98765 43210'],
              ['address', 'Store address', 'Bengaluru, Karnataka'],
            ].map(([field, label, placeholder]) => (
              <label
                key={field}
                className={`block text-xs font-bold ${field === 'address' ? 'sm:col-span-2' : ''}`}
              >
                {label}
                <input
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  required={!['phone'].includes(field)}
                  minLength={field === 'password' ? 8 : undefined}
                  value={storeForm[field as keyof typeof storeForm]}
                  onChange={(event) =>
                    setStoreForm((current) => ({ ...current, [field]: event.target.value }))
                  }
                  placeholder={placeholder}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-medium outline-none transition focus:border-[#86a018] focus:ring-4 focus:ring-[#d9f447]/15 dark:border-[#27342d] dark:bg-[#121815]"
                />
              </label>
            ))}
          </div>

          <section className="mt-5 space-y-3 rounded-2xl border border-gray-200 bg-gray-50/70 p-3 dark:border-[#27342d] dark:bg-[#121815] sm:p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="flex items-center gap-2 text-xs font-black">
                  <MapPin className="size-4 text-[#86a018] dark:text-[#d9f447]" />
                  Exact store location
                </h4>
                <p className="mt-1 text-[10px] leading-relaxed text-gray-500 dark:text-gray-400">
                  Click the map, drag the pin, or use your device location. The coordinates are
                  saved with the XP store.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 font-mono text-[10px] font-bold text-gray-600 dark:border-[#27342d] dark:bg-[#18201c] dark:text-gray-300">
                {storeForm.latitude.toFixed(6)}, {storeForm.longitude.toFixed(6)}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-[#27342d]">
              <LocationPickerMap
                initialLat={storeForm.latitude}
                initialLng={storeForm.longitude}
                className="relative h-64 w-full overflow-hidden bg-[#f0f3ec] sm:h-72"
                onLocationSelect={(latitude, longitude, address) => {
                  setStoreForm((current) => ({
                    ...current,
                    latitude,
                    longitude,
                    ...(address ? { address } : {}),
                  }))
                }}
              />
            </div>
          </section>

          <div className="mt-6 flex flex-col-reverse gap-2 border-t border-gray-100 pt-4 dark:border-white/5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-bold transition hover:bg-gray-50 disabled:opacity-40 dark:border-[#27342d] dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#18201c] px-5 py-2.5 text-xs font-black text-white transition hover:bg-black disabled:opacity-50 dark:bg-[#d9f447] dark:text-[#121815]"
            >
              <Plus className="size-4" />
              {submitting ? 'Creating store…' : 'Create XP Store'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

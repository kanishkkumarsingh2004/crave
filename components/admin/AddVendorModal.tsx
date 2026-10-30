'use client'

import { FormEvent, useState } from 'react'
import dynamic from 'next/dynamic'
import { CheckCircle2, DollarSign, FileSpreadsheet, ShieldCheck, Store, X } from 'lucide-react'
import { useToast } from '@/lib/toast-context'
import { VendorFormData } from './types'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), { ssr: false })

interface AddVendorModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const INITIAL_VENDOR_FORM: VendorFormData = {
  ownerName: '',
  email: '',
  password: '',
  storeName: '',
  vendorType: 'Restaurant Vendor',
  cuisine: '',
  phone: '',
  address: '',
  commercialModel: 'commission',
  commissionRate: 15,
  markupRate: 0,
  fixedCommission: 0,
  fixedMarkup: 0,
  paymentModel: 'commission',
  bannerUrl: '',
  latitude: 12.679898,
  longitude: 77.469493,
  fssaiLicense: '',
  gstin: '',
  gstStatus: 'REGISTERED',
  gstRatePercent: 18,
  supplierState: 'Karnataka',
  priceTaxMode: 'TAX_INCLUSIVE',
  bankAccountName: '',
  bankName: '',
  bankAccountNumber: '',
  bankIfsc: '',
  payoutVpa: '',
}

export default function AddVendorModal({ isOpen, onClose, onSuccess }: AddVendorModalProps) {
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<VendorFormData>(INITIAL_VENDOR_FORM)

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.ownerName || !form.email || !form.password || !form.storeName) {
      toast('Please fill in all required vendor onboarding fields.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/create-vendor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.ownerName,
          email: form.email,
          password: form.password,
          storeName: form.storeName,
          vendorType: form.vendorType,
          cuisine: form.cuisine,
          phone: form.phone,
          address: form.address,
          commercialModel: form.commercialModel,
          commissionRate: form.commissionRate,
          markupRate: form.markupRate,
          fixedCommission: form.fixedCommission,
          fixedMarkup: form.fixedMarkup,
          paymentModel: form.paymentModel,
          bannerUrl: form.bannerUrl,
          latitude: form.latitude,
          longitude: form.longitude,
          fssaiLicense: form.fssaiLicense,
          gstin: form.gstin,
          gstStatus: form.gstStatus,
          gstRatePercent: form.gstRatePercent,
          supplierState: form.supplierState,
          priceTaxMode: form.priceTaxMode,
          bankAccountName: form.bankAccountName,
          bankName: form.bankName,
          bankAccountNumber: form.bankAccountNumber,
          bankIfsc: form.bankIfsc,
          payoutVpa: form.payoutVpa,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Vendor creation failed')
      }

      toast(`${form.storeName} successfully onboarded as ${form.vendorType}!`, 'success')
      setForm(INITIAL_VENDOR_FORM)
      onClose()
      onSuccess()
    } catch (err: any) {
      toast(err.message || 'Could not onboard vendor. Try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white p-6 shadow-2xl border border-gray-200 dark:border-[#27342d] max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018] dark:text-[#a3c428]">
              Admin Exclusive Flow
            </span>
            <h3 className="text-xl font-bold text-[#18201c] dark:text-white mt-0.5">
              Onboard New Restaurant Vendor
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Register vendor credentials, store profile, cuisine, and commercial model in database.
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#121815] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Store Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Biryani Blues"
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">
                Vendor Category Type *
              </label>
              <select
                value={form.vendorType}
                onChange={(e) => setForm({ ...form, vendorType: e.target.value as any })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-bold outline-none focus:border-[#86a018] cursor-pointer"
              >
                <option
                  value="Restaurant Vendor"
                  className="bg-white dark:bg-[#121815] text-[#18201c] dark:text-white"
                >
                  Restaurant Vendor (Food &amp; Dining)
                </option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="font-bold text-[#18201c] dark:text-white">
                Owner / Contact Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Sharma"
                value={form.ownerName}
                onChange={(e) => setForm({ ...form, ownerName: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">
                Cuisine / Store Specialties *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. North Indian, Biryani"
                value={form.cuisine}
                onChange={(e) => setForm({ ...form, cuisine: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-amber-50/60 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/50 space-y-3">
            <p className="font-bold text-[#18201c] dark:text-amber-200 flex items-center gap-1.5 text-xs">
              <ShieldCheck className="size-4 text-amber-700 dark:text-amber-400" /> Vendor Account
              Login Credentials
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Login Email *</label>
                <input
                  type="email"
                  required
                  placeholder="vendor@crave.com"
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
              <label className="font-bold text-[#18201c] dark:text-white">Store Phone Number</label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <div>
              <label className="font-bold text-[#18201c] dark:text-white">Physical Address</label>
              <input
                type="text"
                placeholder="Indiranagar 100ft Rd, Bengaluru"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none focus:border-[#86a018] placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>

          <div className="rounded-xl bg-sky-50/60 dark:bg-sky-950/30 p-4 border border-sky-200 dark:border-sky-900/50 space-y-3">
            <p className="font-bold text-[#18201c] dark:text-sky-200 flex items-center gap-1.5 text-xs">
              <DollarSign className="size-4 text-sky-700 dark:text-sky-400" /> Commercial Contract
              &amp; Commission Model
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  Commercial Model Type
                </label>
                <select
                  value={form.commercialModel}
                  onChange={(e) => {
                    const nextModel = e.target.value as any
                    setForm({
                      ...form,
                      commercialModel: nextModel,
                      paymentModel: nextModel === 'markup' ? 'markup' : 'commission',
                    })
                  }}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-bold outline-none cursor-pointer"
                >
                  <option value="commission">Commission Only (% cut on order)</option>
                  <option value="markup">Markup Only (Flat app price markup)</option>
                  <option value="hybrid">Hybrid (Commission + Markup)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  Platform Commission (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={form.commissionRate}
                  onChange={(e) => setForm({ ...form, commissionRate: Number(e.target.value) })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-bold outline-none"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-purple-50/60 dark:bg-purple-950/30 p-4 border border-purple-200 dark:border-purple-900/50 space-y-3">
            <p className="font-bold text-[#18201c] dark:text-purple-200 flex items-center gap-1.5 text-xs">
              <FileSpreadsheet className="size-4 text-purple-700 dark:text-purple-400" /> Tax &amp;
              Compliance (GST / FSSAI)
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">
                  FSSAI License Number
                </label>
                <input
                  type="text"
                  placeholder="14-digit FSSAI"
                  value={form.fssaiLicense}
                  onChange={(e) => setForm({ ...form, fssaiLicense: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-mono"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">GSTIN</label>
                <input
                  type="text"
                  placeholder="29AAAAA0000A1Z5"
                  value={form.gstin}
                  onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-mono uppercase"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 p-4 border border-emerald-200 dark:border-emerald-900/50 space-y-3">
            <p className="font-bold text-[#18201c] dark:text-emerald-200 flex items-center gap-1.5 text-xs">
              <Store className="size-4 text-emerald-700 dark:text-emerald-400" /> Payout Bank
              Account Details
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Account Name</label>
                <input
                  type="text"
                  placeholder="Spice Kitchen"
                  value={form.bankAccountName}
                  onChange={(e) => setForm({ ...form, bankAccountName: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Account Number</label>
                <input
                  type="text"
                  placeholder="5010023456789"
                  value={form.bankAccountNumber}
                  onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">IFSC Code</label>
                <input
                  type="text"
                  placeholder="HDFC0001234"
                  value={form.bankIfsc}
                  onChange={(e) => setForm({ ...form, bankIfsc: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2 font-mono uppercase font-bold"
                />
              </div>
            </div>
          </div>

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
              Click or drag the map pin to mark the exact store coordinates for delivery
              calculation.
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
                  <span>Onboarding Vendor...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 text-[#d9f447] dark:text-[#121815]" /> Onboard
                  Vendor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import { useAuth } from '@/lib/auth-context'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  CreditCard,
  FileText,
  LogOut,
  MapPin,
  Percent,
  PhoneCall,
  Save,
  ShieldCheck,
  Sparkles,
  Store,
  UtensilsCrossed,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

export default function VendorSettingsPage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()

  const [toastMsg, setToastMsg] = useState('')
  const [kitchenOpen, setKitchenOpen] = useState(true)

  // Bank & Profile Form State
  const [accountHolder, setAccountHolder] = useState('Maya Lin (The Green Table)')
  const [bankName, setBankName] = useState('HDFC Bank Ltd')
  const [accountNumber, setAccountNumber] = useState('50100293819281')
  const [ifscCode, setIfscCode] = useState('HDFC0001234')
  const [payoutUpi, setPayoutUpi] = useState('greentable@hdfcbank')
  const [fssaiLicense, setFssaiLicense] = useState('11223344556677')
  const [phone, setPhone] = useState(user?.phone || '+91 98111 22334')
  const [address, setAddress] = useState(user?.address || 'Koramangala 5th Block, Bengaluru')

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (role !== 'vendor') {
      router.replace(role === 'customer' ? '/user/dashboard' : `/${role}/dashboard`)
    }
  }, [user, role, isLoading, router])

  if (isLoading || !user || role !== 'vendor') {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#86a018] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    setToastMsg('Bank account details & kitchen settings saved!')
    setTimeout(() => setToastMsg(''), 3500)
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-5 z-50 flex items-center gap-2 rounded-2xl bg-[#18201c] px-4 py-3 text-xs font-bold text-white shadow-2xl border border-white/20 animate-in fade-in duration-300">
          <Sparkles className="size-4 text-[#d9f447]" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Header Navbar */}
      <div className="sticky top-0 z-30 border-b border-[#eaefe5] bg-white/95 backdrop-blur-md px-4 py-3.5 sm:px-8 shadow-xs">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <Link href="/" className="font-black text-2xl sm:text-3xl tracking-tighter text-[#18201c] shrink-0">
              crave<span className="text-[#86a018]">.</span>
            </Link>
            <span className="rounded-full bg-[#18201c] px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-[#d9f447]">
              VENDOR
            </span>

            <div className="hidden sm:block h-6 w-px bg-gray-200 mx-1 shrink-0" />

            <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-[#18201c] truncate">
              <Store className="size-4 text-[#86a018] shrink-0" />
              <span className="truncate max-w-[200px]">{user?.restaurantName || 'The Green Table'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
            <Link
              href="/vendor/dashboard"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kitchen Orders</span>
            </Link>
            <Link
              href="/vendor/menu"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <UtensilsCrossed className="size-3.5 text-amber-600" />
              <span>Menu Management</span>
            </Link>
            <Link
              href="/vendor/sales"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50"
            >
              Sales &amp; Earnings
            </Link>
            <Link
              href="/vendor/coupons"
              className="rounded-2xl bg-white text-gray-700 border border-gray-200 px-4 py-2 transition shrink-0 hover:bg-gray-50 flex items-center gap-1.5"
            >
              <Percent className="size-3.5 text-purple-600" />
              <span>Store Offers</span>
            </Link>
            <button
              onClick={() => router.push('/vendor/settings')}
              className="rounded-2xl bg-[#18201c] text-white px-4 py-2 transition shrink-0 shadow-xs"
            >
              Bank &amp; Settings
            </button>
            <button
              onClick={() => logout()}
              className="rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 transition shrink-0 hover:bg-rose-100 flex items-center gap-1"
              title="Sign Out"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Header Hero */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                Restaurant Payout Settings (Zomato / Swiggy Model)
              </span>
              <h2 className="mt-1 text-2xl font-bold text-[#18201c]">Bank Profile &amp; Kitchen Settings</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage bank account details for automated weekly payout transfers.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold text-[#18201c]">Accepting Orders:</span>
              <button
                type="button"
                onClick={() => {
                  setKitchenOpen(!kitchenOpen)
                  setToastMsg(`Kitchen status set to ${!kitchenOpen ? 'OPEN' : 'CLOSED'}`)
                  setTimeout(() => setToastMsg(''), 3000)
                }}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  kitchenOpen
                    ? 'bg-emerald-600 text-white'
                    : 'bg-rose-600 text-white'
                }`}
              >
                {kitchenOpen ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          </div>
        </div>

        {/* Bank & Payout Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Registered Bank Account Card */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">Payout Bank Account</h3>
                <p className="text-xs text-gray-500">Weekly net sales earnings will be directly remitted here</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-mono font-bold outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-mono font-bold uppercase outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#18201c]">Primary Payout UPI VPA (Optional)</label>
                <input
                  type="text"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                  placeholder="e.g. restaurant@bank"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
              <ShieldCheck className="size-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bank Account Status: Verified &amp; Active</p>
                <p className="mt-0.5 text-emerald-800">
                  Payouts are automatically computed every Sunday 11:59 PM and deposited to this account by Monday afternoon.
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant License & Address Info */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-800 font-bold">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">FSSAI License &amp; Store Details</h3>
                <p className="text-xs text-gray-500">Government compliance and pickup address</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">FSSAI Registration License #</label>
                <input
                  type="text"
                  required
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-mono font-bold outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Manager Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-[#18201c]">Kitchen Pickup Address</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-medium outline-none focus:border-[#86a018] bg-white"
                />
              </div>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-8 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
            >
              <Save className="size-4 text-[#d9f447]" /> Save Bank &amp; Profile Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

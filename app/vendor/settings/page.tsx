'use client'

import ThemeSelector from '@/components/ThemeSelector'
import VendorSidebar from '@/components/VendorSidebar'
import { useAuth } from '@/lib/auth-context'
import { Building2, FileText, Palette, Save, ShieldCheck, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

export default function VendorSettingsPage() {
  const { user, role, isLoading, logout } = useAuth()
  const router = useRouter()

  const [toastMsg, setToastMsg] = useState('')
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [kitchenOpen, setKitchenOpen] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(true)

  // Bank & Profile Form State
  const [accountHolder, setAccountHolder] = useState('')
  const [bankName, setBankName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [payoutUpi, setPayoutUpi] = useState('')
  const [fssaiLicense, setFssaiLicense] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      router.replace('/login')
    } else if (role !== 'vendor' && role !== 'restaurant_vendor') {
      router.replace(
        role === 'user' || role === 'customer'
          ? '/user/dashboard'
          : role === 'cravexp_store_vendor'
            ? '/vendor/crave-ep'
            : role === 'rider' || role === 'driver'
              ? '/driver/dashboard'
              : '/dashboard'
      )
    }
  }, [user, role, isLoading, router])

  useEffect(() => {
    if (!user?.id || (role !== 'vendor' && role !== 'restaurant_vendor')) return
    const loadSettings = async () => {
      setSettingsLoading(true)
      try {
        const res = await fetch(`/api/restaurants?ownerId=${encodeURIComponent(user.id)}`)
        const data = await res.json()
        const restaurant = data.restaurants?.[0]
        if (!restaurant) {
          setRestaurantId(null)
          setAccountHolder('')
          setBankName('')
          setAccountNumber('')
          setIfscCode('')
          setPayoutUpi('')
          setFssaiLicense('')
          setKitchenOpen(false)
          setSettingsLoading(false)
          return
        }
        setRestaurantId(restaurant.id)
        setAccountHolder(restaurant.bank_account_name ?? '')
        setBankName(restaurant.bank_name ?? '')
        setAccountNumber(restaurant.bank_account_number ?? '')
        setIfscCode(restaurant.bank_ifsc ?? '')
        setPayoutUpi(restaurant.payout_vpa ?? '')
        setFssaiLicense(restaurant.fssai_license ?? '')
        setKitchenOpen(Boolean(restaurant.is_open))
        setAddress(restaurant.address ?? user.address ?? '')
        setPhone(user.phone ?? '')
      } catch (err) {
        console.error('Failed to load restaurant settings:', err)
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [user?.id, role])

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#86a018] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    if (!restaurantId || !user?.id) return
    try {
      const res = await fetch('/api/restaurants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: restaurantId,
          bank_account_name: accountHolder || null,
          bank_name: bankName || null,
          bank_account_number: accountNumber || null,
          bank_ifsc: ifscCode || null,
          payout_vpa: payoutUpi || null,
          fssai_license: fssaiLicense || null,
          address: address || null,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setToastMsg('Bank account details & kitchen settings saved!')
    } catch (err) {
      setToastMsg('Could not save settings to the database.')
    } finally {
      setTimeout(() => setToastMsg(''), 3500)
    }
  }

  async function handleToggleKitchen() {
    if (!restaurantId || !user?.id) return
    const nextStatus = !kitchenOpen
    try {
      const res = await fetch('/api/restaurants', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: restaurantId,
          is_open: nextStatus,
        }),
      })
      if (!res.ok) throw new Error('Update failed')
      setKitchenOpen(nextStatus)
    } catch (err) {
      setToastMsg('Could not update store availability.')
      setTimeout(() => setToastMsg(''), 3000)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] pb-16 lg:pl-64">
      <VendorSidebar />

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Header Hero */}
        <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#86a018]">
                Restaurant Profile &amp; Payout Settings
              </span>
              <h2 className="mt-1 text-2xl font-bold text-[#18201c]">
                Bank Profile &amp; Kitchen Settings
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage the contact, payout, and availability details stored for this restaurant.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
              <span className="text-xs font-bold text-[#18201c]">Accepting Orders:</span>
              <button
                type="button"
                onClick={handleToggleKitchen}
                disabled={!restaurantId || settingsLoading}
                className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                  kitchenOpen ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                }`}
              >
                {kitchenOpen ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          </div>
        </div>

        {/* Theme & Visual Appearance Section */}
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-800 font-bold">
              <Palette className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#18201c]">Appearance &amp; Theme Mode</h3>
              <p className="text-xs text-gray-500">
                Choose your preferred store portal display mode (Light, Dark, or System Sync).
              </p>
            </div>
          </div>
          <ThemeSelector />
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
                <p className="text-xs text-gray-500">
                  Bank details stored on your restaurant profile
                </p>
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
                <label className="font-bold text-[#18201c]">
                  Primary Payout UPI VPA (Optional)
                </label>
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
                <p className="font-bold">
                  {accountNumber ? 'Bank details saved' : 'Bank details not configured'}
                </p>
                <p className="mt-0.5 text-emerald-800">
                  {accountNumber
                    ? 'Current bank information is loaded from the restaurant profile.'
                    : 'Add payout details and save them to the restaurant profile.'}
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
                <h3 className="text-lg font-bold text-[#18201c]">
                  FSSAI License &amp; Store Details
                </h3>
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

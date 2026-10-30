'use client'

import ThemeSelector from '@/components/ThemeSelector'
import AppleToggle from '@/components/ui/AppleToggle'
import VendorSidebar from '@/components/VendorSidebar'
import { VendorDashboardSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { apiFetch } from '@/lib/client/api-fetch'
import {
  Building2,
  FileText,
  Loader2,
  Palette,
  Save,
  ShieldCheck,
  Tag,
  UtensilsCrossed,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { FormEvent, useEffect, useState } from 'react'

export default function VendorSettingsPage() {
  const { user, role, isLoading } = useAuth()
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

  // Commercial Engine Tax & Contract State
  const [gstin, setGstin] = useState('')
  const [gstStatus, setGstStatus] = useState('REGISTERED')
  const [supplierState, setSupplierState] = useState('Karnataka')
  const [priceTaxMode, setPriceTaxMode] = useState('TAX_INCLUSIVE')
  const [commercialModel, setCommercialModel] = useState('commission')
  const [commissionRate, setCommissionRate] = useState(15)
  const [markupRate, setMarkupRate] = useState(0)
  const [saving, setSaving] = useState(false)

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
        setGstin(restaurant.gstin ?? '')
        setGstStatus(restaurant.gst_status ?? 'REGISTERED')
        setSupplierState(restaurant.supplier_state ?? 'Karnataka')
        setPriceTaxMode(restaurant.price_tax_mode ?? 'TAX_INCLUSIVE')
        setCommercialModel(restaurant.commercial_model ?? 'commission')
        setCommissionRate(Number(restaurant.commission_rate ?? 15))
        setMarkupRate(Number(restaurant.markup_rate ?? 0))
      } catch (err) {
        console.error('Failed to load restaurant settings:', err)
      } finally {
        setSettingsLoading(false)
      }
    }
    loadSettings()
  }, [user?.id, role])

  if (isLoading || !user || (role !== 'vendor' && role !== 'restaurant_vendor')) {
    return <VendorDashboardSkeleton />
  }

  if (settingsLoading) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a0f0d] text-[#121815] dark:text-white pb-28 lg:pb-16 lg:pl-64 custom-scrollbar transition-colors duration-200">
        <VendorSidebar />
        <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
          <div className="rounded-3xl border border-stone-200 dark:border-[#233027] bg-white dark:bg-[#121815] p-6 shadow-sm dark:shadow-xl animate-pulse">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-2xl bg-stone-200 dark:bg-[#1d2621]" />
              <div className="space-y-2">
                <div className="h-3 w-24 rounded bg-stone-200 dark:bg-[#1d2621]" />
                <div className="h-5 w-40 rounded bg-stone-200 dark:bg-[#1d2621]" />
              </div>
            </div>
          </div>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="rounded-3xl border border-stone-200 dark:border-[#233027] bg-white dark:bg-[#121815] p-6 shadow-sm dark:shadow-xl animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-stone-200 dark:bg-[#1d2621]" />
                <div className="h-4 w-32 rounded bg-stone-200 dark:bg-[#1d2621]" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="h-11 rounded-xl bg-stone-200 dark:bg-[#1d2621]" />
                <div className="h-11 rounded-xl bg-stone-200 dark:bg-[#1d2621]" />
                <div className="h-11 rounded-xl bg-stone-200 dark:bg-[#1d2621]" />
                <div className="h-11 rounded-xl bg-stone-200 dark:bg-[#1d2621]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  async function handleSaveSettings(e: FormEvent) {
    e.preventDefault()
    if (!restaurantId || !user?.id) return
    setSaving(true)
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
          gstin: gstin || null,
          gst_status: gstStatus || 'REGISTERED',
          supplier_state: supplierState || 'Karnataka',
          price_tax_mode: priceTaxMode || 'TAX_INCLUSIVE',
          commercial_model: commercialModel || 'commission',
          commission_rate: Number(commissionRate) || 15,
          markup_rate: Number(markupRate) || 0,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Save failed')
      }
      setToastMsg('Bank account details & store settings saved successfully!')
    } catch (err) {
      setToastMsg(err instanceof Error ? err.message : 'Could not save settings to the database.')
    } finally {
      setSaving(false)
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
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c100e] text-[#1D1D1F] dark:text-white pb-32 lg:pb-16 lg:pl-64 custom-scrollbar transition-colors duration-200">
      <VendorSidebar />

      <div className="mx-auto max-w-4xl px-3 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* Header Hero */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 sm:gap-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
                <UtensilsCrossed className="size-6" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Vendor Console
                </span>
                <h2 className="mt-0.5 text-xl sm:text-2xl font-bold text-[#1D1D1F] dark:text-white truncate">
                  Store &amp; Payout Settings
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  Manage payout, kitchen availability, and commercial profile.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-3 bg-stone-100/80 dark:bg-white/[0.06] p-2.5 sm:p-3 rounded-full border border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-xs font-semibold text-stone-700 dark:text-stone-300 pl-1">
                Accepting Orders:
              </span>
              <div className="flex items-center gap-2">
                <AppleToggle
                  checked={kitchenOpen}
                  onChange={() => void handleToggleKitchen()}
                  disabled={!restaurantId || settingsLoading}
                  iconVariant="power"
                  activeColor="bg-[#34c759]"
                  ariaLabel="Accepting orders status"
                />
                <span
                  className={`text-[10px] sm:text-xs font-semibold tracking-wider uppercase pr-1 ${
                    kitchenOpen
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {kitchenOpen ? 'ONLINE' : 'OFFLINE'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Alert Message */}
        {toastMsg && (
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-700 dark:text-emerald-400 shadow-xs animate-in fade-in duration-200">
            {toastMsg}
          </div>
        )}

        {/* Theme & Visual Appearance Section */}
        <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
            <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
              <Palette className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[#1D1D1F] dark:text-white">
                Appearance &amp; Theme Mode
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Choose your preferred store portal display mode (Light, Dark, or System Sync).
              </p>
            </div>
          </div>
          <ThemeSelector />
        </div>

        {/* Bank & Payout Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Registered Bank Account Card */}
          <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                  Payout Bank Account
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Bank details stored on your restaurant profile
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Krishna Sagar Pvt Ltd"
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Bank Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 5010023456789"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  IFSC Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC0001234"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold uppercase text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Primary Payout UPI VPA (Optional)
                </label>
                <input
                  type="text"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                  placeholder="e.g. restaurant@bank"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/10 p-4 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-3">
              <ShieldCheck className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#1D1D1F] dark:text-white">
                  {accountNumber ? 'Bank details saved' : 'Bank details not configured'}
                </p>
                <p className="mt-0.5 text-emerald-700/80 dark:text-emerald-300/80">
                  {accountNumber
                    ? 'Current bank information is loaded from the restaurant profile.'
                    : 'Add payout details and save them to the restaurant profile.'}
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant License & Address Info */}
          <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                  FSSAI License &amp; Store Details
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Government compliance and pickup address
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  FSSAI Registration License #
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 11223344556677"
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Manager Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Kitchen Pickup Address
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Enter full pickup address for riders..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 text-base sm:text-xs font-semibold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Commercial Tax & GST Profile Card */}
          <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                  GST Tax Registration &amp; Pricing Mode
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Commercial engine tax profile &amp; place of supply configuration
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  GSTIN Registration Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold uppercase text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  GST Registration Status
                </label>
                <select
                  value={gstStatus}
                  onChange={(e) => setGstStatus(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors cursor-pointer"
                >
                  <option
                    value="REGISTERED"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    REGISTERED (Regular Taxable)
                  </option>
                  <option
                    value="UNREGISTERED"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    UNREGISTERED
                  </option>
                  <option
                    value="COMPOSITION"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    COMPOSITION SCHEME
                  </option>
                  <option
                    value="EXEMPT"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    EXEMPT
                  </option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Supplier Registration State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Karnataka"
                  value={supplierState}
                  onChange={(e) => setSupplierState(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white placeholder-stone-400 dark:placeholder-stone-500 outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Default Menu Price Tax Mode
                </label>
                <select
                  value={priceTaxMode}
                  onChange={(e) => setPriceTaxMode(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors cursor-pointer"
                >
                  <option
                    value="TAX_INCLUSIVE"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    TAX INCLUSIVE (Displayed price includes 5% GST)
                  </option>
                  <option
                    value="TAX_EXCLUSIVE"
                    className="bg-white dark:bg-[#161617] text-[#1D1D1F] dark:text-white"
                  >
                    TAX EXCLUSIVE (5% GST added at checkout)
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* Commission & Markup Rate Card */}
          <div className="rounded-3xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#161617] p-5 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-black/[0.06] dark:border-white/[0.06] pb-4">
              <div className="grid size-10 place-items-center rounded-2xl bg-stone-100 dark:bg-white/10 text-[#1D1D1F] dark:text-white shrink-0">
                <Tag className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#1D1D1F] dark:text-white">
                  Commission &amp; Markup Rate
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Platform commission and markup applied to your order totals
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Commercial Model
                </label>
                <select
                  value={commercialModel}
                  onChange={(e) => setCommercialModel(e.target.value)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors cursor-pointer"
                >
                  <option value="commission">Commission</option>
                  <option value="markup">Markup</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="e.g. 15"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>

              <div>
                <label className="font-semibold text-stone-600 dark:text-stone-300">
                  Markup Rate (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  placeholder="e.g. 0"
                  value={markupRate}
                  onChange={(e) => setMarkupRate(Number(e.target.value) || 0)}
                  className="mt-1.5 w-full min-h-[44px] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-stone-50 dark:bg-white/5 p-3 sm:py-2.5 font-mono text-base sm:text-xs font-bold text-[#1D1D1F] dark:text-white outline-none focus:border-black/30 dark:focus:border-white/30 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Submit Save Button */}
          <div className="flex sm:justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-full bg-[#1D1D1F] dark:bg-white text-white dark:text-[#1D1D1F] hover:bg-[#2C2C2E] dark:hover:bg-stone-200 px-8 py-3.5 min-h-[48px] text-sm sm:text-xs font-semibold transition active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 shadow-xs"
            >
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}{' '}
              {saving ? 'Saving...' : 'Save Bank & Store Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

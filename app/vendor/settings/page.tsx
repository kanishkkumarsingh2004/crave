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

  // Commercial Engine Tax & Contract State
  const [gstin, setGstin] = useState('')
  const [gstStatus, setGstStatus] = useState('REGISTERED')
  const [supplierState, setSupplierState] = useState('Karnataka')
  const [priceTaxMode, setPriceTaxMode] = useState('TAX_INCLUSIVE')
  const [commercialModel, setCommercialModel] = useState('commission')
  const [commissionRate, setCommissionRate] = useState(15)
  const [markupRate, setMarkupRate] = useState(0)

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
    return (
      <div className="min-h-screen bg-[#0a0f0d] flex items-center justify-center p-4">
        <div className="size-8 border-4 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
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
          gstin: gstin || null,
          gst_status: gstStatus || 'REGISTERED',
          supplier_state: supplierState || 'Karnataka',
          price_tax_mode: priceTaxMode || 'TAX_INCLUSIVE',
          commercial_model: commercialModel,
          commission_rate: commissionRate,
          markup_rate: markupRate,
        }),
      })
      if (!res.ok) throw new Error('Save failed')
      setToastMsg('Bank account details, GST profile & commercial settings saved to DB!')
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
    <div className="min-h-screen bg-[#0a0f0d] text-white pb-16 lg:pl-64 custom-scrollbar">
      <VendorSidebar />

      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Header Hero */}
        <div className="rounded-3xl border border-[#233027] bg-gradient-to-r from-[#141b17] via-[#111614] to-[#18231c] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447]">
                Restaurant Profile &amp; Payout Settings
              </span>
              <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
                Bank Profile &amp; Kitchen Settings
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Manage the contact, payout, and availability details stored for this restaurant.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-[#18201c] p-3 rounded-2xl border border-[#27342d]">
              <span className="text-xs font-bold text-gray-300">Accepting Orders:</span>
              <button
                type="button"
                onClick={handleToggleKitchen}
                disabled={!restaurantId || settingsLoading}
                className={`px-3 py-1 rounded-full text-xs font-black transition ${
                  kitchenOpen ? 'bg-emerald-500 text-[#0d1310]' : 'bg-rose-500 text-white'
                }`}
              >
                {kitchenOpen ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          </div>
        </div>

        {/* Toast Alert Message */}
        {toastMsg && (
          <div className="rounded-2xl border border-[#d9f447]/40 bg-[#d9f447]/10 p-4 text-xs font-bold text-[#d9f447] shadow-lg animate-in fade-in duration-200">
            ✓ {toastMsg}
          </div>
        )}

        {/* Theme & Visual Appearance Section */}
        <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-3 border-b border-[#202b24] pb-4">
            <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
              <Palette className="size-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-white">Appearance &amp; Theme Mode</h3>
              <p className="text-xs text-gray-400">
                Choose your preferred store portal display mode (Light, Dark, or System Sync).
              </p>
            </div>
          </div>
          <ThemeSelector />
        </div>

        {/* Bank & Payout Form */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Registered Bank Account Card */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-[#202b24] pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold">
                <Building2 className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Payout Bank Account</h3>
                <p className="text-xs text-gray-400">
                  Bank details stored on your restaurant profile
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-gray-200">Account Holder Name</label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">Bank Name</label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">Bank Account Number</label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono font-bold text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">IFSC Code</label>
                <input
                  type="text"
                  required
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono font-bold uppercase text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-gray-200">Primary Payout UPI VPA (Optional)</label>
                <input
                  type="text"
                  value={payoutUpi}
                  onChange={(e) => setPayoutUpi(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                  placeholder="e.g. restaurant@bank"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-500/10 p-4 border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-3">
              <ShieldCheck className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-white">
                  {accountNumber ? 'Bank details saved' : 'Bank details not configured'}
                </p>
                <p className="mt-0.5 text-emerald-300/80">
                  {accountNumber
                    ? 'Current bank information is loaded from the restaurant profile.'
                    : 'Add payout details and save them to the restaurant profile.'}
                </p>
              </div>
            </div>
          </div>

          {/* Restaurant License & Address Info */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-[#202b24] pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold">
                <FileText className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">FSSAI License &amp; Store Details</h3>
                <p className="text-xs text-gray-400">Government compliance and pickup address</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-gray-200">FSSAI Registration License #</label>
                <input
                  type="text"
                  required
                  value={fssaiLicense}
                  onChange={(e) => setFssaiLicense(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono font-bold text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">Manager Phone Number</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-bold text-gray-200">Kitchen Pickup Address</label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-medium text-white outline-none focus:border-[#d9f447]"
                />
              </div>
            </div>
          </div>

          {/* Commercial Tax & GST Profile Card */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-[#202b24] pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  GST Tax Registration &amp; Pricing Mode
                </h3>
                <p className="text-xs text-gray-400">
                  Commercial engine tax profile &amp; place of supply configuration
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-gray-200">GSTIN Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-mono font-bold uppercase text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">GST Registration Status</label>
                <select
                  value={gstStatus}
                  onChange={(e) => setGstStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                >
                  <option value="REGISTERED">REGISTERED (Regular Taxable)</option>
                  <option value="UNREGISTERED">UNREGISTERED</option>
                  <option value="COMPOSITION">COMPOSITION SCHEME</option>
                  <option value="EXEMPT">EXEMPT</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-200">Supplier Registration State</label>
                <input
                  type="text"
                  value={supplierState}
                  onChange={(e) => setSupplierState(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">Default Menu Price Tax Mode</label>
                <select
                  value={priceTaxMode}
                  onChange={(e) => setPriceTaxMode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                >
                  <option value="TAX_INCLUSIVE">
                    TAX INCLUSIVE (Displayed price includes 5% GST)
                  </option>
                  <option value="TAX_EXCLUSIVE">TAX EXCLUSIVE (5% GST added at checkout)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Commercial Model & Commission / Markup Settings */}
          <div className="rounded-3xl border border-[#222e27] bg-[#121815] p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3 border-b border-[#202b24] pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  Commercial Settlement &amp; Pricing Model
                </h3>
                <p className="text-xs text-gray-400">
                  Configure separate commission cut (%) and platform customer markup (%)
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-gray-200">Commercial Model</label>
                <select
                  value={commercialModel}
                  onChange={(e) => setCommercialModel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447]"
                >
                  <option value="commission">COMMISSION (Vendor pays % cut on order)</option>
                  <option value="markup">MARKUP (Platform adds % markup for customer)</option>
                  <option value="hybrid">
                    HYBRID (Both Commission cut &amp; Customer Markup apply)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-200">
                  Commission Rate (%) {commercialModel === 'markup' && '(Disabled)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  disabled={commercialModel === 'markup'}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447] disabled:bg-[#18201c] disabled:text-gray-500"
                />
              </div>

              <div>
                <label className="font-bold text-gray-200">
                  Platform Markup Rate (%) {commercialModel === 'commission' && '(Disabled)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  disabled={commercialModel === 'commission'}
                  value={markupRate}
                  onChange={(e) => setMarkupRate(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-[#233027] bg-[#0d1210] p-3 font-bold text-white outline-none focus:border-[#d9f447] disabled:bg-[#18201c] disabled:text-gray-500"
                />
              </div>
            </div>

            <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-2xl">
              💡 <strong>Example:</strong> Under <strong>Commission (e.g., 15%)</strong>, the vendor
              pays 15% to the platform. Under <strong>Markup (e.g., 10%)</strong>, the platform adds
              10% on top of the vendor's base menu price for customers.
            </p>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#d9f447] px-8 py-3.5 text-xs font-black text-[#0d1310] shadow-lg shadow-[#d9f447]/10 hover:bg-[#c8e337] active:scale-95 transition"
            >
              <Save className="size-4 text-[#0d1310]" /> Save Bank, Profile &amp; Commercial
              Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

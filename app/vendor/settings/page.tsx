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

          {/* Commercial Tax & GST Profile Card (commercial-engine.md Section 20) */}
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-800 font-bold">
                <ShieldCheck className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">
                  GST Tax Registration &amp; Pricing Mode
                </h3>
                <p className="text-xs text-gray-500">
                  Commercial engine tax profile &amp; place of supply configuration
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">GSTIN Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. 29AAAAA0000A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-mono font-bold uppercase outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">GST Registration Status</label>
                <select
                  value={gstStatus}
                  onChange={(e) => setGstStatus(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white"
                >
                  <option value="REGISTERED">REGISTERED (Regular Taxable)</option>
                  <option value="UNREGISTERED">UNREGISTERED</option>
                  <option value="COMPOSITION">COMPOSITION SCHEME</option>
                  <option value="EXEMPT">EXEMPT</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Supplier Registration State</label>
                <input
                  type="text"
                  value={supplierState}
                  onChange={(e) => setSupplierState(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Default Menu Price Tax Mode</label>
                <select
                  value={priceTaxMode}
                  onChange={(e) => setPriceTaxMode(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white"
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
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-xs space-y-5">
            <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-amber-800 font-bold">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#18201c]">
                  Commercial Settlement &amp; Pricing Model
                </h3>
                <p className="text-xs text-gray-500">
                  Configure separate commission cut (%) and platform customer markup (%)
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Commercial Model</label>
                <select
                  value={commercialModel}
                  onChange={(e) => setCommercialModel(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white"
                >
                  <option value="commission">COMMISSION (Vendor pays % cut on order)</option>
                  <option value="markup">MARKUP (Platform adds % markup for customer)</option>
                  <option value="hybrid">
                    HYBRID (Both Commission cut &amp; Customer Markup apply)
                  </option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">
                  Commission Rate (%) {commercialModel === 'markup' && '(Disabled)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  disabled={commercialModel === 'markup'}
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">
                  Platform Markup Rate (%) {commercialModel === 'commission' && '(Disabled)'}
                </label>
                <input
                  type="number"
                  min={0}
                  max={50}
                  disabled={commercialModel === 'commission'}
                  value={markupRate}
                  onChange={(e) => setMarkupRate(Number(e.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-gray-300 p-3 font-bold outline-none focus:border-[#86a018] bg-white disabled:bg-gray-100 disabled:text-gray-400"
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500 bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl">
              💡 <strong>Example:</strong> Under <strong>Commission (e.g., 15%)</strong>, the vendor
              pays 15% to the platform. Under <strong>Markup (e.g., 10%)</strong>, the platform adds
              10% on top of the vendor's base menu price for customers.
            </p>
          </div>

          {/* Submit Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[#18201c] px-8 py-3.5 text-xs font-bold text-white shadow-md hover:bg-[#323d36] transition"
            >
              <Save className="size-4 text-[#d9f447]" /> Save Bank, Profile &amp; Commercial
              Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

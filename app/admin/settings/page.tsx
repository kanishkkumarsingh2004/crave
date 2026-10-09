'use client'

import ThemeSelector from '@/components/ThemeSelector'
import { useToast } from '@/lib/toast-context'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileCheck,
  Globe,
  Lock,
  Palette,
  RotateCcw,
  Save,
  ShieldCheck,
  Truck,
  Volume2,
} from 'lucide-react'
import React, { useState } from 'react'

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTabState] = useState<
    'general' | 'security' | 'notifications' | 'onboarding'
  >('general')

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedSettingsTab = localStorage.getItem('crave_admin_settings_tab')
      if (savedSettingsTab) {
        setActiveTabState(savedSettingsTab as any)
      }
    }
  }, [])

  const setActiveTab = (tab: 'general' | 'security' | 'notifications' | 'onboarding') => {
    setActiveTabState(tab)
    if (typeof window !== 'undefined') {
      localStorage.setItem('crave_admin_settings_tab', tab)
    }
  }

  // 1. General & Operations Settings
  const [appName, setAppName] = useState('crave. Food Delivery')
  const [supportEmail, setSupportEmail] = useState('support@crave.com')
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210')
  const [currency] = useState('INR (₹)')
  const [timezone] = useState('Asia/Kolkata (IST)')
  const [deliveryRadius, setDeliveryRadius] = useState<number>(8)
  const [maxPreparationTime, setMaxPreparationTime] = useState<number>(25)
  const [autoAssignDrivers, setAutoAssignDrivers] = useState<boolean>(true)

  // Maintenance Mode
  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(false)
  const [maintenanceNotice, setMaintenanceNotice] = useState<string>(
    'We are performing scheduled backend optimization. Ordering will resume shortly.'
  )

  // 2. Security & Auth Settings
  const [jwtExpiryDays, setJwtExpiryDays] = useState<number>(7)
  const [requireAdmin2FA, setRequireAdmin2FA] = useState<boolean>(true)
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState<number>(60)
  const [rateLimitPerMin, setRateLimitPerMin] = useState<number>(100)
  const [enforceStrongPassword, setEnforceStrongPassword] = useState<boolean>(true)

  // 3. Notifications & Gateways
  const [sendSmsAlerts, setSendSmsAlerts] = useState<boolean>(true)
  const [sendWhatsappAlerts, setSendWhatsappAlerts] = useState<boolean>(true)
  const [sendEmailReceipts, setSendEmailReceipts] = useState<boolean>(true)
  const [enableSoundAlerts, setEnableSoundAlerts] = useState<boolean>(true)
  const [smsProvider, setSmsProvider] = useState<string>('Twilio SMS Gateway')

  // 4. Partner Onboarding & Compliance
  const [autoApproveVendors, setAutoApproveVendors] = useState<boolean>(false)
  const [requireFssaiLicense, setRequireFssaiLicense] = useState<boolean>(true)
  const [requireDriverLicense, setRequireDriverLicense] = useState<boolean>(true)
  const [requireGstin, setRequireGstin] = useState<boolean>(true)

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSavedSuccess(true)
    toast('Admin Master Settings Saved & Applied!', 'success')
    setTimeout(() => setSavedSuccess(false), 3500)
  }

  function handleReset() {
    setAppName('crave. Food Delivery')
    setSupportEmail('support@crave.com')
    setSupportPhone('+91 98765 43210')
    setDeliveryRadius(8)
    setMaxPreparationTime(25)
    setAutoAssignDrivers(true)
    setIsMaintenanceMode(false)
    setJwtExpiryDays(7)
    setRequireAdmin2FA(true)
    setSessionTimeoutMins(60)
    setRateLimitPerMin(100)
    setEnforceStrongPassword(true)
    setSendSmsAlerts(true)
    setSendWhatsappAlerts(true)
    setSendEmailReceipts(true)
    setEnableSoundAlerts(true)
    setAutoApproveVendors(false)
    setRequireFssaiLicense(true)
    setRequireDriverLicense(true)
    setRequireGstin(true)
    toast('Settings reset to default configuration.', 'info')
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl pb-16">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e7dd] dark:border-[#27342d] pb-5 gap-4">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-widest text-[#5e8210] dark:text-[#d9f447]">
            System Administration
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c] dark:text-white">
            Admin Security &amp; Operational Controls
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76] dark:text-gray-400">
            Manage platform identity, operational thresholds, security rules, notification gateways,
            and partner compliance.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 px-4 py-2.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 shadow-sm animate-fade-in">
            <CheckCircle2 className="size-4 text-emerald-700 dark:text-emerald-400" /> Admin Master
            Settings Saved &amp; Applied!
          </div>
        )}
      </div>

      {/* Relevant Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-[#27342d] pb-2">
        {[
          { id: 'general', label: 'Platform & Operations', icon: Globe },
          { id: 'security', label: 'Security & Auth', icon: Lock },
          { id: 'notifications', label: 'Notification Gateways', icon: Bell },
          { id: 'onboarding', label: 'Partner Compliance', icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? 'bg-[#18201c] text-white dark:bg-[#d9f447] dark:text-[#121815] shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-[#18201c] dark:text-gray-300 dark:border-[#27342d] dark:hover:bg-[#202923]'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* TAB 1: PLATFORM & OPERATIONS */}
        {activeTab === 'general' && (
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b dark:border-[#27342d] pb-4">
              <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
                <Globe className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> Platform Identity
                &amp; Dispatch Thresholds
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set brand credentials, support contacts, dispatch radius, and emergency maintenance.
              </p>
            </div>

            {/* Theme & Visual Appearance Option */}
            <div className="rounded-2xl border border-purple-100 dark:border-purple-900/50 bg-purple-50/40 dark:bg-purple-950/20 p-4 space-y-3">
              <div>
                <h4 className="font-bold text-sm text-[#18201c] dark:text-white flex items-center gap-2">
                  <Palette className="size-4 text-purple-600 dark:text-purple-400" /> Application
                  Theme &amp; Visual Appearance
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Customize your admin workspace theme preference (Light, Dark, or System Sync).
                </p>
              </div>
              <ThemeSelector />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Application / Platform Name *
                </label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Customer Support Email *
                </label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Customer Helpline Phone *
                </label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Max Delivery Radius (km)
                </label>
                <input
                  type="number"
                  required
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Maximum customer order distance allowed
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Max Kitchen Prep Timeout (mins)
                </label>
                <input
                  type="number"
                  required
                  value={maxPreparationTime}
                  onChange={(e) => setMaxPreparationTime(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Target cooking &amp; packing time window
                </p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Operating Currency &amp; Timezone
                </label>
                <input
                  type="text"
                  disabled
                  value={`${currency} · ${timezone}`}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815]/50 px-3.5 py-2.5 font-bold text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Rider Auto-Dispatch Box */}
            <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 p-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Truck className="size-4 text-blue-600 dark:text-blue-400" /> Auto-Assign Nearby
                    Delivery Rider
                  </h4>
                  <p className="text-[11px] text-blue-700 dark:text-blue-400 mt-0.5">
                    Automatically match new confirmed orders with the nearest online rider.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAssignDrivers((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    autoAssignDrivers ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      autoAssignDrivers ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Maintenance Mode Card */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" /> Platform
                    Maintenance Mode
                  </h4>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    Temporarily pause new customer checkouts during system updates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMaintenanceMode((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    isMaintenanceMode ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      isMaintenanceMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {isMaintenanceMode && (
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-900/50">
                  <label className="font-bold text-amber-900 dark:text-amber-300">
                    Public Maintenance Notice Message
                  </label>
                  <textarea
                    rows={2}
                    value={maintenanceNotice}
                    onChange={(e) => setMaintenanceNotice(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-amber-300 dark:border-amber-800 bg-white dark:bg-[#121815] text-[#18201c] dark:text-white p-2.5 font-medium outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SECURITY & AUTH */}
        {activeTab === 'security' && (
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b dark:border-[#27342d] pb-4">
              <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
                <Lock className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> Security, JWT Tokens
                &amp; Access Controls
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage authentication cookie expiry, admin two-factor policies, and API rate limits.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  JWT Cookie Expiry (Days)
                </label>
                <input
                  type="number"
                  required
                  value={jwtExpiryDays}
                  onChange={(e) => setJwtExpiryDays(parseFloat(e.target.value) || 1)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Auth cookie validity duration</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Session Idle Timeout (Minutes)
                </label>
                <input
                  type="number"
                  required
                  value={sessionTimeoutMins}
                  onChange={(e) => setSessionTimeoutMins(parseFloat(e.target.value) || 5)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Auto logout on inactivity</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  API Rate Limit (Req/min/IP)
                </label>
                <input
                  type="number"
                  required
                  value={rateLimitPerMin}
                  onChange={(e) => setRateLimitPerMin(parseFloat(e.target.value) || 10)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  DDoS &amp; brute-force throttling limit
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815]/60 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Require Admin 2-Factor Authentication
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Enforce OTP verification for master admin accounts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireAdmin2FA((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireAdmin2FA ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireAdmin2FA ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815]/60 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Enforce Strong Passwords
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Require uppercase, numbers &amp; symbols
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnforceStrongPassword((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enforceStrongPassword ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      enforceStrongPassword ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATION GATEWAYS */}
        {activeTab === 'notifications' && (
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b dark:border-[#27342d] pb-4">
              <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
                <Bell className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> Customer &amp;
                Partner Notification Gateways
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Configure SMS providers, WhatsApp Business alerts, and email receipt triggers.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c] dark:text-white">
                  Active SMS Gateway Provider
                </label>
                <select
                  value={smsProvider}
                  onChange={(e) => setSmsProvider(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] dark:border-[#27342d] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447] bg-white dark:bg-[#121815] text-[#18201c] dark:text-white"
                >
                  <option value="Twilio SMS Gateway">Twilio SMS Gateway</option>
                  <option value="Fast2SMS India">Fast2SMS India</option>
                  <option value="MSG91 Gateway">MSG91 Gateway</option>
                </select>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex items-center justify-between bg-gray-50/50 dark:bg-[#121815]/60">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">SMS Gateway Alerts</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Order verification &amp; delivery OTPs
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendSmsAlerts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendSmsAlerts ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendSmsAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex items-center justify-between bg-white dark:bg-[#121815]/40">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    WhatsApp Business Alerts
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Live drop tracking updates
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendWhatsappAlerts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendWhatsappAlerts ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendWhatsappAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex items-center justify-between bg-white dark:bg-[#121815]/40">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Email Invoices &amp; Receipts
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Tax invoices on completed drops
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendEmailReceipts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendEmailReceipts ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendEmailReceipts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex items-center justify-between bg-white dark:bg-[#121815]/40">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white flex items-center gap-1">
                    <Volume2 className="size-3.5 text-[#b5de28] dark:text-[#d9f447]" /> Audio Order
                    Chimes
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    Play sound alert on new orders
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableSoundAlerts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enableSoundAlerts ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      enableSoundAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PARTNER COMPLIANCE & ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b dark:border-[#27342d] pb-4">
              <h3 className="font-bold text-base text-[#18201c] dark:text-white flex items-center gap-2">
                <FileCheck className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> Partner
                Onboarding &amp; Legal Compliance
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Set verification requirements for new kitchen vendors and delivery riders.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-xs">
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex flex-col justify-between bg-white dark:bg-[#121815]/40 gap-3">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">Auto-Approve Vendors</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Bypass manual admin verification
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoApproveVendors((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    autoApproveVendors ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      autoApproveVendors ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex flex-col justify-between bg-white dark:bg-[#121815]/40 gap-3">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Mandatory FSSAI License
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Require food safety license upload
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireFssaiLicense((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireFssaiLicense ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireFssaiLicense ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex flex-col justify-between bg-white dark:bg-[#121815]/40 gap-3">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Mandatory GSTIN Registration
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Require tax GST number for payouts
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireGstin((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireGstin ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireGstin ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] p-4 flex flex-col justify-between bg-white dark:bg-[#121815]/40 gap-3">
                <div>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    Mandatory Driver License &amp; RC
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Require driving &amp; vehicle documents
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireDriverLicense((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireDriverLicense ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireDriverLicense ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4 pt-2">
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-3.5 text-xs font-bold text-white dark:text-[#121815] shadow-lg transition hover:bg-[#323d36] dark:hover:bg-[#c6e336]"
          >
            <Save className="size-4" /> Save System &amp; Security Settings
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 dark:border-[#27342d] bg-white dark:bg-[#18201c] px-5 py-3.5 text-xs font-bold text-gray-700 dark:text-gray-300 transition hover:bg-gray-100 dark:hover:bg-[#202923]"
          >
            <RotateCcw className="size-4 text-gray-500 dark:text-gray-400" /> Reset Defaults
          </button>
        </div>
      </form>
    </div>
  )
}

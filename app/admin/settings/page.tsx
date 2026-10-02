'use client'

import React, { useState } from 'react'
import {
  ShieldCheck,
  Building2,
  DollarSign,
  Truck,
  Bell,
  Lock,
  CheckCircle2,
  Save,
  RotateCcw,
  AlertTriangle,
  Sliders,
  Smartphone,
  Globe,
  Mail,
  Phone,
  FileCheck,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  RefreshCw
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<
    'general' | 'financial' | 'delivery' | 'security' | 'notifications' | 'onboarding'
  >('general')

  // 1. General Settings
  const [appName, setAppName] = useState('Blinkbite / Crave')
  const [supportEmail, setSupportEmail] = useState('support@blinkbite.com')
  const [supportPhone, setSupportPhone] = useState('+91 98765 43210')
  const [currency, setCurrency] = useState('INR (₹)')
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST)')
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false)
  const [maintenanceNotice, setMaintenanceNotice] = useState(
    'We are updating our backend services. We will be back online in 15 minutes.'
  )

  // 2. Financial & Fee Settings
  const [platformCommission, setPlatformCommission] = useState<number>(15)
  const [handlingCharge, setHandlingCharge] = useState<number>(5)
  const [minOrderValue, setMinOrderValue] = useState<number>(99)
  const [packagingCap, setPackagingCap] = useState<number>(20)
  const [gstRate, setGstRate] = useState<number>(5)

  // 3. Logistics & Delivery
  const [deliveryRadius, setDeliveryRadius] = useState<number>(8)
  const [baseDeliveryFee, setBaseDeliveryFee] = useState<number>(30)
  const [perKmFee, setPerKmFee] = useState<number>(10)
  const [autoAssignDrivers, setAutoAssignDrivers] = useState<boolean>(true)
  const [maxPreparationTime, setMaxPreparationTime] = useState<number>(25)

  // 4. Security & Auth
  const [jwtExpiryDays, setJwtExpiryDays] = useState<number>(7)
  const [requireAdmin2FA, setRequireAdmin2FA] = useState<boolean>(true)
  const [sessionTimeoutMins, setSessionTimeoutMins] = useState<number>(60)
  const [rateLimitPerMin, setRateLimitPerMin] = useState<number>(100)
  const [enforceStrongPassword, setEnforceStrongPassword] = useState<boolean>(true)

  // 5. Notifications
  const [sendSmsAlerts, setSendSmsAlerts] = useState<boolean>(true)
  const [sendWhatsappAlerts, setSendWhatsappAlerts] = useState<boolean>(true)
  const [sendEmailReceipts, setSendEmailReceipts] = useState<boolean>(true)

  // 6. Partner Onboarding
  const [autoApproveVendors, setAutoApproveVendors] = useState<boolean>(false)
  const [requireFssaiLicense, setRequireFssaiLicense] = useState<boolean>(true)
  const [requireDriverLicense, setRequireDriverLicense] = useState<boolean>(true)

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false)

  function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3500)
  }

  function handleReset() {
    setAppName('Blinkbite / Crave')
    setSupportEmail('support@blinkbite.com')
    setSupportPhone('+91 98765 43210')
    setPlatformCommission(15)
    setHandlingCharge(5)
    setMinOrderValue(99)
    setPackagingCap(20)
    setGstRate(5)
    setDeliveryRadius(8)
    setBaseDeliveryFee(30)
    setPerKmFee(10)
    setAutoAssignDrivers(true)
    setMaxPreparationTime(25)
    setJwtExpiryDays(7)
    setRequireAdmin2FA(true)
    setSessionTimeoutMins(60)
    setIsMaintenanceMode(false)
  }

  return (
    <div className="flex flex-col gap-8 max-w-6xl pb-16">
      {/* Top Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e7dd] pb-5 gap-4">
        <div>
          <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014]">
            System Administration
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">
            Admin Security & Platform Master Settings
          </h2>
          <p className="mt-0.5 text-xs text-[#717c76]">
            Manage system-wide parameters, order fees, delivery thresholds, security rules, and onboarding policies.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2.5 text-xs font-bold text-emerald-900 border border-emerald-300 shadow-sm animate-fade-in">
            <CheckCircle2 className="size-4 text-emerald-700" /> System Settings Saved & Applied Globally!
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {[
          { id: 'general', label: 'General & Operations', icon: Globe },
          { id: 'financial', label: 'Financials & Fees', icon: DollarSign },
          { id: 'delivery', label: 'Logistics & Delivery', icon: Truck },
          { id: 'security', label: 'Security & Auth', icon: Lock },
          { id: 'notifications', label: 'Notifications', icon: Bell },
          { id: 'onboarding', label: 'Partner Onboarding', icon: FileCheck },
        ].map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition ${
                isActive
                  ? 'bg-[#18201c] text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* TAB 1: GENERAL & OPERATIONS */}
        {activeTab === 'general' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <Globe className="size-4 text-[#859d19]" /> Platform Identity & Operational Controls
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Set store names, support contacts, and emergency maintenance status.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Application / Platform Name *</label>
                <input
                  type="text"
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Customer Support Email *</label>
                <input
                  type="email"
                  required
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Customer Helpline Phone *</label>
                <input
                  type="text"
                  required
                  value={supportPhone}
                  onChange={(e) => setSupportPhone(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Operating Currency</label>
                <input
                  type="text"
                  disabled
                  value={currency}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 font-bold text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Maintenance Mode Card */}
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 mt-2 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="size-4 text-amber-600" /> Platform Maintenance Mode
                  </h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Temporarily pause new customer checkouts during system updates.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMaintenanceMode((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    isMaintenanceMode ? 'bg-amber-600' : 'bg-gray-300'
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
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <label className="font-bold text-amber-900">Public Maintenance Notice Message</label>
                  <textarea
                    rows={2}
                    value={maintenanceNotice}
                    onChange={(e) => setMaintenanceNotice(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-amber-300 bg-white p-2.5 font-medium outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: FINANCIALS & FEES */}
        {activeTab === 'financial' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <DollarSign className="size-4 text-[#859d19]" /> Global Revenue & Order Fee Parameters
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Configure commission rates, handling fees, minimum order thresholds, and GST tax percentages.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Platform Commission Fee (%)</label>
                <input
                  type="number"
                  required
                  value={platformCommission}
                  onChange={(e) => setPlatformCommission(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">% cut taken from vendor food sales</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Order Handling Charge (₹)</label>
                <input
                  type="number"
                  required
                  value={handlingCharge}
                  onChange={(e) => setHandlingCharge(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Payment & processing handling charge</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Minimum Order Value (₹)</label>
                <input
                  type="number"
                  required
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Minimum subtotal required to order</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Max Kitchen Packaging Cap (₹)</label>
                <input
                  type="number"
                  required
                  value={packagingCap}
                  onChange={(e) => setPackagingCap(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Upper cap on packaging container fee</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Food Service GST Tax Rate (%)</label>
                <input
                  type="number"
                  required
                  value={gstRate}
                  onChange={(e) => setGstRate(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Statutory GST percentage for invoices</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LOGISTICS & DELIVERY */}
        {activeTab === 'delivery' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <Truck className="size-4 text-[#859d19]" /> Delivery Fleet & Distance Limits
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Set maximum delivery radius, base fares, and driver dispatch automation settings.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Default Delivery Radius (km)</label>
                <input
                  type="number"
                  required
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Max customer distance allowed</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Base Delivery Fee (₹)</label>
                <input
                  type="number"
                  required
                  value={baseDeliveryFee}
                  onChange={(e) => setBaseDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Fixed rate for initial distance</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Per-KM Rate Beyond Base (₹/km)</label>
                <input
                  type="number"
                  required
                  value={perKmFee}
                  onChange={(e) => setPerKmFee(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Extra fare per additional km</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Max Kitchen Prep Timeout (mins)</label>
                <input
                  type="number"
                  required
                  value={maxPreparationTime}
                  onChange={(e) => setMaxPreparationTime(parseFloat(e.target.value) || 0)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Target food preparation window</p>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-blue-900">Auto-Assign Delivery Driver</h4>
                  <p className="text-[11px] text-blue-700 mt-0.5">
                    Automatically match new orders with the closest active delivery rider.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoAssignDrivers((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    autoAssignDrivers ? 'bg-blue-600' : 'bg-gray-300'
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
          </div>
        )}

        {/* TAB 4: SECURITY & AUTH */}
        {activeTab === 'security' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <Lock className="size-4 text-[#859d19]" /> Security, JWT Tokens & Access Control
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage authentication timeouts, admin two-factor policies, and rate limits.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">JWT Token Expiry (Days)</label>
                <input
                  type="number"
                  required
                  value={jwtExpiryDays}
                  onChange={(e) => setJwtExpiryDays(parseFloat(e.target.value) || 1)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Auth cookie validity period</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Session Idle Timeout (Minutes)</label>
                <input
                  type="number"
                  required
                  value={sessionTimeoutMins}
                  onChange={(e) => setSessionTimeoutMins(parseFloat(e.target.value) || 5)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">Auto logout on inactivity</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">API Rate Limit (Req/min/IP)</label>
                <input
                  type="number"
                  required
                  value={rateLimitPerMin}
                  onChange={(e) => setRateLimitPerMin(parseFloat(e.target.value) || 10)}
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018]"
                />
                <p className="mt-1 text-[10px] text-gray-400">DDoS & brute-force throttling</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#18201c]">Require Admin 2-Factor Authentication</p>
                  <p className="text-[10px] text-gray-500">Enforce OTP verification for all admin logins</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireAdmin2FA((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireAdmin2FA ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireAdmin2FA ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-[#18201c]">Enforce Strong Passwords</p>
                  <p className="text-[10px] text-gray-500">Require uppercase, numbers & symbols</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnforceStrongPassword((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enforceStrongPassword ? 'bg-emerald-600' : 'bg-gray-300'
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

        {/* TAB 5: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <Bell className="size-4 text-[#859d19]" /> Customer & Rider Automated Alerts
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Toggle SMS, WhatsApp, and Email notification gateways.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">SMS Gateway Alerts</p>
                  <p className="text-[10px] text-gray-500">Order verification OTPs</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendSmsAlerts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendSmsAlerts ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendSmsAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">WhatsApp Business Alerts</p>
                  <p className="text-[10px] text-gray-500">Live order tracking updates</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendWhatsappAlerts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendWhatsappAlerts ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendWhatsappAlerts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">Email Invoices & Receipts</p>
                  <p className="text-[10px] text-gray-500">Tax invoices on completed orders</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSendEmailReceipts((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    sendEmailReceipts ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      sendEmailReceipts ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: PARTNER ONBOARDING */}
        {activeTab === 'onboarding' && (
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm flex flex-col gap-6">
            <div className="border-b pb-4">
              <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
                <FileCheck className="size-4 text-[#859d19]" /> Kitchen Vendor & Delivery Partner Rules
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Compliance requirements and registration approval workflows.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 text-xs">
              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">Auto-Approve Vendors</p>
                  <p className="text-[10px] text-gray-500">Bypass manual admin review</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoApproveVendors((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    autoApproveVendors ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      autoApproveVendors ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">Mandatory FSSAI License</p>
                  <p className="text-[10px] text-gray-500">Require food safety certificate</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireFssaiLicense((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireFssaiLicense ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireFssaiLicense ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-2xl border border-gray-200 p-4 flex items-center justify-between bg-white">
                <div>
                  <p className="font-bold text-[#18201c]">Mandatory Driver RC & License</p>
                  <p className="text-[10px] text-gray-500">Require driving documents</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireDriverLicense((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireDriverLicense ? 'bg-emerald-600' : 'bg-gray-300'
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
            className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] px-6 py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#323d36]"
          >
            <Save className="size-4" /> Save System & Security Settings
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-3.5 text-xs font-bold text-gray-700 transition hover:bg-gray-100"
          >
            <RotateCcw className="size-4 text-gray-500" /> Reset Defaults
          </button>
        </div>
      </form>
    </div>
  )
}

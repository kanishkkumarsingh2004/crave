'use client'

import React, { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  QrCode,
  Save,
  ShieldCheck,
  Zap,
} from 'lucide-react'

export default function AdminPaymentConfigPage() {
  const [upiVpa, setUpiVpa] = useState('crave@upi')
  const [merchantName, setMerchantName] = useState('crave Food Delivery Services')
  const [mccCode, setMccCode] = useState('5812')
  const [ifscCode, setIfscCode] = useState('HDFC0001234')
  const [accountNumber, setAccountNumber] = useState('50100293849281')
  const [enableCashOnDelivery, setEnableCashOnDelivery] = useState(false)
  const [enableUpiDeepLink, setEnableUpiDeepLink] = useState(true)
  const [enableQrCode, setEnableQrCode] = useState(true)
  const [requireUtrNumber, setRequireUtrNumber] = useState(true)
  const [savedSuccess, setSavedSuccess] = useState(false)

  function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault()
    setSavedSuccess(true)
    setTimeout(() => {
      setSavedSuccess(false)
    }, 3000)
  }

  const sampleUpiLink = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(merchantName)}&mc=${mccCode}&cu=INR&tn=Order%20CRV-9021`

  return (
    <div className="flex flex-col gap-8 max-w-5xl">
      {/* Page Title Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-[#e2e7dd] pb-5">
        <div>
          <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#6a8014]">
            Payment Gateway Config
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#18201c]">UPI Receiver Payment Settings</h2>
          <p className="mt-0.5 text-xs text-[#717c76]">
            Set up the merchant UPI VPA, Payee Name, bank accounts, and checkout rules for customer transactions.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-2xl bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-900 animate-fade-in border border-emerald-300">
            <CheckCircle2 className="size-4 text-emerald-700" /> Payment Config Saved Successfully!
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-12">
        {/* Form Container */}
        <form onSubmit={handleSaveConfig} className="lg:col-span-7 flex flex-col gap-6">
          {/* Section 1: Merchant UPI Receiver Credentials */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <CreditCard className="size-4 text-[#859d19]" /> Merchant Receiver Credentials
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              These details will be embedded into customer UPI deep links and generated QR codes.
            </p>

            <div className="mt-5 flex flex-col gap-4 text-xs">
              <div>
                <label className="font-bold text-[#18201c]">Receiver UPI VPA / ID *</label>
                <input
                  type="text"
                  required
                  value={upiVpa}
                  onChange={(e) => setUpiVpa(e.target.value)}
                  placeholder="e.g. crave@upi"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 outline-none font-mono focus:border-[#86a018] focus:ring-2 focus:ring-[#d9f447]/50"
                />
                <p className="mt-1 text-[10px] text-gray-400">All customer payments will be directed to this VPA.</p>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Payee / Merchant Business Name *</label>
                <input
                  type="text"
                  required
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  placeholder="e.g. crave Food Delivery Services"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 outline-none font-medium focus:border-[#86a018]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="font-bold text-[#18201c]">Merchant Category Code (MCC)</label>
                  <input
                    type="text"
                    value={mccCode}
                    onChange={(e) => setMccCode(e.target.value)}
                    placeholder="5812"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 outline-none font-mono focus:border-[#86a018]"
                  />
                </div>
                <div>
                  <label className="font-bold text-[#18201c]">Bank IFSC Code</label>
                  <input
                    type="text"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value)}
                    placeholder="HDFC0001234"
                    className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 outline-none font-mono focus:border-[#86a018]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#18201c]">Merchant Settlement Bank Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50100293849281"
                  className="mt-1.5 w-full rounded-xl border border-[#dfe4dc] px-3.5 py-2.5 outline-none font-mono focus:border-[#86a018]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Payment Method Switches */}
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm">
            <h3 className="font-bold text-base text-[#18201c] flex items-center gap-2">
              <QrCode className="size-4 text-[#859d19]" /> Payment Gateway Rules & Methods
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Control allowed payment options for checkout.</p>

            <div className="mt-5 flex flex-col gap-4 text-xs divide-y divide-gray-100">
              {/* Cash on Delivery Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-bold text-[#18201c]">Cash on Delivery (COD)</p>
                  <p className="text-[11px] text-gray-500">Allow customers to pay cash upon order arrival.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableCashOnDelivery((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enableCashOnDelivery ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      enableCashOnDelivery ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* UPI Deep-Link Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-bold text-[#18201c]">Instant UPI Deep Link (`upi://pay`)</p>
                  <p className="text-[11px] text-gray-500">Auto-open GPay, PhonePe, Paytm, or BHIM on mobile devices.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableUpiDeepLink((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    enableUpiDeepLink ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      enableUpiDeepLink ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Mandatory UTR Entry Toggle */}
              <div className="flex items-center justify-between pt-3">
                <div>
                  <p className="font-bold text-[#18201c]">Require 12-Digit UTR / Transaction Reference</p>
                  <p className="text-[11px] text-gray-500">Mandate customers to enter reference number for admin review queue.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRequireUtrNumber((v) => !v)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    requireUtrNumber ? 'bg-emerald-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block size-4 transform rounded-full bg-white transition ${
                      requireUtrNumber ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-[#18201c] py-3.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#323d36]"
          >
            <Save className="size-4" /> Save & Apply Payment Configuration
          </button>
        </form>

        {/* Live Customer Checkout Preview Box */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="rounded-3xl border border-[#dfe4dc] bg-white p-6 shadow-sm sticky top-24">
            <span className="rounded-full bg-[#f1f6d9] px-3 py-1 text-[10px] font-bold uppercase text-[#6a8014]">
              Live Preview
            </span>
            <h4 className="mt-2 font-bold text-base text-[#18201c]">Customer Checkout View</h4>
            <p className="text-xs text-gray-500 mt-0.5">
              This preview shows how end-customers see the payment modal during checkout based on your settings.
            </p>

            {/* Simulated Checkout Box */}
            <div className="mt-5 rounded-2xl border border-gray-200 bg-[#f8f9f6] p-4 text-xs">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-[#86a018]">Secure UPI Checkout</p>
                  <p className="font-bold text-sm text-[#18201c]">Pay ₹329 for Order #CRV-9021</p>
                </div>
                <span className="grid size-8 place-items-center rounded-full bg-[#d9f447] text-[#18201c]">
                  <Zap className="size-4 fill-current" />
                </span>
              </div>

              {/* UPI VPA Display */}
              <div className="mt-4 rounded-xl bg-white p-3 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Merchant Receiver VPA</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-[#18201c]">{upiVpa}</span>
                  <span className="text-[10px] font-bold text-[#86a018] bg-[#f1f6d9] px-2 py-0.5 rounded-full">
                    Active VPA
                  </span>
                </div>
                <p className="text-[11px] text-gray-600 mt-1">{merchantName}</p>
              </div>

              {/* Instant Deep Link Button */}
              {enableUpiDeepLink && (
                <a
                  href={sampleUpiLink}
                  onClick={(e) => e.preventDefault()}
                  className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#d9f447] py-2.5 text-xs font-bold text-[#18201c] shadow-sm"
                >
                  Open Installed UPI App <ArrowRight className="size-3.5" />
                </a>
              )}

              {/* Payment Methods Info */}
              <div className="mt-3 text-[11px] text-gray-500 space-y-1">
                <p>● Payment Mode: {enableCashOnDelivery ? 'UPI & Cash on Delivery' : 'Only Digital UPI (No Cash)'}</p>
                <p>● Mandatory Reference: {requireUtrNumber ? '12-Digit UTR Required' : 'Optional'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

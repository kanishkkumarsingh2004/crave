'use client'

import React from 'react'
import { CreditCard } from 'lucide-react'
import AppleToggle from '@/components/ui/AppleToggle'

interface GatewaySettingsSectionProps {
  razorpayEnvEnabled: boolean
  razorpayEnabled: boolean
  setRazorpayEnabled: (val: boolean) => void
  razorpayRouteEnabled: boolean
  setRazorpayRouteEnabled: (val: boolean) => void
  razorpayTransferRelease: 'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL'
  setRazorpayTransferRelease: (val: 'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL') => void
  merchantName: string
  setMerchantName: (val: string) => void
  upiVpa: string
  setUpiVpa: (val: string) => void
  thankYouMessage: string
  setThankYouMessage: (val: string) => void
}

export function GatewaySettingsSection({
  razorpayEnvEnabled,
  razorpayEnabled,
  setRazorpayEnabled,
  razorpayRouteEnabled,
  setRazorpayRouteEnabled,
  razorpayTransferRelease,
  setRazorpayTransferRelease,
  merchantName,
  setMerchantName,
  upiVpa,
  setUpiVpa,
  thankYouMessage,
  setThankYouMessage,
}: GatewaySettingsSectionProps) {
  return (
    <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#222c26] bg-white dark:bg-[#131b16] p-6 sm:p-7 shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <CreditCard className="size-4" />
        </span>
        <div>
          <h2 className="font-extrabold text-base text-[#18201c] dark:text-white">
            Payment Gateway &amp; Payee Settings
          </h2>
          <p className="text-xs text-[#717f77] dark:text-[#97a59d] mt-0.5">
            Configure Razorpay gateway controls, automated route settlements, and merchant identity.
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 text-xs">
        {/* Razorpay Gateway Box */}
        <div className="rounded-2xl border border-[#dfe4dc] dark:border-[#222c26] bg-[#fbfcfb] dark:bg-[#0e1310] p-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#e8ece5] dark:border-[#1e2722]">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-[#18201c] dark:text-white">
                Razorpay Gateway Engine
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  razorpayEnvEnabled
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                }`}
              >
                {razorpayEnvEnabled ? 'LIVE TEST KEYS CONNECTED' : 'KEYS DISCONNECTED'}
              </span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151d18] border border-[#e8ece5] dark:border-[#1e2722]">
              <div>
                <span className="font-bold text-[#18201c] dark:text-white block">
                  Razorpay Checkout
                </span>
                <span className="text-[10px] text-[#717f77] dark:text-[#88968e]">
                  Enable live UPI, Cards &amp; NetBanking
                </span>
              </div>
              <AppleToggle
                checked={razorpayEnabled}
                onChange={setRazorpayEnabled}
                iconVariant="power"
                activeColor="bg-[#86a018] dark:bg-[#d9f447]"
                ariaLabel="Enable Razorpay checkout"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-[#151d18] border border-[#e8ece5] dark:border-[#1e2722]">
              <div>
                <span className="font-bold text-[#18201c] dark:text-white block">
                  Route Split Settlement
                </span>
                <span className="text-[10px] text-[#717f77] dark:text-[#88968e]">
                  Automated vendor/driver transfers
                </span>
              </div>
              <AppleToggle
                checked={razorpayRouteEnabled}
                onChange={setRazorpayRouteEnabled}
                iconVariant="shield"
                activeColor="bg-[#86a018] dark:bg-[#d9f447]"
                ariaLabel="Enable Razorpay route"
              />
            </div>
          </div>

          {/* Transfer release condition */}
          <div className="mt-4">
            <label
              htmlFor="razorpay-transfer-release"
              className="font-bold text-[#18201c] dark:text-white block mb-1.5"
            >
              Route Transfer Release Condition
            </label>
            <select
              id="razorpay-transfer-release"
              value={razorpayTransferRelease}
              onChange={(e) =>
                setRazorpayTransferRelease(e.target.value as 'DELIVERY_COMPLETE' | 'ADMIN_APPROVAL')
              }
              className="w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] px-3.5 py-2.5 font-bold text-xs text-[#18201c] dark:text-white outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            >
              <option value="DELIVERY_COMPLETE">
                On Delivery Complete — Automatically release restaurant &amp; driver splits
              </option>
              <option value="ADMIN_APPROVAL">
                Hold For Admin Approval — Hold transfers in escrow until manually confirmed
              </option>
            </select>
          </div>
        </div>

        {/* Payee Details */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="font-bold text-[#18201c] dark:text-white">Merchant Payee Name</label>
            <input
              type="text"
              required
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="crave. Food Delivery Services"
              className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>

          <div>
            <label className="font-bold text-[#18201c] dark:text-white">Platform VPA ID</label>
            <input
              type="text"
              required
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              placeholder="crave@upi"
              className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-mono font-bold outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="font-bold text-[#18201c] dark:text-white">
              Post-Payment Customer Note
            </label>
            <textarea
              rows={2}
              required
              value={thankYouMessage}
              onChange={(e) => setThankYouMessage(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#d6ddd3] dark:border-[#27342d] bg-white dark:bg-[#151d18] text-[#18201c] dark:text-white px-3.5 py-2.5 font-medium outline-none focus:border-[#86a018] dark:focus:border-[#d9f447]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

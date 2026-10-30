'use client'

import React from 'react'
import { MapPin, Phone, Store, Tag, User } from 'lucide-react'
import { ImmutablePriceSnapshot } from '@/lib/commercial-engine'

interface TaxInvoiceViewProps {
  storeName: string
  storeAddress: string
  storePhone: string
  supplierGstin: string
  fssaiLic: string
  priceSnapshot: ImmutablePriceSnapshot
  custName: string
  custPhone: string
  custEmail: string
  custAddress: string
  createdAtFormatted: string
  resolvedTaxRate: number
  finalSubtotal: number
  discountAmount: number
  couponCode?: string
  finalMarkupAmount: number
  finalPackagingFee: number
  finalDeliveryFee: number
  finalPlatformFee: number
  finalHandlingFee: number
  finalGst: number
  finalPlatformServiceGst: number
  tip: number
  finalRoundingAdjustment: number
  finalTotal: number
}

export function TaxInvoiceView({
  storeName,
  storeAddress,
  storePhone,
  supplierGstin,
  fssaiLic,
  priceSnapshot,
  custName,
  custPhone,
  custEmail,
  custAddress,
  createdAtFormatted,
  resolvedTaxRate,
  finalSubtotal,
  discountAmount,
  couponCode,
  finalMarkupAmount,
  finalPackagingFee,
  finalDeliveryFee,
  finalPlatformFee,
  finalHandlingFee,
  finalGst,
  finalPlatformServiceGst,
  tip,
  finalRoundingAdjustment,
  finalTotal,
}: TaxInvoiceViewProps) {
  return (
    <div>
      {/* Merchant & Customer Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl bg-gray-50 dark:bg-[#121815] p-4 border border-gray-100 dark:border-[#27342d] text-xs mb-4">
        {/* Merchant Supplier Details */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 flex items-center gap-1 mb-1">
            <Store className="size-3 text-gray-400 dark:text-gray-500" /> Supplier / Kitchen Partner
          </span>
          <p className="font-bold text-[#18201c] dark:text-white">{storeName}</p>
          <p className="text-[10px] text-gray-500 dark:text-gray-300 mt-0.5 leading-relaxed">
            {storeAddress}
          </p>
          <p className="text-[10px] text-gray-500 dark:text-gray-300 flex items-center gap-1 mt-1">
            <Phone className="size-3 text-gray-400 dark:text-gray-500" /> {storePhone}
          </p>
          <div className="mt-2 pt-1 border-t border-gray-200/60 dark:border-[#27342d] space-y-0.5 text-[9px] font-mono text-gray-500 dark:text-gray-400">
            <p>
              GSTIN: <strong className="text-gray-800 dark:text-gray-200">{supplierGstin}</strong> (
              {priceSnapshot.gstStatus})
            </p>
            <p>
              FSSAI Lic #: <strong className="text-gray-800 dark:text-gray-200">{fssaiLic}</strong>
            </p>
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 flex items-center gap-1 mb-1">
            <User className="size-3 text-gray-400 dark:text-gray-500" /> Billed To Customer
          </span>
          <p className="font-bold text-[#18201c] dark:text-white">{custName}</p>
          {custPhone && (
            <p className="text-[10px] text-gray-600 dark:text-gray-300 flex items-center gap-1 mt-0.5">
              <Phone className="size-3 text-gray-400 dark:text-gray-500" /> {custPhone}
            </p>
          )}
          {custEmail && <p className="text-[10px] text-gray-500 dark:text-gray-400">{custEmail}</p>}
          <p className="text-[10px] text-gray-500 dark:text-gray-300 mt-1 leading-relaxed flex items-start gap-1">
            <MapPin className="size-3 text-gray-400 dark:text-gray-500 shrink-0 mt-0.5" />{' '}
            {custAddress}
          </p>
          <div className="mt-2 pt-1 border-t border-gray-200/60 dark:border-[#27342d] text-[9px] font-mono text-gray-500 dark:text-gray-400">
            <p>
              State of Supply:{' '}
              <strong className="text-gray-800 dark:text-gray-200">
                {priceSnapshot.customerState}
              </strong>
            </p>
            <p>
              Invoice Date:{' '}
              <strong className="text-gray-800 dark:text-gray-200">{createdAtFormatted}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Itemized Order & Tax Table */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400">
            Itemized Tax Invoice Breakdown
          </p>
          <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
            {priceSnapshot.items.length} items · Price Mode: TAX INCLUSIVE ({resolvedTaxRate}% GST)
          </span>
        </div>
        <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] overflow-x-auto no-scrollbar">
          <table className="w-full text-xs text-left">
            <thead className="bg-gray-100 dark:bg-[#121815] text-[#18201c] dark:text-gray-200 font-bold text-[9px] uppercase border-b border-gray-200 dark:border-[#27342d]">
              <tr>
                <th className="p-2">Item Name &amp; HSN</th>
                <th className="p-2 text-center">Qty</th>
                <th className="p-2 text-right">Unit Price</th>
                <th className="p-2 text-right">Taxable Base</th>
                <th className="p-2 text-right">GST ({resolvedTaxRate}%)</th>
                <th className="p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#27342d] text-gray-700 dark:text-gray-300">
              {priceSnapshot.items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-[#27342d]/40">
                  <td className="p-2">
                    <p className="font-bold text-[#18201c] dark:text-white">{item.name}</p>
                    <span className="text-[9px] text-gray-400 font-mono">
                      HSN: {item.hsnSacCode}
                    </span>
                  </td>
                  <td className="p-2 text-center font-bold text-[#18201c] dark:text-white">
                    {item.quantity}
                  </td>
                  <td className="p-2 text-right">₹{item.unitPrice}</td>
                  <td className="p-2 text-right font-mono">₹{item.taxableBase}</td>
                  <td className="p-2 text-right font-mono text-emerald-700 dark:text-emerald-400">
                    ₹{item.gstAmount}
                  </td>
                  <td className="p-2 text-right font-bold text-[#18201c] dark:text-white">
                    ₹{item.grossAmount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Commercial Engine Financial Summary */}
      <div className="space-y-1.5 border-t border-dashed border-gray-200 dark:border-[#27342d] pt-3.5 text-xs text-gray-600 dark:text-gray-300 mb-5">
        <div className="flex justify-between">
          <span>Food Items Gross Subtotal</span>
          <span className="font-semibold text-[#18201c] dark:text-white">₹{finalSubtotal}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
            <span className="flex items-center gap-1">
              <Tag className="size-3" /> Discount ({couponCode || 'PROMO'})
            </span>
            <span>-₹{discountAmount}</span>
          </div>
        )}

        {finalMarkupAmount > 0 && (
          <div className="flex justify-between">
            <span>Markup</span>
            <span>₹{finalMarkupAmount}</span>
          </div>
        )}

        <div className="flex justify-between">
          <span>Kitchen Packaging Fee</span>
          <span>₹{finalPackagingFee}</span>
        </div>

        <div className="flex justify-between">
          <span>Delivery Charges</span>
          <span>₹{finalDeliveryFee}</span>
        </div>

        <div className="flex justify-between">
          <span>Platform Service &amp; Handling Charge</span>
          <span>₹{finalPlatformFee + finalHandlingFee}</span>
        </div>

        <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
          <span>
            Food GST Breakdown (
            {priceSnapshot.taxMode === 'CGST_SGST'
              ? `CGST ${resolvedTaxRate / 2}% + SGST ${resolvedTaxRate / 2}%`
              : `IGST ${resolvedTaxRate}%`}
            )
          </span>
          <span className="font-mono font-bold">₹{Number(finalGst).toFixed(2)}</span>
        </div>

        {finalPlatformServiceGst > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
            <span>Platform Service GST (18%)</span>
            <span className="font-mono font-bold">
              ₹{Number(finalPlatformServiceGst).toFixed(2)}
            </span>
          </div>
        )}

        {tip > 0 && (
          <div className="flex justify-between text-blue-700 dark:text-blue-400 font-semibold">
            <span>Rider Tip (100% passed to driver)</span>
            <span>₹{tip}</span>
          </div>
        )}

        {finalRoundingAdjustment > 0 && (
          <div className="flex justify-between text-emerald-700 dark:text-emerald-400 font-semibold text-[11px]">
            <span>Rounding Off (Ceiling)</span>
            <span>+₹{finalRoundingAdjustment.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between border-t border-gray-200 dark:border-[#27342d] pt-2 text-sm font-black text-[#18201c] dark:text-white">
          <span>Total Customer Paid</span>
          <span className="text-emerald-700 dark:text-emerald-400 text-base font-extrabold">
            ₹{finalTotal}
          </span>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useEffect, useState } from 'react'
import {
  FileText,
  Loader2,
  Printer,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  calculateOrderPriceSnapshot,
  ImmutablePriceSnapshot,
  PriceTaxMode,
} from '@/lib/commercial-engine'
import { InvoiceOrderData } from './invoice/types'
import { TaxInvoiceView } from './invoice/TaxInvoiceView'
import { CommissionInvoiceView } from './invoice/CommissionInvoiceView'

export type { InvoiceOrderData }

interface InvoiceModalProps {
  order: InvoiceOrderData | null
  onClose: () => void
  showVendorTab?: boolean
}

export default function InvoiceModal({ order, onClose, showVendorTab = false }: InvoiceModalProps) {
  const [dbData, setDbData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'tax_invoice' | 'commission_invoice'>('tax_invoice')
  const [gstRatePercent, setGstRatePercent] = useState<number | null>(null)

  useEffect(() => {
    if (!order?.id) return

    let isMounted = true
    setLoading(true)

    const cleanId = order.id.replace('#', '')
    fetch(`/api/orders?orderId=${encodeURIComponent(cleanId)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.success && json.order) {
          setDbData(json.order)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Invoice DB fetch error:', err)
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    // Fetch the live admin payment config to resolve the actual food GST rate from DB
    fetch('/api/payment-config', { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return
        if (json.success && json.config && json.config.gstRatePercent != null) {
          setGstRatePercent(Number(json.config.gstRatePercent))
        }
      })
      .catch(() => {
        // Fallback silently
      })

    return () => {
      isMounted = false
    }
  }, [order?.id])

  // Keyboard Escape listener for accessibility compliance (UIX-006)
  useEffect(() => {
    if (!order) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [order, onClose])

  if (!order) return null

  // Resolve items from DB record or passed order object
  const rawItems = dbData?.items
    ? typeof dbData.items === 'string'
      ? JSON.parse(dbData.items)
      : dbData.items
    : order.items || []

  // Extract stored billing breakdown if available
  const storedBreakdown =
    Array.isArray(rawItems) && rawItems[0]?.billing_breakdown
      ? rawItems[0].billing_breakdown
      : dbData?.billing_breakdown || null

  const itemsList = Array.isArray(rawItems)
    ? rawItems
        .filter((item: any) => item.name !== 'Order Metadata' && item.price !== 0)
        .map((item: any) => ({
          name: `${item.name || item.title || 'Food Item'}${item.variantName ? ` (${item.variantName})` : ''}`,
          quantity: Number(item.qty || item.quantity || item.count || 1),
          price: Number(item.price || item.mrp || 0),
          hsnSacCode: item.hsnSacCode || '996331',
          priceTaxMode: (item.priceTaxMode as PriceTaxMode) || 'TAX_INCLUSIVE',
          taxRate: item.taxRate != null ? Number(item.taxRate) : undefined,
        }))
    : []

  // Resolve Store & Customer Details
  const storeName =
    dbData?.restaurant?.name ||
    dbData?.restaurant_name ||
    order.restaurantName ||
    'Crave Kitchen Store'
  const storeAddress =
    dbData?.restaurant?.address ||
    order.restaurantAddress ||
    'Koramangala 5th Block, Bengaluru, Karnataka'
  const storePhone = dbData?.restaurant?.phone || '+91 80 2345 6789'
  const fssaiLic = dbData?.restaurant?.fssai_license || '11223344556677'
  const supplierGstin = dbData?.restaurant?.gstin || '29AAAAA0000A1Z5'
  const supplierState = 'Karnataka'

  const custName =
    dbData?.customer?.name || dbData?.customer_name || order.customerName || 'Valued Customer'
  const custPhone =
    dbData?.customer?.phone || dbData?.customer_phone || order.customerPhone || '+91 98765 43210'
  const custEmail = dbData?.customer?.email || 'customer@crave.com'
  const custAddress =
    dbData?.customer_address ||
    dbData?.customer?.address ||
    order.customerAddress ||
    'Indiranagar 100ft Rd, Bengaluru, Karnataka'
  const customerState = 'Karnataka'

  const couponCode = dbData?.coupon_code || order.couponCode

  const discountAmount =
    storedBreakdown?.discount_amount != null
      ? Number(storedBreakdown.discount_amount)
      : dbData?.discount_amount != null
        ? Number(dbData.discount_amount)
        : order.discountAmount != null
          ? Number(order.discountAmount)
          : 0

  const tip =
    storedBreakdown?.tip != null
      ? Number(storedBreakdown.tip)
      : dbData?.tip != null
        ? Number(dbData.tip)
        : order.tip != null
          ? Number(order.tip)
          : 0

  // Calculate Commercial Engine Immutable Price Snapshot for full tax & commission accuracy
  const priceSnapshot: ImmutablePriceSnapshot = calculateOrderPriceSnapshot({
    orderId: order.id,
    restaurantId: dbData?.restaurant_id || 'rest_01',
    restaurantName: storeName,
    supplierState,
    customerState,
    items:
      itemsList.length > 0
        ? itemsList
        : [{ name: 'Chef Special Food Order', quantity: 1, price: Number(order.subtotal || 300) }],
    tip,
    couponCode: couponCode || undefined,
    couponDiscountAmount: discountAmount,
    restaurantDiscountContributionPercent: 60,
  })

  // Resolved final financial breakdown
  const finalSubtotal = priceSnapshot.subtotal
  const finalPackagingFee = priceSnapshot.packagingFee
  const finalDeliveryFee = priceSnapshot.deliveryFee
  const finalPlatformFee = priceSnapshot.platformFee
  const finalHandlingFee = priceSnapshot.handlingFee
  const finalGst = priceSnapshot.foodGstTotal
  const finalPlatformServiceGst = priceSnapshot.platformServiceGst
  const finalMarkupAmount = priceSnapshot.markupAmount
  const finalTotal = priceSnapshot.customerPayable

  const exactUnroundedSum =
    Number(finalSubtotal || 0) -
    Number(discountAmount || 0) +
    Number(finalMarkupAmount || 0) +
    Number(finalDeliveryFee || 0) +
    Number(finalPackagingFee || 0) +
    Number(finalPlatformFee || 0) +
    Number(finalHandlingFee || 0) +
    Number(finalGst || 0) +
    Number(finalPlatformServiceGst || 0) +
    Number(tip || 0)

  const finalRoundingAdjustment = Math.max(0, Number(finalTotal || 0) - exactUnroundedSum)

  const vendorCommissionRate =
    storedBreakdown?.vendor_commission_rate ?? priceSnapshot.commissionRate
  const vendorCommissionAmount =
    storedBreakdown?.vendor_commission_amount ?? priceSnapshot.grossCommission
  const vendorNetPayout = storedBreakdown?.vendor_net_payout ?? priceSnapshot.restaurantPayableNet

  const createdAtFormatted = dbData?.created_at
    ? new Date(dbData.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : order.timestamp || new Date().toLocaleString('en-IN')

  const resolvedTaxRate = (() => {
    const itemRate = itemsList.find((i) => i.taxRate != null)?.taxRate
    if (itemRate != null) return itemRate
    const storedRate = storedBreakdown?.gst_rate_percent
    if (storedRate != null) return Number(storedRate)
    if (gstRatePercent != null) return gstRatePercent
    return 5
  })()

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invoice-modal-title"
    >
      {/* Print Styles Sheet */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: A4 portrait;
          }
          html,
          body {
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .fixed.inset-0 {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            backdrop-filter: none !important;
          }
          div[class*='max-h-'] {
            position: static !important;
            max-height: none !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-invoice-modal-content,
          #printable-invoice-modal-content * {
            visibility: visible !important;
          }
          #printable-invoice-modal-content {
            position: absolute !important;
            left: 0 !important;
            right: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 190mm !important;
            margin: 0 auto !important;
            padding-top: 15mm !important;
            padding-bottom: 15mm !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            box-sizing: border-box !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          table,
          tr,
          td,
          th {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        className="modal-content modal-content-lg"
        id="printable-invoice-modal-content"
        role="document"
      >
        {/* Top Header & Actions (hidden during print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-4 mb-4 gap-3.5 no-print">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid size-9 sm:size-10 place-items-center rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] font-black text-sm sm:text-base shadow-xs shrink-0">
              c.
            </span>
            <div className="min-w-0 flex-1">
              <h3
                id="invoice-modal-title"
                className="font-extrabold text-sm sm:text-lg text-[#18201c] dark:text-white flex items-center gap-1.5 truncate"
              >
                <FileText className="size-4 sm:size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                OFFICIAL GST TAX INVOICE
              </h3>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider font-bold truncate max-w-[140px] sm:max-w-none">
                  INV-{String(order.id).replace('#', '').toUpperCase()}
                </span>
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase shrink-0">
                  Contract {priceSnapshot.contractNumber}
                </span>
                {loading && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full shrink-0">
                    <Loader2 className="size-3 animate-spin" /> Live Sync
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center justify-end w-full sm:w-auto">
            {/* View Switcher Tabs (Only shown when showVendorTab is enabled) */}
            {showVendorTab && (
              <div className="flex items-center rounded-xl bg-gray-100 dark:bg-[#121815] p-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setActiveTab('tax_invoice')}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    activeTab === 'tax_invoice'
                      ? 'bg-white dark:bg-[#27342d] text-[#18201c] dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Customer Tax Invoice
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('commission_invoice')}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    activeTab === 'commission_invoice'
                      ? 'bg-white dark:bg-[#27342d] text-[#18201c] dark:text-white shadow-xs'
                      : 'text-gray-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  Vendor Commission Tax
                </button>
              </div>
            )}

            {/* Browser Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full border border-gray-200 dark:border-[#27342d] bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1 shadow-xs cursor-pointer shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <Printer className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Print</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="grid size-10 place-items-center rounded-full bg-gray-100 dark:bg-[#27342d] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#324239] transition cursor-pointer shrink-0 min-h-[44px] min-w-[44px] touch-manipulation"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Focus trap for modal accessibility */}
        <div
          tabIndex={0}
          className="sr-only"
          onFocus={() => document.getElementById('printable-invoice-modal-content')?.focus()}
        />

        {/* PRINTABLE CONTAINER TARGET */}
        <div id="printable-invoice-modal-content">
          {activeTab === 'tax_invoice' ? (
            <TaxInvoiceView
              storeName={storeName}
              storeAddress={storeAddress}
              storePhone={storePhone}
              supplierGstin={supplierGstin}
              fssaiLic={fssaiLic}
              priceSnapshot={priceSnapshot}
              custName={custName}
              custPhone={custPhone}
              custEmail={custEmail}
              custAddress={custAddress}
              createdAtFormatted={createdAtFormatted}
              resolvedTaxRate={resolvedTaxRate}
              finalSubtotal={finalSubtotal}
              discountAmount={discountAmount}
              couponCode={couponCode}
              finalMarkupAmount={finalMarkupAmount}
              finalPackagingFee={finalPackagingFee}
              finalDeliveryFee={finalDeliveryFee}
              finalPlatformFee={finalPlatformFee}
              finalHandlingFee={finalHandlingFee}
              finalGst={finalGst}
              finalPlatformServiceGst={finalPlatformServiceGst}
              tip={tip}
              finalRoundingAdjustment={finalRoundingAdjustment}
              finalTotal={finalTotal}
            />
          ) : (
            <CommissionInvoiceView
              storeName={storeName}
              orderId={priceSnapshot.orderId}
              finalSubtotal={finalSubtotal}
              vendorCommissionRate={vendorCommissionRate}
              vendorCommissionAmount={vendorCommissionAmount}
              vendorNetPayout={vendorNetPayout}
            />
          )}

          {/* Invoice Footer Note */}
          <div className="text-center text-[10px] text-gray-400 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-[#27342d] flex flex-col items-center gap-1 mt-4">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="size-3.5" /> Computer Generated Commercial Tax Invoice
            </span>
            <span>
              Thank you for choosing Crave! Store FSSAI Lic #: {fssaiLic} · Supplier GSTIN:{' '}
              {supplierGstin}
            </span>
            <span className="text-[9px] text-gray-500 dark:text-gray-400">
              This is a computer-generated invoice for transaction record purposes. FSSAI license
              and GSTIN displayed are as provided by the supplier. For official compliance
              verification, please refer to FSSAI and GST portals.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

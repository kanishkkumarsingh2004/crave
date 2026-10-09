'use client'

import {
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Download,
  FileText,
  Loader2,
  MapPin,
  Percent,
  Phone,
  Printer,
  ShieldCheck,
  Store,
  Tag,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  calculateOrderPriceSnapshot,
  ImmutablePriceSnapshot,
  PriceTaxMode,
} from '@/lib/commercial-engine'

export interface InvoiceOrderData {
  id: string
  restaurantName?: string
  restaurantAddress?: string
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  timestamp?: string
  items?: Array<{
    name: string
    qty?: number
    quantity?: number
    price?: number
    mrp?: number
    hsnSacCode?: string
    taxCategory?: string
    priceTaxMode?: PriceTaxMode
    taxRate?: number
  }>
  subtotal?: number
  packagingFee?: number
  deliveryFee?: number
  platformFee?: number
  handlingFee?: number
  gst?: number
  tip?: number
  discountAmount?: number
  couponCode?: string
  total?: number
  paymentMethod?: string
  utrRef?: string
  otp?: string
  status?: string
  driverName?: string
}

interface InvoiceModalProps {
  order: InvoiceOrderData | null
  onClose: () => void
  showVendorTab?: boolean
}

export default function InvoiceModal({ order, onClose, showVendorTab = false }: InvoiceModalProps) {
  const [dbData, setDbData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tax_invoice' | 'commission_invoice'>('tax_invoice')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [gstRatePercent, setGstRatePercent] = useState<number | null>(null)

  useEffect(() => {
    if (!order?.id) return

    let isMounted = true
    setLoading(true)
    setError('')

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
          setError('Could not fetch latest live DB record; displaying fallback order summary.')
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
        // Fallback silently; resolvedTaxRate will fall back to other sources
      })

    return () => {
      isMounted = false
    }
  }, [order?.id])

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
          name: item.name || item.title || 'Food Item',
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

  const driverName = dbData?.driver_name || order.driverName || 'Verified Rider Partner'
  const driverPhone = dbData?.driver_phone

  const orderStatus = dbData?.status || order.status || 'delivered'
  const paymentStatus = dbData?.payment_status || 'verified'
  const paymentMethod = dbData?.payment_method || order.paymentMethod || 'UPI Online'
  const couponCode = dbData?.coupon_code || order.couponCode
  const deliveryOtp = dbData?.delivery_otp || order.otp
  const utrRef =
    dbData?.payment_review?.utr_number ||
    dbData?.utr_number ||
    order.utrRef ||
    `UTR${String(order.id).slice(0, 8).toUpperCase()}`

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
  const finalTotal = priceSnapshot.customerPayable

  const exactUnroundedSum =
    Number(finalSubtotal || 0) -
    Number(discountAmount || 0) +
    Number(finalDeliveryFee || 0) +
    Number(finalPackagingFee || 0) +
    Number(finalPlatformFee || 0) +
    Number(finalHandlingFee || 0) +
    Number(finalGst || 0) +
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

  // Resolve the actual food GST rate applied to this order.
  // Priority: per-item taxRate → stored billing breakdown → live DB payment config → default 5%.
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

  const exportPdfInvoice = async () => {
    if (typeof window === 'undefined') return
    setDownloadingPdf(true)
    try {
      const element = document.getElementById('printable-invoice-modal-content')
      if (!element) {
        window.print()
        return
      }

      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src =
            'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load html2pdf'))
          document.head.appendChild(script)
        })
      }

      const html2pdf = (window as any).html2pdf
      if (html2pdf) {
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `Invoice_${order.id.replace('#', '')}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        }
        await html2pdf().set(opt).from(element).save()
      } else {
        window.print()
      }
    } catch (e) {
      console.warn('HTML to PDF download failed, falling back to window.print()', e)
      window.print()
    } finally {
      setDownloadingPdf(false)
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
              <h3 className="font-extrabold text-sm sm:text-lg text-[#18201c] dark:text-white flex items-center gap-1.5 truncate">
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
          {/* TAB 1: CUSTOMER GST TAX INVOICE */}
          {activeTab === 'tax_invoice' ? (
            <div>
              {/* Merchant & Customer Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl bg-gray-50 dark:bg-[#121815] p-4 border border-gray-100 dark:border-[#27342d] text-xs mb-4">
                {/* Merchant Supplier Details */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-400 flex items-center gap-1 mb-1">
                    <Store className="size-3 text-gray-400 dark:text-gray-500" /> Supplier / Kitchen
                    Partner
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
                      GSTIN:{' '}
                      <strong className="text-gray-800 dark:text-gray-200">{supplierGstin}</strong>{' '}
                      ({priceSnapshot.gstStatus})
                    </p>
                    <p>
                      FSSAI Lic #:{' '}
                      <strong className="text-gray-800 dark:text-gray-200">{fssaiLic}</strong>
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
                  {custEmail && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{custEmail}</p>
                  )}
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
                      <strong className="text-gray-800 dark:text-gray-200">
                        {createdAtFormatted}
                      </strong>
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
                    {priceSnapshot.items.length} items · Price Mode: TAX INCLUSIVE (
                    {resolvedTaxRate}% GST)
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
                  <span className="font-semibold text-[#18201c] dark:text-white">
                    ₹{finalSubtotal}
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Tag className="size-3" /> Discount ({couponCode || 'PROMO'})
                    </span>
                    <span>-₹{discountAmount}</span>
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
          ) : (
            /* TAB 2: VENDOR COMMERCIAL & COMMISSION TAX INVOICE */
            <div className="space-y-4 text-xs">
              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 dark:text-purple-300 flex items-center gap-1.5 text-xs">
                    <Building2 className="size-4 text-purple-600 dark:text-purple-400" /> Platform
                    Commission &amp; Tax Settlement
                  </span>
                  <span className="font-mono text-[10px] bg-purple-100 dark:bg-purple-900/60 text-purple-900 dark:text-purple-300 px-2.5 py-0.5 rounded-md font-bold">
                    SAC Code: 998311 (Platform Service)
                  </span>
                </div>
                <p className="text-[11px] text-purple-800 dark:text-purple-300 mt-1">
                  Official statement of platform commission fee charged to{' '}
                  <strong>{storeName}</strong> for Order #{priceSnapshot.orderId}.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-gray-50 dark:bg-[#121815] p-4 rounded-2xl border border-gray-200 dark:border-[#27342d]">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Gross Order Sales
                  </span>
                  <p className="font-extrabold text-base text-[#18201c] dark:text-white">
                    ₹{finalSubtotal}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Contract Commission Rate
                  </span>
                  <p className="font-extrabold text-base text-purple-700 dark:text-purple-400">
                    {vendorCommissionRate}% (ORDER_SUBTOTAL)
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    Platform Service Commission
                  </span>
                  <p className="font-bold text-[#18201c] dark:text-white">
                    ₹{vendorCommissionAmount}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">
                    GST on Commission (18%)
                  </span>
                  <p className="font-bold text-emerald-700 dark:text-emerald-400">
                    ₹{Math.ceil(vendorCommissionAmount * 0.18)}
                  </p>
                </div>

                <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-[#27342d] flex justify-between items-center">
                  <span className="font-bold text-[#18201c] dark:text-white">
                    Total Vendor Deduction (Commission + GST)
                  </span>
                  <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                    -₹{Math.ceil(vendorCommissionAmount * 1.18)}
                  </span>
                </div>

                <div className="col-span-2 bg-emerald-100/70 dark:bg-emerald-950/60 p-3 rounded-xl flex justify-between items-center border border-emerald-300 dark:border-emerald-800">
                  <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-200 block text-xs">
                      Net Bank Settlement Payout to Kitchen
                    </span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                      After deducting commission &amp; vendor discount share
                    </span>
                  </div>
                  <span className="font-black text-emerald-900 dark:text-emerald-300 text-lg">
                    ₹{vendorNetPayout}
                  </span>
                </div>
              </div>
            </div>
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

'use client'

import {
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
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
  }>
  subtotal?: number
  packagingFee?: number
  deliveryFee?: number
  platformFee?: number
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
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const [dbData, setDbData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'tax_invoice' | 'commission_invoice'>('tax_invoice')

  useEffect(() => {
    if (!order?.id) return

    let isMounted = true
    setLoading(true)
    setError('')

    fetch(`/api/orders?orderId=${encodeURIComponent(order.id)}`)
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

  const itemsList = Array.isArray(rawItems)
    ? rawItems.map((item: any) => ({
        name: item.name || item.title || 'Food Item',
        quantity: Number(item.qty || item.quantity || item.count || 1),
        price: Number(item.price || item.mrp || 0),
        hsnSacCode: item.hsnSacCode || '996331',
        priceTaxMode: (item.priceTaxMode as PriceTaxMode) || 'TAX_INCLUSIVE',
      }))
    : []

  // Resolve Store & Customer Details
  const storeName =
    dbData?.restaurant?.name ||
    dbData?.restaurant_name ||
    order.restaurantName ||
    'Crave Kitchen Store'
  const storeAddress =
    dbData?.restaurant?.address || order.restaurantAddress || 'Bengaluru, Karnataka, India'
  const storePhone = dbData?.restaurant?.phone || '+91 80 2345 6789'
  const fssaiLic = dbData?.restaurant?.fssai_license || '11223344556677'
  const supplierGstin = dbData?.restaurant?.gstin || '29AAAAA0000A1Z5'
  const supplierState = 'Karnataka'

  const custName =
    dbData?.customer?.name || dbData?.customer_name || order.customerName || 'Customer'
  const custPhone = dbData?.customer?.phone || dbData?.customer_phone || order.customerPhone
  const custEmail = dbData?.customer?.email
  const custAddress =
    dbData?.customer_address ||
    dbData?.customer?.address ||
    order.customerAddress ||
    'Bengaluru, Karnataka'
  const customerState = 'Karnataka'

  const driverName = dbData?.driver_name || order.driverName
  const driverPhone = dbData?.driver_phone

  const orderStatus = dbData?.status || order.status || 'delivered'
  const paymentStatus = dbData?.payment_status || 'completed'
  const paymentMethod = dbData?.payment_method || order.paymentMethod || 'UPI Online'
  const couponCode = dbData?.coupon_code || order.couponCode
  const orderType = dbData?.order_type || 'restaurant_food'
  const deliveryOtp = dbData?.delivery_otp || order.otp

  const discountAmount =
    dbData?.discount_amount != null
      ? Number(dbData.discount_amount)
      : order.discountAmount != null
        ? Number(order.discountAmount)
        : 0

  const tip = dbData?.tip != null ? Number(dbData.tip) : order.tip != null ? Number(order.tip) : 0

  // Calculate Commercial Engine Immutable Price Snapshot
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

  const createdAtFormatted = dbData?.created_at
    ? new Date(dbData.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : order.timestamp || new Date().toLocaleString('en-IN')

  const deliveredAtFormatted = dbData?.delivered_at
    ? new Date(dbData.delivered_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
      {/* Print Styles Sheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-invoice-modal,
          #printable-invoice-modal * {
            visibility: visible;
          }
          #printable-invoice-modal {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 100% !important;
            margin: 0;
            padding: 20px;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div
        id="printable-invoice-modal"
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#18201c] p-5 sm:p-7 shadow-2xl border border-gray-200 dark:border-[#27342d] text-[#18201c] dark:text-white"
      >
        {/* Top Header & Actions (hidden during print) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-100 dark:border-[#27342d] pb-4 mb-4 gap-3 no-print">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] font-black text-base shadow-sm">
              c.
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] dark:text-white flex items-center gap-1.5">
                <FileText className="size-4.5 text-emerald-600 dark:text-emerald-400" /> OFFICIAL
                GST TAX INVOICE
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono tracking-wider font-bold">
                  INV-{String(order.id).toUpperCase()}
                </span>
                <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full uppercase">
                  Contract {priceSnapshot.contractNumber}
                </span>
                {loading && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                    <Loader2 className="size-3 animate-spin" /> Live DB Sync
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* View Switcher Tabs */}
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

            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full border border-gray-200 dark:border-[#27342d] bg-emerald-50 dark:bg-emerald-950/60 px-3.5 py-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5 text-emerald-600 dark:text-emerald-400" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-gray-100 dark:bg-[#27342d] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#324239] transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* TAB 1: CUSTOMER GST TAX INVOICE */}
        {activeTab === 'tax_invoice' ? (
          <div>
            {/* Status & Payment Bar */}
            <div className="flex flex-wrap items-center justify-between bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-900 dark:text-emerald-200 gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div>
                  <span className="capitalize text-emerald-950 dark:text-emerald-100 font-black">
                    {String(orderStatus).replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block font-normal">
                    Payment: <strong className="uppercase">{paymentStatus}</strong> via{' '}
                    {paymentMethod}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-[10px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md uppercase font-black">
                  Place of Supply: {priceSnapshot.placeOfSupply} ({priceSnapshot.taxMode})
                </span>
                {deliveryOtp && (
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 block font-mono mt-0.5">
                    Delivery OTP:{' '}
                    <strong className="text-emerald-900 dark:text-emerald-300">
                      {deliveryOtp}
                    </strong>
                  </span>
                )}
              </div>
            </div>

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
                    <strong className="text-gray-800 dark:text-gray-200">{supplierGstin}</strong> (
                    {priceSnapshot.gstStatus})
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
                  {priceSnapshot.items.length} items · Price Mode: TAX INCLUSIVE (5% GST)
                </span>
              </div>
              <div className="rounded-2xl border border-gray-200 dark:border-[#27342d] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 dark:bg-[#121815] text-[#18201c] dark:text-gray-200 font-bold text-[9px] uppercase border-b border-gray-200 dark:border-[#27342d]">
                    <tr>
                      <th className="p-2">Item Name &amp; HSN</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-right">Unit Price</th>
                      <th className="p-2 text-right">Taxable Base</th>
                      <th className="p-2 text-right">GST (5%)</th>
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
                  ₹{priceSnapshot.subtotal}
                </span>
              </div>

              {priceSnapshot.grossDiscount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Tag className="size-3" /> Discount ({couponCode || 'PROMO'})
                    <span className="text-[9px] bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-700 dark:text-rose-300">
                      Rest: ₹{priceSnapshot.restaurantDiscount} | Plat: ₹
                      {priceSnapshot.platformDiscount}
                    </span>
                  </span>
                  <span>-₹{priceSnapshot.grossDiscount}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Kitchen Packaging Fee</span>
                <span>₹{priceSnapshot.packagingFee}</span>
              </div>

              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span>₹{priceSnapshot.deliveryFee}</span>
              </div>

              <div className="flex justify-between">
                <span>Platform Service &amp; Handling Charge</span>
                <span>₹{priceSnapshot.platformFee + priceSnapshot.handlingFee}</span>
              </div>

              <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                <span>
                  Food GST Breakdown (
                  {priceSnapshot.taxMode === 'CGST_SGST' ? 'CGST 2.5% + SGST 2.5%' : 'IGST 5%'})
                </span>
                <span className="font-mono font-bold">₹{priceSnapshot.foodGstTotal}</span>
              </div>

              {priceSnapshot.platformServiceGst > 0 && (
                <div className="flex justify-between text-emerald-700 dark:text-emerald-400 text-[11px]">
                  <span>Platform Service GST (18%)</span>
                  <span className="font-mono">₹{priceSnapshot.platformServiceGst}</span>
                </div>
              )}

              {priceSnapshot.tip > 0 && (
                <div className="flex justify-between text-blue-700 dark:text-blue-400 font-semibold">
                  <span>Rider Tip (100% passed to driver)</span>
                  <span>₹{priceSnapshot.tip}</span>
                </div>
              )}

              <div className="flex justify-between border-t border-gray-200 dark:border-[#27342d] pt-2 text-sm font-black text-[#18201c] dark:text-white">
                <span>Total Customer Paid</span>
                <span className="text-emerald-700 dark:text-emerald-400 text-base">
                  ₹{priceSnapshot.customerPayable}
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
                  ₹{priceSnapshot.restaurantGrossSales}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Contract Commission Rate
                </span>
                <p className="font-extrabold text-base text-purple-700 dark:text-purple-400">
                  {priceSnapshot.commissionRate}% ({priceSnapshot.commissionBasis})
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  Platform Service Commission
                </span>
                <p className="font-bold text-[#18201c] dark:text-white">
                  ₹{priceSnapshot.grossCommission}
                </p>
              </div>

              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase">
                  GST on Commission (18%)
                </span>
                <p className="font-bold text-emerald-700 dark:text-emerald-400">
                  ₹{priceSnapshot.commissionGst}
                </p>
              </div>

              <div className="col-span-2 pt-2 border-t border-gray-200 dark:border-[#27342d] flex justify-between items-center">
                <span className="font-bold text-[#18201c] dark:text-white">
                  Total Vendor Deduction (Commission + GST)
                </span>
                <span className="font-black text-rose-600 dark:text-rose-400 text-sm">
                  -₹{priceSnapshot.totalCommissionDeduction}
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
                  ₹{priceSnapshot.restaurantPayableNet}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Footer Note */}
        <div className="text-center text-[10px] text-gray-400 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-[#27342d] flex flex-col items-center gap-1">
          <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
            <ShieldCheck className="size-3.5" /> Verified Computer Generated Commercial Tax Invoice
          </span>
          <span>
            Thank you for choosing Crave! Store FSSAI Lic #: {fssaiLic} · Supplier GSTIN:{' '}
            {supplierGstin}
          </span>
        </div>
      </div>
    </div>
  )
}

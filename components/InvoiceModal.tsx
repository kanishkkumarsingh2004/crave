'use client'

import {
  Bike,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  MapPin,
  Phone,
  Printer,
  ShieldCheck,
  Store,
  Tag,
  User,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export interface InvoiceOrderData {
  id: string
  restaurantName?: string
  restaurantAddress?: string
  customerName?: string
  customerAddress?: string
  customerPhone?: string
  timestamp?: string
  items?: Array<{ name: string; qty?: number; quantity?: number; price?: number; mrp?: number }>
  subtotal?: number
  packagingFee?: number
  deliveryFee?: number
  platformFee?: number
  gst?: number
  tip?: number
  discountAmount?: number
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
        qty: Number(item.qty || item.quantity || item.count || 1),
        price: Number(item.price || item.mrp || 0),
      }))
    : []

  // Resolve calculations from DB fields or fallbacks
  const foodSubtotal =
    dbData?.subtotal != null
      ? Number(dbData.subtotal)
      : order.subtotal != null
        ? Number(order.subtotal)
        : itemsList.reduce((acc, i) => acc + i.price * i.qty, 0)

  const packagingFee =
    dbData?.packaging_fee != null
      ? Number(dbData.packaging_fee)
      : order.packagingFee != null
        ? Number(order.packagingFee)
        : 20

  const gst =
    dbData?.gst != null
      ? Number(dbData.gst)
      : order.gst != null
        ? Number(order.gst)
        : Math.round(foodSubtotal * 0.05)

  const tip = dbData?.tip != null ? Number(dbData.tip) : order.tip != null ? Number(order.tip) : 0

  const discountAmount =
    dbData?.discount_amount != null
      ? Number(dbData.discount_amount)
      : order.discountAmount != null
        ? Number(order.discountAmount)
        : 0

  const totalAmount =
    dbData?.total_amount != null
      ? Number(dbData.total_amount)
      : order.total != null
        ? Number(order.total)
        : foodSubtotal + packagingFee + gst + tip - discountAmount

  // Derived DB fields
  const storeName =
    dbData?.restaurant?.name ||
    dbData?.restaurant_name ||
    order.restaurantName ||
    'Crave Kitchen Store'
  const storeAddress =
    dbData?.restaurant?.address || order.restaurantAddress || 'Bengaluru, Karnataka, India'
  const storePhone = dbData?.restaurant?.phone
  const fssaiLic = dbData?.restaurant?.fssai_license || '11223344556677'

  const custName =
    dbData?.customer?.name || dbData?.customer_name || order.customerName || 'Customer'
  const custPhone = dbData?.customer?.phone || dbData?.customer_phone || order.customerPhone
  const custEmail = dbData?.customer?.email
  const custAddress =
    dbData?.customer_address || dbData?.customer?.address || order.customerAddress || 'Bengaluru'

  const driverName = dbData?.driver_name || order.driverName
  const driverPhone = dbData?.driver_phone

  const orderStatus = dbData?.status || order.status || 'delivered'
  const paymentStatus = dbData?.payment_status || 'completed'
  const paymentMethod = dbData?.payment_method || order.paymentMethod || 'UPI Online'
  const couponCode = dbData?.coupon_code
  const orderType = dbData?.order_type || 'restaurant_food'
  const deliveryOtp = dbData?.delivery_otp || order.otp

  const createdAtFormatted = dbData?.created_at
    ? new Date(dbData.created_at).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : order.timestamp || 'N/A'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7 shadow-2xl border border-gray-200 text-[#18201c]">
        {/* Top Header & Actions */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] font-black text-base shadow-sm">
              c.
            </span>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-[#18201c] flex items-center gap-1.5">
                <FileText className="size-4.5 text-emerald-600" /> OFFICIAL TAX INVOICE
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-gray-500 font-mono tracking-wider font-bold">
                  INV-{String(order.id).toUpperCase()}
                </span>
                {loading && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-full">
                    <Loader2 className="size-3 animate-spin" /> Fetching DB...
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="size-3.5" /> Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 transition cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* Database Status Bar */}
        <div className="flex flex-wrap items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-3 mb-4 text-xs font-bold text-emerald-900 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4.5 text-emerald-600 shrink-0" />
            <div>
              <span className="capitalize text-emerald-950 font-black">
                {String(orderStatus).replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] text-emerald-700 block font-normal">
                Payment: <strong className="uppercase">{paymentStatus}</strong> via {paymentMethod}
              </span>
            </div>
          </div>
          <div className="text-right">
            <span className="font-mono text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md uppercase font-black">
              {orderType.replace(/_/g, ' ')}
            </span>
            {deliveryOtp && (
              <span className="text-[10px] text-gray-500 block font-mono mt-0.5">
                Delivery OTP: <strong className="text-emerald-900">{deliveryOtp}</strong>
              </span>
            )}
          </div>
        </div>

        {/* Order Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-gray-500 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100 mb-4">
          <span className="flex items-center gap-1">
            <Calendar className="size-3 text-gray-400" /> Placed:{' '}
            <strong className="text-gray-800">{createdAtFormatted}</strong>
          </span>
          {deliveredAtFormatted && (
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <Clock className="size-3 text-emerald-600" /> Delivered: {deliveredAtFormatted}
            </span>
          )}
        </div>

        {/* Merchant & Customer DB Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 rounded-2xl bg-gray-50 p-4 border border-gray-100 text-xs mb-4">
          {/* Merchant Details */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 mb-1">
              <Store className="size-3 text-gray-400" /> Merchant / Store (DB)
            </span>
            <p className="font-bold text-[#18201c]">{storeName}</p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{storeAddress}</p>
            {storePhone && (
              <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-1">
                <Phone className="size-3 text-gray-400" /> {storePhone}
              </p>
            )}
            <p className="text-[9px] text-gray-400 font-mono mt-1 pt-1 border-t border-gray-200/60">
              FSSAI Lic #: {fssaiLic}
            </p>
          </div>

          {/* Customer Details */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1 mb-1">
              <User className="size-3 text-gray-400" /> Customer Billed To (DB)
            </span>
            <p className="font-bold text-[#18201c]">{custName}</p>
            {custPhone && (
              <p className="text-[10px] text-gray-600 flex items-center gap-1 mt-0.5">
                <Phone className="size-3 text-gray-400" /> {custPhone}
              </p>
            )}
            {custEmail && <p className="text-[10px] text-gray-500">{custEmail}</p>}
            <p className="text-[10px] text-gray-500 mt-1 leading-relaxed flex items-start gap-1">
              <MapPin className="size-3 text-gray-400 shrink-0 mt-0.5" /> {custAddress}
            </p>
          </div>
        </div>

        {/* Driver Partner Section (If assigned in DB) */}
        {driverName && (
          <div className="flex items-center justify-between bg-blue-50/60 border border-blue-100 rounded-xl px-3.5 py-2 mb-4 text-xs">
            <span className="flex items-center gap-1.5 text-blue-900 font-semibold">
              <Bike className="size-4 text-blue-600" /> Delivery Partner:{' '}
              <strong>{driverName}</strong>
            </span>
            {driverPhone && (
              <span className="text-[10px] text-blue-700 font-mono">{driverPhone}</span>
            )}
          </div>
        )}

        {/* Itemized Order Table */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Order Items (DB Record)
            </p>
            <span className="text-[10px] font-bold text-gray-500">{itemsList.length} items</span>
          </div>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-[#18201c] font-bold text-[10px] uppercase border-b border-gray-200">
                <tr>
                  <th className="p-2.5">Item Name</th>
                  <th className="p-2.5 text-center">Qty</th>
                  <th className="p-2.5 text-right">Unit Price</th>
                  <th className="p-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {itemsList.length > 0 ? (
                  itemsList.map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-2.5 font-medium text-[#18201c]">{item.name}</td>
                      <td className="p-2.5 text-center font-bold">{item.qty}</td>
                      <td className="p-2.5 text-right">₹{item.price}</td>
                      <td className="p-2.5 text-right font-bold text-[#18201c]">
                        ₹{item.price * item.qty}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-3 text-center text-gray-400 italic">
                      Food &amp; Kitchen Items Order
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DB Financial Summary & Taxes */}
        <div className="space-y-1.5 border-t border-dashed border-gray-200 pt-3.5 text-xs text-gray-600 mb-5">
          <div className="flex justify-between">
            <span>Item Subtotal</span>
            <span className="font-semibold text-[#18201c]">₹{foodSubtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Packaging &amp; Handling Charges</span>
            <span>₹{packagingFee}</span>
          </div>
          <div className="flex justify-between">
            <span>GST &amp; Restaurant Taxes (5%)</span>
            <span>₹{gst}</span>
          </div>
          {tip > 0 && (
            <div className="flex justify-between text-emerald-700 font-semibold">
              <span>Rider Tip</span>
              <span>₹{tip}</span>
            </div>
          )}
          {discountAmount > 0 && (
            <div className="flex justify-between text-rose-600 font-semibold">
              <span className="flex items-center gap-1">
                <Tag className="size-3" /> Coupon Discount {couponCode ? `(${couponCode})` : ''}
              </span>
              <span>-₹{discountAmount}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-black text-[#18201c]">
            <span>Total Paid (DB)</span>
            <span className="text-emerald-700 text-base">₹{totalAmount}</span>
          </div>
        </div>

        {/* Invoice Footer Note */}
        <div className="text-center text-[10px] text-gray-400 pt-3 border-t border-gray-100 flex flex-col items-center gap-1">
          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
            <ShieldCheck className="size-3.5" /> Verified Computer Generated Tax Invoice
          </span>
          <span>Thank you for ordering with Crave! Store FSSAI Lic #: {fssaiLic}</span>
        </div>
      </div>
    </div>
  )
}

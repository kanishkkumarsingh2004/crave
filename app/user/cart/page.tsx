'use client'

import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { getLocalPaymentConfig, PaymentConfig } from '@/lib/payment-config'
import { useToast } from '@/lib/toast-context'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  CreditCard,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useState } from 'react'

interface Coupon {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'flat'
  discountValue: number
  minOrderAmount: number
}

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { items: cart, removeItem, updateItemQty, clearCart, totalCount } = useCart()
  const { toast } = useToast()
  const router = useRouter()

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [showCouponsModal, setShowCouponsModal] = useState(false)
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Order & Payment State
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.address || 'Kanakapura Road, Central Hub, Bengaluru'
  )
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98765 43210')
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'cod' | 'card'>('upi')
  const [utrRef, setUtrRef] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Sync user defaults when profile finishes loading
  useEffect(() => {
    if (user?.address) setDeliveryAddress(user.address)
    if (user?.phone) setCustomerPhone(user.phone)
  }, [user])

  // Fetch payment config & coupons
  useEffect(() => {
    async function loadConfigAndCoupons() {
      try {
        const configRes = await fetch('/api/payment-config', { cache: 'no-store' })
        const configJson = await configRes.json()
        if (configJson.success && configJson.config) {
          setPaymentConfig(configJson.config)
        } else {
          setPaymentConfig(getLocalPaymentConfig())
        }

        const couponsRes = await fetch('/api/admin/coupons', { cache: 'no-store' })
        const couponsJson = await couponsRes.json()
        if (couponsJson.success && Array.isArray(couponsJson.coupons) && couponsJson.coupons.length > 0) {
          setAvailableCoupons(
            couponsJson.coupons.map((c: any) => ({
              id: c.id,
              code: c.code,
              description: c.description || '',
              discountType: c.discount_type === 'percentage' ? 'percentage' : 'flat',
              discountValue: Number(c.discount_value || 0),
              minOrderAmount: Number(c.min_order_amount || 0),
            }))
          )
        } else {
          setAvailableCoupons([])
        }
      } catch (e) {
        setPaymentConfig(getLocalPaymentConfig())
        setAvailableCoupons([])
      }
    }

    loadConfigAndCoupons()
  }, [])

  // Calculate Subtotal & Fees
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const activeConfig = paymentConfig || getLocalPaymentConfig()
  const packagingFee = cart.length > 0 ? activeConfig.packagingCap || 15 : 0
  const freeThreshold = activeConfig.freeDeliveryThreshold || 500
  const deliveryFee = cartSubtotal >= freeThreshold || cartSubtotal === 0 ? 0 : activeConfig.baseDeliveryFee || 30

  // Recalculate coupon discount whenever subtotal or coupon changes
  useEffect(() => {
    if (appliedCoupon) {
      if (cartSubtotal < appliedCoupon.minOrderAmount) {
        setAppliedCoupon(null)
        setCouponDiscount(0)
        setCouponMessage({
          text: `Coupon removed. Minimum order for ${appliedCoupon.code} is ₹${appliedCoupon.minOrderAmount}.`,
          type: 'error',
        })
        return
      }
      let discount = 0
      if (appliedCoupon.discountType === 'percentage') {
        discount = Math.round((cartSubtotal * appliedCoupon.discountValue) / 100)
      } else {
        discount = appliedCoupon.discountValue
      }
      setCouponDiscount(Math.min(discount, cartSubtotal))
    } else {
      setCouponDiscount(0)
    }
  }, [cartSubtotal, appliedCoupon])

  const grandTotal = Math.max(0, cartSubtotal + packagingFee + deliveryFee - couponDiscount)

  const handleApplyCouponCode = (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase()
    if (!code) {
      setCouponMessage({ text: 'Please enter a valid coupon code.', type: 'error' })
      return
    }

    const found = availableCoupons.find((c) => c.code.toUpperCase() === code)
    if (!found) {
      setCouponMessage({ text: `Invalid coupon code "${code}". Try CRAVE50 or WELCOME100.`, type: 'error' })
      return
    }

    if (cartSubtotal < found.minOrderAmount) {
      setCouponMessage({
        text: `Code ${found.code} requires a minimum subtotal of ₹${found.minOrderAmount}.`,
        type: 'error',
      })
      return
    }

    setAppliedCoupon(found)
    setCouponCodeInput('')
    setCouponMessage({
      text: `Coupon "${found.code}" applied! You saved ₹${
        found.discountType === 'percentage'
          ? Math.round((cartSubtotal * found.discountValue) / 100)
          : found.discountValue
      }.`,
      type: 'success',
    })
    toast(`Coupon "${found.code}" applied successfully!`, 'success')
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponDiscount(0)
    setCouponMessage(null)
    toast('Coupon removed', 'info')
  }

  const handleCopyUpi = () => {
    const upi = activeConfig.upiVpa || 'crave@upi'
    navigator.clipboard?.writeText(upi)
    setCopiedUpi(true)
    toast(`Copied ${upi} to clipboard`, 'success')
    setTimeout(() => setCopiedUpi(false), 3000)
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cart.length === 0) {
      toast('Your cart is empty', 'error')
      return
    }

    if (!user) {
      toast('Please log in to place an order', 'error')
      router.push('/login')
      return
    }

    if (paymentMethod === 'upi' && !utrRef.trim()) {
      toast('Please enter your 12-digit UPI UTR reference number to complete payment verification', 'error')
      return
    }

    setIsSubmittingOrder(true)
    try {
      const orderPayload = {
        customer_id: user.id,
        customer_name: user.name || 'Customer',
        customer_phone: customerPhone,
        customer_address: deliveryAddress,
        restaurant_id: cart[0]?.restaurantId || cart[0]?.vendorId || 'vnd_1791063436223_iyet2',
        restaurant_name: cart[0]?.restaurantName || 'Crave Partner Kitchen',
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
        subtotal: cartSubtotal,
        packaging_fee: packagingFee,
        gst: 0,
        total_amount: grandTotal,
        payment_method: paymentMethod === 'upi' ? 'UPI Online' : paymentMethod === 'cod' ? 'Cash on Delivery' : 'Card',
        customer_vpa: user.email ? `${user.email.split('@')[0]}@upi` : 'customer@upi',
        utr_ref: utrRef || undefined,
        coupon_code: appliedCoupon?.code || undefined,
        discount_amount: couponDiscount,
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify(orderPayload),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to place order')
      }

      clearCart()
      setOrderSuccess(true)
      toast('Order placed successfully! Tracking your delivery live...', 'success')

      setTimeout(() => {
        router.push('/user/track')
      }, 2000)
    } catch (err: any) {
      toast(err?.message || 'Could not process order', 'error')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  // Strict Auth Protection: Redirect to /login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast('Please log in to access your cart', 'error')
      router.replace('/login')
    }
  }, [user, authLoading, router, toast])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f8f9f7] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-8 border-4 border-[#d9f447] border-t-[#18201c] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#18201c] uppercase tracking-wider">
            Loading your Cart...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8f9f7] text-[#18201c] flex flex-col justify-between selection:bg-[#d9f447] selection:text-[#18201c]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 flex-1">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e7dc] pb-4 gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/user/explore"
              className="grid size-9 place-items-center rounded-2xl border border-[#dfe4dc] bg-white text-[#18201c] hover:bg-[#f3f6ee] transition shadow-xs shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#849e16]">
                Secure Checkout &amp; Basket
              </span>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#18201c]">
                Your Order Cart ({totalCount} {totalCount === 1 ? 'Item' : 'Items'})
              </h1>
            </div>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition"
            >
              <Trash2 className="size-3.5" /> Clear Cart
            </button>
          )}
        </div>

        {/* Order Success Banner */}
        {orderSuccess && (
          <div className="mt-6 rounded-3xl bg-emerald-500 p-6 sm:p-8 text-white shadow-2xl text-center animate-in zoom-in-95 duration-200">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-white text-emerald-600 shadow-md">
              <Check className="size-8" />
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-black">Order Placed Successfully!</h2>
            <p className="mt-1 text-xs text-emerald-100 font-medium">
              Redirecting you to live order status tracking...
            </p>
          </div>
        )}

        {/* Main Cart Content */}
        {!orderSuccess && (
          <div className="mt-6 grid gap-6 lg:gap-8 lg:grid-cols-12 items-start">
            {/* Left Column: Cart Items & Delivery Details */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              {cart.length > 0 ? (
                <>
                  {/* Cart Items Card */}
                  <div className="rounded-3xl border border-[#dfe4dc] bg-white p-4 sm:p-6 shadow-xs">
                    <h2 className="text-sm sm:text-base font-bold text-[#18201c] mb-4 flex items-center gap-2">
                      <ShoppingBag className="size-4 text-[#849e16]" /> Items in your Order
                    </h2>

                    <div className="divide-y divide-[#f0f3eb]">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="py-3.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                className="size-12 sm:size-14 rounded-2xl object-cover shrink-0 border border-[#e5e9e1]"
                              />
                            ) : (
                              <div className="grid size-12 sm:size-14 place-items-center rounded-2xl bg-[#f4f7ed] text-[#849e16] shrink-0 font-bold text-[10px] sm:text-xs">
                                FOOD
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs sm:text-sm font-bold text-[#18201c] truncate">
                                {item.name}
                              </h3>
                              {item.restaurantName && (
                                <p className="text-[10px] sm:text-[11px] font-medium text-[#737e77] truncate">
                                  {item.restaurantName}
                                </p>
                              )}
                              <p className="text-xs font-bold text-[#849e16] mt-0.5">₹{item.price} each</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-gray-100 sm:border-t-0">
                            <div className="flex items-center gap-2 rounded-2xl bg-[#f8f9f6] border border-[#e2e7dd] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-extrabold text-[#18201c]">
                              <button
                                onClick={() => updateItemQty(item.id, -1)}
                                className="text-[#55635a] hover:text-[#18201c] transition p-1"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="min-w-[16px] text-center">{item.qty}</span>
                              <button
                                onClick={() => updateItemQty(item.id, 1)}
                                className="text-[#55635a] hover:text-[#18201c] transition p-1"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-black text-xs sm:text-sm text-[#18201c] w-14 text-right">
                                ₹{item.price * item.qty}
                              </span>

                              <button
                                onClick={() => removeItem(item.id)}
                                className="text-gray-400 hover:text-rose-600 transition p-1"
                                title="Remove Item"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Delivery Location & Address Section */}
                  <div className="rounded-3xl border border-[#dfe4dc] bg-white p-4 sm:p-6 shadow-xs">
                    <h2 className="text-sm sm:text-base font-bold text-[#18201c] mb-3 flex items-center gap-2">
                      <MapPin className="size-4 text-[#849e16]" /> Delivery Address &amp; Contact
                    </h2>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[11px] font-bold text-[#55635a] uppercase tracking-wider block mb-1">
                          Delivery Doorstep Address
                        </label>
                        <input
                          type="text"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House No, Apartment / Building, Street, Area, Bengaluru"
                          className="w-full rounded-2xl border border-[#dfe4dc] bg-[#fcfdfe] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-[#18201c] focus:border-[#849e16] focus:outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[#55635a] uppercase tracking-wider block mb-1">
                          Customer Phone Number (For Rider OTP Delivery)
                        </label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full rounded-2xl border border-[#dfe4dc] bg-[#fcfdfe] px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs font-semibold text-[#18201c] focus:border-[#849e16] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coupons & Offers Card */}
                  <div className="rounded-3xl border border-[#dfe4dc] bg-white p-4 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm sm:text-base font-bold text-[#18201c] flex items-center gap-2">
                        <Tag className="size-4 text-[#849e16]" /> Apply Promo Code / Coupon
                      </h2>
                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-rose-600 hover:text-rose-800 transition"
                        >
                          Remove Code
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCouponsModal(true)}
                          className="text-xs font-extrabold text-[#849e16] hover:text-[#5d7010] flex items-center gap-1 transition"
                        >
                          <Sparkles className="size-3.5" /> View All ({availableCoupons.length})
                        </button>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 sm:p-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <Sparkles className="size-5 text-emerald-600 fill-emerald-600 shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 font-extrabold text-[#18201c]">
                              <span className="bg-emerald-600 text-white font-mono px-2 py-0.5 rounded-md text-xs">
                                {appliedCoupon.code}
                              </span>
                              <span className="text-xs text-emerald-900">Applied</span>
                            </div>
                            <p className="text-xs text-emerald-700 mt-0.5 font-medium truncate">
                              {appliedCoupon.description || `Discount Applied`}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-emerald-800 text-xs sm:text-sm shrink-0 ml-2">
                          -₹{couponDiscount}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter coupon code (e.g. CRAVE50)"
                            value={couponCodeInput}
                            onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleApplyCouponCode()
                              }
                            }}
                            className="flex-1 rounded-2xl border border-[#dfe4dc] bg-[#fcfdfe] px-4 py-2.5 sm:py-3 text-xs font-bold text-[#18201c] uppercase placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#849e16] focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyCouponCode()}
                            className="rounded-2xl bg-[#18201c] px-6 py-2.5 sm:py-3 text-xs font-extrabold text-white hover:bg-[#323d36] transition shadow-md shrink-0"
                          >
                            Apply Code
                          </button>
                        </div>

                        {/* Popup Trigger Banner */}
                        <button
                          type="button"
                          onClick={() => setShowCouponsModal(true)}
                          className="w-full flex items-center justify-between rounded-2xl border border-dashed border-[#849e16]/60 bg-[#f7faec] p-3 sm:p-3.5 hover:bg-[#f0f7db] transition group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] shrink-0 font-bold shadow-2xs">
                              <Tag className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-[#18201c] flex items-center gap-2">
                                View &amp; Apply Available Coupons
                                <span className="bg-[#18201c] text-[#d9f447] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                                  {availableCoupons.length} Offers
                                </span>
                              </p>
                              <p className="text-[11px] font-medium text-[#55635a] truncate">
                                Tap to open popup list &amp; apply coupon with 1-click
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-[#849e16] group-hover:translate-x-1 transition shrink-0" />
                        </button>
                      </div>
                    )}

                    {couponMessage && (
                      <div
                        className={`mt-3 rounded-2xl p-3 text-xs font-semibold flex items-center gap-2 ${
                          couponMessage.type === 'success'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {couponMessage.type === 'success' ? (
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="size-4 text-rose-600 shrink-0" />
                        )}
                        <span>{couponMessage.text}</span>
                      </div>
                    )}

                    {/* Quick Suggestions Cards with individual APPLY buttons */}
                    {availableCoupons.length > 0 && !appliedCoupon && (
                      <div className="mt-4 pt-3 border-t border-[#f0f3eb]">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[11px] font-bold text-[#737e77] uppercase tracking-wider">
                            Suggested Coupons for You
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowCouponsModal(true)}
                            className="text-[11px] font-bold text-[#849e16] hover:underline"
                          >
                            View All List →
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {availableCoupons.slice(0, 2).map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-2xl border border-dashed border-[#849e16]/40 bg-[#f8faee] p-3 hover:bg-[#f2f7e4] transition"
                            >
                              <div className="pr-2 min-w-0">
                                <span className="font-mono font-black text-xs text-[#18201c] bg-[#d9f447] px-2 py-0.5 rounded">
                                  {c.code}
                                </span>
                                <p className="text-[11px] text-gray-600 mt-1 font-medium leading-tight truncate">
                                  {c.description || `Min Order ₹${c.minOrderAmount}`}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyCouponCode(c.code)}
                                className="rounded-xl bg-[#18201c] px-3 py-1.5 text-[10px] font-black text-[#d9f447] hover:bg-[#323d36] transition shrink-0"
                              >
                                APPLY
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-8 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto grid size-14 sm:size-16 place-items-center rounded-full bg-[#f4f7ed] text-[#849e16] mb-4">
                    <ShoppingCart className="size-7 sm:size-8" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#18201c]">Your Cart is Currently Empty</h2>
                  <p className="mt-2 text-xs text-[#55635a] max-w-sm mx-auto leading-relaxed">
                    Explore gourmet kitchens, pizzas, biryani, or instant 15-min groceries on Crave to get started!
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/user/explore"
                      className="w-full sm:w-auto rounded-full bg-[#18201c] px-6 py-3 text-xs font-extrabold text-white shadow-md hover:bg-[#323d36] transition text-center"
                    >
                      Explore Kitchens
                    </Link>
                    <Link
                      href="/user/cravexp"
                      className="w-full sm:w-auto rounded-full bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-[#18201c] shadow-md hover:bg-[#c2dc37] transition text-center"
                    >
                      craveXP Instamart (15 Min)
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Bill Summary & Payment Section */}
            {cart.length > 0 && (
              <div className="space-y-6 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
                {/* Bill Breakdown Card */}
                <div className="rounded-3xl border border-[#dfe4dc] bg-white p-4 sm:p-6 shadow-xl">
                  <h2 className="text-sm sm:text-base font-bold text-[#18201c] mb-4 flex items-center justify-between border-b border-[#f0f3eb] pb-3">
                    <span>Payment Summary</span>
                    <span className="text-[10px] sm:text-xs font-normal text-gray-500">Prices in INR (₹)</span>
                  </h2>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-[#55635a]">
                      <span>Items Subtotal ({totalCount} items)</span>
                      <span className="font-bold text-[#18201c]">₹{cartSubtotal}</span>
                    </div>

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between font-bold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        <span>Coupon Savings ({appliedCoupon.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#55635a]">
                      <span>Packaging &amp; Kitchen Taxes</span>
                      <span className="font-bold text-[#18201c]">₹{packagingFee}</span>
                    </div>

                    <div className="flex justify-between text-[#55635a]">
                      <span>Delivery Partner Fee</span>
                      {deliveryFee === 0 ? (
                        <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px]">
                          FREE DELIVERY
                        </span>
                      ) : (
                        <span className="font-bold text-[#18201c]">₹{deliveryFee}</span>
                      )}
                    </div>

                    <div className="flex justify-between border-t border-[#e5e9e1] pt-3 text-sm font-black text-[#18201c]">
                      <span>Final To Pay</span>
                      <span className="text-emerald-700 text-base sm:text-lg">₹{grandTotal}</span>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="mt-6 pt-4 border-t border-[#f0f3eb]">
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#55635a] block mb-2">
                      Choose Payment Method
                    </label>

                    <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`rounded-2xl p-2.5 sm:p-3 text-center border text-[11px] sm:text-xs font-bold transition flex flex-col items-center gap-1 sm:gap-1.5 ${
                          paymentMethod === 'upi'
                            ? 'bg-[#18201c] text-white border-[#18201c] shadow-md'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <QrCode className="size-4 text-[#d9f447]" />
                        <span>UPI Online</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cod')}
                        className={`rounded-2xl p-2.5 sm:p-3 text-center border text-[11px] sm:text-xs font-bold transition flex flex-col items-center gap-1 sm:gap-1.5 ${
                          paymentMethod === 'cod'
                            ? 'bg-[#18201c] text-white border-[#18201c] shadow-md'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingBag className="size-4 text-[#d9f447]" />
                        <span>Cash (COD)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`rounded-2xl p-2.5 sm:p-3 text-center border text-[11px] sm:text-xs font-bold transition flex flex-col items-center gap-1 sm:gap-1.5 ${
                          paymentMethod === 'card'
                            ? 'bg-[#18201c] text-white border-[#18201c] shadow-md'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <CreditCard className="size-4 text-[#d9f447]" />
                        <span>Cards / Net</span>
                      </button>
                    </div>
                  </div>

                  {/* UPI QR & UTR Box */}
                  {paymentMethod === 'upi' && (
                    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 sm:p-4 text-xs space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                        <span className="font-extrabold text-[#18201c]">Direct Company VPA:</span>
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white border border-emerald-300 rounded-xl px-2.5 py-1">
                          <span className="font-mono font-bold text-emerald-900 text-xs sm:text-sm">
                            {activeConfig.upiVpa || 'crave@upi'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 text-[11px] font-bold"
                            title="Copy VPA"
                          >
                            {copiedUpi ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            {copiedUpi ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="font-bold text-[#18201c] block mb-1">
                          12-Digit UTR Reference Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 123456789012"
                          value={utrRef}
                          onChange={(e) => setUtrRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-xs font-mono font-bold text-[#18201c] focus:outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit Order Button */}
                  <form onSubmit={handlePlaceOrder} className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="w-full rounded-2xl bg-[#18201c] py-3.5 sm:py-4 px-4 text-xs sm:text-sm font-extrabold text-white shadow-xl hover:bg-[#323d36] transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]"
                    >
                      {isSubmittingOrder ? (
                        <>
                          <div className="size-4 border-2 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
                          Placing Order...
                        </>
                      ) : (
                        <>
                          Confirm &amp; Place Order (₹{grandTotal})
                          <ArrowRight className="size-4 text-[#d9f447]" />
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Available Coupons & Offers Popup Modal */}
      {showCouponsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowCouponsModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-[#dfe4dc] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] text-[#849e16]">
                  <Tag className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#18201c] flex items-center gap-2">
                    Available Coupons &amp; Offers
                    <span className="bg-[#849e16] text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      {availableCoupons.length}
                    </span>
                  </h3>
                  <p className="text-xs text-[#55635a] font-medium">Select a coupon to apply instant savings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[#f4f7ed] text-[#55635a] hover:bg-[#e8ede0] hover:text-[#18201c] transition"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Coupons List (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[#55635a]">No coupons currently available.</p>
                </div>
              ) : (
                availableCoupons.map((coupon) => {
                  const isApplied = appliedCoupon?.code === coupon.code
                  const isEligible = cartSubtotal >= coupon.minOrderAmount
                  const amountNeeded = coupon.minOrderAmount - cartSubtotal

                  return (
                    <div
                      key={coupon.id}
                      className={`rounded-2xl border p-4 transition flex flex-col gap-3 ${
                        isApplied
                          ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                          : isEligible
                          ? 'border-[#dfe4dc] bg-white hover:border-[#849e16] hover:bg-[#fafce8]/60 shadow-xs'
                          : 'border-gray-200 bg-gray-50 opacity-90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-[#18201c] bg-[#d9f447] border border-[#bce022] px-2.5 py-1 rounded-xl shadow-2xs tracking-wider">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              {coupon.discountType === 'percentage'
                                ? `${coupon.discountValue}% OFF`
                                : `FLAT ₹${coupon.discountValue} OFF`}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-[#18201c] leading-snug">
                            {coupon.description || `Save ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} on your order`}
                          </p>

                          <p className="text-[11px] font-semibold text-[#737e77]">
                            Min order value: <span className="text-[#18201c] font-bold">₹{coupon.minOrderAmount}</span>
                          </p>
                        </div>

                        {/* Individual APPLY Button for each coupon */}
                        <div className="shrink-0 self-center">
                          {isApplied ? (
                            <span className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-3.5 py-2 text-xs font-black text-white shadow-xs">
                              <Check className="size-4" /> APPLIED
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                handleApplyCouponCode(coupon.code)
                                if (cartSubtotal >= coupon.minOrderAmount) {
                                  setShowCouponsModal(false)
                                }
                              }}
                              className="rounded-2xl bg-[#18201c] px-4 py-2.5 text-xs font-black text-[#d9f447] hover:bg-[#323d36] active:scale-95 transition shadow-md"
                            >
                              APPLY
                            </button>
                          )}
                        </div>
                      </div>

                      {!isEligible && !isApplied && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-semibold text-amber-800 flex items-center justify-between">
                          <span>Add ₹{amountNeeded} more to unlock this code</span>
                          <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">
                            Min ₹{coupon.minOrderAmount}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#f0f3eb] flex items-center justify-between text-xs text-[#55635a] shrink-0">
              <span className="font-medium">{availableCoupons.length} discount coupons available</span>
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="rounded-xl bg-[#f4f7ed] px-4 py-1.5 font-extrabold text-[#18201c] hover:bg-[#e2e7d8] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}

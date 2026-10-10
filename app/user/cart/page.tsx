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
  Bike,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  History,
  Home,
  MapPin,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  User,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { calculateRoadTravelDistanceKm, calculateCheckoutPricing } from '@/lib/distance-pricing'
import { useEffect, useMemo, useRef, useState } from 'react'
import { CraveButtonLoader } from '@/components/ui/ModernPreloader'

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
  const [couponMessage, setCouponMessage] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)

  // Order & Payment State
  const [deliveryAddress, setDeliveryAddress] = useState(
    user?.address || 'Kanakapura Road, Central Hub, Bengaluru'
  )
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '+91 98765 43210')
  const [paymentMethod, setPaymentMethod] = useState<'upi'>('upi')
  const [utrRef, setUtrRef] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const isSubmittingRef = useRef(false)
  const idempotencyKeyRef = useRef<string | null>(null)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Saved Addresses State
  interface SavedAddress {
    id: string
    label: string
    address: string
    is_default: boolean
  }
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [newAddressLabel, setNewAddressLabel] = useState('Home')
  const [newAddressText, setNewAddressText] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // Sync user defaults when profile finishes loading
  useEffect(() => {
    if (user?.address) setDeliveryAddress(user.address)
    if (user?.phone) setCustomerPhone(user.phone)
  }, [user])

  // Fetch Saved Addresses
  useEffect(() => {
    async function loadUserAddresses() {
      if (!user) return
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
        const res = await fetch('/api/user/addresses', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          if (Array.isArray(json.addresses) && json.addresses.length > 0) {
            setSavedAddresses(json.addresses)
            const def = json.addresses.find((a: SavedAddress) => a.is_default) || json.addresses[0]
            if (def) {
              setSelectedAddressId(def.id)
              setDeliveryAddress(def.address)
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch addresses:', e)
      }
    }

    loadUserAddresses()
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
        if (
          couponsJson.success &&
          Array.isArray(couponsJson.coupons) &&
          couponsJson.coupons.length > 0
        ) {
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

  const [calculatorApiBreakdown, setCalculatorApiBreakdown] = useState<any>(null)

  // Calculate Subtotal & Fees via Admin Config & Distance Engine
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const activeConfig = paymentConfig || getLocalPaymentConfig()

  const roadDistanceKm = useMemo(() => {
    return calculateRoadTravelDistanceKm(12.679898, 77.469493, 12.679898, 77.469493)
  }, [])

  useEffect(() => {
    if (cart.length === 0) {
      setCalculatorApiBreakdown(null)
      return
    }
    let isMounted = true
    const restId =
      cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id || undefined

    fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: cartSubtotal,
        distanceKm: roadDistanceKm,
        restaurantId: restId,
        couponCode: appliedCoupon?.code,
        couponDiscount: couponDiscount,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.breakdown?.customerBilling) {
          setCalculatorApiBreakdown(data.breakdown.customerBilling)
        }
      })
      .catch((err) => {
        console.warn('Calculator API fetch failed in cart:', err)
      })

    return () => {
      isMounted = false
    }
  }, [cartSubtotal, roadDistanceKm, cart, appliedCoupon, couponDiscount])

  const pricingBreakdown = useMemo(() => {
    const localBreakdown = calculateCheckoutPricing({
      cartSubtotal,
      roadDistanceKm,
      config: activeConfig,
      couponDiscount,
    })

    if (calculatorApiBreakdown) {
      return {
        ...localBreakdown,
        deliveryFee: calculatorApiBreakdown.deliveryFee ?? localBreakdown.deliveryFee,
        packagingFee: calculatorApiBreakdown.packagingFee ?? localBreakdown.packagingFee,
        handlingFee: calculatorApiBreakdown.handlingFee ?? localBreakdown.handlingFee,
        platformFee: calculatorApiBreakdown.platformFee ?? localBreakdown.platformFee,
        gstAmount: calculatorApiBreakdown.gstAmount ?? localBreakdown.gstAmount,
        exactGst: calculatorApiBreakdown.exactGst ?? localBreakdown.exactGst,
        roundingAdjustment:
          calculatorApiBreakdown.roundingAdjustment ?? localBreakdown.roundingAdjustment,
        grandTotal: calculatorApiBreakdown.grandTotal ?? localBreakdown.grandTotal,
      }
    }

    return localBreakdown
  }, [cartSubtotal, roadDistanceKm, activeConfig, couponDiscount, calculatorApiBreakdown])

  const deliveryFee = pricingBreakdown.deliveryFee
  const packagingFee = pricingBreakdown.packagingFee
  const handlingFee = pricingBreakdown.handlingFee
  const platformFee = pricingBreakdown.platformFee
  const grandTotal = pricingBreakdown.grandTotal

  const handleApplyCouponCode = (codeToApply?: string) => {
    const code = (codeToApply || couponCodeInput).trim().toUpperCase()
    if (!code) {
      setCouponMessage({ text: 'Please enter a valid coupon code.', type: 'error' })
      return
    }

    const found = availableCoupons.find((c) => c.code.toUpperCase() === code)
    if (!found) {
      setCouponMessage({
        text: `Invalid coupon code "${code}". Try CRAVE50 or WELCOME100.`,
        type: 'error',
      })
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

  const handleSaveNewAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAddressText.trim()) {
      toast('Please enter address details', 'error')
      return
    }

    setIsSavingAddress(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          label: newAddressLabel,
          address: newAddressText.trim(),
          latitude: 12.9716,
          longitude: 77.5946,
          is_default: savedAddresses.length === 0,
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save address')
      }

      setSavedAddresses((prev) => [json.address, ...prev])
      setSelectedAddressId(json.address.id)
      setDeliveryAddress(json.address.address)
      setNewAddressText('')
      toast(`Address "${json.address.label}" saved & selected!`, 'success')
      setShowAddressModal(false)
    } catch (err: any) {
      toast(err?.message || 'Could not save address', 'error')
    } finally {
      setIsSavingAddress(false)
    }
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
    // Immediate synchronous lock against rapid double-clicks
    if (isSubmittingRef.current || isSubmittingOrder) {
      return
    }

    if (cart.length === 0) {
      toast('Your cart is empty', 'error')
      return
    }

    if (!user) {
      toast('Please log in to place an order', 'error')
      router.push('/login')
      return
    }

    if (utrRef.trim().length < 10) {
      toast('Please enter a valid UPI UTR reference number (minimum 10 digits)', 'error')
      return
    }

    // Synchronously engage lock before async operations
    isSubmittingRef.current = true
    setIsSubmittingOrder(true)

    try {
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID()
      }
      const clientOrderId = idempotencyKeyRef.current

      const orderPayload = {
        id: clientOrderId,
        idempotency_key: clientOrderId,
        customer_id: user.id,
        customer_name: user.name || 'Customer',
        customer_phone: customerPhone,
        customer_address: deliveryAddress,
        address_id: selectedAddressId || undefined,
        restaurant_id:
          cart[0]?.restaurantId ||
          cart[0]?.vendorId ||
          (cart[0] as any)?.restaurant_id ||
          undefined,
        restaurant_name: cart[0]?.restaurantName || 'Crave Partner Kitchen',
        items: cart.map((i) => ({
          id: i.id,
          name: i.name,
          qty: i.qty,
          price: i.price,
        })),
        subtotal: cartSubtotal,
        packaging_fee: packagingFee,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        gst: pricingBreakdown.exactGst ?? pricingBreakdown.gstAmount ?? 0,
        total_amount: grandTotal,
        payment_method: 'UPI Online',
        customer_vpa: user.email ? `${user.email.split('@')[0]}@upi` : 'customer@upi',
        utr_ref: utrRef || undefined,
        coupon_code: appliedCoupon?.code || undefined,
        discount_amount: couponDiscount,
      }

      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Idempotency-Key': clientOrderId,
      }
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

      const createdOrderId = json.order?.id || json.orderId || clientOrderId
      idempotencyKeyRef.current = null
      clearCart()
      setOrderSuccess(true)
      toast('Order placed successfully! Tracking your delivery live...', 'success')

      setTimeout(() => {
        if (createdOrderId) {
          router.push(`/user/track/${createdOrderId}`)
        } else {
          router.push('/user/track')
        }
      }, 2000)
    } catch (err: any) {
      toast(err?.message || 'Could not process order', 'error')
    } finally {
      setIsSubmittingOrder(false)
      isSubmittingRef.current = false
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
    <div className="min-h-screen bg-[#f8f9f7] dark:bg-[#121815] text-[#18201c] dark:text-white flex flex-col justify-between selection:bg-[#d9f447] selection:text-[#18201c]">
      <Navbar />

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 flex-1 pb-44 sm:pb-48 lg:pb-12">
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e2e7dc] dark:border-[#27342d] pb-4 gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/user/explore"
              className="grid size-9 place-items-center rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] text-[#18201c] dark:text-white hover:bg-[#f3f6ee] dark:hover:bg-[#27342d] transition shadow-xs shrink-0"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#b5de28]">
                Secure Checkout &amp; Basket
              </span>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#18201c] dark:text-white">
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
                  <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-xs">
                    <h2 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white mb-4 flex items-center gap-2">
                      <ShoppingBag className="size-4 text-[#b5de28]" /> Items in your Order
                    </h2>

                    <div className="divide-y divide-[#f0f3eb] dark:divide-[#27342d]">
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
                                onError={(e) => {
                                  e.currentTarget.onerror = null
                                  e.currentTarget.src =
                                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                                }}
                                className="size-12 sm:size-14 rounded-2xl object-cover shrink-0 border border-[#e5e9e1] dark:border-[#27342d]"
                              />
                            ) : (
                              <div className="grid size-12 sm:size-14 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0 font-bold text-[10px] sm:text-xs">
                                FOOD
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-xs sm:text-sm font-bold text-[#18201c] dark:text-white truncate">
                                {item.name}
                              </h3>
                              {item.restaurantName && (
                                <p className="text-[10px] sm:text-[11px] font-medium text-[#737e77] dark:text-gray-400 truncate">
                                  {item.restaurantName}
                                </p>
                              )}
                              <p className="text-xs font-bold text-[#b5de28] mt-0.5">
                                ₹{item.price} each
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t border-gray-100 dark:border-[#27342d] sm:border-t-0">
                            <div className="flex items-center gap-2 rounded-2xl bg-[#f8f9f6] dark:bg-[#121815] border border-[#e2e7dd] dark:border-[#27342d] px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-extrabold text-[#18201c] dark:text-white">
                              <button
                                onClick={() => updateItemQty(item.id, -1)}
                                className="text-[#55635a] dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white transition p-1"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="min-w-[16px] text-center">{item.qty}</span>
                              <button
                                onClick={() => updateItemQty(item.id, 1)}
                                className="text-[#55635a] dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white transition p-1"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-black text-xs sm:text-sm text-[#18201c] dark:text-white w-14 text-right">
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
                  <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
                        <MapPin className="size-4 text-[#b5de28]" /> Delivery Address &amp; Contact
                      </h2>
                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="text-xs font-extrabold text-[#b5de28] hover:text-[#5d7010] flex items-center gap-1 transition"
                      >
                        <MapPin className="size-3.5" />
                        {savedAddresses.length > 0
                          ? `Change Address (${savedAddresses.length})`
                          : 'Manage Saved Addresses'}
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="label-base">Delivery Doorstep Address</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            placeholder="House No, Apartment / Building, Street, Area, Bengaluru"
                            className="input-base pr-20"
                          />
                          {selectedAddressId && (
                            <span className="absolute right-3 top-2.5 bg-[#b5de28] text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              {savedAddresses.find((a) => a.id === selectedAddressId)?.label ||
                                'Saved'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="label-base">
                          Customer Phone Number (For Rider OTP Delivery)
                        </label>
                        <input
                          type="text"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="input-base"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Coupons & Offers Card */}
                  <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white flex items-center gap-2">
                        <Tag className="size-4 text-[#b5de28]" /> Apply Promo Code / Coupon
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
                          className="text-xs font-extrabold text-[#b5de28] hover:text-[#5d7010] flex items-center gap-1 transition"
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
                            className="flex-1 rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-[#fcfdfe] dark:bg-[#121815] px-4 py-2.5 sm:py-3 text-xs font-bold text-[#18201c] dark:text-white uppercase placeholder:normal-case placeholder:font-normal placeholder:text-gray-400 focus:border-[#b5de28] focus:outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyCouponCode()}
                            className="rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-6 py-2.5 sm:py-3 text-xs font-extrabold text-white dark:text-[#18201c] hover:bg-[#323d36] dark:hover:bg-[#c8e434] transition shadow-md shrink-0"
                          >
                            Apply Code
                          </button>
                        </div>

                        {/* Popup Trigger Banner */}
                        <button
                          type="button"
                          onClick={() => setShowCouponsModal(true)}
                          className="w-full flex items-center justify-between rounded-2xl border border-dashed border-[#b5de28]/60 bg-[#f7faec] dark:bg-[#121815] p-3 sm:p-3.5 hover:bg-[#f0f7db] dark:hover:bg-[#1c2420] transition group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="grid size-9 place-items-center rounded-xl bg-[#d9f447] text-[#18201c] shrink-0 font-bold shadow-2xs">
                              <Tag className="size-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-[#18201c] dark:text-white flex items-center gap-2">
                                View &amp; Apply Available Coupons
                                <span className="bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                                  {availableCoupons.length} Offers
                                </span>
                              </p>
                              <p className="text-[11px] font-medium text-[#55635a] dark:text-gray-400 truncate">
                                Tap to open popup list &amp; apply coupon with 1-click
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="size-4 text-[#b5de28] group-hover:translate-x-1 transition shrink-0" />
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
                            className="text-[11px] font-bold text-[#b5de28] hover:underline"
                          >
                            View All List →
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {availableCoupons.slice(0, 2).map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center justify-between rounded-2xl border border-dashed border-[#b5de28]/40 bg-[#f8faee] p-3 hover:bg-[#f2f7e4] transition"
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
                <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-8 sm:p-12 text-center shadow-xs">
                  <div className="mx-auto grid size-14 sm:size-16 place-items-center rounded-full bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] mb-4">
                    <ShoppingCart className="size-7 sm:size-8" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-[#18201c] dark:text-white">
                    Your Cart is Currently Empty
                  </h2>
                  <p className="mt-2 text-xs text-[#55635a] dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
                    Explore gourmet kitchens, pizzas, biryani, or instant 15-min groceries on Crave
                    to get started!
                  </p>

                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <Link
                      href="/user/explore"
                      className="w-full sm:w-auto rounded-full bg-[#18201c] dark:bg-[#d9f447] px-6 py-3 text-xs font-extrabold text-white dark:text-[#18201c] shadow-md hover:bg-[#323d36] dark:hover:bg-[#c8e434] transition text-center"
                    >
                      Explore Kitchens
                    </Link>
                    <Link
                      href="/user/cravexp"
                      className="w-full sm:w-auto rounded-full bg-[#d9f447] dark:bg-[#27342d] px-6 py-3 text-xs font-extrabold text-[#18201c] dark:text-[#d9f447] shadow-md hover:bg-[#c8e434] dark:hover:bg-[#324239] transition text-center"
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
                <div className="rounded-3xl border border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-4 sm:p-6 shadow-xl">
                  <h2 className="text-sm sm:text-base font-bold text-[#18201c] dark:text-white mb-4 flex items-center justify-between border-b border-[#f0f3eb] dark:border-[#27342d] pb-3">
                    <span>Payment Summary</span>
                    <span className="text-[10px] sm:text-xs font-normal text-gray-500 dark:text-gray-400">
                      Prices in INR (₹)
                    </span>
                  </h2>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                      <span>Items Subtotal ({totalCount} items)</span>
                      <span className="font-bold text-[#18201c] dark:text-white">
                        ₹{cartSubtotal}
                      </span>
                    </div>

                    <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                      <span>Delivery Partner Fee</span>
                      {pricingBreakdown.isFreeDelivery ? (
                        <span className="font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px]">
                          FREE DELIVERY
                        </span>
                      ) : (
                        <span className="font-bold text-[#18201c] dark:text-white">
                          ₹{pricingBreakdown.deliveryFee}
                        </span>
                      )}
                    </div>

                    {(pricingBreakdown.surgeFee > 0 ||
                      pricingBreakdown.rainFee > 0 ||
                      pricingBreakdown.nightSurgeFee > 0) && (
                      <div className="flex justify-between text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px]">
                        <span>Demand &amp; Weather Surge</span>
                        <span className="font-bold">
                          +₹
                          {pricingBreakdown.surgeFee +
                            pricingBreakdown.rainFee +
                            pricingBreakdown.nightSurgeFee}
                        </span>
                      </div>
                    )}

                    {pricingBreakdown.packagingFee > 0 && (
                      <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                        <span>Packaging Charge</span>
                        <span className="font-bold text-[#18201c] dark:text-white">
                          ₹{pricingBreakdown.packagingFee}
                        </span>
                      </div>
                    )}

                    {pricingBreakdown.handlingFee > 0 && (
                      <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                        <span>Packaging &amp; Handling</span>
                        <span className="font-bold text-[#18201c] dark:text-white">
                          ₹{pricingBreakdown.handlingFee}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                      <span>Platform Service Fee</span>
                      <span className="font-bold text-[#18201c] dark:text-white">
                        ₹{pricingBreakdown.platformFee}
                      </span>
                    </div>

                    {(pricingBreakdown.gstAmount ?? 0) >= 0 && (
                      <div className="flex justify-between text-[#55635a] dark:text-gray-400">
                        <span>GST &amp; Taxes</span>
                        <span className="font-bold text-[#18201c] dark:text-white">
                          ₹
                          {pricingBreakdown.exactGst != null
                            ? pricingBreakdown.exactGst.toFixed(2)
                            : (pricingBreakdown.gstAmount ?? 0)}
                        </span>
                      </div>
                    )}

                    {(pricingBreakdown.roundingAdjustment ?? 0) > 0 && (
                      <div className="flex justify-between text-[#55635a] dark:text-gray-400 text-[11px]">
                        <span>Rounding Off (Ceiling)</span>
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          +₹{pricingBreakdown.roundingAdjustment.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 p-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                        <span>Coupon Savings ({appliedCoupon.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="flex justify-between border-t border-[#e5e9e1] dark:border-[#27342d] pt-3 text-sm font-black text-[#18201c] dark:text-white">
                      <span>Final To Pay</span>
                      <span className="text-emerald-700 dark:text-emerald-400 text-base sm:text-lg">
                        ₹{grandTotal}
                      </span>
                    </div>
                  </div>

                  {/* UPI Apps Redirect & Direct Payment Card */}
                  <div className="mt-6 pt-4 border-t border-[#f0f3eb] dark:border-[#27342d]">
                    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 sm:p-4 text-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/80 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white font-bold shadow-xs">
                            <QrCode className="size-5" />
                          </div>
                          <div>
                            <h3 className="font-extrabold text-[#18201c] dark:text-white text-xs sm:text-sm">
                              UPI Instant Payment
                            </h3>
                            <p className="text-[11px] text-emerald-800 dark:text-emerald-300 font-medium">
                              Pay ₹{grandTotal} using installed UPI app
                            </p>
                          </div>
                        </div>
                        <span className="font-mono font-black text-emerald-900 dark:text-[#d9f447] bg-white dark:bg-[#18201c] border border-emerald-300 dark:border-emerald-800/80 px-2.5 py-1 rounded-xl text-xs sm:text-sm shadow-2xs">
                          ₹{grandTotal}
                        </span>
                      </div>

                      {/* Direct UPI App Deep-Link Action Buttons */}
                      <div>
                        <label className="font-bold text-[#18201c] dark:text-white flex items-center gap-1.5 mb-2 text-[11px] uppercase tracking-wider">
                          <Smartphone className="size-3.5 text-emerald-700 dark:text-emerald-400" />{' '}
                          Redirect &amp; Pay via Installed UPI Apps:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <a
                            href={`tez://upi/pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Order Payment crave')}`}
                            className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2.5 hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition group text-center shadow-2xs"
                          >
                            <span className="font-black text-xs text-blue-600 dark:text-blue-400 group-hover:scale-105 transition">
                              GPay
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                              Google Pay
                            </span>
                          </a>

                          <a
                            href={`phonepe://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Order Payment crave')}`}
                            className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2.5 hover:border-purple-500 dark:hover:border-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/30 transition group text-center shadow-2xs"
                          >
                            <span className="font-black text-xs text-purple-700 dark:text-purple-400 group-hover:scale-105 transition">
                              PhonePe
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                              PhonePe App
                            </span>
                          </a>

                          <a
                            href={`paytmmp://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Order Payment crave')}`}
                            className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 dark:border-[#27342d] bg-white dark:bg-[#18201c] p-2.5 hover:border-cyan-500 dark:hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition group text-center shadow-2xs"
                          >
                            <span className="font-black text-xs text-cyan-600 dark:text-cyan-400 group-hover:scale-105 transition">
                              Paytm
                            </span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                              Paytm Wallet
                            </span>
                          </a>

                          <a
                            href={`upi://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Order Payment crave')}`}
                            className="flex flex-col items-center justify-center rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-100/70 dark:bg-emerald-950/60 p-2.5 hover:bg-emerald-200/80 dark:hover:bg-emerald-900/60 transition group text-center shadow-2xs"
                          >
                            <span className="font-black text-xs text-emerald-900 dark:text-emerald-300 group-hover:scale-105 transition flex items-center gap-1">
                              Any UPI App <ExternalLink className="size-3" />
                            </span>
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                              BHIM / App Chooser
                            </span>
                          </a>
                        </div>
                      </div>

                      {/* Direct Company VPA Copy Box */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                        <span className="font-extrabold text-[#18201c] dark:text-white">
                          Direct Company VPA:
                        </span>
                        <div className="flex items-center justify-between sm:justify-start gap-1.5 bg-white dark:bg-[#18201c] border border-emerald-300 dark:border-emerald-800 rounded-xl px-2.5 py-1">
                          <span className="font-mono font-bold text-emerald-900 dark:text-emerald-300 text-xs sm:text-sm">
                            {activeConfig.upiVpa || 'crave@upi'}
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 flex items-center gap-1 text-[11px] font-bold"
                            title="Copy VPA"
                          >
                            {copiedUpi ? (
                              <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                            {copiedUpi ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                      </div>

                      {/* 12-Digit UTR Reference Input */}
                      <div>
                        <label className="label-base">
                          12-Digit UTR Reference Number <span className="text-rose-600">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 123456789012"
                          value={utrRef}
                          onChange={(e) =>
                            setUtrRef(e.target.value.replace(/\D/g, '').slice(0, 25))
                          }
                          className="input-base font-mono font-bold"
                        />
                        {utrRef.trim().length < 10 ? (
                          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold mt-1">
                            Enter minimum 10 digits to enable order confirmation (
                            {utrRef.trim().length}/10)
                          </p>
                        ) : (
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                            <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />{' '}
                            Valid UTR Reference length ({utrRef.trim().length} digits)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Order Button */}
                  <form onSubmit={handlePlaceOrder} id="checkout-action-section" className="mt-6">
                    <button
                      type="submit"
                      disabled={isSubmittingOrder || utrRef.trim().length < 10}
                      className="btn-primary btn-full btn-lg relative overflow-hidden transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingOrder ? (
                        <CraveButtonLoader
                          label="Securing & Placing Order..."
                          sublabel="Confirming payment with restaurant"
                          variant="dark"
                          size="md"
                        />
                      ) : (
                        <>
                          <span>Confirm &amp; Place Order (₹{grandTotal})</span>
                          <ArrowRight className="size-4 text-[#d9f447] dark:text-[#18201c]" />
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

      {/* Floating Sticky Mobile Checkout Pill */}
      {cart.length > 0 && !orderSuccess && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between rounded-2xl bg-[#18201c] dark:bg-[#d9f447] p-3.5 shadow-2xl border border-gray-700/60 dark:border-black/10 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#9eb3a4] dark:text-[#18201c]/80">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} &bull; Total
              </p>
              <p className="text-lg font-black text-[#d9f447] dark:text-[#18201c]">₹{grandTotal}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById('checkout-action-section')
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="btn-primary btn-sm flex items-center gap-1.5"
            >
              <span>Proceed to Pay</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Available Coupons & Offers Popup Modal */}
      {showCouponsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowCouponsModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-2xl border border-[#dfe4dc] dark:border-[#27342d] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447]">
                  <Tag className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#18201c] dark:text-white flex items-center gap-2">
                    Available Coupons &amp; Offers
                    <span className="bg-[#b5de28] text-white text-[10px] px-2 py-0.5 rounded-full font-mono font-bold">
                      {availableCoupons.length}
                    </span>
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 font-medium">
                    Select a coupon to apply instant savings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[#f4f7ed] dark:bg-[#27342d] text-[#55635a] dark:text-gray-300 hover:bg-[#e8ede0] dark:hover:bg-[#324239] hover:text-[#18201c] dark:hover:text-white transition"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Coupons List (Scrollable) */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-xs text-[#55635a] dark:text-gray-400">
                    No coupons currently available.
                  </p>
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
                          ? 'border-emerald-500 dark:border-emerald-500/80 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                          : isEligible
                            ? 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] hover:border-[#b5de28] hover:bg-[#fafce8]/60 dark:hover:bg-[#1c2420] shadow-xs'
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 opacity-90'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-xs text-[#18201c] bg-[#d9f447] border border-[#bce022] px-2.5 py-1 rounded-xl shadow-2xs tracking-wider">
                              {coupon.code}
                            </span>
                            <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
                              {coupon.discountType === 'percentage'
                                ? `${coupon.discountValue}% OFF`
                                : `FLAT ₹${coupon.discountValue} OFF`}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-[#18201c] dark:text-gray-200 leading-snug">
                            {coupon.description ||
                              `Save ${coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`} on your order`}
                          </p>

                          <p className="text-[11px] font-semibold text-[#737e77] dark:text-gray-400">
                            Min order value:{' '}
                            <span className="text-[#18201c] dark:text-white font-bold">
                              ₹{coupon.minOrderAmount}
                            </span>
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
                              className="rounded-2xl bg-[#18201c] dark:bg-[#d9f447] px-4 py-2.5 text-xs font-black text-[#d9f447] dark:text-[#18201c] hover:bg-[#323d36] dark:hover:bg-[#cbe63c] active:scale-95 transition shadow-md"
                            >
                              APPLY
                            </button>
                          )}
                        </div>
                      </div>

                      {!isEligible && !isApplied && (
                        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-3 py-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <span>Add ₹{amountNeeded} more to unlock this code</span>
                          <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/60 px-2 py-0.5 rounded-md">
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
            <div className="pt-3 border-t border-[#f0f3eb] dark:border-[#27342d] flex items-center justify-between text-xs text-[#55635a] dark:text-gray-400 shrink-0">
              <span className="font-medium">
                {availableCoupons.length} discount coupons available
              </span>
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="rounded-xl bg-[#f4f7ed] dark:bg-[#27342d] px-4 py-1.5 font-extrabold text-[#18201c] dark:text-white hover:bg-[#e2e7d8] dark:hover:bg-[#324239] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved Address Selection Modal */}
      {showAddressModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setShowAddressModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-2xl border border-[#dfe4dc] dark:border-[#27342d] max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f3eb] dark:border-[#27342d] shrink-0">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447]">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#18201c] dark:text-white">
                    Saved Delivery Addresses
                  </h3>
                  <p className="text-xs text-[#55635a] dark:text-gray-400 font-medium">
                    Select a saved doorstep address or add a new one
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="grid size-9 place-items-center rounded-full bg-[#f4f7ed] dark:bg-[#27342d] text-[#55635a] dark:text-gray-300 hover:bg-[#e8ede0] dark:hover:bg-[#324239] hover:text-[#18201c] dark:hover:text-white transition"
                aria-label="Close modal"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Saved Addresses List */}
              {savedAddresses.length > 0 && (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold text-[#737e77] dark:text-gray-400 uppercase tracking-wider">
                    Your Saved Locations ({savedAddresses.length})
                  </p>
                  <div className="grid gap-2.5">
                    {savedAddresses.map((addr) => {
                      const isSelected = deliveryAddress === addr.address
                      return (
                        <div
                          key={addr.id}
                          onClick={() => {
                            setSelectedAddressId(addr.id)
                            setDeliveryAddress(addr.address)
                            toast(`Selected address: ${addr.label}`, 'success')
                            setShowAddressModal(false)
                          }}
                          className={`rounded-2xl border p-3.5 sm:p-4 cursor-pointer transition flex items-start justify-between gap-3 ${
                            isSelected
                              ? 'border-[#b5de28] dark:border-[#d9f447] bg-[#f7faec] dark:bg-[#1f281b] ring-2 ring-[#b5de28]/30 shadow-xs'
                              : 'border-[#dfe4dc] dark:border-[#27342d] bg-white dark:bg-[#121815] hover:bg-[#fcfdfe] dark:hover:bg-[#18201c]'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="grid size-8 place-items-center rounded-xl bg-[#f4f7ed] dark:bg-[#27342d] text-[#b5de28] dark:text-[#d9f447] shrink-0 font-bold mt-0.5">
                              {addr.label === 'Home' ? (
                                <Home className="size-4" />
                              ) : addr.label === 'Work' ? (
                                <Briefcase className="size-4" />
                              ) : (
                                <Building className="size-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-xs text-[#18201c] dark:text-white">
                                  {addr.label}
                                </span>
                                {addr.is_default && (
                                  <span className="bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] text-[9px] px-2 py-0.2 rounded-full font-mono font-bold">
                                    DEFAULT
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-[#55635a] dark:text-gray-300 font-medium mt-1 leading-snug">
                                {addr.address}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            className={`rounded-xl px-3 py-1.5 text-[11px] font-black shrink-0 transition ${
                              isSelected
                                ? 'bg-[#b5de28] text-white'
                                : 'bg-[#18201c] dark:bg-[#27342d] text-white dark:text-gray-200 hover:bg-[#323d36] dark:hover:bg-[#324239]'
                            }`}
                          >
                            {isSelected ? 'SELECTED' : 'DELIVER HERE'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Add New Address Form */}
              <div className="rounded-2xl border border-[#dfe4dc] dark:border-[#27342d] bg-[#fcfdfe] dark:bg-[#121815] p-4 space-y-3 mt-4">
                <p className="text-xs font-black text-[#18201c] dark:text-white flex items-center gap-1.5">
                  <Plus className="size-4 text-[#b5de28] dark:text-[#d9f447]" /> Add a New Delivery
                  Address
                </p>

                <form onSubmit={handleSaveNewAddress} className="space-y-3">
                  <div>
                    <label className="label-base">Address Label</label>
                    <div className="flex items-center gap-2">
                      {['Home', 'Work', 'Other'].map((lbl) => (
                        <button
                          key={lbl}
                          type="button"
                          onClick={() => setNewAddressLabel(lbl)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                            newAddressLabel === lbl
                              ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#18201c] border-[#18201c] dark:border-[#d9f447]'
                              : 'bg-white dark:bg-[#1c2420] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#27342d] hover:bg-gray-100 dark:hover:bg-[#27342d]'
                          }`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="label-base">Doorstep Address Details</label>
                    <textarea
                      rows={2}
                      required
                      value={newAddressText}
                      onChange={(e) => setNewAddressText(e.target.value)}
                      placeholder="House/Flat No, Building, Road / Landmark, Area, Bengaluru"
                      className="input-base min-h-[80px] resize-y"
                    />
                  </div>

                  <button type="submit" disabled={isSavingAddress} className="btn-primary btn-full">
                    {isSavingAddress ? 'Saving Address...' : 'Save & Deliver Here'}
                  </button>
                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-[#f0f3eb] dark:border-[#27342d] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="rounded-xl bg-[#f4f7ed] dark:bg-[#27342d] px-4 py-1.5 text-xs font-extrabold text-[#18201c] dark:text-white hover:bg-[#e2e7d8] dark:hover:bg-[#324239] transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />

      {/* Mobile Customer Bottom Navigation Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121815]/95 border-t border-gray-200 dark:border-[#27342d] backdrop-blur-md lg:hidden px-2 py-1.5 shadow-lg pb-safe-nav"
      >
        <div className="flex items-center justify-around max-w-md mx-auto">
          <Link
            href="/user/explore"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition text-gray-400 dark:text-gray-500 font-bold"
          >
            <Compass className="size-5 text-gray-400 dark:text-gray-500" />
            <span className="text-[10px]">Explore</span>
          </Link>

          <Link
            href="/user/track"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition text-gray-400 dark:text-gray-500 font-bold"
          >
            <Bike className="size-5 text-gray-400 dark:text-gray-500" />
            <span className="text-[10px]">Track</span>
          </Link>

          <Link
            href="/user/orders"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition text-gray-400 dark:text-gray-500 font-bold"
          >
            <History className="size-5 text-gray-400 dark:text-gray-500" />
            <span className="text-[10px]">Orders</span>
          </Link>

          <Link
            href="/user/cart"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition relative text-[#18201c] dark:text-white font-black"
          >
            <div className="relative">
              <ShoppingCart className="size-5 text-[#b5de28] dark:text-[#d9f447]" />
              {totalCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-[#18201c] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#18201c] text-[9px] font-black px-1.5 py-0.2 rounded-full">
                  {totalCount}
                </span>
              )}
            </div>
            <span className="text-[10px]">Cart</span>
          </Link>

          <Link
            href="/user/profile"
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition text-gray-400 dark:text-gray-500 font-bold"
          >
            <User className="size-5 text-gray-400 dark:text-gray-500" />
            <span className="text-[10px]">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

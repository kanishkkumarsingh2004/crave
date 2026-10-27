'use client'

import type { AddressItem } from '@/components/AddressModal'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { CraveButtonLoader } from '@/components/ui/ModernPreloader'
import { CartSkeleton } from '@/components/ui/SkeletonLoaders'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { autoDetectAndGeocodeLocation, getCachedLocation } from '@/lib/client-location'
import { CRAVEXP_DARK_STORE_ID } from '@/lib/cravexp-grocery-catalog'
import { calculateCheckoutPricing, calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { getLocalPaymentConfig, PaymentConfig } from '@/lib/payment-config'
import { checkDeliveryServiceability } from '@/lib/serviceability'
import { useToast } from '@/lib/toast-context'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Building,
  Check,
  CheckCircle2,
  Home,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  Trash2,
  Utensils,
  X,
  Zap,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'

const AddressModal = dynamic(() => import('@/components/AddressModal'), { ssr: false })
import CartUpsellStrip from '@/components/customer/CartUpsellStrip'

interface Coupon {
  id: string
  code: string
  description: string
  discountType: 'percentage' | 'flat'
  discountValue: number
  minOrderAmount: number
}

interface SavedAddress {
  id: string
  label: string
  address: string
  is_default: boolean
  latitude?: number
  longitude?: number
}

export default function CartPage() {
  const { user, isLoading: authLoading } = useAuth()
  const { items: cart, removeItem, updateItemQty, clearCart, totalCount, addItem } = useCart()
  const { toast } = useToast()
  const router = useRouter()

  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null)
  const [availableCoupons, setAvailableCoupons] = useState<Coupon[]>([])
  const [showCouponsModal, setShowCouponsModal] = useState(false)
  const [couponCodeInput, setCouponCodeInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null)
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [couponMessage, setCouponMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!showCouponsModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCouponsModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCouponsModal])

  // Order & Address State
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const isSubmittingRef = useRef(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [isGpsDetecting, setIsGpsDetecting] = useState(false)
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const cached = getCachedLocation()
    return cached?.lat && cached?.lng ? { lat: cached.lat, lng: cached.lng } : null
  })

  const handleDetectGpsInCart = async () => {
    setIsGpsDetecting(true)
    try {
      const geocoded = await autoDetectAndGeocodeLocation()
      setDetectedCoords({ lat: geocoded.lat, lng: geocoded.lng })
      setDeliveryAddress(geocoded.formattedAddress)
      toast(`GPS Address Detected: ${geocoded.shortAddress || geocoded.formattedAddress}`, 'success')
    } catch {
      toast('Could not detect GPS location. Please allow browser location access.', 'error')
    } finally {
      setIsGpsDetecting(false)
    }
  }

  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const first = cart[0] as any
    return first?.restaurantLat != null && first?.restaurantLng != null
      ? { lat: Number(first.restaurantLat), lng: Number(first.restaurantLng) }
      : null
  })

  useEffect(() => {
    const first = cart[0] as any
    if (first?.restaurantLat != null && first?.restaurantLng != null) {
      setRestaurantCoords({ lat: Number(first.restaurantLat), lng: Number(first.restaurantLng) })
    }
    const restId = cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id
    if (!restId) return

    let isMounted = true
    fetch(`/api/restaurants?restaurantId=${encodeURIComponent(restId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return
        const r = data.restaurants?.[0] || data.restaurant
        if (r && r.latitude != null && r.longitude != null) {
          setRestaurantCoords({ lat: Number(r.latitude), lng: Number(r.longitude) })
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [cart])

  const deliveryServiceability = useMemo(() => {
    if (!detectedCoords?.lat || !detectedCoords?.lng) return null
    return checkDeliveryServiceability({
      customerLat: detectedCoords.lat,
      customerLng: detectedCoords.lng,
      restaurantLat: restaurantCoords?.lat,
      restaurantLng: restaurantCoords?.lng,
    })
  }, [detectedCoords, restaurantCoords])

  const handleAddressSelectedFromModal = (addr: AddressItem) => {
    const savedItem: SavedAddress = {
      id: addr.id,
      label: addr.label,
      address: addr.address,
      is_default: Boolean(addr.is_default),
      latitude: addr.latitude != null ? Number(addr.latitude) : undefined,
      longitude: addr.longitude != null ? Number(addr.longitude) : undefined,
    }
    setSelectedAddressId(savedItem.id)
    setDeliveryAddress(savedItem.address)
    if (savedItem.latitude != null && savedItem.longitude != null) {
      setDetectedCoords({ lat: savedItem.latitude, lng: savedItem.longitude })
    }
    setSavedAddresses((prev) => {
      const exists = prev.some((a) => a.id === savedItem.id)
      return exists ? prev.map((a) => (a.id === savedItem.id ? savedItem : a)) : [savedItem, ...prev]
    })
    if (typeof window !== 'undefined') {
      localStorage.setItem('crave_selected_address', savedItem.address)
    }
    toast(`Delivering to ${savedItem.label}!`, 'success')
  }

  // Sync user defaults when profile finishes loading
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('crave_selected_address')
      if (stored) {
        setDeliveryAddress(stored)
      } else if (user?.address) {
        setDeliveryAddress(user.address)
      }
    } else if (user?.address) {
      setDeliveryAddress(user.address)
    }
    if (user?.phone) setCustomerPhone(user.phone)
  }, [user])

  // Load Saved Addresses
  useEffect(() => {
    async function loadUserAddresses() {
      let localAddrs: SavedAddress[] = []
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem('crave_local_addresses')
          if (stored) localAddrs = JSON.parse(stored)
        } catch {}
      }

      if (!user) {
        if (localAddrs.length > 0) {
          setSavedAddresses(localAddrs)
          setSelectedAddressId(localAddrs[0].id)
          setDeliveryAddress(localAddrs[0].address)
        }
        return
      }

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
        const res = await fetch('/api/user/addresses', {
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const json = await res.json()
          const merged: SavedAddress[] = Array.isArray(json.addresses) ? json.addresses : []
          if (merged.length > 0) {
            setSavedAddresses(merged)
            const def = merged.find((a: SavedAddress) => a.is_default) || merged[0]
            if (def) {
              setSelectedAddressId(def.id)
              setDeliveryAddress(def.address)
              if (def.latitude != null && def.longitude != null) {
                setDetectedCoords({ lat: Number(def.latitude), lng: Number(def.longitude) })
              }
            }
          }
        } else if (localAddrs.length > 0) {
          setSavedAddresses(localAddrs)
          setSelectedAddressId(localAddrs[0].id)
          setDeliveryAddress(localAddrs[0].address)
        }
      } catch {
        if (localAddrs.length > 0) setSavedAddresses(localAddrs)
      }
    }

    loadUserAddresses()
  }, [user])

  // Fetch payment config & coupons
  useEffect(() => {
    async function loadConfigAndCoupons() {
      try {
        const [configRes, couponsRes] = await Promise.all([
          fetch('/api/payment-config', { cache: 'no-store' }),
          fetch('/api/admin/coupons', { cache: 'no-store' }),
        ])
        const [configJson, couponsJson] = await Promise.all([configRes.json(), couponsRes.json()])

        setPaymentConfig(configJson.success && configJson.config ? configJson.config : getLocalPaymentConfig())

        if (couponsJson.success && Array.isArray(couponsJson.coupons)) {
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
        }
      } catch {
        setPaymentConfig(getLocalPaymentConfig())
      }
    }

    loadConfigAndCoupons()

    const onConfigUpdated = (e?: any) => {
      if (e?.detail) setPaymentConfig(e.detail)
      else loadConfigAndCoupons()
    }
    window.addEventListener('crave_payment_config_updated', onConfigUpdated)
    window.addEventListener('storage', onConfigUpdated)
    return () => {
      window.removeEventListener('crave_payment_config_updated', onConfigUpdated)
      window.removeEventListener('storage', onConfigUpdated)
    }
  }, [])

  // Preload Razorpay Checkout script
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.async = true
      document.body.appendChild(script)
    }
  }, [])

  const [canonicalSnapshot, setCanonicalSnapshot] = useState<any>(null)
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  const activeConfig = paymentConfig || getLocalPaymentConfig()

  const roadDistanceKm = useMemo(() => {
    const rLat = restaurantCoords?.lat ?? null
    const rLng = restaurantCoords?.lng ?? null
    const cLat = detectedCoords?.lat ?? null
    const cLng = detectedCoords?.lng ?? null
    return calculateRoadTravelDistanceKm(rLat, rLng, cLat, cLng)
  }, [restaurantCoords, detectedCoords])

  useEffect(() => {
    if (cart.length === 0) {
      setCanonicalSnapshot(null)
      return
    }
    let isMounted = true
    const restId = cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id

    fetch('/api/calculator', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subtotal: cartSubtotal,
        distanceKm: roadDistanceKm,
        restaurantId: restId,
        couponCode: appliedCoupon?.code,
        couponDiscount,
        itemsAreCustomerPrices: true,
        items: cart.map((i) => ({
          id: i.menuItemId || i.id,
          name: i.name,
          quantity: i.qty,
          price: i.price,
        })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.canonical) {
          setCanonicalSnapshot(data.canonical)
        }
      })
      .catch((err) => {
        console.warn('Calculator API fetch failed in cart:', err)
      })

    return () => {
      isMounted = false
    }
  }, [cartSubtotal, roadDistanceKm, cart, appliedCoupon, couponDiscount, paymentConfig])

  const pricingBreakdown = useMemo(() => {
    const local = calculateCheckoutPricing({
      cartSubtotal,
      roadDistanceKm,
      config: activeConfig,
      couponDiscount,
    })

    if (canonicalSnapshot) {
      const isTaxInclusive =
        canonicalSnapshot.items?.every((it: any) => it.priceTaxMode !== 'TAX_EXCLUSIVE') ?? true
      const addedTaxPaise =
        (!isTaxInclusive ? canonicalSnapshot.restaurantServiceTaxBreakdown?.totalGstPaise || 0 : 0) +
        (canonicalSnapshot.platformServiceTaxBreakdown?.totalGstPaise || 0)
      const exactGst = Number((addedTaxPaise / 100).toFixed(2))

      return {
        ...local,
        deliveryFee: Number((canonicalSnapshot.deliveryFeePaise / 100).toFixed(2)),
        isFreeDelivery: canonicalSnapshot.deliveryFeePaise === 0 && canonicalSnapshot.grossDeliveryFeePaise > 0,
        packagingFee: Number((canonicalSnapshot.packagingFeePaise / 100).toFixed(2)),
        handlingFee: Number((canonicalSnapshot.handlingFeePaise / 100).toFixed(2)),
        platformFee: Number((canonicalSnapshot.platformFeePaise / 100).toFixed(2)),
        couponDiscount: Number((canonicalSnapshot.couponDiscountPaise / 100).toFixed(2)),
        gstAmount: exactGst,
        exactGst,
        grandTotal: Number((canonicalSnapshot.customerPayablePaise / 100).toFixed(2)),
      }
    }

    return local
  }, [cartSubtotal, roadDistanceKm, activeConfig, couponDiscount, canonicalSnapshot])

  const deliveryFee = pricingBreakdown.deliveryFee
  const packagingFee = pricingBreakdown.packagingFee
  const handlingFee = pricingBreakdown.handlingFee
  const platformFee = pricingBreakdown.platformFee
  const exactGstValue = pricingBreakdown.exactGst ?? Number((pricingBreakdown.gstAmount ?? 0).toFixed(2))

  // Exact Final Amount To Pay (Strictly NEVER recalculated on client — sourced from snapshot)
  const exactNetPayable = useMemo(() => {
    if (canonicalSnapshot?.customerPayablePaise != null) {
      return Number((canonicalSnapshot.customerPayablePaise / 100).toFixed(2))
    }
    if (pricingBreakdown.grandTotal != null && pricingBreakdown.grandTotal > 0) {
      return Number(pricingBreakdown.grandTotal.toFixed(2))
    }
    const raw =
      cartSubtotal +
      (deliveryFee || 0) +
      (packagingFee || 0) +
      (platformFee || 0) +
      (handlingFee || 0) +
      exactGstValue -
      couponDiscount
    return Number(Math.max(0, raw).toFixed(2))
  }, [canonicalSnapshot, pricingBreakdown.grandTotal, cartSubtotal, deliveryFee, packagingFee, platformFee, handlingFee, exactGstValue, couponDiscount])

  // Automatically recalculate coupon discount when cart subtotal changes
  useEffect(() => {
    if (!appliedCoupon) return
    if (cartSubtotal < appliedCoupon.minOrderAmount) {
      setAppliedCoupon(null)
      setCouponDiscount(0)
      setCouponMessage({
        text: `Coupon removed: order subtotal is below ₹${appliedCoupon.minOrderAmount}.`,
        type: 'error',
      })
      return
    }
    const discount =
      appliedCoupon.discountType === 'percentage'
        ? Math.round((cartSubtotal * appliedCoupon.discountValue) / 100)
        : appliedCoupon.discountValue
    setCouponDiscount(discount)
  }, [appliedCoupon, cartSubtotal])

  const formatPrice = (val: number): string => {
    const rounded = Number(val.toFixed(2))
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2)
  }

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
      setCouponMessage({ text: `Coupon ${found.code} requires a minimum order of ₹${found.minOrderAmount}.`, type: 'error' })
      return
    }

    const calculatedDiscount =
      found.discountType === 'percentage'
        ? Math.round((cartSubtotal * found.discountValue) / 100)
        : found.discountValue

    setAppliedCoupon(found)
    setCouponDiscount(calculatedDiscount)
    setCouponCodeInput('')
    setCouponMessage({
      text: `Coupon "${found.code}" applied! You saved ₹${calculatedDiscount}.`,
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

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current || isSubmittingOrder) return

    if (!deliveryAddress.trim()) {
      toast('Please enter or select a delivery address', 'error')
      document.getElementById('address-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (deliveryServiceability && !deliveryServiceability.isServiceable) {
      toast(deliveryServiceability.reason || 'The selected delivery address is outside our delivery area', 'error')
      document.getElementById('address-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast('Please enter a valid 10-digit phone number', 'error')
      document.getElementById('address-section')?.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (cart.length === 0) {
      toast('Your cart is empty', 'error')
      return
    }

    if (!user?.id) {
      toast('Please sign in before placing an order', 'error')
      return
    }

    const restaurantId = cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id
    if (!restaurantId) {
      toast('The cart item is not linked to a valid restaurant', 'error')
      return
    }

    setIsSubmittingOrder(true)
    isSubmittingRef.current = true

    const idempotencyKey = `ord_user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`

    try {
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('crave_token') || localStorage.getItem('crave_auth_token')
          : null

      const restName = cart[0]?.restaurantName || 'Restaurant'

      const orderData = {
        idempotency_key: idempotencyKey,
        customer_id: user.id,
        customer_name: user.name || 'Customer',
        customer_phone: customerPhone.trim() || user.phone || null,
        customer_address: deliveryAddress.trim(),
        address_id: selectedAddressId || undefined,
        delivery_latitude: detectedCoords?.lat,
        delivery_longitude: detectedCoords?.lng,
        restaurant_id: restaurantId,
        restaurant_name: restName,
        order_type: restaurantId === CRAVEXP_DARK_STORE_ID ? 'cravexp_grocery' : 'restaurant_food',
        items: cart.map((i) => ({
          id: i.menuItemId || i.id,
          menuItemId: i.menuItemId || i.id,
          variantId: i.variantId,
          name: i.name,
          qty: i.qty,
          price: i.price,
          veg: i.veg,
        })),
        subtotal: cartSubtotal,
        packaging_fee: packagingFee,
        delivery_fee: deliveryFee,
        platform_fee: platformFee,
        gst: exactGstValue,
        total_amount: exactNetPayable,
        payment_method: 'razorpay',
        customer_vpa: activeConfig.upiVpa || 'crave@upi',
        coupon_code: appliedCoupon?.code || undefined,
        discount_amount: couponDiscount || 0,
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : {}),
        },
        credentials: 'include',
        body: JSON.stringify(orderData),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to place order')

      const createdOrder = json.order || json.data
      const orderId = createdOrder?.id || json.id

      // Non-production test fallback
      if (activeConfig?.razorpayEnabled && json.razorpayConfigured === false) {
        if (process.env.NODE_ENV === 'production') {
          setIsSubmittingOrder(false)
          isSubmittingRef.current = false
          toast('Payments are temporarily unavailable. Please retry shortly.', 'error')
          return
        }
        setIsSubmittingOrder(false)
        isSubmittingRef.current = false
        clearCart()
        toast('Razorpay payment verified (test mode)! Your order has been placed.', 'success')
        setTimeout(() => router.push(orderId ? `/user/track/${orderId}` : '/user/track'), 1500)
        return
      }

      setIsSubmittingOrder(false)
      isSubmittingRef.current = false
      try {
        await startRazorpayCheckout(orderId)
        clearCart()
        toast('Payment verified! Your order has been placed and sent to the kitchen.', 'success')
        setTimeout(() => router.push(orderId ? `/user/track/${orderId}` : '/user/track'), 1500)
      } catch (err: any) {
        toast(err?.message || 'Payment was not completed. Tap Pay to try again.', 'error')
        setIsSubmittingOrder(false)
        isSubmittingRef.current = false
      }
    } catch (err: any) {
      toast(err?.message || 'Error processing your order. Please try again.', 'error')
      setIsSubmittingOrder(false)
      isSubmittingRef.current = false
    }
  }

  const startRazorpayCheckout = async (orderId: string) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('crave_token') || localStorage.getItem('crave_auth_token') || ''
        : ''

    if (!(window as any).Razorpay) {
      throw new Error('Razorpay Checkout failed to load. Please check your internet connection.')
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch('/api/payments/razorpay/order', {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ orderId }),
    })
    const paymentOrder = await res.json()
    if (!res.ok) throw new Error(paymentOrder.error || 'Unable to start Razorpay payment')

    return new Promise<void>((resolve, reject) => {
      const checkout = new (window as any).Razorpay({
        key: paymentOrder.keyId || 'rzp_test_TrT8Pg6Vpsi18B',
        order_id: paymentOrder.razorpayOrderId,
        amount: paymentOrder.amount,
        currency: paymentOrder.currency || 'INR',
        name: 'crave.',
        description: `Order #${orderId.slice(-6).toUpperCase()} • Fresh Delivery`,
        image: typeof window !== 'undefined' ? `${window.location.origin}/icons/icon-192x192.png` : undefined,
        prefill: {
          name: user?.name || '',
          contact: customerPhone.trim() || user?.phone || '',
          email: user?.email || '',
        },
        theme: { color: '#18241c', backdrop_color: 'rgba(18, 24, 21, 0.85)' },
        notes: { crave_order_id: orderId },
        handler: async (result: any) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers,
              credentials: 'include',
              body: JSON.stringify({
                orderId,
                razorpay_order_id: result.razorpay_order_id,
                razorpay_payment_id: result.razorpay_payment_id,
                razorpay_signature: result.razorpay_signature,
              }),
            })
            const verifyJson = await verifyRes.json()
            if (!verifyRes.ok) throw new Error(verifyJson.error || 'Verification failed')
            resolve()
          } catch (err: any) {
            reject(new Error(err?.message || 'Verification failed'))
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: () => reject(new Error('Checkout was dismissed')),
        },
      })
      checkout.open()
    })
  }

  // Strict Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      toast('Please log in to access your cart', 'error')
      router.replace('/login?logout=1')
    }
  }, [user, authLoading, router, toast])

  const restaurantName = cart[0]?.restaurantName || 'Spice Garden'

  if (authLoading || !user) {
    return <CartSkeleton />
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a100c] text-[#121815] dark:text-stone-100 flex flex-col justify-between selection:bg-[#d9f447] selection:text-[#121815] relative">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[560px] w-full max-w-6xl bg-gradient-to-b from-[#d9f447]/12 via-[#d9f447]/3 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] dark:opacity-[0.035]" />

      <Navbar />

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 flex-1 pb-44 sm:pb-48 lg:pb-16">
        {/* Top Header */}
        <div className="flex flex-col gap-4 border-b border-black/[0.06] dark:border-white/10 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/user/dashboard"
                className="grid size-10 place-items-center rounded-2xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-[#141c17] text-[#121815] dark:text-white hover:border-[#121815] dark:hover:border-[#d9f447] transition shadow-xs active:scale-95 shrink-0"
                aria-label="Back to Marketplace"
              >
                <ArrowLeft className="size-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#5e8210] dark:text-[#d9f447]">
                    Checkout
                  </span>
                  <span className="size-1 rounded-full bg-stone-300 dark:bg-stone-700" />
                  <span className="text-[10px] font-bold text-stone-500 dark:text-stone-400">
                    Instant Delivery
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-[-0.03em] text-[#121815] dark:text-white mt-0.5">
                  Your Order Cart
                </h1>
              </div>
            </div>

            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 active:scale-95 transition"
              >
                <Trash2 className="size-3.5" />
                <span>Clear Cart</span>
              </button>
            )}
          </div>
        </div>

        {/* Order Success Banner */}
        {orderSuccess && (
          <div className="mt-8 rounded-3xl bg-[#121815] dark:bg-[#141f17] border border-[#d9f447]/30 p-8 sm:p-12 text-white shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-80 rounded-full bg-[#d9f447]/15 blur-[100px] pointer-events-none" />
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d9f447] text-[#121815] shadow-lg mb-4">
              <Check className="size-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Order Placed Successfully!</h2>
            <p className="mt-2 text-sm text-[#9eb3a4] max-w-md mx-auto font-medium">
              Your order has been sent to {restaurantName}. Redirecting to live tracking...
            </p>
          </div>
        )}

        {/* Main Cart Content */}
        {!orderSuccess && (
          <div className="mt-8 grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Column: Items, Address & Offers */}
            <div className="space-y-6 lg:col-span-7 xl:col-span-8">
              {cart.length > 0 ? (
                <>
                  {/* Cart Items Card */}
                  <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/10 gap-2 mb-5">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] grid place-items-center font-black">
                          <Utensils className="size-4" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                            Restaurant
                          </p>
                          <h2 className="text-base sm:text-lg font-black text-[#121815] dark:text-white leading-tight">
                            {restaurantName}
                          </h2>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        20-25 mins delivery
                      </span>
                    </div>

                    {/* Dish Items List */}
                    <div className="divide-y divide-black/[0.05] dark:divide-white/[0.07]">
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className="py-4.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            {item.image ? (
                              <img
                                src={item.image}
                                alt={item.name}
                                onError={(e) => {
                                  e.currentTarget.onerror = null
                                  e.currentTarget.src =
                                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=300&q=80'
                                }}
                                className="size-16 sm:size-18 rounded-2xl object-cover shrink-0 border border-black/5 dark:border-white/10 shadow-sm"
                              />
                            ) : (
                              <div className="grid size-16 sm:size-18 place-items-center rounded-2xl bg-[#121815]/5 dark:bg-white/5 text-[#5e8210] dark:text-[#d9f447] shrink-0 font-black text-xs border border-black/5 dark:border-white/10">
                                CRAVE
                              </div>
                            )}

                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm sm:text-base font-extrabold text-[#121815] dark:text-white truncate">
                                {item.name}
                              </h3>
                              {item.variantName && (
                                <p className="mt-0.5 text-[11px] font-bold text-[#6f840f] dark:text-[#d9f447]">
                                  Size: {item.variantName}
                                </p>
                              )}
                              <p className="text-xs font-bold text-stone-500 dark:text-stone-400 mt-0.5">
                                ₹{item.price} <span className="text-[10px] font-normal text-stone-400">each</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t border-black/[0.03] dark:border-white/[0.04] sm:border-t-0">
                            <div className="flex items-center gap-2 rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/10 px-3 py-1.5 text-xs font-black text-[#121815] dark:text-white">
                              <button
                                onClick={() => updateItemQty(item.id, -1)}
                                className="p-1 text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white transition active:scale-90"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <span className="w-5 text-center font-mono">{item.qty}</span>
                              <button
                                onClick={() => updateItemQty(item.id, 1)}
                                className="p-1 text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white transition active:scale-90"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>

                            <span className="text-sm font-black text-[#121815] dark:text-white font-mono min-w-[65px] text-right">
                              ₹{item.price * item.qty}
                            </span>

                            <button
                              onClick={() => removeItem(item.id)}
                              className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 transition active:scale-90 shrink-0"
                              aria-label="Remove item"
                            >
                              <Trash2 className="size-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 pt-4 border-t border-black/[0.05] dark:border-white/[0.07] flex justify-end">
                      <Link
                        href="/user/dashboard"
                        className="font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline flex items-center gap-1 text-xs"
                      >
                        <span>+ Add more items from menu</span>
                      </Link>
                    </div>
                  </div>

                  {/* Recommendations: Frequently Paired Cross-Sell */}
                  {cart.length > 0 && cart[0]?.restaurantId && (
                    <CartUpsellStrip
                      restaurantId={cart[0].restaurantId}
                      restaurantName={cart[0].restaurantName}
                      cartItemIds={cart.map((i) => i.id || i.menuItemId || '')}
                      onAddToCart={(item) => addItem(item)}
                    />
                  )}

                  {/* Delivery Address Section */}
                  <div
                    id="address-section"
                    className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between mb-5 pb-3.5 border-b border-black/[0.06] dark:border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-2xl bg-black/5 dark:bg-white/5 grid place-items-center text-[#5e8210] dark:text-[#d9f447]">
                          <MapPin className="size-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-[#121815] dark:text-white">
                            Delivery Address
                          </h2>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                            Choose where you want your food delivered
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowAddressModal(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-3.5 py-1.5 text-xs font-black shadow-xs hover:opacity-90 active:scale-95 transition"
                      >
                        <Plus className="size-3.5 stroke-[3]" />
                        <span>Add New Address</span>
                      </button>
                    </div>

                    {/* Saved Address Cards Grid */}
                    <div className="mb-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {savedAddresses.map((addr) => {
                          const isSelected = deliveryAddress === addr.address
                          return (
                            <div
                              key={addr.id}
                              onClick={() => {
                                setSelectedAddressId(addr.id)
                                setDeliveryAddress(addr.address)
                                if (addr.latitude != null && addr.longitude != null) {
                                  setDetectedCoords({ lat: Number(addr.latitude), lng: Number(addr.longitude) })
                                }
                                if (typeof window !== 'undefined') {
                                  localStorage.setItem('crave_selected_address', addr.address)
                                }
                                toast(`Delivering to ${addr.label}`, 'success')
                              }}
                              className={`cursor-pointer rounded-2xl border p-3.5 transition flex items-start justify-between gap-3 ${
                                isSelected
                                  ? 'border-[#121815] dark:border-[#d9f447] bg-black/[0.03] dark:bg-white/[0.05] ring-2 ring-black/10 dark:ring-[#d9f447]/20 shadow-xs'
                                  : 'border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.02] hover:border-black/25 dark:hover:border-white/25'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0">
                                <div className="size-7 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center shrink-0 mt-0.5">
                                  {addr.label === 'Home' ? (
                                    <Home className="size-3.5" />
                                  ) : addr.label === 'Work' ? (
                                    <Briefcase className="size-3.5" />
                                  ) : (
                                    <Building className="size-3.5" />
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-[#121815] dark:text-white">{addr.label}</p>
                                  <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-2 mt-0.5 font-medium leading-relaxed">
                                    {addr.address}
                                  </p>
                                </div>
                              </div>
                              <div className="shrink-0 mt-0.5">
                                {isSelected ? (
                                  <div className="size-5 rounded-full bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] grid place-items-center">
                                    <Check className="size-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="size-5 rounded-full border border-black/20 dark:border-white/20" />
                                )}
                              </div>
                            </div>
                          )
                        })}

                        <button
                          type="button"
                          onClick={() => setShowAddressModal(true)}
                          className="rounded-2xl border-2 border-dashed border-black/15 dark:border-white/15 hover:border-black/30 dark:hover:border-white/30 p-3.5 flex items-center justify-center gap-2 text-xs font-bold text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white transition group min-h-[72px]"
                        >
                          <Plus className="size-4 text-[#5e8210] dark:text-[#d9f447] group-hover:scale-110 transition" />
                          <span>+ Add New Address</span>
                        </button>
                      </div>
                    </div>

                    {/* Active Address Input & Contact Phone */}
                    <div className="space-y-4 pt-2">
                      <div>
                        <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                          <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                            Delivery Address Details
                          </label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setShowAddressModal(true)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline"
                            >
                              <MapPin className="size-3.5" />
                              <span>Adjust Pin / Edit</span>
                            </button>
                            <button
                              type="button"
                              disabled={isGpsDetecting}
                              onClick={handleDetectGpsInCart}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline"
                            >
                              <LocateFixed className="size-3.5" />
                              <span>{isGpsDetecting ? 'Detecting...' : 'Use GPS'}</span>
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          required
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          placeholder="House / Flat No., Apartment Name, Street, Area"
                          className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15 transition"
                        />

                        {deliveryServiceability && (
                          <div className="mt-2">
                            {!deliveryServiceability.isServiceable ? (
                              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                <div>
                                  <p className="font-extrabold">Delivery Not Available at This Location</p>
                                  <p className="text-[11px] mt-0.5 opacity-90">{deliveryServiceability.reason}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                                <span className="flex items-center gap-1.5 font-bold text-[11px]">
                                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                                  <span>Serviceable Location (Crave Delivery Zone)</span>
                                </span>
                                {deliveryServiceability.distanceKm != null && (
                                  <span className="font-mono text-[10px] font-bold opacity-80">
                                    {deliveryServiceability.distanceKm} km away
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="text-xs font-bold text-stone-700 dark:text-stone-300 block mb-1.5">
                          Contact Phone Number
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            required
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="e.g. +91 9876543210"
                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-semibold text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-4 focus:ring-black/5 dark:focus:ring-[#d9f447]/15 transition font-mono"
                          />
                          {customerPhone.trim().length >= 10 && (
                            <div className="absolute inset-y-0 right-3.5 flex items-center text-emerald-600 dark:text-emerald-400">
                              <ShieldCheck className="size-4" />
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-stone-400 mt-1">Delivery partner will call this number on arrival.</p>
                      </div>
                    </div>
                  </div>

                  {/* Coupons & Offers Section */}
                  <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-5 sm:p-7 shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                    <div className="flex items-center justify-between mb-4 pb-3.5 border-b border-black/[0.06] dark:border-white/10">
                      <div className="flex items-center gap-2.5">
                        <div className="size-9 rounded-2xl bg-black/5 dark:bg-white/5 grid place-items-center text-[#5e8210] dark:text-[#d9f447]">
                          <Tag className="size-4.5" />
                        </div>
                        <div>
                          <h2 className="text-sm sm:text-base font-extrabold text-[#121815] dark:text-white">
                            Coupons &amp; Offers
                          </h2>
                          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-medium">
                            Apply coupon code to get discount
                          </p>
                        </div>
                      </div>

                      {appliedCoupon ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
                        >
                          Remove Coupon
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowCouponsModal(true)}
                          className="text-xs font-bold text-[#5e8210] dark:text-[#d9f447] hover:underline"
                        >
                          View All Offers ({availableCoupons.length})
                        </button>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
                        <div className="flex items-center gap-3">
                          <Sparkles className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg shadow-xs">
                                {appliedCoupon.code}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                                Applied Successfully
                              </span>
                            </div>
                            <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium">
                              {appliedCoupon.description || 'Promotional Discount Applied'}
                            </p>
                          </div>
                        </div>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                          -₹{couponDiscount}
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
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
                            className="flex-1 rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-xs font-black uppercase text-[#121815] dark:text-white placeholder:normal-case placeholder:font-normal placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyCouponCode()}
                            className="rounded-2xl bg-[#121815] dark:bg-[#d9f447] px-6 py-3 text-xs font-black text-[#d9f447] dark:text-[#121815] hover:opacity-90 active:scale-95 transition shadow-sm"
                          >
                            Apply
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-stone-400">Available:</span>
                          {availableCoupons.slice(0, 3).map((cpn) => (
                            <button
                              key={cpn.code}
                              type="button"
                              onClick={() => handleApplyCouponCode(cpn.code)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-[#121815] dark:text-white hover:border-[#5e8210] dark:hover:border-[#d9f447] transition"
                            >
                              <span className="font-mono text-[#5e8210] dark:text-[#d9f447] font-black">{cpn.code}</span>
                              <span className="text-stone-400 font-normal">
                                {cpn.discountType === 'percentage' ? `${cpn.discountValue}% OFF` : `₹${cpn.discountValue} OFF`}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {couponMessage && (
                      <div
                        className={`mt-3.5 flex items-center gap-2 text-xs font-bold rounded-xl p-3 ${
                          couponMessage.type === 'success'
                            ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-800 dark:text-rose-300 border border-rose-500/20'
                        }`}
                      >
                        {couponMessage.type === 'success' ? (
                          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{couponMessage.text}</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-8 sm:p-14 text-center shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#d9f447]/20 text-[#121815] dark:text-[#d9f447] mb-5 shadow-sm">
                    <ShoppingCart className="size-10 text-[#5e8210] dark:text-[#d9f447]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#121815] dark:text-white tracking-tight">Your Cart is Empty</h2>
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed font-medium">
                    Looks like you haven&apos;t added anything to your cart yet. Explore delicious dishes from nearby restaurants!
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                    <Link
                      href="/user/dashboard"
                      className="w-full sm:w-auto flex-1 rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-7 py-3.5 text-xs font-black shadow-lg hover:opacity-90 active:scale-95 transition text-center"
                    >
                      Explore Restaurants
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Premium Bill Details */}
            {cart.length > 0 && (
              <div id="payment-section" className="space-y-6 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
                <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/95 dark:bg-[#131b16]/95 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/10 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-[#5e8210] dark:text-[#d9f447]">
                        <Receipt className="size-4" />
                      </div>
                      <h2 className="text-base font-extrabold text-[#121815] dark:text-white">Bill Details</h2>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">INR (₹)</span>
                  </div>

                  {/* Free Delivery Progress Indicator */}
                  {activeConfig?.freeDeliveryThreshold ? (
                    <div className="mb-5 rounded-2xl bg-[#f8faf4] dark:bg-[#18221b] border border-emerald-500/20 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#121815] dark:text-white flex items-center gap-1.5">
                          <Zap className="size-3.5 text-emerald-600 dark:text-[#d9f447] fill-emerald-600 dark:fill-[#d9f447]" />
                          {cartSubtotal >= activeConfig.freeDeliveryThreshold ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-black">Free Delivery Unlocked!</span>
                          ) : (
                            <span>
                              Add{' '}
                              <strong className="font-mono text-emerald-700 dark:text-[#d9f447]">
                                ₹{(activeConfig.freeDeliveryThreshold - cartSubtotal).toFixed(0)}
                              </strong>{' '}
                              more for <span className="font-black text-emerald-600 dark:text-emerald-400">FREE Delivery</span>
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          ₹{cartSubtotal}/₹{activeConfig.freeDeliveryThreshold}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-[#d9f447] transition-all duration-500 ease-out"
                          style={{
                            width: `${Math.min(100, Math.round((cartSubtotal / activeConfig.freeDeliveryThreshold) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3.5 text-xs">
                    <div className="flex justify-between text-stone-600 dark:text-stone-300">
                      <span>Item Total ({totalCount} {totalCount === 1 ? 'item' : 'items'})</span>
                      <span className="font-extrabold text-[#121815] dark:text-white">₹{cartSubtotal}</span>
                    </div>

                    <div className="flex justify-between text-stone-600 dark:text-stone-300 items-center">
                      <span>Delivery Fee</span>
                      {pricingBreakdown.isFreeDelivery ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase">FREE</span>
                      ) : (
                        <span className="font-extrabold text-[#121815] dark:text-white">₹{deliveryFee}</span>
                      )}
                    </div>

                    {packagingFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Packaging Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">₹{packagingFee}</span>
                      </div>
                    )}

                    {platformFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Platform Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">₹{platformFee}</span>
                      </div>
                    )}

                    {handlingFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Handling Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">₹{handlingFee}</span>
                      </div>
                    )}

                    {exactGstValue > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <div>
                          <span>Taxes &amp; GST</span>
                          {canonicalSnapshot?.items?.every((it: any) => it.priceTaxMode !== 'TAX_EXCLUSIVE') && (
                            <span className="block text-[10px] text-stone-400">(Restaurant GST included in items)</span>
                          )}
                        </div>
                        <span className="font-extrabold text-[#121815] dark:text-white">₹{formatPrice(exactGstValue)}</span>
                      </div>
                    )}

                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                        <span>Coupon Discount ({appliedCoupon.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    <div className="pt-4 border-t-2 border-dashed border-black/10 dark:border-white/10 flex items-baseline justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#121815] dark:text-white">Total to Pay</p>
                        <p className="text-[10px] text-stone-400">Incl. all taxes and charges</p>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#121815] dark:text-[#d9f447]">
                        ₹{formatPrice(exactNetPayable)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 px-1">
                      <span>Payment Method</span>
                      <span className="font-semibold text-[#121815] dark:text-white">Online (UPI / Cards / Net Banking)</span>
                    </div>

                    <form onSubmit={handlePlaceOrder} id="checkout-action-section">
                      <button
                        type="submit"
                        disabled={isSubmittingOrder}
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#d9f447] py-4 px-6 text-sm font-bold text-[#d9f447] dark:text-[#121815] shadow-xl hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingOrder ? (
                          <CraveButtonLoader label="Processing payment..." sublabel="Opening checkout" variant="dark" size="md" />
                        ) : (
                          <>
                            <span>Pay ₹{formatPrice(exactNetPayable)}</span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">
                      100% secure payment &bull; 256-bit encryption
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Mobile Checkout Bar */}
      {cart.length > 0 && !orderSuccess && (
        <div className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between rounded-2xl bg-[#121815] dark:bg-[#d9f447] p-4 shadow-2xl border border-black/10 dark:border-black/20 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-700">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} &bull; Total to Pay
              </p>
              <p className="text-lg font-black text-[#d9f447] dark:text-[#121815]">₹{formatPrice(exactNetPayable)}</p>
            </div>
            <button
              type="button"
              onClick={() => document.getElementById('checkout-action-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="rounded-xl bg-[#d9f447] dark:bg-[#121815] text-[#121815] dark:text-[#d9f447] px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>Pay ₹{formatPrice(exactNetPayable)}</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Available Coupons Modal */}
      {showCouponsModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="coupons-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowCouponsModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#141c17] p-6 shadow-2xl border border-black/10 dark:border-white/10 max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] grid place-items-center font-bold">
                  <Tag className="size-5" />
                </div>
                <div>
                  <h3 id="coupons-modal-title" className="text-base font-black text-[#121815] dark:text-white">
                    Available Coupons &amp; Offers
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">Select a coupon to apply instant discount</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="size-8 rounded-full bg-black/5 dark:bg-white/5 grid place-items-center text-stone-500 hover:text-black dark:text-stone-400 dark:hover:text-white"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {availableCoupons.length === 0 ? (
                <div className="text-center py-8 text-xs text-stone-400">No coupons currently available.</div>
              ) : (
                availableCoupons.map((coupon) => {
                  const isApplied = appliedCoupon?.code === coupon.code
                  const isEligible = cartSubtotal >= coupon.minOrderAmount
                  const amountNeeded = coupon.minOrderAmount - cartSubtotal

                  return (
                    <div
                      key={coupon.id || coupon.code}
                      className={`rounded-2xl border p-4 transition space-y-2 ${
                        isApplied
                          ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                          : isEligible
                            ? 'border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] hover:border-black/20'
                            : 'border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono font-black text-xs bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-lg text-[#121815] dark:text-white">
                            {coupon.code}
                          </span>
                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 font-medium">{coupon.description}</p>
                        </div>

                        {isApplied ? (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="size-3.5 stroke-[3]" /> Applied
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              handleApplyCouponCode(coupon.code)
                              if (cartSubtotal >= coupon.minOrderAmount) setShowCouponsModal(false)
                            }}
                            className="rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-3.5 py-1.5 text-xs font-black hover:opacity-90 transition"
                          >
                            Apply
                          </button>
                        )}
                      </div>

                      {!isEligible && (
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/10 p-2 rounded-xl">
                          Add ₹{amountNeeded} more to unlock this offer
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="pt-3 border-t border-black/5 dark:border-white/10 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCouponsModal(false)}
                className="rounded-xl bg-black/5 dark:bg-white/5 px-4 py-2 text-xs font-bold text-[#121815] dark:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelectAddress={handleAddressSelectedFromModal}
        initialSelectedId={selectedAddressId}
      />

      <Footer />
    </div>
  )
}

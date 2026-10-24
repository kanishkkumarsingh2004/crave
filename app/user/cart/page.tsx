'use client'

import type { AddressItem } from '@/components/AddressModal'
import Footer from '@/components/Footer'
import Navbar from '@/components/Navbar'
import { CraveButtonLoader } from '@/components/ui/ModernPreloader'
import { useAuth } from '@/lib/auth-context'
import { useCart } from '@/lib/cart-context'
import { apiFetch } from '@/lib/client/api-fetch'
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
  Copy,
  Home,
  LocateFixed,
  Lock,
  MapPin,
  Minus,
  Plus,
  QrCode,
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

const AddressModal = dynamic(() => import('@/components/AddressModal'), {
  ssr: false,
})

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

  // Keyboard Escape listener for coupons modal accessibility (UIX-006)
  useEffect(() => {
    if (!showCouponsModal) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowCouponsModal(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showCouponsModal])

  // Order & Payment State
  const [deliveryAddress, setDeliveryAddress] = useState(user?.address || '')
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '')
  const [utrRef, setUtrRef] = useState('')
  const [copiedUpi, setCopiedUpi] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'razorpay'>('razorpay')
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)
  const isSubmittingRef = useRef(false)
  const [orderSuccess, setOrderSuccess] = useState(false)

  // Saved Addresses State & Inline Add Mechanism
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [isAddingAddressInline, setIsAddingAddressInline] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [newAddressLabel, setNewAddressLabel] = useState('Home')
  const [newAddressText, setNewAddressText] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [isGpsDetecting, setIsGpsDetecting] = useState(false)
  const [detectedCoords, setDetectedCoords] = useState<{ lat: number; lng: number } | null>(() => {
    const cached = getCachedLocation()
    if (cached?.lat && cached?.lng) {
      return { lat: cached.lat, lng: cached.lng }
    }
    return null
  })

  const handleDetectGpsInCart = async () => {
    setIsGpsDetecting(true)
    try {
      const geocoded = await autoDetectAndGeocodeLocation()
      setDetectedCoords({ lat: geocoded.lat, lng: geocoded.lng })
      setNewAddressText(geocoded.formattedAddress)
      setDeliveryAddress(geocoded.formattedAddress)
      toast(
        `GPS Address Detected: ${geocoded.shortAddress || geocoded.formattedAddress}`,
        'success'
      )
    } catch (err: any) {
      toast('Could not detect GPS location. Please allow browser location access.', 'error')
    } finally {
      setIsGpsDetecting(false)
    }
  }

  const [restaurantCoords, setRestaurantCoords] = useState<{ lat: number; lng: number } | null>(
    () => {
      const first = cart[0] as any
      if (first?.restaurantLat != null && first?.restaurantLng != null) {
        return { lat: Number(first.restaurantLat), lng: Number(first.restaurantLng) }
      }
      return null
    }
  )

  useEffect(() => {
    const first = cart[0] as any
    if (first?.restaurantLat != null && first?.restaurantLng != null) {
      setRestaurantCoords({ lat: Number(first.restaurantLat), lng: Number(first.restaurantLng) })
    }
    const restId =
      cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id || undefined
    if (!restId) {
      if (!first?.restaurantLat) setRestaurantCoords(null)
      return
    }
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
      if (exists) return prev.map((a) => (a.id === savedItem.id ? savedItem : a))
      return [savedItem, ...prev]
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

  // Fetch Saved Addresses (from database + local storage fallback)
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
          } else {
            const cached = getCachedLocation()
            if (cached?.lat && cached?.lng) {
              setDetectedCoords({ lat: cached.lat, lng: cached.lng })
            }
          }
        } else if (localAddrs.length > 0) {
          setSavedAddresses(localAddrs)
          setSelectedAddressId(localAddrs[0].id)
          setDeliveryAddress(localAddrs[0].address)
          if (localAddrs[0].latitude != null && localAddrs[0].longitude != null) {
            setDetectedCoords({
              lat: Number(localAddrs[0].latitude),
              lng: Number(localAddrs[0].longitude),
            })
          }
        } else {
          const cached = getCachedLocation()
          if (cached?.lat && cached?.lng) {
            setDetectedCoords({ lat: cached.lat, lng: cached.lng })
          }
        }
      } catch (e) {
        if (localAddrs.length > 0) {
          setSavedAddresses(localAddrs)
        }
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
          if (configJson.config.razorpayEnabled) {
            setPaymentMethod('razorpay')
          } else {
            setPaymentMethod('upi')
          }
        } else {
          setPaymentConfig(getLocalPaymentConfig())
          setPaymentMethod('upi')
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

  // Preload Razorpay Checkout script so gateway opens instantly
  useEffect(() => {
    if (typeof window !== 'undefined' && !(window as any).Razorpay) {
      const existing = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      )
      if (!existing) {
        const script = document.createElement('script')
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.body.appendChild(script)
      }
    }
  }, [])

  const [calculatorApiBreakdown, setCalculatorApiBreakdown] = useState<any>(null)

  // Calculate Subtotal & Fees via Admin Config & Distance Engine
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

  // Exact Tax & GST (never rounded off)
  const exactGstValue = useMemo(() => {
    if (pricingBreakdown.exactGst != null && pricingBreakdown.exactGst >= 0) {
      return pricingBreakdown.exactGst
    }
    return Number((pricingBreakdown.gstAmount ?? 0).toFixed(2))
  }, [pricingBreakdown.exactGst, pricingBreakdown.gstAmount])

  // Exact Final Amount To Pay (Strictly NEVER rounded off)
  const exactNetPayable = useMemo(() => {
    const raw =
      cartSubtotal +
      (deliveryFee || 0) +
      (packagingFee || 0) +
      (platformFee || 0) +
      (handlingFee || 0) +
      exactGstValue -
      couponDiscount
    return Number(Math.max(0, raw).toFixed(2))
  }, [
    cartSubtotal,
    deliveryFee,
    packagingFee,
    platformFee,
    handlingFee,
    exactGstValue,
    couponDiscount,
  ])

  // Currency Formatter - preserves exact decimals if present, no forced rounding
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
      setCouponMessage({
        text: `Invalid coupon code "${code}". Try CRAVE50 or WELCOME100.`,
        type: 'error',
      })
      return
    }

    if (cartSubtotal < found.minOrderAmount) {
      setCouponMessage({
        text: `Coupon ${found.code} requires a minimum order of ₹${found.minOrderAmount}.`,
        type: 'error',
      })
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

  const handleSaveNewAddress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!newAddressText.trim()) {
      toast('Please enter your full delivery address', 'error')
      return
    }

    const cached = getCachedLocation()
    const lat = detectedCoords?.lat ?? cached?.lat ?? 12.9716
    const lng = detectedCoords?.lng ?? cached?.lng ?? 77.5946

    setIsSavingAddress(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      let savedAddressItem: SavedAddress | null = null

      try {
        const res = await fetch('/api/user/addresses', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            label: newAddressLabel,
            address: newAddressText.trim(),
            latitude: lat,
            longitude: lng,
            is_default: savedAddresses.length === 0,
          }),
        })

        if (res.ok) {
          const json = await res.json()
          if (json.success && json.address) {
            savedAddressItem = json.address
          }
        } else if (user) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Could not save the address in the database.')
        }
      } catch (apiErr) {
        if (user) throw apiErr
        console.warn('Guest address save failed; keeping it locally:', apiErr)
      }

      if (!savedAddressItem && user) {
        throw new Error('The address was not saved to the database. Please try again.')
      }

      if (!savedAddressItem) {
        savedAddressItem = {
          id: `addr_${Date.now()}`,
          label: newAddressLabel,
          address: newAddressText.trim(),
          is_default: savedAddresses.length === 0,
          latitude: lat,
          longitude: lng,
        }
      }

      setSavedAddresses((prev) => [
        savedAddressItem!,
        ...prev.filter((a) => a.id !== savedAddressItem!.id),
      ])
      setSelectedAddressId(savedAddressItem.id)
      setDeliveryAddress(savedAddressItem.address)

      if (typeof window !== 'undefined') {
        localStorage.setItem('crave_selected_address', savedAddressItem.address)
        try {
          const currentLocal = JSON.parse(localStorage.getItem('crave_local_addresses') || '[]')
          localStorage.setItem(
            'crave_local_addresses',
            JSON.stringify([
              savedAddressItem,
              ...currentLocal.filter((a: any) => a.id !== savedAddressItem!.id),
            ])
          )
        } catch {}
      }

      setNewAddressText('')
      setIsAddingAddressInline(false)
      setShowAddressModal(false)
      toast(`Address "${savedAddressItem.label}" saved and selected!`, 'success')
    } catch (err: any) {
      toast(err?.message || 'Could not save address', 'error')
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleCopyUpi = () => {
    const vpa = activeConfig.upiVpa || 'crave@upi'
    navigator.clipboard.writeText(vpa)
    setCopiedUpi(true)
    toast('UPI ID copied to clipboard!', 'success')
    setTimeout(() => setCopiedUpi(false), 2500)
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isSubmittingRef.current || isSubmittingOrder) return

    if (!deliveryAddress.trim()) {
      toast('Please enter or select a delivery address', 'error')
      const target = document.getElementById('address-section')
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (deliveryServiceability && !deliveryServiceability.isServiceable) {
      toast(
        deliveryServiceability.reason ||
          'The selected delivery address is outside our delivery area',
        'error'
      )
      const target = document.getElementById('address-section')
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 10) {
      toast('Please enter a valid 10-digit phone number', 'error')
      const target = document.getElementById('address-section')
      if (target) target.scrollIntoView({ behavior: 'smooth' })
      return
    }

    if (!activeConfig?.razorpayEnabled && (!utrRef.trim() || utrRef.trim().length < 10)) {
      toast(
        'Please enter the 12-digit UPI reference number (UTR) from your payment receipt',
        'error'
      )
      const target = document.getElementById('payment-section')
      if (target) target.scrollIntoView({ behavior: 'smooth' })
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

    const restaurantId =
      cart[0]?.restaurantId || cart[0]?.vendorId || (cart[0] as any)?.restaurant_id
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
        payment_method: activeConfig?.razorpayEnabled ? 'razorpay' : paymentMethod,
        customer_vpa: activeConfig.upiVpa || 'crave@upi',
        ...(!activeConfig?.razorpayEnabled && paymentMethod === 'upi' ? { utr_ref: utrRef.trim() } : {}),
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

      if (!res.ok) {
        throw new Error(json.error || 'Failed to place order')
      }

      const createdOrder = json.order || json.data
      const orderId = createdOrder?.id || json.id

      // Razorpay not configured (invalid keys / Route not enabled).
      // In non-production we simulate a verified payment so the full checkout
      // flow works end-to-end for testing. In production this is a hard error:
      // an order must NEVER be marked paid without a real, server-verified
      // payment. The pending order is left untouched and will be auto-cancelled
      // by the reconciliation worker after the stale-order timeout.
      if (activeConfig?.razorpayEnabled && json.razorpayConfigured === false) {
        if (process.env.NODE_ENV === 'production') {
          setIsSubmittingOrder(false)
          isSubmittingRef.current = false
          toast(
            json.error ||
              'Payments are temporarily unavailable. Your order was placed but not charged — no payment was taken. Please retry shortly.',
            'error'
          )
          return
        }
        setIsSubmittingOrder(false)
        isSubmittingRef.current = false
        clearCart()
        setUtrRef('')
        toast('Razorpay payment simulated (test mode). Payment verified!', 'success')
        setTimeout(() => {
          if (orderId) {
            router.push(`/user/track/${orderId}`)
          } else {
            router.push('/user/track')
          }
        }, 1500)
        return
      }

      if (activeConfig?.razorpayEnabled) {
        setIsSubmittingOrder(false)
        isSubmittingRef.current = false
        try {
          await startRazorpayCheckout(orderId, exactNetPayable)
          clearCart()
          setUtrRef('')
          toast('Payment verified successfully!', 'success')
          setTimeout(() => {
            if (orderId) {
              router.push(`/user/track/${orderId}`)
            } else {
              router.push('/user/track')
            }
          }, 1500)
        } catch (err: any) {
          toast(err?.message || 'Razorpay checkout failed. Please try again.', 'error')
          setIsSubmittingOrder(false)
          isSubmittingRef.current = false
        }
      } else {
        setOrderSuccess(true)
        clearCart()
        setUtrRef('')
        toast('Order placed successfully! Verifying payment...', 'success')

        setTimeout(() => {
          if (orderId) {
            router.push(`/user/track/${orderId}`)
          } else {
            router.push('/user/track')
          }
        }, 1500)
      }
    } catch (err: any) {
      toast(err?.message || 'Error processing your order. Please try again.', 'error')
      setIsSubmittingOrder(false)
      isSubmittingRef.current = false
    }
  }

  // Razorpay Checkout flow: load script, create order, open Checkout, verify on server
  const startRazorpayCheckout = async (orderId: string, amount: number) => {
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('crave_token') || localStorage.getItem('crave_auth_token') || ''
        : ''
    return new Promise<void>((resolve, reject) => {
      const loadScript = (): Promise<boolean> => {
        return new Promise((res) => {
          if (typeof window !== 'undefined' && (window as any).Razorpay) {
            return res(true)
          }
          const existing = document.querySelector(
            'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
          )
          if (existing) {
            existing.addEventListener('load', () => res(true))
            existing.addEventListener('error', () => res(false))
            return
          }
          const script = document.createElement('script')
          script.src = 'https://checkout.razorpay.com/v1/checkout.js'
          script.async = true
          script.crossOrigin = 'anonymous'
          script.onload = () => res(true)
          script.onerror = () => res(false)
          document.body.appendChild(script)
        })
      }

      loadScript().then((loaded) => {
        if (!loaded || !(window as any).Razorpay) {
          reject(
            new Error(
              'Razorpay Checkout failed to load. Please check your internet connection and try again.'
            )
          )
          return
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        fetch('/api/payments/razorpay/order', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({ orderId }),
        })
          .then(async (res) => {
            const json = await res.json()
            if (!res.ok) {
              throw new Error(json.error || 'Unable to start Razorpay payment')
            }
            return json
          })
          .then((paymentOrder) => {
            const checkoutKey = paymentOrder.keyId || 'rzp_test_TrT8Pg6Vpsi18B'
            const checkout = new (window as any).Razorpay({
              key: checkoutKey,
              order_id: paymentOrder.razorpayOrderId,
              amount: paymentOrder.amount,
              currency: paymentOrder.currency || 'INR',
              name: 'crave.',
              description: `Order #${orderId.slice(-6).toUpperCase()}`,
              prefill: {
                name: user?.name || '',
                contact: customerPhone.trim() || user?.phone || '',
                email: user?.email || '',
              },
              theme: {
                color: '#121815',
              },
              notes: { crave_order_id: orderId },
              handler: async (result: any) => {
                try {
                  const verifyHeaders: Record<string, string> = {
                    'Content-Type': 'application/json',
                  }
                  if (token) verifyHeaders['Authorization'] = `Bearer ${token}`
                  const verifyRes = await fetch('/api/payments/razorpay/verify', {
                    method: 'POST',
                    headers: verifyHeaders,
                    credentials: 'include',
                    body: JSON.stringify({
                      orderId,
                      razorpay_order_id: result.razorpay_order_id,
                      razorpay_payment_id: result.razorpay_payment_id,
                      razorpay_signature: result.razorpay_signature,
                    }),
                  })
                  const verifyJson = await verifyRes.json()
                  if (!verifyRes.ok) {
                    reject(new Error(verifyJson.error || 'Verification failed'))
                    return
                  }
                  resolve()
                } catch (err: any) {
                  reject(new Error(err?.message || 'Verification failed'))
                }
              },
              modal: {
                ondismiss: () => {
                  reject(new Error('Checkout was dismissed'))
                },
              },
            })
            checkout.open()
          })
          .catch((err: any) => {
            reject(new Error(err?.message || 'Unable to start Razorpay payment'))
          })
      })
    })
  }

  // Strict Auth Protection
  useEffect(() => {
    if (!authLoading && !user) {
      toast('Please log in to access your cart', 'error')
      router.replace('/login')
    }
  }, [user, authLoading, router, toast])

  const restaurantName = cart[0]?.restaurantName || 'Spice Garden'

  // Official UPI App Logos and Deep Links
  const upiApps = [
    {
      name: 'Google Pay',
      shortName: 'GPay',
      scheme: `tez://upi/pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${exactNetPayable}&cu=INR&tn=${encodeURIComponent('Crave Order')}`,
      logo: (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      ),
    },
    {
      name: 'PhonePe',
      shortName: 'PhonePe',
      scheme: `phonepe://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${exactNetPayable}&cu=INR&tn=${encodeURIComponent('Crave Order')}`,
      logo: (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none">
          <rect width="24" height="24" rx="6" fill="#5f259f" />
          <path
            d="M15.4 11.6c-.7-.2-1.5-.2-2.3-.2h-1.3v2.8h1.2c.8 0 1.6-.1 2.2-.2.5-.2.9-.6.9-1.1 0-.7-.4-1.1-.7-1.3zm.2-3.3c-.5-.1-1.1-.2-1.9-.2h-2v2.3h1.9c.7 0 1.3-.1 1.7-.2.4-.1.7-.4.7-1 0-.5-.3-.9-.4-1zm3.3 3.4c0 1.3-.7 2.3-2 2.9-.9.4-2.1.5-3.4.5h-1.7v3.3c0 .4-.4.8-.8.8h-1.1c-.4 0-.8-.4-.8-.8V6.7c0-.4.4-.8.8-.8h4.5c1.3 0 2.3.2 3.2.5 1.2.5 1.9 1.4 1.9 2.7 0 1-.4 1.8-1.2 2.3 1.1.5 1.7 1.4 1.7 2.5z"
            fill="#FFFFFF"
          />
        </svg>
      ),
    },
    {
      name: 'Paytm',
      shortName: 'Paytm',
      scheme: `paytmmp://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${exactNetPayable}&cu=INR&tn=${encodeURIComponent('Crave Order')}`,
      logo: (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none">
          <rect width="24" height="24" rx="6" fill="#002970" />
          <path
            d="M5 8h3.2c1.6 0 2.6.9 2.6 2.3 0 1.4-1 2.3-2.6 2.3H6.8v3.2H5V8zm3.1 3.2c.7 0 1.2-.4 1.2-.9s-.4-.9-1.2-.9H6.8v1.8h1.3z"
            fill="#FFFFFF"
          />
          <path
            d="M11.5 13.3c0-1.6 1.2-2.5 2.8-2.5 1.6 0 2.7 1 2.7 2.5v2.5h-1.4v-.7c-.4.5-1 .8-1.6.8-1.1 0-2-.7-2-1.8 0-1.1.9-1.8 2.3-1.9l1.4-.1v-.2c0-.7-.5-1.1-1.3-1.1-.7 0-1.1.3-1.3.8l-1.6-.3zm4.1 1.1v-.5l-1.1.1c-.7.1-1.1.3-1.1.8 0 .5.4.8 1 .8.7 0 1.2-.5 1.2-1.2z"
            fill="#00BAF2"
          />
          <path
            d="M17.5 10.9h1.6l1.4 3.3 1.4-3.3h1.6l-2.5 5.3c-.5 1.1-1.2 1.6-2.1 1.6-.3 0-.6-.1-.8-.1v-1.3c.2.1.4.1.5.1.5 0 .8-.2 1-.8l-2.1-4.8z"
            fill="#00BAF2"
          />
        </svg>
      ),
    },
    {
      name: 'Any UPI App',
      shortName: 'Any UPI',
      scheme: `upi://pay?pa=${encodeURIComponent(activeConfig.upiVpa || 'crave@upi')}&pn=${encodeURIComponent(activeConfig.merchantName || 'crave Food Delivery')}&mc=${activeConfig.mccCode || '5812'}&am=${exactNetPayable}&cu=INR&tn=${encodeURIComponent('Crave Order')}`,
      logo: (
        <svg viewBox="0 0 24 24" className="size-4 shrink-0" fill="none">
          <rect width="24" height="24" rx="6" fill="#121815" />
          <path d="M6 12l4.5-7.5h4.5l-4.5 7.5 4.5 7.5h-4.5L6 12z" fill="#097939" />
          <path d="M12 12l4.5-7.5h4.5l-4.5 7.5 4.5 7.5h-4.5L12 12z" fill="#ED752E" />
        </svg>
      ),
    },
  ]

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0c120e] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="mx-auto size-10 border-3 border-[#d9f447]/30 border-t-[#121815] dark:border-t-[#d9f447] rounded-full animate-spin" />
          <p className="mt-4 text-xs font-bold text-[#121815] dark:text-white">
            Loading your cart...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafbfa] dark:bg-[#0a100c] text-[#121815] dark:text-stone-100 flex flex-col justify-between selection:bg-[#d9f447] selection:text-[#121815] relative">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 -z-10 h-[560px] w-full max-w-6xl bg-gradient-to-b from-[#d9f447]/12 via-[#d9f447]/3 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(#121815_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.025] dark:opacity-[0.035]" />

      <Navbar />

      <main className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6 lg:px-8 flex-1 pb-44 sm:pb-48 lg:pb-16">
        {/* Top Header & Simple 3-Step Tracker */}
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

          {/* Stepper Progress Bar removed per request */}
        </div>

        {/* Order Success Banner */}
        {orderSuccess && (
          <div className="mt-8 rounded-3xl bg-[#121815] dark:bg-[#141f17] border border-[#d9f447]/30 p-8 sm:p-12 text-white shadow-2xl text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 size-80 rounded-full bg-[#d9f447]/15 blur-[100px] pointer-events-none" />
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#d9f447] text-[#121815] shadow-lg mb-4">
              <Check className="size-8 stroke-[3]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Order Placed Successfully!
            </h2>
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
                    {/* Restaurant Origin Header */}
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

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          20-25 mins delivery
                        </span>
                      </div>
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
                                ₹{item.price}{' '}
                                <span className="text-[10px] font-normal text-stone-400">each</span>
                              </p>
                            </div>
                          </div>

                          {/* Stepper + Subtotal */}
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

                    {/* Inline Add Address Form when opened */}
                    {isAddingAddressInline && (
                      <div className="mb-6 rounded-2xl border border-black/10 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.03] p-4 sm:p-5 space-y-4 animate-in fade-in duration-200">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-[#121815] dark:text-white flex items-center gap-2">
                            <Plus className="size-3.5 text-[#5e8210] dark:text-[#d9f447]" />
                            <span>New Delivery Address</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsAddingAddressInline(false)}
                            className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                          >
                            <X className="size-4" />
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <label className="text-[11px] font-bold text-stone-500 dark:text-stone-400">
                            Save as:
                          </label>
                          {['Home', 'Work', 'Other'].map((lbl) => (
                            <button
                              key={lbl}
                              type="button"
                              onClick={() => setNewAddressLabel(lbl)}
                              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition border flex items-center gap-1.5 ${
                                newAddressLabel === lbl
                                  ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] border-transparent shadow-xs'
                                  : 'bg-white dark:bg-[#18201c] text-stone-700 dark:text-stone-300 border-black/10 dark:border-white/10 hover:border-black/20'
                              }`}
                            >
                              {lbl === 'Home' ? (
                                <Home className="size-3" />
                              ) : lbl === 'Work' ? (
                                <Briefcase className="size-3" />
                              ) : (
                                <Building className="size-3" />
                              )}
                              <span>{lbl}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          type="button"
                          disabled={isGpsDetecting}
                          onClick={handleDetectGpsInCart}
                          className="w-full flex items-center justify-between rounded-xl bg-[#5e8210]/10 dark:bg-[#d9f447]/10 border border-[#5e8210]/20 dark:border-[#d9f447]/20 px-3.5 py-2 text-[#5e8210] dark:text-[#d9f447] text-xs font-bold hover:bg-[#5e8210]/15 transition"
                        >
                          <span className="flex items-center gap-2">
                            <LocateFixed className="size-3.5" />
                            <span>
                              {isGpsDetecting
                                ? 'Detecting location...'
                                : 'Use Current Location (GPS)'}
                            </span>
                          </span>
                          <span className="text-[10px] uppercase font-mono tracking-wider">
                            AUTO-FILL
                          </span>
                        </button>

                        <div>
                          <label className="text-[11px] font-bold text-stone-600 dark:text-stone-300 block mb-1.5">
                            Full Address Details *
                          </label>
                          <textarea
                            rows={2}
                            value={newAddressText}
                            onChange={(e) => setNewAddressText(e.target.value)}
                            placeholder="Flat / House No., Building Name, Street, Area, Landmark"
                            className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setIsAddingAddressInline(false)}
                            className="rounded-xl px-4 py-2 text-xs font-bold text-stone-600 dark:text-stone-400 hover:bg-black/5 dark:hover:bg-white/5 transition"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isSavingAddress || !newAddressText.trim()}
                            onClick={() => handleSaveNewAddress()}
                            className="rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-5 py-2 text-xs font-black shadow-xs hover:opacity-90 transition disabled:opacity-50"
                          >
                            {isSavingAddress ? 'Saving...' : 'Save & Deliver Here'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Saved Address Cards Grid */}
                    <div className="mb-4">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
                        Select Delivery Address:
                      </label>
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
                                  setDetectedCoords({
                                    lat: Number(addr.latitude),
                                    lng: Number(addr.longitude),
                                  })
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
                                  <p className="text-xs font-black text-[#121815] dark:text-white">
                                    {addr.label}
                                  </p>
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

                        {/* Prominent "+ Add Address" card right inside the grid */}
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

                        {/* Live Delivery Serviceability Feedback */}
                        {deliveryServiceability && (
                          <div className="mt-2">
                            {!deliveryServiceability.isServiceable ? (
                              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                                <AlertTriangle className="size-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                                <div>
                                  <p className="font-extrabold">
                                    Delivery Not Available at This Location
                                  </p>
                                  <p className="text-[11px] mt-0.5 opacity-90">
                                    {deliveryServiceability.reason}
                                  </p>
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
                        <p className="text-[10px] text-stone-400 mt-1">
                          Delivery partner will call this number on arrival.
                        </p>
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

                        {/* Quick-Apply Coupon Chips */}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <span className="text-[11px] font-bold text-stone-400">Available:</span>
                          {availableCoupons.slice(0, 3).map((cpn) => (
                            <button
                              key={cpn.code}
                              type="button"
                              onClick={() => handleApplyCouponCode(cpn.code)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-3 py-1 text-[11px] font-bold text-[#121815] dark:text-white hover:border-[#5e8210] dark:hover:border-[#d9f447] transition"
                            >
                              <span className="font-mono text-[#5e8210] dark:text-[#d9f447] font-black">
                                {cpn.code}
                              </span>
                              <span className="text-stone-400 font-normal">
                                {cpn.discountType === 'percentage'
                                  ? `${cpn.discountValue}% OFF`
                                  : `₹${cpn.discountValue} OFF`}
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
                /* Empty Cart State */
                <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/90 dark:bg-[#131b16]/90 p-8 sm:p-14 text-center shadow-[0_15px_40px_rgba(0,0,0,0.03)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                  <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-[#d9f447]/20 text-[#121815] dark:text-[#d9f447] mb-5 shadow-sm">
                    <ShoppingCart className="size-10 text-[#5e8210] dark:text-[#d9f447]" />
                  </div>
                  <h2 className="text-2xl font-black text-[#121815] dark:text-white tracking-tight">
                    Your Cart is Empty
                  </h2>
                  <p className="mt-2 text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto leading-relaxed font-medium">
                    Looks like you haven&apos;t added anything to your cart yet. Explore delicious
                    dishes from nearby restaurants!
                  </p>
                  <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
                    <Link
                      href="/user/dashboard"
                      className="w-full sm:w-auto flex-1 rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-7 py-3.5 text-xs font-black shadow-lg hover:opacity-90 active:scale-95 transition text-center"
                    >
                      Explore Restaurants
                    </Link>
                    <Link
                      href="/user/dashboard"
                      className="w-full sm:w-auto flex-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-7 py-3.5 text-xs font-black text-[#121815] dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition text-center"
                    >
                      Browse Menu
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Premium Bill Details & UPI Payment */}
            {cart.length > 0 && (
              <div
                id="payment-section"
                className="space-y-6 lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24"
              >
                {/* Premium Bill Details Card */}
                <div className="rounded-3xl border border-black/[0.07] dark:border-white/10 bg-white/95 dark:bg-[#131b16]/95 p-5 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/10 mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-[#5e8210] dark:text-[#d9f447]">
                        <Receipt className="size-4" />
                      </div>
                      <h2 className="text-base font-extrabold text-[#121815] dark:text-white">
                        Bill Details
                      </h2>
                    </div>
                    <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                      INR (₹)
                    </span>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Item Total */}
                    <div className="flex justify-between text-stone-600 dark:text-stone-300">
                      <span>
                        Item Total ({totalCount} {totalCount === 1 ? 'item' : 'items'})
                      </span>
                      <span className="font-extrabold text-[#121815] dark:text-white">
                        ₹{cartSubtotal}
                      </span>
                    </div>

                    {/* Delivery Fee */}
                    <div className="flex justify-between text-stone-600 dark:text-stone-300 items-center">
                      <span>Delivery Fee</span>
                      {pricingBreakdown.isFreeDelivery ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs uppercase">
                          FREE
                        </span>
                      ) : (
                        <span className="font-extrabold text-[#121815] dark:text-white">
                          ₹{deliveryFee}
                        </span>
                      )}
                    </div>

                    {/* Packaging Fee (Only if configured > 0 in admin) */}
                    {packagingFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Packaging Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">
                          ₹{packagingFee}
                        </span>
                      </div>
                    )}

                    {/* Platform Fee (Only if configured > 0 in admin) */}
                    {platformFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Platform Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">
                          ₹{platformFee}
                        </span>
                      </div>
                    )}

                    {/* Handling Fee (Only if configured > 0 in admin) */}
                    {handlingFee > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Handling Fee</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">
                          ₹{handlingFee}
                        </span>
                      </div>
                    )}

                    {/* Taxes & GST (Only if > 0) */}
                    {exactGstValue > 0 && (
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Taxes &amp; GST</span>
                        <span className="font-extrabold text-[#121815] dark:text-white">
                          ₹{formatPrice(exactGstValue)}
                        </span>
                      </div>
                    )}

                    {/* Applied Coupon Savings */}
                    {appliedCoupon && couponDiscount > 0 && (
                      <div className="flex justify-between font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20">
                        <span>Coupon Discount ({appliedCoupon.code})</span>
                        <span>-₹{couponDiscount}</span>
                      </div>
                    )}

                    {/* Total To Pay (NEVER ROUNDED OFF) */}
                    <div className="pt-4 border-t-2 border-dashed border-black/10 dark:border-white/10 flex items-baseline justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-[#121815] dark:text-white">
                          Total to Pay
                        </p>
                        <p className="text-[10px] text-stone-400">Incl. all taxes and charges</p>
                      </div>
                      <span className="text-2xl sm:text-3xl font-black tracking-tight text-[#121815] dark:text-[#d9f447]">
                        ₹{formatPrice(exactNetPayable)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Panel Container */}
                  <div className="mt-6 pt-5 border-t border-black/[0.06] dark:border-white/10 space-y-4">
                    {activeConfig?.razorpayEnabled ? (
                      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-4 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold text-[#121815] dark:text-white">
                            Razorpay Online Checkout
                          </p>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                            Instant Verification
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          UPI (Google Pay, PhonePe, Paytm), Debit &amp; Credit Cards, Net Banking &amp; Wallets.
                        </p>
                        <p className="text-[11px] font-medium text-stone-400 dark:text-stone-500 pt-1 border-t border-black/[0.04] dark:border-white/5">
                          No manual UTR required — payment is verified automatically by the gateway.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-black/[0.06] dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] p-4 text-xs space-y-3.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] grid place-items-center">
                              <QrCode className="size-4" />
                            </div>
                            <div>
                              <p className="text-xs font-extrabold text-[#121815] dark:text-white">
                                Pay via UPI
                              </p>
                              <p className="text-[10px] text-stone-400">
                                UPI ID: {activeConfig.upiVpa || 'crave@upi'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleCopyUpi}
                            className="flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#18201c] border border-black/10 dark:border-white/10 px-3 py-1.5 text-[11px] font-bold text-[#121815] dark:text-white shadow-2xs hover:bg-black/5 dark:hover:bg-white/10 transition"
                          >
                            {copiedUpi ? (
                              <Check className="size-3 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Copy className="size-3" />
                            )}
                            <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                          </button>
                        </div>

                        {/* Official UPI App Buttons with Real Logos */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-2">
                            Pay using UPI app:
                          </p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {upiApps.map((app) => (
                              <a
                                key={app.name}
                                href={app.scheme}
                                className="rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] p-2 text-center hover:border-black/30 dark:hover:border-white/30 transition shadow-2xs group flex flex-col items-center justify-center gap-1 min-h-[54px]"
                              >
                                <div className="group-hover:scale-110 transition shrink-0">
                                  {app.logo}
                                </div>
                                <span className="text-[10px] font-bold text-[#121815] dark:text-white truncate">
                                  {app.shortName}
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>

                        {/* 12-Digit UTR Reference Input */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                              UPI Reference / UTR Number <span className="text-rose-500">*</span>
                            </label>
                            <span className="text-[10px] font-mono text-stone-400">
                              {utrRef.length}/10+
                            </span>
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Enter 12-digit UTR from your payment app"
                            value={utrRef}
                            onChange={(e) =>
                              setUtrRef(e.target.value.replace(/\D/g, '').slice(0, 25))
                            }
                            className="w-full rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-4 py-2.5 text-xs font-black font-mono text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
                          />
                          {utrRef.trim().length < 10 ? (
                            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1 font-medium">
                              Pay in your UPI app, then enter the 12-digit UTR to confirm your
                              order.
                            </p>
                          ) : (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1 flex items-center gap-1">
                              <CheckCircle2 className="size-3" />
                              <span>
                                Valid UTR format confirmed ({utrRef.trim().length} digits)
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Place Order CTA */}
                    <form onSubmit={handlePlaceOrder} id="checkout-action-section">
                      <button
                        type="submit"
                        disabled={
                          isSubmittingOrder ||
                          (!activeConfig?.razorpayEnabled && utrRef.trim().length < 10)
                        }
                        className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#121815] dark:bg-[#d9f447] py-4 px-6 text-sm font-bold text-[#d9f447] dark:text-[#121815] shadow-xl hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {isSubmittingOrder ? (
                          <CraveButtonLoader
                            label={activeConfig?.razorpayEnabled ? "Connecting to Razorpay..." : "Placing your order..."}
                            sublabel={activeConfig?.razorpayEnabled ? "Opening secure gateway modal" : "Sending details to restaurant"}
                            variant="dark"
                            size="md"
                          />
                        ) : (
                          <>
                            <span>
                              {activeConfig?.razorpayEnabled
                                ? `Pay ₹${formatPrice(exactNetPayable)} via Razorpay`
                                : `Place Order (₹${formatPrice(exactNetPayable)})`}
                            </span>
                            <ArrowRight className="size-4" />
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Sticky Mobile Checkout Bar */}
      {cart.length > 0 && !orderSuccess && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] left-4 right-4 z-40 lg:hidden animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center justify-between rounded-2xl bg-[#121815] dark:bg-[#d9f447] p-4 shadow-2xl border border-black/10 dark:border-black/20 backdrop-blur-md">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-700">
                {totalCount} {totalCount === 1 ? 'item' : 'items'} &bull; Total to Pay
              </p>
              <p className="text-lg font-black text-[#d9f447] dark:text-[#121815]">
                ₹{formatPrice(exactNetPayable)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const target = document.getElementById('checkout-action-section')
                if (target) {
                  target.scrollIntoView({ behavior: 'smooth' })
                }
              }}
              className="rounded-xl bg-[#d9f447] dark:bg-[#121815] text-[#121815] dark:text-[#d9f447] px-4 py-2 text-xs font-black flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <span>{activeConfig?.razorpayEnabled ? 'Pay via Razorpay' : 'Proceed to Pay'}</span>
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
                  <h3
                    id="coupons-modal-title"
                    className="text-base font-black text-[#121815] dark:text-white"
                  >
                    Available Coupons &amp; Offers
                  </h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Select a coupon to apply instant discount
                  </p>
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
                <div className="text-center py-8 text-xs text-stone-400">
                  No coupons currently available.
                </div>
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
                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1.5 font-medium">
                            {coupon.description}
                          </p>
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
                              if (cartSubtotal >= coupon.minOrderAmount) {
                                setShowCouponsModal(false)
                              }
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

      {/* Production-Grade Swiggy/Zomato Add & Manage Address Modal */}
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

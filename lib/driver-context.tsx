'use client'

import { useAuth } from '@/lib/auth-context'
import { useWebSocket, playChimeSound, publishLiveEvent } from '@/lib/websocket'
import { calculateCheckoutPricing } from '@/lib/distance-pricing'
import { calculateHaversineDistanceKm } from '@/lib/utils'
import CustomAlertModal from '@/components/CustomAlertModal'
import React, { createContext, useContext, useEffect, useState } from 'react'

// Default coordinates for fallback (Koramangala, Bengaluru)
const DEFAULT_DRIVER_LAT = 12.679898
const DEFAULT_DRIVER_LNG = 77.469493
const DEFAULT_RESTAURANT_LAT = 12.9352
const DEFAULT_RESTAURANT_LNG = 77.6245

/**
 * Creates a broadcast order offer from an order target
 * Shared utility to eliminate duplicate code between WebSocket listener and polling
 */
function createBroadcastOfferFromOrder(
  target: any,
  driverGpsCoords?: number[] | null
): BroadcastOrderOffer | null {
  if (!target || !target.id) return null
  if (
    !target.id ||
    (target.status !== 'ready_for_pickup' && target.status !== 'ready') ||
    (target.driver_name &&
      target.driver_name !== 'Unassigned' &&
      target.driver_name !== 'Unassigned Driver')
  ) {
    return null
  }

  const driverLat = driverGpsCoords ? driverGpsCoords[0] : DEFAULT_DRIVER_LAT
  const driverLng = driverGpsCoords ? driverGpsCoords[1] : DEFAULT_DRIVER_LNG
  const distKm = calculateHaversineDistanceKm(
    driverLat,
    driverLng,
    DEFAULT_RESTAURANT_LAT,
    DEFAULT_RESTAURANT_LNG
  )

  let itemsArr: any[] = []
  try {
    itemsArr = typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
  } catch (e) {}

  const realOtp = target.delivery_otp || (Array.isArray(itemsArr) && itemsArr[0]?.otp) || ''
  const { basePayout, surgeBonus, tip: tipVal } = getDriverPayoutDetails(target)

  return {
    id: target.id,
    orderNumber: `#${target.id.slice(0, 8)}`,
    restaurantName: target.restaurant_name || 'Crave Kitchen Store',
    restaurantAddress: target.customer_address
      ? `Kitchen near ${target.customer_address}`
      : 'Koramangala 5th Block, Bengaluru',
    customerName: target.customer_name || 'Customer',
    customerAddress: target.customer_address || 'Indiranagar 100ft Rd',
    basePayout,
    surgeBonus,
    tip: tipVal,
    distance: `${distKm || 1.8} km`,
    itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
    customerPhone: target.customer_phone || undefined,
    otp: String(realOtp),
  }
}

export interface CustomAlertOptions {
  title?: string
  message: string
  variant?: 'warning' | 'info' | 'error' | 'success'
  actionLabel?: string
  actionPath?: string
}

export interface BroadcastOrderOffer {
  id: string
  orderNumber: string
  restaurantName: string
  restaurantAddress: string
  customerName: string
  customerAddress: string
  basePayout: number
  surgeBonus: number
  tip: number
  distance: string
  itemsCount: number
  customerPhone?: string
  otp?: string
  restaurantLat?: number
  restaurantLng?: number
  customerLat?: number
  customerLng?: number
}

export interface DeliveryTask {
  id: string
  orderNumber: string
  restaurantName: string
  restaurantAddress: string
  customerName: string
  customerAddress: string
  customerPhone: string
  basePayout?: number
  surgeBonus?: number
  payout: number
  tip: number
  distance: string
  step: 'assigned' | 'at_restaurant' | 'picked_up' | 'arrived_customer'
  otp?: string
  restaurantLat?: number
  restaurantLng?: number
  customerLat?: number
  customerLng?: number
}

export interface CompletedTripItem {
  id: string
  order: string
  restaurant: string
  customer: string
  baseEarnings: number
  surge: number
  tip: number
  total: number
  time: string
  distance: string
}

export interface SavedUpiItem {
  id: string
  vpa: string
  bankName: string
  isPrimary: boolean
  isVerified: boolean
}

export interface PayoutLogItem {
  id: string
  amount: number
  date: string
  status: string
}

interface DriverContextType {
  isOnline: boolean
  setIsOnline: React.Dispatch<React.SetStateAction<boolean>>
  activeTask: DeliveryTask | null
  setActiveTask: React.Dispatch<React.SetStateAction<DeliveryTask | null>>
  broadcastOffer: BroadcastOrderOffer | null
  setBroadcastOffer: React.Dispatch<React.SetStateAction<BroadcastOrderOffer | null>>
  offerTimer: number
  setOfferTimer: React.Dispatch<React.SetStateAction<number>>
  completedTrips: CompletedTripItem[]
  savedUpiList: SavedUpiItem[]
  payoutLogs: PayoutLogItem[]
  driverGpsCoords: [number, number] | null
  gpsStatus: 'idle' | 'acquiring' | 'connected' | 'denied' | 'error'
  gpsPermissionState: 'granted' | 'prompt' | 'denied' | 'unknown'
  gpsAccuracy: number | null
  lastGpsUpdate: string
  isBackgroundWorkerActive: boolean
  workerLastSyncTime: string
  backgroundSyncIntervalMs: number
  setBackgroundSyncIntervalMs: (ms: number) => void
  completedSummaryModal: CompletedTripItem | null
  setCompletedSummaryModal: React.Dispatch<React.SetStateAction<CompletedTripItem | null>>
  showCustomAlert: (opts: CustomAlertOptions) => void
  requestMobileGps: () => void
  triggerSimulatedOffer: () => void
  acceptBroadcastOffer: () => void
  advanceStep: () => void
  completeDelivery: (otpInput?: string) => { success: boolean; message: string }
  handleAddUpiId: (vpa: string, provider: string) => void
  setPrimaryUpi: (id: string) => void
  deleteUpiId: (id: string) => void
  handleInstantCashout: (amount: number) => boolean
}

const DriverContext = createContext<DriverContextType | undefined>(undefined)

export function getDriverPayoutDetails(order: any): {
  basePayout: number
  surgeBonus: number
  tip: number
  totalDriverPayout: number
} {
  if (!order) {
    return { basePayout: 24, surgeBonus: 0, tip: 0, totalDriverPayout: 24 }
  }

  let itemsArr: any[] = []
  try {
    itemsArr = typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
  } catch (e) {}

  const storedBreakdown =
    order.pricing_breakdown || (itemsArr.length > 0 && itemsArr[0]?.billing_breakdown) || null

  const tip = Number(order.tip || order.tip_amount || storedBreakdown?.tip || 0)

  // 1. Direct driver_payout from DB column or stored breakdown
  if (
    order.driver_payout != null &&
    !isNaN(Number(order.driver_payout)) &&
    Number(order.driver_payout) > 0
  ) {
    const totalDriverPayout = Number(order.driver_payout)
    const basePayout = Number(
      storedBreakdown?.driver_base_payout ?? Math.max(0, totalDriverPayout - tip)
    )
    const surgeBonus = Number(storedBreakdown?.driver_surge_payout ?? 0)
    return { basePayout, surgeBonus, tip, totalDriverPayout }
  }

  if (
    storedBreakdown &&
    (storedBreakdown.driver_payout != null || storedBreakdown.totalDriverEarnings != null)
  ) {
    const totalDriverPayout = Number(
      storedBreakdown.driver_payout ?? storedBreakdown.totalDriverEarnings
    )
    const basePayout = Number(
      storedBreakdown.driver_base_payout ?? Math.max(0, totalDriverPayout - tip)
    )
    const surgeBonus = Number(storedBreakdown.driver_surge_payout ?? 0)
    return { basePayout, surgeBonus, tip, totalDriverPayout }
  }

  // 2. Fallback to calculation using food subtotal (not total_amount)
  const foodSubtotal = Number(
    order.subtotal ||
      storedBreakdown?.subtotal ||
      (order.total_amount ? Math.round(order.total_amount * 0.75) : 250)
  )
  const roadKm = Number(order.distance_km || order.distance || 1.8)
  const pricing = calculateCheckoutPricing({
    cartSubtotal: foodSubtotal,
    roadDistanceKm: roadKm,
  })
  const dEarn = pricing.driverEarnings || {
    baseDistanceShare: 24,
    extraDistanceShare: 0,
    surgeRainShare: 0,
    totalDriverEarnings: 24,
  }

  const basePayout = dEarn.baseDistanceShare + dEarn.extraDistanceShare
  const surgeBonus = dEarn.surgeRainShare
  const totalDriverPayout = dEarn.totalDriverEarnings

  return { basePayout, surgeBonus, tip, totalDriverPayout }
}

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null)
  const [broadcastOffer, setBroadcastOffer] = useState<BroadcastOrderOffer | null>(null)
  const [offerTimer, setOfferTimer] = useState(15)

  // Real Mobile GPS (null by default until acquired from device)
  const [driverGpsCoords, setDriverGpsCoords] = useState<[number, number] | null>(null)
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'acquiring' | 'connected' | 'denied' | 'error'
  >('idle')
  const [gpsPermissionState, setGpsPermissionState] = useState<
    'granted' | 'prompt' | 'denied' | 'unknown'
  >('unknown')
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(12)
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string>('Just now')

  // Background Web Worker & Sync State
  const [isBackgroundWorkerActive, setIsBackgroundWorkerActive] = useState<boolean>(false)
  const [workerLastSyncTime, setWorkerLastSyncTime] = useState<string>('Never')
  const [backgroundSyncIntervalMs, setBackgroundSyncIntervalMs] = useState<number>(3000)
  const workerRef = React.useRef<Worker | null>(null)
  const isStepAdvancingRef = React.useRef(false)
  const isAcceptingOfferRef = React.useRef(false)
  const [completedSummaryModal, setCompletedSummaryModal] = useState<CompletedTripItem | null>(null)

  // Completed Trips
  const [completedTrips, setCompletedTrips] = useState<CompletedTripItem[]>([])

  // UPI Saved List
  const [savedUpiList, setSavedUpiList] = useState<SavedUpiItem[]>([])

  // Payout Logs
  const [payoutLogs, setPayoutLogs] = useState<PayoutLogItem[]>([])

  // Load Driver Profile Data (Orders, UPI, Payouts) from DB
  useEffect(() => {
    if (!user?.id) return

    const loadDriverData = async () => {
      try {
        // 1. Fetch Orders (active task & completed trips)
        const ordersRes = await fetch(`/api/driver/orders?driverId=${user.id}`)
        const ordersJson = await ordersRes.json()
        if (ordersJson.success) {
          if (ordersJson.completedTrips && Array.isArray(ordersJson.completedTrips)) {
            setCompletedTrips(ordersJson.completedTrips)
          }
          if (ordersJson.activeOrder && !activeTask) {
            const o = ordersJson.activeOrder
            let step: 'assigned' | 'at_restaurant' | 'picked_up' | 'arrived_customer' = 'assigned'
            if (o.status === 'ready_for_pickup') step = 'at_restaurant'
            else if (o.status === 'picked_up') step = 'picked_up'
            else if (o.status === 'out_for_delivery') step = 'arrived_customer'

            let itemsArr: any[] = []
            try {
              itemsArr = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || []
            } catch (e) {}

            const {
              basePayout,
              surgeBonus,
              tip: tipVal,
              totalDriverPayout,
            } = getDriverPayoutDetails(o)

            setActiveTask({
              id: o.id,
              orderNumber: `#${o.id.slice(0, 8)}`,
              restaurantName: o.restaurant_name || 'Crave Kitchen',
              restaurantAddress: o.customer_address
                ? `Kitchen near ${o.customer_address}`
                : 'Koramangala',
              customerName: o.customer_name || 'Customer',
              customerAddress: o.customer_address || 'Indiranagar',
              customerPhone: o.customer_phone || user.phone || '+91 98765 43210',
              basePayout,
              surgeBonus,
              payout: totalDriverPayout,
              tip: tipVal,
              distance: `${o.distance_km || 2.4} km`,
              step,
              otp: String(o.delivery_otp || (Array.isArray(itemsArr) && itemsArr[0]?.otp) || ''),
              restaurantLat: o.restaurant_lat ? Number(o.restaurant_lat) : 12.6817,
              restaurantLng: o.restaurant_lng ? Number(o.restaurant_lng) : 77.4729,
              customerLat: o.customer_lat ? Number(o.customer_lat) : 12.679898,
              customerLng: o.customer_lng ? Number(o.customer_lng) : 77.469493,
            })
          }
        }

        // 2. Fetch UPI Saved Accounts
        const upiRes = await fetch(`/api/driver/upi?driverId=${user.id}`)
        const upiJson = await upiRes.json()
        if (upiJson.success && Array.isArray(upiJson.savedUpiList)) {
          setSavedUpiList(upiJson.savedUpiList)
        }

        // 3. Fetch Payout Logs
        const payoutsRes = await fetch(`/api/driver/payouts?driverId=${user.id}`)
        const payoutsJson = await payoutsRes.json()
        if (payoutsJson.success && Array.isArray(payoutsJson.payoutLogs)) {
          setPayoutLogs(payoutsJson.payoutLogs)
        }
      } catch (err) {
        console.error('Failed to load driver profile data:', err)
      }
    }

    loadDriverData()
  }, [user?.id])

  // Broadcast Offer Timer
  useEffect(() => {
    if (!broadcastOffer) return
    if (offerTimer <= 0) {
      setBroadcastOffer(null)
      return
    }
    const interval = setInterval(() => {
      setOfferTimer((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [broadcastOffer, offerTimer])

  // Sync driver duty status ONLINE/OFFLINE with backend tracker
  useEffect(() => {
    if (!user?.id) return
    fetch('/api/driver/status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        driverId: user.id,
        isOnline,
        status: isOnline ? 'ONLINE' : 'OFFLINE',
      }),
    }).catch(() => {})
  }, [isOnline, user?.id])

  // Live WebSocket listener for instant driver offer dispatch
  useWebSocket({
    channels: ['order_update', 'admin_orders'],
    onMessage: (msg) => {
      if (!isOnline || activeTask || broadcastOffer) return
      if (msg.channel === 'order_update' || msg.channel === 'admin_orders') {
        const data = msg.data as any
        const target = data.order || data
        const offer = createBroadcastOfferFromOrder(target, driverGpsCoords)
        if (offer) {
          playChimeSound()
          setOfferTimer(25)
          setBroadcastOffer(offer)
        }
      }
    },
  })

  // Poll /api/orders for live orders matching driver queue
  useEffect(() => {
    if (!isOnline || activeTask || broadcastOffer) return

    const checkLiveOrders = async () => {
      try {
        const res = await fetch('/api/orders')
        const json = await res.json()

        if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
          // Find active orders needing driver pickup
          const availableOrders = json.orders.filter(
            (o: any) =>
              (o.status === 'ready_for_pickup' || o.status === 'ready') &&
              (!o.driver_name ||
                o.driver_name === 'Unassigned' ||
                o.driver_name === 'Unassigned Driver')
          )

          if (availableOrders.length > 0) {
            const target = availableOrders[availableOrders.length - 1]
            const offer = createBroadcastOfferFromOrder(target, driverGpsCoords)
            if (offer) {
              setOfferTimer(25)
              setBroadcastOffer(offer)
            }
          }
        }
      } catch (err) {
        console.error('Failed to query live orders for driver:', err)
      }
    }

    checkLiveOrders()
  }, [isOnline, activeTask, broadcastOffer, driverGpsCoords])

  // Query Browser Geolocation Permissions API
  useEffect(() => {
    if (typeof window !== 'undefined' && 'permissions' in navigator) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((result) => {
          setGpsPermissionState(result.state as any)
          if (result.state === 'denied') {
            setGpsStatus('denied')
          }
          result.onchange = () => {
            setGpsPermissionState(result.state as any)
            if (result.state === 'granted') {
              setGpsStatus('connected')
            } else if (result.state === 'denied') {
              setGpsStatus('denied')
            }
          }
        })
        .catch(() => {})
    }
  }, [])

  // Register Service Worker & Web Worker for background GPS telemetry sync
  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/workers/sw-background.js', { scope: '/' })
        .then(() => {})
        .catch(() => {})
    }

    try {
      const worker = new Worker('/workers/driver/location-stream.worker.js')
      workerRef.current = worker

      worker.onmessage = (e) => {
        if (e.data?.type === 'LIVE_STREAM_SUCCESS' || e.data?.type === 'LIVE_STREAM_EMIT') {
          setIsBackgroundWorkerActive(true)
          setWorkerLastSyncTime(
            new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          )
        }
      }

      if (user?.id && isOnline) {
        worker.postMessage({
          type: 'INIT',
          payload: {
            driverId: user.id,
            orderId: activeTask?.id || undefined,
            lat: driverGpsCoords ? driverGpsCoords[0] : null,
            lng: driverGpsCoords ? driverGpsCoords[1] : null,
            isOnline,
          },
        })
      }
    } catch (err) {
      console.warn('Web Worker setup warning:', err)
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'STOP' })
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [user?.id, isOnline, backgroundSyncIntervalMs])

  // Screen Wake Lock API to prevent mobile browser sleep when app is in background/recent apps
  useEffect(() => {
    if (typeof window === 'undefined' || !isOnline) return

    let wakeLock: any = null
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await (navigator as any).wakeLock.request('screen')
        }
      } catch (err) {}
    }

    requestWakeLock()

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      if (wakeLock) wakeLock.release?.().catch(() => {})
    }
  }, [isOnline])

  // Continuous Driver Mobile Device GPS Location Watcher
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator) || !isOnline) {
      return
    }

    setGpsStatus('acquiring')

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6))
        const lng = parseFloat(position.coords.longitude.toFixed(6))
        setDriverGpsCoords([lat, lng])
        setGpsAccuracy(Math.round(position.coords.accuracy))
        setGpsStatus('connected')
        setGpsPermissionState('granted')
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )

        // Broadcast driver's actual mobile location to system and customer track map
        const activeDriverId = user?.id
        if (!activeDriverId) return
        publishLiveEvent('driver_location', {
          driverId: activeDriverId,
          orderId: activeTask?.id || undefined,
          lat,
          lng,
          status: isOnline ? 'ONLINE' : 'OFFLINE',
        })
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: activeDriverId,
            orderId: activeTask?.id || undefined,
            lat,
            lng,
            status: isOnline ? 'ONLINE' : 'OFFLINE',
          }),
        }).catch(() => {})

        // Relay live position event to dedicated location stream Web Worker
        if (workerRef.current) {
          workerRef.current.postMessage({
            type: 'EVENT_GPS_UPDATE',
            payload: {
              driverId: activeDriverId,
              orderId: activeTask?.id || undefined,
              lat,
              lng,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed,
              heading: position.coords.heading,
              isOnline,
            },
          })
        }
      },
      (err) => {
        console.warn('Driver mobile GPS watch warning:', err)
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
          setGpsPermissionState('denied')
        } else {
          setGpsStatus('error')
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 2000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline, user?.id, activeTask?.id])

  // Custom Alert Modal State
  const [customAlert, setCustomAlert] = useState<{
    isOpen: boolean
    title?: string
    message: string
    variant?: 'warning' | 'info' | 'error' | 'success'
    actionLabel?: string
    actionPath?: string
  }>({
    isOpen: false,
    message: '',
  })

  const showCustomAlert = (opts: CustomAlertOptions) => {
    setCustomAlert({
      isOpen: true,
      title: opts.title || 'Order Queue Notice',
      message: opts.message,
      variant: opts.variant || 'warning',
      actionLabel: opts.actionLabel,
      actionPath: opts.actionPath,
    })
  }

  function requestMobileGps() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      showCustomAlert({
        title: 'Geolocation Unsupported',
        message: 'Geolocation is not supported on this browser or mobile device.',
        variant: 'error',
      })
      return
    }
    setGpsStatus('acquiring')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6))
        const lng = parseFloat(position.coords.longitude.toFixed(6))
        setDriverGpsCoords([lat, lng])
        setGpsAccuracy(Math.round(position.coords.accuracy))
        setGpsStatus('connected')
        setGpsPermissionState('granted')
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )

        const activeDriverId = user?.id
        if (!activeDriverId) return
        publishLiveEvent('driver_location', {
          driverId: activeDriverId,
          orderId: activeTask?.id || undefined,
          lat,
          lng,
          status: 'ONLINE',
        })
        fetch('/api/driver/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driverId: activeDriverId,
            orderId: activeTask?.id || undefined,
            lat,
            lng,
            status: 'ONLINE',
          }),
        }).catch(() => {})
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
          setGpsPermissionState('denied')
          showCustomAlert({
            title: 'GPS Permission Access Blocked',
            message:
              'Location permission was denied. Please tap the lock icon next to the browser URL to allow location permissions so orders can be dispatched to your cockpit.',
            variant: 'error',
          })
        } else {
          setGpsStatus('error')
          showCustomAlert({
            title: 'GPS Position Unavailable',
            message:
              'Unable to acquire high accuracy location. Please ensure device location / GPS services are enabled on your device.',
            variant: 'warning',
          })
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  async function triggerSimulatedOffer() {
    try {
      const res = await fetch('/api/orders')
      const json = await res.json()
      if (json.success && Array.isArray(json.orders) && json.orders.length > 0) {
        const availableOrders = json.orders.filter(
          (o: any) =>
            (o.status === 'ready_for_pickup' || o.status === 'ready') &&
            (!o.driver_name ||
              o.driver_name === 'Unassigned' ||
              o.driver_name === 'Unassigned Driver')
        )
        if (availableOrders.length > 0) {
          const target = availableOrders[availableOrders.length - 1]
          const offer = createBroadcastOfferFromOrder(target, driverGpsCoords)
          if (offer) {
            setOfferTimer(25)
            setBroadcastOffer(offer)
            return
          }
        }
      }
    } catch (e) {}

    // No real customer orders available - trigger custom modal popup
    setBroadcastOffer(null)
    showCustomAlert({
      title: 'No Orders In Queue',
      message:
        'No active real customer orders currently waiting for pickup in the queue. Please place an order as a customer first!',
      variant: 'warning',
      actionLabel: 'Place Order as Customer',
      actionPath: '/user/dashboard',
    })
  }

  async function acceptBroadcastOffer() {
    if (!broadcastOffer || isAcceptingOfferRef.current) return
    isAcceptingOfferRef.current = true

    const realId = broadcastOffer.id
    const driverDisplayName = user?.name || 'Verified Delivery Partner'
    const driverDisplayPhone = user?.phone || '+91 98765 43210'
    const currentLat = driverGpsCoords ? driverGpsCoords[0] : 12.679898
    const currentLng = driverGpsCoords ? driverGpsCoords[1] : 77.469493

    const task: DeliveryTask = {
      id: realId,
      orderNumber: broadcastOffer.orderNumber,
      restaurantName: broadcastOffer.restaurantName,
      restaurantAddress: broadcastOffer.restaurantAddress,
      customerName: broadcastOffer.customerName,
      customerAddress: broadcastOffer.customerAddress,
      customerPhone: broadcastOffer.customerPhone || '+91 98765 43210',
      basePayout: broadcastOffer.basePayout,
      surgeBonus: broadcastOffer.surgeBonus,
      payout: broadcastOffer.basePayout + broadcastOffer.surgeBonus,
      tip: broadcastOffer.tip,
      distance: broadcastOffer.distance,
      step: 'assigned',
      otp: broadcastOffer.otp || '',
      restaurantLat: broadcastOffer.restaurantLat ?? 12.6817,
      restaurantLng: broadcastOffer.restaurantLng ?? 77.4729,
      customerLat: broadcastOffer.customerLat ?? 12.679898,
      customerLng: broadcastOffer.customerLng ?? 77.469493,
    }

    setActiveTask(task)

    try {
      // 1. Post to dedicated driver accept endpoint
      await fetch('/api/driver/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: realId,
          orderId: realId,
          driverId: user?.id || 'driver_partner',
          driver_name: driverDisplayName,
          driver_phone: driverDisplayPhone,
          lat: currentLat,
          lng: currentLng,
        }),
      }).catch(() => {})

      // 2. Patch orders API for standard order status sync
      await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: realId,
          status: 'rider_assigned',
          driver_name: driverDisplayName,
          driver_phone: driverDisplayPhone,
          driver_id: user?.id,
          driver_lat: currentLat,
          driver_lng: currentLng,
        }),
      }).catch(() => {})
    } catch (e) {
      console.error('Failed to update driver assignment:', e)
    } finally {
      isAcceptingOfferRef.current = false
    }

    // Immediately publish driver live GPS position to WebSocket broadcast
    publishLiveEvent('driver_location', {
      driverId: user?.id || 'driver_partner',
      orderId: realId,
      lat: currentLat,
      lng: currentLng,
      status: 'ONLINE',
    })

    setBroadcastOffer(null)
  }

  async function advanceStep() {
    if (!activeTask || isStepAdvancingRef.current) return
    isStepAdvancingRef.current = true

    const driverDisplayName = user?.name || 'Verified Delivery Partner'
    const driverDisplayPhone = user?.phone || '+91 98765 43210'

    try {
      if (activeTask.step === 'assigned') {
        setActiveTask((prev) => (prev ? { ...prev, step: 'at_restaurant' } : null))
        try {
          await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: activeTask.id,
              status: 'ready_for_pickup',
              driver_name: driverDisplayName,
              driver_phone: driverDisplayPhone,
            }),
          })
          publishLiveEvent('order_update', {
            orderId: activeTask.id,
            status: 'ready_for_pickup',
          })
        } catch (e) {}
      } else if (activeTask.step === 'at_restaurant') {
        setActiveTask((prev) => (prev ? { ...prev, step: 'picked_up' } : null))
        try {
          await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: activeTask.id,
              status: 'picked_up',
              driver_name: driverDisplayName,
              driver_phone: driverDisplayPhone,
            }),
          })
          publishLiveEvent('order_update', {
            orderId: activeTask.id,
            status: 'picked_up',
          })
        } catch (e) {}
      } else if (activeTask.step === 'picked_up') {
        setActiveTask((prev) => (prev ? { ...prev, step: 'arrived_customer' } : null))
        try {
          await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: activeTask.id,
              status: 'out_for_delivery',
              driver_name: driverDisplayName,
              driver_phone: driverDisplayPhone,
            }),
          })
          publishLiveEvent('order_update', {
            orderId: activeTask.id,
            status: 'out_for_delivery',
          })
        } catch (e) {}
      }
    } finally {
      isStepAdvancingRef.current = false
    }
  }

  function completeDelivery(otpInput?: string): { success: boolean; message: string } {
    if (!activeTask) return { success: false, message: 'No active delivery task.' }

    const expectedOtp = String(activeTask.otp || '').trim()
    const providedOtp = String(otpInput || '').trim()

    if (expectedOtp && providedOtp && providedOtp !== expectedOtp) {
      return {
        success: false,
        message: `Incorrect OTP (${providedOtp}). Ask customer for the 6-digit Delivery OTP shown on their live tracking screen.`,
      }
    }

    if (expectedOtp && !providedOtp) {
      return {
        success: false,
        message: 'Please enter the Delivery OTP provided by the customer.',
      }
    }

    const basePay = activeTask.basePayout ?? Math.max(0, activeTask.payout - (activeTask.tip || 0))
    const surgePay = activeTask.surgeBonus ?? 0
    const tipPay = activeTask.tip || 0
    const totalEarnings = activeTask.payout || basePay + surgePay + tipPay

    const newTrip: CompletedTripItem = {
      id: `trip_${Date.now()}`,
      order: activeTask.orderNumber,
      restaurant: activeTask.restaurantName,
      customer: activeTask.customerName,
      baseEarnings: basePay,
      surge: surgePay,
      tip: tipPay,
      total: totalEarnings,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: activeTask.distance,
    }

    try {
      fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.id,
          status: 'delivered',
        }),
      }).catch(() => {})

      fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: activeTask.id,
          status: 'completed',
        }),
      }).catch(() => {})

      publishLiveEvent('order_update', {
        orderId: activeTask.id,
        status: 'delivered',
      })

      setCompletedTrips((prev) => [newTrip, ...prev])
      setCompletedSummaryModal(newTrip)
      setActiveTask(null)
      return { success: true, message: 'Delivery completed successfully with OTP handshake!' }
    } catch (e) {
      return { success: false, message: 'Failed to complete delivery' }
    }
  }

  async function handleAddUpiId(vpa: string, provider: string) {
    if (!vpa || !vpa.includes('@')) return
    const newEntry: SavedUpiItem = {
      id: `upi_${Date.now()}`,
      vpa: vpa.trim(),
      bankName: provider,
      isPrimary: savedUpiList.length === 0,
      isVerified: true,
    }
    setSavedUpiList((prev) => [...prev, newEntry])

    try {
      await fetch('/api/driver/upi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user?.id,
          vpa: vpa.trim(),
          bankName: provider,
          isPrimary: savedUpiList.length === 0,
        }),
      })
    } catch (e) {}
  }

  function setPrimaryUpi(id: string) {
    setSavedUpiList((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    )
  }

  async function deleteUpiId(id: string) {
    setSavedUpiList((prev) => prev.filter((item) => item.id !== id))
    try {
      await fetch(`/api/driver/upi?id=${id}`, { method: 'DELETE' })
    } catch (e) {}
  }

  function handleInstantCashout(amount: number) {
    if (amount <= 0) return false
    const primaryVpa = savedUpiList.find((u) => u.isPrimary)?.vpa || 'registered-vpa@upi'
    setPayoutLogs((prev) => [
      {
        id: `tx_${Date.now()}`,
        amount,
        date: 'Just Now',
        status: `Transferred to ${primaryVpa}`,
      },
      ...prev,
    ])

    try {
      fetch('/api/driver/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverId: user?.id,
          amount,
          vpa: primaryVpa,
        }),
      }).catch(() => {})
    } catch (e) {}
    return true
  }

  return (
    <DriverContext.Provider
      value={{
        isOnline,
        setIsOnline,
        activeTask,
        setActiveTask,
        broadcastOffer,
        setBroadcastOffer,
        offerTimer,
        setOfferTimer,
        completedTrips,
        savedUpiList,
        payoutLogs,
        driverGpsCoords,
        gpsStatus,
        gpsPermissionState,
        gpsAccuracy,
        lastGpsUpdate,
        isBackgroundWorkerActive,
        workerLastSyncTime,
        backgroundSyncIntervalMs,
        setBackgroundSyncIntervalMs,
        completedSummaryModal,
        setCompletedSummaryModal,
        showCustomAlert,
        requestMobileGps,
        triggerSimulatedOffer,
        acceptBroadcastOffer,
        advanceStep,
        completeDelivery,
        handleAddUpiId,
        setPrimaryUpi,
        deleteUpiId,
        handleInstantCashout,
      }}
    >
      {children}

      {/* Global Custom Alert Modal Popup */}
      <CustomAlertModal
        isOpen={customAlert.isOpen}
        title={customAlert.title}
        message={customAlert.message}
        variant={customAlert.variant}
        actionLabel={customAlert.actionLabel}
        actionPath={customAlert.actionPath}
        onClose={() => setCustomAlert((prev) => ({ ...prev, isOpen: false }))}
      />
    </DriverContext.Provider>
  )
}

export function useDriver() {
  const context = useContext(DriverContext)
  if (!context) {
    throw new Error('useDriver must be used within a DriverProvider')
  }
  return context
}

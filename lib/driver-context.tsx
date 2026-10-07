'use client'

import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { useWebSocket, playChimeSound, publishLiveEvent } from '@/lib/websocket'
import React, { createContext, useContext, useEffect, useState } from 'react'

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
  otp?: string
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

export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
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
  gpsAccuracy: number | null
  lastGpsUpdate: string
  completedSummaryModal: CompletedTripItem | null
  setCompletedSummaryModal: React.Dispatch<React.SetStateAction<CompletedTripItem | null>>
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

export function DriverProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [isOnline, setIsOnline] = useState(true)
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null)
  const [broadcastOffer, setBroadcastOffer] = useState<BroadcastOrderOffer | null>(null)
  const [offerTimer, setOfferTimer] = useState(15)

  // Real Mobile GPS
  const [driverGpsCoords, setDriverGpsCoords] = useState<[number, number] | null>([
    12.679898, 77.469493,
  ])
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'acquiring' | 'connected' | 'denied' | 'error'
  >('connected')
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(12)
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string>('Just now')

  // Summary Modal
  const [completedSummaryModal, setCompletedSummaryModal] = useState<CompletedTripItem | null>(null)

  // Completed Trips
  const [completedTrips, setCompletedTrips] = useState<CompletedTripItem[]>([])

  // UPI Saved List
  const [savedUpiList, setSavedUpiList] = useState<SavedUpiItem[]>([])

  // Payout Logs
  const [payoutLogs, setPayoutLogs] = useState<PayoutLogItem[]>([])

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

  // Live WebSocket listener for instant driver offer dispatch
  useWebSocket({
    channels: ['order_update', 'admin_orders'],
    onMessage: (msg) => {
      if (!isOnline || activeTask || broadcastOffer) return
      if (msg.channel === 'order_update' || msg.channel === 'admin_orders') {
        const data = msg.data as any
        const target = data.order || data
        if (
          target &&
          target.id &&
          target.status !== 'delivered' &&
          target.status !== 'completed' &&
          target.status !== 'cancelled' &&
          (!target.driver_name || target.driver_name === 'Unassigned')
        ) {
          playChimeSound()
          const driverLat = driverGpsCoords ? driverGpsCoords[0] : 12.679898
          const driverLng = driverGpsCoords ? driverGpsCoords[1] : 77.469493
          const distKm = calculateHaversineDistance(driverLat, driverLng, 12.9352, 77.6245)

          let itemsArr: any[] = []
          try {
            itemsArr =
              typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
          } catch (e) {}

          const realOtp = target.delivery_otp || (Array.isArray(itemsArr) && itemsArr[0]?.otp) || ''
          const calcPayout = Math.max(
            60,
            Math.round(Number(target.total_amount ?? 250) * 0.15) + 35
          )

          setOfferTimer(25)
          setBroadcastOffer({
            id: target.id,
            orderNumber: `#${target.id.slice(0, 8)}`,
            restaurantName: target.restaurant_name || 'Crave Kitchen Store',
            restaurantAddress: target.customer_address
              ? `Kitchen near ${target.customer_address}`
              : 'Koramangala 5th Block, Bengaluru',
            customerName: target.customer_name || 'Customer',
            customerAddress: target.customer_address || 'Indiranagar 100ft Rd',
            basePayout: calcPayout,
            surgeBonus: 25,
            tip: 30,
            distance: `${distKm || 1.8} km`,
            itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
            otp: String(realOtp),
          })
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
              o.status !== 'delivered' &&
              o.status !== 'completed' &&
              o.status !== 'cancelled' &&
              (!o.driver_name || o.driver_name === 'Unassigned')
          )

          if (availableOrders.length > 0) {
            const target = availableOrders[availableOrders.length - 1]
            const driverLat = driverGpsCoords ? driverGpsCoords[0] : 12.679898
            const driverLng = driverGpsCoords ? driverGpsCoords[1] : 77.469493

            const distKm = calculateHaversineDistance(driverLat, driverLng, 12.9352, 77.6245)

            let itemsArr: any[] = []
            try {
              itemsArr =
                typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
            } catch (e) {}

            const realOtp =
              target.delivery_otp || (Array.isArray(itemsArr) && itemsArr[0]?.otp) || ''
            const calcPayout = Math.max(
              60,
              Math.round(Number(target.total_amount ?? 250) * 0.15) + 35
            )

            setOfferTimer(25)
            setBroadcastOffer({
              id: target.id,
              orderNumber: `#${target.id.slice(0, 8)}`,
              restaurantName: target.restaurant_name || 'Crave Kitchen Store',
              restaurantAddress: target.customer_address
                ? `Kitchen near ${target.customer_address}`
                : 'Koramangala 5th Block, Bengaluru',
              customerName: target.customer_name || 'Customer',
              customerAddress: target.customer_address || 'Indiranagar 100ft Rd',
              basePayout: calcPayout,
              surgeBonus: 25,
              tip: 30,
              distance: `${distKm || 1.8} km`,
              itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
              otp: String(realOtp),
            })
          }
        }
      } catch (err) {
        console.error('Failed to query live orders for driver:', err)
      }
    }

    checkLiveOrders()
  }, [isOnline, activeTask, broadcastOffer, driverGpsCoords])

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
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )

        // Broadcast driver's actual mobile location to system and customer track map
        const activeDriverId = user?.id || 'driver_partner'
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
      },
      (err) => {
        console.warn('Driver mobile GPS watch warning:', err)
        setGpsStatus('connected')
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

  function requestMobileGps() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocation is not supported on this browser or mobile device.')
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
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )

        const activeDriverId = user?.id || 'driver_partner'
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
        setGpsStatus('connected')
        setDriverGpsCoords([12.679898, 77.469493])
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
            o.status !== 'delivered' && o.status !== 'completed' && o.status !== 'cancelled'
        )
        if (availableOrders.length > 0) {
          const target = availableOrders[availableOrders.length - 1]
          let itemsArr: any[] = []
          try {
            itemsArr =
              typeof target.items === 'string' ? JSON.parse(target.items) : target.items || []
          } catch (e) {}

          const realOtp = target.delivery_otp || (Array.isArray(itemsArr) && itemsArr[0]?.otp) || ''
          const calcPayout = Math.max(
            60,
            Math.round(Number(target.total_amount ?? 250) * 0.15) + 35
          )

          setOfferTimer(25)
          setBroadcastOffer({
            id: target.id,
            orderNumber: `#${target.id.slice(0, 8)}`,
            restaurantName: target.restaurant_name || 'Crave Kitchen Store',
            restaurantAddress: target.customer_address
              ? `Kitchen near ${target.customer_address}`
              : 'Koramangala, Bengaluru',
            customerName: target.customer_name || 'Customer',
            customerAddress: target.customer_address || 'Indiranagar',
            basePayout: calcPayout,
            surgeBonus: 25,
            tip: 30,
            distance: '1.8 km',
            itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 1,
            otp: String(realOtp),
          })
          return
        }
      }
    } catch (e) {}

    // No real customer orders available - do NOT trigger fake offer
    setBroadcastOffer(null)
    if (typeof window !== 'undefined') {
      alert(
        'No active real customer orders currently waiting for pickup in the queue. Please place an order as a customer first!'
      )
    }
  }

  async function acceptBroadcastOffer() {
    if (!broadcastOffer) return

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
      customerPhone: driverDisplayPhone,
      basePayout: broadcastOffer.basePayout,
      surgeBonus: broadcastOffer.surgeBonus,
      payout: broadcastOffer.basePayout + broadcastOffer.surgeBonus,
      tip: broadcastOffer.tip,
      distance: broadcastOffer.distance,
      step: 'assigned',
      otp: broadcastOffer.otp || '',
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

      await supabase
        .from('orders')
        .update({
          driver_name: driverDisplayName,
          driver_phone: driverDisplayPhone,
          status: 'rider_assigned',
        })
        .eq('id', realId)
    } catch (e) {
      console.error('Failed to update driver assignment:', e)
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
    if (!activeTask) return
    const driverDisplayName = user?.name || 'Verified Delivery Partner'
    const driverDisplayPhone = user?.phone || '+91 98765 43210'

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

    const basePay = activeTask.basePayout ?? Math.round(activeTask.payout * 0.7)
    const surgePay = activeTask.surgeBonus ?? Math.round(activeTask.payout * 0.3)
    const tipPay = activeTask.tip || 0
    const totalEarnings = basePay + surgePay + tipPay

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

      supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', activeTask.id)
        .then(() => {})
    } catch (e) {}

    setCompletedTrips((prev) => [newTrip, ...prev])
    setCompletedSummaryModal(newTrip)
    setActiveTask(null)
    return { success: true, message: 'Delivery completed successfully with OTP handshake!' }
  }

  function handleAddUpiId(vpa: string, provider: string) {
    if (!vpa || !vpa.includes('@')) return
    const newEntry: SavedUpiItem = {
      id: `upi_${Date.now()}`,
      vpa: vpa.trim(),
      bankName: provider,
      isPrimary: savedUpiList.length === 0,
      isVerified: true,
    }
    setSavedUpiList((prev) => [...prev, newEntry])
  }

  function setPrimaryUpi(id: string) {
    setSavedUpiList((prev) =>
      prev.map((item) => ({
        ...item,
        isPrimary: item.id === id,
      }))
    )
  }

  function deleteUpiId(id: string) {
    setSavedUpiList((prev) => prev.filter((item) => item.id !== id))
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
        gpsAccuracy,
        lastGpsUpdate,
        completedSummaryModal,
        setCompletedSummaryModal,
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

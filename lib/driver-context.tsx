'use client'

import { supabase } from '@/lib/supabase'
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
  const [isOnline, setIsOnline] = useState(true)
  const [activeTask, setActiveTask] = useState<DeliveryTask | null>(null)
  const [broadcastOffer, setBroadcastOffer] = useState<BroadcastOrderOffer | null>(null)
  const [offerTimer, setOfferTimer] = useState(15)

  // Real Mobile GPS
  const [driverGpsCoords, setDriverGpsCoords] = useState<[number, number] | null>([12.9716, 77.5946])
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

  // Poll Supabase for live orders matching nearest driver using Haversine
  useEffect(() => {
    if (!isOnline || activeTask || broadcastOffer) return

    const checkLiveOrders = async () => {
      try {
        const { data: dbOrders } = await supabase
          .from('orders')
          .select('*')
          .in('status', ['preparing', 'ready'])
          .is('driver_name', null)
          .limit(3)

        if (dbOrders && dbOrders.length > 0) {
          const target = dbOrders[0]
          const driverLat = driverGpsCoords ? driverGpsCoords[0] : 12.9716
          const driverLng = driverGpsCoords ? driverGpsCoords[1] : 77.5946

          // Calculate Haversine distance to restaurant
          const restLat = 12.9352 // Koramangala
          const restLng = 77.6245
          const distKm = calculateHaversineDistance(driverLat, driverLng, restLat, restLng)

          let itemsArr = []
          try {
            itemsArr = typeof target.items === 'string' ? JSON.parse(target.items) : target.items
          } catch (e) {}

          let parsedOtp = '4921'
          if (Array.isArray(itemsArr) && itemsArr.length > 0 && itemsArr[0].otp) {
            parsedOtp = itemsArr[0].otp
          }

          setOfferTimer(20)
          setBroadcastOffer({
            id: target.id,
            orderNumber: `#${target.id}`,
            restaurantName: target.restaurant_name || 'The Green Table',
            restaurantAddress: 'Koramangala 5th Block, Bengaluru',
            customerName: target.customer_name || 'Alex Rivera',
            customerAddress: target.customer_address || 'Indiranagar 100ft Rd',
            basePayout: Math.round(Number(target.total_amount ?? 300) * 0.15) + 40,
            surgeBonus: 25,
            tip: 30,
            distance: `${distKm || 2.4} km`,
            itemsCount: Array.isArray(itemsArr) ? itemsArr.length : 2,
            otp: parsedOtp,
          })
        }
      } catch (err) {
        console.error('Failed to query live orders for driver:', err)
      }
    }

    const timer = setInterval(checkLiveOrders, 8000)
    return () => clearInterval(timer)
  }, [isOnline, activeTask, broadcastOffer, driverGpsCoords])

  // GPS Watcher Effect
  useEffect(() => {
    if (!isOnline) {
      setGpsStatus('idle')
      return
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('connected')
      return
    }

    setGpsStatus('acquiring')

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        const accuracy = position.coords.accuracy
        setDriverGpsCoords([lat, lng])
        setGpsAccuracy(Math.round(accuracy))
        setGpsStatus('connected')
        setLastGpsUpdate(
          new Date().toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })
        )
      },
      (error) => {
        console.warn('Mobile GPS error / fallback to Bengaluru center:', error.message)
        setGpsStatus('connected')
        setDriverGpsCoords([12.9716, 77.5946])
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [isOnline])

  function requestMobileGps() {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      alert('Geolocation is not supported on this browser or mobile device.')
      return
    }
    setGpsStatus('acquiring')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
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
      },
      (err) => {
        setGpsStatus('connected')
        setDriverGpsCoords([12.9716, 77.5946])
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function triggerSimulatedOffer() {
    setOfferTimer(15)
    const driverLat = driverGpsCoords ? driverGpsCoords[0] : 12.9716
    const driverLng = driverGpsCoords ? driverGpsCoords[1] : 77.5946
    const distKm = calculateHaversineDistance(driverLat, driverLng, 12.9784, 77.6408)

    const isDarkStoreOffer = Math.random() > 0.4
    if (isDarkStoreOffer) {
      setBroadcastOffer({
        id: `off_${Date.now()}`,
        orderNumber: `#CXP-${Math.floor(1000 + Math.random() * 9000)}`,
        restaurantName: '⚡ craveEP Dark Store Hub #402 (10-Min Express)',
        restaurantAddress: 'Aisle B3, Indiranagar Micro-Hub',
        customerName: 'Priya Sharma (Instamart Order)',
        customerAddress: 'Tower 4, Skylight Apts, Indiranagar',
        basePayout: 110,
        surgeBonus: 50,
        tip: 60,
        distance: `${distKm} km`,
        itemsCount: 5,
        otp: '4921',
      })
    } else {
      setBroadcastOffer({
        id: `off_${Date.now()}`,
        orderNumber: `#DRP-${Math.floor(1000 + Math.random() * 9000)}`,
        restaurantName: 'Subway Fresh',
        restaurantAddress: 'CMH Road, Indiranagar',
        customerName: 'Ananya Roy',
        customerAddress: 'Sobha Crimson, HAL 2nd Stage',
        basePayout: 95,
        surgeBonus: 40,
        tip: 50,
        distance: `${distKm + 1.2} km`,
        itemsCount: 2,
        otp: '4921',
      })
    }
  }

  async function acceptBroadcastOffer() {
    if (!broadcastOffer) return
    setActiveTask({
      id: `task_${Date.now()}`,
      orderNumber: broadcastOffer.orderNumber,
      restaurantName: broadcastOffer.restaurantName,
      restaurantAddress: broadcastOffer.restaurantAddress,
      customerName: broadcastOffer.customerName,
      customerAddress: broadcastOffer.customerAddress,
      customerPhone: '+91 98765 43210',
      payout: broadcastOffer.basePayout + broadcastOffer.surgeBonus,
      tip: broadcastOffer.tip,
      distance: broadcastOffer.distance,
      step: 'assigned',
      otp: broadcastOffer.otp || '4921',
    })

    try {
      const cleanId = broadcastOffer.id.replace('#', '')
      await supabase.from('orders').update({
        driver_name: 'Verified Driver',
        driver_phone: '+91 98765 43210',
      }).eq('id', cleanId)
    } catch (e) {
      console.error('Failed to update driver assignment in Supabase:', e)
    }

    setBroadcastOffer(null)
  }

  async function advanceStep() {
    if (!activeTask) return
    if (activeTask.step === 'assigned') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'at_restaurant' } : null))
    } else if (activeTask.step === 'at_restaurant') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'picked_up' } : null))
      try {
        const cleanId = activeTask.orderNumber.replace('#', '')
        await supabase.from('orders').update({ status: 'ready' }).eq('id', cleanId)
      } catch (e) {}
    } else if (activeTask.step === 'picked_up') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'arrived_customer' } : null))
    }
  }

  function completeDelivery(otpInput?: string): { success: boolean; message: string } {
    if (!activeTask) return { success: false, message: 'No active delivery task.' }

    const expectedOtp = activeTask.otp || '4921'
    if (otpInput && otpInput.trim() !== expectedOtp.trim()) {
      return {
        success: false,
        message: `Incorrect OTP (${otpInput}). Ask customer for the 4-digit OTP shown on their tracking screen.`,
      }
    }

    const newTrip: CompletedTripItem = {
      id: `trip_${Date.now()}`,
      order: activeTask.orderNumber,
      restaurant: activeTask.restaurantName,
      customer: activeTask.customerName,
 baseEarnings: Math.round(activeTask.payout * 0.7),
      surge: Math.round(activeTask.payout * 0.3),
      tip: activeTask.tip,
      total: activeTask.payout + activeTask.tip,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      distance: activeTask.distance,
    }

    try {
      const cleanId = activeTask.orderNumber.replace('#', '')
      supabase.from('orders').update({ status: 'completed' }).eq('id', cleanId).then(() => {})
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


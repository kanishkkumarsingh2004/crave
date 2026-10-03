'use client'

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
  completeDelivery: () => void
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
  const [driverGpsCoords, setDriverGpsCoords] = useState<[number, number] | null>(null)
  const [gpsStatus, setGpsStatus] = useState<
    'idle' | 'acquiring' | 'connected' | 'denied' | 'error'
  >('idle')
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null)
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string>('')

  // Summary Modal
  const [completedSummaryModal, setCompletedSummaryModal] = useState<CompletedTripItem | null>(null)

  // Completed Trips
  const [completedTrips, setCompletedTrips] = useState<CompletedTripItem[]>([
    {
      id: 'trip_1',
      order: '#DRP-8812',
      restaurant: 'The Green Table',
      customer: 'Priya Sharma',
      baseEarnings: 65,
      surge: 20,
      tip: 30,
      total: 115,
      time: '1:15 PM',
      distance: '2.8 km',
    },
    {
      id: 'trip_2',
      order: '#DRP-8790',
      restaurant: 'Momo House & Asian Grill',
      customer: 'Karan Patel',
      baseEarnings: 75,
      surge: 15,
      tip: 40,
      total: 130,
      time: '12:30 PM',
      distance: '3.4 km',
    },
    {
      id: 'trip_3',
      order: '#DRP-8640',
      restaurant: 'Casa Napoli Pizza',
      customer: 'Rohan Mehta',
      baseEarnings: 80,
      surge: 30,
      tip: 25,
      total: 135,
      time: '11:45 AM',
      distance: '4.1 km',
    },
  ])

  // UPI Saved List
  const [savedUpiList, setSavedUpiList] = useState<SavedUpiItem[]>([
    {
      id: 'upi_1',
      vpa: 'rajesh.kumar@okicici',
      bankName: 'ICICI Bank Ltd',
      isPrimary: true,
      isVerified: true,
    },
    {
      id: 'upi_2',
      vpa: '9876543210@paytm',
      bankName: 'Paytm Payments Bank',
      isPrimary: false,
      isVerified: true,
    },
  ])

  // Payout Logs
  const [payoutLogs, setPayoutLogs] = useState<PayoutLogItem[]>([
    {
      id: 'tx_901',
      amount: 1250,
      date: 'Yesterday, 11:59 PM',
      status: 'Transferred to rajesh.kumar@okicici',
    },
    {
      id: 'tx_899',
      amount: 1680,
      date: 'Oct 01, 2026',
      status: 'Transferred to rajesh.kumar@okicici',
    },
  ])

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

  // GPS Watcher Effect
  useEffect(() => {
    if (!isOnline) {
      setGpsStatus('idle')
      return
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('error')
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
        console.warn('Mobile GPS error / permission denied:', error.message)
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied')
        } else {
          setGpsStatus('error')
        }
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
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied')
          alert(
            'Location permission was denied. Please allow location access in your browser or phone settings.'
          )
        } else {
          setGpsStatus('error')
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  function triggerSimulatedOffer() {
    setOfferTimer(15)
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
        distance: '1.4 km',
        itemsCount: 5,
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
        distance: '2.8 km',
        itemsCount: 2,
      })
    }
  }

  function acceptBroadcastOffer() {
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
    })
    setBroadcastOffer(null)
  }

  function advanceStep() {
    if (!activeTask) return
    if (activeTask.step === 'assigned') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'at_restaurant' } : null))
    } else if (activeTask.step === 'at_restaurant') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'picked_up' } : null))
    } else if (activeTask.step === 'picked_up') {
      setActiveTask((prev) => (prev ? { ...prev, step: 'arrived_customer' } : null))
    }
  }

  function completeDelivery() {
    if (!activeTask) return
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

    setCompletedTrips((prev) => [newTrip, ...prev])
    setCompletedSummaryModal(newTrip)
    setActiveTask(null)
  }

  function handleAddUpiId(vpa: string, provider: string) {
    if (!vpa || !vpa.includes('@')) return
    const primaryVpa = savedUpiList.find((u) => u.isPrimary)?.vpa || vpa
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
    const primaryVpa = savedUpiList.find((u) => u.isPrimary)?.vpa || 'rajesh.kumar@okicici'
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

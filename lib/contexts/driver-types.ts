import type React from 'react'

export interface DriverPosition {
  coords: {
    latitude: number
    longitude: number
    accuracy: number
    altitude?: number | null
    altitudeAccuracy?: number | null
    heading?: number | null
    speed?: number | null
  }
  timestamp: number
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

export interface DriverContextType {
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
  completeDelivery: (otpInput?: string) => Promise<{ success: boolean; message: string }>
  handleAddUpiId: (vpa: string, provider: string) => void
  setPrimaryUpi: (id: string) => void
  deleteUpiId: (id: string) => void
  handleInstantCashout: (amount: number) => boolean
}

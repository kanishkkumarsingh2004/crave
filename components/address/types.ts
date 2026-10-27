import { BellOff, DoorOpen, Phone, ShieldCheck } from 'lucide-react'

export interface AddressItem {
  id: string
  label: string
  address: string
  is_default: boolean
  latitude?: number | null
  longitude?: number | null
  created_at?: string | Date
}

export interface SearchResult {
  placeId: string
  name: string
  formattedAddress: string
  secondaryAddress: string
  lat: number
  lng: number
  locality?: string
  city?: string
}

export type ModalView = 'list' | 'map' | 'form'

export const INSTRUCTION_TAGS = [
  { id: 'leave_door', label: 'Leave at door', icon: DoorOpen },
  { id: 'no_bell', label: "Don't ring bell", icon: BellOff },
  { id: 'call_arrival', label: 'Call upon arrival', icon: Phone },
  { id: 'security', label: 'Leave with security', icon: ShieldCheck },
]

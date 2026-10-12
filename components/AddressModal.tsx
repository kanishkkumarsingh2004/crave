'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  MapPin,
  Search,
  LocateFixed,
  X,
  ChevronLeft,
  Plus,
  Edit3,
  Trash2,
  Check,
  Home,
  Briefcase,
  Building,
  Star,
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Loader2,
  Phone,
  ShieldCheck,
  BellOff,
  DoorOpen,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { checkDeliveryServiceability } from '@/lib/serviceability'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
})

export interface AddressItem {
  id: string
  label: string
  address: string
  is_default: boolean
  latitude?: number | null
  longitude?: number | null
  created_at?: string | Date
}

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAddress: (address: AddressItem) => void
  initialSelectedId?: string | null
  restaurantCoordinates?: { lat: number; lng: number } | null
}

interface SearchResult {
  placeId: string
  name: string
  formattedAddress: string
  secondaryAddress: string
  lat: number
  lng: number
  locality?: string
  city?: string
}

type ModalView = 'list' | 'map' | 'form'

const INSTRUCTION_TAGS = [
  { id: 'leave_door', label: 'Leave at door', icon: DoorOpen },
  { id: 'no_bell', label: "Don't ring bell", icon: BellOff },
  { id: 'call_arrival', label: 'Call upon arrival', icon: Phone },
  { id: 'security', label: 'Leave with security', icon: ShieldCheck },
]

export default function AddressModal({
  isOpen,
  onClose,
  onSelectAddress,
  initialSelectedId,
  restaurantCoordinates,
}: AddressModalProps) {
  // Navigation / View State
  const [currentView, setCurrentView] = useState<ModalView>('list')
  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    initialSelectedId || null
  )

  // Map & Pin State
  const [pinCoords, setPinCoords] = useState<{ lat: number; lng: number }>({
    lat: 12.9716,
    lng: 77.5946,
  })
  const [confirmedAddressText, setConfirmedAddressText] = useState('')
  const [isDetectingGps, setIsDetectingGps] = useState(false)
  const [gpsError, setGpsError] = useState<string | null>(null)

  // Search Autocomplete State
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const searchAbortRef = useRef<AbortController | null>(null)

  // Doorstep Form Details State
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null)
  const [houseNumber, setHouseNumber] = useState('')
  const [buildingName, setBuildingName] = useState('')
  const [landmark, setLandmark] = useState('')
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Work' | 'Other'>('Home')
  const [customLabel, setCustomLabel] = useState('')
  const [selectedInstructions, setSelectedInstructions] = useState<string[]>([])
  const [isDefaultAddress, setIsDefaultAddress] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Serviceability check for current pin
  const serviceability = checkDeliveryServiceability({
    customerLat: pinCoords.lat,
    customerLng: pinCoords.lng,
    restaurantLat: restaurantCoordinates?.lat,
    restaurantLng: restaurantCoordinates?.lng,
  })

  // Sync initialSelectedId
  useEffect(() => {
    if (initialSelectedId) {
      setSelectedAddressId(initialSelectedId)
    }
  }, [initialSelectedId])

  // Fetch Saved Addresses
  const fetchAddresses = useCallback(async () => {
    setIsLoadingList(true)
    let localAddrs: AddressItem[] = []
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('crave_local_addresses')
        if (stored) localAddrs = JSON.parse(stored)
      } catch {}
    }

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const res = await fetch('/api/user/addresses', {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        const json = await res.json()
        const apiAddrs: AddressItem[] = Array.isArray(json.addresses) ? json.addresses : []
        const merged: AddressItem[] = [...apiAddrs]
        localAddrs.forEach((la) => {
          if (!merged.some((m) => m.address === la.address)) {
            merged.push(la)
          }
        })
        setAddresses(merged)
        if (merged.length === 0) {
          setCurrentView('map')
        }
      } else {
        setAddresses(localAddrs)
        if (localAddrs.length === 0) setCurrentView('map')
      }
    } catch {
      setAddresses(localAddrs)
      if (localAddrs.length === 0) setCurrentView('map')
    } finally {
      setIsLoadingList(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchAddresses()
    } else {
      // Reset view on close
      setCurrentView('list')
      setSearchQuery('')
      setSearchResults([])
      setGpsError(null)
      setFormError(null)
      setDeletingId(null)
    }
  }, [isOpen, fetchAddresses])

  // Keyboard Escape listener for WCAG 2.2 Level AA accessibility compliance (UIX-006)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Debounced forward geocoding search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
    }
    const controller = new AbortController()
    searchAbortRef.current = controller

    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(searchQuery.trim())}`, {
          signal: controller.signal,
        })
        if (res.ok) {
          const data = await res.json()
          if (data && Array.isArray(data.results)) {
            setSearchResults(data.results)
            setShowSearchResults(true)
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Address search failed:', err)
        }
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchQuery])

  // Current Device GPS detection
  const handleDetectGps = async () => {
    setIsDetectingGps(true)
    setGpsError(null)
    try {
      const { getDeviceCoordinates } = await import('@/lib/client-location')
      const coords = await getDeviceCoordinates()
      setPinCoords(coords)

      // Reverse geocode
      try {
        const res = await fetch(`/api/geocode/reverse?lat=${coords.lat}&lng=${coords.lng}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.formattedAddress) {
            setConfirmedAddressText(data.formattedAddress)
          }
        }
      } catch {}
    } catch (err: any) {
      const message =
        err?.message ||
        'Location access was denied or is unavailable. Please search your area or drop a pin on the map.'
      setGpsError(message)
    } finally {
      setIsDetectingGps(false)
    }
  }

  // Handle selecting a search suggestion
  const handleSelectSearchResult = (result: SearchResult) => {
    setPinCoords({ lat: result.lat, lng: result.lng })
    setConfirmedAddressText(result.formattedAddress)
    setSearchQuery('')
    setShowSearchResults(false)
  }

  // Handle LocationPickerMap selection
  const handleMapPinSelected = (lat: number, lng: number, address?: string) => {
    setPinCoords({ lat, lng })
    if (address) {
      setConfirmedAddressText(address)
    }
  }

  // Confirm pin position and move to form view
  const handleProceedToForm = () => {
    if (!confirmedAddressText) {
      setConfirmedAddressText('Bengaluru, Karnataka, India')
    }
    setFormError(null)
    setCurrentView('form')
  }

  // Instruction chip toggle
  const toggleInstruction = (id: string) => {
    setSelectedInstructions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Edit an existing address
  const handleStartEdit = (addr: AddressItem) => {
    setEditingAddressId(addr.id)
    setConfirmedAddressText(addr.address)
    if (addr.latitude != null && addr.longitude != null) {
      setPinCoords({ lat: Number(addr.latitude), lng: Number(addr.longitude) })
    }
    setAddressLabel(addr.label === 'Home' || addr.label === 'Work' ? addr.label : 'Other')
    if (addr.label !== 'Home' && addr.label !== 'Work') {
      setCustomLabel(addr.label)
    } else {
      setCustomLabel('')
    }
    setIsDefaultAddress(Boolean(addr.is_default))
    setHouseNumber('')
    setBuildingName('')
    setLandmark('')
    setSelectedInstructions([])
    setCurrentView('form')
  }

  // Set as default address
  const handleSetDefault = async (addrId: string) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const res = await fetch('/api/user/addresses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: addrId, action: 'set_default' }),
      })
      if (res.ok) {
        setAddresses((prev) =>
          prev.map((a) => ({
            ...a,
            is_default: a.id === addrId,
          }))
        )
      }
    } catch (e) {
      console.warn('Set default error:', e)
    }
  }

  // Delete address
  const handleConfirmDelete = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      const res = await fetch(`/api/user/addresses?id=${encodeURIComponent(deletingId)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== deletingId))
        if (selectedAddressId === deletingId) {
          setSelectedAddressId(null)
        }
      }
    } catch (e) {
      console.warn('Delete error:', e)
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  // Save Address (Create or Update)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!houseNumber.trim() && !buildingName.trim() && !confirmedAddressText.trim()) {
      setFormError('Please enter house/flat number or building details.')
      return
    }

    const finalLabel =
      addressLabel === 'Other' && customLabel.trim() ? customLabel.trim() : addressLabel

    // Build standard formatted doorstep address
    const parts = [
      houseNumber.trim() ? `Flat/House ${houseNumber.trim()}` : null,
      buildingName.trim(),
      landmark.trim() ? `Near ${landmark.trim()}` : null,
      confirmedAddressText.trim(),
    ].filter(Boolean)

    if (selectedInstructions.length > 0) {
      const instructionLabels = selectedInstructions
        .map((id) => INSTRUCTION_TAGS.find((t) => t.id === id)?.label)
        .filter(Boolean)
      parts.push(`[Note: ${instructionLabels.join(', ')}]`)
    }

    const fullFormattedAddress = parts.join(', ')

    setIsSaving(true)
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('crave_token') : null
      let savedResult: AddressItem | null = null

      if (editingAddressId) {
        // PUT update
        const res = await fetch('/api/user/addresses', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            id: editingAddressId,
            label: finalLabel,
            address: fullFormattedAddress,
            latitude: pinCoords.lat,
            longitude: pinCoords.lng,
            is_default: isDefaultAddress,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.address) {
            savedResult = json.address
          }
        }
      } else {
        // POST create
        const res = await fetch('/api/user/addresses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            label: finalLabel,
            address: fullFormattedAddress,
            latitude: pinCoords.lat,
            longitude: pinCoords.lng,
            is_default: isDefaultAddress || addresses.length === 0,
          }),
        })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.address) {
            savedResult = json.address
          }
        }
      }

      // Local storage fallback for guests or offline
      if (!savedResult) {
        savedResult = {
          id: editingAddressId || `addr_${Date.now()}`,
          label: finalLabel,
          address: fullFormattedAddress,
          is_default: isDefaultAddress || addresses.length === 0,
          latitude: pinCoords.lat,
          longitude: pinCoords.lng,
        }
      }

      // Update local storage
      if (typeof window !== 'undefined') {
        try {
          const currentLocal = JSON.parse(localStorage.getItem('crave_local_addresses') || '[]')
          const updatedLocal = [
            savedResult,
            ...currentLocal.filter((a: any) => a.id !== savedResult!.id),
          ]
          localStorage.setItem('crave_local_addresses', JSON.stringify(updatedLocal))
          localStorage.setItem('crave_selected_address', savedResult.address)
        } catch {}
      }

      // Update state & notify parent
      setAddresses((prev) => [savedResult!, ...prev.filter((a) => a.id !== savedResult!.id)])
      setSelectedAddressId(savedResult.id)
      onSelectAddress(savedResult)
      onClose()
    } catch (err: any) {
      setFormError(err?.message || 'Could not save address. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-t-[2.5rem] sm:rounded-3xl bg-white dark:bg-[#131b16] shadow-2xl border-t sm:border border-black/10 dark:border-white/10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300 pb-safe"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-black/20 dark:bg-white/20 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/10 px-5 py-4 bg-[#121815] text-white">
          <div className="flex items-center gap-3">
            {currentView !== 'list' && addresses.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (currentView === 'form') setCurrentView('map')
                  else setCurrentView('list')
                }}
                className="grid size-8 place-items-center rounded-xl bg-white/10 text-white hover:bg-white/20 transition mr-1"
                aria-label="Back"
              >
                <ChevronLeft className="size-5" />
              </button>
            )}
            <div className="grid size-10 place-items-center rounded-2xl bg-[#d9f447] text-[#121815] font-black shadow-xs">
              <MapPin className="size-5" />
            </div>
            <div>
              <h2
                id="address-modal-title"
                className="font-extrabold text-base tracking-tight text-white"
              >
                {currentView === 'list'
                  ? 'Saved Addresses'
                  : currentView === 'map'
                    ? 'Set Delivery Location'
                    : 'Complete Address Details'}
              </h2>
              <p className="text-xs text-stone-300 font-medium">
                {currentView === 'list'
                  ? 'Select or add an address for delivery'
                  : currentView === 'map'
                    ? 'Search area or adjust map pin'
                    : 'Enter flat, landmark & instructions'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-white/10 text-stone-300 hover:text-white hover:bg-white/20 transition"
            aria-label="Close modal"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Body: View 1 (Saved Addresses List) */}
        {currentView === 'list' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Top Add Address CTA */}
            <button
              type="button"
              onClick={() => {
                setEditingAddressId(null)
                setHouseNumber('')
                setBuildingName('')
                setLandmark('')
                setSelectedInstructions([])
                setCurrentView('map')
              }}
              className="w-full flex items-center justify-between rounded-2xl border-2 border-dashed border-[#5e8210]/40 dark:border-[#d9f447]/30 bg-[#5e8210]/5 dark:bg-[#d9f447]/5 p-4 text-[#5e8210] dark:text-[#d9f447] hover:bg-[#5e8210]/10 dark:hover:bg-[#d9f447]/10 transition group"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] group-hover:scale-105 transition">
                  <Plus className="size-5 stroke-[2.5]" />
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-sm text-[#121815] dark:text-white">
                    Add New Delivery Address
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Search area, drop map pin & save doorstep details
                  </p>
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-wider bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] px-3 py-1.5 rounded-xl shadow-xs">
                Add New
              </span>
            </button>

            {/* List of Saved Addresses */}
            {isLoadingList ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400 gap-3">
                <Loader2 className="size-7 animate-spin text-[#5e8210] dark:text-[#d9f447]" />
                <p className="text-xs font-bold">Loading your saved addresses...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="py-10 text-center rounded-2xl border border-dashed border-black/10 dark:border-white/10 p-6">
                <div className="size-12 rounded-2xl bg-black/5 dark:bg-white/5 grid place-items-center mx-auto mb-3 text-stone-400">
                  <MapPin className="size-6" />
                </div>
                <h4 className="font-bold text-sm text-[#121815] dark:text-white">
                  No saved addresses found
                </h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
                  Add your home, office, or other locations for 1-click checkout.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 px-1">
                  <span>YOUR SAVED LOCATIONS ({addresses.length})</span>
                </div>

                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id
                  const isDefault = Boolean(addr.is_default)

                  return (
                    <div
                      key={addr.id}
                      className={`group relative rounded-2xl border p-4 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'border-[#121815] dark:border-[#d9f447] bg-[#121815]/[0.03] dark:bg-white/[0.05] ring-2 ring-black/10 dark:ring-[#d9f447]/20 shadow-xs'
                          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] hover:border-black/25 dark:hover:border-white/25'
                      }`}
                    >
                      <div
                        className="flex items-start gap-3 flex-1 cursor-pointer"
                        onClick={() => {
                          setSelectedAddressId(addr.id)
                          onSelectAddress(addr)
                          onClose()
                        }}
                      >
                        <div
                          className={`size-10 rounded-2xl grid place-items-center shrink-0 mt-0.5 ${
                            isSelected
                              ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815]'
                              : 'bg-black/5 dark:bg-white/5 text-[#121815] dark:text-white'
                          }`}
                        >
                          {addr.label === 'Home' ? (
                            <Home className="size-4.5" />
                          ) : addr.label === 'Work' ? (
                            <Briefcase className="size-4.5" />
                          ) : (
                            <Building className="size-4.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-sm text-[#121815] dark:text-white">
                              {addr.label}
                            </span>
                            {isDefault && (
                              <span className="text-[10px] font-black uppercase tracking-wider bg-[#5e8210]/15 dark:bg-[#d9f447]/20 text-[#5e8210] dark:text-[#d9f447] px-2 py-0.5 rounded-md border border-[#5e8210]/20 dark:border-[#d9f447]/30">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium leading-relaxed line-clamp-2">
                            {addr.address}
                          </p>
                        </div>
                      </div>

                      {/* Actions: Deliver Here, Edit, Default, Delete */}
                      <div className="flex items-center justify-end gap-1.5 pt-2 sm:pt-0 border-t border-black/[0.04] dark:border-white/[0.04] sm:border-t-0 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAddressId(addr.id)
                            onSelectAddress(addr)
                            onClose()
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                            isSelected
                              ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815]'
                              : 'bg-black/5 dark:bg-white/5 text-stone-700 dark:text-stone-200 hover:bg-black/10'
                          }`}
                        >
                          {isSelected && <Check className="size-3.5 stroke-[3]" />}
                          <span>{isSelected ? 'Selected' : 'Deliver Here'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStartEdit(addr)}
                          className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-500 hover:text-black dark:hover:text-white hover:bg-black/10 transition"
                          title="Edit address"
                          aria-label={`Edit ${addr.label}`}
                        >
                          <Edit3 className="size-3.5" />
                        </button>

                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(addr.id)}
                            className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-400 hover:text-amber-500 hover:bg-black/10 transition"
                            title="Set as default address"
                            aria-label={`Set ${addr.label} as default`}
                          >
                            <Star className="size-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setDeletingId(addr.id)}
                          className="size-8 rounded-xl bg-black/5 dark:bg-white/5 grid place-items-center text-stone-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                          title="Delete address"
                          aria-label={`Delete ${addr.label}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Delete Confirmation Alert Modal */}
            {deletingId && (
              <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white dark:bg-[#18201c] rounded-3xl p-6 max-w-sm w-full border border-black/10 dark:border-white/10 shadow-2xl space-y-4">
                  <div className="size-12 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 grid place-items-center mx-auto">
                    <Trash2 className="size-6" />
                  </div>
                  <div className="text-center">
                    <h4 className="font-extrabold text-base text-[#121815] dark:text-white">
                      Delete this address?
                    </h4>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Are you sure you want to remove this saved address from your account?
                    </p>
                  </div>
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeletingId(null)}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-bold text-stone-600 dark:text-stone-300 hover:bg-black/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDelete}
                      disabled={isDeleting}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
                    >
                      {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : null}
                      <span>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal Body: View 2 (Location Search & Interactive Map Pin) */}
        {currentView === 'map' && (
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Search Input with Autocomplete Suggestions */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 size-4 text-stone-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowSearchResults(true)
                  }}
                  placeholder="Search for locality, building, street, or landmark..."
                  className="w-full rounded-2xl border border-black/15 dark:border-white/15 bg-black/[0.02] dark:bg-white/[0.04] pl-10 pr-10 py-3 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447] focus:ring-2 focus:ring-black/5 dark:focus:ring-[#d9f447]/10 transition"
                />
                {isSearching ? (
                  <div className="absolute right-3.5 size-4">
                    <Loader2 className="size-4 animate-spin text-stone-400" />
                  </div>
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults([])
                      setShowSearchResults(false)
                    }}
                    className="absolute right-3.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
              </div>

              {/* Suggestions Dropdown */}
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 z-30 rounded-2xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] shadow-2xl overflow-hidden divide-y divide-black/[0.05] dark:divide-white/[0.05] max-h-56 overflow-y-auto animate-in fade-in duration-150">
                  {searchResults.map((item) => (
                    <div
                      key={item.placeId}
                      onClick={() => handleSelectSearchResult(item)}
                      className="p-3 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer flex items-start gap-3 transition"
                    >
                      <Navigation className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-extrabold text-[#121815] dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate mt-0.5">
                          {item.secondaryAddress || item.formattedAddress}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* GPS Auto-Detect Button */}
            <button
              type="button"
              onClick={handleDetectGps}
              disabled={isDetectingGps}
              className="w-full flex items-center justify-between rounded-2xl bg-[#5e8210]/10 dark:bg-[#d9f447]/10 border border-[#5e8210]/20 dark:border-[#d9f447]/20 p-3.5 text-[#5e8210] dark:text-[#d9f447] text-xs font-bold hover:bg-[#5e8210]/15 transition group shadow-xs disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-[#5e8210] dark:bg-[#d9f447] text-white dark:text-[#121815] shadow-xs group-hover:scale-105 transition">
                  {isDetectingGps ? (
                    <Loader2 className="size-4.5 animate-spin" />
                  ) : (
                    <LocateFixed className="size-4.5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-xs text-[#121815] dark:text-white">
                    {isDetectingGps ? 'Detecting GPS Location...' : 'Use Current GPS Location'}
                  </p>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    Pinpoint your doorstep location automatically
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-white dark:bg-[#121815] px-2.5 py-1 rounded-lg border border-black/10 dark:border-white/10">
                {isDetectingGps ? 'Locating' : 'Detect'}
              </span>
            </button>

            {/* Inline GPS Error Feedback if permission denied */}
            {gpsError && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed font-medium">{gpsError}</p>
              </div>
            )}

            {/* Interactive Map Picker */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-stone-500 dark:text-stone-400 px-1">
                <span>MOVE PIN TO EXACT DELIVERY DOORSTEP:</span>
                <span className="font-mono text-[10px] text-stone-400">
                  {pinCoords.lat.toFixed(4)}°, {pinCoords.lng.toFixed(4)}°
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-black/10 dark:border-white/10 shadow-inner">
                <LocationPickerMap
                  initialLat={pinCoords.lat}
                  initialLng={pinCoords.lng}
                  onLocationSelect={handleMapPinSelected}
                  className="h-56 sm:h-64 w-full"
                />
              </div>
            </div>

            {/* Serviceability & Address Preview Banner */}
            <div
              className={`rounded-2xl border p-3.5 transition flex items-start gap-3 ${
                serviceability.isServiceable
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-100'
              }`}
            >
              {serviceability.isServiceable ? (
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="size-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold">
                    {serviceability.isServiceable
                      ? 'Delivering to this Area'
                      : 'Outside Delivery Coverage'}
                  </span>
                  {serviceability.distanceKm != null && (
                    <span className="text-[10px] font-mono font-bold bg-white/30 px-1.5 py-0.5 rounded">
                      {serviceability.distanceKm} km away
                    </span>
                  )}
                </div>
                <p className="text-[11px] font-medium mt-0.5 opacity-90 line-clamp-2">
                  {confirmedAddressText || 'Bengaluru, Karnataka'}
                </p>
                {!serviceability.isServiceable && serviceability.reason && (
                  <p className="text-[10px] text-rose-700 dark:text-rose-300 mt-1 font-bold">
                    {serviceability.reason}
                  </p>
                )}
              </div>
            </div>

            {/* Confirm & Proceed Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleProceedToForm}
                className="w-full rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] py-3.5 text-xs font-black shadow-lg hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
              >
                <span>Confirm Location &amp; Enter Details</span>
              </button>
            </div>
          </div>
        )}

        {/* Modal Body: View 3 (Doorstep Details Form) */}
        {currentView === 'form' && (
          <form
            onSubmit={handleSaveAddress}
            className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4"
          >
            {/* Confirmed Location Summary Bar */}
            <div className="flex items-center justify-between rounded-2xl bg-black/[0.03] dark:bg-white/[0.05] border border-black/10 dark:border-white/10 p-3.5">
              <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                <MapPin className="size-4 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                    Selected Location
                  </p>
                  <p className="text-xs font-bold text-[#121815] dark:text-white truncate">
                    {confirmedAddressText || 'Bengaluru, Karnataka'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCurrentView('map')}
                className="text-xs font-extrabold text-[#5e8210] dark:text-[#d9f447] hover:underline shrink-0"
              >
                Change
              </button>
            </div>

            {/* Form Error Message */}
            {formError && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Save As Label Buttons */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
                Save Address As *
              </label>
              <div className="flex items-center gap-2 flex-wrap">
                {(['Home', 'Work', 'Other'] as const).map((lbl) => {
                  const isSelected = addressLabel === lbl
                  return (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressLabel(lbl)}
                      className={`rounded-xl px-4 py-2 text-xs font-extrabold transition border flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] border-transparent shadow-xs'
                          : 'bg-white dark:bg-[#18201c] text-stone-700 dark:text-stone-300 border-black/10 dark:border-white/10 hover:border-black/20'
                      }`}
                    >
                      {lbl === 'Home' ? (
                        <Home className="size-3.5" />
                      ) : lbl === 'Work' ? (
                        <Briefcase className="size-3.5" />
                      ) : (
                        <Building className="size-3.5" />
                      )}
                      <span>{lbl}</span>
                    </button>
                  )
                })}
              </div>

              {addressLabel === 'Other' && (
                <input
                  type="text"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  placeholder="e.g. Gym, Parents' Home, Studio"
                  className="mt-2 w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
                />
              )}
            </div>

            {/* House / Flat / Block No. */}
            <div>
              <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
                House / Flat / Floor / Block No. *
              </label>
              <input
                type="text"
                required
                value={houseNumber}
                onChange={(e) => setHouseNumber(e.target.value)}
                placeholder="e.g. Flat 402, 4th Floor, Block B"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
              />
            </div>

            {/* Building / Apartment Name */}
            <div>
              <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Apartment / Building / Society / Road Name
              </label>
              <input
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                placeholder="e.g. Prestige Greenwoods, 12th Main Road"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
              />
            </div>

            {/* Landmark */}
            <div>
              <label className="text-[11px] font-bold text-stone-700 dark:text-stone-300 block mb-1">
                Nearby Landmark (Optional)
              </label>
              <input
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Forum Mall, Next to Apollo Pharmacy"
                className="w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] px-3.5 py-2.5 text-xs font-medium text-[#121815] dark:text-white placeholder:text-stone-400 outline-none focus:border-[#121815] dark:focus:border-[#d9f447]"
              />
            </div>

            {/* Delivery Instructions Quick Chips */}
            <div>
              <label className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 dark:text-stone-400 block mb-2">
                Delivery Instructions (Optional)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {INSTRUCTION_TAGS.map((tag) => {
                  const isSelected = selectedInstructions.includes(tag.id)
                  const TagIcon = tag.icon

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleInstruction(tag.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition ${
                        isSelected
                          ? 'border-[#5e8210] dark:border-[#d9f447] bg-[#5e8210]/10 dark:bg-[#d9f447]/10 text-[#121815] dark:text-white'
                          : 'border-black/10 dark:border-white/10 bg-white dark:bg-[#18201c] text-stone-600 dark:text-stone-400 hover:border-black/20'
                      }`}
                    >
                      <TagIcon className="size-3.5 text-[#5e8210] dark:text-[#d9f447] shrink-0" />
                      <span className="text-[11px] font-bold truncate">{tag.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Default Address Checkbox */}
            <div className="pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-[#121815] dark:text-white select-none">
                <input
                  type="checkbox"
                  checked={isDefaultAddress}
                  onChange={(e) => setIsDefaultAddress(e.target.checked)}
                  className="size-4 rounded-md accent-[#121815] dark:accent-[#d9f447]"
                />
                <span>Set as default delivery address</span>
              </label>
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] py-3.5 text-xs font-black shadow-lg hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
                <span>{isSaving ? 'Saving Address...' : 'Save & Deliver to this Address'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

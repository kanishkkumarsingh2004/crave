'use client'

import AddressFormView from '@/components/address/AddressFormView'
import AddressListView from '@/components/address/AddressListView'
import AddressMapView from '@/components/address/AddressMapView'
import {
  INSTRUCTION_TAGS,
  type AddressItem,
  type ModalView,
  type SearchResult,
} from '@/components/address/types'
import { checkDeliveryServiceability } from '@/lib/serviceability'
import { ChevronLeft, MapPin, X } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

export type { AddressItem }

interface AddressModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectAddress: (address: AddressItem) => void
  initialSelectedId?: string | null
  restaurantCoordinates?: { lat: number; lng: number } | null
}

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
        if (!token) {
          localAddrs.forEach((la) => {
            if (!merged.some((m) => m.address === la.address)) merged.push(la)
          })
        }
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
      setCurrentView('list')
      setSearchQuery('')
      setSearchResults([])
      setGpsError(null)
      setFormError(null)
    }
  }, [isOpen, fetchAddresses])

  // Keyboard Escape listener
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
      setGpsError(
        err?.message ||
          'Location access was denied or is unavailable. Please search your area or drop a pin on the map.'
      )
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
  const handleDeleteAddress = async (deletingId: string) => {
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
        } else if (token) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Could not update the address in the database.')
        }
      } else {
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
        } else if (token) {
          const error = await res.json().catch(() => ({}))
          throw new Error(error.error || 'Could not save the address in the database.')
        }
      }

      if (!savedResult && token) {
        throw new Error('The address was not saved to the database. Please try again.')
      }

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

        {/* Modal Body */}
        {currentView === 'list' && (
          <AddressListView
            addresses={addresses}
            selectedAddressId={selectedAddressId}
            isLoadingList={isLoadingList}
            onAddNew={() => {
              setEditingAddressId(null)
              setHouseNumber('')
              setBuildingName('')
              setLandmark('')
              setSelectedInstructions([])
              setCurrentView('map')
            }}
            onSelectAddress={(addr) => {
              setSelectedAddressId(addr.id)
              onSelectAddress(addr)
              onClose()
            }}
            onStartEdit={handleStartEdit}
            onSetDefault={handleSetDefault}
            onDeleteAddress={handleDeleteAddress}
          />
        )}

        {currentView === 'map' && (
          <AddressMapView
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            searchResults={searchResults}
            showSearchResults={showSearchResults}
            setShowSearchResults={setShowSearchResults}
            isSearching={isSearching}
            onSelectSearchResult={handleSelectSearchResult}
            isDetectingGps={isDetectingGps}
            gpsError={gpsError}
            onDetectGps={handleDetectGps}
            pinCoords={pinCoords}
            onMapPinSelected={handleMapPinSelected}
            confirmedAddressText={confirmedAddressText}
            serviceability={serviceability}
            onProceedToForm={handleProceedToForm}
          />
        )}

        {currentView === 'form' && (
          <AddressFormView
            confirmedAddressText={confirmedAddressText}
            onBackToMap={() => setCurrentView('map')}
            formError={formError}
            addressLabel={addressLabel}
            setAddressLabel={setAddressLabel}
            customLabel={customLabel}
            setCustomLabel={setCustomLabel}
            houseNumber={houseNumber}
            setHouseNumber={setHouseNumber}
            buildingName={buildingName}
            setBuildingName={setBuildingName}
            landmark={landmark}
            setLandmark={setLandmark}
            selectedInstructions={selectedInstructions}
            onToggleInstruction={toggleInstruction}
            isDefaultAddress={isDefaultAddress}
            setIsDefaultAddress={setIsDefaultAddress}
            isSaving={isSaving}
            onSubmit={handleSaveAddress}
          />
        )}
      </div>
    </div>
  )
}

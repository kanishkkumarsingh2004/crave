'use client'

import { AlertTriangle, CheckCircle2, Loader2, LocateFixed, Navigation, Search, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import type { SearchResult } from './types'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
})

interface AddressMapViewProps {
  searchQuery: string
  setSearchQuery: (q: string) => void
  searchResults: SearchResult[]
  showSearchResults: boolean
  setShowSearchResults: (show: boolean) => void
  isSearching: boolean
  onSelectSearchResult: (result: SearchResult) => void
  isDetectingGps: boolean
  gpsError: string | null
  onDetectGps: () => void
  pinCoords: { lat: number; lng: number }
  onMapPinSelected: (lat: number, lng: number, address?: string) => void
  confirmedAddressText: string
  serviceability: { isServiceable: boolean; distanceKm?: number | null; reason?: string }
  onProceedToForm: () => void
}

export default function AddressMapView({
  searchQuery,
  setSearchQuery,
  searchResults,
  showSearchResults,
  setShowSearchResults,
  isSearching,
  onSelectSearchResult,
  isDetectingGps,
  gpsError,
  onDetectGps,
  pinCoords,
  onMapPinSelected,
  confirmedAddressText,
  serviceability,
  onProceedToForm,
}: AddressMapViewProps) {
  return (
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
                onClick={() => onSelectSearchResult(item)}
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
        onClick={onDetectGps}
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
            onLocationSelect={onMapPinSelected}
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
          onClick={onProceedToForm}
          className="w-full rounded-2xl bg-[#121815] dark:bg-[#d9f447] text-[#d9f447] dark:text-[#121815] py-3.5 text-xs font-black shadow-lg hover:opacity-95 active:scale-98 transition flex items-center justify-center gap-2"
        >
          <span>Confirm Location &amp; Enter Details</span>
        </button>
      </div>
    </div>
  )
}

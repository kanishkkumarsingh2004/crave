'use client'

import { Map, MapControls, MapMarker, MarkerContent } from '@/components/ui/map'
import { Locate, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LocationPickerMapProps {
  initialLat?: number
  initialLng?: number
  onLocationSelect: (lat: number, lng: number, address?: string) => void
}

export default function LocationPickerMap({
  initialLat = 12.6817,
  initialLng = 77.4729,
  onLocationSelect,
}: LocationPickerMapProps) {
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  })
  const [detectedAddress, setDetectedAddress] = useState<string>('')
  const [isLocating, setIsLocating] = useState<boolean>(false)
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false)

  // Reverse Geocoding helper via OpenStreetMap Nominatim
  const fetchReverseGeocode = async (lat: number, lng: number) => {
    setIsGeocoding(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        {
          headers: {
            'Accept-Language': 'en',
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        if (data && data.display_name) {
          const parts = data.display_name.split(', ')
          const cleanAddr = parts.slice(0, 4).join(', ')
          setDetectedAddress(cleanAddr)
          onLocationSelect(lat, lng, cleanAddr)
          setIsGeocoding(false)
          return cleanAddr
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding unavailable:', err)
    }
    setDetectedAddress('')
    onLocationSelect(lat, lng)
    setIsGeocoding(false)
    return ''
  }

  useEffect(() => {
    setCurrentCoords({ lat: initialLat, lng: initialLng })
    fetchReverseGeocode(initialLat, initialLng)
  }, [initialLat, initialLng])

  // Sync Device Location Handler
  const handleSyncGpsLocation = () => {
    setIsLocating(true)
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = parseFloat(pos.coords.latitude.toFixed(6))
          const lng = parseFloat(pos.coords.longitude.toFixed(6))
          setCurrentCoords({ lat, lng })
          fetchReverseGeocode(lat, lng)
          setIsLocating(false)
        },
        (err) => {
          console.warn('Geolocation error:', err)
          setIsLocating(false)
          alert('Could not access device location. Please enable location permissions.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setIsLocating(false)
      alert('Geolocation is not supported by your browser.')
    }
  }

  const handleMapClick = (e: { lng: number; lat: number }) => {
    const lat = parseFloat(e.lat.toFixed(6))
    const lng = parseFloat(e.lng.toFixed(6))
    setCurrentCoords({ lat, lng })
    fetchReverseGeocode(lat, lng)
  }

  const handleMarkerDragEnd = (coords: { lng: number; lat: number }) => {
    const lat = parseFloat(coords.lat.toFixed(6))
    const lng = parseFloat(coords.lng.toFixed(6))
    setCurrentCoords({ lat, lng })
    fetchReverseGeocode(lat, lng)
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-[#f0f3ec] h-64 sm:h-72">
      {/* Map Element */}
      <Map
        center={[currentCoords.lng, currentCoords.lat]}
        zoom={15}
        onClick={handleMapClick}
        className="h-full w-full"
      >
        <MapControls position="bottom-right" showZoom showLocate={false} />

        <MapMarker
          longitude={currentCoords.lng}
          latitude={currentCoords.lat}
          draggable
          onDragEnd={handleMarkerDragEnd}
        >
          <MarkerContent>
            <div className="relative flex items-center justify-center size-10 cursor-grab active:cursor-grabbing">
              <div className="absolute size-10 bg-[#d9f447]/50 rounded-full animate-ping" />
              <div className="size-8 rounded-full bg-[#18201c] border-2 border-white flex items-center justify-center shadow-2xl">
                <MapPin className="size-4 text-[#d9f447]" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* Floating GPS Target / Sync Button */}
      <button
        type="button"
        onClick={handleSyncGpsLocation}
        disabled={isLocating}
        className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full bg-[#18201c] px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:bg-[#2b3931] hover:scale-105 active:scale-95 transition border border-white/20 disabled:opacity-50"
      >
        {isLocating ? (
          <div className="size-3.5 border-2 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Locate className="size-3.5 text-[#d9f447]" />
        )}
        <span>{isLocating ? 'Syncing GPS...' : 'Sync Live Location'}</span>
      </button>

      {/* Coordinate & Reverse Geocode Banner Badge */}
      <div className="absolute bottom-3 left-3 right-16 z-10 pointer-events-none">
        <div className="inline-flex max-w-full items-center gap-2 rounded-xl bg-white/95 px-3 py-1.5 shadow-lg border border-gray-200/80 backdrop-blur-md">
          <div className="grid size-6 place-items-center rounded-lg bg-[#18201c] text-[#d9f447] shrink-0">
            <MapPin className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold text-[#18201c]">
              {currentCoords.lat.toFixed(4)}° N, {currentCoords.lng.toFixed(4)}° E
            </p>
            {isGeocoding ? (
              <p className="text-[10px] text-gray-500 animate-pulse">Detecting address...</p>
            ) : detectedAddress ? (
              <p className="text-[10px] text-gray-600 font-medium truncate max-w-[240px] sm:max-w-[340px]">
                {detectedAddress}
              </p>
            ) : (
              <p className="text-[10px] text-gray-400">Drag pin or click map to move location</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

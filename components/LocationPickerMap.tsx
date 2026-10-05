'use client'

import { Map, MapMarker, MarkerContent, type MapRef } from '@/components/ui/map'
import { Locate, MapPin } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  const mapRef = useRef<MapRef | null>(null)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  })
  const [, setDetectedAddress] = useState<string>('')
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // Reverse Geocoding helper via OpenStreetMap Nominatim
  const fetchReverseGeocode = async (lat: number, lng: number) => {
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
          return cleanAddr
        }
      }
    } catch (err) {
      console.warn('Reverse geocoding unavailable:', err)
    }
    setDetectedAddress('')
    onLocationSelect(lat, lng)
    return ''
  }

  useEffect(() => {
    setCurrentCoords({ lat: initialLat, lng: initialLng })
    fetchReverseGeocode(initialLat, initialLng)
    mapRef.current?.flyTo({
      center: [initialLng, initialLat],
      zoom: 15,
      essential: true,
    })
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
          mapRef.current?.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true,
          })
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
        ref={mapRef}
        center={[currentCoords.lng, currentCoords.lat]}
        zoom={15}
        onClick={handleMapClick}
        className="h-full w-full"
      >
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
    </div>
  )
}

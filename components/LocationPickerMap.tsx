'use client'

import L from 'leaflet'
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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

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
          // Format clean readable address snippet
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
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return // Prevent double initialization

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 15,
      zoomControl: false,
    })
    mapInstanceRef.current = map

    // Add OpenStreetMap Standard Tiles (100% Free, No API Key Required)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map)

    // Add Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Create Custom Crave Brand Pin Icon
    const customIcon = L.divIcon({
      className: 'custom-crave-pin-marker',
      html: `
        <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: grab;">
          <div style="position: absolute; width: 42px; height: 42px; background-color: rgba(217, 244, 71, 0.45); border-radius: 50%; transform: scale(1.2);"></div>
          <div style="width: 34px; height: 34px; background-color: #18201c; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px -3px rgba(0, 0, 0, 0.4); transition: transform 0.15s ease;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d9f447" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [42, 42],
      iconAnchor: [21, 42],
    })

    // Create Marker (Draggable)
    const marker = L.marker([initialLat, initialLng], {
      icon: customIcon,
      draggable: true,
    }).addTo(map)
    markerRef.current = marker

    // Initial geocode check
    fetchReverseGeocode(initialLat, initialLng)

    // Marker Drag End Event Handler
    marker.on('dragend', () => {
      const position = marker.getLatLng()
      const lat = parseFloat(position.lat.toFixed(6))
      const lng = parseFloat(position.lng.toFixed(6))
      setCurrentCoords({ lat, lng })
      map.panTo([lat, lng])
      fetchReverseGeocode(lat, lng)
    })

    // Map Click Event Handler (Drop pin wherever user clicks)
    map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = parseFloat(e.latlng.lat.toFixed(6))
      const lng = parseFloat(e.latlng.lng.toFixed(6))
      marker.setLatLng([lat, lng])
      setCurrentCoords({ lat, lng })
      map.panTo([lat, lng])
      fetchReverseGeocode(lat, lng)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // Sync / Fly to location when initialLat or initialLng changes from outside
  useEffect(() => {
    if (mapInstanceRef.current && markerRef.current) {
      const cur = markerRef.current.getLatLng()
      if (Math.abs(cur.lat - initialLat) > 0.0001 || Math.abs(cur.lng - initialLng) > 0.0001) {
        markerRef.current.setLatLng([initialLat, initialLng])
        mapInstanceRef.current.flyTo([initialLat, initialLng], 16)
        setCurrentCoords({ lat: initialLat, lng: initialLng })
        fetchReverseGeocode(initialLat, initialLng)
      }
    }
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

          if (mapInstanceRef.current && markerRef.current) {
            markerRef.current.setLatLng([lat, lng])
            mapInstanceRef.current.flyTo([lat, lng], 17, { animate: true, duration: 1.2 })
          }
          fetchReverseGeocode(lat, lng)
          setIsLocating(false)
        },
        (err) => {
          console.warn('Geolocation error:', err)
          setIsLocating(false)
          alert('Could not access device location. Please enable location permissions in browser settings.')
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    } else {
      setIsLocating(false)
      alert('Geolocation is not supported by your browser.')
    }
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-[#f0f3ec]">
      {/* Map Element */}
      <div ref={mapContainerRef} className="h-64 w-full z-0 cursor-crosshair" />

      {/* Floating GPS Target / Sync Button */}
      <button
        type="button"
        onClick={handleSyncGpsLocation}
        disabled={isLocating}
        className="absolute top-3 right-3 z-[400] flex items-center gap-2 rounded-full bg-[#18201c] px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:bg-[#2b3931] hover:scale-105 active:scale-95 transition border border-white/20 disabled:opacity-50"
      >
        {isLocating ? (
          <div className="size-3.5 border-2 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
        ) : (
          <Locate className="size-3.5 text-[#d9f447]" />
        )}
        <span>{isLocating ? 'Syncing GPS...' : 'Sync Live Location'}</span>
      </button>

      {/* Coordinate & Reverse Geocode Banner Badge */}
      <div className="absolute bottom-3 left-3 right-12 z-[400] pointer-events-none">
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
              <p className="text-[10px] text-gray-600 font-medium truncate max-w-[280px] sm:max-w-[340px]">
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

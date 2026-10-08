'use client'

import {
  Map,
  MapGeoJSON,
  MapMarker,
  MarkerContent,
  MarkerTooltip,
  type MapRef,
} from '@/components/ui/map'
import { generateH3GridGeoJSON, type TelemetryPin, H3_RESOLUTIONS } from '@/lib/h3-grid'
import { Bike, Hexagon, Layers, Locate, MapPin, Package, Utensils, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

interface LocationPickerMapProps {
  initialLat?: number
  initialLng?: number
  onLocationSelect: (lat: number, lng: number, address?: string) => void
  className?: string
  showMarker?: boolean
  pins?: TelemetryPin[]
  enableH3Grid?: boolean
  defaultGridVisible?: boolean
  gridVisible?: boolean
  onGridVisibleChange?: (visible: boolean) => void
  h3Resolution?: number
  onResolutionChange?: (res: number) => void
  showH3Heatmap?: boolean
  onHeatmapEnabledChange?: (enabled: boolean) => void
  onPinSelect?: (pin: TelemetryPin) => void
  selectedPinId?: string
}

export default function LocationPickerMap({
  initialLat = 12.679898,
  initialLng = 77.469493,
  onLocationSelect,
  className,
  showMarker = true,
  pins = [],
  enableH3Grid = false,
  defaultGridVisible = false,
  gridVisible: controlledGridVisible,
  onGridVisibleChange,
  h3Resolution = 7,
  onResolutionChange,
  showH3Heatmap = true,
  onHeatmapEnabledChange,
  onPinSelect,
  selectedPinId,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapRef | null>(null)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  })
  const [, setDetectedAddress] = useState<string>('')
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // H3 Grid State (OFF by default or controlled)
  const [internalGridVisible, setInternalGridVisible] = useState<boolean>(defaultGridVisible)
  const [internalResolution, setInternalResolution] = useState<number>(h3Resolution)
  const [internalHeatmap, setInternalHeatmap] = useState<boolean>(showH3Heatmap)
  const [selectedCell, setSelectedCell] = useState<any | null>(null)

  const gridVisible =
    controlledGridVisible !== undefined ? controlledGridVisible : internalGridVisible
  const activeResolution = h3Resolution !== undefined ? h3Resolution : internalResolution
  const heatmapEnabled = showH3Heatmap !== undefined ? showH3Heatmap : internalHeatmap

  const handleToggleGrid = (val: boolean) => {
    setInternalGridVisible(val)
    onGridVisibleChange?.(val)
    if (!val) setSelectedCell(null)
  }

  const handleResolutionChange = (res: number) => {
    setInternalResolution(res)
    onResolutionChange?.(res)
  }

  const handleToggleHeatmap = (val: boolean) => {
    setInternalHeatmap(val)
    onHeatmapEnabledChange?.(val)
  }

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
      zoom: 14,
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
            zoom: 14,
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

  // Generate H3 Grid GeoJSON data using previous compact ring size (4)
  const h3GeoJSONData = useMemo(() => {
    if (!gridVisible) {
      return { type: 'FeatureCollection' as const, features: [] }
    }
    return generateH3GridGeoJSON(
      currentCoords.lat,
      currentCoords.lng,
      activeResolution,
      4, // previous compact size
      pins
    )
  }, [gridVisible, currentCoords.lat, currentCoords.lng, activeResolution, pins])

  // Display grid data ONLY on click, not on hover
  const activeCellData = selectedCell

  return (
    <div
      className={
        className ||
        'relative w-full rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-[#f0f3ec] h-64 sm:h-72'
      }
    >
      {/* Top-Right Map Control Cluster (H3 Toggle OFF by default & Sync GPS) */}
      <div className="absolute top-3 right-3 z-20 flex flex-wrap items-center justify-end gap-2 max-w-[calc(100%-24px)]">
        {/* Sync GPS Location Button */}
        <button
          type="button"
          onClick={handleSyncGpsLocation}
          disabled={isLocating}
          className="flex items-center gap-2 rounded-full bg-[#18201c] px-3.5 py-2 text-xs font-bold text-white shadow-xl hover:bg-[#2b3931] hover:scale-105 active:scale-95 transition border border-white/20 disabled:opacity-50"
        >
          {isLocating ? (
            <div className="size-3.5 border-2 border-[#d9f447] border-t-transparent rounded-full animate-spin" />
          ) : (
            <Locate className="size-3.5 text-[#d9f447]" />
          )}
          <span className="hidden sm:inline">{isLocating ? 'Syncing...' : 'Sync Location'}</span>
        </button>
      </div>

      {/* Map Element */}
      <Map
        ref={mapRef}
        center={[currentCoords.lng, currentCoords.lat]}
        zoom={14}
        onClick={handleMapClick}
        className="h-full w-full"
      >
        {/* H3 Spatial Hexagon Grid GeoJSON Layer (Compact Size, Info on Click only) */}
        {gridVisible && h3GeoJSONData.features.length > 0 && (
          <MapGeoJSON
            data={h3GeoJSONData}
            promoteId="h3Index"
            interactive={true}
            fillPaint={{
              'fill-color': ['get', 'fillColor'],
              'fill-opacity': heatmapEnabled ? ['get', 'fillOpacity'] : 0.05,
            }}
            linePaint={{
              'line-color': ['get', 'strokeColor'],
              'line-width': 1.5,
              'line-opacity': 0.8,
            }}
            fillHoverPaint={{
              'fill-opacity': 0.6,
              'fill-color': '#18201c',
            }}
            onClick={(e) => setSelectedCell(e.feature.properties)}
          />
        )}

        {/* Primary Selected Location Marker */}
        {showMarker && (
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
        )}

        {/* Live Telemetry Pins (Drivers, Kitchens, Addresses) */}
        {pins.map((pin) => {
          const isDriver = pin.type === 'driver'
          const isRestaurant = pin.type === 'restaurant'
          const isAddress = pin.type === 'order'
          const isSelected = selectedPinId === pin.id

          return (
            <MapMarker key={pin.id} longitude={pin.lng} latitude={pin.lat}>
              <MarkerContent>
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    onPinSelect?.(pin)
                  }}
                  className={`relative flex items-center justify-center cursor-pointer group transition ${
                    isSelected ? 'scale-125 z-30' : 'hover:scale-110 z-10'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute -inset-1 rounded-full bg-[#b5de28] animate-ping opacity-75" />
                  )}
                  <div
                    className={`size-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition ${
                      isDriver
                        ? 'bg-emerald-600 text-white'
                        : isRestaurant
                          ? 'bg-amber-500 text-white'
                          : 'bg-purple-600 text-white'
                    } ${isSelected ? 'ring-4 ring-[#b5de28]' : ''}`}
                  >
                    {isDriver ? (
                      <Bike className="size-3.5" />
                    ) : isRestaurant ? (
                      <Utensils className="size-3.5" />
                    ) : (
                      <MapPin className="size-3.5" />
                    )}
                  </div>
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <div className="flex flex-col gap-1 p-2 text-xs max-w-xs bg-[#121815]/95 text-white rounded-xl shadow-2xl border border-white/20 backdrop-blur-md">
                  <div className="flex items-center gap-1.5 font-extrabold text-xs text-[#d9f447]">
                    <span className="capitalize px-1.5 py-0.5 rounded bg-white/10 text-[10px] tracking-wide">
                      {isAddress ? 'Address' : pin.type}
                    </span>
                    <span className="truncate">{pin.name}</span>
                  </div>
                  <div className="text-[11px] text-gray-100 font-bold leading-snug">
                    {pin.locationName}
                  </div>
                  <div className="text-[10px] font-mono text-purple-300 font-semibold bg-white/10 px-2 py-0.5 rounded border border-white/10">
                    {pin.detail}
                  </div>
                  <div className="text-[9px] font-mono text-gray-400">{pin.timestamp}</div>
                </div>
              </MarkerTooltip>
            </MapMarker>
          )
        })}
      </Map>

      {/* H3 Spatial Hexagon Click-Triggered Info Card (Bottom-Left) */}
      {gridVisible && activeCellData && (
        <div className="absolute bottom-3 left-3 z-20 w-72 max-w-[calc(100vw-2.5rem)] rounded-2xl border border-white/20 bg-[#121815]/95 p-3.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#d9f447]">
              <Hexagon className="size-4 animate-spin-slow" />
              <span>H3 Hex Spatial Cell</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-gray-300">
                Res {activeCellData.resolution || activeResolution}
              </span>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="grid size-5 place-items-center rounded-md bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white transition"
                title="Close"
              >
                <X className="size-3" />
              </button>
            </div>
          </div>

          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between text-gray-400">
              <span>H3 Index:</span>
              <span className="font-mono text-white font-bold truncate max-w-[140px]">
                {activeCellData.h3Index}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-white/10">
              <span className="text-gray-300 font-bold">Density Score:</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                  activeCellData.totalPins >= 5
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : activeCellData.totalPins >= 3
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : activeCellData.totalPins >= 1
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-gray-800 text-gray-400'
                }`}
              >
                {activeCellData.totalPins >= 5
                  ? 'PEAK HEAT'
                  : activeCellData.totalPins >= 3
                    ? 'HIGH DEMAND'
                    : activeCellData.totalPins >= 1
                      ? 'ACTIVE FLEET'
                      : 'CLEAR ZONE'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 pt-2 text-center text-[10px]">
              <div className="bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-800/40">
                <p className="text-emerald-400 font-extrabold text-sm">
                  {activeCellData.drivers || 0}
                </p>
                <p className="text-gray-400">Riders</p>
              </div>
              <div className="bg-amber-950/60 p-1.5 rounded-lg border border-amber-800/40">
                <p className="text-amber-400 font-extrabold text-sm">
                  {activeCellData.restaurants || 0}
                </p>
                <p className="text-gray-400">Kitchens</p>
              </div>
              <div className="bg-purple-950/60 p-1.5 rounded-lg border border-purple-800/40">
                <p className="text-purple-300 font-extrabold text-sm">
                  {activeCellData.orders || 0}
                </p>
                <p className="text-gray-400">Drops</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

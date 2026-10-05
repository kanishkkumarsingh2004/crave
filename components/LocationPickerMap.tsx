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
  h3Resolution?: number
  showH3Heatmap?: boolean
}

export default function LocationPickerMap({
  initialLat = 12.6817,
  initialLng = 77.4729,
  onLocationSelect,
  className,
  showMarker = true,
  pins = [],
  enableH3Grid = false,
  defaultGridVisible = false,
  h3Resolution = 7,
  showH3Heatmap = true,
}: LocationPickerMapProps) {
  const mapRef = useRef<MapRef | null>(null)
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  })
  const [, setDetectedAddress] = useState<string>('')
  const [isLocating, setIsLocating] = useState<boolean>(false)

  // H3 Grid State (OFF by default)
  const [gridVisible, setGridVisible] = useState<boolean>(defaultGridVisible)
  const [activeResolution, setActiveResolution] = useState<number>(h3Resolution)
  const [heatmapEnabled, setHeatmapEnabled] = useState<boolean>(showH3Heatmap)
  const [selectedCell, setSelectedCell] = useState<any | null>(null)

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
        {enableH3Grid && (
          <div className="flex items-center gap-1.5 bg-[#121815]/95 p-1 rounded-full border border-white/20 text-white shadow-xl backdrop-blur-md">
            {/* Toggle H3 Hex Grid ON/OFF */}
            <button
              type="button"
              onClick={() => {
                setGridVisible((prev) => !prev)
                if (gridVisible) setSelectedCell(null)
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-extrabold transition active:scale-95 ${
                gridVisible
                  ? 'bg-[#d9f447] text-[#121815] shadow-md'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Hexagon className="size-3.5" />
              <span>{gridVisible ? 'H3 Grid ON' : 'H3 Grid OFF'}</span>
            </button>

            {gridVisible && (
              <>
                <button
                  type="button"
                  onClick={() => setHeatmapEnabled((prev) => !prev)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition ${
                    heatmapEnabled
                      ? 'bg-amber-400 text-gray-950'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title="Toggle Density Heatmap"
                >
                  <Layers className="size-3" />
                  <span className="hidden sm:inline">Heatmap</span>
                </button>

                <div className="hidden sm:flex items-center gap-0.5 bg-white/10 p-0.5 rounded-full">
                  {H3_RESOLUTIONS.map((res) => (
                    <button
                      key={res.level}
                      type="button"
                      onClick={() => setActiveResolution(res.level)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold transition ${
                        activeResolution === res.level
                          ? 'bg-[#d9f447] text-[#121815]'
                          : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Res {res.level}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

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

        {/* Live Telemetry Pins (Drivers, Kitchens, Orders, Saved Customer Addresses) */}
        {pins.map((pin) => {
          const isDriver = pin.type === 'driver'
          const isRestaurant = pin.type === 'restaurant'
          return (
            <MapMarker key={pin.id} longitude={pin.lng} latitude={pin.lat}>
              <MarkerContent>
                <div className="relative flex items-center justify-center cursor-pointer group hover:scale-110 transition">
                  <div
                    className={`size-7 rounded-full border-2 border-white flex items-center justify-center shadow-lg ${
                      isDriver
                        ? 'bg-emerald-600 text-white'
                        : isRestaurant
                          ? 'bg-amber-500 text-white'
                          : 'bg-purple-600 text-white'
                    }`}
                  >
                    {isDriver ? (
                      <Bike className="size-3.5" />
                    ) : isRestaurant ? (
                      <Utensils className="size-3.5" />
                    ) : (
                      <Package className="size-3.5" />
                    )}
                  </div>
                </div>
              </MarkerContent>
              <MarkerTooltip>
                <div className="flex flex-col gap-0.5 p-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="capitalize">{pin.type}:</span>
                    <span>{pin.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-300">{pin.locationName}</div>
                  <div className="text-[9px] font-mono text-emerald-400">{pin.detail}</div>
                </div>
              </MarkerTooltip>
            </MapMarker>
          )
        })}
      </Map>

      {/* H3 Spatial Hexagon Click-Triggered Info Card (Bottom-Left) */}
      {gridVisible && activeCellData && (
        <div className="absolute bottom-3 left-3 z-20 w-72 rounded-2xl border border-white/20 bg-[#121815]/95 p-3.5 text-white shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
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

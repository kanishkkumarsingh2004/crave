'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from '@/lib/websocket'
import {
  MapPin,
  RefreshCw,
  Settings,
  Search,
  Home,
  X,
  Hexagon,
  Layers,
  SlidersHorizontal,
  Compass,
  Building,
  Navigation,
  ChevronDown,
} from 'lucide-react'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-200px)] min-h-[600px] w-full rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200">
      <div className="flex flex-col items-center gap-2">
        <div className="size-6 border-2 border-[#b5de28] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-gray-500">
          Loading Live Map Telemetry & Addresses...
        </span>
      </div>
    </div>
  ),
})

interface LiveTelemetryPin {
  id: string
  name: string
  type: 'driver' | 'restaurant' | 'order'
  status: string
  lat: number
  lng: number
  locationName: string
  detail: string
  timestamp: string
}

export default function MapLiveAnalyticsPage() {
  const [pins, setPins] = useState<LiveTelemetryPin[]>([])
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'restaurant' | 'order'>('all')
  const [selectedPin, setSelectedPin] = useState<LiveTelemetryPin | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [showAddressDrawer, setShowAddressDrawer] = useState(true)

  // Map & H3 Grid Settings State
  const [h3GridEnabled, setH3GridEnabled] = useState(true)
  const [h3Resolution, setH3Resolution] = useState<number>(7)
  const [h3HeatmapEnabled, setH3HeatmapEnabled] = useState(true)
  const [autoSyncInterval, setAutoSyncInterval] = useState<number>(10) // 10s default
  const [layerVisibility, setLayerVisibility] = useState({
    drivers: true,
    restaurants: true,
    addresses: true,
  })

  // Map center trigger state
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: 12.679898,
    lng: 77.469493,
  })

  const settingsRef = useRef<HTMLDivElement>(null)

  // Close settings dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchLiveTelemetry = useCallback(async (signal?: AbortSignal) => {
    try {
      if (isMountedRef.current) setIsRefreshing(true)
      const res = await fetch('/api/admin/map-live-analytics', {
        headers: { Accept: 'application/json' },
        signal,
      })
      if (res.ok && isMountedRef.current) {
        const data = await res.json()
        if (data.pins && Array.isArray(data.pins) && isMountedRef.current) {
          setPins(data.pins)
          setSelectedPin((prev) => prev || (data.pins.length > 0 ? data.pins[0] : null))
        }
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return
      if (isMountedRef.current) {
        console.warn('Live map telemetry fetch deferred:', err?.message || err)
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    fetchLiveTelemetry(controller.signal)
    return () => controller.abort()
  }, [fetchLiveTelemetry])

  // Auto-sync interval handler
  useEffect(() => {
    if (autoSyncInterval <= 0) return
    const controller = new AbortController()
    const timer = setInterval(() => {
      fetchLiveTelemetry(controller.signal)
    }, autoSyncInterval * 1000)

    return () => {
      clearInterval(timer)
      controller.abort()
    }
  }, [autoSyncInterval, fetchLiveTelemetry])

  // Real-time live WebSocket stream listener for driver device coordinates
  useWebSocket({
    channels: ['driver_location'],
    onMessage: (msg) => {
      if (msg.channel === 'driver_location' && msg.data) {
        const data = msg.data as any
        const driverId = data.driverId
        const lat = typeof data.lat === 'number' ? data.lat : parseFloat(data.lat)
        const lng = typeof data.lng === 'number' ? data.lng : parseFloat(data.lng)

        if (driverId && !isNaN(lat) && !isNaN(lng)) {
          setPins((prevPins) => {
            const exists = prevPins.some((p) => p.id === `drv_${driverId}` || p.id === driverId)

            if (exists) {
              return prevPins.map((p) => {
                if (p.id === `drv_${driverId}` || p.id === driverId) {
                  return {
                    ...p,
                    lat,
                    lng,
                    status: data.status ? `Status: ${data.status}` : p.status,
                    timestamp: `Live GPS (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`,
                  }
                }
                return p
              })
            } else {
              return [
                ...prevPins,
                {
                  id: `drv_${driverId}`,
                  name: `Rider (${driverId.slice(0, 8)})`,
                  type: 'driver',
                  status: `Status: ${data.status || 'ONLINE'}`,
                  lat,
                  lng,
                  locationName: 'Live Device GPS Feed',
                  detail: 'Active Mobile GPS Stream',
                  timestamp: `Live GPS (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`,
                },
              ]
            }
          })
        }
      }
    },
  })

  // Filter pins based on tab selection, layer visibility, and search query
  const filteredPins = pins.filter((p) => {
    // 1. Layer visibility check
    if (p.type === 'driver' && !layerVisibility.drivers) return false
    if (p.type === 'restaurant' && !layerVisibility.restaurants) return false
    if (p.type === 'order' && !layerVisibility.addresses) return false

    // 2. Tab filter check
    if (filterType !== 'all' && p.type !== filterType) return false

    // 3. Search query check
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        p.name.toLowerCase().includes(q) ||
        p.locationName.toLowerCase().includes(q) ||
        p.detail.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      )
    }

    return true
  })

  // Extract address pins specifically for the address telemetry list
  const addressPins = pins.filter((p) => p.type === 'order')

  const counts = {
    total: pins.length,
    drivers: pins.filter((p) => p.type === 'driver').length,
    restaurants: pins.filter((p) => p.type === 'restaurant').length,
    addresses: pins.filter((p) => p.type === 'order').length,
  }

  const handleFocusPin = (pin: LiveTelemetryPin) => {
    setSelectedPin(pin)
    setMapCenter({ lat: pin.lat, lng: pin.lng })
  }

  const handleResetMapCenter = () => {
    setMapCenter({ lat: 12.679898, lng: 77.469493 })
  }

  return (
    <div className="space-y-6">
      {/* Full Screen Live Map & Telemetry Control Board */}
      <div className="w-full rounded-3xl border border-[#e2e8de] dark:border-[#27342d] bg-white dark:bg-[#18201c] p-5 sm:p-6 shadow-xs flex flex-col space-y-4">
        {/* Header Bar with Title, Filter Pills, Refresh & Settings Dropdown */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#27342d] pb-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl bg-[#b5de28]/10 dark:bg-[#d9f447]/20 border border-[#b5de28]/30 dark:border-[#d9f447]/30 flex items-center justify-center text-[#b5de28] dark:text-[#d9f447]">
              <MapPin className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-lg text-[#18201c] dark:text-white">
                  Live Map & Address Analytics
                </h3>
                {autoSyncInterval > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {autoSyncInterval === 1
                      ? 'Real-Time Live (1s)'
                      : `Auto ${autoSyncInterval}s`}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5a655f] dark:text-gray-400">
                Real-time tracking of active rider fleet, kitchens, and customer delivery addresses.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-[#121815] p-1 rounded-full border border-gray-200 dark:border-[#27342d] text-xs font-bold overflow-x-auto max-w-full no-scrollbar whitespace-nowrap">
              {[
                { type: 'all', label: `All (${counts.total})` },
                { type: 'driver', label: `Riders (${counts.drivers})` },
                { type: 'restaurant', label: `Kitchens (${counts.restaurants})` },
                { type: 'order', label: `Addresses (${counts.addresses})` },
              ].map((f) => (
                <button
                  key={f.type}
                  onClick={() => setFilterType(f.type as any)}
                  className={`px-3 py-1.5 rounded-full transition shrink-0 ${
                    filterType === f.type
                      ? 'bg-[#18201c] dark:bg-[#d9f447] text-white dark:text-[#121815] shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-[#18201c] dark:hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={() => fetchLiveTelemetry()}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] px-3.5 py-2 text-xs font-bold text-[#18201c] dark:text-white hover:bg-gray-100 dark:hover:bg-[#1a221d] active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 text-[#b5de28] dark:text-[#d9f447] ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>

            {/* Settings Gear Dropdown Button (Top Right Corner) */}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 rounded-full border p-2 text-xs font-bold transition ${
                  isSettingsOpen
                    ? 'border-[#b5de28] dark:border-[#d9f447] bg-[#b5de28]/10 dark:bg-[#d9f447]/20 text-[#18201c] dark:text-white shadow-sm'
                    : 'border-gray-300 dark:border-[#27342d] bg-gray-50 dark:bg-[#121815] text-[#18201c] dark:text-white hover:bg-gray-100 dark:hover:bg-[#1a221d] hover:scale-105 active:scale-95'
                }`}
                title="Live Analytics Settings"
              >
                <Settings
                  className={`size-4 text-[#b5de28] dark:text-[#d9f447] transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : ''}`}
                />
                <span className="hidden sm:inline">Settings</span>
                <ChevronDown
                  className={`size-3 text-gray-500 dark:text-gray-400 transition-transform ${isSettingsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Settings Dropdown Menu */}
              {isSettingsOpen && (
                <>
                  <div
                    onClick={() => setIsSettingsOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 sm:hidden backdrop-blur-xs"
                  />
                  <div className="fixed inset-x-4 top-20 z-50 max-w-sm mx-auto sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-80 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3">
                      <div className="flex items-center gap-2 font-extrabold text-sm text-[#18201c]">
                        <SlidersHorizontal className="size-4 text-[#b5de28]" />
                        <span>Map Live Settings</span>
                      </div>
                      <button
                        onClick={() => setIsSettingsOpen(false)}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="space-y-4 text-xs">
                      {/* Telemetry Auto-Sync */}
                      <div className="space-y-1.5">
                        <label className="font-bold text-[#18201c] flex items-center justify-between">
                          <span>Telemetry Stream Mode</span>
                          <span className="text-[10px] text-emerald-700 font-bold font-mono">
                            {autoSyncInterval === 1
                              ? 'Event-Driven Live Stream'
                              : autoSyncInterval > 0
                                ? `Polling every ${autoSyncInterval}s`
                                : 'Disabled'}
                          </span>
                        </label>
                        <div className="grid grid-cols-6 gap-1 bg-gray-100 p-1 rounded-xl">
                          {[1, 3, 5, 10, 30, 0].map((interval) => (
                            <button
                              key={interval}
                              onClick={() => setAutoSyncInterval(interval)}
                              className={`py-1.5 rounded-lg font-extrabold text-[10px] sm:text-[11px] transition ${
                                autoSyncInterval === interval
                                  ? interval === 1
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-[#18201c] text-white shadow-xs'
                                  : 'text-gray-600 hover:text-[#18201c]'
                              }`}
                            >
                              {interval === 1 ? 'Live' : interval === 0 ? 'Off' : `${interval}s`}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* H3 Spatial Grid Settings */}
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#18201c] flex items-center gap-1.5">
                            <Hexagon className="size-3.5 text-[#b5de28]" />
                            <span>H3 Spatial Hex Grid</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setH3GridEnabled((prev) => !prev)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              h3GridEnabled ? 'bg-[#b5de28]' : 'bg-gray-300'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                h3GridEnabled ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>

                        {h3GridEnabled && (
                          <div className="pl-5 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Grid Resolution</span>
                              <div className="flex flex-wrap gap-1">
                                {[5, 6, 7, 8, 9].map((res) => (
                                  <button
                                    key={res}
                                    onClick={() => setH3Resolution(res)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      h3Resolution === res
                                        ? 'bg-[#18201c] text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                  >
                                    Res {res}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 flex items-center gap-1">
                                <Layers className="size-3 text-amber-500" />
                                <span>Density Heatmap</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => setH3HeatmapEnabled((prev) => !prev)}
                                className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                  h3HeatmapEnabled ? 'bg-amber-500' : 'bg-gray-300'
                                }`}
                              >
                                <span
                                  className={`pointer-events-none inline-block size-3 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                                    h3HeatmapEnabled ? 'translate-x-3' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Layer Visibilities */}
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <span className="font-bold text-[#18201c]">Pin Layers</span>
                        <div className="space-y-1.5 pl-1">
                          {[
                            {
                              key: 'addresses',
                              label: 'Customer Addresses & Drops',
                              color: 'bg-purple-500',
                            },
                            {
                              key: 'drivers',
                              label: 'Riders & Active Fleet',
                              color: 'bg-emerald-500',
                            },
                            {
                              key: 'restaurants',
                              label: 'Kitchens & Dark Stores',
                              color: 'bg-amber-500',
                            },
                          ].map((layer) => (
                            <label
                              key={layer.key}
                              className="flex items-center justify-between text-gray-700 cursor-pointer hover:bg-gray-50 p-1 rounded-lg"
                            >
                              <span className="flex items-center gap-2">
                                <span className={`size-2 rounded-full ${layer.color}`} />
                                <span>{layer.label}</span>
                              </span>
                              <input
                                type="checkbox"
                                checked={layerVisibility[layer.key as keyof typeof layerVisibility]}
                                onChange={(e) =>
                                  setLayerVisibility((prev) => ({
                                    ...prev,
                                    [layer.key]: e.target.checked,
                                  }))
                                }
                                className="rounded text-[#b5de28] focus:ring-[#b5de28]"
                              />
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Quick View Controls */}
                      <div className="space-y-2 border-t border-gray-100 pt-3">
                        <button
                          onClick={handleResetMapCenter}
                          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-[#18201c] py-2 font-bold transition"
                        >
                          <Compass className="size-4 text-[#b5de28]" />
                          <span>Center Kanakapura Fleet Sector</span>
                        </button>

                        <button
                          onClick={() => setShowAddressDrawer((prev) => !prev)}
                          className="w-full flex items-center justify-center gap-2 rounded-xl border border-gray-200 text-gray-700 py-2 font-bold hover:bg-gray-50 transition"
                        >
                          <Home className="size-4 text-purple-600" />
                          <span>
                            {showAddressDrawer
                              ? 'Hide Address Directory'
                              : 'Show Address Directory'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar for Map Pins & Addresses */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search addresses, customer names, riders, kitchens..."
              className="w-full rounded-2xl border border-gray-200 bg-gray-50/80 pl-10 pr-9 py-2 text-xs text-[#18201c] placeholder-gray-400 focus:bg-white focus:border-[#b5de28] focus:outline-none transition shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#5a655f] self-end sm:self-auto font-medium">
            <span>
              Showing <strong className="text-[#18201c] font-bold">{filteredPins.length}</strong>{' '}
              active telemetry locations
            </span>
          </div>
        </div>

        {/* Map & Address Telemetry Grid Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Map View */}
          <div
            className={`${showAddressDrawer ? 'lg:col-span-8 xl:col-span-9' : 'lg:col-span-12'} transition-all duration-300`}
          >
            <LocationPickerMap
              showMarker={false}
              enableH3Grid={h3GridEnabled}
              gridVisible={h3GridEnabled}
              h3Resolution={h3Resolution}
              showH3Heatmap={h3HeatmapEnabled}
              pins={filteredPins}
              selectedPinId={selectedPin?.id}
              onPinSelect={handleFocusPin}
              className="relative w-full rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-[#f0f3ec] h-[400px] sm:h-[500px] lg:h-[calc(100vh-250px)] lg:min-h-[550px]"
              initialLat={mapCenter.lat}
              initialLng={mapCenter.lng}
              onLocationSelect={(lat, lng) => {}}
            />
          </div>

          {/* Addresses Directory & Telemetry Drawer (Right Panel) */}
          {showAddressDrawer && (
            <div className="lg:col-span-4 xl:col-span-3 rounded-2xl border border-gray-200 bg-gray-50/50 p-4 flex flex-col space-y-3 h-[360px] sm:h-[450px] lg:h-[calc(100vh-250px)] lg:min-h-[550px]">
              <div className="flex items-center justify-between border-b border-gray-200 pb-2.5">
                <div className="flex items-center gap-2">
                  <Building className="size-4 text-purple-600" />
                  <h4 className="font-extrabold text-sm text-[#18201c]">Address Directory</h4>
                </div>
                <span className="text-[10px] font-extrabold font-mono bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                  {addressPins.length} Locations
                </span>
              </div>

              <p className="text-[11px] text-gray-500 leading-snug">
                Customer delivery addresses & saved locations mapped with live GPS coordinates.
              </p>

              {/* Address Cards Scrollable List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs scrollbar-thin">
                {addressPins.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                    <Home className="size-8 text-gray-300" />
                    <p className="font-bold text-xs">No address locations match your filter.</p>
                  </div>
                ) : (
                  addressPins.map((addr) => {
                    const isSelected = selectedPin?.id === addr.id
                    return (
                      <div
                        key={addr.id}
                        onClick={() => handleFocusPin(addr)}
                        className={`group p-3 rounded-2xl border transition cursor-pointer flex flex-col space-y-1.5 ${
                          isSelected
                            ? 'bg-purple-50 border-purple-400 shadow-sm ring-1 ring-purple-400'
                            : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <MapPin className="size-3.5" />
                            </div>
                            <span className="font-bold text-[#18201c] line-clamp-1">
                              {addr.name}
                            </span>
                          </div>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                            {addr.status}
                          </span>
                        </div>

                        <div className="text-gray-600 text-[11px] flex items-start gap-1.5 leading-snug pl-0.5">
                          <Navigation className="size-3 text-purple-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{addr.locationName}</span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono pt-1 border-t border-gray-100">
                          <span>{addr.timestamp}</span>
                          <span className="group-hover:text-purple-600 font-bold transition">
                            Focus Pin &rarr;
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

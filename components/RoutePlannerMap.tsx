'use client'

import {
  Map,
  MapControls,
  MapMarker,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerTooltip,
  RouteMarker,
  RouteProgress,
} from '@/components/ui/map'
import { formatDistance, formatDuration, OSRMRouteData } from '@/lib/route-service'
import { cn } from '@/lib/utils'
import {
  Bike,
  Car,
  Compass,
  Layers,
  MapPin,
  Navigation,
  Play,
  Pause,
  RefreshCw,
  Sliders,
  Store,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'

export interface RouteStop {
  name: string
  lng: number
  lat: number
}

interface RoutePlannerMapProps {
  initialStart?: RouteStop
  initialEnd?: RouteStop
  intermediateStops?: RouteStop[]
  onRouteSelected?: (selectedRoute: OSRMRouteData, index: number) => void
  className?: string
  height?: string
  showControls?: boolean
}

// Preset Locations for testing
export const PRESET_ROUTES = {
  BANGALORE_KITCHEN_TO_CUSTOMER: {
    title: 'Bengaluru Delivery Hub (Kengeri -> Town)',
    start: { name: 'Crave Kitchen Store (Kengeri)', lng: 77.4729, lat: 12.6817 },
    end: { name: 'Customer Destination', lng: 77.469493, lat: 12.679898 },
    stops: [
      { name: 'Crave Kitchen Hub', lng: 77.4729, lat: 12.6817 },
      { name: 'Checkpoint A (Main Road)', lng: 77.471, lat: 12.681 },
      { name: 'Checkpoint B (Flyover)', lng: 77.4702, lat: 12.6802 },
      { name: 'Customer Address', lng: 77.469493, lat: 12.679898 },
    ],
  },
  AMSTERDAM_TO_ROTTERDAM: {
    title: 'Amsterdam -> Rotterdam (OSRM Driving)',
    start: { name: 'Amsterdam Centraal', lng: 4.9041, lat: 52.3676 },
    end: { name: 'Rotterdam Centraal', lng: 4.4777, lat: 51.9244 },
    stops: [
      { name: 'Amsterdam', lng: 4.9041, lat: 52.3676 },
      { name: 'Schiphol Airport', lng: 4.7639, lat: 52.3086 },
      { name: 'The Hague', lng: 4.3007, lat: 52.0705 },
      { name: 'Rotterdam', lng: 4.4777, lat: 51.9244 },
    ],
  },
  NYC_CITY_TOUR: {
    title: 'NYC Landmarks Tour',
    start: { name: 'NYC City Hall', lng: -74.006, lat: 40.7128 },
    end: { name: 'Central Park', lng: -73.9654, lat: 40.7829 },
    stops: [
      { name: 'City Hall', lng: -74.006, lat: 40.7128 },
      { name: 'Empire State Building', lng: -73.9857, lat: 40.7484 },
      { name: 'Grand Central Terminal', lng: -73.9772, lat: 40.7527 },
      { name: 'Central Park', lng: -73.9654, lat: 40.7829 },
    ],
  },
}

export default function RoutePlannerMap({
  initialStart = PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.start,
  initialEnd = PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.end,
  intermediateStops = PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.stops,
  onRouteSelected,
  className,
  height = 'h-[500px]',
  showControls = true,
}: RoutePlannerMapProps) {
  const [startPoint, setStartPoint] = useState<RouteStop>(initialStart)
  const [endPoint, setEndPoint] = useState<RouteStop>(initialEnd)
  const [stops, setStops] = useState<RouteStop[]>(intermediateStops)

  const [routes, setRoutes] = useState<OSRMRouteData[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // Progress Simulation State
  const [progress, setProgress] = useState<number>(0.35)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<'planning' | 'progress' | 'stops'>('planning')

  const routeColor = '#3b82f6'
  const inactiveOpacity = 0.35

  // Fetch OSRM driving routes with alternatives
  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    async function fetchRoutes() {
      try {
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${endPoint.lng},${endPoint.lat}?overview=full&geometries=geojson&alternatives=true`
        )
        const data = await response.json()

        if (data.routes?.length > 0 && isMounted) {
          const fetched: OSRMRouteData[] = data.routes.map(
            (r: {
              geometry: { coordinates: [number, number][] }
              duration: number
              distance: number
            }) => ({
              coordinates: r.geometry.coordinates,
              duration: r.duration,
              distance: r.distance,
            })
          )
          setRoutes(fetched)
          setSelectedIndex(0)
          onRouteSelected?.(fetched[0], 0)
        }
      } catch (error) {
        console.error('Failed to fetch OSRM driving routes:', error)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchRoutes()
    return () => {
      isMounted = false
    }
  }, [startPoint.lng, startPoint.lat, endPoint.lng, endPoint.lat])

  // Automatic progress animation toggle
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 1) {
          setIsPlaying(false)
          return 1
        }
        return Number((prev + 0.01).toFixed(2))
      })
    }, 100)

    return () => clearInterval(interval)
  }, [isPlaying])

  const centerLng = (startPoint.lng + endPoint.lng) / 2
  const centerLat = (startPoint.lat + endPoint.lat) / 2

  const activeRoute = routes[selectedIndex] || null

  return (
    <div
      className={cn(
        'relative w-full rounded-2xl overflow-hidden border border-[#27272a] shadow-2xl bg-[#09090b]',
        height,
        className
      )}
    >
      <Map
        center={[centerLng, centerLat]}
        zoom={11.5}
        loading={isLoading}
        styles={{
          light: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
          dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        }}
        className="h-full w-full"
      >
        <MapControls position="top-right" showZoom showLocate={false} />

        {/* Render routes (Alternative paths + Active Route) */}
        {routes.map((routeData, index) => {
          const isActive = index === selectedIndex
          return (
            <MapRoute
              key={index}
              coordinates={routeData.coordinates}
              active={isActive}
              color={routeColor}
              width={5}
              opacity={inactiveOpacity}
              activeWidth={6}
              activeOpacity={1}
              progress={isActive ? progress : undefined}
              dashArray={!isActive ? [1, 2] : undefined}
              onClick={() => {
                setSelectedIndex(index)
                onRouteSelected?.(routeData, index)
              }}
            >
              {/* If active route, render progress layer and markers */}
              {isActive && (
                <>
                  <RouteProgress color="#10b981" width={6} opacity={1} />

                  <RouteMarker at="start">
                    <MarkerContent>
                      <div className="border-foreground bg-background size-4 rounded-full border-2 shadow-md flex items-center justify-center">
                        <div className="size-2 rounded-full bg-emerald-500" />
                      </div>
                    </MarkerContent>
                  </RouteMarker>

                  <RouteMarker at="progress">
                    <MarkerContent>
                      <div className="relative size-8 flex items-center justify-center">
                        <div className="absolute size-8 bg-emerald-500/30 rounded-full animate-ping" />
                        <div className="ring-background grid size-7 place-items-center rounded-full bg-emerald-500 shadow-md ring-2 text-white">
                          <Car className="size-4" />
                        </div>
                        <MarkerLabel
                          position="top"
                          className="bg-[#18181b]/95 border-[#27272a] text-white font-bold text-[10px] rounded-md border px-2 py-0.5 tabular-nums shadow-lg"
                        >
                          {Math.round(progress * 100)}% (
                          {formatDistance(activeRoute ? activeRoute.distance * progress : 0)})
                        </MarkerLabel>
                      </div>
                    </MarkerContent>
                  </RouteMarker>

                  <RouteMarker at="end">
                    <MarkerContent>
                      <div className="bg-emerald-500 ring-background size-4 rounded-full shadow-md ring-2" />
                    </MarkerContent>
                  </RouteMarker>
                </>
              )}
            </MapRoute>
          )
        })}

        {/* Render Stop Markers if Stops view is selected */}
        {activeTab === 'stops' &&
          stops.map((stop, index) => (
            <MapMarker key={stop.name} longitude={stop.lng} latitude={stop.lat}>
              <MarkerContent>
                <div className="flex size-5 items-center justify-center rounded-full border-2 border-white bg-blue-600 text-[10px] font-bold text-white shadow-lg">
                  {index + 1}
                </div>
              </MarkerContent>
              <MarkerTooltip>{stop.name}</MarkerTooltip>
            </MapMarker>
          ))}

        {/* Start & End Map Markers */}
        <MapMarker longitude={startPoint.lng} latitude={startPoint.lat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-emerald-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold whitespace-nowrap shadow-md mb-0.5 border border-white">
                🛫 {startPoint.name}
              </div>
              <div className="size-6 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg">
                <Store className="size-3 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>

        <MapMarker longitude={endPoint.lng} latitude={endPoint.lat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-rose-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-extrabold whitespace-nowrap shadow-md mb-0.5 border border-white">
                🏁 {endPoint.name}
              </div>
              <div className="size-6 rounded-full bg-rose-500 border-2 border-white flex items-center justify-center shadow-lg">
                <MapPin className="size-3 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* Control Tabs Overlay */}
      {showControls && (
        <div className="absolute top-3 left-3 z-10 flex flex-col gap-2 max-w-[280px]">
          {/* Preset Location Switcher */}
          <div className="bg-[#18181b]/95 border border-[#27272a] rounded-xl p-1.5 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Compass className="size-3" /> Route Presets
              </span>
              {isLoading && <RefreshCw className="size-3 animate-spin text-gray-400" />}
            </div>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <button
                onClick={() => {
                  setStartPoint(PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.start)
                  setEndPoint(PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.end)
                  setStops(PRESET_ROUTES.BANGALORE_KITCHEN_TO_CUSTOMER.stops)
                }}
                className={cn(
                  'px-2 py-1 rounded-md font-medium text-center truncate transition',
                  startPoint.name.includes('Crave')
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-[#27272a] text-gray-300 hover:bg-[#3f3f46]'
                )}
              >
                Bengaluru
              </button>
              <button
                onClick={() => {
                  setStartPoint(PRESET_ROUTES.AMSTERDAM_TO_ROTTERDAM.start)
                  setEndPoint(PRESET_ROUTES.AMSTERDAM_TO_ROTTERDAM.end)
                  setStops(PRESET_ROUTES.AMSTERDAM_TO_ROTTERDAM.stops)
                }}
                className={cn(
                  'px-2 py-1 rounded-md font-medium text-center truncate transition',
                  startPoint.name.includes('Amsterdam')
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-[#27272a] text-gray-300 hover:bg-[#3f3f46]'
                )}
              >
                Rotterdam
              </button>
              <button
                onClick={() => {
                  setStartPoint(PRESET_ROUTES.NYC_CITY_TOUR.start)
                  setEndPoint(PRESET_ROUTES.NYC_CITY_TOUR.end)
                  setStops(PRESET_ROUTES.NYC_CITY_TOUR.stops)
                }}
                className={cn(
                  'px-2 py-1 rounded-md font-medium text-center truncate transition',
                  startPoint.name.includes('NYC')
                    ? 'bg-emerald-500 text-black font-bold'
                    : 'bg-[#27272a] text-gray-300 hover:bg-[#3f3f46]'
                )}
              >
                NYC Tour
              </button>
            </div>
          </div>

          {/* Alternative Routes List */}
          {routes.length > 0 && (
            <div
              role="radiogroup"
              aria-label="Route options"
              className="bg-[#18181b]/95 border border-[#27272a] rounded-xl p-2 shadow-xl backdrop-blur-md space-y-1"
            >
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1">
                OSRM Driving Options ({routes.length})
              </p>
              {routes.map((routeData, index) => {
                const isActive = index === selectedIndex
                return (
                  <button
                    key={index}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => {
                      setSelectedIndex(index)
                      onRouteSelected?.(routeData, index)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors',
                      isActive
                        ? 'bg-blue-950/80 border border-blue-500/50 text-white font-bold'
                        : 'hover:bg-[#27272a]/70 text-gray-400'
                    )}
                  >
                    <span
                      className="h-3.5 w-1 shrink-0 rounded-full"
                      style={{
                        backgroundColor: routeColor,
                        opacity: isActive ? 1 : inactiveOpacity,
                      }}
                    />
                    <span className="tabular-nums font-semibold">
                      {formatDuration(routeData.duration)}
                    </span>
                    <span className="ml-auto text-[11px] tabular-nums text-gray-400">
                      {formatDistance(routeData.distance)}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Bottom Progress HUD Slider */}
      {showControls && activeRoute && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:w-80 z-10 bg-[#18181b]/95 border border-[#27272a] rounded-xl p-3 shadow-2xl backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Bike className="size-4 text-emerald-400" /> Route Coverage
            </span>
            <span className="text-emerald-400 font-extrabold tabular-nums">
              {Math.round(progress * 100)}% ({formatDistance(activeRoute.distance * progress)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="size-8 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black flex items-center justify-center shrink-0 shadow-md font-bold"
              title={isPlaying ? 'Pause simulation' : 'Play progress simulation'}
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
            </button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={progress}
              onChange={(e) => {
                setIsPlaying(false)
                setProgress(parseFloat(e.target.value))
              }}
              className="w-full accent-emerald-400 bg-[#27272a] h-2 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  )
}

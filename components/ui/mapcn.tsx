'use client'

import {
  Map,
  MapArc,
  MapClusterLayer,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
  RouteMarker,
  RouteProgress,
  useMap,
  type MapControlsProps,
  type MapMarkerProps,
  type MapProps,
  type MapRef,
  type MapRouteProps,
  type MapViewport,
} from '@/components/ui/map'
import { DEFAULT_MAP_THEME_KEY, MAP_THEMES, MapThemeConfig } from '@/lib/map-config'
import { useEffect, useState } from 'react'

// Re-export all primitive map components and types from the installed @mapcn/map component
export {
  Map,
  MapArc,
  MapClusterLayer,
  MapControls,
  MapGeoJSON,
  MapMarker,
  MapPopup,
  MapRoute,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
  RouteMarker,
  RouteProgress,
  useMap,
}

export type { MapControlsProps, MapMarkerProps, MapProps, MapRef, MapRouteProps, MapViewport }

export interface MapcnProps {
  className?: string
  pickupCoords?: [number, number] // [lat, lng]
  dropoffCoords?: [number, number] // [lat, lng]
  driverCoords?: [number, number] // [lat, lng]
  restaurantName?: string
  customerAddress?: string
  height?: string
  themeKey?: string
  customTheme?: Partial<MapThemeConfig>
}

// Generate street-grid fallback coordinates along city roads (90-degree street turns) if OSRM is offline
function generateGridRoadWaypoints(
  start: [number, number], // [lng, lat]
  driver: [number, number],
  end: [number, number]
): [number, number][] {
  const points: [number, number][] = []

  // Leg 1: start to driver via street grid
  const mid1: [number, number] = [driver[0], start[1]]
  for (let i = 0; i <= 10; i++) {
    const t = i / 10
    points.push([start[0] + (mid1[0] - start[0]) * t, start[1]])
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    points.push([mid1[0], mid1[1] + (driver[1] - mid1[1]) * t])
  }

  // Leg 2: driver to end via street grid
  const mid2: [number, number] = [end[0], driver[1]]
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    points.push([driver[0] + (mid2[0] - driver[0]) * t, driver[1]])
  }
  for (let i = 1; i <= 10; i++) {
    const t = i / 10
    points.push([mid2[0], mid2[1] + (end[1] - mid2[1]) * t])
  }

  return points
}

export default function Mapcn({
  className = '',
  pickupCoords = [12.9784, 77.6408],
  dropoffCoords = [12.9352, 77.6245],
  driverCoords = [12.958, 77.632],
  height = 'h-64 sm:h-72 lg:h-96',
  themeKey = DEFAULT_MAP_THEME_KEY,
}: MapcnProps) {
  const [activeThemeKey] = useState<string>(themeKey)
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([])
  const [isLoadingRoute, setIsLoadingRoute] = useState(true)

  const activeTheme = MAP_THEMES[activeThemeKey] || MAP_THEMES.slateMinimal

  // MapLibre uses [lng, lat] format
  const pickupLngLat: [number, number] = [pickupCoords[1], pickupCoords[0]]
  const dropoffLngLat: [number, number] = [dropoffCoords[1], dropoffCoords[0]]
  const driverLngLat: [number, number] = [driverCoords[1], driverCoords[0]]

  // Fetch real street road geometry from OSRM Routing Engine API
  useEffect(() => {
    let isCancelled = false
    setIsLoadingRoute(true)

    async function fetchRoadRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickupLngLat[0]},${pickupLngLat[1]};${driverLngLat[0]},${driverLngLat[1]};${dropoffLngLat[0]},${dropoffLngLat[1]}?overview=full&geometries=geojson`
        const res = await fetch(url)
        const data = await res.json()

        if (!isCancelled && data.routes && data.routes.length > 0) {
          const route = data.routes[0]
          const coords = route.geometry.coordinates as [number, number][]
          setRouteCoordinates(coords)
          setIsLoadingRoute(false)
          return
        }
      } catch (err) {
        console.warn('OSRM routing fetch failed, falling back to street grid:', err)
      }

      if (!isCancelled) {
        // Fallback to street-grid waypoints if offline or network error
        const fallback = generateGridRoadWaypoints(pickupLngLat, driverLngLat, dropoffLngLat)
        setRouteCoordinates(fallback)
        setIsLoadingRoute(false)
      }
    }

    fetchRoadRoute()

    return () => {
      isCancelled = true
    }
  }, [
    pickupCoords[0],
    pickupCoords[1],
    driverCoords[0],
    driverCoords[1],
    dropoffCoords[0],
    dropoffCoords[1],
  ])

  // Approximate driver progress fraction (0 to 1) along the route
  const progressFraction = 0.45

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl border border-slate-200 bg-[#f0f4f8] shadow-md ${className}`}
    >
      <div className={`w-full ${height}`}>
        <Map
          viewport={{
            center: driverLngLat,
            zoom: 13.8,
          }}
          theme="light"
          loading={isLoadingRoute}
        >
          {routeCoordinates.length > 1 && (
            <MapRoute
              coordinates={routeCoordinates}
              progress={progressFraction}
              color={activeTheme.route.glowColor || '#354659'}
              width={5}
              opacity={0.35}
            >
              {/* Completed/Traveled Portion along the road network */}
              <RouteProgress
                color={activeTheme.route.lineColor || '#2f3e50'}
                width={5}
                opacity={1}
              />

              {/* Start Store Marker on the road (Pure Icon Pin, No Text) */}
              <RouteMarker at="start">
                <MarkerContent>
                  <div
                    style={{
                      backgroundColor: '#354659',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2.5px solid #ffffff',
                      boxShadow: '0 0 10px rgba(53, 70, 89, 0.4)',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>
                </MarkerContent>
              </RouteMarker>

              {/* Driver Live Marker on the road (Pure Icon Pin, No Text) */}
              <RouteMarker at="progress">
                <MarkerContent>
                  <div
                    style={{
                      position: 'relative',
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        backgroundColor: '#697b91',
                        opacity: 0.4,
                        animation: 'ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite',
                      }}
                    />
                    <div
                      style={{
                        position: 'relative',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: '#354659',
                        color: '#ffffff',
                        border: '2.5px solid #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 0 12px rgba(53, 70, 89, 0.5)',
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="1" y="3" width="15" height="13" rx="2" />
                        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                        <circle cx="5.5" cy="18.5" r="2.5" />
                        <circle cx="18.5" cy="18.5" r="2.5" />
                      </svg>
                    </div>
                  </div>
                </MarkerContent>
              </RouteMarker>

              {/* End Customer Dropoff Marker on the road (Pure Icon Pin, No Text) */}
              <RouteMarker at="end">
                <MarkerContent>
                  <div
                    style={{
                      backgroundColor: '#1e293b',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '2.5px solid #ffffff',
                      boxShadow: '0 0 10px rgba(30, 41, 59, 0.4)',
                    }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: '#ffffff',
                      }}
                    />
                  </div>
                </MarkerContent>
              </RouteMarker>
            </MapRoute>
          )}

          <MapControls position="top-right" showZoom showCompass showLocate showFullscreen />
        </Map>
      </div>
    </div>
  )
}

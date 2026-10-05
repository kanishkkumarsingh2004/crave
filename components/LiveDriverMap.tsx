'use client'

import { Map, MapControls, MapMarker, MapRoute, MarkerContent } from '@/components/ui/map'
import { Bike, MapPin, Navigation, RefreshCw, Store } from 'lucide-react'
import { useEffect, useState } from 'react'

interface LiveDriverMapProps {
  restaurantLat?: number
  restaurantLng?: number
  restaurantName?: string
  customerLat?: number
  customerLng?: number
  customerAddress?: string
  driverLat?: number | null
  driverLng?: number | null
  driverName?: string | null
  statusStep?: number
}

export default function LiveDriverMap({
  restaurantLat = 12.9352,
  restaurantLng = 77.6245,
  restaurantName = 'Crave Kitchen Store',
  customerLat = 12.9716,
  customerLng = 77.5946,
  customerAddress = 'HSR Layout, Bengaluru',
  driverLat = null,
  driverLng = null,
  driverName = 'Assigned Rider',
  statusStep = 1,
}: LiveDriverMapProps) {
  const [routePoints, setRoutePoints] = useState<[number, number][]>([])
  const [routeIndex, setRouteIndex] = useState<number>(0)
  const [driverPos, setDriverPos] = useState<[number, number]>([restaurantLng, restaurantLat])
  const [headingAngle, setHeadingAngle] = useState<number>(45)
  const [distanceText, setDistanceText] = useState<string>('Calculating road route...')
  const [isLoadingRoute, setIsLoadingRoute] = useState<boolean>(true)
  const [driverAddress, setDriverAddress] = useState<string>('Locating rider address...')

  // Reverse geocode driver current position
  useEffect(() => {
    let active = true
    const fetchAddr = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${driverPos[1]}&lon=${driverPos[0]}`,
          { headers: { 'Accept-Language': 'en' } }
        )
        if (res.ok) {
          const data = await res.json()
          if (data && data.display_name && active) {
            const parts = data.display_name.split(', ')
            const clean = parts.slice(0, 3).join(', ')
            setDriverAddress(clean)
          }
        }
      } catch (e) {}
    }

    const timer = setTimeout(fetchAddr, 800)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [driverPos])

  // Fetch Turn-by-Turn Road Route via OSRM
  useEffect(() => {
    let isMounted = true
    setIsLoadingRoute(true)

    const fetchRoadRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${restaurantLng},${restaurantLat};${customerLng},${customerLat}?overview=full&geometries=geojson`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          if (data.routes && data.routes[0] && isMounted) {
            const rawCoords: [number, number][] = data.routes[0].geometry.coordinates // [lng, lat]
            const distMeters = data.routes[0].distance || 1800
            setDistanceText(`~${(distMeters / 1000).toFixed(1)} km along street route`)
            setRoutePoints(rawCoords)
            setIsLoadingRoute(false)
            return
          }
        }
      } catch (err) {
        console.warn('OSRM road routing fallback active:', err)
      }

      if (!isMounted) return

      const latDiff = customerLat - restaurantLat
      const lngDiff = customerLng - restaurantLng
      const fallbackWaypoints: [number, number][] = [
        [restaurantLng, restaurantLat],
        [restaurantLng, restaurantLat + latDiff * 0.2],
        [restaurantLng + lngDiff * 0.5, restaurantLat + latDiff * 0.2],
        [restaurantLng + lngDiff * 0.5, restaurantLat + latDiff * 0.7],
        [restaurantLng + lngDiff * 0.9, restaurantLat + latDiff * 0.7],
        [customerLng, customerLat],
      ]
      setRoutePoints(fallbackWaypoints)
      setDistanceText('~1.8 km road route')
      setIsLoadingRoute(false)
    }

    fetchRoadRoute()
    return () => {
      isMounted = false
    }
  }, [restaurantLat, restaurantLng, customerLat, customerLng])

  // Animate Rider position
  useEffect(() => {
    if (routePoints.length === 0) return

    if (driverLat && driverLng) {
      setDriverPos([driverLng, driverLat])
      return
    }

    if (statusStep === 1) {
      setDriverPos(routePoints[0])
      setRouteIndex(0)
      return
    }

    if (statusStep >= 4) {
      const lastIndex = routePoints.length - 1
      setDriverPos(routePoints[lastIndex])
      setRouteIndex(lastIndex)
      return
    }

    const stepDuration = 1800
    const interval = setInterval(() => {
      setRouteIndex((prevIdx) => {
        const nextIdx = prevIdx + 1
        if (nextIdx >= routePoints.length) {
          return prevIdx
        }

        const cur = routePoints[prevIdx]
        const nxt = routePoints[nextIdx]

        const dLat = nxt[1] - cur[1]
        const dLng = nxt[0] - cur[0]
        const angleRad = Math.atan2(dLng, dLat)
        const angleDeg = (angleRad * 180) / Math.PI
        setHeadingAngle(angleDeg)
        setDriverPos(nxt)

        return nextIdx
      })
    }, stepDuration)

    return () => clearInterval(interval)
  }, [routePoints, statusStep, driverLat, driverLng])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#27272a] shadow-2xl bg-[#09090b] h-64 sm:h-72">
      {/* MapLibre GL Map */}
      <Map
        center={[driverPos[0], driverPos[1]]}
        zoom={14}
        styles={{
          light: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
          dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        }}
        className="h-full w-full"
      >
        <MapControls position="bottom-right" showZoom showLocate={false} />

        {/* Turn-by-Turn Route */}
        {routePoints.length > 0 && (
          <MapRoute coordinates={routePoints} color="#3b82f6" width={5} opacity={0.85} />
        )}

        {/* Restaurant Pin */}
        <MapMarker longitude={restaurantLng} latitude={restaurantLat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-[#10b981] text-white px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap shadow-md mb-1 border border-white">
                🏬 {restaurantName}
              </div>
              <div className="size-7 rounded-full bg-[#10b981] border-2 border-white flex items-center justify-center shadow-lg">
                <Store className="size-3.5 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Customer Pin */}
        <MapMarker longitude={customerLng} latitude={customerLat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-[#ef4444] text-white px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap shadow-md mb-1 border border-white">
                📍 Destination
              </div>
              <div className="size-7 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center shadow-lg">
                <MapPin className="size-3.5 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Live Rider Marker */}
        <MapMarker longitude={driverPos[0]} latitude={driverPos[1]}>
          <MarkerContent>
            <div className="relative size-12 flex items-center justify-center">
              <div className="absolute size-12 bg-[#d9f447]/40 rounded-full animate-ping" />
              <div
                className="size-9 rounded-full bg-[#18201c] border-2 border-[#d9f447] flex items-center justify-center shadow-2xl transition-transform duration-300"
                style={{ transform: `rotate(${headingAngle}deg)` }}
              >
                <Navigation className="size-5 text-[#d9f447] fill-[#d9f447]" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* Top Map Telemetry Badge */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#18181b]/95 border border-[#27272a] px-3.5 py-1.5 shadow-xl backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d9f447] opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-[#d9f447]"></span>
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#d9f447] flex items-center gap-1.5">
            MapLibre Live Rider GPS Route
            {isLoadingRoute && <RefreshCw className="size-3 animate-spin text-gray-400" />}
          </span>
        </div>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-3 left-3 right-16 z-10 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#09090b]/95 border border-[#27272a] px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] border border-[#d9f447]/40 shrink-0 shadow-md">
              <Bike className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>{driverName || 'Verified Delivery Partner'}</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  {statusStep >= 3
                    ? 'Picked Up • On the Way'
                    : statusStep === 2
                      ? 'At Kitchen'
                      : 'Order Assigned'}
                </span>
              </p>
              <p className="text-[10px] text-emerald-300/90 font-medium truncate max-w-[240px] sm:max-w-[360px] mt-0.5 flex items-center gap-1">
                <MapPin className="size-3 text-[#d9f447] shrink-0" />
                <span className="truncate">Rider Address: {driverAddress}</span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-[#27272a] pt-1.5 sm:pt-0">
            <p className="text-[10px] font-bold text-[#d9f447] uppercase tracking-wider">
              Street Route
            </p>
            <p className="text-xs font-extrabold text-white">{distanceText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

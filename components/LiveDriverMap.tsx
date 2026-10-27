'use client'

import { Map, MapControls, MapMarker, MapRoute, MarkerContent, useMap } from '@/components/ui/map'
import { calculateRoadTravelDistanceKm } from '@/lib/distance-pricing'
import { Bike, MapPin, Navigation, Store } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface LiveDriverMapProps {
  restaurantLat?: number
  restaurantLng?: number
  restaurantName?: string
  customerLat?: number
  customerLng?: number
  driverLat?: number | null
  driverLng?: number | null
  driverName?: string | null
  statusStep?: number
  isStale?: boolean
}

/**
 * Camera controller that frames the entire trip initially and smoothly tracks rider
 */
function MapCameraController({
  driverPos,
  restaurantLng,
  restaurantLat,
  customerLng,
  customerLat,
  hasLiveGps,
}: {
  driverPos: [number, number]
  restaurantLng: number
  restaurantLat: number
  customerLng: number
  customerLat: number
  hasLiveGps: boolean
}) {
  const { map, isLoaded } = useMap()
  const initialFitRef = useRef(false)

  // Fit bounds once so user sees pickup, dropoff, and rider on screen
  useEffect(() => {
    if (!map || !isLoaded || initialFitRef.current) return
    try {
      const minLng = Math.min(restaurantLng, customerLng, driverPos[0]) - 0.003
      const maxLng = Math.max(restaurantLng, customerLng, driverPos[0]) + 0.003
      const minLat = Math.min(restaurantLat, customerLat, driverPos[1]) - 0.003
      const maxLat = Math.max(restaurantLat, customerLat, driverPos[1]) + 0.003

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 50, maxZoom: 15, duration: 1000 }
      )
      initialFitRef.current = true
    } catch (e) {}
  }, [map, isLoaded, restaurantLng, restaurantLat, customerLng, customerLat, driverPos])

  // Smoothly follow driver position when live GPS moves
  useEffect(() => {
    if (!map || !isLoaded || !hasLiveGps) return
    map.easeTo({
      center: driverPos,
      duration: 1000,
    })
  }, [map, isLoaded, driverPos, hasLiveGps])

  return null
}

export default function LiveDriverMap({
  restaurantLat = 12.9716,
  restaurantLng = 77.6412,
  restaurantName = 'Crave Kitchen Store',
  customerLat = 12.9716,
  customerLng = 77.5946,
  driverLat = null,
  driverLng = null,
  driverName = null,
  statusStep = 1,
  isStale = false,
}: LiveDriverMapProps) {
  // Target position from incoming GPS stream
  const targetPosRef = useRef<[number, number]>([
    driverLng != null ? Number(driverLng) : restaurantLng,
    driverLat != null ? Number(driverLat) : restaurantLat,
  ])
  // Current animated position interpolated smoothly at 60fps
  const [driverPos, setDriverPos] = useState<[number, number]>([
    driverLng != null ? Number(driverLng) : restaurantLng,
    driverLat != null ? Number(driverLat) : restaurantLat,
  ])

  // Geographic compass heading in degrees: 0=North, 90=East, 180=South, 270=West
  const [headingAngle, setHeadingAngle] = useState<number>(0)
  const [routePoints, setRoutePoints] = useState<[number, number][]>([])
  const [distanceText, setDistanceText] = useState<string>('Calculating road route...')
  const [, setIsLoadingRoute] = useState<boolean>(true)
  const [driverAddress, setDriverAddress] = useState<string>('Locating rider address...')
  const [lastGpsUpdate, setLastGpsUpdate] = useState<Date | null>(null)
  const prevPosRef = useRef<[number, number] | null>(null)

  const hasLiveGps = driverLat != null && driverLng != null

  // 60fps Smooth Motion Interpolation loop
  useEffect(() => {
    let animId: number
    const animate = () => {
      setDriverPos((curr) => {
        const [targetLng, targetLat] = targetPosRef.current
        const diffLng = targetLng - curr[0]
        const diffLat = targetLat - curr[1]
        const dist = Math.hypot(diffLng, diffLat)
        if (dist < 0.000001) {
          return curr
        }
        // Smooth lerp: moves 12% of remaining distance each frame (~0.5s smooth transition)
        const lerpFactor = 0.12
        return [curr[0] + diffLng * lerpFactor, curr[1] + diffLat * lerpFactor]
      })
      animId = requestAnimationFrame(animate)
    }
    animId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animId)
  }, [])

  // Reverse geocode driver position
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

    const timer = setTimeout(fetchAddr, 1000)
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
            const km = Number((distMeters / 1000).toFixed(1))
            const driveMins = Math.max(2, Math.round(km * 2))
            setDistanceText(`~${km} km (${driveMins} mins drive)`)
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
      const realDist = calculateRoadTravelDistanceKm(
        restaurantLat,
        restaurantLng,
        customerLat,
        customerLng
      )
      const driveMins = Math.max(2, Math.round(realDist * 2))
      setDistanceText(`~${realDist} km (${driveMins} mins drive)`)
      setIsLoadingRoute(false)
    }

    fetchRoadRoute()
    return () => {
      isMounted = false
    }
  }, [restaurantLat, restaurantLng, customerLat, customerLng])

  // Update target position and compass bearing from live GPS
  useEffect(() => {
    if (driverLat != null && driverLng != null) {
      const nextLng = Number(driverLng)
      const nextLat = Number(driverLat)
      targetPosRef.current = [nextLng, nextLat]
      setLastGpsUpdate(new Date())

      // True compass bearing: 0° = North, 90° = East, 180° = South, 270° = West
      if (prevPosRef.current) {
        const [prevLng, prevLat] = prevPosRef.current
        const dLng = nextLng - prevLng
        const dLat = nextLat - prevLat
        if (Math.hypot(dLng, dLat) > 0.000005) {
          const rad = Math.atan2(dLng, dLat)
          const deg = (rad * 180 / Math.PI + 360) % 360
          setHeadingAngle(deg)
        }
      } else if (customerLat != null && customerLng != null) {
        const dLng = customerLng - nextLng
        const dLat = customerLat - nextLat
        const rad = Math.atan2(dLng, dLat)
        const deg = (rad * 180 / Math.PI + 360) % 360
        setHeadingAngle(deg)
      }
      prevPosRef.current = [nextLng, nextLat]
    } else {
      // Park rider marker at restaurant kitchen store location when awaiting driver GPS
      targetPosRef.current = [restaurantLng, restaurantLat]
    }
  }, [driverLat, driverLng, restaurantLat, restaurantLng, customerLat, customerLng])

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#27272a] shadow-2xl bg-[#09090b] h-64 sm:h-80 md:h-96">
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
        <MapControls position="top-right" showZoom showLocate={false} />

        <MapCameraController
          driverPos={driverPos}
          restaurantLng={restaurantLng}
          restaurantLat={restaurantLat}
          customerLng={customerLng}
          customerLat={customerLat}
          hasLiveGps={hasLiveGps}
        />

        {/* Turn-by-Turn Route */}
        {routePoints.length > 0 && (
          <MapRoute coordinates={routePoints} color="#3b82f6" width={5} opacity={0.85} />
        )}

        {/* Restaurant Pin */}
        <MapMarker longitude={restaurantLng} latitude={restaurantLat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-bold whitespace-nowrap shadow-md mb-1 border border-white/20">
                {restaurantName}
              </div>
              <div className="size-6 sm:size-7 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-lg">
                <Store className="size-3 sm:size-3.5 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Customer Destination Pin */}
        <MapMarker longitude={customerLng} latitude={customerLat}>
          <MarkerContent>
            <div className="flex flex-col items-center">
              <div className="bg-[#ef4444] text-white px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-extrabold whitespace-nowrap shadow-md mb-1 border border-white">
                Destination
              </div>
              <div className="size-6 sm:size-7 rounded-full bg-[#ef4444] border-2 border-white flex items-center justify-center shadow-lg">
                <MapPin className="size-3 sm:size-3.5 text-white" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>

        {/* Live Rider Marker: Rotated smoothly by true compass bearing */}
        <MapMarker longitude={driverPos[0]} latitude={driverPos[1]}>
          <MarkerContent>
            <div className="relative size-10 sm:size-12 flex items-center justify-center">
              <div className="absolute size-10 sm:size-12 bg-emerald-500/30 rounded-full animate-ping" />
              <div
                className="size-8 sm:size-9 rounded-full bg-[#18201c] border-2 border-emerald-400 flex items-center justify-center shadow-2xl transition-transform duration-300"
                style={{ transform: `rotate(${headingAngle}deg)` }}
                title={`Heading: ${Math.round(headingAngle)}°`}
              >
                {/* -rotate-45 aligns the natural 45° NE Lucide needle to straight North (0°) */}
                <Navigation className="size-4 sm:size-5 text-emerald-400 fill-emerald-400 -rotate-45" />
              </div>
            </div>
          </MarkerContent>
        </MapMarker>
      </Map>

      {/* Top Map Telemetry Indicator */}
      <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-10 flex items-center pointer-events-none max-w-[calc(100%-70px)]">
        <span
          className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider truncate bg-black/60 px-2 py-1 rounded ${
            hasLiveGps ? (isStale ? 'text-amber-400' : 'text-emerald-400') : 'text-amber-400'
          }`}
        >
          {hasLiveGps
            ? isStale
              ? 'GPS Signal Delayed · Last Known Location'
              : `Live Driver GPS · ${lastGpsUpdate ? lastGpsUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active'}`
            : 'Awaiting Driver GPS Signal'}
        </span>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-16 z-10 pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-3 rounded-xl bg-[#09090b]/95 border border-[#27272a] px-2.5 py-1.5 sm:px-4 sm:py-2.5 shadow-2xl backdrop-blur-md max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="grid size-7 sm:size-9 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 shadow-md">
              <Bike className="size-3 sm:size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] sm:text-xs font-bold text-white flex items-center gap-1 sm:gap-1.5 flex-wrap leading-tight">
                <span className="truncate max-w-[100px] sm:max-w-none">
                  {driverName || 'Awaiting driver'}
                </span>
                <span className="text-[8px] sm:text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-1.5 sm:px-2 py-0.5 rounded-full border border-emerald-700/50 shrink-0">
                  {!driverName
                    ? 'Finding Rider'
                    : statusStep >= 4
                      ? 'Delivered'
                      : statusStep >= 3
                        ? 'On the Way'
                        : statusStep === 2
                          ? 'At Kitchen'
                          : 'Assigned'}
                </span>
              </p>
              <p className="text-[8px] sm:text-[10px] text-emerald-300/90 font-medium truncate max-w-[140px] sm:max-w-[360px] mt-0.5 flex items-center gap-1">
                <MapPin className="size-2.5 sm:size-3 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {driverName ? `Address: ${driverAddress}` : `Store: ${restaurantName}`}
                </span>
              </p>
            </div>
          </div>
          <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[#27272a] pt-1 sm:pt-0 shrink-0">
            <p className="text-[8px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
              Street Route
            </p>
            <p className="text-[10px] sm:text-xs font-extrabold text-white">{distanceText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

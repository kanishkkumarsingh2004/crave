'use client'

import L from 'leaflet'
import { Bike, MapPin, Navigation, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const driverMarkerRef = useRef<L.Marker | null>(null)
  const routePolylineRef = useRef<L.Polyline | null>(null)
  const traveledPolylineRef = useRef<L.Polyline | null>(null)

  const [routePoints, setRoutePoints] = useState<[number, number][]>([])
  const [routeIndex, setRouteIndex] = useState<number>(0)
  const [driverPos, setDriverPos] = useState<[number, number]>([restaurantLat, restaurantLng])
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
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${driverPos[0]}&lon=${driverPos[1]}`,
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

  // 1. Fetch Turn-by-Turn Road Route via OSRM Public Routing Service
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
            const rawCoords: [number, number][] = data.routes[0].geometry.coordinates.map(
              (c: [number, number]) => [c[1], c[0]]
            )
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

      // Synthetic street turn waypoints fallback
      const latDiff = customerLat - restaurantLat
      const lngDiff = customerLng - restaurantLng
      const fallbackWaypoints: [number, number][] = [
        [restaurantLat, restaurantLng],
        [restaurantLat + latDiff * 0.2, restaurantLng],
        [restaurantLat + latDiff * 0.2, restaurantLng + lngDiff * 0.5],
        [restaurantLat + latDiff * 0.7, restaurantLng + lngDiff * 0.5],
        [restaurantLat + latDiff * 0.7, restaurantLng + lngDiff * 0.9],
        [customerLat, customerLng],
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

  // 2. Animate Rider Arrow Pin along the Turn-by-Turn Road Route
  useEffect(() => {
    if (routePoints.length === 0) return

    if (driverLat && driverLng) {
      setDriverPos([driverLat, driverLng])
      return
    }

    // Step 1: At Kitchen
    if (statusStep === 1) {
      setDriverPos(routePoints[0])
      setRouteIndex(0)
      return
    }

    // Step 4: Delivered
    if (statusStep >= 4) {
      const lastIndex = routePoints.length - 1
      setDriverPos(routePoints[lastIndex])
      setRouteIndex(lastIndex)
      return
    }

    // Step 2 & 3: Animate progressively along road route points
    const stepDuration = 1800 // 1.8 sec per road segment
    const interval = setInterval(() => {
      setRouteIndex((prevIdx) => {
        const nextIdx = prevIdx + 1
        if (nextIdx >= routePoints.length) {
          return prevIdx
        }

        const cur = routePoints[prevIdx]
        const nxt = routePoints[nextIdx]

        // Calculate rotation angle (heading) between points
        const dLat = nxt[0] - cur[0]
        const dLng = nxt[1] - cur[1]
        const angleRad = Math.atan2(dLng, dLat)
        const angleDeg = (angleRad * 180) / Math.PI
        setHeadingAngle(angleDeg)
        setDriverPos(nxt)

        return nextIdx
      })
    }, stepDuration)

    return () => clearInterval(interval)
  }, [routePoints, statusStep, driverLat, driverLng])

  // 3. Initialize Map with Clean Esri Dark Canvas Tiles (100% Free, NO Watermark / NO API Key)
  useEffect(() => {
    if (!mapContainerRef.current) return
    if (mapInstanceRef.current) return

    // Esri World Dark Gray Base Map Layer
    const map = L.map(mapContainerRef.current, {
      center: [restaurantLat, restaurantLng],
      zoom: 14,
      zoomControl: false,
    })
    mapInstanceRef.current = map

    // 100% Free Esri Dark Canvas Tiles (Clean, crisp dark map with NO watermarks)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, OpenStreetMap',
        maxZoom: 16,
      }
    ).addTo(map)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    // Restaurant Marker (Green Badge)
    const restaurantIcon = L.divIcon({
      className: 'custom-mapcn-restaurant-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #10b981; color: #ffffff; border: 2px solid #ffffff; padding: 3px 9px; border-radius: 12px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 14px rgba(16,185,129,0.5); margin-bottom: 4px;">
            🏬 ${restaurantName}
          </div>
          <div style="width: 30px; height: 30px; background-color: #10b981; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(16,185,129,0.6);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
          </div>
        </div>
      `,
      iconSize: [130, 60],
      iconAnchor: [65, 55],
    })
    L.marker([restaurantLat, restaurantLng], { icon: restaurantIcon }).addTo(map)

    // Customer Dropoff Marker (Red Badge)
    const customerIcon = L.divIcon({
      className: 'custom-mapcn-customer-marker',
      html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <div style="background-color: #ef4444; color: #ffffff; border: 2px solid #ffffff; padding: 3px 9px; border-radius: 12px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 4px 14px rgba(239,68,68,0.5); margin-bottom: 4px;">
            📍 Delivery Destination
          </div>
          <div style="width: 30px; height: 30px; background-color: #ef4444; border: 3px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239,68,68,0.6);">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          </div>
        </div>
      `,
      iconSize: [130, 60],
      iconAnchor: [65, 55],
    })
    L.marker([customerLat, customerLng], { icon: customerIcon }).addTo(map)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [])

  // 4. Update Map Route Lines & Rotating Rider Arrow Marker
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Draw full road route polyline
    if (routePoints.length > 0) {
      if (routePolylineRef.current) {
        routePolylineRef.current.setLatLngs(routePoints)
      } else {
        routePolylineRef.current = L.polyline(routePoints, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.85,
        }).addTo(map)
      }

      // Draw traveled path segment (Vibrant Crave Lime)
      const traveledPoints = routePoints.slice(0, routeIndex + 1)
      if (traveledPoints.length > 0) {
        if (traveledPolylineRef.current) {
          traveledPolylineRef.current.setLatLngs(traveledPoints)
        } else {
          traveledPolylineRef.current = L.polyline(traveledPoints, {
            color: '#d9f447',
            weight: 6,
            opacity: 1,
          }).addTo(map)
        }
      }

      // Fit map view bounds
      const bounds = L.latLngBounds(routePoints)
      map.fitBounds(bounds, { padding: [45, 45] })
    }
  }, [routePoints, routeIndex])

  // 5. Update Rotating Navigation Arrow Marker Position & Rotation Angle
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    // Custom Rotating Arrow GPS Marker Icon
    const arrowIcon = L.divIcon({
      className: 'custom-mapcn-arrow-driver-marker',
      html: `
        <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 48px; height: 48px; background-color: rgba(217, 244, 71, 0.35); border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 38px; height: 38px; background-color: #18201c; border: 3px solid #d9f447; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px rgba(217, 244, 71, 0.9); transform: rotate(${headingAngle}deg); transition: transform 0.3s ease;">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#d9f447" stroke="#18201c" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"/>
            </svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
    })

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng(driverPos)
      driverMarkerRef.current.setIcon(arrowIcon)
    } else {
      driverMarkerRef.current = L.marker(driverPos, { icon: arrowIcon, zIndexOffset: 1000 }).addTo(map)
    }
  }, [driverPos, headingAngle])

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(driverPos, 16, { animate: true, duration: 1 })
    }
  }

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#27272a] shadow-2xl bg-[#09090b]">
      {/* Map container */}
      <div ref={mapContainerRef} className="h-64 sm:h-72 w-full z-0 cursor-grab" />

      {/* Top Map Telemetry Badge */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-2 pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-full bg-[#18181b]/95 border border-[#27272a] px-3.5 py-1.5 shadow-xl backdrop-blur-md">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d9f447] opacity-75"></span>
            <span className="relative inline-flex rounded-full size-2.5 bg-[#d9f447]"></span>
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#d9f447] flex items-center gap-1.5">
            Mapcn Real-Time GPS Route
            {isLoadingRoute && <RefreshCw className="size-3 animate-spin text-gray-400" />}
          </span>
        </div>
      </div>

      {/* Recenter Button */}
      <button
        type="button"
        onClick={handleRecenter}
        className="absolute top-3 right-3 z-[400] flex items-center gap-1.5 rounded-full bg-[#18181b]/95 border border-[#27272a] px-3.5 py-1.5 text-xs font-bold text-white shadow-xl hover:bg-[#27272a] hover:scale-105 active:scale-95 transition backdrop-blur-md"
      >
        <Navigation className="size-3.5 text-[#d9f447]" />
        <span>Center Rider</span>
      </button>

      {/* Bottom Telemetry HUD */}
      <div className="absolute bottom-3 left-3 right-3 z-[400] pointer-events-none">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-[#09090b]/95 border border-[#27272a] px-4 py-2.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-9 place-items-center rounded-xl bg-[#18201c] text-[#d9f447] border border-[#d9f447]/40 shrink-0 shadow-md">
              <Bike className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                <span>{driverName || 'Verified Delivery Partner'}</span>
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-700/50">
                  {statusStep >= 3 ? 'Picked Up • On the Way' : statusStep === 2 ? 'At Kitchen' : 'Order Assigned'}
                </span>
              </p>
              <p className="text-[10px] text-emerald-300/90 font-medium truncate max-w-[280px] sm:max-w-[360px] mt-0.5 flex items-center gap-1">
                <MapPin className="size-3 text-[#d9f447] shrink-0" />
                <span className="truncate">Rider Address: {driverAddress}</span>
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right shrink-0 border-t sm:border-t-0 border-[#27272a] pt-1.5 sm:pt-0">
            <p className="text-[10px] font-bold text-[#d9f447] uppercase tracking-wider">Street Route</p>
            <p className="text-xs font-extrabold text-white">{distanceText}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

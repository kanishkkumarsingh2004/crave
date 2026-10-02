'use client'

import React, { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Bike, Navigation, MapPin, Store, ZoomIn, ZoomOut } from 'lucide-react'

interface MapcnProps {
  className?: string
  pickupCoords?: [number, number] // [lat, lng]
  dropoffCoords?: [number, number] // [lat, lng]
  driverCoords?: [number, number] // [lat, lng]
  restaurantName?: string
  customerAddress?: string
  height?: string
}

export default function Mapcn({
  className = '',
  pickupCoords = [12.9784, 77.6408], // Indiranagar [lat, lng]
  dropoffCoords = [12.9352, 77.6245], // Koramangala [lat, lng]
  driverCoords = [12.9580, 77.6320], // Midpoint [lat, lng]
  restaurantName = 'FreshBite Kitchen (Indiranagar)',
  customerAddress = 'Koramangala 4th Block',
  height = 'h-64 sm:h-72',
}: MapcnProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: driverCoords,
      zoom: 13,
      zoomControl: false,
      attributionControl: false,
    })

    // CARTO Voyager High-DPI raster tiles (100% reliable, super crisp)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map)

    // Route Polyline (Pickup -> Driver -> Dropoff)
    const routePoints: [number, number][] = [
      pickupCoords,
      [12.9680, 77.6360],
      driverCoords,
      [12.9450, 77.6280],
      dropoffCoords,
    ]

    // Route Glow (Lime accent)
    L.polyline(routePoints, {
      color: '#8fa71c',
      weight: 7,
      opacity: 0.6,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)

    // Main Route Line (Dark dashed)
    L.polyline(routePoints, {
      color: '#18201c',
      weight: 3.5,
      dashArray: '6, 8',
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map)

    // Custom Marker HTML Elements
    // 1. Kitchen Pickup Marker
    const pickupIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="background-color: #059669; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    L.marker(pickupCoords, { icon: pickupIcon })
      .bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <b style="color: #047857; font-size: 11px; display: block;">Pickup Kitchen</b>
          <span style="font-size: 11px; color: #1f2937;">${restaurantName}</span>
        </div>
      `)
      .addTo(map)

    // 2. Customer Dropoff Marker
    const dropoffIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="background-color: #f59e0b; color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.25);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    })

    L.marker(dropoffCoords, { icon: dropoffIcon })
      .bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <b style="color: #b45309; font-size: 11px; display: block;">Customer Address</b>
          <span style="font-size: 11px; color: #1f2937;">${customerAddress}</span>
        </div>
      `)
      .addTo(map)

    // 3. Driver Live Pulse Marker
    const driverIcon = L.divIcon({
      className: 'custom-leaflet-marker',
      html: `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: #d9f447; opacity: 0.6; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: relative; width: 36px; height: 36px; border-radius: 50%; background-color: #d9f447; color: #121815; border: 2.5px solid #18201c; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    })

    L.marker(driverCoords, { icon: driverIcon })
      .bindPopup(`
        <div style="font-family: system-ui, sans-serif; padding: 2px;">
          <b style="color: #121815; font-size: 11px; display: block;">Live GPS Location</b>
          <span style="font-size: 11px; color: #4b5563;">Moving towards Koramangala • 4 mins away</span>
        </div>
      `)
      .addTo(map)

    mapInstanceRef.current = map
    setMapReady(true)

    // Force map size re-calculation on mount
    setTimeout(() => {
      map.invalidateSize()
    }, 150)

    return () => {
      map.remove()
      mapInstanceRef.current = null
    }
  }, [pickupCoords, dropoffCoords, driverCoords, restaurantName, customerAddress])

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(driverCoords, 13.5, {
        duration: 1,
      })
    }
  }

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut()
    }
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl border border-[#dfe4dc] bg-[#f4f7f2] shadow-sm ${className}`}>
      {/* Map Container */}
      <div ref={mapContainerRef} className={`w-full ${height} z-0`} />



      {/* Map Control Buttons */}
      <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex flex-col gap-1.5">
        <button
          onClick={handleRecenter}
          title="Recenter on Driver"
          className="flex size-7 sm:size-8 items-center justify-center rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md text-[#18201c] shadow-md border border-[#e2e8df] hover:bg-gray-100 transition active:scale-95"
        >
          <Navigation className="size-3.5 sm:size-4 text-emerald-600 fill-emerald-600/20" />
        </button>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="flex size-7 sm:size-8 items-center justify-center rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md text-[#18201c] shadow-md border border-[#e2e8df] hover:bg-gray-100 transition active:scale-95 font-bold"
        >
          <ZoomIn className="size-3.5 sm:size-4" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="flex size-7 sm:size-8 items-center justify-center rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-md text-[#18201c] shadow-md border border-[#e2e8df] hover:bg-gray-100 transition active:scale-95 font-bold"
        >
          <ZoomOut className="size-3.5 sm:size-4" />
        </button>
      </div>

      {/* Bottom Route Legend Bar */}
      <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5 sm:gap-2 rounded-xl bg-[#121815]/95 backdrop-blur-md px-2.5 sm:px-3.5 py-2 sm:py-2.5 text-white shadow-xl border border-white/10">
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-semibold">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <Store className="size-3 sm:size-3.5 shrink-0" /> Indiranagar
          </span>
          <span className="text-gray-500 text-[9px] sm:text-[10px]">→</span>
          <span className="flex items-center gap-1 text-[#d9f447] font-bold">
            <Bike className="size-3 sm:size-3.5 shrink-0" /> En Route
          </span>
          <span className="text-gray-500 text-[9px] sm:text-[10px]">→</span>
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <MapPin className="size-3 sm:size-3.5 shrink-0" /> Koramangala
          </span>
        </div>

        <div className="flex items-center justify-end border-t sm:border-t-0 border-white/10 pt-1 sm:pt-0">
          <span className="shrink-0 text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#d9f447] bg-[#1d2722] px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-[#303f37]">
            Navigation Active
          </span>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

export type AddressMapPoint = {
  lat: number
  lng: number
}

const DEFAULT_LOCATION: AddressMapPoint = { lat: 12.9716, lng: 77.5946 }

export default function AddressMap({
  location,
  onPick,
}: {
  location: AddressMapPoint | null
  onPick: (point: AddressMapPoint) => void
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const markerRef = useRef<Marker | null>(null)
  const onPickRef = useRef(onPick)

  onPickRef.current = onPick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initial = location || DEFAULT_LOCATION
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [initial.lng, initial.lat],
      zoom: location ? 16 : 11,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left')
    map.on('click', (event: MapMouseEvent) => {
      onPickRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng })
    })
    mapRef.current = map

    return () => {
      markerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ color: '#718b16' })
        .setLngLat([location.lng, location.lat])
        .addTo(map)
    } else {
      markerRef.current.setLngLat([location.lng, location.lat])
    }
    map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 15) })
  }, [location?.lat, location?.lng])

  return <div ref={containerRef} className="address-map-canvas" aria-label="Address map" />
}

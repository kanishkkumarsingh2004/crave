import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { applyWebsiteMapPalette, websiteMapStyle } from './mapStyle'

export type AddressMapPoint = {
  lat: number
  lng: number
}

const DEFAULT_LOCATION: AddressMapPoint = { lat: 12.9716, lng: 77.5946 }

function createMapcnMarker() {
  const marker = document.createElement('div')
  marker.className = 'mapcn-marker'
  marker.setAttribute('aria-label', 'Selected location')
  marker.innerHTML = `
    <span class="mapcn-marker-pulse"></span>
    <span class="mapcn-marker-dot">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path>
        <circle cx="12" cy="10" r="2.5"></circle>
      </svg>
    </span>`
  return marker
}

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
  const [fallback, setFallback] = useState(false)

  onPickRef.current = onPick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initial = location || DEFAULT_LOCATION
    let activeStyle = websiteMapStyle()
    let map: MapLibreMap
    try {
      map = new maplibregl.Map({
        container: containerRef.current,
        style: activeStyle,
        center: [initial.lng, initial.lat],
        zoom: location ? 16 : 11,
        maxZoom: 19,
        fadeDuration: 0,
        renderWorldCopies: false,
        attributionControl: false,
      })
    } catch {
      setFallback(true)
      return
    }

    map.on('click', (event: MapMouseEvent) => {
      onPickRef.current({
        lat: Number(event.lngLat.lat.toFixed(6)),
        lng: Number(event.lngLat.lng.toFixed(6)),
      })
    })
    map.on('style.load', () => applyWebsiteMapPalette(map))
    mapRef.current = map
    const loadTimeout = window.setTimeout(() => setFallback(true), 15_000)
    const resize = () => map.resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)
    const themeObserver = new MutationObserver(() => {
      const nextStyle = websiteMapStyle()
      if (nextStyle === activeStyle) return
      activeStyle = nextStyle
      map.setStyle(nextStyle, { diff: false })
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    map.once('load', () => {
      window.clearTimeout(loadTimeout)
      requestAnimationFrame(resize)
      window.setTimeout(resize, 320)
    })
    document.addEventListener('visibilitychange', resize)

    return () => {
      window.clearTimeout(loadTimeout)
      resizeObserver.disconnect()
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', resize)
      markerRef.current?.remove()
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !location) return

    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({
        element: createMapcnMarker(),
        anchor: 'center',
        draggable: true,
      })
        .setLngLat([location.lng, location.lat])
        .addTo(map)
      markerRef.current.on('dragend', () => {
        const point = markerRef.current?.getLngLat()
        if (!point) return
        onPickRef.current({
          lat: Number(point.lat.toFixed(6)),
          lng: Number(point.lng.toFixed(6)),
        })
      })
    } else {
      markerRef.current.setLngLat([location.lng, location.lat])
    }
    map.easeTo({ center: [location.lng, location.lat], zoom: Math.max(map.getZoom(), 15) })
  }, [location?.lat, location?.lng])

  if (fallback) {
    const point = location || DEFAULT_LOCATION
    const delta = 0.008
    const source = `https://www.openstreetmap.org/export/embed.html?bbox=${point.lng - delta}%2C${point.lat - delta}%2C${point.lng + delta}%2C${point.lat + delta}&layer=mapnik&marker=${point.lat}%2C${point.lng}`
    return (
      <iframe
        className="address-map-canvas address-map-fallback"
        title="Address map"
        src={source}
        loading="lazy"
      />
    )
  }

  return <div ref={containerRef} className="address-map-canvas" aria-label="Address map" />
}

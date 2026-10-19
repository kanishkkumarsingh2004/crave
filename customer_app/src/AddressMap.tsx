import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  applyWebsiteMapPalette,
  websiteMapFallbackStyle,
  websiteMapStyle,
  websiteMapTheme,
} from './mapStyle'

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href)
}

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
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  onPickRef.current = onPick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initial = location || DEFAULT_LOCATION
    let activeTheme = websiteMapTheme()
    let activeStyle = websiteMapStyle(activeTheme)
    let fallbackAttempted = false
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
    } catch (error) {
      console.error('Address map failed to start:', error)
      setStatus('error')
      return
    }

    map.on('click', (event: MapMouseEvent) => {
      onPickRef.current({
        lat: Number(event.lngLat.lat.toFixed(6)),
        lng: Number(event.lngLat.lng.toFixed(6)),
      })
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map
    let loadTimeout: number | undefined
    let failureTimeout: number | undefined
    const resize = () => map.resize()
    const clearTimers = () => {
      if (loadTimeout) window.clearTimeout(loadTimeout)
      if (failureTimeout) window.clearTimeout(failureTimeout)
    }
    const scheduleFallback = () => {
      clearTimers()
      loadTimeout = window.setTimeout(() => {
        if (map.isStyleLoaded()) return
        if (fallbackAttempted) {
          setStatus('error')
          return
        }
        fallbackAttempted = true
        map.setStyle(websiteMapFallbackStyle(activeTheme), { diff: false })
        failureTimeout = window.setTimeout(() => {
          if (!map.isStyleLoaded()) setStatus('error')
        }, 10_000)
      }, 10_000)
    }
    const handleStyleLoad = () => {
      clearTimers()
      applyWebsiteMapPalette(map, activeTheme)
      setStatus('ready')
      requestAnimationFrame(resize)
      window.setTimeout(resize, 320)
    }
    map.on('style.load', handleStyleLoad)
    map.on('error', (event) => console.warn('Address map resource error:', event.error))
    scheduleFallback()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)
    const themeObserver = new MutationObserver(() => {
      const nextTheme = websiteMapTheme()
      const nextStyle = websiteMapStyle(nextTheme)
      if (nextStyle === activeStyle) return
      activeTheme = nextTheme
      activeStyle = nextStyle
      fallbackAttempted = false
      setStatus('loading')
      map.setStyle(nextStyle, { diff: false })
      scheduleFallback()
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    document.addEventListener('visibilitychange', resize)

    return () => {
      clearTimers()
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

  return (
    <div className="address-map-shell">
      <div ref={containerRef} className="address-map-canvas" aria-label="Address map" />
      {status === 'loading' && <div className="address-map-status">Loading map…</div>}
      {status === 'error' && (
        <div className="address-map-status address-map-error">
          Map unavailable. Check your connection and reopen this page.
        </div>
      )}
      <div className="address-map-credit">
        <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">
          © CARTO
        </a>{' '}
        ·{' '}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
          © OSM
        </a>
      </div>
    </div>
  )
}

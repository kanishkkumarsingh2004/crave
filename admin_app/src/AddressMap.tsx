import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { Map as MapLibreMap, MapMouseEvent, Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { applyWebsiteMapPalette, websiteMapFallbackStyle, websiteMapStyle } from './mapStyle'

if (typeof window !== 'undefined') {
  maplibregl.setWorkerUrl(new URL('maplibre-gl-worker.mjs', document.baseURI).href)
}

export type AddressMapPoint = {
  lat: number
  lng: number
}

const DEFAULT_LOCATION: AddressMapPoint = { lat: 12.9716, lng: 77.5946 }
// The partner picker always uses the light basemap so street and place names stay
// legible on top of the map regardless of the app theme.
const MAP_THEME = 'light'

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
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState('')

  onPickRef.current = onPick

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initial = location || DEFAULT_LOCATION
    let activeStyle = websiteMapStyle(MAP_THEME)
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
        map.setStyle(websiteMapFallbackStyle(MAP_THEME), { diff: false })
        failureTimeout = window.setTimeout(() => {
          if (!map.isStyleLoaded()) setStatus('error')
        }, 10_000)
      }, 10_000)
    }
    const handleStyleLoad = () => {
      clearTimers()
      applyWebsiteMapPalette(map, MAP_THEME)
      setStatus('ready')
      requestAnimationFrame(resize)
      window.setTimeout(resize, 320)
    }
    map.on('style.load', handleStyleLoad)
    map.on('error', (event) => console.warn('Address map resource error:', event.error))
    scheduleFallback()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)
    document.addEventListener('visibilitychange', resize)

    return () => {
      clearTimers()
      resizeObserver.disconnect()
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

  function locateMe() {
    const map = mapRef.current
    if (!map) return
    if (!navigator.geolocation) {
      setLocateError('Location is not available on this device.')
      return
    }
    setLocating(true)
    setLocateError('')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false)
        const point = {
          lat: Number(coords.latitude.toFixed(6)),
          lng: Number(coords.longitude.toFixed(6)),
        }
        map.easeTo({ center: [point.lng, point.lat], zoom: 16 })
        onPickRef.current(point)
      },
      (error) => {
        setLocating(false)
        setLocateError(
          error.code === error.PERMISSION_DENIED
            ? 'Allow location access to use your current position.'
            : 'Could not get your current location. Tap the map instead.'
        )
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
    )
  }

  return (
    <div className="address-map-shell">
      <div ref={containerRef} className="address-map-canvas" aria-label="Address map" />
      <button
        type="button"
        className={`address-map-locate ${locating ? 'locating' : ''}`}
        onClick={locateMe}
        disabled={locating}
        title="Use my current location"
        aria-label="Use my current location"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="7" />
          <path d="M12 1v3M12 20v3M1 12h3M20 12h3" stroke-linecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {locateError && <div className="address-map-locate-error">{locateError}</div>}
      {status === 'loading' && <div className="address-map-status">Loading map…</div>}
      {status === 'error' && (
        <div className="address-map-status address-map-error">
          Map unavailable. Check your connection and reopen this page.
        </div>
      )}
    </div>
  )
}

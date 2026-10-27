'use client'

import type * as GeoJSON from 'geojson'
import { Loader2, Locate, MapPin, Maximize, Minus, Plus } from 'lucide-react'
import type { MarkerOptions, PopupOptions } from 'maplibre-gl'
import * as MapLibreGL from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

import { CUSTOM_MAP_PALETTES } from '@/lib/map-config'
import { cn } from '@/lib/utils'

type Theme = 'light' | 'dark'

function applyCustomPalette(map: MapLibreGL.Map, theme: Theme) {
  const palette = CUSTOM_MAP_PALETTES[theme]
  try {
    const style = map.getStyle()
    if (!style || !style.layers) return

    for (const layer of style.layers) {
      const id = layer.id.toLowerCase()
      const type = layer.type

      if (type === 'background') {
        map.setPaintProperty(layer.id, 'background-color', palette.land)
      } else if (id.includes('land') && type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', palette.land)
      }

      if (id.includes('landcover') || id.includes('landuse')) {
        if (type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', palette.landcover)
        }
      }

      if (
        id.includes('waterway') ||
        id.includes('river') ||
        id.includes('canal') ||
        id.includes('stream')
      ) {
        if (type === 'line') {
          map.setPaintProperty(layer.id, 'line-color', palette.waterways)
        }
      } else if (id.includes('water') || id.includes('ocean') || id.includes('lake')) {
        if (type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', palette.water)
        }
      }

      if (
        id.includes('park') ||
        id.includes('green') ||
        id.includes('wood') ||
        id.includes('cemetery') ||
        id.includes('pitch')
      ) {
        if (type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', palette.parks)
        }
      }

      if (id.includes('building')) {
        if (type === 'fill') {
          map.setPaintProperty(layer.id, 'fill-color', palette.buildings)
        }
      }

      if (
        id.includes('road') ||
        id.includes('highway') ||
        id.includes('street') ||
        id.includes('bridge') ||
        id.includes('tunnel') ||
        id.includes('transportation')
      ) {
        if (type === 'line') {
          map.setPaintProperty(layer.id, 'line-color', palette.roadMinorLow)
        }
      }

      if (type === 'symbol') {
        try {
          map.setPaintProperty(layer.id, 'text-color', palette.text)
          map.setPaintProperty(layer.id, 'text-halo-color', palette.roadOutline)
          map.setPaintProperty(layer.id, 'text-halo-width', 2.5)
          map.setPaintProperty(layer.id, 'text-halo-blur', 0.2)
        } catch {}
      }
    }
  } catch (err) {
    console.warn('Custom map palette application error:', err)
  }
}

if (typeof window !== 'undefined') {
  MapLibreGL.setWorkerUrl(new URL('/maplibre-gl-worker.mjs', window.location.origin).href)
}

const defaultStyles = {
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
}

function createRasterFallbackStyle(theme: Theme): MapLibreGL.StyleSpecification {
  return {
    version: 8,
    sources: {
      openstreetmap: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      {
        id: 'fallback-background',
        type: 'background',
        paint: { 'background-color': theme === 'dark' ? '#111a15' : '#f8fafc' },
      },
      {
        id: 'fallback-openstreetmap',
        type: 'raster',
        source: 'openstreetmap',
        paint:
          theme === 'dark'
            ? {
                'raster-brightness-max': 0.68,
                'raster-brightness-min': 0.08,
                'raster-contrast': 0.16,
                'raster-saturation': -0.45,
              }
            : {},
      },
    ],
  }
}

function getDocumentTheme(): Theme | null {
  if (typeof document === 'undefined') return null
  const root = document.documentElement
  if (root.classList.contains('dark')) return 'dark'
  if (root.classList.contains('light')) return 'light'
  const dataTheme = root.dataset.theme
  if (dataTheme === 'dark' || dataTheme === 'light') return dataTheme
  return null
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function useResolvedTheme(themeProp?: 'light' | 'dark'): Theme {
  const [detectedTheme, setDetectedTheme] = useState<Theme>(
    () => getDocumentTheme() ?? getSystemTheme()
  )

  useEffect(() => {
    if (themeProp) return
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme()
      if (docTheme) setDetectedTheme(docTheme)
    })
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    })
    return () => observer.disconnect()
  }, [themeProp])

  return themeProp ?? detectedTheme
}

type MapContextValue = {
  map: MapLibreGL.Map | null
  isLoaded: boolean
  resolvedTheme: Theme
}

const MapContext = createContext<MapContextValue | null>(null)

export function useMap() {
  const context = useContext(MapContext)
  if (!context) throw new Error('useMap must be used within a Map component')
  return context
}

export type MapViewport = {
  center: [number, number]
  zoom: number
  bearing: number
  pitch: number
}

export type MapRef = MapLibreGL.Map

export type MapStyleOption = string | MapLibreGL.StyleSpecification

export type MapProps = {
  children?: ReactNode
  className?: string
  theme?: Theme
  styles?: {
    light?: MapStyleOption
    dark?: MapStyleOption
  }
  viewport?: Partial<MapViewport>
  onViewportChange?: (viewport: MapViewport) => void
  onClick?: (e: { lng: number; lat: number }) => void
  loading?: boolean
} & Omit<MapLibreGL.MapOptions, 'container' | 'style'>

function getViewport(map: MapLibreGL.Map): MapViewport {
  const center = map.getCenter()
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  }
}

export const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    viewport,
    onViewportChange,
    onClick,
    loading = false,
    ...props
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapInstance, setMapInstance] = useState<MapLibreGL.Map | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  const resolvedTheme = useResolvedTheme(themeProp)
  const resolvedThemeRef = useRef(resolvedTheme)
  resolvedThemeRef.current = resolvedTheme

  const isControlled = viewport !== undefined && onViewportChange !== undefined
  const onViewportChangeRef = useRef(onViewportChange)
  onViewportChangeRef.current = onViewportChange
  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useImperativeHandle(ref, () => mapInstance as MapLibreGL.Map, [mapInstance])

  useEffect(() => {
    if (!containerRef.current) return

    const initialStyle =
      resolvedTheme === 'dark'
        ? (styles?.dark ?? defaultStyles.dark)
        : (styles?.light ?? defaultStyles.light)
    let map: MapLibreGL.Map
    try {
      map = new MapLibreGL.Map({
        container: containerRef.current,
        style: initialStyle,
        renderWorldCopies: false,
        attributionControl: false,
        ...props,
        ...viewport,
      })
    } catch (error) {
      console.error('MapLibre failed to start:', error)
      setLoadFailed(true)
      return
    }

    const styleLoadHandler = () => {
      applyCustomPalette(map, resolvedThemeRef.current)
      setLoadFailed(false)
      setIsLoaded(true)
    }
    const loadHandler = () => setIsLoaded(true)

    const handleMove = () => {
      onViewportChangeRef.current?.(getViewport(map))
    }

    const handleClick = (e: MapLibreGL.MapMouseEvent) => {
      onClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    }

    map.on('load', loadHandler)
    map.on('style.load', styleLoadHandler)
    map.on('move', handleMove)
    map.on('click', handleClick)
    setMapInstance(map)

    const resize = () => map.resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.off('load', loadHandler)
      map.off('style.load', styleLoadHandler)
      map.off('move', handleMove)
      map.off('click', handleClick)
      map.remove()
      setIsLoaded(false)
      setMapInstance(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return
    if (mapInstance.isMoving()) return
    const current = getViewport(mapInstance)
    mapInstance.jumpTo({
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    })
  }, [mapInstance, isControlled, viewport])

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded,
      resolvedTheme,
    }),
    [mapInstance, isLoaded, resolvedTheme]
  )

  return (
    <MapContext.Provider value={contextValue}>
      <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden', className)}>
        {isLoaded && children}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-xs">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        )}
        {loadFailed && (
          <div className="absolute inset-0 z-20 grid place-items-center bg-black/80 p-6 text-center">
            <div>
              <MapPin className="mx-auto mb-2 size-6 text-rose-400" />
              <p className="text-sm font-semibold text-white">Map could not be loaded</p>
            </div>
          </div>
        )}
      </div>
    </MapContext.Provider>
  )
})

// ── Controls ──────────────────────────────────────────────────
export type MapControlsProps = {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  showZoom?: boolean
  showLocate?: boolean
  className?: string
  onLocate?: (coords: { longitude: number; latitude: number }) => void
}

const positionClasses = {
  'top-left': 'top-3 left-3',
  'top-right': 'top-3 right-3',
  'bottom-left': 'bottom-3 left-3',
  'bottom-right': 'bottom-3 right-3',
}

export function MapControls({
  position = 'bottom-right',
  showZoom = true,
  showLocate = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap()
  const [waitingForLocation, setWaitingForLocation] = useState(false)

  const handleZoomIn = () => map?.zoomTo(map.getZoom() + 1, { duration: 250 })
  const handleZoomOut = () => map?.zoomTo(map.getZoom() - 1, { duration: 250 })

  const handleLocate = () => {
    if (!('geolocation' in navigator)) return
    setWaitingForLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { longitude: pos.coords.longitude, latitude: pos.coords.latitude }
        map?.flyTo({ center: [coords.longitude, coords.latitude], zoom: 15, duration: 1200 })
        onLocate?.(coords)
        setWaitingForLocation(false)
      },
      () => setWaitingForLocation(false),
      { timeout: 8000 }
    )
  }

  return (
    <div className={cn('absolute z-10 flex flex-col gap-1.5', positionClasses[position], className)}>
      {showZoom && (
        <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="flex size-8 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Zoom in"
          >
            <Plus className="size-4" />
          </button>
          <div className="h-px bg-white/10" />
          <button
            type="button"
            onClick={handleZoomOut}
            className="flex size-8 items-center justify-center text-white/80 transition hover:bg-white/10 hover:text-white"
            aria-label="Zoom out"
          >
            <Minus className="size-4" />
          </button>
        </div>
      )}
      {showLocate && (
        <button
          type="button"
          onClick={handleLocate}
          disabled={waitingForLocation}
          className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-black/80 text-white/80 shadow-xl backdrop-blur-md transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          aria-label="Locate me"
        >
          {waitingForLocation ? (
            <Loader2 className="size-4 animate-spin text-emerald-400" />
          ) : (
            <Locate className="size-4" />
          )}
        </button>
      )}
    </div>
  )
}

// ── Markers ───────────────────────────────────────────────────
type MarkerContextValue = {
  marker: MapLibreGL.Marker
  map: MapLibreGL.Map
}

const MarkerContext = createContext<MarkerContextValue | null>(null)

function useMarkerContext() {
  const context = useContext(MarkerContext)
  if (!context) throw new Error('Marker children must be used within MapMarker')
  return context
}

export type MapMarkerProps = {
  longitude: number
  latitude: number
  children?: ReactNode
  onClick?: (e: MouseEvent) => void
  draggable?: boolean
  onDragEnd?: (coords: { lng: number; lat: number }) => void
} & Omit<MarkerOptions, 'element'>

export function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  draggable = false,
  onDragEnd,
  ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap()
  const elRef = useRef<HTMLDivElement | null>(null)
  if (!elRef.current && typeof document !== 'undefined') {
    elRef.current = document.createElement('div')
  }

  const marker = useMemo(() => {
    if (!elRef.current) return null
    const m = new MapLibreGL.Marker({
      ...markerOptions,
      element: elRef.current,
      draggable,
    }).setLngLat([longitude, latitude])

    if (onClick) elRef.current.addEventListener('click', onClick)
    if (onDragEnd) {
      m.on('dragend', () => {
        const lngLat = m.getLngLat()
        onDragEnd({ lng: lngLat.lng, lat: lngLat.lat })
      })
    }
    return m
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!map || !marker) return
    marker.addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, marker])

  useEffect(() => {
    if (!marker) return
    const cur = marker.getLngLat()
    if (cur.lng !== longitude || cur.lat !== latitude) {
      marker.setLngLat([longitude, latitude])
    }
  }, [marker, longitude, latitude])

  if (!marker || !map) return null

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  )
}

export type MarkerContentProps = {
  children?: ReactNode
  className?: string
}

export function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext()
  return createPortal(
    <div className={cn('relative cursor-pointer', className)}>{children}</div>,
    marker.getElement()
  )
}

export type MarkerTooltipProps = {
  children?: ReactNode
  className?: string
} & PopupOptions

export function MarkerTooltip({ children, className, ...options }: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext()
  const popupRef = useRef<MapLibreGL.Popup | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  if (!containerRef.current && typeof document !== 'undefined') {
    containerRef.current = document.createElement('div')
  }

  useEffect(() => {
    if (!containerRef.current) return
    const popup = new MapLibreGL.Popup({
      closeButton: false,
      closeOnClick: false,
      className: cn('crave-marker-tooltip', className),
      ...options,
    }).setDOMContent(containerRef.current)

    marker.setPopup(popup)
    popupRef.current = popup

    const el = marker.getElement()
    const show = () => popup.addTo(map)
    const hide = () => popup.remove()
    el.addEventListener('mouseenter', show)
    el.addEventListener('mouseleave', hide)

    return () => {
      el.removeEventListener('mouseenter', show)
      el.removeEventListener('mouseleave', hide)
      popup.remove()
    }
  }, [marker, map, className, options])

  if (!containerRef.current) return null
  return createPortal(children, containerRef.current)
}

// ── Polyline Route Layer ──────────────────────────────────────
export type MapRouteProps = {
  id?: string
  coordinates: [number, number][]
  color?: string
  width?: number
  opacity?: number
}

export function MapRoute({
  id: propId,
  coordinates,
  color = '#3b82f6',
  width = 4,
  opacity = 0.85,
}: MapRouteProps) {
  const { map, isLoaded } = useMap()
  const autoId = useId()
  const id = propId ?? autoId.replace(/:/g, '-')
  const sourceId = `route-source-${id}`
  const layerId = `route-layer-${id}`

  useEffect(() => {
    if (!isLoaded || !map) return

    const geojsonData: GeoJSON.Feature<GeoJSON.LineString> = {
      type: 'Feature',
      properties: {},
      geometry: { type: 'LineString', coordinates },
    }

    if (map.getSource(sourceId)) {
      ;(map.getSource(sourceId) as MapLibreGL.GeoJSONSource).setData(geojsonData)
      return
    }

    map.addSource(sourceId, { type: 'geojson', data: geojsonData })
    map.addLayer({
      id: layerId,
      type: 'line',
      source: sourceId,
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: {
        'line-color': color,
        'line-width': width,
        'line-opacity': opacity,
      },
    })

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {}
    }
  }, [isLoaded, map, coordinates, color, width, opacity, sourceId, layerId])

  return null
}

// ── GeoJSON Grid / Polygon Layer ──────────────────────────────
export type MapGeoJSONProps = {
  id?: string
  data: GeoJSON.FeatureCollection | GeoJSON.Feature
  promoteId?: string
  fillPaint?: Record<string, any> | false
  linePaint?: Record<string, any> | false
  fillHoverPaint?: Record<string, any>
  interactive?: boolean
  onClick?: (e: { feature: GeoJSON.Feature }) => void
}

export function MapGeoJSON({
  id: propId,
  data,
  promoteId,
  fillPaint,
  linePaint,
  interactive = false,
  onClick,
}: MapGeoJSONProps) {
  const { map, isLoaded } = useMap()
  const autoId = useId()
  const id = propId ?? autoId.replace(/:/g, '-')
  const sourceId = `geojson-src-${id}`
  const fillLayerId = `geojson-fill-${id}`
  const lineLayerId = `geojson-line-${id}`

  const onClickRef = useRef(onClick)
  onClickRef.current = onClick

  useEffect(() => {
    if (!isLoaded || !map) return

    if (map.getSource(sourceId)) {
      ;(map.getSource(sourceId) as MapLibreGL.GeoJSONSource).setData(data)
      return
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data,
      ...(promoteId ? { promoteId } : {}),
    })

    if (fillPaint !== false) {
      map.addLayer({
        id: fillLayerId,
        type: 'fill',
        source: sourceId,
        paint: fillPaint || { 'fill-color': '#10b981', 'fill-opacity': 0.1 },
      })
    }

    if (linePaint !== false) {
      map.addLayer({
        id: lineLayerId,
        type: 'line',
        source: sourceId,
        paint: linePaint || { 'line-color': '#10b981', 'line-width': 1.5, 'line-opacity': 0.8 },
      })
    }

    let clickHandler: ((e: MapLibreGL.MapMouseEvent & { features?: MapLibreGL.MapGeoJSONFeature[] }) => void) | null = null
    if (interactive && fillPaint !== false) {
      clickHandler = (e) => {
        if (e.features && e.features.length > 0) {
          onClickRef.current?.({ feature: e.features[0] as unknown as GeoJSON.Feature })
        }
      }
      map.on('click', fillLayerId, clickHandler)
      map.on('mouseenter', fillLayerId, () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', fillLayerId, () => {
        map.getCanvas().style.cursor = ''
      })
    }

    return () => {
      try {
        if (clickHandler) map.off('click', fillLayerId, clickHandler)
        if (map.getLayer(lineLayerId)) map.removeLayer(lineLayerId)
        if (map.getLayer(fillLayerId)) map.removeLayer(fillLayerId)
        if (map.getSource(sourceId)) map.removeSource(sourceId)
      } catch {}
    }
  }, [isLoaded, map, data, promoteId, fillPaint, linePaint, interactive, sourceId, fillLayerId, lineLayerId])

  return null
}

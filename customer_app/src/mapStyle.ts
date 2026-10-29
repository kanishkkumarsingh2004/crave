import type { Map as MapLibreMap, StyleSpecification } from 'maplibre-gl'

export type WebsiteMapTheme = 'light' | 'dark'

export const WEBSITE_MAP_STYLES = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/liberty',
} as const

const palettes = {
  light: {
    land: '#f8fafc',
    landcover: '#eef2f6',
    water: '#e2e8f0',
    waterways: '#abb7c7',
    parks: '#f1f5f9',
    buildings: '#8e9eb3',
    aeroway: '#e2e8f0',
    rail: '#37475c',
    roadMajor: '#35455c',
    roadMinorHigh: '#425267',
    roadMinorMid: '#5e7086',
    roadMinorLow: '#9faec0',
    roadPath: '#b0bccb',
    roadOutline: '#ffffff',
    text: '#0f172a',
  },
  dark: {
    land: '#111a15',
    landcover: '#17231c',
    water: '#10242a',
    waterways: '#315460',
    parks: '#183022',
    buildings: '#2a3830',
    aeroway: '#1c2922',
    rail: '#53665b',
    roadMajor: '#899b90',
    roadMinorHigh: '#6c7f74',
    roadMinorMid: '#53665b',
    roadMinorLow: '#3c5045',
    roadPath: '#34443b',
    roadOutline: '#0b1210',
    text: '#e7eee9',
  },
} as const

export function websiteMapTheme(): WebsiteMapTheme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

export function websiteMapStyle(theme = websiteMapTheme()) {
  return WEBSITE_MAP_STYLES[theme]
}

export function websiteMapFallbackStyle(theme = websiteMapTheme()): StyleSpecification {
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
        paint: { 'background-color': palettes[theme].land },
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

export function applyWebsiteMapPalette(map: MapLibreMap, theme = websiteMapTheme()) {
  const palette = palettes[theme]
  const layers = map.getStyle()?.layers || []
  for (const layer of layers) {
    const id = layer.id.toLowerCase()
    const type = layer.type
    try {
      if (type === 'background') map.setPaintProperty(layer.id, 'background-color', palette.land)
      if (id.includes('land') && type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', palette.land)
      }
      if ((id.includes('landcover') || id.includes('landuse')) && type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', palette.landcover)
      }
      if (
        (id.includes('waterway') ||
          id.includes('river') ||
          id.includes('canal') ||
          id.includes('stream')) &&
        type === 'line'
      ) {
        map.setPaintProperty(layer.id, 'line-color', palette.waterways)
      } else if (
        (id.includes('water') || id.includes('ocean') || id.includes('lake')) &&
        type === 'fill'
      ) {
        map.setPaintProperty(layer.id, 'fill-color', palette.water)
      }
      if (
        (id.includes('park') ||
          id.includes('green') ||
          id.includes('wood') ||
          id.includes('cemetery') ||
          id.includes('pitch')) &&
        type === 'fill'
      ) {
        map.setPaintProperty(layer.id, 'fill-color', palette.parks)
      }
      if (id.includes('building') && type === 'fill') {
        map.setPaintProperty(layer.id, 'fill-color', palette.buildings)
      }
      if (
        (id.includes('aeroway') ||
          id.includes('runway') ||
          id.includes('taxiway') ||
          id.includes('airport')) &&
        (type === 'fill' || type === 'line')
      ) {
        map.setPaintProperty(
          layer.id,
          type === 'fill' ? 'fill-color' : 'line-color',
          palette.aeroway
        )
      }
      if (
        (id.includes('rail') || id.includes('train') || id.includes('transit')) &&
        type === 'line'
      ) {
        map.setPaintProperty(layer.id, 'line-color', palette.rail)
      }
      if (
        type === 'line' &&
        (id.includes('road') ||
          id.includes('highway') ||
          id.includes('street') ||
          id.includes('bridge') ||
          id.includes('tunnel') ||
          id.includes('transportation'))
      ) {
        const color =
          id.includes('casing') || id.includes('outline')
            ? palette.roadOutline
            : id.includes('motorway') ||
                id.includes('trunk') ||
                id.includes('primary') ||
                id.includes('major')
              ? palette.roadMajor
              : id.includes('secondary')
                ? palette.roadMinorHigh
                : id.includes('tertiary')
                  ? palette.roadMinorMid
                  : id.includes('path') ||
                      id.includes('foot') ||
                      id.includes('pedestrian') ||
                      id.includes('cycle')
                    ? palette.roadPath
                    : palette.roadMinorLow
        map.setPaintProperty(layer.id, 'line-color', color)
      }
      if (type === 'symbol') {
        map.setPaintProperty(layer.id, 'text-color', palette.text)
        map.setPaintProperty(layer.id, 'text-halo-color', '#ffffff')
        map.setPaintProperty(layer.id, 'text-halo-width', 2.5)
        map.setPaintProperty(layer.id, 'text-halo-blur', 0.2)
      }
    } catch {
      // Some third-party style layers do not expose every paint property.
    }
  }
}

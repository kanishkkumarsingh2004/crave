import type { Map as MapLibreMap } from 'maplibre-gl'

export const WEBSITE_MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
} as const

const palette = {
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
} as const

export function websiteMapStyle() {
  return document.documentElement.dataset.theme === 'dark'
    ? WEBSITE_MAP_STYLES.dark
    : WEBSITE_MAP_STYLES.light
}

export function applyWebsiteMapPalette(map: MapLibreMap) {
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

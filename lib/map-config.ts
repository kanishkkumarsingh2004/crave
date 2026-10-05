export interface MapThemeConfig {
  name: string
  tileUrl: string
  maxZoom: number
  route: {
    glowColor: string
    glowWeight: number
    glowOpacity: number
    lineColor: string
    lineWeight: number
    dashArray: string
  }
  pickupMarker: {
    bg: string
    text: string
    border: string
    label?: string
    popupTitleColor: string
    popupSubtitleColor: string
    shadow: string
  }
  dropoffMarker: {
    bg: string
    text: string
    border: string
    label?: string
    popupTitleColor: string
    popupSubtitleColor: string
    shadow: string
  }
  driverMarker: {
    bg: string
    pulseBg: string
    pulseOpacity: number
    text: string
    border: string
    label?: string
    popupTitleColor: string
    popupSubtitleColor: string
    shadow: string
  }
  controls: {
    buttonBg: string
    buttonText: string
    buttonBorder: string
    buttonHoverBg: string
    legendBg: string
    legendText: string
    legendBorder: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
}

export const CUSTOM_MAP_PALETTE = {
  overlay: '#f8fafc',
  text: '#35455c',
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
  roadOutline: '#f8fafc',
} as const

export const DEFAULT_MAP_THEME_KEY = 'slateMinimal'

export const MAP_THEMES: Record<string, MapThemeConfig> = {
  slateMinimal: {
    name: 'Custom Swatch Palette',
    tileUrl: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    maxZoom: 19,
    route: {
      glowColor: '#35455c',
      glowWeight: 6,
      glowOpacity: 0.35,
      lineColor: '#35455c',
      lineWeight: 4.5,
      dashArray: '',
    },
    pickupMarker: {
      bg: '#354659',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#354659',
      popupSubtitleColor: '#4a5c70',
      shadow: '0 0 10px rgba(53, 70, 89, 0.4)',
    },
    dropoffMarker: {
      bg: '#1e293b',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#1e293b',
      popupSubtitleColor: '#4a5c70',
      shadow: '0 0 10px rgba(30, 41, 59, 0.4)',
    },
    driverMarker: {
      bg: '#354659',
      pulseBg: '#697b91',
      pulseOpacity: 0.5,
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#354659',
      popupSubtitleColor: '#697b91',
      shadow: '0 0 12px rgba(53, 70, 89, 0.5)',
    },
    controls: {
      buttonBg: 'bg-white/95',
      buttonText: 'text-[#354659]',
      buttonBorder: 'border-[#cbd5e1]',
      buttonHoverBg: 'hover:bg-slate-100',
      legendBg: 'bg-white/95',
      legendText: 'text-[#354659]',
      legendBorder: 'border-[#cbd5e1]',
      badgeBg: 'bg-[#354659]',
      badgeText: 'text-[#f0f4f8]',
      badgeBorder: 'border-[#2f3e50]',
    },
  },
  mapcnDark: {
    name: 'Mapcn Midnight Dark',
    tileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    route: {
      glowColor: '#3b82f6',
      glowWeight: 8,
      glowOpacity: 0.35,
      lineColor: '#3b82f6',
      lineWeight: 4.5,
      dashArray: '',
    },
    pickupMarker: {
      bg: '#10b981',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#10b981',
      popupSubtitleColor: '#f3f4f6',
      shadow: '0 0 14px rgba(16, 185, 129, 0.6)',
    },
    dropoffMarker: {
      bg: '#ef4444',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#ef4444',
      popupSubtitleColor: '#f3f4f6',
      shadow: '0 0 14px rgba(239, 68, 68, 0.6)',
    },
    driverMarker: {
      bg: '#2563eb',
      pulseBg: '#3b82f6',
      pulseOpacity: 0.6,
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#3b82f6',
      popupSubtitleColor: '#94a3b8',
      shadow: '0 0 18px rgba(37, 99, 235, 0.7)',
    },
    controls: {
      buttonBg: 'bg-[#18181b]/90',
      buttonText: 'text-white',
      buttonBorder: 'border-[#27272a]',
      buttonHoverBg: 'hover:bg-[#27272a]',
      legendBg: 'bg-[#09090b]/95',
      legendText: 'text-white',
      legendBorder: 'border-[#27272a]',
      badgeBg: 'bg-[#1e3a8a]',
      badgeText: 'text-[#93c5fd]',
      badgeBorder: 'border-[#2563eb]',
    },
  },
  craveDefault: {
    name: 'Crave Lime Theme',
    tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    route: {
      glowColor: '#8fa71c',
      glowWeight: 7,
      glowOpacity: 0.6,
      lineColor: '#18201c',
      lineWeight: 3.5,
      dashArray: '6, 8',
    },
    pickupMarker: {
      bg: '#059669',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#047857',
      popupSubtitleColor: '#1f2937',
      shadow: '0 4px 10px rgba(0,0,0,0.25)',
    },
    dropoffMarker: {
      bg: '#f59e0b',
      text: '#ffffff',
      border: '#ffffff',
      label: '',
      popupTitleColor: '#b45309',
      popupSubtitleColor: '#1f2937',
      shadow: '0 4px 10px rgba(0,0,0,0.25)',
    },
    driverMarker: {
      bg: '#d9f447',
      pulseBg: '#d9f447',
      pulseOpacity: 0.6,
      text: '#121815',
      border: '#18201c',
      label: '',
      popupTitleColor: '#121815',
      popupSubtitleColor: '#4b5563',
      shadow: '0 4px 14px rgba(0,0,0,0.3)',
    },
    controls: {
      buttonBg: 'bg-white/95',
      buttonText: 'text-[#18201c]',
      buttonBorder: 'border-[#e2e8df]',
      buttonHoverBg: 'hover:bg-gray-100',
      legendBg: 'bg-[#121815]/95',
      legendText: 'text-white',
      legendBorder: 'border-white/10',
      badgeBg: 'bg-[#1d2722]',
      badgeText: 'text-[#d9f447]',
      badgeBorder: 'border-[#303f37]',
    },
  },
}

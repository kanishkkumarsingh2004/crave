'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'

const LocationPickerMap = dynamic(() => import('@/components/LocationPickerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-170px)] min-h-[600px] w-full rounded-2xl bg-gray-100 flex items-center justify-center border border-gray-200">
      <div className="flex flex-col items-center gap-2">
        <div className="size-6 border-2 border-[#859d19] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-gray-500">Loading Live Map Telemetry...</span>
      </div>
    </div>
  ),
})

interface LiveTelemetryPin {
  id: string
  name: string
  type: 'driver' | 'restaurant' | 'order'
  status: string
  lat: number
  lng: number
  locationName: string
  detail: string
  timestamp: string
}

export default function MapLiveAnalyticsPage() {
  const [pins, setPins] = useState<LiveTelemetryPin[]>([])
  const [filterType, setFilterType] = useState<'all' | 'driver' | 'restaurant' | 'order'>('all')
  const [selectedPin, setSelectedPin] = useState<LiveTelemetryPin | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchLiveTelemetry = useCallback(async () => {
    try {
      setIsRefreshing(true)
      const res = await fetch('/api/admin/map-live-analytics')
      if (res.ok) {
        const data = await res.json()
        if (data.pins && Array.isArray(data.pins)) {
          setPins(data.pins)
          if (data.pins.length > 0 && !selectedPin) {
            setSelectedPin(data.pins[0])
          }
        }
      }
    } catch (err) {
      console.error('Error fetching live map telemetry:', err)
    } finally {
      setIsRefreshing(false)
    }
  }, [selectedPin])

  useEffect(() => {
    fetchLiveTelemetry()
  }, [fetchLiveTelemetry])

  return (
    <div className="space-y-6">
      {/* Full Screen Live Map View */}
      <div className="w-full rounded-3xl border border-[#e2e8de] bg-white p-6 shadow-xs flex flex-col space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-5 text-[#859d19]" />
            <div>
              <h3 className="font-bold text-base text-[#18201c]">Live Map Telemetry</h3>
              <p className="text-xs text-[#5a655f]">
                Real-time active delivery fleet, kitchen partners, and order drops.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Toggle Buttons */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-full border border-gray-200 text-xs">
              {(
                [
                  { type: 'all', label: 'All Pins' },
                  { type: 'driver', label: 'Riders' },
                  { type: 'restaurant', label: 'Kitchens' },
                  { type: 'order', label: 'Drops' },
                ] as const
              ).map((f) => (
                <button
                  key={f.type}
                  onClick={() => setFilterType(f.type)}
                  className={`px-3 py-1 rounded-full font-bold transition ${
                    filterType === f.type
                      ? 'bg-[#18201c] text-white shadow-xs'
                      : 'text-gray-600 hover:text-[#18201c]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              onClick={fetchLiveTelemetry}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-xs font-bold text-[#18201c] hover:bg-gray-100 active:scale-95 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 text-[#859d19] ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Location Map View — Clean Full Screen Alignment, H3 Hex Spatial Grid Overlay & Telemetry Pins */}
        <LocationPickerMap
          showMarker={false}
          enableH3Grid={true}
          h3Resolution={7}
          pins={filterType === 'all' ? pins : pins.filter((p) => p.type === filterType)}
          className="relative w-full rounded-2xl overflow-hidden border border-gray-300 shadow-inner bg-[#f0f3ec] h-[calc(100vh-160px)] min-h-[620px]"
          initialLat={selectedPin?.lat ?? 12.679898}
          initialLng={selectedPin?.lng ?? 77.469493}
          onLocationSelect={(lat, lng) => {
            console.log('Map location:', lat, lng)
          }}
        />
      </div>
    </div>
  )
}

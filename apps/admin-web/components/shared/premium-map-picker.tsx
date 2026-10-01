"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  MapPin,
  Search,
  Navigation,
  ExternalLink,
  Layers,
  Compass,
  Check,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface PremiumMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  onChange: (loc: {
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  }) => void;
  height?: string;
  interactive?: boolean;
}

const CITY_PRESETS = [
  { name: "Bangalore (Indiranagar)", lat: 12.9784, lng: 77.6408, city: "Bangalore", state: "Karnataka", postalCode: "560038" },
  { name: "Bangalore (Koramangala)", lat: 12.9352, lng: 77.6245, city: "Bangalore", state: "Karnataka", postalCode: "560034" },
  { name: "Mumbai (Bandra West)", lat: 19.0596, lng: 72.8295, city: "Mumbai", state: "Maharashtra", postalCode: "400050" },
  { name: "Delhi (Connaught Place)", lat: 28.6304, lng: 77.2177, city: "New Delhi", state: "Delhi", postalCode: "110001" },
  { name: "Hyderabad (Hitec City)", lat: 17.4483, lng: 78.3915, city: "Hyderabad", state: "Telangana", postalCode: "500081" },
  { name: "Chennai (T. Nagar)", lat: 13.0418, lng: 80.2341, city: "Chennai", state: "Tamil Nadu", postalCode: "600017" },
];

const TILE_LAYERS = {
  googleStreets: {
    name: "Google Streets",
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 21,
    attribution: "Map data &copy; Google",
  },
  googleHybrid: {
    name: "Google Satellite",
    url: "https://mt{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 21,
    attribution: "Map data &copy; Google",
  },
  googleTerrain: {
    name: "Google Terrain",
    url: "https://mt{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}",
    subdomains: "0123",
    maxZoom: 20,
    attribution: "Map data &copy; Google",
  },
  esriStreet: {
    name: "Esri HD",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    subdomains: "abcd",
    maxZoom: 19,
    attribution: "&copy; Esri",
  },
};

export function PremiumMapPicker({
  latitude,
  longitude,
  address,
  city,
  state,
  postalCode,
  onChange,
  height = "380px",
  interactive = true,
}: PremiumMapPickerProps) {
  const currentLat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : 12.9716;
  const currentLng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : 77.5946;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<keyof typeof TILE_LAYERS>("googleStreets");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [markerCoords, setMarkerCoords] = useState<{ lat: number; lng: number }>({
    lat: currentLat,
    lng: currentLng,
  });

  // Reverse geocoding helper to extract city/state/address
  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        if (data && data.address) {
          const addr = data.address;
          const road = addr.road || addr.suburb || addr.neighbourhood || addr.amenity || "";
          const foundCity =
            addr.city || addr.town || addr.municipality || addr.state_district || city || "Bangalore";
          const foundState = addr.state || state || "Karnataka";
          const foundPostal = addr.postcode || postalCode || "560001";
          const fullAddress =
            [road, addr.suburb, foundCity].filter(Boolean).join(", ") ||
            data.display_name?.split(",").slice(0, 3).join(", ") ||
            address;

          onChange({
            latitude: lat,
            longitude: lng,
            address: fullAddress,
            city: foundCity,
            state: foundState,
            postalCode: foundPostal,
          });
        }
      } catch {
        // If reverse geocoding is throttled or fails, keep current text fields
        onChange({
          latitude: lat,
          longitude: lng,
          address,
          city,
          state,
          postalCode,
        });
      }
    },
    [address, city, state, postalCode, onChange]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;
      if (mapInstanceRef.current) return; // already initialized

      // Dynamically load Leaflet on the client
      const L = (await import("leaflet")).default;
      if (!isMounted || !mapContainerRef.current) return;

      // Create Custom SVG Icon with radar pulse
      const customIcon = L.divIcon({
        className: "custom-pin-wrapper",
        html: `
          <div class="custom-pin-container" style="cursor: grab;">
            <div class="map-radar-pulse"></div>
            <div style="position: relative; z-index: 10; filter: drop-shadow(0 6px 12px rgba(37,99,235,0.45)); transform: translateY(-16px); transition: transform 0.2s ease;">
              <svg width="42" height="52" viewBox="0 0 42 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="pinGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#3b82f6" />
                    <stop offset="100%" stop-color="#1d4ed8" />
                  </linearGradient>
                </defs>
                <path d="M21 0C9.402 0 0 9.402 0 21C0 35.5 21 52 21 52C21 52 42 35.5 42 21C42 9.402 32.598 0 21 0Z" fill="url(#pinGradient)"/>
                <circle cx="21" cy="21" r="14" fill="#FFFFFF"/>
                <!-- Restaurant Fork & Spoon Icon -->
                <path d="M17 14V21M17 21C17 22.1 17.9 23 19 23V28M15 14V19C15 20.1 15.9 21 17 21M19 14V21M24 14C22.9 14 22 15.1 22 16.5C22 19 24 21 24 21V28M24 14C25.1 14 26 15.1 26 16.5C26 19 24 21 24 21" stroke="#2563eb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
          </div>
        `,
        iconSize: [42, 52],
        iconAnchor: [21, 52],
      });

      // Initialize map instance
      const map = L.map(mapContainerRef.current, {
        center: [currentLat, currentLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      // Tile Layer (Google Streets)
      const currentConfig = TILE_LAYERS.googleStreets;
      const tileLayer = L.tileLayer(currentConfig.url, {
        subdomains: currentConfig.subdomains,
        maxZoom: currentConfig.maxZoom,
      }).addTo(map);

      tileLayerRef.current = tileLayer;

      // Add Draggable Marker
      const marker = L.marker([currentLat, currentLng], {
        icon: customIcon,
        draggable: interactive,
      }).addTo(map);

      if (interactive) {
        marker.on("dragend", (e: any) => {
          const newPos = e.target.getLatLng();
          const lat = Math.round(newPos.lat * 100000) / 100000;
          const lng = Math.round(newPos.lng * 100000) / 100000;
          setMarkerCoords({ lat, lng });
          void reverseGeocode(lat, lng);
        });

        // Click map to relocate marker
        map.on("click", (e: any) => {
          const lat = Math.round(e.latlng.lat * 100000) / 100000;
          const lng = Math.round(e.latlng.lng * 100000) / 100000;
          marker.setLatLng([lat, lng]);
          map.panTo([lat, lng], { animate: true });
          setMarkerCoords({ lat, lng });
          void reverseGeocode(lat, lng);
        });
      }

      mapInstanceRef.current = map;
      markerRef.current = marker;
      setIsMapReady(true);
    }

    void initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update marker position when props change externally
  useEffect(() => {
    if (latitude != null && longitude != null && markerRef.current && mapInstanceRef.current) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        markerRef.current.setLatLng([lat, lng]);
        setMarkerCoords({ lat, lng });
      }
    }
  }, [latitude, longitude]);

  // Handle Layer Switch (Voyager, Positron, Satellite)
  function handleLayerChange(layerKey: keyof typeof TILE_LAYERS) {
    if (!mapInstanceRef.current) return;
    setActiveLayer(layerKey);

    import("leaflet").then((L) => {
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
      }
      const config = TILE_LAYERS[layerKey];
      const newLayer = L.default.tileLayer(config.url, {
        subdomains: config.subdomains,
        maxZoom: config.maxZoom,
      }).addTo(mapInstanceRef.current);
      tileLayerRef.current = newLayer;
    });
  }

  // Handle Geocode Search
  async function handleGeocodeSearch(e?: React.SyntheticEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim() || !mapInstanceRef.current || !markerRef.current) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=in&limit=1`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const newLat = parseFloat(item.lat);
        const newLng = parseFloat(item.lon);

        mapInstanceRef.current.setView([newLat, newLng], 16, { animate: true });
        markerRef.current.setLatLng([newLat, newLng]);
        setMarkerCoords({ lat: newLat, lng: newLng });

        const parts = (item.display_name as string).split(",");
        const suggestedCity = parts[parts.length - 4]?.trim() || city || "Bangalore";
        const suggestedState = parts[parts.length - 3]?.trim() || state || "Karnataka";

        onChange({
          latitude: newLat,
          longitude: newLng,
          address: parts.slice(0, 2).join(", ").trim() || searchQuery,
          city: suggestedCity,
          state: suggestedState,
          postalCode: postalCode || "560001",
        });
      }
    } catch {
      // Ignore network errors
    } finally {
      setIsSearching(false);
    }
  }

  // Handle Current Geolocation
  function handleUseCurrentLocation() {
    if (!navigator.geolocation || !mapInstanceRef.current || !markerRef.current) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;

        mapInstanceRef.current.setView([lat, lng], 16, { animate: true });
        markerRef.current.setLatLng([lat, lng]);
        setMarkerCoords({ lat, lng });
        void reverseGeocode(lat, lng);
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  }

  // Select City Preset
  function handleSelectPreset(preset: typeof CITY_PRESETS[0]) {
    if (!mapInstanceRef.current || !markerRef.current) return;

    mapInstanceRef.current.setView([preset.lat, preset.lng], 16, { animate: true });
    markerRef.current.setLatLng([preset.lat, preset.lng]);
    setMarkerCoords({ lat: preset.lat, lng: preset.lng });

    onChange({
      latitude: preset.lat,
      longitude: preset.lng,
      address: address || `${preset.name} Central`,
      city: preset.city,
      state: preset.state,
      postalCode: preset.postalCode,
    });
  }

  // Re-center on marker
  function handleRecenter() {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.panTo([markerCoords.lat, markerCoords.lng], { animate: true });
  }

  // Zoom controls
  function handleZoomIn() {
    mapInstanceRef.current?.zoomIn();
  }
  function handleZoomOut() {
    mapInstanceRef.current?.zoomOut();
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${markerCoords.lat},${markerCoords.lng}`;

  return (
    <div className="space-y-3.5">
      {/* Search Bar & Fast GPS Locate */}
      {interactive && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleGeocodeSearch();
                  }
                }}
                placeholder="Search restaurant locality or landmark (e.g. Indiranagar, Bangalore)..."
                className="w-full pl-9 pr-3 py-2.5 text-xs font-medium rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleGeocodeSearch()}
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
            >
              {isSearching ? "Locating..." : "Locate"}
            </button>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <Navigation className={`h-3.5 w-3.5 text-blue-600 ${isLocating ? "animate-spin" : ""}`} />
            <span>{isLocating ? "Detecting GPS..." : "My GPS"}</span>
          </button>
        </div>
      )}

      {/* Main Map Canvas Container with Floating Glass HUD */}
      <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-lg shadow-blue-500/5 bg-slate-100">
        {/* The Leaflet Canvas */}
        <div
          ref={mapContainerRef}
          style={{ height, width: "100%" }}
          className="z-0 transition-opacity duration-300"
        />

        {/* Floating Top Controls HUD */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
          {/* Map Layer Switcher */}
          <div className="flex items-center gap-1 p-1 bg-white/95 backdrop-blur-md rounded-xl border border-slate-200/90 shadow-md pointer-events-auto">
            {(Object.keys(TILE_LAYERS) as Array<keyof typeof TILE_LAYERS>).map((layerKey) => {
              const config = TILE_LAYERS[layerKey];
              const isSelected = activeLayer === layerKey;
              return (
                <button
                  key={layerKey}
                  type="button"
                  onClick={() => handleLayerChange(layerKey)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {config.name}
                </button>
              );
            })}
          </div>

          {/* Direct Google Maps Link Button */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-blue-700 bg-white/95 backdrop-blur-md hover:bg-blue-50 border border-blue-200 rounded-xl shadow-md transition-all hover:scale-105 active:scale-95 pointer-events-auto cursor-pointer"
          >
            <span>Open Google Maps</span>
            <ExternalLink className="h-3 w-3 text-blue-600" />
          </a>
        </div>

        {/* Floating Bottom Left: Drag & Relocate Instructions */}
        {interactive && (
          <div className="absolute bottom-3 left-3 z-10 pointer-events-none">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 backdrop-blur-md rounded-xl text-white text-[11px] font-semibold shadow-lg border border-white/10">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Click map or drag pin to set exact store location</span>
            </div>
          </div>
        )}

        {/* Floating Bottom Right: Zoom & Center Controls */}
        <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleRecenter}
            title="Center on Store Pin"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90 cursor-pointer"
          >
            <Compass className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            title="Zoom In"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90 cursor-pointer"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            title="Zoom Out"
            className="w-8 h-8 rounded-xl bg-white/95 backdrop-blur-md border border-slate-200 shadow-md flex items-center justify-center font-bold text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90 cursor-pointer"
          >
            -
          </button>
        </div>
      </div>

      {/* Metro Food Hub Presets */}
      {interactive && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles className="h-3 w-3 text-blue-600" />
            <span>Popular Food Hub Presets</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CITY_PRESETS.map((preset) => {
              const isSelected =
                Math.abs(markerCoords.lat - preset.lat) < 0.001 &&
                Math.abs(markerCoords.lng - preset.lng) < 0.001;
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 border-blue-300 font-bold shadow-xs"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Coordinate & Accuracy Status Pill */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-bold text-slate-700">Latitude:</span>
          <span className="font-mono">{markerCoords.lat.toFixed(6)}</span>
          <span className="font-bold text-slate-700 ml-2">Longitude:</span>
          <span className="font-mono">{markerCoords.lng.toFixed(6)}</span>
        </div>
        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
          ● GPS Coordinates Locked
        </span>
      </div>
    </div>
  );
}

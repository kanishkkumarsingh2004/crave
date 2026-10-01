"use client";

import React, { useState, useEffect } from "react";
import { MapPin, Search, Navigation, ExternalLink, Compass } from "lucide-react";

interface LocationMapPickerProps {
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
}

const CITY_PRESETS = [
  { name: "Bangalore (Indiranagar)", lat: 12.9784, lng: 77.6408, city: "Bangalore", state: "Karnataka", postalCode: "560038" },
  { name: "Bangalore (Koramangala)", lat: 12.9352, lng: 77.6245, city: "Bangalore", state: "Karnataka", postalCode: "560034" },
  { name: "Mumbai (Bandra West)", lat: 19.0596, lng: 72.8295, city: "Mumbai", state: "Maharashtra", postalCode: "400050" },
  { name: "Delhi (Connaught Place)", lat: 28.6304, lng: 77.2177, city: "New Delhi", state: "Delhi", postalCode: "110001" },
  { name: "Hyderabad (Hitec City)", lat: 17.4483, lng: 78.3915, city: "Hyderabad", state: "Telangana", postalCode: "500081" },
  { name: "Chennai (T. Nagar)", lat: 13.0418, lng: 80.2341, city: "Chennai", state: "Tamil Nadu", postalCode: "600017" },
];

export function LocationMapPicker({
  latitude,
  longitude,
  address,
  city,
  state,
  postalCode,
  onChange,
}: LocationMapPickerProps) {
  const currentLat = latitude ?? 12.9716;
  const currentLng = longitude ?? 77.5946;

  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Synchronize internal inputs if needed
  const [latInput, setLatInput] = useState(String(currentLat));
  const [lngInput, setLngInput] = useState(String(currentLng));

  useEffect(() => {
    if (latitude != null) setLatInput(String(latitude));
    if (longitude != null) setLngInput(String(longitude));
  }, [latitude, longitude]);

  async function handleGeocodeSearch(e?: React.SyntheticEvent) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

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
        const parts = (item.display_name as string).split(",");
        const suggestedCity = parts[parts.length - 4]?.trim() || city || "Bangalore";
        const suggestedState = parts[parts.length - 3]?.trim() || state || "Karnataka";

        onChange({
          latitude: newLat,
          longitude: newLng,
          address: parts.slice(0, 2).join(",").trim() || searchQuery,
          city: suggestedCity,
          state: suggestedState,
          postalCode: postalCode || "560001",
        });
      }
    } catch {
      // Fallback if network blocked
    } finally {
      setIsSearching(false);
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const lat = Math.round(pos.coords.latitude * 100000) / 100000;
        const lng = Math.round(pos.coords.longitude * 100000) / 100000;
        onChange({
          latitude: lat,
          longitude: lng,
          address: address || "Current Detected Location",
          city: city || "Bangalore",
          state: state || "Karnataka",
          postalCode: postalCode || "560001",
        });
      },
      () => {
        setIsLocating(false);
      },
      { timeout: 8000 }
    );
  }

  function handleSelectPreset(preset: typeof CITY_PRESETS[0]) {
    onChange({
      latitude: preset.lat,
      longitude: preset.lng,
      address: address || `${preset.name} Central`,
      city: preset.city,
      state: preset.state,
      postalCode: preset.postalCode,
    });
  }

  function handleManualCoordChange(newLatStr: string, newLngStr: string) {
    setLatInput(newLatStr);
    setLngInput(newLngStr);
    const parsedLat = parseFloat(newLatStr);
    const parsedLng = parseFloat(newLngStr);
    if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
      onChange({
        latitude: parsedLat,
        longitude: parsedLng,
        address,
        city,
        state,
        postalCode,
      });
    }
  }

  const googleMapsUrl = `https://www.google.com/maps?q=${currentLat},${currentLng}`;
  // Interactive OpenStreetMap preview frame centered on lat/lng with pin
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${currentLng - 0.015}%2C${currentLat - 0.015}%2C${currentLng + 0.015}%2C${currentLat + 0.015}&layer=mapnik&marker=${currentLat}%2C${currentLng}`;

  return (
    <div className="space-y-4">
      {/* Top search & GPS controls */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
              placeholder="Search restaurant area or landmark (e.g. Indiranagar, Bangalore)..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleGeocodeSearch()}
            disabled={isSearching || !searchQuery.trim()}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors shrink-0"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        <button
          type="button"
          onClick={handleUseCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
        >
          <Navigation className={`h-3.5 w-3.5 text-blue-600 ${isLocating ? "animate-spin" : ""}`} />
          <span>{isLocating ? "Locating..." : "Use GPS"}</span>
        </button>
      </div>

      {/* Preset Hubs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Compass className="h-3 w-3" /> Hubs:
        </span>
        {CITY_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => handleSelectPreset(p)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-300 text-slate-600 hover:text-blue-700 text-[11px] font-medium whitespace-nowrap transition-colors shadow-2xs"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Actual Live Map View */}
      <div className="relative rounded-2xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 h-64 sm:h-72">
        <iframe
          key={`${currentLat}-${currentLng}`}
          src={osmEmbedUrl}
          title="Vendor Restaurant Map"
          className="w-full h-full border-0"
          loading="lazy"
        />

        {/* Floating Google Maps Overlay & Action Button */}
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/95 backdrop-blur-md text-blue-700 hover:text-blue-800 text-xs font-bold rounded-xl shadow-md border border-blue-200 transition-all hover:scale-105 active:scale-95"
            title="Open exact coordinates in Google Maps"
          >
            <MapPin className="h-3.5 w-3.5 text-red-500 fill-red-500" />
            <span>Verify in Google Maps</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </a>
        </div>

        {/* Live coordinate badge */}
        <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-700 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Lat: <strong>{currentLat}</strong>, Lng: <strong>{currentLng}</strong></span>
        </div>
      </div>

      {/* Lat & Lng Coordinate Fine-Tuning */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Latitude Coordinate
          </label>
          <input
            type="number"
            step="any"
            value={latInput}
            onChange={(e) => handleManualCoordChange(e.target.value, lngInput)}
            placeholder="e.g. 12.9716"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
            Longitude Coordinate
          </label>
          <input
            type="number"
            step="any"
            value={lngInput}
            onChange={(e) => handleManualCoordChange(latInput, e.target.value)}
            placeholder="e.g. 77.5946"
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

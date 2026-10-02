"use client";

import React, { useEffect, useRef, useState, createContext, useContext } from "react";
import {
  MapPin,
  Search,
  Navigation,
  Compass,
  Plus,
  Minus,
} from "lucide-react";

export interface MapcnLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  postalCode: string;
}

interface MapContextType {
  map: any | null;
  isLoaded: boolean;
}

const MapContext = createContext<MapContextType>({ map: null, isLoaded: false });

export function useMap() {
  return useContext(MapContext);
}

export interface MapcnProps {
  latitude: number | null;
  longitude: number | null;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  zoom?: number;
  height?: string;
  interactive?: boolean;
  onChange?: (location: MapcnLocation) => void;
  className?: string;
}

export const MAPCN_TILE_LAYERS = {
  mapcnStreets: {
    name: "Mapcn Streets",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    tileSize: 256,
    attribution: "&copy; Mapcn / OpenStreetMap contributors",
  },
  mapcnLight: {
    name: "Mapcn Light",
    tiles: ["https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"],
    tileSize: 256,
    attribution: "&copy; Mapcn / CARTO",
  },
  mapcnDark: {
    name: "Mapcn Dark",
    tiles: ["https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
    tileSize: 256,
    attribution: "&copy; Mapcn / CARTO",
  },
  mapcnSatellite: {
    name: "Mapcn Satellite",
    tiles: [
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    ],
    tileSize: 256,
    attribution: "&copy; Mapcn / Esri World Imagery",
  },
};

export function Mapcn({
  latitude,
  longitude,
  address = "",
  city = "Bangalore",
  state = "Karnataka",
  postalCode = "560001",
  zoom = 15,
  height = "380px",
  interactive = true,
  onChange,
  className = "",
}: MapcnProps) {
  const initialLat = latitude != null && !isNaN(Number(latitude)) ? Number(latitude) : 12.9716;
  const initialLng = longitude != null && !isNaN(Number(longitude)) ? Number(longitude) : 77.5946;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [activeLayer, setActiveLayer] = useState<keyof typeof MAPCN_TILE_LAYERS>("mapcnStreets");
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat,
    lng: initialLng,
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize MapLibre GL instance dynamically on client
  useEffect(() => {
    let isCancelled = false;
    if (typeof window === "undefined" || !containerRef.current || mapRef.current) return;

    // Inject MapLibre GL CSS dynamically if not present
    if (!document.getElementById("maplibre-gl-css")) {
      const link = document.createElement("link");
      link.id = "maplibre-gl-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    if (!document.getElementById("maplibre-gl-hide-attrib")) {
      const style = document.createElement("style");
      style.id = "maplibre-gl-hide-attrib";
      style.innerHTML = `.maplibregl-ctrl-attrib, .maplibregl-compact { display: none !important; visibility: hidden !important; opacity: 0 !important; }`;
      document.head.appendChild(style);
    }

    async function initMaplibre() {
      try {
        // Load maplibre-gl JS script to avoid Next.js Webpack worker evaluation issues
        if (!(window as any).maplibregl) {
          if (!document.getElementById("maplibre-gl-script")) {
            const script = document.createElement("script");
            script.id = "maplibre-gl-script";
            script.src = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
            document.head.appendChild(script);
            await new Promise((resolve) => {
              script.onload = resolve;
            });
          } else {
            // Wait for existing script to finish loading
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        const maplibregl = (window as any).maplibregl || (await import("maplibre-gl"));
        if (isCancelled || !containerRef.current || mapRef.current) return;

        // Universal worker blob fix for Next.js / Webpack
        try {
          if (maplibregl) {
            const workerBlob = new Blob(
              [`importScripts("https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl-worker.js");`],
              { type: "application/javascript" }
            );
            maplibregl.workerUrl = URL.createObjectURL(workerBlob);
          }
        } catch (err) {
          console.warn("MapLibre workerUrl blob note:", err);
        }

        const map = new maplibregl.Map({
          container: containerRef.current,
          attributionControl: false,
          style: {
            version: 8,
            sources: {
              rasterTileSource: {
                type: "raster",
                tiles: MAPCN_TILE_LAYERS[activeLayer].tiles,
                tileSize: MAPCN_TILE_LAYERS[activeLayer].tileSize,
                attribution: "",
              },
            },
            layers: [
              {
                id: "rasterTileLayer",
                type: "raster",
                source: "rasterTileSource",
                minzoom: 0,
                maxzoom: 22,
              },
            ],
          },
          center: [initialLng, initialLat],
          zoom: zoom,
          interactive: interactive,
        });

        map.on("load", () => {
          if (!isCancelled) setIsLoaded(true);
        });

        // Create custom pin marker element
        const el = document.createElement("div");
        el.className = "mapcn-pin-container cursor-grab active:cursor-grabbing";
        el.innerHTML = `
          <div style="position:relative; display:flex; flex-direction:column; align-items:center;">
            <div style="width:36px; height:36px; border-radius:50%; background:#2563eb; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(37,99,235,0.4); border:3px solid #ffffff;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <div style="width:8px; height:8px; background:#1e40af; border-radius:50%; margin-top:-2px; opacity:0.8;"></div>
          </div>
        `;

        const marker = new maplibregl.Marker({
          element: el,
          draggable: interactive,
        })
          .setLngLat([initialLng, initialLat])
          .addTo(map);

        if (interactive) {
          marker.on("dragend", () => {
            const lngLat = marker.getLngLat();
            handlePositionChange(lngLat.lat, lngLat.lng);
          });

          map.on("click", (e: any) => {
            marker.setLngLat([e.lngLat.lng, e.lngLat.lat]);
            handlePositionChange(e.lngLat.lat, e.lngLat.lng);
          });
        }

        mapRef.current = map;
        markerRef.current = marker;
      } catch (err) {
        console.error("MapLibre GL initialization info:", err);
      }
    }

    void initMaplibre();

    return () => {
      isCancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map tiles when tile layer changes
  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;
    try {
      const source = mapRef.current.getSource("rasterTileSource");
      if (source && MAPCN_TILE_LAYERS[activeLayer]) {
        mapRef.current.setStyle({
          version: 8,
          sources: {
            rasterTileSource: {
              type: "raster",
              tiles: MAPCN_TILE_LAYERS[activeLayer].tiles,
              tileSize: MAPCN_TILE_LAYERS[activeLayer].tileSize,
              attribution: "",
            },
          },
          layers: [
            {
              id: "rasterTileLayer",
              type: "raster",
              source: "rasterTileSource",
              minzoom: 0,
              maxzoom: 22,
            },
          ],
        });
      }
    } catch (e) {
      console.log("Tile layer change info:", e);
    }
  }, [activeLayer, isLoaded]);

  // Handle updates when location changes
  const handlePositionChange = async (lat: number, lng: number) => {
    setCoords({ lat, lng });
    let resolvedAddress = address || "Store Location Pin";
    let resolvedCity = city || "Bangalore";
    let resolvedState = state || "Karnataka";
    let resolvedPostalCode = postalCode || "560001";

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      );
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          resolvedAddress = data.display_name.split(",").slice(0, 3).join(", ");
          resolvedCity =
            data.address?.city ||
            data.address?.town ||
            data.address?.suburb ||
            data.address?.county ||
            resolvedCity;
          resolvedState = data.address?.state || resolvedState;
          resolvedPostalCode = data.address?.postcode || resolvedPostalCode;
        }
      }
    } catch (e) {
      console.log("Reverse geocode info:", e);
    }

    if (onChange) {
      onChange({
        latitude: lat,
        longitude: lng,
        address: resolvedAddress,
        city: resolvedCity,
        state: resolvedState,
        postalCode: resolvedPostalCode,
      });
    }
  };

  // Search locality function
  const handleSearchLocality = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery + ", India",
        )}`,
      );
      if (res.ok) {
        const results = await res.json();
        if (results && results.length > 0) {
          const first = results[0];
          const lat = parseFloat(first.lat);
          const lng = parseFloat(first.lon);

          if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 });
          }
          if (markerRef.current) {
            markerRef.current.setLngLat([lng, lat]);
          }
          handlePositionChange(lat, lng);
        }
      }
    } catch (err) {
      console.log("Search location info:", err);
    } finally {
      setIsSearching(false);
    }
  };

  // Get current device GPS
  const handleMyGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo({ center: [lng, lat], zoom: 16, duration: 1200 });
        }
        if (markerRef.current) {
          markerRef.current.setLngLat([lng, lat]);
        }
        handlePositionChange(lat, lng);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <MapContext.Provider value={{ map: mapRef.current, isLoaded }}>
      <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50 ${className}`}>
        {/* Top Controls & Search Bar */}
        <div className="p-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center gap-2 z-10 relative">
          <form onSubmit={handleSearchLocality} className="flex-1 flex items-center gap-2 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search restaurant locality or landmark (e.g. Indiranagar, Bangalore)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm disabled:opacity-50 shrink-0 cursor-pointer"
            >
              {isSearching ? "Searching..." : "Locate"}
            </button>
          </form>

          <button
            type="button"
            onClick={handleMyGps}
            disabled={isLocating}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer"
          >
            <Navigation className="h-3.5 w-3.5 text-blue-600" />
            <span>{isLocating ? "Getting GPS..." : "My GPS"}</span>
          </button>
        </div>

        {/* Map Canvas Container */}
        <div className="relative w-full" style={{ height }}>
          <div ref={containerRef} className="w-full h-full" />





          {/* Map Controls (Zoom +, -, Center) */}
          <div className="absolute bottom-4 right-3 z-10 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Minus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                mapRef.current?.flyTo({ center: [coords.lng, coords.lat], zoom: 16 })
              }
              className="w-8 h-8 bg-white/95 backdrop-blur-md rounded-xl shadow-md border border-slate-200/80 flex items-center justify-center text-blue-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <Compass className="h-4 w-4" />
            </button>
          </div>

          {/* Bottom Drag Instruction Badge */}
          <div className="absolute bottom-4 left-4 z-10 bg-slate-900/85 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-lg border border-slate-700/50 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            <span>Click map or drag pin to set exact store location</span>
          </div>
        </div>

        {/* Popular Food Hub Presets */}
        <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mr-1">
            Popular Food Hub Presets
          </span>
          {[
            { name: "Bangalore (Indiranagar)", lat: 12.9784, lng: 77.6408, city: "Bangalore", state: "Karnataka" },
            { name: "Bangalore (Koramangala)", lat: 12.9352, lng: 77.6245, city: "Bangalore", state: "Karnataka" },
            { name: "Mumbai (Bandra West)", lat: 19.0596, lng: 72.8295, city: "Mumbai", state: "Maharashtra" },
            { name: "Delhi (Connaught Place)", lat: 28.6304, lng: 77.2177, city: "New Delhi", state: "Delhi" },
            { name: "Hyderabad (Hitec City)", lat: 17.4483, lng: 78.3915, city: "Hyderabad", state: "Telangana" },
            { name: "Chennai (T. Nagar)", lat: 13.0418, lng: 80.2341, city: "Chennai", state: "Tamil Nadu" },
          ].map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                if (mapRef.current) {
                  mapRef.current.flyTo({ center: [preset.lng, preset.lat], zoom: 15, duration: 1200 });
                }
                if (markerRef.current) {
                  markerRef.current.setLngLat([preset.lng, preset.lat]);
                }
                handlePositionChange(preset.lat, preset.lng);
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition-colors cursor-pointer"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </MapContext.Provider>
  );
}

import React, { useEffect, useRef, useState } from "react";
import { View, StyleSheet } from "react-native";

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

export interface MapLibreGLMapProps {
  startPoint?: GeoLocationPoint;
  endPoint?: GeoLocationPoint;
  driverLocation?: GeoLocationPoint;
  routePoints?: GeoLocationPoint[];
  mapStyle?: string;
  zoom?: number;
}

let maplibregl: any = null;
if (typeof window !== "undefined") {
  try {
    const moduleName = "maplibre-gl";
    maplibregl = (window as any).maplibregl || require(moduleName);
  } catch (err) {
    console.warn("MapLibre GL JS lazy load note:", err);
  }
}

export const MapLibreGLMap: React.FC<MapLibreGLMapProps> = ({
  startPoint = { latitude: 12.9352, longitude: 77.6245, label: "Store" },
  endPoint = { latitude: 12.9392, longitude: 77.6248, label: "Customer" },
  driverLocation = { latitude: 12.9368, longitude: 77.621, label: "Driver GPS" },
  routePoints = [],
  mapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  zoom = 14.5,
}) => {
  const containerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const linkId = "maplibre-gl-css-cdn";
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
      document.head.appendChild(link);
    }

    const styleId = "maplibre-pulse-anim";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.innerHTML = `
        .maplibregl-control-container { display: none !important; }
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-attrib { display: none !important; visibility: hidden !important; opacity: 0 !important; }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .maplibre-pulse-ring { animation: pulse-ring 2s infinite ease-in-out; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || !maplibregl) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [driverLocation.longitude, driverLocation.latitude],
      zoom,
      pitch: 30,
      bearing: 0,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      setIsMapLoaded(true);

      const storeEl = document.createElement("div");
      storeEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center;"><div style="background:#16a34a; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div><span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">${startPoint.label || "Store"}</span></div>`;
      startMarkerRef.current = new maplibregl.Marker({ element: storeEl })
        .setLngLat([startPoint.longitude, startPoint.latitude])
        .addTo(map);

      const endEl = document.createElement("div");
      endEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center;"><div style="background:#dc2626; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div><span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">${endPoint.label || "Customer"}</span></div>`;
      endMarkerRef.current = new maplibregl.Marker({ element: endEl })
        .setLngLat([endPoint.longitude, endPoint.latitude])
        .addTo(map);

      const bikeEl = document.createElement("div");
      bikeEl.innerHTML = `<div style="display:flex; flex-direction:column; align-items:center; position:relative;"><div class="maplibre-pulse-ring" style="position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(37,99,235,0.25); top:-4px;"></div><div style="background:#2563eb; padding:7px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(37,99,235,0.4); border:2px solid #ffffff; z-index:2;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-5l-2 5h7l2-5z"/><path d="M12 17.5V11l-3-4"/></svg></div><span style="font-size:8px; font-weight:900; color:#1e40af; background:#ffffff; padding:1px 6px; border-radius:6px; margin-top:3px; border:1px solid #93c5fd; z-index:3; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">DRIVER (GPS)</span></div>`;
      driverMarkerRef.current = new maplibregl.Marker({ element: bikeEl })
        .setLngLat([driverLocation.longitude, driverLocation.latitude])
        .addTo(map);

      const lineCoords =
        routePoints.length > 0
          ? routePoints.map((p) => [p.longitude, p.latitude])
          : [
              [startPoint.longitude, startPoint.latitude],
              [driverLocation.longitude, driverLocation.latitude],
              [endPoint.longitude, endPoint.latitude],
            ];

      map.addSource("a-star-route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: lineCoords,
          },
        },
      });

      map.addLayer({
        id: "a-star-route-glow",
        type: "line",
        source: "a-star-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#93c5fd", "line-width": 9, "line-opacity": 0.4 },
      });

      map.addLayer({
        id: "a-star-route-line",
        type: "line",
        source: "a-star-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#2563eb", "line-width": 5 },
      });

      const minLng = Math.min(startPoint.longitude, endPoint.longitude, driverLocation.longitude) - 0.005;
      const maxLng = Math.max(startPoint.longitude, endPoint.longitude, driverLocation.longitude) + 0.005;
      const minLat = Math.min(startPoint.latitude, endPoint.latitude, driverLocation.latitude) - 0.005;
      const maxLat = Math.max(startPoint.latitude, endPoint.latitude, driverLocation.latitude) + 0.005;

      map.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 45, maxZoom: 16 }
      );
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      {React.createElement("div", {
        ref: containerRef,
        style: { width: "100%", height: "100%" },
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#f8fafc",
  },
});

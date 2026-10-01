import React, { useEffect, useRef, useState } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

export interface GeoLocationPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

interface MapLibreGLMapProps {
  startPoint?: GeoLocationPoint;
  endPoint?: GeoLocationPoint;
  driverLocation?: GeoLocationPoint;
  routePoints?: GeoLocationPoint[];
  mapStyle?: string;
  zoom?: number;
}

let maplibregl: typeof import("maplibre-gl") | null = null;
if (Platform.OS === "web" && typeof window !== "undefined") {
  try {
    maplibregl = require("maplibre-gl");
  } catch (err) {
    console.warn("MapLibre GL JS lazy load note:", err);
  }
}

export const MapLibreGLMap: React.FC<MapLibreGLMapProps> = ({
  startPoint = { latitude: 12.9352, longitude: 77.6245, label: "Store" },
  endPoint = { latitude: 12.9392, longitude: 77.6248, label: "Home" },
  driverLocation = { latitude: 12.9368, longitude: 77.621, label: "Live GPS" },
  routePoints = [],
  mapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  zoom = 14.5,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Inject MapLibre stylesheet into document head on web
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;

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
        @keyframes maplibrePulseRing {
          0% { transform: scale(0.9); opacity: 0.8; }
          50% { transform: scale(1.5); opacity: 0.2; }
          100% { transform: scale(0.9); opacity: 0.8; }
        }
        .maplibre-pulse-ring {
          animation: maplibrePulseRing 1.8s infinite ease-in-out;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  // Initialize MapLibre GL JS map instance on Web platform (Top-down bird's eye view pitch 0, minimal light theme)
  useEffect(() => {
    if (Platform.OS !== "web" || !containerRef.current || !maplibregl) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [driverLocation.longitude, driverLocation.latitude],
      zoom: zoom,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    map.on("load", () => {
      setIsMapLoaded(true);

      const lineCoords =
        routePoints.length > 0
          ? routePoints.map((p) => [p.longitude, p.latitude])
          : [
              [startPoint.longitude, startPoint.latitude],
              [driverLocation.longitude, driverLocation.latitude],
              [endPoint.longitude, endPoint.latitude],
            ];

      const lats = lineCoords.map((c) => c[1]);
      const lngs = lineCoords.map((c) => c[0]);
      if (lats.length > 0 && lngs.length > 0) {
        const bounds: [[number, number], [number, number]] = [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ];
        map.fitBounds(bounds, { padding: 45, maxZoom: 16, duration: 600 });
      }

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
        paint: {
          "line-color": "#93c5fd",
          "line-width": 9,
          "line-opacity": 0.4,
        },
      });

      map.addLayer({
        id: "a-star-route-line",
        type: "line",
        source: "a-star-route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": "#2563eb",
          "line-width": 5,
        },
      });

      // 1. Store Marker (Green Light Theme)
      const storeEl = document.createElement("div");
      storeEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="background:#16a34a; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          </div>
          <span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">
            ${startPoint.label || "Store"}
          </span>
        </div>
      `;
      startMarkerRef.current = new maplibregl.Marker({ element: storeEl })
        .setLngLat([startPoint.longitude, startPoint.latitude])
        .addTo(map);

      // 2. Customer Home Marker (Red Light Theme)
      const endEl = document.createElement("div");
      endEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center;">
          <div style="background:#dc2626; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">
            ${endPoint.label || "Home"}
          </span>
        </div>
      `;
      endMarkerRef.current = new maplibregl.Marker({ element: endEl })
        .setLngLat([endPoint.longitude, endPoint.latitude])
        .addTo(map);

      // 3. Driver GPS Marker (Royal Blue Light Theme)
      const bikeEl = document.createElement("div");
      bikeEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; position:relative;">
          <div class="maplibre-pulse-ring" style="position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(37,99,235,0.25); top:-4px;"></div>
          <div style="background:#2563eb; padding:7px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(37,99,235,0.4); border:2px solid #ffffff; z-index:2;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-5l-2 5h7l2-5z"/><path d="M12 17.5V11l-3-4"/></svg>
          </div>
          <span style="font-size:8px; font-weight:900; color:#1e40af; background:#ffffff; padding:1px 6px; border-radius:6px; margin-top:3px; border:1px solid #93c5fd; z-index:3; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">
            DRIVER (GPS)
          </span>
        </div>
      `;
      driverMarkerRef.current = new maplibregl.Marker({ element: bikeEl })
        .setLngLat([driverLocation.longitude, driverLocation.latitude])
        .addTo(map);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update GeoJSON polyline when routePoints change (Web)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoaded) return;
    const source = mapInstanceRef.current.getSource("a-star-route");
    if (source) {
      const lineCoords =
        routePoints.length > 0
          ? routePoints.map((p) => [p.longitude, p.latitude])
          : [
              [startPoint.longitude, startPoint.latitude],
              [driverLocation.longitude, driverLocation.latitude],
              [endPoint.longitude, endPoint.latitude],
            ];
      source.setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: lineCoords,
        },
      });

      const lats = lineCoords.map((c) => c[1]);
      const lngs = lineCoords.map((c) => c[0]);
      if (lats.length > 0 && lngs.length > 0) {
        mapInstanceRef.current.fitBounds(
          [
            [Math.min(...lngs), Math.min(...lats)],
            [Math.max(...lngs), Math.max(...lats)],
          ],
          { padding: 45, maxZoom: 16, duration: 600 },
        );
      }
    }
  }, [routePoints, isMapLoaded, startPoint, endPoint, driverLocation]);

  // Dynamic updates for driver GPS marker position (Web)
  useEffect(() => {
    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLngLat([driverLocation.longitude, driverLocation.latitude]);
    }
  }, [driverLocation]);

  if (Platform.OS === "web") {
    return (
      <View style={styles.container}>
        <div ref={containerRef} style={{ width: "100%", height: "100%", borderRadius: 16 }} />
      </View>
    );
  }

  // Mobile Native (Android & iOS) Minimal Light Theme Top-Down Bird's Eye View HTML
  const lineCoords =
    routePoints.length > 0
      ? routePoints.map((p) => [p.longitude, p.latitude])
      : [
          [startPoint.longitude, startPoint.latitude],
          [driverLocation.longitude, driverLocation.latitude],
          [endPoint.longitude, endPoint.latitude],
        ];

  const lats = lineCoords.map((c) => c[1]);
  const lngs = lineCoords.map((c) => c[0]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
      <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
      <style>
        body, html { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #f8fafc; }
        #map { width: 100%; height: 100%; }
        .maplibre-pulse-ring { animation: pulse 1.8s infinite ease-in-out; }
        @keyframes pulse { 0%{transform:scale(0.9);opacity:0.8;} 50%{transform:scale(1.5);opacity:0.2;} 100%{transform:scale(0.9);opacity:0.8;} }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const map = new maplibregl.Map({
          container: 'map',
          style: '${mapStyle}',
          center: [${driverLocation.longitude}, ${driverLocation.latitude}],
          zoom: ${zoom},
          pitch: 0,
          bearing: 0,
          attributionControl: false
        });

        map.on('load', () => {
          const bounds = [[${minLng}, ${minLat}], [${maxLng}, ${maxLat}]];
          map.fitBounds(bounds, { padding: 45, maxZoom: 16 });

          map.addSource('a-star-route', {
            type: 'geojson',
            data: {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: ${JSON.stringify(lineCoords)}
              }
            }
          });

          map.addLayer({
            id: 'a-star-route-glow',
            type: 'line',
            source: 'a-star-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#93c5fd', 'line-width': 9, 'line-opacity': 0.4 }
          });

          map.addLayer({
            id: 'a-star-route-line',
            type: 'line',
            source: 'a-star-route',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#2563eb', 'line-width': 5 }
          });

          const storeEl = document.createElement('div');
          storeEl.innerHTML = \`<div style="display:flex; flex-direction:column; align-items:center;"><div style="background:#16a34a; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg></div><span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">${startPoint.label || "Store"}</span></div>\`;
          new maplibregl.Marker({ element: storeEl }).setLngLat([${startPoint.longitude}, ${startPoint.latitude}]).addTo(map);

          const endEl = document.createElement('div');
          endEl.innerHTML = \`<div style="display:flex; flex-direction:column; align-items:center;"><div style="background:#dc2626; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div><span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">${endPoint.label || "Home"}</span></div>\`;
          new maplibregl.Marker({ element: endEl }).setLngLat([${endPoint.longitude}, ${endPoint.latitude}]).addTo(map);

          const bikeEl = document.createElement('div');
          bikeEl.innerHTML = \`<div style="display:flex; flex-direction:column; align-items:center; position:relative;"><div class="maplibre-pulse-ring" style="position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(37,99,235,0.25); top:-4px;"></div><div style="background:#2563eb; padding:7px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 10px rgba(37,99,235,0.4); border:2px solid #ffffff; z-index:2;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h-5l-2 5h7l2-5z"/><path d="M12 17.5V11l-3-4"/></svg></div><span style="font-size:8px; font-weight:900; color:#1e40af; background:#ffffff; padding:1px 6px; border-radius:6px; margin-top:3px; border:1px solid #93c5fd; z-index:3; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">DRIVER (GPS)</span></div>\`;
          new maplibregl.Marker({ element: bikeEl }).setLngLat([${driverLocation.longitude}, ${driverLocation.latitude}]).addTo(map);
        });
      </script>
    </body>
    </html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: mapHtml }}
        style={styles.webView}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
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
  webView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

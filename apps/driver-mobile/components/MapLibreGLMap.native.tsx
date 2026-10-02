import React from "react";
import { View, StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

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

export const MapLibreGLMap: React.FC<MapLibreGLMapProps> = ({
  startPoint = { latitude: 12.9352, longitude: 77.6245, label: "Store" },
  endPoint = { latitude: 12.9392, longitude: 77.6248, label: "Customer" },
  driverLocation = { latitude: 12.9368, longitude: 77.621, label: "Driver GPS" },
  routePoints = [],
  mapStyle = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  zoom = 14.5,
}) => {
  const lineCoords =
    routePoints.length > 0
      ? routePoints.map((p) => [p.longitude, p.latitude])
      : [
          [startPoint.longitude, startPoint.latitude],
          [driverLocation.longitude, driverLocation.latitude],
          [endPoint.longitude, endPoint.latitude],
        ];

  const minLng = Math.min(startPoint.longitude, endPoint.longitude, driverLocation.longitude) - 0.005;
  const maxLng = Math.max(startPoint.longitude, endPoint.longitude, driverLocation.longitude) + 0.005;
  const minLat = Math.min(startPoint.latitude, endPoint.latitude, driverLocation.latitude) - 0.005;
  const maxLat = Math.max(startPoint.latitude, endPoint.latitude, driverLocation.latitude) + 0.005;

  const mapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no" />
      <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
      <link href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" rel="stylesheet" />
      <style>
        body { margin: 0; padding: 0; width: 100%; height: 100%; }
        #map { position: absolute; top: 0; bottom: 0; width: 100%; }
        .maplibregl-control-container { display: none !important; }
        .maplibregl-ctrl-bottom-left, .maplibregl-ctrl-bottom-right, .maplibregl-ctrl-attrib { display: none !important; visibility: hidden !important; opacity: 0 !important; }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.25); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
        .maplibre-pulse-ring { animation: pulse-ring 2s infinite ease-in-out; }
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
          pitch: 30,
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
          endEl.innerHTML = \`<div style="display:flex; flex-direction:column; align-items:center;"><div style="background:#dc2626; padding:6px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,0.15); border:2px solid #ffffff;"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg></div><span style="font-size:9px; font-weight:800; color:#0f172a; background:#ffffff; padding:2px 7px; border-radius:6px; border:1px solid #cbd5e1; margin-top:3px; white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,0.1);">${endPoint.label || "Customer"}</span></div>\`;
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
      {React.createElement(WebView as any, {
        originWhitelist: ["*"],
        source: { html: mapHtml },
        style: styles.webView,
        scrollEnabled: false,
        javaScriptEnabled: true,
        domStorageEnabled: true,
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
  webView: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
});

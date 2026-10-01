import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LocationPoint {
  latitude: number;
  longitude: number;
  label?: string;
}

interface LiveOrderMapProps {
  merchantLocation?: LocationPoint;
  customerLocation?: LocationPoint;
  driverName?: string;
  driverPhone?: string;
  vehicleDetails?: string;
  etaMinutes?: number;
  onRefresh?: () => void;
}

// Simulated GPS route points between Merchant (Koramangala) & Customer
const ROUTE_POINTS: LocationPoint[] = [
  { latitude: 12.9352, longitude: 77.6245, label: "FreshMart Store" },
  { latitude: 12.9365, longitude: 77.622, label: "8th Main Intersection" },
  { latitude: 12.938, longitude: 77.62, label: "Koramangala 4th Block" },
  { latitude: 12.9402, longitude: 77.6185, label: "Intermediate Signal" },
  { latitude: 12.9425, longitude: 77.6165, label: "Customer Residence" },
];

export const LiveOrderMap: React.FC<LiveOrderMapProps> = ({
  merchantLocation = ROUTE_POINTS[0],
  customerLocation = ROUTE_POINTS[ROUTE_POINTS.length - 1],
  driverName = "Rahul Sharma",
  driverPhone = "+919876543210",
  vehicleDetails = "Hero Electric Bike (MH-01-AB-1234)",
  etaMinutes = 8,
}) => {
  const [routeIndex, setRouteIndex] = useState(1);
  const [isLiveTracking, setIsLiveTracking] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulsing live beacon effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  // Live GPS simulation pulse
  useEffect(() => {
    if (!isLiveTracking) return;
    const interval = setInterval(() => {
      setRouteIndex((prev) => (prev + 1) % ROUTE_POINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLiveTracking]);

  const currentBikePos = ROUTE_POINTS[routeIndex];
  const progressPercent = Math.round(((routeIndex + 1) / ROUTE_POINTS.length) * 100);

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhone}`);
  };

  return (
    <View style={styles.mapContainer}>
      {/* Visual Map Canvas Representation */}
      <View style={styles.mapCanvas}>
        {/* Map Grid / Topography background simulation */}
        <View style={styles.gridOverlay}>
          <View style={styles.gridLineHorizontal} />
          <View style={styles.gridLineHorizontal2} />
          <View style={styles.gridLineVertical} />
          <View style={styles.gridLineVertical2} />
        </View>

        {/* Live GPS Telemetry Status Header */}
        <View style={styles.telemetryBadge}>
          <Animated.View
            style={[styles.liveIndicatorDot, { transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.liveBadgeText}>LIVE GPS TRACKING</Text>
          <Text style={styles.telemetrySub}>Updated 2s ago</Text>
        </View>

        {/* Map Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setIsLiveTracking(!isLiveTracking)}
          >
            <Ionicons
              name={isLiveTracking ? "pause-circle" : "play-circle"}
              size={22}
              color="#2563eb"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setRouteIndex((routeIndex + 1) % ROUTE_POINTS.length)}
          >
            <Ionicons name="navigate-circle" size={22} color="#0f172a" />
          </TouchableOpacity>
        </View>

        {/* Route Path visual polyline representation */}
        <View style={styles.routePolyline}>
          <View style={[styles.polylineSegment, { width: `${progressPercent}%` }]} />
        </View>

        {/* Merchant Store Marker */}
        <View style={[styles.mapMarker, styles.merchantMarkerPos]}>
          <View style={styles.merchantBubble}>
            <Ionicons name="storefront" size={14} color="#ffffff" />
          </View>
          <Text style={styles.markerLabel}>{merchantLocation.label || "Store"}</Text>
        </View>

        {/* Live Animated Delivery Bike Marker */}
        <View
          style={[
            styles.mapMarker,
            styles.bikeMarkerPos,
            {
              left: `${20 + routeIndex * 15}%`,
              top: `${40 + (routeIndex % 2) * 10}%`,
            },
          ]}
        >
          <Animated.View
            style={[styles.bikeBeaconRing, { transform: [{ scale: pulseAnim }] }]}
          />
          <View style={styles.bikeBubble}>
            <Ionicons name="bicycle" size={18} color="#ffffff" />
          </View>
          <View style={styles.speedPill}>
            <Text style={styles.speedText}>26 km/h</Text>
          </View>
        </View>

        {/* Customer Home Destination Marker */}
        <View style={[styles.mapMarker, styles.customerMarkerPos]}>
          <View style={styles.customerBubble}>
            <Ionicons name="home" size={14} color="#ffffff" />
          </View>
          <Text style={styles.markerLabel}>{customerLocation.label || "Home"}</Text>
        </View>
      </View>

      {/* Driver Info & Live Delivery Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverCardHeader}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={22} color="#2563eb" />
          </View>

          <View style={styles.driverMainInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.vehicleDetails}>{vehicleDetails}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>4.9 (480+ deliveries)</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver}>
            <Ionicons name="call" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Distance & ETA Bar */}
        <View style={styles.metricsBar}>
          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>{etaMinutes} mins</Text>
            <Text style={styles.metricLabel}>Estimated Arrival</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>1.4 km</Text>
            <Text style={styles.metricLabel}>Distance Left</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>{currentBikePos.label?.split(" ")[0]}</Text>
            <Text style={styles.metricLabel}>Current Location</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
  mapCanvas: {
    height: 220,
    backgroundColor: "#e0f2fe", // Light map water/landscape tone
    position: "relative",
    overflow: "hidden",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.2,
  },
  gridLineHorizontal: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#0284c7",
  },
  gridLineHorizontal2: {
    position: "absolute",
    top: 140,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#0284c7",
  },
  gridLineVertical: {
    position: "absolute",
    left: "35%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#0284c7",
  },
  gridLineVertical2: {
    position: "absolute",
    left: "70%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#0284c7",
  },
  telemetryBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 10,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#22c55e",
  },
  liveBadgeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  telemetrySub: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "500",
  },
  controlsContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 6,
    zIndex: 10,
  },
  controlBtn: {
    backgroundColor: "#ffffff",
    padding: 6,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  routePolyline: {
    position: "absolute",
    top: "50%",
    left: "15%",
    right: "15%",
    height: 4,
    backgroundColor: "#cbd5e1",
    borderRadius: 2,
  },
  polylineSegment: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: 2,
  },
  mapMarker: {
    position: "absolute",
    alignItems: "center",
    zIndex: 5,
  },
  merchantMarkerPos: {
    left: "10%",
    top: "40%",
  },
  merchantBubble: {
    backgroundColor: "#16a34a",
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  customerMarkerPos: {
    right: "10%",
    top: "45%",
  },
  customerBubble: {
    backgroundColor: "#dc2626",
    padding: 6,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
  },
  bikeMarkerPos: {},
  bikeBeaconRing: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
    top: -3,
  },
  bikeBubble: {
    backgroundColor: "#2563eb",
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 4,
  },
  speedPill: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    marginTop: 2,
  },
  speedText: {
    color: "#ffffff",
    fontSize: 9,
    fontWeight: "700",
  },
  markerLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  driverCard: {
    padding: 14,
    gap: 12,
  },
  driverCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  driverMainInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  vehicleDetails: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 1,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  callBtn: {
    backgroundColor: "#16a34a",
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  metricCol: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e2e8f0",
  },
});

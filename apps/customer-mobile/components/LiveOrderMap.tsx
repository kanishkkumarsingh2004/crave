import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { findShortestPathAStar, AStarRouteResult } from "@delivery/utils";
import { MapLibreGLMap } from "./MapLibreGLMap";

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
  const [routeResult, setRouteResult] = useState<AStarRouteResult | null>(null);

  useEffect(() => {
    const calculatedRoute = findShortestPathAStar(
      { latitude: merchantLocation.latitude, longitude: merchantLocation.longitude, name: merchantLocation.label || "Store" },
      { latitude: customerLocation.latitude, longitude: customerLocation.longitude, name: customerLocation.label || "Home" }
    );
    setRouteResult(calculatedRoute);
  }, [merchantLocation, customerLocation]);

  useEffect(() => {
    if (!isLiveTracking) return;
    const interval = setInterval(() => {
      setRouteIndex((prev) => (prev + 1) % ROUTE_POINTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLiveTracking]);

  const currentBikePos = ROUTE_POINTS[routeIndex];

  const handleCallDriver = () => {
    Linking.openURL(`tel:${driverPhone}`);
  };

  return (
    <View style={styles.mapContainer}>
      {/* Clean Uncluttered Minimal Top-Down Light Map View */}
      <View style={styles.mapCanvas}>
        <MapLibreGLMap
          startPoint={merchantLocation}
          endPoint={customerLocation}
          driverLocation={currentBikePos}
          routePoints={routeResult?.path || ROUTE_POINTS}
        />
      </View>

      {/* Order Status Light Banner */}
      <View style={styles.pickedUpBanner}>
        <View style={styles.pickedUpIconCircle}>
          <Ionicons name="bag-check" size={18} color="#ffffff" />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.statusTitleRow}>
            <Text style={styles.pickedUpTitle}>Order Picked Up from Store!</Text>
            <View style={styles.gpsBadge}>
              <Text style={styles.gpsBadgeText}>GPS Active</Text>
            </View>
          </View>
          <Text style={styles.pickedUpSub}>
            {driverName} collected your order from {merchantLocation.label || "Store"}. En route to your address!
          </Text>
        </View>
      </View>

      {/* Driver Info & Live Delivery Light Card */}
      <View style={styles.driverCard}>
        <View style={styles.driverCardHeader}>
          <View style={styles.driverAvatar}>
            <Ionicons name="person" size={20} color="#2563eb" />
          </View>

          <View style={styles.driverMainInfo}>
            <Text style={styles.driverName}>{driverName}</Text>
            <Text style={styles.vehicleDetails}>{vehicleDetails}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.ratingText}>4.9 (480+ deliveries)</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.callBtn} onPress={handleCallDriver} activeOpacity={0.8}>
            <Ionicons name="call" size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Distance & ETA Bar */}
        <View style={styles.metricsBar}>
          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>{routeResult?.estimatedMins ?? etaMinutes} mins</Text>
            <Text style={styles.metricLabel}>A* ETA Arrival</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>{routeResult?.totalDistanceKm ?? "1.4"} km</Text>
            <Text style={styles.metricLabel}>Distance Left</Text>
          </View>

          <View style={styles.metricDivider} />

          <View style={styles.metricCol}>
            <Text style={styles.metricValue}>{currentBikePos.label?.split(" ")[0]}</Text>
            <Text style={styles.metricLabel}>Current Spot</Text>
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
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  mapCanvas: {
    height: 220,
    backgroundColor: "#f8fafc",
    position: "relative",
    overflow: "hidden",
  },
  pickedUpBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    padding: 12,
    gap: 12,
  },
  pickedUpIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  statusTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickedUpTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  gpsBadge: {
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  gpsBadgeText: { fontSize: 9, fontWeight: "700", color: "#16a34a" },
  pickedUpSub: { fontSize: 11, color: "#64748b", marginTop: 2, lineHeight: 15 },
  driverCard: {
    padding: 14,
    gap: 12,
    backgroundColor: "#ffffff",
  },
  driverCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  driverMainInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  vehicleDetails: {
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  callBtn: {
    backgroundColor: "#16a34a",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  metricsBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricCol: {
    alignItems: "center",
  },
  metricValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f172a",
  },
  metricLabel: {
    fontSize: 9,
    color: "#64748b",
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#e2e8f0",
  },
});

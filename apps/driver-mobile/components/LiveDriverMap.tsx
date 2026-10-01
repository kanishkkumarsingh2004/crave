import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { findShortestPathAStar, AStarRouteResult } from "@delivery/utils";
import { useDeviceLocation } from "../hooks/useDeviceLocation";
import { MapLibreGLMap } from "./MapLibreGLMap";

interface LiveDriverMapProps {
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  onArrivedAtDestination?: () => void;
}

export const LiveDriverMap: React.FC<LiveDriverMapProps> = ({
  orderNumber = "ORD-10004",
  customerName = "Alice Smith",
  customerPhone = "+919876543210",
  destinationAddress = "123 Main Street, Apt 4B, Koramangala, Bengaluru",
  destinationLat = 12.9392,
  destinationLng = 77.6248,
}) => {
  const { location: driverGpsLocation, requestGpsPermission } = useDeviceLocation();
  const [routeResult, setRouteResult] = useState<AStarRouteResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  // Compute A* Shortest Path whenever driver GPS location or destination changes
  useEffect(() => {
    const startPoint = driverGpsLocation
      ? { latitude: driverGpsLocation.latitude, longitude: driverGpsLocation.longitude, name: "Driver GPS" }
      : { latitude: 12.9345, longitude: 77.6101, name: "Driver Base" };

    const endPoint = {
      latitude: destinationLat,
      longitude: destinationLng,
      name: customerName,
    };

    const calculatedRoute = findShortestPathAStar(startPoint, endPoint);
    setRouteResult(calculatedRoute);
    setStepIndex(0);
  }, [driverGpsLocation, destinationLat, destinationLng, customerName]);

  // Cycle turn-by-turn navigation HUD instructions derived from A* path
  useEffect(() => {
    if (!routeResult || routeResult.steps.length === 0) return;
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % routeResult.steps.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [routeResult]);

  const currentDriverLat = driverGpsLocation?.latitude ?? 12.9345;
  const currentDriverLng = driverGpsLocation?.longitude ?? 77.6101;

  const currentStepInstruction =
    routeResult?.steps[stepIndex]?.instruction || "Head towards destination via A* optimal route";
  const currentStepDist = routeResult?.steps[stepIndex]?.distanceKm
    ? `${routeResult.steps[stepIndex].distanceKm} km`
    : "300m";

  const handleOpenExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentDriverLat},${currentDriverLng}&destination=${encodeURIComponent(
      destinationAddress,
    )}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Minimal Light Header Navigation HUD */}
      <View style={styles.hudBanner}>
        <View style={styles.hudIconBox}>
          <Ionicons name="navigate" size={18} color="#2563eb" />
        </View>

        <View style={styles.hudTextContainer}>
          <Text style={styles.hudInstruction}>{currentStepInstruction}</Text>
          <Text style={styles.hudDistance}>A* Route Step • In {currentStepDist}</Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={requestGpsPermission}>
          <Ionicons name="refresh" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* Uncluttered Top-Down Bird's Eye Light Map View */}
      <View style={styles.mapCanvas}>
        <MapLibreGLMap
          startPoint={{ latitude: 12.9345, longitude: 77.6101, label: "Store" }}
          endPoint={{ latitude: destinationLat, longitude: destinationLng, label: customerName }}
          driverLocation={{ latitude: currentDriverLat, longitude: currentDriverLng, label: "YOU (GPS)" }}
          routePoints={routeResult?.path || []}
        />
      </View>

      {/* Minimal Light Telemetry Footer Bar */}
      <View style={styles.telemetryFooter}>
        <View style={styles.customerSummary}>
          <Ionicons name="person-circle-outline" size={28} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.customerNameText}>{customerName}</Text>
            <Text style={styles.destinationAddrText} numberOfLines={1}>
              {destinationAddress}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleOpenExternalMaps} activeOpacity={0.8}>
          <Ionicons name="map-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.navBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  hudBanner: {
    backgroundColor: "#ffffff",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  hudIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  hudTextContainer: {
    flex: 1,
  },
  hudInstruction: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  hudDistance: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  refreshBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
  },
  mapCanvas: {
    height: 240,
    backgroundColor: "#f8fafc",
    position: "relative",
    overflow: "hidden",
  },
  telemetryFooter: {
    padding: 14,
    backgroundColor: "#ffffff",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  customerSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  destinationAddrText: {
    fontSize: 12,
    color: "#64748b",
  },
  navBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
});

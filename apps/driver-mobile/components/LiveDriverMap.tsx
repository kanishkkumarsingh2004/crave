import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { findShortestPathAStar, AStarRouteResult } from "@delivery/utils";
import { useDeviceLocation } from "../hooks/useDeviceLocation";

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
  const [soundMuted, setSoundMuted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for bike location marker
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

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
  const currentSpeed = Math.round(26 + (currentDriverLat % 0.001) * 5000);

  const currentStepInstruction =
    routeResult?.steps[stepIndex]?.instruction || "Head towards destination via A* optimal route";
  const currentStepDist = routeResult?.steps[stepIndex]?.distanceKm
    ? `${routeResult.steps[stepIndex].distanceKm} km`
    : "300m";

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${customerPhone}`);
  };

  const handleOpenExternalMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${currentDriverLat},${currentDriverLng}&destination=${encodeURIComponent(
      destinationAddress,
    )}`;
    Linking.openURL(url);
  };

  const handleRecalculateAStar = () => {
    requestGpsPermission();
  };

  return (
    <View style={styles.container}>
      {/* Mapcn Dark Header Navigation HUD */}
      <View style={styles.hudBanner}>
        <View style={styles.hudIconBox}>
          <Ionicons name="navigate-circle" size={24} color="#38bdf8" />
        </View>

        <View style={styles.hudTextContainer}>
          <Text style={styles.hudInstruction}>{currentStepInstruction}</Text>
          <Text style={styles.hudDistance}>A* Route Step • In {currentStepDist}</Text>
        </View>

        <TouchableOpacity style={styles.hudMuteBtn} onPress={() => setSoundMuted(!soundMuted)}>
          <Ionicons name={soundMuted ? "volume-mute" : "volume-high"} size={20} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* Mapcn Dark Canvas Map Area */}
      <View style={styles.mapCanvas}>
        {/* Dark Map Vector Grid (Mapcn Style) */}
        <View style={styles.darkRoadGrid}>
          <View style={styles.roadLineVertical1} />
          <View style={styles.roadLineVertical2} />
          <View style={styles.roadLineHorizontal1} />
          <View style={styles.roadLineHorizontal2} />
          <View style={styles.aStarPolylineGlowing} />
        </View>

        {/* Mapcn Styled Overlay Pill Card (A* Route Metrics) */}
        <View style={styles.mapcnMetricsCard}>
          <View style={styles.mapcnCardHeader}>
            <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
            <Text style={styles.mapcnCardTitle}>A* Shortest Path</Text>
          </View>
          <View style={styles.mapcnCardStats}>
            <View style={styles.statMetric}>
              <Text style={styles.statVal}>{routeResult?.totalDistanceKm ?? "2.4"}</Text>
              <Text style={styles.statLbl}>KM</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statMetric}>
              <Text style={styles.statVal}>{routeResult?.estimatedMins ?? "12"}</Text>
              <Text style={styles.statLbl}>MINS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statMetric}>
              <Text style={styles.statVal}>{currentSpeed}</Text>
              <Text style={styles.statLbl}>KM/H</Text>
            </View>
          </View>
        </View>

        {/* GPS Live Accuracy Badge */}
        <View style={styles.gpsLockBadge}>
          <View style={styles.gpsGreenDot} />
          <Text style={styles.gpsLockText}>
            GPS {driverGpsLocation ? "Live" : "Simulated"} ({currentDriverLat.toFixed(4)}, {currentDriverLng.toFixed(4)})
          </Text>
        </View>

        {/* Floating Action Buttons */}
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenExternalMaps}>
            <Ionicons name="open-outline" size={18} color="#38bdf8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCallCustomer}>
            <Ionicons name="call" size={18} color="#4ade80" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleRecalculateAStar}>
            <Ionicons name="refresh" size={18} color="#a855f7" />
          </TouchableOpacity>
        </View>

        {/* Start / Store Pickup Marker (Green) */}
        <View style={[styles.mapPin, styles.merchantPinPos]}>
          <View style={styles.merchantPinBubble}>
            <Ionicons name="restaurant" size={12} color="#ffffff" />
          </View>
          <Text style={styles.pinTag}>Store</Text>
        </View>

        {/* Live Driver Mobile GPS Position (Blue Bike Marker) */}
        <View
          style={[
            styles.mapPin,
            styles.driverBikePos,
            {
              left: `${35 + ((currentDriverLng * 100) % 25)}%`,
              top: `${42 - ((currentDriverLat * 100) % 20)}%`,
            },
          ]}
        >
          <Animated.View style={[styles.beaconPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.driverBikeBubble}>
            <Ionicons name="bicycle" size={20} color="#ffffff" />
          </View>
          <View style={styles.youBadge}>
            <Text style={styles.youText}>YOU (GPS)</Text>
          </View>
        </View>

        {/* Customer Destination Marker (Red Pin) */}
        <View style={[styles.mapPin, styles.customerPinPos]}>
          <View style={styles.customerPinBubble}>
            <Ionicons name="location" size={14} color="#ffffff" />
          </View>
          <Text style={styles.pinTag}>{customerName}</Text>
        </View>
      </View>

      {/* Telemetry Footer Bar */}
      <View style={styles.telemetryFooter}>
        <View style={styles.customerSummary}>
          <Ionicons name="person-circle" size={32} color="#2563eb" />
          <View style={{ flex: 1 }}>
            <Text style={styles.customerNameText}>{customerName}</Text>
            <Text style={styles.destinationAddrText} numberOfLines={1}>
              {destinationAddress}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.navBtn} onPress={handleOpenExternalMaps} activeOpacity={0.8}>
          <Ionicons name="navigate" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.navBtnText}>Open in Google Maps</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#090d16",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  hudBanner: {
    backgroundColor: "#0f172a",
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  hudIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
  },
  hudTextContainer: {
    flex: 1,
  },
  hudInstruction: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "700",
  },
  hudDistance: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  hudMuteBtn: {
    padding: 6,
  },
  mapCanvas: {
    height: 250,
    backgroundColor: "#090d16",
    position: "relative",
    overflow: "hidden",
  },
  darkRoadGrid: {
    ...StyleSheet.absoluteFill,
  },
  roadLineVertical1: {
    position: "absolute",
    left: "30%",
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: "#1e293b",
  },
  roadLineVertical2: {
    position: "absolute",
    left: "70%",
    top: 0,
    bottom: 0,
    width: 14,
    backgroundColor: "#1e293b",
  },
  roadLineHorizontal1: {
    position: "absolute",
    top: "40%",
    left: 0,
    right: 0,
    height: 14,
    backgroundColor: "#1e293b",
  },
  roadLineHorizontal2: {
    position: "absolute",
    top: "75%",
    left: 0,
    right: 0,
    height: 10,
    backgroundColor: "#1e293b",
  },
  aStarPolylineGlowing: {
    position: "absolute",
    top: "41%",
    left: "15%",
    right: "15%",
    height: 5,
    backgroundColor: "#38bdf8",
    borderRadius: 3,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 6,
  },
  mapcnMetricsCard: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 4,
  },
  mapcnCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  mapcnCardTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38bdf8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mapcnCardStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statMetric: {
    alignItems: "center",
  },
  statVal: {
    fontSize: 15,
    fontWeight: "900",
    color: "#f8fafc",
    lineHeight: 17,
  },
  statLbl: {
    fontSize: 8,
    fontWeight: "800",
    color: "#94a3b8",
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#334155",
  },
  gpsLockBadge: {
    position: "absolute",
    bottom: 10,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 5,
  },
  gpsGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#4ade80",
  },
  gpsLockText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#cbd5e1",
    fontFamily: "monospace",
  },
  mapActions: {
    position: "absolute",
    top: 12,
    right: 12,
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 4,
  },
  mapPin: {
    position: "absolute",
    alignItems: "center",
    zIndex: 5,
  },
  merchantPinPos: {
    left: "10%",
    top: "35%",
  },
  merchantPinBubble: {
    backgroundColor: "#16a34a",
    padding: 6,
    borderRadius: 12,
  },
  customerPinPos: {
    right: "10%",
    top: "35%",
  },
  customerPinBubble: {
    backgroundColor: "#ef4444",
    padding: 6,
    borderRadius: 12,
  },
  driverBikePos: {},
  beaconPulse: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(56, 189, 248, 0.35)",
    top: -5,
  },
  driverBikeBubble: {
    backgroundColor: "#0284c7",
    padding: 7,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "#ffffff",
    elevation: 4,
  },
  youBadge: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginTop: 2,
  },
  youText: {
    color: "#38bdf8",
    fontSize: 8,
    fontWeight: "900",
  },
  pinTag: {
    fontSize: 9,
    fontWeight: "800",
    color: "#f8fafc",
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
    borderWidth: 1,
    borderColor: "#334155",
  },
  telemetryFooter: {
    padding: 14,
    backgroundColor: "#0f172a",
    gap: 12,
  },
  customerSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#f8fafc",
  },
  destinationAddrText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  navBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  navBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
});

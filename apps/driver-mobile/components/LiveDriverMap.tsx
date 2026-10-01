import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface LiveDriverMapProps {
  orderNumber?: string;
  customerName?: string;
  customerPhone?: string;
  destinationAddress?: string;
  onArrivedAtDestination?: () => void;
}

const DRIVER_ROUTE_STEPS = [
  { instruction: "Head north on 100ft Ring Road towards 4th Block", dist: "300m" },
  { instruction: "Turn right onto 8th Main Road", dist: "150m" },
  { instruction: "Continue straight past Sony Signal Junction", dist: "600m" },
  { instruction: "Arriving at Customer Destination on the Left", dist: "50m" },
];

export const LiveDriverMap: React.FC<LiveDriverMapProps> = ({
  orderNumber = "ORD-10004",
  customerName = "Ananya Roy",
  customerPhone = "+919812345678",
  destinationAddress = "Flat 402, Sunshine Heights, 7th Block Koramangala",
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [currentSpeed, setCurrentSpeed] = useState(28);
  const [soundMuted, setSoundMuted] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Pulse animation for bike location marker
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.25,
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

  // Simulate turn-by-turn navigation & speed updates
  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % DRIVER_ROUTE_STEPS.length);
      setCurrentSpeed(Math.floor(22 + Math.random() * 12));
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentStep = DRIVER_ROUTE_STEPS[stepIndex];

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${customerPhone}`);
  };

  const handleOpenExternalMaps = () => {
    // Open Google Maps / Apple Maps intent
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      destinationAddress,
    )}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Turn-by-Turn GPS Navigation HUD */}
      <View style={styles.hudBanner}>
        <View style={styles.hudIconBox}>
          <Ionicons name="arrow-redo" size={24} color="#ffffff" />
        </View>

        <View style={styles.hudTextContainer}>
          <Text style={styles.hudInstruction}>{currentStep.instruction}</Text>
          <Text style={styles.hudDistance}>In {currentStep.dist}</Text>
        </View>

        <TouchableOpacity style={styles.hudMuteBtn} onPress={() => setSoundMuted(!soundMuted)}>
          <Ionicons name={soundMuted ? "volume-mute" : "volume-high"} size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* Driver Map Canvas */}
      <View style={styles.mapCanvas}>
        {/* Map Grid / Road Topography simulation */}
        <View style={styles.roadNetwork}>
          <View style={styles.mainRoadVertical} />
          <View style={styles.crossRoadHorizontal} />
          <View style={styles.routePolylineHighlighted} />
        </View>

        {/* Floating Speedometer Pill */}
        <View style={styles.speedometerPill}>
          <Text style={styles.speedValue}>{currentSpeed}</Text>
          <Text style={styles.speedUnit}>KM/H</Text>
          <View style={styles.limitTag}>
            <Text style={styles.limitText}>Limit 40</Text>
          </View>
        </View>

        {/* Map Action Quick Buttons */}
        <View style={styles.mapActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleOpenExternalMaps}>
            <Ionicons name="open-outline" size={20} color="#0f172a" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleCallCustomer}>
            <Ionicons name="call" size={20} color="#16a34a" />
          </TouchableOpacity>
        </View>

        {/* Merchant Pickup Node */}
        <View style={[styles.mapPin, styles.merchantPinPos]}>
          <View style={styles.merchantPinBubble}>
            <Ionicons name="restaurant" size={12} color="#ffffff" />
          </View>
          <Text style={styles.pinTag}>Picked Up</Text>
        </View>

        {/* Live Driver Bike Position */}
        <View
          style={[
            styles.mapPin,
            styles.driverBikePos,
            {
              left: `${30 + stepIndex * 18}%`,
              top: `${45 - (stepIndex % 2) * 5}%`,
            },
          ]}
        >
          <Animated.View style={[styles.beaconPulse, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.driverBikeBubble}>
            <Ionicons name="bicycle" size={20} color="#ffffff" />
          </View>
          <View style={styles.youBadge}>
            <Text style={styles.youText}>YOU</Text>
          </View>
        </View>

        {/* Customer Destination Dropoff Node */}
        <View style={[styles.mapPin, styles.customerPinPos]}>
          <View style={styles.customerPinBubble}>
            <Ionicons name="location" size={14} color="#ffffff" />
          </View>
          <Text style={styles.pinTag}>{customerName}</Text>
        </View>
      </View>

      {/* Navigation Quick Telemetry Footer */}
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

        <TouchableOpacity style={styles.navBtn} onPress={handleOpenExternalMaps}>
          <Ionicons name="navigate" size={16} color="#ffffff" style={{ marginRight: 4 }} />
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
  },
  hudBanner: {
    backgroundColor: "#0f172a",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  hudIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  hudTextContainer: {
    flex: 1,
  },
  hudInstruction: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  hudDistance: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  hudMuteBtn: {
    padding: 6,
  },
  mapCanvas: {
    height: 230,
    backgroundColor: "#f1f5f9",
    position: "relative",
    overflow: "hidden",
  },
  roadNetwork: {
    ...StyleSheet.absoluteFill,
  },
  mainRoadVertical: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: "#cbd5e1",
    marginLeft: -12,
  },
  crossRoadHorizontal: {
    position: "absolute",
    top: "45%",
    left: 0,
    right: 0,
    height: 20,
    backgroundColor: "#cbd5e1",
  },
  routePolylineHighlighted: {
    position: "absolute",
    top: "47%",
    left: "15%",
    right: "15%",
    height: 6,
    backgroundColor: "#2563eb",
    borderRadius: 3,
  },
  speedometerPill: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  speedValue: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    lineHeight: 20,
  },
  speedUnit: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  limitTag: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#ef4444",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
    marginTop: 2,
  },
  limitText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#dc2626",
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
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  mapPin: {
    position: "absolute",
    alignItems: "center",
    zIndex: 5,
  },
  merchantPinPos: {
    left: "10%",
    top: "38%",
  },
  merchantPinBubble: {
    backgroundColor: "#16a34a",
    padding: 6,
    borderRadius: 12,
  },
  customerPinPos: {
    right: "10%",
    top: "36%",
  },
  customerPinBubble: {
    backgroundColor: "#dc2626",
    padding: 6,
    borderRadius: 12,
  },
  driverBikePos: {},
  beaconPulse: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(37, 99, 235, 0.3)",
    top: -4,
  },
  driverBikeBubble: {
    backgroundColor: "#2563eb",
    padding: 8,
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
    color: "#ffffff",
    fontSize: 8,
    fontWeight: "900",
  },
  pinTag: {
    fontSize: 9,
    fontWeight: "700",
    color: "#0f172a",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 2,
  },
  telemetryFooter: {
    padding: 12,
    backgroundColor: "#ffffff",
    gap: 10,
  },
  customerSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  customerNameText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
  },
  destinationAddrText: {
    fontSize: 12,
    color: "#64748b",
  },
  navBtn: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
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

import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDriverAuthStore } from "../../src/stores/auth.store";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";

interface DeliveryOffer {
  id: string;
  orderNumber: string;
  vendorName: string;
  pickupAddress: string;
  deliveryAddress: string;
  payout: string;
  distanceKm: number;
  estimatedTimeMin: number;
  score: number;
}

export default function DriverDashboardScreen() {
  const router = useRouter();
  const user = useDriverAuthStore((state) => state.user);
  const [isOnline, setIsOnline] = useState(true);
  const { location, requestGpsPermission } = useDeviceLocation();

  const [availableOffers, setAvailableOffers] = useState<DeliveryOffer[]>([
    {
      id: "del-10004",
      orderNumber: "ORD-10004",
      vendorName: "FreshMart Organics",
      pickupAddress: "104 Market Street, Station Area",
      deliveryAddress: "123 Main Street, Apt 4B, Mumbai",
      payout: "₹85.00",
      distanceKm: 2.4,
      estimatedTimeMin: 12,
      score: 18.5,
    },
    {
      id: "del-10005",
      orderNumber: "ORD-10005",
      vendorName: "Urban Spice Kitchen",
      pickupAddress: "220 Park Road, Sector 5",
      deliveryAddress: "405 Pine Ave, Flat 12B, Mumbai",
      payout: "₹110.00",
      distanceKm: 4.1,
      estimatedTimeMin: 18,
      score: 28.2,
    },
  ]);

  const handleAcceptOffer = (offer: DeliveryOffer) => {
    Alert.alert(
      "Offer Accepted! 🚴",
      `Head to ${offer.vendorName} for pickup. Target payout: ${offer.payout}.`,
      [
        {
          text: "Start Delivery",
          onPress: () => {
            setAvailableOffers((prev) => prev.filter((o) => o.id !== offer.id));
            router.push("/deliveries");
          },
        },
      ],
    );
  };

  const handleDeclineOffer = (offerId: string) => {
    setAvailableOffers((prev) => prev.filter((o) => o.id !== offerId));
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Blinkbite Driver 🚴</Text>
            <Text style={styles.driverName}>{user?.name || "Rahul Sharma"}</Text>
          </View>

          <View style={styles.statusToggleContainer}>
            <Text style={[styles.statusText, { color: isOnline ? "#16a34a" : "#dc2626" }]}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: "#fca5a5", true: "#bbf7d0" }}
              thumbColor={isOnline ? "#16a34a" : "#dc2626"}
            />
          </View>
        </View>

        {/* Online Status Banner */}
        <View style={[styles.banner, { backgroundColor: isOnline ? "#f0fdf4" : "#fef2f2" }]}>
          <Ionicons
            name={isOnline ? "navigate-circle" : "pause-circle"}
            size={20}
            color={isOnline ? "#16a34a" : "#dc2626"}
          />
          <Text style={[styles.bannerText, { color: isOnline ? "#15803d" : "#b91c1c" }]}>
            {isOnline
              ? "You are ONLINE — Looking for nearby high-priority delivery offers..."
              : "You are OFFLINE — Switch to ONLINE to receive delivery dispatch offers."}
          </Text>
        </View>

        {/* Today's Metrics Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="wallet-outline" size={20} color="#2563eb" />
            <Text style={styles.statTitle}>Today&apos;s Earnings</Text>
            <Text style={styles.statValue}>₹1,185.00</Text>
            <Text style={styles.statSub}>8 trips completed</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={20} color="#eab308" />
            <Text style={styles.statTitle}>Driver Rating</Text>
            <Text style={styles.statValue}>4.9 ★</Text>
            <Text style={styles.statSub}>98% Acceptance Rate</Text>
          </View>
        </View>

        {/* Dispatch Offers Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            Available Offers ({isOnline ? availableOffers.length : 0})
          </Text>
          {isOnline && availableOffers.length > 0 && (
            <View style={styles.algoTag}>
              <Ionicons name="hardware-chip" size={12} color="#2563eb" />
              <Text style={styles.algoText}>H3 Distance Optimized</Text>
            </View>
          )}
        </View>

        {!isOnline ? (
          <View style={styles.emptyState}>
            <Ionicons name="moon-outline" size={40} color="#94a3b8" />
            <Text style={styles.emptyTitle}>You are currently Offline</Text>
            <Text style={styles.emptySub}>
              Toggle your availability switch at the top to start accepting trip offers.
            </Text>
          </View>
        ) : availableOffers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#16a34a" />
            <Text style={styles.emptyTitle}>No Offers Right Now</Text>
            <Text style={styles.emptySub}>
              You are in a high-demand zone. New delivery requests will pop up shortly.
            </Text>
          </View>
        ) : (
          availableOffers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View style={styles.orderBadge}>
                  <Text style={styles.orderBadgeText}>{offer.orderNumber}</Text>
                </View>
                <Text style={styles.payoutText}>{offer.payout}</Text>
              </View>

              <Text style={styles.vendorName}>{offer.vendorName}</Text>

              <View style={styles.routeContainer}>
                <View style={styles.routeItem}>
                  <Ionicons name="ellipse" size={12} color="#2563eb" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>PICKUP</Text>
                    <Text style={styles.routeAddress}>{offer.pickupAddress}</Text>
                  </View>
                </View>

                <View style={styles.routeItem}>
                  <Ionicons name="location" size={14} color="#16a34a" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.routeLabel}>DROP-OFF</Text>
                    <Text style={styles.routeAddress}>{offer.deliveryAddress}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.metaRow}>
                <View style={styles.metaBadge}>
                  <Ionicons name="compass-outline" size={14} color="#64748b" />
                  <Text style={styles.metaBadgeText}>{offer.distanceKm} km</Text>
                </View>
                <View style={styles.metaBadge}>
                  <Ionicons name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.metaBadgeText}>~{offer.estimatedTimeMin} mins</Text>
                </View>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.declineBtn}
                  onPress={() => handleDeclineOffer(offer.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptOffer(offer)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.acceptBtnText}>Accept Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  greeting: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  driverName: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  statusToggleContainer: { alignItems: "center", gap: 4 },
  statusText: { fontSize: 11, fontWeight: "800" },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  bannerText: { flex: 1, fontSize: 12, fontWeight: "600" },
  statsGrid: { flexDirection: "row", gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 4,
  },
  statTitle: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  statValue: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  statSub: { fontSize: 10, color: "#94a3b8" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  algoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  algoText: { fontSize: 10, fontWeight: "700", color: "#2563eb" },
  offerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  orderBadgeText: { fontSize: 12, fontWeight: "800", color: "#0f172a" },
  payoutText: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
  vendorName: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  routeContainer: {
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    gap: 10,
  },
  routeItem: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  routeLabel: { fontSize: 10, fontWeight: "800", color: "#64748b" },
  routeAddress: { fontSize: 12, color: "#0f172a", marginTop: 1 },
  metaRow: { flexDirection: "row", gap: 12 },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  metaBadgeText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  actionRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  declineBtn: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  declineBtnText: { color: "#475569", fontWeight: "700", fontSize: 14 },
  acceptBtn: {
    flex: 2,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  acceptBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  emptyState: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 30,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 260,
  },
});

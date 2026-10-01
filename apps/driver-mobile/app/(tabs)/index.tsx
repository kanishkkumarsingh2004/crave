import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useDriverAuthStore } from "../../src/stores/auth.store";

interface DeliveryOffer {
  id: string;
  orderNumber: string;
  vendorName: string;
  pickupAddress: string;
  deliveryAddress: string;
  payout: string;
  distance: string;
  estimatedTime: string;
}

export default function DriverDashboardScreen() {
  const router = useRouter();
  const user = useDriverAuthStore((state) => state.user);
  const [isOnline, setIsOnline] = useState(true);

  const [availableOffers, setAvailableOffers] = useState<DeliveryOffer[]>([
    {
      id: "del-1",
      orderNumber: "#ORD-9102",
      vendorName: "Gourmet Burger Kitchen",
      pickupAddress: "104 Market St (0.8 mi away)",
      deliveryAddress: "742 Evergreen Terrace (2.4 mi away)",
      payout: "₹14.50",
      distance: "3.2 mi total",
      estimatedTime: "20 min",
    },
    {
      id: "del-2",
      orderNumber: "#ORD-9088",
      vendorName: "Tokyo Ramen Bar",
      pickupAddress: "220 Main St (1.2 mi away)",
      deliveryAddress: "405 Pine Ave, Apt 12B (3.1 mi away)",
      payout: "₹11.20",
      distance: "4.3 mi total",
      estimatedTime: "25 min",
    },
  ]);

  const handleAcceptOffer = (offer: DeliveryOffer) => {
    Alert.alert("Offer Accepted!", `Head to ${offer.vendorName} for pickup.`);
    setAvailableOffers((prev) => prev.filter((o) => o.id !== offer.id));
    router.push("/deliveries");
  };

  const handleDeclineOffer = (offerId: string) => {
    setAvailableOffers((prev) => prev.filter((o) => o.id !== offerId));
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Driver Console 🚗</Text>
            <Text style={styles.driverName}>{user?.name || "Driver Partner"}</Text>
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
              ? "You are online — Looking for nearby delivery offers..."
              : "You are offline — Toggle online to start receiving orders"}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="wallet-outline" size={20} color="#2563eb" />
            <Text style={styles.statTitle}>Today's Earnings</Text>
            <Text style={styles.statValue}>₹118.50</Text>
            <Text style={styles.statSub}>8 trips completed</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={20} color="#d97706" />
            <Text style={styles.statTitle}>Rating</Text>
            <Text style={styles.statValue}>4.96 ★</Text>
            <Text style={styles.statSub}>98% Acceptance</Text>
          </View>
        </View>

        {/* Available Offers Stream */}
        <Text style={styles.sectionTitle}>
          New Delivery Offers ({isOnline ? availableOffers.length : 0})
        </Text>

        {!isOnline ? (
          <View style={styles.emptyCard}>
            <Ionicons name="moon-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>You're Offline</Text>
            <Text style={styles.emptySub}>Switch to Online duty mode to accept nearby runs.</Text>
          </View>
        ) : availableOffers.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="compass-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Searching for rides...</Text>
            <Text style={styles.emptySub}>Stay in hot spots for higher order volume.</Text>
          </View>
        ) : (
          availableOffers.map((offer) => (
            <View key={offer.id} style={styles.offerCard}>
              <View style={styles.offerHeader}>
                <View>
                  <Text style={styles.vendorName}>{offer.vendorName}</Text>
                  <Text style={styles.orderNo}>{offer.orderNumber}</Text>
                </View>
                <Text style={styles.payoutAmount}>{offer.payout}</Text>
              </View>

              <View style={styles.routeBox}>
                <View style={styles.routeRow}>
                  <Ionicons name="radio-button-on" size={16} color="#7c3aed" />
                  <Text style={styles.routeText}>{offer.pickupAddress}</Text>
                </View>
                <View style={styles.routeLine} />
                <View style={styles.routeRow}>
                  <Ionicons name="location" size={16} color="#16a34a" />
                  <Text style={styles.routeText}>{offer.deliveryAddress}</Text>
                </View>
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {offer.distance} • ~{offer.estimatedTime}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.btnAction, styles.btnDecline]}
                  onPress={() => handleDeclineOffer(offer.id)}
                >
                  <Text style={styles.btnDeclineText}>Decline</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btnAction, styles.btnAccept]}
                  onPress={() => handleAcceptOffer(offer)}
                >
                  <Ionicons name="flash" size={16} color="#fff" />
                  <Text style={styles.btnAcceptText}>Accept Order</Text>
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
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  greeting: { fontSize: 13, color: "#6b7280" },
  driverName: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statusToggleContainer: { alignItems: "flex-end" },
  statusText: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  bannerText: { fontSize: 13, fontWeight: "500", flex: 1 },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statTitle: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  statValue: { fontSize: 20, fontWeight: "700", color: "#111827", marginVertical: 2 },
  statSub: { fontSize: 11, color: "#9ca3af" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  emptyCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 8 },
  emptySub: { fontSize: 13, color: "#9ca3af", marginTop: 2, textAlign: "center" },
  offerCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  offerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  vendorName: { fontSize: 16, fontWeight: "700", color: "#111827" },
  orderNo: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  payoutAmount: { fontSize: 22, fontWeight: "800", color: "#2563eb" },
  routeBox: { backgroundColor: "#f9fafb", padding: 10, borderRadius: 8, marginVertical: 12 },
  routeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  routeText: { fontSize: 13, color: "#374151", flex: 1, fontWeight: "500" },
  routeLine: { width: 2, height: 12, backgroundColor: "#d1d5db", marginLeft: 7, marginVertical: 2 },
  metaRow: { marginBottom: 12 },
  metaText: { fontSize: 12, color: "#6b7280" },
  actionsRow: { flexDirection: "row", gap: 8 },
  btnAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  btnDecline: { backgroundColor: "#fee2e2" },
  btnDeclineText: { color: "#dc2626", fontWeight: "600", fontSize: 13 },
  btnAccept: { backgroundColor: "#2563eb" },
  btnAcceptText: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

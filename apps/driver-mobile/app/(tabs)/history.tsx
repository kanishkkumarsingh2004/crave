import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const TRIP_HISTORY = [
  {
    id: "del-10001",
    orderNumber: "ORD-10001",
    vendorName: "FreshMart Organics",
    customerAddress: "123 Main Street, Apt 4B, Mumbai",
    date: "Today, 2:15 PM",
    payout: "₹85.00",
    distanceKm: 2.4,
    status: "COMPLETED",
  },
  {
    id: "del-10002",
    orderNumber: "ORD-10002",
    vendorName: "Urban Spice Kitchen",
    customerAddress: "405 Pine Ave, Flat 12B, Mumbai",
    date: "Yesterday, 7:45 PM",
    payout: "₹110.00",
    distanceKm: 4.1,
    status: "COMPLETED",
  },
  {
    id: "del-10003",
    orderNumber: "ORD-10003",
    vendorName: "JuiceHub Corner",
    customerAddress: "78 Park Street, Mumbai",
    date: "Yesterday, 1:20 PM",
    payout: "₹65.00",
    distanceKm: 1.8,
    status: "COMPLETED",
  },
];

export default function DriverHistoryScreen() {
  const [filter, setFilter] = useState<"ALL" | "COMPLETED">("ALL");

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Delivery Log History</Text>
          <Text style={styles.subTitle}>Completed trip logs & handover records</Text>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, filter === "ALL" && styles.filterChipActive]}
              onPress={() => setFilter("ALL")}
            >
              <Text style={[styles.filterText, filter === "ALL" && styles.filterTextActive]}>
                All Trips ({TRIP_HISTORY.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, filter === "COMPLETED" && styles.filterChipActive]}
              onPress={() => setFilter("COMPLETED")}
            >
              <Text style={[styles.filterText, filter === "COMPLETED" && styles.filterTextActive]}>
                Completed
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {TRIP_HISTORY.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripHeader}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{trip.orderNumber}</Text>
                </View>
                <Text style={styles.payoutText}>{trip.payout}</Text>
              </View>

              <Text style={styles.vendorName}>{trip.vendorName}</Text>

              <View style={styles.addressBox}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {trip.customerAddress}
                </Text>
              </View>

              <View style={styles.tripFooter}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{trip.date}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="compass-outline" size={12} color="#64748b" />
                  <Text style={styles.metaText}>{trip.distanceKm} km</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1 },
  header: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  subTitle: { fontSize: 12, color: "#64748b" },
  filterRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
  },
  filterChipActive: { backgroundColor: "#2563eb" },
  filterText: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  filterTextActive: { color: "#ffffff" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  tripCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
  },
  tripHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { fontSize: 12, fontWeight: "800", color: "#2563eb" },
  payoutText: { fontSize: 16, fontWeight: "800", color: "#16a34a" },
  vendorName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  addressBox: { flexDirection: "row", alignItems: "center", gap: 4 },
  addressText: { fontSize: 12, color: "#64748b" },
  tripFooter: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#64748b" },
});

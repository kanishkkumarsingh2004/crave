import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface HistoryRecord {
  id: string;
  orderNumber: string;
  vendorName: string;
  customerName: string;
  date: string;
  tripEarnings: string;
  tipAmount: string;
  totalPayout: string;
  distance: string;
}

const HISTORY_DATA: HistoryRecord[] = [
  {
    id: "h-1",
    orderNumber: "#ORD-8940",
    vendorName: "Gourmet Burger Kitchen",
    customerName: "Sarah Connor",
    date: "Today, 1:30 PM",
    tripEarnings: "₹9.50",
    tipAmount: "₹4.00",
    totalPayout: "₹13.50",
    distance: "2.8 mi",
  },
  {
    id: "h-2",
    orderNumber: "#ORD-8922",
    vendorName: "Tokyo Ramen Bar",
    customerName: "David Miller",
    date: "Today, 11:45 AM",
    tripEarnings: "₹8.00",
    tipAmount: "₹3.50",
    totalPayout: "₹11.50",
    distance: "1.9 mi",
  },
  {
    id: "h-3",
    orderNumber: "#ORD-8850",
    vendorName: "Bella Italia Pizzeria",
    customerName: "Lisa Kudrow",
    date: "Yesterday, 8:15 PM",
    tripEarnings: "₹12.00",
    tipAmount: "₹6.00",
    totalPayout: "₹18.00",
    distance: "4.2 mi",
  },
  {
    id: "h-4",
    orderNumber: "#ORD-8812",
    vendorName: "Taco Fiesta",
    customerName: "John Doe",
    date: "Yesterday, 6:00 PM",
    tripEarnings: "₹7.50",
    tipAmount: "₹2.00",
    totalPayout: "₹9.50",
    distance: "1.4 mi",
  },
];

export default function DriverHistoryScreen() {
  const [filter, setFilter] = useState<"ALL" | "TODAY" | "WEEK">("ALL");

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery History</Text>
        <Text style={styles.subTitle}>Past completed delivery logs and tip breakdown</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.chip, filter === "ALL" && styles.chipActive]}
          onPress={() => setFilter("ALL")}
        >
          <Text style={[styles.chipText, filter === "ALL" && styles.chipTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filter === "TODAY" && styles.chipActive]}
          onPress={() => setFilter("TODAY")}
        >
          <Text style={[styles.chipText, filter === "TODAY" && styles.chipTextActive]}>
            Today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filter === "WEEK" && styles.chipActive]}
          onPress={() => setFilter("WEEK")}
        >
          <Text style={[styles.chipText, filter === "WEEK" && styles.chipTextActive]}>
            This Week
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={HISTORY_DATA}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.vendorName}>{item.vendorName}</Text>
                <Text style={styles.dateText}>
                  {item.orderNumber} • {item.date}
                </Text>
              </View>
              <Text style={styles.payoutText}>{item.totalPayout}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailsRow}>
              <Text style={styles.subText}>Customer: {item.customerName}</Text>
              <Text style={styles.subText}>Distance: {item.distance}</Text>
            </View>

            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownText}>
                Fare: {item.tripEarnings} | Tip: <Text style={{ color: "#16a34a", fontWeight: "700" }}>{item.tipAmount}</Text>
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  filterRow: { flexDirection: "row", paddingHorizontal: 16, marginVertical: 10, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb" },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  chipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  vendorName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dateText: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  payoutText: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 10 },
  detailsRow: { flexDirection: "row", justifyContent: "space-between" },
  subText: { fontSize: 12, color: "#4b5563" },
  breakdownRow: { marginTop: 6 },
  breakdownText: { fontSize: 12, color: "#6b7280" },
});

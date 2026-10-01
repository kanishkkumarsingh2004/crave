import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const WEEKLY_BREAKDOWN = [
  { day: "Mon", trips: 6, earnings: 840 },
  { day: "Tue", trips: 8, earnings: 1120 },
  { day: "Wed", trips: 7, earnings: 980 },
  { day: "Thu", trips: 9, earnings: 1260 },
  { day: "Today", trips: 5, earnings: 650 },
];

export default function DriverEarningsScreen() {
  function handleCashOut() {
    Alert.alert(
      "Cash Out Requested 🏦",
      "₹4,850.00 will be transferred directly to your linked HDFC Bank Account ending in •••• 9102.",
      [{ text: "OK" }],
    );
  }

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings Dashboard</Text>
          <Text style={styles.subTitle}>Weekly payouts & completed incentives</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>AVAILABLE FOR CASH OUT</Text>
          <Text style={styles.balanceValue}>₹4,850.00</Text>
          <Text style={styles.balanceSub}>35 Trips completed this week</Text>

          <TouchableOpacity style={styles.cashOutBtn} onPress={handleCashOut} activeOpacity={0.8}>
            <Ionicons name="card-outline" size={16} color="#2563eb" />
            <Text style={styles.cashOutText}>Instant Cash Out to Bank</Text>
          </TouchableOpacity>
        </View>

        {/* Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.sectionTitle}>Weekly Summary Breakdown</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="bicycle" size={16} color="#2563eb" />
              <Text style={styles.rowLabel}>Base Delivery Pay</Text>
            </View>
            <Text style={styles.rowValue}>₹3,920.00</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="heart" size={16} color="#ef4444" />
              <Text style={styles.rowLabel}>Customer Tips</Text>
            </View>
            <Text style={styles.rowValue}>₹530.00</Text>
          </View>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="flash" size={16} color="#eab308" />
              <Text style={styles.rowLabel}>Peak Hour Incentives</Text>
            </View>
            <Text style={styles.rowValue}>₹400.00</Text>
          </View>
        </View>

        {/* Daily Breakdown List */}
        <View style={styles.dailySection}>
          <Text style={styles.sectionTitle}>Daily Trip Activity</Text>

          {WEEKLY_BREAKDOWN.map((item, index) => (
            <View key={index} style={styles.dailyRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dailyDay}>{item.day}</Text>
                <Text style={styles.dailySub}>{item.trips} trips</Text>
              </View>
              <Text style={styles.dailyAmount}>₹{item.earnings.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { gap: 2 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  subTitle: { fontSize: 12, color: "#64748b" },
  balanceCard: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  balanceLabel: { color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  balanceValue: { color: "#ffffff", fontSize: 32, fontWeight: "800" },
  balanceSub: { color: "#dbeafe", fontSize: 12 },
  cashOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 8,
    gap: 6,
  },
  cashOutText: { color: "#2563eb", fontWeight: "700", fontSize: 13 },
  breakdownCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowLabel: { fontSize: 13, color: "#334155" },
  rowValue: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  dailySection: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 12,
  },
  dailyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  dailyDay: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  dailySub: { fontSize: 11, color: "#64748b" },
  dailyAmount: { fontSize: 14, fontWeight: "700", color: "#16a34a" },
});

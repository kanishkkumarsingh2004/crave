import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface PayoutTransaction {
  id: string;
  payoutRef: string;
  date: string;
  amount: string;
  status: "COMPLETED" | "PROCESSING" | "SCHEDULED";
  bankAccount: string;
}

const INITIAL_PAYOUTS: PayoutTransaction[] = [
  {
    id: "p-1",
    payoutRef: "PO-99201",
    date: "Sep 28, 2026",
    amount: "₹850.00",
    status: "COMPLETED",
    bankAccount: "HDFC Bank (****4819)",
  },
  {
    id: "p-2",
    payoutRef: "PO-98744",
    date: "Sep 21, 2026",
    amount: "₹1,120.50",
    status: "COMPLETED",
    bankAccount: "HDFC Bank (****4819)",
  },
  {
    id: "p-3",
    payoutRef: "PO-97500",
    date: "Sep 14, 2026",
    amount: "₹640.25",
    status: "COMPLETED",
    bankAccount: "HDFC Bank (****4819)",
  },
  {
    id: "p-4",
    payoutRef: "PO-10023",
    date: "Oct 01, 2026",
    amount: "₹420.00",
    status: "PROCESSING",
    bankAccount: "HDFC Bank (****4819)",
  },
];

export default function VendorEarningsScreen() {
  const [payouts, setPayouts] = useState<PayoutTransaction[]>(INITIAL_PAYOUTS);
  const [availableBalance, setAvailableBalance] = useState(1248.5);
  const [pendingClearance, setPendingClearance] = useState(320.0);

  const handleRequestPayout = () => {
    if (availableBalance <= 0) {
      Alert.alert("Insufficient Balance", "You have no available funds for payout.");
      return;
    }

    Alert.alert(
      "Confirm Payout",
      `Request instant transfer of ₹${availableBalance.toFixed(2)} to HDFC Bank (****4819)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer Now",
          onPress: () => {
            const newPayout: PayoutTransaction = {
              id: `p-${Date.now()}`,
              payoutRef: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
              date: "Just now",
              amount: `₹${availableBalance.toFixed(2)}`,
              status: "PROCESSING",
              bankAccount: "HDFC Bank (****4819)",
            };
            setPayouts([newPayout, ...payouts]);
            setAvailableBalance(0);
            Alert.alert(
              "Payout Initiated!",
              "Funds will arrive in your bank account within 24 hours."
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings & Payouts</Text>
          <Text style={styles.subTitle}>Track revenue, payouts, and financial summaries</Text>
        </View>

        {/* Main Payout Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available Payout Balance</Text>
              <Text style={styles.balanceAmount}>₹{availableBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet" size={24} color="#7c3aed" />
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooterRow}>
            <View>
              <Text style={styles.subLabel}>Pending Clearance</Text>
              <Text style={styles.subVal}>₹{pendingClearance.toFixed(2)}</Text>
            </View>
            <TouchableOpacity style={styles.btnPayout} onPress={handleRequestPayout}>
              <Ionicons name="arrow-forward-circle" size={18} color="#fff" />
              <Text style={styles.btnPayoutText}>Request Payout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Financial Metrics Cards */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Ionicons name="trending-up-outline" size={20} color="#059669" />
            <Text style={styles.metricTitle}>This Week</Text>
            <Text style={styles.metricVal}>₹1,890.40</Text>
            <Text style={styles.metricSub}>+18.4% vs last week</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="pie-chart-outline" size={20} color="#2563eb" />
            <Text style={styles.metricTitle}>Lifetime Gross</Text>
            <Text style={styles.metricVal}>₹24,650.00</Text>
            <Text style={styles.metricSub}>Total order earnings</Text>
          </View>
        </View>

        {/* Payout History Section */}
        <Text style={styles.sectionTitle}>Payout History</Text>

        {payouts.map((item) => (
          <View key={item.id} style={styles.payoutCard}>
            <View style={styles.payoutMain}>
              <View style={styles.payoutIconBadge}>
                <Ionicons
                  name={item.status === "COMPLETED" ? "checkmark-circle" : "time"}
                  size={20}
                  color={item.status === "COMPLETED" ? "#16a34a" : "#d97706"}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.payoutRef}>{item.payoutRef}</Text>
                <Text style={styles.payoutBank}>{item.bankAccount}</Text>
                <Text style={styles.payoutDate}>{item.date}</Text>
              </View>

              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.payoutAmount}>{item.amount}</Text>
                <View
                  style={[
                    styles.statusBadge,
                    item.status === "COMPLETED"
                      ? styles.badgeCompleted
                      : styles.badgeProcessing,
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      item.status === "COMPLETED"
                        ? styles.badgeCompletedText
                        : styles.badgeProcessingText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  balanceCard: {
    backgroundColor: "#7c3aed",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#7c3aed",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  balanceLabel: { fontSize: 13, color: "#ddd6fe" },
  balanceAmount: { fontSize: 32, fontWeight: "800", color: "#fff", marginTop: 4 },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  balanceDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginVertical: 16,
  },
  balanceFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subLabel: { fontSize: 11, color: "#ddd6fe" },
  subVal: { fontSize: 16, fontWeight: "700", color: "#fff", marginTop: 2 },
  btnPayout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  btnPayoutText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  metricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  metricTitle: { fontSize: 12, color: "#6b7280", marginTop: 6 },
  metricVal: { fontSize: 18, fontWeight: "700", color: "#111827", marginVertical: 2 },
  metricSub: { fontSize: 11, color: "#9ca3af" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  payoutCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  payoutMain: { flexDirection: "row", alignItems: "center", gap: 12 },
  payoutIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  payoutRef: { fontSize: 14, fontWeight: "700", color: "#111827" },
  payoutBank: { fontSize: 12, color: "#4b5563", marginTop: 1 },
  payoutDate: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  payoutAmount: { fontSize: 16, fontWeight: "700", color: "#111827" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginTop: 4 },
  badgeCompleted: { backgroundColor: "#dcfce7" },
  badgeProcessing: { backgroundColor: "#fef3c7" },
  badgeText: { fontSize: 10, fontWeight: "700" },
  badgeCompletedText: { color: "#16a34a" },
  badgeProcessingText: { color: "#d97706" },
});

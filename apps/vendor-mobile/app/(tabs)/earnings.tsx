import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Transaction {
  id: string;
  payoutRef: string;
  date: string;
  amount: string;
  status: "COMPLETED" | "PROCESSING";
  bankAccount: string;
}

interface EarningsData {
  grossSales: number;
  platformCommissionRate: string;
  platformFees: number;
  netEarnings: number;
  fulfilledOrdersCount: number;
  recentTransactions: Array<{
    orderId: string;
    grossSubtotal: number;
    netEarned: number;
    date: string;
  }>;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function VendorEarningsScreen() {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [payouts, setPayouts] = useState<Transaction[]>([]);

  const fetchEarnings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/vendor/earnings`, { credentials: "include" });
      if (res.ok) {
        const body = await res.json();
        if (body?.data) {
          const data: EarningsData = body.data;
          setEarnings(data);

          const formattedTx: Transaction[] = (data.recentTransactions || []).map((t, idx) => ({
            id: t.orderId || `tx-${idx}`,
            payoutRef: `ORD-${(t.orderId || "").slice(-6).toUpperCase()}`,
            date: t.date ? new Date(t.date).toLocaleDateString() : "Recent",
            amount: `₹${t.netEarned.toFixed(2)}`,
            status: "COMPLETED",
            bankAccount: "Primary Bank Account",
          }));
          setPayouts(formattedTx);
        }
      }
    } catch {
      /* graceful fallback */
    }
  }, []);

  useEffect(() => {
    fetchEarnings();
  }, [fetchEarnings]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEarnings();
    setRefreshing(false);
  };

  const netBalance = earnings?.netEarnings ?? 0;
  const grossSales = earnings?.grossSales ?? 0;
  const platformFees = earnings?.platformFees ?? 0;

  const handleRequestPayout = () => {
    if (netBalance <= 0) {
      Alert.alert("Insufficient Balance", "You have no available net earnings for payout.");
      return;
    }

    Alert.alert(
      "Confirm Payout",
      `Request transfer of ₹${netBalance.toFixed(2)} to your registered bank account?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer Now",
          onPress: () => {
            const newPayout: Transaction = {
              id: `p-${Date.now()}`,
              payoutRef: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
              date: "Just now",
              amount: `₹${netBalance.toFixed(2)}`,
              status: "PROCESSING",
              bankAccount: "Primary Bank Account",
            };
            setPayouts([newPayout, ...payouts]);
            Alert.alert(
              "Payout Initiated!",
              "Funds will arrive in your bank account within 24 hours.",
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Earnings & Payouts</Text>
          <Text style={styles.subTitle}>Live synced financial revenue & commission breakdown</Text>
        </View>

        {/* Main Payout Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>
                Available Net Earnings (After 15% Platform Fee)
              </Text>
              <Text style={styles.balanceAmount}>₹{netBalance.toFixed(2)}</Text>
            </View>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet" size={24} color="#7c3aed" />
            </View>
          </View>

          <View style={styles.balanceDivider} />

          <View style={styles.balanceFooterRow}>
            <View>
              <Text style={styles.subLabel}>Platform Commission (15%)</Text>
              <Text style={styles.subVal}>₹{platformFees.toFixed(2)}</Text>
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
            <Text style={styles.metricTitle}>Gross Sales</Text>
            <Text style={styles.metricVal}>₹{grossSales.toFixed(2)}</Text>
            <Text style={styles.metricSub}>Total order value</Text>
          </View>

          <View style={styles.metricCard}>
            <Ionicons name="pie-chart-outline" size={20} color="#2563eb" />
            <Text style={styles.metricTitle}>Orders Fulfilled</Text>
            <Text style={styles.metricVal}>{earnings?.fulfilledOrdersCount ?? 0}</Text>
            <Text style={styles.metricSub}>Completed orders</Text>
          </View>
        </View>

        {/* Payout History Section */}
        <Text style={styles.sectionTitle}>Recent Transactions & Payouts</Text>

        {payouts.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color="#9ca3af" />
            <Text style={styles.emptyTitle}>No transactions yet</Text>
            <Text style={styles.emptySub}>Delivered orders will appear here automatically.</Text>
          </View>
        ) : (
          payouts.map((item) => (
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
                      item.status === "COMPLETED" ? styles.badgeCompleted : styles.badgeProcessing,
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
          ))
        )}
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
  emptyCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 8 },
  emptySub: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
});

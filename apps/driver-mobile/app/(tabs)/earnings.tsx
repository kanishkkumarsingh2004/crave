import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function DriverEarningsScreen() {
  const [balance, setBalance] = useState(482.5);

  const handleCashout = () => {
    if (balance <= 0) {
      Alert.alert("Zero Balance", "You have no available balance to cash out.");
      return;
    }

    Alert.alert(
      "Confirm Instant Cashout",
      `Transfer ₹${balance.toFixed(2)} to your linked debit card (Debit ****9012)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer Now (₹5.00 fee)",
          onPress: () => {
            setBalance(0);
            Alert.alert("Cashout Success!", "Funds sent instantly to your card.");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Driver Wallet & Earnings</Text>
          <Text style={styles.subTitle}>Weekly payouts, tips, and instant cashout</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Available Balance</Text>
          <Text style={styles.balanceVal}>₹{balance.toFixed(2)}</Text>

          <TouchableOpacity style={styles.btnCashout} onPress={handleCashout}>
            <Ionicons name="flash-outline" size={18} color="#2563eb" />
            <Text style={styles.btnCashoutText}>Instant Cashout</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Breakdown */}
        <Text style={styles.sectionTitle}>Weekly Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Trip Base Fares (24 trips)</Text>
            <Text style={styles.rowVal}>₹310.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Customer Tips (100% yours)</Text>
            <Text style={styles.rowVal}>₹124.50</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Quest & Surge Bonuses</Text>
            <Text style={styles.rowVal}>₹48.00</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.totalLabel}>Total Weekly Earnings</Text>
            <Text style={styles.totalVal}>₹482.50</Text>
          </View>
        </View>
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
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  balanceLabel: { fontSize: 13, color: "#bfdbfe" },
  balanceVal: { fontSize: 36, fontWeight: "800", color: "#fff", marginVertical: 6 },
  btnCashout: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    marginTop: 10,
  },
  btnCashoutText: { color: "#2563eb", fontWeight: "700", fontSize: 14 },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  rowLabel: { fontSize: 13, color: "#4b5563" },
  rowVal: { fontSize: 14, fontWeight: "600", color: "#111827" },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 8 },
  totalLabel: { fontSize: 14, fontWeight: "700", color: "#111827" },
  totalVal: { fontSize: 18, fontWeight: "800", color: "#16a34a" },
});

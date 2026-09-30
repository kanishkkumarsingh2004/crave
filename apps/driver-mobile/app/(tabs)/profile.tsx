import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDriverAuthStore } from "../../src/stores/auth.store";

export default function DriverProfileScreen() {
  const { user, signOut } = useDriverAuthStore();

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Driver Console?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => {
          signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="car-sport" size={32} color="#2563eb" />
          </View>
          <Text style={styles.driverName}>{user?.name || "Driver Partner"}</Text>
          <Text style={styles.driverEmail}>{user?.email || "driver@delivery.com"}</Text>
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={14} color="#d97706" />
            <Text style={styles.ratingText}>4.96 Rating • Verified Partner</Text>
          </View>
        </View>

        {/* Vehicle & License Section */}
        <Text style={styles.sectionTitle}>Vehicle & Documents</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="bicycle-outline" size={20} color="#2563eb" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Vehicle Type</Text>
              <Text style={styles.infoVal}>Electric Scooter (2024)</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="card-outline" size={20} color="#2563eb" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>License Plate</Text>
              <Text style={styles.infoVal}>CA 8XYZ-99</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="checkmark-done-circle-outline" size={20} color="#16a34a" />
            <View style={styles.infoText}>
              <Text style={styles.infoLabel}>Background Check</Text>
              <Text style={[styles.infoVal, { color: "#16a34a" }]}>Approved & Active</Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.btnSignOut} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.btnSignOutText}>Sign Out of Driver Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  profileCard: { backgroundColor: "#fff", padding: 20, borderRadius: 16, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: "#dbeafe", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  driverName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  driverEmail: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  ratingBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fffbeb", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, gap: 4, marginTop: 10 },
  ratingText: { fontSize: 12, fontWeight: "700", color: "#d97706" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 10 },
  infoCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#e5e7eb" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#9ca3af" },
  infoVal: { fontSize: 14, fontWeight: "600", color: "#111827", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  btnSignOut: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fca5a5", paddingVertical: 14, borderRadius: 12, gap: 8, marginBottom: 30 },
  btnSignOutText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
});

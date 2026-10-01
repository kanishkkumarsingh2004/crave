import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuthStore } from "@/stores/auth.store";

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  const customerName = user?.name || "Alice Smith";
  const customerEmail = user?.email || "customer@delivery.com";

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out of Blinkbite?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{customerName.charAt(0).toUpperCase()}</Text>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{customerName}</Text>
            <Text style={styles.userEmail}>{customerEmail}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.roleBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#16a34a" />
                <Text style={styles.roleText}>Verified Customer</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>14</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Addresses</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Cards</Text>
          </View>
        </View>

        {/* Account Menu Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Settings</Text>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#eff6ff" }]}>
              <Ionicons name="location-outline" size={18} color="#2563eb" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Saved Addresses</Text>
              <Text style={styles.menuSub}>123 Main St, Apt 4B, Mumbai</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#f0fdf4" }]}>
              <Ionicons name="card-outline" size={18} color="#16a34a" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Payment Methods</Text>
              <Text style={styles.menuSub}>Visa ending in •••• 4242</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#f5f3ff" }]}>
              <Ionicons name="notifications-outline" size={18} color="#7c3aed" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notification Preferences</Text>
              <Text style={styles.menuSub}>Order status & promo alerts</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Support & Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support & Legal</Text>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#fff7ed" }]}>
              <Ionicons name="help-circle-outline" size={18} color="#ea580c" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Blinkbite Help Center</Text>
              <Text style={styles.menuSub}>FAQs & 24/7 Support Chat</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
            <View style={[styles.menuIcon, { backgroundColor: "#f1f5f9" }]}>
              <Ionicons name="document-text-outline" size={18} color="#475569" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Terms & Privacy Policy</Text>
              <Text style={styles.menuSub}>v1.0.0 • Production Build</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Sign Out Action Button */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out of Blinkbite</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 16, paddingBottom: 40, gap: 16 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 14,
  },
  avatarCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#ffffff", fontSize: 22, fontWeight: "800" },
  userInfo: { flex: 1, gap: 2 },
  userName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  userEmail: { fontSize: 12, color: "#64748b" },
  badgeRow: { flexDirection: "row", marginTop: 4 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 14,
    justifyContent: "space-around",
    alignItems: "center",
  },
  statBox: { alignItems: "center", gap: 2 },
  statNumber: { fontSize: 18, fontWeight: "800", color: "#2563eb" },
  statLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  statDivider: { width: 1, height: 24, backgroundColor: "#e2e8f0" },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginLeft: 4 },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 12,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuContent: { flex: 1 },
  menuTitle: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  menuSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  signOutText: { color: "#ef4444", fontSize: 14, fontWeight: "700" },
});

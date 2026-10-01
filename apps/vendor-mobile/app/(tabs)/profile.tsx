import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useVendorAuthStore } from "../../src/stores/auth.store";
import { useDeviceLocation } from "../../src/hooks/useDeviceLocation";

export default function VendorProfileScreen() {
  const { user, signOut } = useVendorAuthStore();
  const { location, requestGpsPermission } = useDeviceLocation();

  const [autoAcceptOrders, setAutoAcceptOrders] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out of Vendor Portal?", [
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

  const handleUpdateStoreGps = async () => {
    await requestGpsPermission();
    Alert.alert(
      "GPS Location Saved 📍",
      `Store Latitude: ${location?.latitude ?? 12.93524}\nStore Longitude: ${location?.longitude ?? 77.6245}\n\nAddress: ${location?.address || "104 Market Street, Station Area, Koramangala 4th Block, Bengaluru"}`,
    );
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            <Ionicons name="restaurant" size={32} color="#7c3aed" />
          </View>
          <Text style={styles.storeName}>{user?.name || "Blinkbite Organics"}</Text>
          <Text style={styles.storeEmail}>{user?.email || "vendor@delivery.com"}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>Groceries & Fresh Produce</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={12} color="#d97706" />
              <Text style={styles.ratingText}>4.9 (128 reviews)</Text>
            </View>
          </View>
        </View>

        {/* Store Info Section */}
        <Text style={styles.sectionTitle}>Store Information & Database GPS</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={20} color="#7c3aed" />
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Business Name</Text>
              <Text style={styles.infoValue}>{user?.name || "Blinkbite Organics Store"}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={20} color="#7c3aed" />
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Phone Contact</Text>
              <Text style={styles.infoValue}>+91 98765 43210</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color="#7c3aed" />
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Actual Store Address</Text>
              <Text style={styles.infoValue}>
                {location?.address || "104 Market Street, Station Area, Koramangala 4th Block"}, {location?.city || "Bengaluru"}, {location?.state || "Karnataka"} - {location?.postalCode || "560034"}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="compass-outline" size={20} color="#7c3aed" />
            <View style={styles.infoTextGroup}>
              <Text style={styles.infoLabel}>Store GPS Coordinates (Lat / Lng)</Text>
              <Text style={styles.infoValue}>
                Lat: {location?.latitude.toFixed(5) ?? "12.93524"} • Lng: {location?.longitude.toFixed(5) ?? "77.62450"}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <TouchableOpacity
            style={{
              backgroundColor: "#7c3aed",
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 10,
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              marginTop: 4,
            }}
            onPress={handleUpdateStoreGps}
          >
            <Ionicons name="locate" size={18} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>
              Update Store GPS & Address from Device
            </Text>
          </TouchableOpacity>
        </View>

        {/* Store Preferences & Settings */}
        <Text style={styles.sectionTitle}>Store Preferences</Text>
        <View style={styles.infoCard}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Auto-Accept Orders</Text>
              <Text style={styles.settingSub}>Automatically accept incoming customer orders</Text>
            </View>
            <Switch
              value={autoAcceptOrders}
              onValueChange={setAutoAcceptOrders}
              trackColor={{ false: "#e5e7eb", true: "#ddd6fe" }}
              thumbColor={autoAcceptOrders ? "#7c3aed" : "#9ca3af"}
            />
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Order Push Notifications</Text>
              <Text style={styles.settingSub}>Receive instant notifications for new orders</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              trackColor={{ false: "#e5e7eb", true: "#ddd6fe" }}
              thumbColor={pushNotifications ? "#7c3aed" : "#9ca3af"}
            />
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Sound Alert Effects</Text>
              <Text style={styles.settingSub}>Play loud chime when kitchen printer prints</Text>
            </View>
            <Switch
              value={soundAlerts}
              onValueChange={setSoundAlerts}
              trackColor={{ false: "#e5e7eb", true: "#ddd6fe" }}
              thumbColor={soundAlerts ? "#7c3aed" : "#9ca3af"}
            />
          </View>
        </View>

        {/* Account Actions */}
        <TouchableOpacity style={styles.btnSignOut} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.btnSignOutText}>Sign Out of Store Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  profileHeaderCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  storeName: { fontSize: 20, fontWeight: "700", color: "#111827" },
  storeEmail: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  badgeRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: { fontSize: 11, fontWeight: "600", color: "#4b5563" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  ratingText: { fontSize: 11, fontWeight: "700", color: "#d97706" },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 10 },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoTextGroup: { flex: 1 },
  infoLabel: { fontSize: 11, color: "#9ca3af" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#111827", marginTop: 2 },
  infoDivider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 12 },
  settingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  settingTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  settingSub: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  btnSignOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 30,
  },
  btnSignOutText: { color: "#dc2626", fontWeight: "700", fontSize: 14 },
});

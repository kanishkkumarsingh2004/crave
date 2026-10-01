import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LiveOrderMap } from "../../components/LiveOrderMap";
import Constants from "expo-constants";

function getApiBaseUrl(): string {
  const host = Constants.expoConfig?.hostUri?.split(":")[0];
  if (host && host !== "localhost" && host !== "127.0.0.1") {
    return `http://${host}:3000`;
  }
  return "http://localhost:3000";
}

const API_BASE = getApiBaseUrl();

export interface OrderItem {
  id: string;
  orderNumber: string;
  vendorName: string;
  status: string;
  statusStep: number;
  itemsCount: number;
  total: number;
  otpCode: string;
  estimatedTime: string;
  driver?: {
    name: string;
    vehicle: string;
    rating: string;
    phone: string;
  };
}

const DEFAULT_ACTIVE_ORDER: OrderItem = {
  id: "ord-10004",
  orderNumber: "ORD-10004",
  vendorName: "Blinkbite Organics",
  status: "PREPARING",
  statusStep: 2,
  itemsCount: 2,
  total: 739.3,
  otpCode: "849201",
  estimatedTime: "12–15 mins",
  driver: {
    name: "Rahul Sharma",
    vehicle: "Hero Electric Bike (MH-01-AB-1234)",
    rating: "4.9 ★",
    phone: "+919876543210",
  },
};

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState<"live" | "history">("live");
  const [liveOrder, setLiveOrder] = useState<OrderItem>(DEFAULT_ACTIVE_ORDER);
  const [pastOrders, setPastOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDatabaseOrders() {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/v1/customer/orders`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            const active = json.data.find((o: any) => o.status === "PREPARING" || o.status === "OUT_FOR_DELIVERY");
            if (active) {
              setLiveOrder({
                id: active.id,
                orderNumber: active.orderNumber,
                vendorName: active.vendor?.storeName || "Blinkbite Organics",
                status: active.status,
                statusStep: active.status === "PREPARING" ? 2 : 3,
                itemsCount: active.items?.length || 2,
                total: Number(active.total),
                otpCode: "849201",
                estimatedTime: "10–12 mins",
                driver: {
                  name: "Rahul Sharma",
                  vehicle: "Hero Electric Bike (MH-01-AB-1234)",
                  rating: "4.9 ★",
                  phone: "+919876543210",
                },
              });
            }
            const history = json.data.filter((o: any) => o.status === "DELIVERED" || o.status === "CANCELLED");
            if (history.length > 0) {
              setPastOrders(
                history.map((h: any) => ({
                  id: h.id,
                  orderNumber: h.orderNumber,
                  vendorName: h.vendor?.storeName || "Blinkbite Organics",
                  date: new Date(h.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
                  status: h.status,
                  total: Number(h.total),
                  items: h.items?.map((i: any) => `${i.productName} (${i.quantity}x)`).join(", ") || "Fresh Organic Milk (2x)",
                })),
              );
            }
          }
        }
      } catch (e) {
        console.log("DB Orders fetch info:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchDatabaseOrders();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Your Orders</Text>
          <View style={styles.tabToggle}>
            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "live" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("live")}
            >
              <Text style={[styles.toggleText, activeTab === "live" && styles.toggleTextActive]}>
                Live Order (1)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, activeTab === "history" && styles.toggleBtnActive]}
              onPress={() => setActiveTab("history")}
            >
              <Text style={[styles.toggleText, activeTab === "history" && styles.toggleTextActive]}>
                History ({pastOrders.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeTab === "live" ? (
            <View style={styles.liveContainer}>
              {/* Interactive Live Map Tracking */}
              <LiveOrderMap
                driverName={liveOrder.driver?.name || "Rahul Sharma"}
                driverPhone={liveOrder.driver?.phone || "+919876543210"}
                vehicleDetails={liveOrder.driver?.vehicle || "Hero Electric Bike (MH-01-AB-1234)"}
                etaMinutes={12}
              />

              {/* Active Order Card */}
              <View style={styles.liveCard}>
                <View style={styles.liveHeader}>
                  <View>
                    <Text style={styles.orderNum}>{liveOrder.orderNumber}</Text>
                    <Text style={styles.vendorName}>{liveOrder.vendorName}</Text>
                  </View>
                  <View style={styles.etaBadge}>
                    <Ionicons name="time" size={14} color="#2563eb" />
                    <Text style={styles.etaText}>ETA {liveOrder.estimatedTime}</Text>
                  </View>
                </View>

                {/* OTP Verification Badge */}
                <View style={styles.otpBanner}>
                  <View style={styles.otpLeft}>
                    <Ionicons name="key" size={18} color="#15803d" />
                    <View>
                      <Text style={styles.otpLabel}>Handover Delivery OTP</Text>
                      <Text style={styles.otpSub}>Show code to driver at delivery</Text>
                    </View>
                  </View>
                  <View style={styles.otpCodeBox}>
                    <Text style={styles.otpCode}>{liveOrder.otpCode}</Text>
                  </View>
                </View>

                {/* Stepper Progress Bar */}
                <Text style={styles.stepperTitle}>Order Status</Text>
                <View style={styles.stepperContainer}>
                  {/* Step 1 */}
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, styles.stepDone]}>
                      <Ionicons name="checkmark" size={14} color="#ffffff" />
                    </View>
                    <Text style={styles.stepText}>Confirmed</Text>
                  </View>
                  <View style={[styles.stepLine, styles.stepLineActive]} />

                  {/* Step 2 */}
                  <View style={styles.stepItem}>
                    <View style={[styles.stepCircle, styles.stepActive]}>
                      <Ionicons name="restaurant-outline" size={14} color="#ffffff" />
                    </View>
                    <Text style={[styles.stepText, styles.stepTextActive]}>Preparing</Text>
                  </View>
                  <View style={styles.stepLine} />

                  {/* Step 3 */}
                  <View style={styles.stepItem}>
                    <View style={styles.stepCircle}>
                      <Ionicons name="bicycle-outline" size={14} color="#94a3b8" />
                    </View>
                    <Text style={styles.stepText}>On the Way</Text>
                  </View>
                  <View style={styles.stepLine} />

                  {/* Step 4 */}
                  <View style={styles.stepItem}>
                    <View style={styles.stepCircle}>
                      <Ionicons name="home-outline" size={14} color="#94a3b8" />
                    </View>
                    <Text style={styles.stepText}>Delivered</Text>
                  </View>
                </View>

                {/* Driver Info Card */}
                <View style={styles.driverBox}>
                  <View style={styles.driverAvatar}>
                    <Ionicons name="person" size={20} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.driverName}>{liveOrder.driver?.name || "Rahul Sharma"}</Text>
                    <Text style={styles.driverVehicle}>{liveOrder.driver?.vehicle || "Hero Electric Bike"}</Text>
                  </View>
                  <TouchableOpacity style={styles.callBtn} activeOpacity={0.8}>
                    <Ionicons name="call" size={16} color="#ffffff" />
                    <Text style={styles.callText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.historyContainer}>
              {(pastOrders.length > 0
                ? pastOrders
                : [
                    {
                      id: "ord-10001",
                      orderNumber: "ORD-10001",
                      vendorName: "Blinkbite Organics",
                      date: "1 Oct 2026",
                      status: "DELIVERED",
                      total: 633.1,
                      items: "Fresh Organic Milk (2x), Whole Wheat Bread (1x)",
                    },
                    {
                      id: "ord-10002",
                      orderNumber: "ORD-10002",
                      vendorName: "Blinkbite Organics",
                      date: "28 Sep 2026",
                      status: "DELIVERED",
                      total: 1217.2,
                      items: "Farm Eggs Pack of 12 (2x), Shimla Apples 1kg (1x)",
                    },
                  ]
              ).map((order) => (
                <View key={order.id} style={styles.historyCard}>
                  <View style={styles.historyHeader}>
                    <View>
                      <Text style={styles.orderNum}>{order.orderNumber}</Text>
                      <Text style={styles.vendorName}>{order.vendorName}</Text>
                    </View>
                    <View style={styles.deliveredBadge}>
                      <Ionicons name="checkmark-circle" size={14} color="#16a34a" />
                      <Text style={styles.deliveredText}>{order.status}</Text>
                    </View>
                  </View>

                  <Text style={styles.historyItems}>{order.items}</Text>

                  <View style={styles.historyFooter}>
                    <Text style={styles.historyPrice}>Total: ₹{order.total.toFixed(2)}</Text>
                    <TouchableOpacity style={styles.reorderBtn}>
                      <Text style={styles.reorderText}>Reorder</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1 },
  header: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 12,
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  tabToggle: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  toggleTextActive: { color: "#2563eb" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  liveContainer: { gap: 16 },
  liveCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 16,
    gap: 16,
  },
  liveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNum: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  vendorName: { fontSize: 13, color: "#64748b", marginTop: 2 },
  etaBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  etaText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  otpBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 12,
    borderRadius: 12,
  },
  otpLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  otpLabel: { fontSize: 13, fontWeight: "700", color: "#166534" },
  otpSub: { fontSize: 10, color: "#15803d" },
  otpCodeBox: {
    backgroundColor: "#166534",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  otpCode: { color: "#ffffff", fontSize: 14, fontWeight: "800", letterSpacing: 2 },
  stepperTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: { alignItems: "center", gap: 4 },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  stepDone: { backgroundColor: "#16a34a" },
  stepActive: { backgroundColor: "#2563eb" },
  stepLine: { flex: 1, height: 2, backgroundColor: "#e2e8f0", marginHorizontal: 2 },
  stepLineActive: { backgroundColor: "#16a34a" },
  stepText: { fontSize: 10, fontWeight: "600", color: "#64748b" },
  stepTextActive: { color: "#2563eb", fontWeight: "700" },
  driverBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  driverName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  driverVehicle: { fontSize: 11, color: "#64748b" },
  callBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  callText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  historyContainer: { gap: 12 },
  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 10,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  historyNum: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  historyVendor: { fontSize: 12, color: "#64748b", marginTop: 2 },
  deliveredBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveredText: { fontSize: 11, fontWeight: "700", color: "#166534" },
  historyItems: { fontSize: 12, color: "#334155" },
  historyFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  historyPrice: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  reorderBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  reorderText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
});

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useVendorAuthStore } from "../../src/stores/auth.store";

interface QuickStat {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface ActiveOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  itemsCount: number;
  totalAmount: string;
  status: "PENDING" | "PREPARING" | "READY";
  timeAgo: string;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export default function VendorDashboardScreen() {
  const router = useRouter();
  const user = useVendorAuthStore((state) => state.user);
  const [isStoreOnline, setIsStoreOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<{
    todayRevenue: number;
    todayTotalOrders: number;
    pendingOrders: number;
    preparingOrders: number;
    readyOrders: number;
    completedOrders: number;
    activeProducts: number;
    lowStockAlerts: number;
  } | null>(null);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [dashRes, ordersRes] = await Promise.all([
        fetch(`${API_BASE}/api/v1/vendor/dashboard`, { credentials: "include" }),
        fetch(`${API_BASE}/api/v1/vendor/orders?limit=10`, { credentials: "include" }),
      ]);

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        if (dashData?.data?.metrics) {
          setMetrics(dashData.data.metrics);
          setIsStoreOnline(Boolean(dashData.data.isOpen));
        }
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        if (ordersData?.data?.orders) {
          const rawOrders = ordersData.data.orders as any[];
          const formatted: ActiveOrder[] = rawOrders
            .filter((o) =>
              ["PENDING", "CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(o.status),
            )
            .map((o) => ({
              id: o.id,
              orderNumber: `#${(o.orderNumber || o.id).slice(-8).toUpperCase()}`,
              customerName: o.deliveryRecipientName || "Customer",
              itemsCount: o.items?.length || 1,
              totalAmount: `₹${Number(o.total || 0).toFixed(2)}`,
              status:
                o.status === "CONFIRMED"
                  ? "PENDING"
                  : o.status === "READY_FOR_PICKUP"
                    ? "READY"
                    : o.status,
              timeAgo: o.createdAt
                ? new Date(o.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Recently",
            }));
          setActiveOrders(formatted);
        }
      }
    } catch {
      /* graceful fallback */
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleStore = async (val: boolean) => {
    setIsStoreOnline(val);
    try {
      await fetch(`${API_BASE}/api/v1/vendor/store/toggle-open`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isOpen: val }),
      });
    } catch {
      /* ignore */
    }
  };

  const stats: QuickStat[] = [
    {
      id: "1",
      title: "Today's Revenue",
      value: `₹${(metrics?.todayRevenue ?? 0).toFixed(2)}`,
      change: `${metrics?.todayTotalOrders ?? 0} orders`,
      isPositive: true,
      icon: "wallet-outline",
      color: "#7c3aed",
    },
    {
      id: "2",
      title: "Active Orders",
      value: String(activeOrders.length),
      change: `${metrics?.pendingOrders ?? 0} pending`,
      isPositive: true,
      icon: "receipt-outline",
      color: "#2563eb",
    },
    {
      id: "3",
      title: "Completed Today",
      value: String(metrics?.completedOrders ?? 0),
      change: "Delivered",
      isPositive: true,
      icon: "checkmark-done-circle-outline",
      color: "#059669",
    },
    {
      id: "4",
      title: "Active Products",
      value: String(metrics?.activeProducts ?? 0),
      change: `${metrics?.lowStockAlerts ?? 0} low stock`,
      isPositive: true,
      icon: "cube-outline",
      color: "#d97706",
    },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  };

  const handleOrderStatusChange = async (
    orderId: string,
    nextStatus: "PREPARING" | "READY" | "COMPLETED",
  ) => {
    try {
      const endpoint =
        nextStatus === "PREPARING"
          ? `/api/v1/vendor/orders/${orderId}/start-preparation`
          : nextStatus === "READY"
            ? `/api/v1/vendor/orders/${orderId}/ready`
            : null;

      if (endpoint) {
        await fetch(`${API_BASE}${endpoint}`, {
          method: "POST",
          credentials: "include",
        });
      }
      await fetchDashboardData();
      Alert.alert("Status Updated", `Order updated successfully.`);
    } catch {
      Alert.alert("Error", "Could not update order status.");
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Top Header Banner */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back 👋</Text>
            <Text style={styles.storeName}>{user?.name || "Gourmet Kitchen"}</Text>
          </View>
          <View style={styles.statusToggleContainer}>
            <Text style={[styles.statusText, { color: isStoreOnline ? "#16a34a" : "#dc2626" }]}>
              {isStoreOnline ? "ONLINE" : "OFFLINE"}
            </Text>
            <Switch
              value={isStoreOnline}
              onValueChange={setIsStoreOnline}
              trackColor={{ false: "#fca5a5", true: "#bbf7d0" }}
              thumbColor={isStoreOnline ? "#16a34a" : "#dc2626"}
            />
          </View>
        </View>

        {/* Store Status Indicator Banner */}
        <View style={[styles.banner, { backgroundColor: isStoreOnline ? "#f0fdf4" : "#fef2f2" }]}>
          <Ionicons
            name={isStoreOnline ? "radio-button-on-outline" : "pause-circle-outline"}
            size={20}
            color={isStoreOnline ? "#16a34a" : "#dc2626"}
          />
          <Text style={[styles.bannerText, { color: isStoreOnline ? "#15803d" : "#b91c1c" }]}>
            {isStoreOnline
              ? "Store is open — Accepting new customer orders"
              : "Store is paused — New incoming orders are on hold"}
          </Text>
        </View>

        {/* Quick Stats Grid */}
        <Text style={styles.sectionTitle}>Overview</Text>
        <View style={styles.statsGrid}>
          {stats.map((stat) => (
            <View key={stat.id} style={styles.statCard}>
              <View style={styles.statHeaderRow}>
                <View style={[styles.statIconBadge, { backgroundColor: `${stat.color}15` }]}>
                  <Ionicons name={stat.icon} size={18} color={stat.color} />
                </View>
                <Text style={styles.statTitle} numberOfLines={1}>
                  {stat.title}
                </Text>
              </View>
              <View style={styles.statValueRow}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text
                  style={[styles.statChange, { color: stat.isPositive ? "#059669" : "#dc2626" }]}
                >
                  {stat.change}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Live Active Orders */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Orders ({activeOrders.length})</Text>
          <TouchableOpacity onPress={() => router.push("/orders")}>
            <Text style={styles.seeAllText}>View All →</Text>
          </TouchableOpacity>
        </View>

        {activeOrders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySub}>No pending orders right now.</Text>
          </View>
        ) : (
          activeOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                  <Text style={styles.customerName}>{order.customerName}</Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    order.status === "PENDING"
                      ? styles.badgePending
                      : order.status === "PREPARING"
                        ? styles.badgePreparing
                        : styles.badgeReady,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      order.status === "PENDING"
                        ? styles.badgePendingText
                        : order.status === "PREPARING"
                          ? styles.badgePreparingText
                          : styles.badgeReadyText,
                    ]}
                  >
                    {order.status}
                  </Text>
                </View>
              </View>

              <View style={styles.orderDetailsRow}>
                <Text style={styles.orderDetailText}>
                  {order.itemsCount} items • {order.totalAmount}
                </Text>
                <Text style={styles.orderTimeText}>{order.timeAgo}</Text>
              </View>

              <View style={styles.orderActionsRow}>
                {order.status === "PENDING" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnAccept]}
                    onPress={() => handleOrderStatusChange(order.id, "PREPARING")}
                  >
                    <Ionicons name="play-outline" size={16} color="#fff" />
                    <Text style={styles.btnAcceptText}>Accept & Prepare</Text>
                  </TouchableOpacity>
                )}

                {order.status === "PREPARING" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnReady]}
                    onPress={() => handleOrderStatusChange(order.id, "READY")}
                  >
                    <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                    <Text style={styles.btnReadyText}>Mark as Ready</Text>
                  </TouchableOpacity>
                )}

                {order.status === "READY" && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.btnComplete]}
                    onPress={() => handleOrderStatusChange(order.id, "COMPLETED")}
                  >
                    <Ionicons name="bag-check-outline" size={16} color="#fff" />
                    <Text style={styles.btnCompleteText}>Hand to Courier</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))
        )}

        {/* Quick Action Navigation Buttons */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push("/products")}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#ede9fe" }]}>
              <Ionicons name="add-circle-outline" size={24} color="#7c3aed" />
            </View>
            <Text style={styles.quickActionText}>Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionCard}
            onPress={() => router.push("/inventory")}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: "#dbeafe" }]}>
              <Ionicons name="cube-outline" size={24} color="#2563eb" />
            </View>
            <Text style={styles.quickActionText}>Inventory</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push("/earnings")}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#dcfce7" }]}>
              <Ionicons name="trending-up-outline" size={24} color="#16a34a" />
            </View>
            <Text style={styles.quickActionText}>Earnings</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => router.push("/profile")}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#fef3c7" }]}>
              <Ionicons name="settings-outline" size={24} color="#d97706" />
            </View>
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  greeting: { fontSize: 13, color: "#6b7280" },
  storeName: { fontSize: 22, fontWeight: "700", color: "#111827" },
  statusToggleContainer: { alignItems: "flex-end" },
  statusText: { fontSize: 11, fontWeight: "700", marginBottom: 2 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    gap: 8,
  },
  bannerText: { fontSize: 13, fontWeight: "500", flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: "#111827", marginBottom: 12 },
  seeAllText: { fontSize: 13, fontWeight: "600", color: "#7c3aed" },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f3f4f6",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    flex: 1,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
  },
  statValue: { fontSize: 18, fontWeight: "700", color: "#111827" },
  statChange: { fontSize: 11, fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#fff",
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151", marginTop: 8 },
  emptySub: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderNumber: { fontSize: 15, fontWeight: "700", color: "#111827" },
  customerName: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgePending: { backgroundColor: "#fef3c7" },
  badgePreparing: { backgroundColor: "#dbeafe" },
  badgeReady: { backgroundColor: "#dcfce7" },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  badgePendingText: { color: "#d97706" },
  badgePreparingText: { color: "#2563eb" },
  badgeReadyText: { color: "#16a34a" },
  orderDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  orderDetailText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  orderTimeText: { fontSize: 12, color: "#9ca3af" },
  orderActionsRow: { marginTop: 12 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  btnAccept: { backgroundColor: "#7c3aed" },
  btnAcceptText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  btnReady: { backgroundColor: "#2563eb" },
  btnReadyText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  btnComplete: { backgroundColor: "#16a34a" },
  btnCompleteText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  quickActionCard: {
    width: "23%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionText: { fontSize: 11, fontWeight: "600", color: "#374151" },
});

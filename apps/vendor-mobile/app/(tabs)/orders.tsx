import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type OrderStatus = "ALL" | "PENDING" | "PREPARING" | "READY" | "DELIVERED" | "CANCELLED";

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  items: OrderItem[];
  totalAmount: string;
  paymentMethod: "CARD" | "CASH" | "UPI";
  status: Exclude<OrderStatus, "ALL">;
  createdAt: string;
}

const INITIAL_ORDERS: Order[] = [
  {
    id: "ord-1",
    orderNumber: "#ORD-8901",
    customerName: "Michael Scott",
    customerPhone: "+1 (555) 234-5678",
    deliveryAddress: "1725 Slough Avenue, Suite 100",
    items: [
      { name: "Chicken Alfredo Pasta", quantity: 2, price: "₹32.00" },
      { name: "Garlic Bread with Cheese", quantity: 1, price: "₹6.50" },
    ],
    totalAmount: "₹38.50",
    paymentMethod: "CARD",
    status: "PENDING",
    createdAt: "5 mins ago",
  },
  {
    id: "ord-2",
    orderNumber: "#ORD-8898",
    customerName: "Pam Beesly",
    customerPhone: "+1 (555) 345-6789",
    deliveryAddress: "420 Dunder St, Apt 4B",
    items: [
      { name: "Veggie Supreme Pizza (Large)", quantity: 1, price: "₹22.00" },
      { name: "Iced Lemon Tea", quantity: 2, price: "₹8.00" },
    ],
    totalAmount: "₹30.00",
    paymentMethod: "UPI",
    status: "PREPARING",
    createdAt: "18 mins ago",
  },
  {
    id: "ord-3",
    orderNumber: "#ORD-8894",
    customerName: "Jim Halpert",
    customerPhone: "+1 (555) 456-7890",
    deliveryAddress: "88 Paper Rd, Bldg 2",
    items: [
      { name: "Double Bacon Cheeseburger", quantity: 2, price: "₹26.00" },
      { name: "French Fries (Large)", quantity: 2, price: "₹9.00" },
      { name: "Chocolate Milkshake", quantity: 2, price: "₹10.00" },
    ],
    totalAmount: "₹45.00",
    paymentMethod: "CARD",
    status: "READY",
    createdAt: "32 mins ago",
  },
  {
    id: "ord-4",
    orderNumber: "#ORD-8880",
    customerName: "Dwight Schrute",
    customerPhone: "+1 (555) 567-8901",
    deliveryAddress: "Schrute Farms, Beet Farm Rd",
    items: [{ name: "Organic Beet Salad Bowl", quantity: 3, price: "₹36.00" }],
    totalAmount: "₹36.00",
    paymentMethod: "CASH",
    status: "DELIVERED",
    createdAt: "1 hour ago",
  },
  {
    id: "ord-5",
    orderNumber: "#ORD-8875",
    customerName: "Stanley Hudson",
    customerPhone: "+1 (555) 678-9012",
    deliveryAddress: "900 Corporate Blvd",
    items: [{ name: "Pretzel with Cinnamon Sugar", quantity: 4, price: "₹20.00" }],
    totalAmount: "₹20.00",
    paymentMethod: "CARD",
    status: "CANCELLED",
    createdAt: "2 hours ago",
  },
];

export default function VendorOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const filterTabs: { key: OrderStatus; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "PENDING", label: "Pending" },
    { key: "PREPARING", label: "Preparing" },
    { key: "READY", label: "Ready" },
    { key: "DELIVERED", label: "Delivered" },
    { key: "CANCELLED", label: "Cancelled" },
  ];

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const updateOrderStatus = (orderId: string, nextStatus: Exclude<OrderStatus, "ALL">) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: nextStatus } : ord))
    );
    Alert.alert("Order Updated", `Order moved to status: ${nextStatus}`);
  };

  const handleCancelOrder = (orderId: string) => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: () => updateOrderStatus(orderId, "CANCELLED"),
      },
    ]);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = selectedStatus === "ALL" || order.status === selectedStatus;
    const matchesQuery =
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesQuery;
  });

  const getStatusBadgeStyle = (status: Exclude<OrderStatus, "ALL">) => {
    switch (status) {
      case "PENDING":
        return { bg: "#fef3c7", text: "#d97706" };
      case "PREPARING":
        return { bg: "#dbeafe", text: "#2563eb" };
      case "READY":
        return { bg: "#dcfce7", text: "#16a34a" };
      case "DELIVERED":
        return { bg: "#f3f4f6", text: "#4b5563" };
      case "CANCELLED":
        return { bg: "#fee2e2", text: "#dc2626" };
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Order Management</Text>
        <Text style={styles.subTitle}>Track and update incoming store orders</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by order # or customer name..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle-outline" size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterTabs}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => {
            const count =
              item.key === "ALL"
                ? orders.length
                : orders.filter((o) => o.status === item.key).length;
            const isSelected = selectedStatus === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabChip, isSelected && styles.tabChipActive]}
                onPress={() => setSelectedStatus(item.key)}
              >
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextActive]}>
                  {item.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.tabsContainer}
        />
      </View>

      {/* Order Cards List */}
      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptySub}>No orders match your filter criteria.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const badge = getStatusBadgeStyle(item.status);
          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.orderNo}>{item.orderNumber}</Text>
                  <Text style={styles.timeText}>{item.createdAt}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.badgeText, { color: badge.text }]}>{item.status}</Text>
                </View>
              </View>

              {/* Customer Info */}
              <View style={styles.customerRow}>
                <Ionicons name="person-circle-outline" size={22} color="#4b5563" />
                <View style={styles.customerDetails}>
                  <Text style={styles.customerName}>{item.customerName}</Text>
                  <Text style={styles.customerPhone}>{item.customerPhone}</Text>
                </View>
              </View>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={16} color="#6b7280" />
                <Text style={styles.addressText} numberOfLines={1}>
                  {item.deliveryAddress}
                </Text>
              </View>

              {/* Items Summary */}
              <View style={styles.itemsBox}>
                <Text style={styles.itemsHeader}>Items ({item.items.length})</Text>
                {item.items.map((sub, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemName}>
                      {sub.quantity}x {sub.name}
                    </Text>
                    <Text style={styles.itemPrice}>{sub.price}</Text>
                  </View>
                ))}
              </View>

              {/* Card Footer */}
              <View style={styles.cardFooter}>
                <View>
                  <Text style={styles.totalLabel}>Total Payment ({item.paymentMethod})</Text>
                  <Text style={styles.totalVal}>{item.totalAmount}</Text>
                </View>

                {/* Workflow Actions */}
                <View style={styles.actionsGroup}>
                  {item.status === "PENDING" && (
                    <>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnReject]}
                        onPress={() => handleCancelOrder(item.id)}
                      >
                        <Text style={styles.btnRejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btnAction, styles.btnAccept]}
                        onPress={() => updateOrderStatus(item.id, "PREPARING")}
                      >
                        <Text style={styles.btnAcceptText}>Accept</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {item.status === "PREPARING" && (
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnReady]}
                      onPress={() => updateOrderStatus(item.id, "READY")}
                    >
                      <Text style={styles.btnReadyText}>Mark Ready</Text>
                    </TouchableOpacity>
                  )}

                  {item.status === "READY" && (
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnDeliver]}
                      onPress={() => updateOrderStatus(item.id, "DELIVERED")}
                    >
                      <Text style={styles.btnDeliverText}>Dispatched</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  tabsWrapper: { marginBottom: 12 },
  tabsContainer: { paddingHorizontal: 16, gap: 8 },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  tabChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  tabChipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  tabChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#4b5563", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  orderNo: { fontSize: 16, fontWeight: "700", color: "#111827" },
  timeText: { fontSize: 12, color: "#9ca3af", marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: "700" },
  customerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  customerDetails: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  customerPhone: { fontSize: 12, color: "#6b7280" },
  addressRow: { flexDirection: "row", alignItems: "center", marginTop: 6, gap: 4 },
  addressText: { fontSize: 12, color: "#6b7280", flex: 1 },
  itemsBox: {
    backgroundColor: "#f9fafb",
    padding: 10,
    borderRadius: 8,
    marginVertical: 12,
  },
  itemsHeader: { fontSize: 12, fontWeight: "700", color: "#6b7280", marginBottom: 6 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 2 },
  itemName: { fontSize: 13, color: "#374151" },
  itemPrice: { fontSize: 13, fontWeight: "600", color: "#111827" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  totalLabel: { fontSize: 11, color: "#6b7280" },
  totalVal: { fontSize: 18, fontWeight: "700", color: "#7c3aed" },
  actionsGroup: { flexDirection: "row", gap: 8 },
  btnAction: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  btnReject: { backgroundColor: "#fee2e2" },
  btnRejectText: { color: "#dc2626", fontWeight: "600", fontSize: 12 },
  btnAccept: { backgroundColor: "#7c3aed" },
  btnAcceptText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  btnReady: { backgroundColor: "#2563eb" },
  btnReadyText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  btnDeliver: { backgroundColor: "#16a34a" },
  btnDeliverText: { color: "#fff", fontWeight: "600", fontSize: 12 },
});

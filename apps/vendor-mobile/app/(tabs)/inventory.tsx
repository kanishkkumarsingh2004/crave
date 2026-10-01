import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type InventoryFilter = "ALL" | "LOW_STOCK" | "OUT_OF_STOCK";

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  stockCount: number;
  minThreshold: number;
  unit: string;
  lastUpdated: string;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1",
    sku: "SKU-BURGER-01",
    name: "Angus Beef Patties (8oz)",
    category: "Meat & Poultry",
    stockCount: 45,
    minThreshold: 15,
    unit: "patties",
    lastUpdated: "Today, 10:15 AM",
  },
  {
    id: "inv-2",
    sku: "SKU-BUN-02",
    name: "Brioche Burger Buns",
    category: "Bakery",
    stockCount: 8,
    minThreshold: 20,
    unit: "packs",
    lastUpdated: "Today, 08:30 AM",
  },
  {
    id: "inv-3",
    sku: "SKU-CHEESE-03",
    name: "Aged Cheddar Slices",
    category: "Dairy",
    stockCount: 0,
    minThreshold: 10,
    unit: "blocks",
    lastUpdated: "Yesterday",
  },
  {
    id: "inv-4",
    sku: "SKU-FRIES-04",
    name: "Frozen Idaho Cut Fries",
    category: "Frozen",
    stockCount: 120,
    minThreshold: 30,
    unit: "bags",
    lastUpdated: "2 days ago",
  },
  {
    id: "inv-5",
    sku: "SKU-SAUCE-05",
    name: "Truffle Aioli Sauce",
    category: "Condiments",
    stockCount: 5,
    minThreshold: 12,
    unit: "bottles",
    lastUpdated: "Today, 11:00 AM",
  },
];

export default function VendorInventoryScreen() {
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [selectedFilter, setSelectedFilter] = useState<InventoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const updateQuantity = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const newQty = Math.max(0, item.stockCount + delta);
          return {
            ...item,
            stockCount: newQty,
            lastUpdated: "Just now",
          };
        }
        return item;
      }),
    );
  };

  const lowStockCount = inventory.filter(
    (i) => i.stockCount > 0 && i.stockCount <= i.minThreshold,
  ).length;
  const outOfStockCount = inventory.filter((i) => i.stockCount === 0).length;

  const filteredInventory = inventory.filter((item) => {
    const matchesQuery =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesQuery) return false;

    if (selectedFilter === "LOW_STOCK") {
      return item.stockCount > 0 && item.stockCount <= item.minThreshold;
    }
    if (selectedFilter === "OUT_OF_STOCK") {
      return item.stockCount === 0;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Control</Text>
        <Text style={styles.subTitle}>Monitor stock levels, SKUs, and reorder alerts</Text>
      </View>

      {/* Stock Summary Banner */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{inventory.length}</Text>
          <Text style={styles.summaryLabel}>Total SKUs</Text>
        </View>

        <TouchableOpacity
          style={[styles.summaryCard, styles.summaryCardWarning]}
          onPress={() => setSelectedFilter("LOW_STOCK")}
        >
          <Text style={[styles.summaryValue, { color: "#d97706" }]}>{lowStockCount}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.summaryCard, styles.summaryCardDanger]}
          onPress={() => setSelectedFilter("OUT_OF_STOCK")}
        >
          <Text style={[styles.summaryValue, { color: "#dc2626" }]}>{outOfStockCount}</Text>
          <Text style={styles.summaryLabel}>Out of Stock</Text>
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by ingredient name or SKU..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "ALL" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("ALL")}
        >
          <Text
            style={[styles.filterChipText, selectedFilter === "ALL" && styles.filterChipTextActive]}
          >
            All Items
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "LOW_STOCK" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("LOW_STOCK")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === "LOW_STOCK" && styles.filterChipTextActive,
            ]}
          >
            Low Stock ({lowStockCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterChip, selectedFilter === "OUT_OF_STOCK" && styles.filterChipActive]}
          onPress={() => setSelectedFilter("OUT_OF_STOCK")}
        >
          <Text
            style={[
              styles.filterChipText,
              selectedFilter === "OUT_OF_STOCK" && styles.filterChipTextActive,
            ]}
          >
            Out of Stock ({outOfStockCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inventory List */}
      <FlatList
        data={filteredInventory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="archive-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Stock Items Found</Text>
            <Text style={styles.emptySub}>All ingredients match good healthy stock levels.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isOut = item.stockCount === 0;
          const isLow = !isOut && item.stockCount <= item.minThreshold;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.skuText}>
                    {item.sku} • {item.category}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    isOut ? styles.badgeOut : isLow ? styles.badgeLow : styles.badgeGood,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      isOut
                        ? styles.badgeOutText
                        : isLow
                          ? styles.badgeLowText
                          : styles.badgeGoodText,
                    ]}
                  >
                    {isOut ? "OUT OF STOCK" : isLow ? "LOW STOCK" : "IN STOCK"}
                  </Text>
                </View>
              </View>

              <View style={styles.cardBody}>
                <View>
                  <Text style={styles.thresholdText}>
                    Min Threshold: {item.minThreshold} {item.unit}
                  </Text>
                  <Text style={styles.updatedText}>Updated: {item.lastUpdated}</Text>
                </View>

                {/* Stock Controls (+ / - buttons) */}
                <View style={styles.qtyControlRow}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, -1)}
                  >
                    <Ionicons name="remove" size={18} color="#374151" />
                  </TouchableOpacity>

                  <Text style={styles.qtyText}>
                    {item.stockCount} <Text style={styles.unitText}>{item.unit}</Text>
                  </Text>

                  <TouchableOpacity
                    style={[styles.qtyBtn, styles.qtyBtnAdd]}
                    onPress={() => updateQuantity(item.id, 1)}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
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
  summaryContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginVertical: 12,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  summaryCardWarning: { backgroundColor: "#fffbeb", borderColor: "#fef3c7" },
  summaryCardDanger: { backgroundColor: "#fef2f2", borderColor: "#fee2e2" },
  summaryValue: { fontSize: 20, fontWeight: "700", color: "#111827" },
  summaryLabel: { fontSize: 11, fontWeight: "600", color: "#6b7280", marginTop: 2 },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: "#111827" },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  filterChipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  filterChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#4b5563", marginTop: 12 },
  emptySub: { fontSize: 13, color: "#9ca3af", marginTop: 4 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  itemName: { fontSize: 15, fontWeight: "700", color: "#111827" },
  skuText: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeOut: { backgroundColor: "#fee2e2" },
  badgeLow: { backgroundColor: "#fef3c7" },
  badgeGood: { backgroundColor: "#dcfce7" },
  statusBadgeText: { fontSize: 10, fontWeight: "700" },
  badgeOutText: { color: "#dc2626" },
  badgeLowText: { color: "#d97706" },
  badgeGoodText: { color: "#16a34a" },
  cardBody: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  thresholdText: { fontSize: 12, color: "#4b5563" },
  updatedText: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  qtyControlRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  qtyBtnAdd: { backgroundColor: "#7c3aed" },
  qtyText: { fontSize: 15, fontWeight: "700", color: "#111827", minWidth: 50, textAlign: "center" },
  unitText: { fontSize: 11, fontWeight: "400", color: "#6b7280" },
});

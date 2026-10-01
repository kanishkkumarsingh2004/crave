import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/stores/cart.store";

const SEARCH_CATEGORIES = [
  {
    id: "groceries",
    name: "Groceries & Milk",
    count: "450+ items",
    icon: "basket",
    color: "#2563eb",
    bg: "#eff6ff",
  },
  {
    id: "food",
    name: "Hot Meals",
    count: "320+ items",
    icon: "restaurant",
    color: "#ea580c",
    bg: "#fff7ed",
  },
  {
    id: "bakery",
    name: "Bakery & Desserts",
    count: "180+ items",
    icon: "pizza",
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    id: "electronics",
    name: "Electronics & Cable",
    count: "90+ items",
    icon: "hardware-chip",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    id: "health",
    name: "Pharmacy & Care",
    count: "210+ items",
    icon: "medkit",
    color: "#16a34a",
    bg: "#f0fdf4",
  },
  {
    id: "drinks",
    name: "Cold Beverages",
    count: "150+ items",
    icon: "beer",
    color: "#0284c7",
    bg: "#f0f9ff",
  },
];

const ALL_SEARCH_ITEMS = [
  {
    id: "prod-1",
    name: "Fresh Organic Milk 1L",
    price: 65,
    vendorId: "v-1",
    vendorName: "FreshMart Organics",
    category: "Groceries & Milk",
    sku: "MILK-001",
  },
  {
    id: "prod-2",
    name: "Artisanal Whole Wheat Bread",
    price: 45,
    vendorId: "v-1",
    vendorName: "FreshMart Organics",
    category: "Bakery & Desserts",
    sku: "BREAD-001",
  },
  {
    id: "prod-3",
    name: "Paneer Tikka Roll",
    price: 180,
    vendorId: "v-2",
    vendorName: "Urban Spice Kitchen",
    category: "Hot Meals",
    sku: "ROLL-001",
  },
  {
    id: "prod-4",
    name: "Cold Pressed Orange Juice",
    price: 120,
    vendorId: "v-2",
    vendorName: "JuiceHub Corner",
    category: "Cold Beverages",
    sku: "JUICE-500",
  },
  {
    id: "prod-5",
    name: "Fast Charging Type-C Cable",
    price: 299,
    vendorId: "v-3",
    vendorName: "TechGear Store",
    category: "Electronics & Cable",
    sku: "CABLE-001",
  },
];

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const addItem = useCartStore((state) => state.addItem);

  const filteredItems = ALL_SEARCH_ITEMS.filter((item) => {
    const matchesQuery =
      query.trim() === "" ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.vendorName.toLowerCase().includes(query.toLowerCase());

    const matchesCat = !selectedCat || item.category === selectedCat;
    return matchesQuery && matchesCat;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Search Bar Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Explore Catalog</Text>
          <View style={styles.inputBox}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.input}
              placeholder="Search products, groceries, stores..."
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery("")}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Categories Grid */}
          <Text style={styles.sectionTitle}>Explore Categories</Text>
          <View style={styles.categoryGrid}>
            {SEARCH_CATEGORIES.map((cat) => {
              const isSelected = selectedCat === cat.name;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: cat.bg },
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCat(isSelected ? null : cat.name)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: "#ffffff" }]}>
                    <Ionicons name={cat.icon as any} size={20} color={cat.color} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catCount}>{cat.count}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Results */}
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCat ? `${selectedCat}` : "All Items"} ({filteredItems.length})
            </Text>
            {selectedCat && (
              <TouchableOpacity onPress={() => setSelectedCat(null)}>
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No matching products found</Text>
              <Text style={styles.emptySub}>
                Try searching for &quot;Milk&quot;, &quot;Bread&quot;, or clearing active category
                filters.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  <Ionicons name="cube-outline" size={24} color="#2563eb" />
                </View>

                <View style={styles.itemDetails}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemVendor}>{item.vendorName}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() =>
                    addItem({
                      id: item.id,
                      name: item.name,
                      price: item.price,
                      vendorId: item.vendorId,
                      vendorName: item.vendorName,
                      sku: item.sku,
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            ))
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
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a", marginBottom: 12 },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  input: { flex: 1, fontSize: 13, color: "#0f172a" },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a", marginBottom: 12 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  categoryCard: {
    width: "31%",
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  categoryCardSelected: { borderWidth: 2, borderColor: "#2563eb" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  catName: { fontSize: 11, fontWeight: "700", color: "#0f172a", textAlign: "center" },
  catCount: { fontSize: 9, color: "#64748b" },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearFilterText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 12,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  itemVendor: { fontSize: 11, color: "#64748b" },
  itemPrice: { fontSize: 13, fontWeight: "800", color: "#2563eb", marginTop: 2 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 2,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#334155" },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", maxWidth: 260 },
});

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useCartStore } from "@/stores/cart.store";

const Icon = Ionicons as unknown as React.ComponentType<any>;
import {
  fetchCategoriesFromDb,
  fetchProductsFromDb,
  DbCategory,
  DbProduct,
} from "@/src/services/api.service";

export default function ExploreScreen() {
  const [query, setQuery] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dbCats, dbProds] = await Promise.all([
          fetchCategoriesFromDb(),
          fetchProductsFromDb(),
        ]);
        setCategories(dbCats);
        setProducts(dbProds);
      } catch (err) {
        console.error("Failed to load explore catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  const filteredItems = products.filter((item) => {
    const matchesQuery =
      query.trim() === "" ||
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      (item.vendor?.storeName || "").toLowerCase().includes(query.toLowerCase());

    const matchesCat = !selectedCatId || item.categoryId === selectedCatId;
    return matchesQuery && matchesCat;
  });

  const selectedCategoryName = categories.find((c) => c.id === selectedCatId)?.name;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Search Bar Header */}
        <View style={styles.header}>
          <Text style={styles.heading}>Explore Catalog</Text>
          <View style={styles.inputBox}>
            <Icon name="search" size={18} color="#64748b" />
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
                <Icon name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {loading && (
            <View style={styles.loaderBox}>
              <ActivityIndicator size="small" color="#2563eb" />
              <Text style={styles.loaderText}>Loading live catalog...</Text>
            </View>
          )}

          {/* Categories Grid */}
          <Text style={styles.sectionTitle}>Explore Categories ({categories.length})</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat, idx) => {
              const isSelected = selectedCatId === cat.id;
              const bgColors = ["#eff6ff", "#fff7ed", "#fffbeb", "#f5f3ff", "#f0fdf4", "#f0f9ff"];
              const iconColors = ["#2563eb", "#ea580c", "#d97706", "#7c3aed", "#16a34a", "#0284c7"];
              const bg = bgColors[idx % bgColors.length];
              const color = iconColors[idx % iconColors.length];

              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: bg },
                    isSelected && styles.categoryCardSelected,
                  ]}
                  onPress={() => setSelectedCatId(isSelected ? null : cat.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.iconCircle, { backgroundColor: "#ffffff" }]}>
                    <Icon name={(cat.icon as any) || "grid-outline"} size={20} color={color} />
                  </View>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catCount}>Active Category</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search Results */}
          <View style={styles.resultsHeader}>
            <Text style={styles.sectionTitle}>
              {selectedCategoryName ? `${selectedCategoryName}` : "All Products"} ({filteredItems.length})
            </Text>
            {selectedCatId && (
              <TouchableOpacity onPress={() => setSelectedCatId(null)}>
                <Text style={styles.clearFilterText}>Clear Filter</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredItems.length === 0 && !loading ? (
            <View style={styles.emptyState}>
              <Icon name="search-outline" size={44} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No matching products in database</Text>
              <Text style={styles.emptySub}>
                Try searching for other terms or selecting a different category filter.
              </Text>
            </View>
          ) : (
            filteredItems.map((item) => {
              const priceNum = typeof item.price === "number" ? item.price : Number(item.price);
              return (
                <View key={item.id} style={styles.itemRow}>
                  <View style={styles.itemIconBox}>
                    <Icon name="cube-outline" size={24} color="#2563eb" />
                  </View>

                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemVendor}>
                      {item.vendor?.storeName || "Crave Partner Store"}
                    </Text>
                    <Text style={styles.itemPrice}>₹{priceNum}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() =>
                      addItem({
                        id: item.id,
                        name: item.name,
                        price: priceNum,
                        vendorId: item.vendorId,
                        vendorName: item.vendor?.storeName || "Crave Partner",
                        sku: item.sku || item.id,
                      })
                    }
                    activeOpacity={0.8}
                  >
                    <Icon name="add" size={16} color="#ffffff" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              );
            })
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
  input: { flex: 1, fontSize: 14, color: "#0f172a" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  loaderBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loaderText: { fontSize: 13, color: "#64748b" },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  categoryCard: {
    width: "48%",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "transparent",
    gap: 4,
  },
  categoryCardSelected: { borderColor: "#2563eb", borderWidth: 2 },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  catName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  catCount: { fontSize: 11, color: "#64748b" },
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  clearFilterText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  emptySub: { fontSize: 12, color: "#64748b", textAlign: "center", lineHeight: 18 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 12,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    backgroundColor: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
});

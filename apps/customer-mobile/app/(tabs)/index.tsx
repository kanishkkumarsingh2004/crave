import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const Icon = Ionicons as unknown as React.ComponentType<any>;
import { useCartStore } from "@/stores/cart.store";
import { useAddressStore } from "@/src/stores/address.store";
import { AddressModal } from "@/components/AddressModal";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";
import { findNearbyH3Stores } from "@delivery/utils";
import {
  fetchCategoriesFromDb,
  fetchProductsFromDb,
  fetchVendorsFromDb,
  DbCategory,
  DbProduct,
  DbVendor,
} from "@/src/services/api.service";

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  
  const [categories, setCategories] = useState<DbCategory[]>([]);
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [vendors, setVendors] = useState<DbVendor[]>([]);
  const [loading, setLoading] = useState(true);

  const addItem = useCartStore((state) => state.addItem);
  const getSelectedAddress = useAddressStore((state) => state.getSelectedAddress);
  const activeAddress = getSelectedAddress();
  const { location } = useDeviceLocation();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dbCats, dbProds, dbVendors] = await Promise.all([
          fetchCategoriesFromDb(),
          fetchProductsFromDb(),
          fetchVendorsFromDb(),
        ]);

        setCategories(dbCats);
        setProducts(dbProds);
        setVendors(dbVendors);
      } catch (err) {
        console.error("Failed to load home page DB data:", err);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  // Format categories list
  const categoryChips = [
    { id: "all", name: "All", icon: "apps-outline" },
    ...categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      icon: cat.icon || "basket-outline",
    })),
  ];

  // Filter products by category
  const filteredProducts = products.filter((p) => {
    if (selectedCategory === "all") return true;
    return p.categoryId === selectedCategory;
  });

  // Map vendors for spatial H3 lookup
  const vendorPoints = vendors.map((v) => ({
    id: v.id,
    name: v.storeName,
    category: v.description || "Grocery & Delivery",
    rating: v.rating || "4.8 ★",
    time: v.isOpen ? "15–20 mins" : "Closed",
    discount: "Verified Store",
    latitude: typeof v.latitude === "number" ? v.latitude : Number(v.latitude) || 12.9352,
    longitude: typeof v.longitude === "number" ? v.longitude : Number(v.longitude) || 77.6245,
  }));

  const h3Vendors = findNearbyH3Stores(
    activeAddress?.latitude || location?.latitude || 12.9344,
    activeAddress?.longitude || location?.longitude || 77.6192,
    vendorPoints,
  );

  function handleAddToCart(product: DbProduct) {
    const priceNum = typeof product.price === "number" ? product.price : Number(product.price);
    addItem({
      id: product.id,
      name: product.name,
      price: priceNum,
      vendorId: product.vendorId,
      vendorName: product.vendor?.storeName || "Crave Partner",
      sku: product.sku || product.id,
    });
    setAddedToast(`Added ${product.name}`);
    setTimeout(() => setAddedToast(null), 2000);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setAddressModalVisible(true)} activeOpacity={0.8}>
            <View style={styles.locationRow}>
              <Icon name="location" size={16} color="#2563eb" />
              <Text style={styles.locationLabel}>
                {activeAddress?.label ? `Deliver to ${activeAddress.label}` : "Deliver to"}
              </Text>
              <Icon name="chevron-down" size={14} color="#64748b" />
            </View>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {activeAddress
                ? `${activeAddress.street}, ${activeAddress.city}`
                : location?.address
                  ? `${location.address}, ${location.city}`
                  : "Select delivery address"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
            <Icon name="notifications-outline" size={20} color="#1e293b" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Toast Notification */}
        {addedToast && (
          <View style={styles.toastBox}>
            <Icon name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.toastText}>{addedToast}</Text>
          </View>
        )}

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push("/explore")}
        >
          <Icon name="search-outline" size={18} color="#64748b" />
          <Text style={styles.placeholderText}>
            Search products, categories, or stores...
          </Text>
          <Icon name="options-outline" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* Hero Promo Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>⚡ CRAVE FAST</Text>
            </View>
            <Text style={styles.heroTitle}>Get Everything Delivered in 20 Mins</Text>
            <Text style={styles.heroSub}>Directly from verified local partners & stores</Text>
          </View>
        </View>

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
            <Text style={styles.loadingText}>Fetching database catalog...</Text>
          </View>
        )}

        {/* Categories Pills */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {categoryChips.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Icon
                  name={cat.icon as any}
                  size={16}
                  color={isSelected ? "#ffffff" : "#475569"}
                />
                <Text style={[styles.categoryText, isSelected && styles.categoryTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Featured Products */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Products ({filteredProducts.length})</Text>
          <TouchableOpacity onPress={() => router.push("/explore")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {filteredProducts.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Icon name="cube-outline" size={36} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No products found in database</Text>
            <Text style={styles.emptySub}>Check back later or browse other categories</Text>
          </View>
        ) : (
          <View style={styles.productGrid}>
            {filteredProducts.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.imagePlaceholder}>
                  <Icon name="cube-outline" size={32} color="#94a3b8" />
                  <View style={styles.badgeTag}>
                    <Text style={styles.badgeText}>Active</Text>
                  </View>
                </View>

                <View style={styles.productDetails}>
                  <Text style={styles.vendorTag}>
                    {product.vendor?.storeName || "Crave Partner"}
                  </Text>
                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.productPrice}>₹{Number(product.price)}</Text>
                    <View style={styles.ratingBox}>
                      <Icon name="star" size={12} color="#eab308" />
                      <Text style={styles.ratingText}>4.8</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddToCart(product)}
                    activeOpacity={0.8}
                  >
                    <Icon name="add" size={16} color="#ffffff" />
                    <Text style={styles.addBtnText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* H3 Indexed Featured Vendors */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Stores ({h3Vendors.length})</Text>
          <View style={styles.h3TagBadgeHeader}>
            <Text style={styles.h3TagBadgeHeaderText}>⚡ H3 Spatial Res 8</Text>
          </View>
        </View>

        {h3Vendors.length === 0 && !loading ? (
          <View style={styles.emptyCard}>
            <Icon name="storefront-outline" size={36} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No active stores found</Text>
            <Text style={styles.emptySub}>Approved vendors will appear here automatically</Text>
          </View>
        ) : (
          h3Vendors.map((vendor) => (
            <View key={vendor.id} style={styles.vendorCard}>
              <View style={styles.vendorHeader}>
                <View style={styles.vendorIcon}>
                  <Icon name="storefront-outline" size={24} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.vendorTitle}>{vendor.name}</Text>
                    <View style={styles.h3CellBadge}>
                      <Text style={styles.h3CellBadgeText}>Hex: {vendor.h3Cell.slice(-6)}</Text>
                    </View>
                  </View>
                  <Text style={styles.vendorSub}>
                    {vendor.category} • {vendor.h3Tag}
                  </Text>
                </View>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{vendor.discount}</Text>
                </View>
              </View>

              <View style={styles.vendorMeta}>
                <View style={styles.metaItem}>
                  <Icon name="time-outline" size={14} color="#64748b" />
                  <Text style={styles.metaText}>{vendor.time}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="location-outline" size={14} color="#2563eb" />
                  <Text style={styles.metaText}>{vendor.distanceKm} km</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="star" size={14} color="#eab308" />
                  <Text style={styles.metaText}>{vendor.rating}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <AddressModal visible={addressModalVisible} onClose={() => setAddressModalVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
    textTransform: "uppercase",
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0f172a",
    maxWidth: 240,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  toastBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  toastText: { color: "#166534", fontSize: 13, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    marginBottom: 16,
  },
  placeholderText: { flex: 1, color: "#94a3b8", fontSize: 14 },
  heroBanner: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  heroContent: { gap: 6 },
  tagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  heroTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  heroSub: { color: "#dbeafe", fontSize: 12 },
  loaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  loadingText: { fontSize: 13, color: "#64748b" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  seeAllText: { fontSize: 13, fontWeight: "600", color: "#2563eb" },
  categoriesRow: { gap: 8, paddingBottom: 16 },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  categoryChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  categoryText: { fontSize: 13, fontWeight: "600", color: "#475569" },
  categoryTextActive: { color: "#ffffff" },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  productCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  imagePlaceholder: {
    height: 100,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  badgeTag: {
    position: "absolute",
    top: 6,
    left: 6,
    backgroundColor: "#16a34a",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { color: "#ffffff", fontSize: 9, fontWeight: "700" },
  productDetails: { padding: 10, gap: 4 },
  vendorTag: { fontSize: 10, fontWeight: "600", color: "#64748b" },
  productName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
  },
  productPrice: { fontSize: 14, fontWeight: "800", color: "#2563eb" },
  ratingBox: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingText: { fontSize: 11, fontWeight: "600", color: "#475569" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f172a",
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
    gap: 4,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  h3TagBadgeHeader: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  h3TagBadgeHeaderText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  vendorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  vendorHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  vendorIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  vendorTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  vendorSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  h3CellBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  h3CellBadgeText: { fontSize: 9, fontWeight: "700", color: "#475569" },
  discountBadge: {
    backgroundColor: "#fef2f2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: { color: "#ef4444", fontSize: 10, fontWeight: "700" },
  vendorMeta: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#64748b", fontWeight: "500" },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  emptySub: { fontSize: 12, color: "#64748b" },
});

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCartStore } from "@/stores/cart.store";
import { useAddressStore } from "@/src/stores/address.store";
import { AddressModal } from "@/components/AddressModal";
import { useDeviceLocation } from "../../hooks/useDeviceLocation";
import { findNearbyH3Stores } from "@delivery/utils";

const CATEGORIES = [
  { id: "all", name: "All", icon: "apps-outline" },
  { id: "grocery", name: "Groceries", icon: "basket-outline" },
  { id: "food", name: "Restaurants", icon: "restaurant-outline" },
  { id: "electronics", name: "Electronics", icon: "phone-portrait-outline" },
  { id: "health", name: "Health", icon: "medkit-outline" },
];

const FEATURED_PRODUCTS = [
  {
    id: "prod-1",
    name: "Fresh Organic Milk 1L",
    price: 65,
    vendorId: "v-1",
    vendorName: "FreshMart Organics",
    rating: "4.8",
    deliveryTime: "15 min",
    sku: "MILK-001",
    badge: "Bestseller",
  },
  {
    id: "prod-2",
    name: "Artisanal Whole Wheat Bread",
    price: 45,
    vendorId: "v-1",
    vendorName: "FreshMart Organics",
    rating: "4.9",
    deliveryTime: "15 min",
    sku: "BREAD-001",
    badge: "Fresh",
  },
  {
    id: "prod-3",
    name: "Farm Eggs (Pack of 12)",
    price: 95,
    vendorId: "v-1",
    vendorName: "FreshMart Organics",
    rating: "4.7",
    deliveryTime: "20 min",
    sku: "EGGS-012",
    badge: "Popular",
  },
  {
    id: "prod-4",
    name: "Cold Pressed Orange Juice 500ml",
    price: 120,
    vendorId: "v-2",
    vendorName: "JuiceHub Corner",
    rating: "4.6",
    deliveryTime: "25 min",
    sku: "JUICE-500",
    badge: "Healthy",
  },
];

const FEATURED_VENDORS = [
  {
    id: "v-1",
    name: "FreshMart Organics",
    category: "Grocery & Dairy",
    rating: "4.9 ★ (1.2k+)",
    time: "15–20 mins",
    discount: "20% OFF",
    latitude: 12.9352,
    longitude: 77.6245,
  },
  {
    id: "v-2",
    name: "Urban Spice Kitchen",
    category: "Indian & Asian",
    rating: "4.8 ★ (850+)",
    time: "25–30 mins",
    discount: "Free Delivery",
    latitude: 12.9385,
    longitude: 77.6212,
  },
  {
    id: "v-3",
    name: "TechGear Electronics",
    category: "Gadgets & Chargers",
    rating: "4.7 ★ (420+)",
    time: "20–25 mins",
    discount: "10% OFF",
    latitude: 12.941,
    longitude: 77.618,
  },
];

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [addedToast, setAddedToast] = useState<string | null>(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const getSelectedAddress = useAddressStore((state) => state.getSelectedAddress);
  const activeAddress = getSelectedAddress();
  const { location } = useDeviceLocation();

  const h3Vendors = findNearbyH3Stores(
    activeAddress?.latitude || 12.9344,
    activeAddress?.longitude || 77.6192,
    FEATURED_VENDORS,
  );

  function handleAddToCart(product: (typeof FEATURED_PRODUCTS)[0]) {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      sku: product.sku,
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
              <Ionicons name="location" size={16} color="#2563eb" />
              <Text style={styles.locationLabel}>
                {activeAddress?.label ? `Deliver to ${activeAddress.label}` : "Deliver to"}
              </Text>
              <Ionicons name="chevron-down" size={14} color="#64748b" />
            </View>
            <Text style={styles.locationAddress} numberOfLines={1}>
              {activeAddress
                ? `${activeAddress.street}, ${activeAddress.city}`
                : location?.address
                  ? `${location.address}, ${location.city}`
                  : "Koramangala 4th Block, Bengaluru"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.notificationBtn} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color="#1e293b" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Toast Notification */}
        {addedToast && (
          <View style={styles.toastBox}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
            <Text style={styles.toastText}>{addedToast}</Text>
          </View>
        )}

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.8}
          onPress={() => router.push("/explore")}
        >
          <Ionicons name="search-outline" size={18} color="#64748b" />
          <Text style={styles.placeholderText}>
            Search &quot;milk&quot;, &quot;bread&quot;, or stores...
          </Text>
          <Ionicons name="options-outline" size={18} color="#2563eb" />
        </TouchableOpacity>

        {/* Hero Promo Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.tagBadge}>
              <Text style={styles.tagBadgeText}>⚡ CRAVE FAST</Text>
            </View>
            <Text style={styles.heroTitle}>Get Everything Delivered in 20 Mins</Text>
            <Text style={styles.heroSub}>Use code CRAVE50 for 50% OFF on your first order</Text>
          </View>
        </View>

        {/* Categories Pills */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categories</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesRow}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
                activeOpacity={0.8}
              >
                <Ionicons
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
          <Text style={styles.sectionTitle}>Popular Today</Text>
          <TouchableOpacity onPress={() => router.push("/explore")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productGrid}>
          {FEATURED_PRODUCTS.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.imagePlaceholder}>
                <Ionicons name="cube-outline" size={32} color="#94a3b8" />
                <View style={styles.badgeTag}>
                  <Text style={styles.badgeText}>{product.badge}</Text>
                </View>
              </View>

              <View style={styles.productDetails}>
                <Text style={styles.vendorTag}>{product.vendorName}</Text>
                <Text style={styles.productName} numberOfLines={1}>
                  {product.name}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.productPrice}>₹{product.price}</Text>
                  <View style={styles.ratingBox}>
                    <Ionicons name="star" size={12} color="#eab308" />
                    <Text style={styles.ratingText}>{product.rating}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddToCart(product)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={16} color="#ffffff" />
                  <Text style={styles.addBtnText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* H3 Indexed Featured Vendors */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Stores (H3 Hex Ranked)</Text>
          <View style={styles.h3TagBadgeHeader}>
            <Text style={styles.h3TagBadgeHeaderText}>⚡ H3 Spatial Res 8</Text>
          </View>
        </View>

        {h3Vendors.map((vendor) => (
          <View key={vendor.id} style={styles.vendorCard}>
            <View style={styles.vendorHeader}>
              <View style={styles.vendorIcon}>
                <Ionicons name="storefront-outline" size={24} color="#2563eb" />
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
                <Ionicons name="time-outline" size={14} color="#64748b" />
                <Text style={styles.metaText}>{vendor.time}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={14} color="#2563eb" />
                <Text style={styles.metaText}>{vendor.distanceKm} km</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="star" size={14} color="#eab308" />
                <Text style={styles.metaText}>{vendor.rating}</Text>
              </View>
            </View>
          </View>
        ))}
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
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ef4444",
  },
  toastBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  toastText: { fontSize: 13, fontWeight: "600", color: "#166534" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    gap: 10,
  },
  placeholderText: { flex: 1, fontSize: 13, color: "#94a3b8" },
  heroBanner: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  heroContent: { gap: 6 },
  tagBadge: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  tagBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  heroTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 26,
  },
  heroSub: { color: "#dbeafe", fontSize: 12, fontWeight: "500" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#0f172a" },
  h3TagBadgeHeader: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  h3TagBadgeHeaderText: { fontSize: 10, fontWeight: "800", color: "#2563eb" },
  h3CellBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  h3CellBadgeText: { fontSize: 9, fontWeight: "700", color: "#475569" },
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
    top: 8,
    left: 8,
    backgroundColor: "#1e293b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
  ratingText: { fontSize: 11, fontWeight: "700", color: "#334155" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 6,
    marginTop: 6,
    gap: 4,
  },
  addBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },
  vendorCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  vendorHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  vendorIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  vendorTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  vendorSub: { fontSize: 12, color: "#64748b", marginTop: 2 },
  discountBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  discountText: { color: "#166534", fontSize: 11, fontWeight: "700" },
  vendorMeta: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontWeight: "600", color: "#475569" },
});

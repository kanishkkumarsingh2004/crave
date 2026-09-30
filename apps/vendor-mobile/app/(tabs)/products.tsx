import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  inStock: boolean;
  stockCount: number;
  description: string;
}

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Truffle Mushroom Burger",
    category: "Mains",
    price: 16.99,
    inStock: true,
    stockCount: 45,
    description: "Angus beef patty topped with black truffle aioli and sautéed wild mushrooms.",
  },
  {
    id: "p2",
    name: "Crispy Garlic Fries",
    category: "Sides",
    price: 6.5,
    inStock: true,
    stockCount: 120,
    description: "Hand-cut potato fries tossed in garlic butter, fresh parsley, and parmesan.",
  },
  {
    id: "p3",
    name: "Craft Iced Matcha Latte",
    category: "Beverages",
    price: 5.75,
    inStock: true,
    stockCount: 80,
    description: "Japanese ceremonial grade matcha whisked with oat milk and honey.",
  },
  {
    id: "p4",
    name: "New York Cheesecake Slice",
    category: "Desserts",
    price: 7.99,
    inStock: false,
    stockCount: 0,
    description: "Classic creamy cheesecake on a graham cracker crust with berry compote.",
  },
  {
    id: "p5",
    name: "Spicy Buffalo Wings (10 pcs)",
    category: "Mains",
    price: 14.5,
    inStock: true,
    stockCount: 30,
    description: "Jumbo chicken wings glazed in cayenne pepper sauce served with blue cheese dip.",
  },
];

export default function VendorProductsScreen() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Product Form State
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Mains");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newDescription, setNewDescription] = useState("");

  const categories = ["All", "Mains", "Sides", "Beverages", "Desserts"];

  const toggleStock = (productId: string) => {
    setProducts((prev) =>
      prev.map((prod) =>
        prod.id === productId ? { ...prod, inStock: !prod.inStock } : prod
      )
    );
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    Alert.alert("Delete Product", `Are you sure you want to delete "${productName}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setProducts((prev) => prev.filter((p) => p.id !== productId));
        },
      },
    ]);
  };

  const handleAddProduct = () => {
    if (!newName.trim() || !newPrice.trim()) {
      Alert.alert("Validation Error", "Please fill in the product name and price.");
      return;
    }

    const priceNum = parseFloat(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Validation Error", "Please enter a valid price.");
      return;
    }

    const newProd: Product = {
      id: `p-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      price: priceNum,
      inStock: true,
      stockCount: parseInt(newStock, 10) || 50,
      description: newDescription.trim() || "Delicious vendor specialty.",
    };

    setProducts((prev) => [newProd, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setNewName("");
    setNewPrice("");
    setNewStock("");
    setNewDescription("");

    Alert.alert("Success", "Product added to menu catalog!");
  };

  const filteredProducts = products.filter((prod) => {
    const matchesCat = selectedCategory === "All" || prod.category === selectedCategory;
    const matchesQuery = prod.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  return (
    <SafeAreaView style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Menu & Products</Text>
          <Text style={styles.subTitle}>Manage store items, pricing, and availability</Text>
        </View>
        <TouchableOpacity style={styles.btnAdd} onPress={() => setIsAddModalOpen(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.btnAddText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
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

      {/* Category Filter Chips */}
      <View style={styles.categoryWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item;
            return (
              <TouchableOpacity
                style={[styles.catChip, isSelected && styles.catChipActive]}
                onPress={() => setSelectedCategory(item)}
              >
                <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.categoryContainer}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Ionicons name="cube-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptySub}>Tap "Add Item" to create your first product.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardMain}>
              <View style={styles.imagePlaceholder}>
                <Ionicons name="fast-food-outline" size={28} color="#7c3aed" />
              </View>
              <View style={styles.productDetails}>
                <View style={styles.titleRow}>
                  <Text style={styles.prodName}>{item.name}</Text>
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{item.category}</Text>
                  </View>
                </View>
                <Text style={styles.prodDesc} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.prodPrice}>${item.price.toFixed(2)}</Text>
                  <Text style={styles.stockLabel}>Stock: {item.stockCount} units</Text>
                </View>
              </View>
            </View>

            {/* Toggle & Actions Row */}
            <View style={styles.cardFooter}>
              <View style={styles.toggleGroup}>
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: item.inStock ? "#16a34a" : "#dc2626" },
                  ]}
                >
                  {item.inStock ? "Available" : "Sold Out"}
                </Text>
                <Switch
                  value={item.inStock}
                  onValueChange={() => toggleStock(item.id)}
                  trackColor={{ false: "#fca5a5", true: "#bbf7d0" }}
                  thumbColor={item.inStock ? "#16a34a" : "#dc2626"}
                />
              </View>

              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => handleDeleteProduct(item.id, item.name)}
              >
                <Ionicons name="trash-outline" size={18} color="#dc2626" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Add Product Modal */}
      <Modal visible={isAddModalOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Product</Text>
              <TouchableOpacity onPress={() => setIsAddModalOpen(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Product Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Avocado Toast"
                value={newName}
                onChangeText={setNewName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.catSelectorRow}>
                {["Mains", "Sides", "Beverages", "Desserts"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.modalCatChip,
                      newCategory === cat && styles.modalCatChipActive,
                    ]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.modalCatText,
                        newCategory === cat && styles.modalCatTextActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.rowInputs}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="12.99"
                    keyboardType="decimal-pad"
                    value={newPrice}
                    onChangeText={setNewPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="50"
                    keyboardType="number-pad"
                    value={newStock}
                    onChangeText={setNewStock}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your dish ingredients..."
                multiline
                numberOfLines={3}
                value={newDescription}
                onChangeText={setNewDescription}
              />

              <TouchableOpacity style={styles.btnSubmit} onPress={handleAddProduct}>
                <Text style={styles.btnSubmitText}>Save & Publish Item</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  btnAdd: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7c3aed",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  btnAddText: { color: "#fff", fontWeight: "600", fontSize: 13 },
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
  categoryWrapper: { marginBottom: 12 },
  categoryContainer: { paddingHorizontal: 16, gap: 8 },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  catChipActive: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  catChipText: { fontSize: 12, fontWeight: "600", color: "#4b5563" },
  catChipTextActive: { color: "#fff" },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyBox: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
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
  cardMain: { flexDirection: "row", gap: 12 },
  imagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: "#f3e8ff",
    justifyContent: "center",
    alignItems: "center",
  },
  productDetails: { flex: 1 },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prodName: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  categoryBadge: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: "600", color: "#4b5563" },
  prodDesc: { fontSize: 12, color: "#6b7280", marginVertical: 4 },
  priceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  prodPrice: { fontSize: 16, fontWeight: "700", color: "#7c3aed" },
  stockLabel: { fontSize: 11, color: "#9ca3af" },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  toggleGroup: { flexDirection: "row", alignItems: "center", gap: 8 },
  toggleLabel: { fontSize: 12, fontWeight: "700" },
  btnDelete: { padding: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  modalForm: { gap: 12, paddingBottom: 20 },
  inputLabel: { fontSize: 12, fontWeight: "600", color: "#374151" },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  textArea: { height: 70, textAlignVertical: "top" },
  rowInputs: { flexDirection: "row", gap: 12 },
  catSelectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
  },
  modalCatChipActive: { backgroundColor: "#7c3aed" },
  modalCatText: { fontSize: 12, color: "#4b5563" },
  modalCatTextActive: { color: "#fff", fontWeight: "600" },
  btnSubmit: {
    backgroundColor: "#7c3aed",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  btnSubmitText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCartStore } from "@/stores/cart.store";
import { useAddressStore } from "@/src/stores/address.store";
import { usePaymentStore } from "@/src/stores/payment.store";
import { AddressModal } from "@/components/AddressModal";
import { PaymentMethodModal } from "@/components/PaymentMethodModal";
import { UpiRedirectModal } from "@/components/UpiRedirectModal";

export default function CartScreen() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getSubtotal,
    getTax,
    getDeliveryFee,
    getTotal,
  } = useCartStore();

  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [upiModalVisible, setUpiModalVisible] = useState(false);

  const getSelectedAddress = useAddressStore((state) => state.getSelectedAddress);
  const activeAddress = getSelectedAddress();
  const getSelectedPayment = usePaymentStore((state) => state.getSelectedMethod);
  const activePayment = getSelectedPayment();

  const subtotal = getSubtotal();
  const tax = getTax();
  const deliveryFee = getDeliveryFee();
  const total = getTotal();

  function handleCheckout() {
    if (items.length === 0) return;

    if (activePayment.type === "UPI") {
      setUpiModalVisible(true);
      return;
    }

    processOrderPlacement();
  }

  function processOrderPlacement() {
    setIsCheckingOut(true);
    setTimeout(() => {
      setIsCheckingOut(false);
      clearCart();
      Alert.alert(
        "🎉 Order Placed!",
        `Your order #ORD-10004 has been confirmed via ${activePayment.title}.\n\nDelivering to: ${activeAddress.label} (${activeAddress.street}, ${activeAddress.city})`,
        [
          {
            text: "Track Order",
            onPress: () => router.push("/orders"),
          },
        ],
      );
    }, 1200);
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="cart-outline" size={48} color="#94a3b8" />
          </View>
          <Text style={styles.emptyTitle}>Your Cart is Empty</Text>
          <Text style={styles.emptySub}>
            Explore products from local stores and add items to your cart.
          </Text>

          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push("/(tabs)")}
            activeOpacity={0.8}
          >
            <Text style={styles.browseBtnText}>Browse Stores</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const vendorName = items[0]?.vendorName || "Store";

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Your Cart</Text>
            <Text style={styles.vendorSubtitle}>Items from {vendorName}</Text>
          </View>

          <TouchableOpacity onPress={clearCart}>
            <Text style={styles.clearCartText}>Clear All</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Free Delivery Meter */}
          <View style={styles.deliveryMeter}>
            <Ionicons name="sparkles" size={16} color="#2563eb" />
            <Text style={styles.meterText}>
              {subtotal >= 500
                ? "🎉 You unlocked FREE Delivery!"
                : `Add ₹${500 - subtotal} more for FREE Delivery`}
            </Text>
          </View>

          {/* Cart Items */}
          <View style={styles.itemsList}>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  <Ionicons name="cube-outline" size={24} color="#2563eb" />
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemPrice}>₹{item.price}</Text>
                </View>

                {/* Qty Controls */}
                <View style={styles.qtyControl}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, -1)}
                  >
                    <Ionicons name="remove" size={14} color="#0f172a" />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => updateQuantity(item.id, 1)}
                  >
                    <Ionicons name="add" size={14} color="#0f172a" />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => removeItem(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Delivery Address Card */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeader}>
                <Ionicons name="location-outline" size={18} color="#2563eb" />
                <Text style={styles.cardTitle}>Delivery Location</Text>
              </View>
              <TouchableOpacity
                onPress={() => setAddressModalVisible(true)}
                style={styles.changeAddressBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.changeAddressBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.addressBox}>
              <View style={styles.addressTagBadge}>
                <Text style={styles.addressTagText}>{activeAddress.label}</Text>
              </View>
              <Text style={styles.addressText}>
                {activeAddress.street}, {activeAddress.city}, {activeAddress.state} -{" "}
                {activeAddress.postalCode}
              </Text>
            </View>
          </View>

          {/* Bill Summary (Taxes and platform charges managed via DB admin settings) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Bill Details</Text>
              <View style={styles.dbBadge}>
                <Ionicons name="server-outline" size={12} color="#1e40af" />
                <Text style={styles.dbBadgeText}>Admin DB Rates</Text>
              </View>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Item Subtotal</Text>
              <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Delivery Fee (Admin Setting)</Text>
              <Text style={styles.billValue}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
              </Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Taxes & Platform Fees (DB Rate)</Text>
              <Text style={styles.billValue}>₹{tax.toFixed(2)}</Text>
            </View>

            <View style={[styles.billRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>To Pay</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Checkout Bar */}
        <View style={styles.footerBar}>
          <View>
            <Text style={styles.footerSub}>TOTAL TO PAY</Text>
            <Text style={styles.footerTotal}>₹{total.toFixed(2)}</Text>
          </View>

          <TouchableOpacity
            style={[styles.checkoutBtn, isCheckingOut && styles.btnDisabled]}
            onPress={handleCheckout}
            disabled={isCheckingOut}
            activeOpacity={0.8}
          >
            {isCheckingOut ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Text style={styles.checkoutText}>Place Order</Text>
                <Ionicons name="arrow-forward" size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <AddressModal visible={addressModalVisible} onClose={() => setAddressModalVisible(false)} />
      <PaymentMethodModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
      />
      <UpiRedirectModal
        visible={upiModalVisible}
        upiAppId={activePayment.upiAppId || "GPay"}
        amount={total}
        onSuccess={() => {
          setUpiModalVisible(false);
          processOrderPlacement();
        }}
        onCancel={() => setUpiModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#f8fafc" },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  heading: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  vendorSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  clearCartText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  emptySub: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    maxWidth: 280,
  },
  browseBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  browseBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  deliveryMeter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  meterText: { fontSize: 12, fontWeight: "700", color: "#1e40af" },
  itemsList: { gap: 10, marginBottom: 16 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  itemPrice: { fontSize: 12, fontWeight: "600", color: "#2563eb", marginTop: 2 },
  qtyControl: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 4,
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  qtyText: { fontSize: 13, fontWeight: "700", color: "#0f172a" },
  deleteBtn: { padding: 4 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  changeAddressBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  changeAddressBtnText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  addressBox: { gap: 4 },
  addressTagBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  addressTagText: { fontSize: 10, fontWeight: "800", color: "#475569" },
  addressText: { fontSize: 12, color: "#475569", lineHeight: 18, fontWeight: "500" },
  billRow: { flexDirection: "row", justifyContent: "space-between" },
  billLabel: { fontSize: 13, color: "#64748b" },
  billValue: { fontSize: 13, fontWeight: "600", color: "#0f172a" },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  totalValue: { fontSize: 16, fontWeight: "800", color: "#2563eb" },
  footerBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerSub: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  footerTotal: { fontSize: 18, fontWeight: "800", color: "#2563eb" },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  btnDisabled: { opacity: 0.7 },
  checkoutText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  dbBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 4,
  },
  dbBadgeText: { fontSize: 10, fontWeight: "700", color: "#1e40af" },
});

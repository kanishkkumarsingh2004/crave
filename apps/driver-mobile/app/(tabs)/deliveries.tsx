import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

type DeliveryStep = "ASSIGNED" | "ARRIVED_PICKUP" | "PICKED_UP" | "ARRIVED_DELIVERY" | "DELIVERED";

export default function DriverDeliveriesScreen() {
  const [currentStep, setCurrentStep] = useState<DeliveryStep>("ASSIGNED");

  const activeDelivery = {
    orderNumber: "#ORD-9102",
    vendorName: "Gourmet Burger Kitchen",
    vendorPhone: "+1 (555) 888-9900",
    vendorAddress: "104 Market St, Downtown",
    customerName: "Alex Morgan",
    customerPhone: "+1 (555) 777-3311",
    customerAddress: "742 Evergreen Terrace, Apt 3B",
    items: ["2x Truffle Burger", "1x Garlic Fries", "2x Iced Tea"],
    earnings: "₹14.50",
  };

  const advanceStep = () => {
    switch (currentStep) {
      case "ASSIGNED":
        setCurrentStep("ARRIVED_PICKUP");
        Alert.alert("Status Updated", "Marked as Arrived at Vendor Store.");
        break;
      case "ARRIVED_PICKUP":
        setCurrentStep("PICKED_UP");
        Alert.alert("Status Updated", "Order Picked Up! Navigating to customer.");
        break;
      case "PICKED_UP":
        setCurrentStep("ARRIVED_DELIVERY");
        Alert.alert("Status Updated", "Arrived at customer address.");
        break;
      case "ARRIVED_DELIVERY":
        setCurrentStep("DELIVERED");
        Alert.alert("Delivery Completed!", "Great job! ₹14.50 added to earnings.");
        break;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "ASSIGNED":
        return "Step 1: Head to Vendor Store";
      case "ARRIVED_PICKUP":
        return "Step 2: Collect & Verify Order";
      case "PICKED_UP":
        return "Step 3: En Route to Customer";
      case "ARRIVED_DELIVERY":
        return "Step 4: Hand Order to Customer";
      case "DELIVERED":
        return "Delivery Complete!";
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Delivery Task</Text>
          <Text style={styles.subTitle}>Live route navigation and order status tracking</Text>
        </View>

        {currentStep === "DELIVERED" ? (
          <View style={styles.completeCard}>
            <Ionicons name="checkmark-circle" size={56} color="#16a34a" />
            <Text style={styles.completeTitle}>Trip Completed!</Text>
            <Text style={styles.completeSub}>
              You earned {activeDelivery.earnings} for this delivery.
            </Text>
            <TouchableOpacity style={styles.btnReset} onPress={() => setCurrentStep("ASSIGNED")}>
              <Text style={styles.btnResetText}>Back to Dashboard</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Step Status Tracker */}
            <View style={styles.stepProgressCard}>
              <Text style={styles.stepTitle}>{getStepTitle()}</Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressBar,
                    {
                      width:
                        currentStep === "ASSIGNED"
                          ? "25%"
                          : currentStep === "ARRIVED_PICKUP"
                            ? "50%"
                            : currentStep === "PICKED_UP"
                              ? "75%"
                              : "100%",
                    },
                  ]}
                />
              </View>
            </View>

            {/* Vendor Pickup Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardSectionHeader}>
                <Ionicons name="storefront" size={20} color="#7c3aed" />
                <Text style={styles.sectionHeading}>Pickup Location</Text>
              </View>
              <Text style={styles.mainName}>{activeDelivery.vendorName}</Text>
              <Text style={styles.addressText}>{activeDelivery.vendorAddress}</Text>
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactBtn}>
                  <Ionicons name="call" size={14} color="#7c3aed" />
                  <Text style={styles.contactBtnText}>Call Vendor</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactBtn}>
                  <Ionicons name="navigate" size={14} color="#7c3aed" />
                  <Text style={styles.contactBtnText}>Maps</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Items Checklist */}
            <View style={styles.infoCard}>
              <Text style={styles.sectionHeading}>Order Items ({activeDelivery.orderNumber})</Text>
              {activeDelivery.items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Ionicons name="checkbox-outline" size={18} color="#16a34a" />
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>

            {/* Customer Dropoff Card */}
            <View style={styles.infoCard}>
              <View style={styles.cardSectionHeader}>
                <Ionicons name="location" size={20} color="#16a34a" />
                <Text style={styles.sectionHeading}>Dropoff Location</Text>
              </View>
              <Text style={styles.mainName}>{activeDelivery.customerName}</Text>
              <Text style={styles.addressText}>{activeDelivery.customerAddress}</Text>
              <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactBtn}>
                  <Ionicons name="call" size={14} color="#16a34a" />
                  <Text style={[styles.contactBtnText, { color: "#16a34a" }]}>Call Customer</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button */}
            <TouchableOpacity style={styles.btnPrimaryAction} onPress={advanceStep}>
              <Text style={styles.btnPrimaryText}>
                {currentStep === "ASSIGNED" && "I Have Arrived at Store"}
                {currentStep === "ARRIVED_PICKUP" && "Confirm Order Picked Up"}
                {currentStep === "PICKED_UP" && "I Have Arrived at Customer"}
                {currentStep === "ARRIVED_DELIVERY" && "Complete Delivery"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  scrollContent: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 22, fontWeight: "700", color: "#111827" },
  subTitle: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  stepProgressCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  stepTitle: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 10 },
  progressTrack: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#2563eb" },
  infoCard: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cardSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  sectionHeading: { fontSize: 14, fontWeight: "700", color: "#111827" },
  mainName: { fontSize: 16, fontWeight: "700", color: "#111827", marginTop: 4 },
  addressText: { fontSize: 13, color: "#4b5563", marginTop: 2 },
  contactRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  contactBtnText: { fontSize: 12, fontWeight: "600", color: "#7c3aed" },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  itemText: { fontSize: 13, color: "#374151" },
  btnPrimaryAction: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  completeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 20,
  },
  completeTitle: { fontSize: 20, fontWeight: "700", color: "#111827", marginTop: 12 },
  completeSub: { fontSize: 14, color: "#6b7280", marginTop: 4, textAlign: "center" },
  btnReset: {
    backgroundColor: "#7c3aed",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  btnResetText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

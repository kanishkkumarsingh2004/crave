import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { LiveDriverMap } from "../../components/LiveDriverMap";

type DeliveryStep = "ASSIGNED" | "ARRIVED_PICKUP" | "PICKED_UP" | "ARRIVED_DELIVERY" | "DELIVERED";

export default function DriverDeliveriesScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<DeliveryStep>("ASSIGNED");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [otpError, setOtpError] = useState("");

  const activeDelivery = {
    orderNumber: "ORD-10004",
    vendorName: "Crave Organics",
    vendorPhone: "+919876543210",
    vendorAddress: "104 Market Street, Station Area, Koramangala 4th Block, Bengaluru",
    customerName: "Alice Smith",
    customerPhone: "+919876543210",
    customerAddress: "123 Main Street, Apt 4B, Koramangala, Bengaluru",
    items: ["2x Fresh Organic Milk (1L)", "1x Artisanal Whole Wheat Bread"],
    earnings: "₹85.00",
    correctOtp: "849201",
  };

  const advanceStep = () => {
    switch (currentStep) {
      case "ASSIGNED":
        setCurrentStep("ARRIVED_PICKUP");
        Alert.alert("Status Updated 📍", "Marked as Arrived at Vendor Store.");
        break;

      case "ARRIVED_PICKUP":
        setCurrentStep("PICKED_UP");
        Alert.alert("Parcel Collected 📦", "En route to customer address.");
        break;

      case "PICKED_UP":
        setCurrentStep("ARRIVED_DELIVERY");
        Alert.alert("Arrived at Drop-off 🏠", "Ask customer for the 6-digit OTP code.");
        break;

      case "ARRIVED_DELIVERY":
        if (enteredOtp.trim() !== activeDelivery.correctOtp) {
          setOtpError(`Invalid OTP. Ask customer for code (Hint: ${activeDelivery.correctOtp})`);
          return;
        }
        setOtpError("");
        setCurrentStep("DELIVERED");
        Alert.alert(
          "Delivery Completed! 🎉",
          `Handover verified! ${activeDelivery.earnings} added to your account earnings.`,
        );
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
        return "Step 4: Customer OTP Handover";
      case "DELIVERED":
        return "Delivery Completed!";
    }
  };

  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Task Console</Text>
          <Text style={styles.subTitle}>Live GPS route tracking & customer handover</Text>
        </View>

        {/* Live GPS Navigation & Speedometer Map */}
        <LiveDriverMap
          orderNumber={activeDelivery.orderNumber}
          customerName={activeDelivery.customerName}
          customerPhone={activeDelivery.customerPhone}
          destinationAddress={activeDelivery.customerAddress}
        />

        {currentStep === "DELIVERED" ? (
          <View style={styles.completeCard}>
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={40} color="#ffffff" />
            </View>
            <Text style={styles.completeTitle}>Trip Completed!</Text>
            <Text style={styles.completeSub}>
              You earned {activeDelivery.earnings} for delivery {activeDelivery.orderNumber}.
            </Text>
            <TouchableOpacity
              style={styles.btnReset}
              onPress={() => router.push("/")}
              activeOpacity={0.8}
            >
              <Text style={styles.btnResetText}>Return to Console</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Progress Bar */}
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

            {/* OTP Verification Form at Final Step */}
            {currentStep === "ARRIVED_DELIVERY" && (
              <View style={styles.otpCard}>
                <View style={styles.otpCardHeader}>
                  <Ionicons name="key-outline" size={20} color="#16a34a" />
                  <Text style={styles.otpCardTitle}>Verify Delivery OTP</Text>
                </View>
                <Text style={styles.otpCardSub}>
                  Scan Customer QR Code or enter the 6-digit code provided by customer{" "}
                  {activeDelivery.customerName}:
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: "#0f172a",
                    paddingVertical: 12,
                    borderRadius: 10,
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 12,
                  }}
                  onPress={() => {
                    Alert.alert(
                      "QR Camera Scanner 📸",
                      "Scanning Customer Delivery QR Code...\nToken: del_qr_849201",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Verify QR Handoff",
                          onPress: () => {
                            setEnteredOtp("849201");
                            setOtpError("");
                            advanceStep();
                          },
                        },
                      ],
                    );
                  }}
                >
                  <Ionicons name="qr-code-outline" size={20} color="#ffffff" />
                  <Text style={{ color: "#ffffff", fontWeight: "700", fontSize: 13 }}>
                    Scan Customer QR Code
                  </Text>
                </TouchableOpacity>

                <TextInput
                  style={styles.otpInput}
                  placeholder="Or enter 6-digit code (e.g. 849201)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={enteredOtp}
                  onChangeText={(text) => {
                    setEnteredOtp(text);
                    setOtpError("");
                  }}
                />

                {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}
              </View>
            )}

            {/* Vendor Details */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="storefront-outline" size={18} color="#2563eb" />
                <Text style={styles.cardTitle}>Pickup Details</Text>
              </View>

              <Text style={styles.locationTitle}>{activeDelivery.vendorName}</Text>
              <Text style={styles.locationSub}>{activeDelivery.vendorAddress}</Text>

              <TouchableOpacity style={styles.callRow} activeOpacity={0.7}>
                <Ionicons name="call-outline" size={16} color="#2563eb" />
                <Text style={styles.callText}>Call Store ({activeDelivery.vendorPhone})</Text>
              </TouchableOpacity>
            </View>

            {/* Customer Details */}
            <View style={styles.detailCard}>
              <View style={styles.cardHeader}>
                <Ionicons name="location-outline" size={18} color="#16a34a" />
                <Text style={styles.cardTitle}>Drop-off Details</Text>
              </View>

              <Text style={styles.locationTitle}>{activeDelivery.customerName}</Text>
              <Text style={styles.locationSub}>{activeDelivery.customerAddress}</Text>

              <TouchableOpacity style={styles.callRow} activeOpacity={0.7}>
                <Ionicons name="call-outline" size={16} color="#16a34a" />
                <Text style={[styles.callText, { color: "#16a34a" }]}>
                  Call Customer ({activeDelivery.customerPhone})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Items Summary */}
            <View style={styles.detailCard}>
              <Text style={styles.cardTitle}>Order Items</Text>
              {activeDelivery.items.map((item, index) => (
                <Text key={index} style={styles.itemText}>
                  • {item}
                </Text>
              ))}
            </View>

            {/* Action Advance Step Button */}
            <TouchableOpacity style={styles.actionBtn} onPress={advanceStep} activeOpacity={0.8}>
              <Text style={styles.actionBtnText}>
                {currentStep === "ASSIGNED"
                  ? "Mark Arrived at Vendor"
                  : currentStep === "ARRIVED_PICKUP"
                    ? "Confirm Pickup & Start Navigation"
                    : currentStep === "PICKED_UP"
                      ? "Arrived at Drop-off"
                      : "Verify OTP & Complete Delivery"}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  header: { gap: 2 },
  title: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  subTitle: { fontSize: 12, color: "#64748b" },
  stepProgressCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  stepTitle: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  progressTrack: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: { height: "100%", backgroundColor: "#2563eb", borderRadius: 4 },
  otpCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 14,
    gap: 10,
  },
  otpCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  otpCardTitle: { fontSize: 15, fontWeight: "700", color: "#166534" },
  otpCardSub: { fontSize: 12, color: "#15803d" },
  otpInput: {
    height: 48,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 2,
  },
  errorText: { fontSize: 12, color: "#dc2626", fontWeight: "600" },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  locationTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  locationSub: { fontSize: 12, color: "#64748b" },
  callRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  callText: { fontSize: 12, fontWeight: "700", color: "#2563eb" },
  itemText: { fontSize: 13, color: "#334155" },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  actionBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  completeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  completeTitle: { fontSize: 20, fontWeight: "800", color: "#0f172a" },
  completeSub: { fontSize: 13, color: "#64748b", textAlign: "center" },
  btnReset: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  btnResetText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});

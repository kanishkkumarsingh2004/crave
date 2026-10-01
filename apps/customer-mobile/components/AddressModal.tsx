import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAddressStore, SavedAddress } from "@/src/stores/address.store";

interface AddressModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AddressModal({ visible, onClose }: AddressModalProps) {
  const { addresses, selectedAddressId, selectAddress, addAddress, detectCurrentGpsLocation } =
    useAddressStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [label, setLabel] = useState<string>("Home");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [latitude, setLatitude] = useState(12.9344);
  const [longitude, setLongitude] = useState(77.6192);

  async function handleAutoDetectGps() {
    setDetectingGps(true);
    try {
      const gpsData = await detectCurrentGpsLocation();
      setStreet(gpsData.street);
      setCity(gpsData.city);
      setStateName(gpsData.state);
      setPostalCode(gpsData.postalCode);
      setLatitude(gpsData.latitude);
      setLongitude(gpsData.longitude);
      Alert.alert("Location Detected", `Filled location: ${gpsData.street}, ${gpsData.city}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to detect location";
      Alert.alert("GPS Permission Error", msg);
    } finally {
      setDetectingGps(false);
    }
  }

  async function handleSaveAddress() {
    if (!street.trim()) {
      Alert.alert("Missing Input", "Please enter flat, building, or street address.");
      return;
    }
    if (!city.trim()) {
      Alert.alert("Missing Input", "Please enter city.");
      return;
    }

    setSaving(true);
    try {
      await addAddress({
        label: label || "Home",
        street: street.trim(),
        city: city.trim() || "Bengaluru",
        state: stateName.trim() || "Karnataka",
        postalCode: postalCode.trim() || "560034",
        latitude,
        longitude,
        isDefault: false,
      });

      // Reset & close form
      setShowAddForm(false);
      setStreet("");
      setCity("");
      setStateName("");
      setPostalCode("");
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save address";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Modal Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="location-sharp" size={20} color="#2563eb" />
              <Text style={styles.headerTitle}>Select Delivery Address</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {!showAddForm ? (
              <>
                {/* Saved Address List */}
                <Text style={styles.sectionHeading}>Your Saved Addresses</Text>
                <View style={styles.addressList}>
                  {addresses.map((item: SavedAddress) => {
                    const isSelected = item.id === selectedAddressId;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                        onPress={() => {
                          selectAddress(item.id);
                          onClose();
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.radioCircle}>
                          {isSelected && <View style={styles.radioDot} />}
                        </View>

                        <View style={styles.addressDetails}>
                          <View style={styles.labelRow}>
                            <Text style={styles.addressLabel}>{item.label}</Text>
                            {isSelected && (
                              <View style={styles.selectedBadge}>
                                <Text style={styles.selectedBadgeText}>Deliver Here</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.addressStreet}>{item.street}</Text>
                          <Text style={styles.addressCity}>
                            {item.city}, {item.state} - {item.postalCode}
                          </Text>
                        </View>

                        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Add New Address Button */}
                <TouchableOpacity
                  style={styles.addAddressBtn}
                  onPress={() => setShowAddForm(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={20} color="#2563eb" />
                  <Text style={styles.addAddressBtnText}>Add New Address</Text>
                </TouchableOpacity>
              </>
            ) : (
              /* Add New Address Form */
              <View style={styles.formContainer}>
                <View style={styles.formHeaderRow}>
                  <Text style={styles.formTitle}>New Delivery Address</Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
                    <Text style={styles.cancelLink}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {/* Auto-Detect GPS Button */}
                <TouchableOpacity
                  style={styles.gpsBtn}
                  onPress={handleAutoDetectGps}
                  disabled={detectingGps}
                  activeOpacity={0.8}
                >
                  {detectingGps ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <Ionicons name="navigate" size={18} color="#2563eb" />
                  )}
                  <Text style={styles.gpsBtnText}>
                    {detectingGps ? "Detecting GPS..." : "Use Current GPS Location"}
                  </Text>
                </TouchableOpacity>

                {/* Address Label Selector */}
                <Text style={styles.inputLabel}>Address Tag</Text>
                <View style={styles.tagRow}>
                  {["Home", "Work", "Other"].map((tag) => (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, label === tag && styles.tagChipActive]}
                      onPress={() => setLabel(tag)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={tag === "Home" ? "home" : tag === "Work" ? "briefcase" : "location"}
                        size={14}
                        color={label === tag ? "#ffffff" : "#475569"}
                      />
                      <Text style={[styles.tagChipText, label === tag && styles.tagChipTextActive]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Street / Building Input */}
                <Text style={styles.inputLabel}>House / Flat / Street Address *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Flat 301, Sunshine Heights, MG Road"
                  value={street}
                  onChangeText={setStreet}
                  placeholderTextColor="#94a3b8"
                />

                {/* City & Postal Code Row */}
                <View style={styles.inputRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>City *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Bengaluru"
                      value={city}
                      onChangeText={setCity}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Postal Code</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 560034"
                      value={postalCode}
                      onChangeText={setPostalCode}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {/* State Input */}
                <Text style={styles.inputLabel}>State / Region</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Karnataka"
                  value={stateName}
                  onChangeText={setStateName}
                  placeholderTextColor="#94a3b8"
                />

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveAddress}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      <Text style={styles.saveBtnText}>Save & Select Address</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  content: { paddingTop: 16, paddingBottom: 24, gap: 16 },
  sectionHeading: { fontSize: 13, fontWeight: "700", color: "#64748b", textTransform: "uppercase" },
  addressList: { gap: 10 },
  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 14,
    gap: 12,
  },
  addressItemSelected: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2563eb",
  },
  addressDetails: { flex: 1, gap: 2 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  addressLabel: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  selectedBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  selectedBadgeText: { fontSize: 10, fontWeight: "700", color: "#ffffff" },
  addressStreet: { fontSize: 13, color: "#334155", fontWeight: "500" },
  addressCity: { fontSize: 11, color: "#64748b" },
  addAddressBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1.5,
    borderColor: "#93c5fd",
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 4,
  },
  addAddressBtnText: { fontSize: 15, fontWeight: "700", color: "#2563eb" },

  // Form Styles
  formContainer: { gap: 14 },
  formHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  cancelLink: { fontSize: 13, fontWeight: "600", color: "#ef4444" },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  gpsBtnText: { fontSize: 13, fontWeight: "700", color: "#2563eb" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  tagRow: { flexDirection: "row", gap: 10 },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  tagChipActive: { backgroundColor: "#2563eb" },
  tagChipText: { fontSize: 12, fontWeight: "700", color: "#475569" },
  tagChipTextActive: { color: "#ffffff" },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
  },
  inputRow: { flexDirection: "row", gap: 12 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
});

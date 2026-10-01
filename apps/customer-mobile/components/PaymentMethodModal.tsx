import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  usePaymentStore,
  RECOMMENDED_UPI_APPS,
  UpiAppId,
  SavedPaymentMethod,
} from "@/src/stores/payment.store";

interface PaymentMethodModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAndProceed?: (method: SavedPaymentMethod) => void;
}

export function PaymentMethodModal({
  visible,
  onClose,
  onSelectAndProceed,
}: PaymentMethodModalProps) {
  const {
    methods,
    selectedMethodId,
    activeUpiAppId,
    customUpiId,
    selectMethod,
    setUpiApp,
    saveCustomUpi,
    getSelectedMethod,
  } = usePaymentStore();

  const [inputUpi, setInputUpi] = useState(customUpiId);

  function handleSelectUpiApp(appId: UpiAppId) {
    setUpiApp(appId);
    const updatedSelected = getSelectedMethod();
    if (onSelectAndProceed) {
      onSelectAndProceed(updatedSelected);
    }
  }

  function handleSaveCustomUpi() {
    if (!inputUpi.includes("@")) {
      Alert.alert("Invalid UPI ID", "Please enter a valid NPCI UPI VPA handle (e.g. store@okaxis)");
      return;
    }
    saveCustomUpi(inputUpi);
    Alert.alert("UPI Handle Linked", `Merchant VPA set to: ${inputUpi}`);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="flash" size={20} color="#2563eb" />
              <Text style={styles.headerTitle}>Select UPI Application</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* SECTION 1: Recommended UPI Apps */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>RECOMMENDED UPI APPS (NPCI)</Text>
              <View style={styles.instantBadge}>
                <Ionicons name="shield-checkmark" size={12} color="#16a34a" />
                <Text style={styles.instantBadgeText}>Zero Gateway Charge</Text>
              </View>
            </View>

            <View style={styles.upiGrid}>
              {RECOMMENDED_UPI_APPS.map((app) => {
                const isSelected = activeUpiAppId === app.id;
                return (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.upiCard,
                      { backgroundColor: app.bg },
                      isSelected && styles.upiCardSelected,
                    ]}
                    onPress={() => handleSelectUpiApp(app.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.upiIconBox, { backgroundColor: app.color }]}>
                      <Ionicons name={app.iconName as any} size={20} color="#ffffff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.upiAppName}>{app.name}</Text>
                      <Text style={styles.upiAppSub}>Standard upi://pay URL pattern</Text>
                    </View>

                    {isSelected ? (
                      <View style={styles.selectedCheckCircle}>
                        <Ionicons name="checkmark" size={14} color="#ffffff" />
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Confirm Footer */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={() => {
              if (onSelectAndProceed) {
                onSelectAndProceed(getSelectedMethod());
              }
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
            <Text style={styles.confirmBtnText}>Confirm UPI App Selection</Text>
          </TouchableOpacity>
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
  content: { paddingTop: 16, paddingBottom: 20, gap: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 12, fontWeight: "800", color: "#64748b", letterSpacing: 0.5 },
  instantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  instantBadgeText: { fontSize: 10, fontWeight: "700", color: "#166534" },
  upiGrid: { gap: 10 },
  upiCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 12,
  },
  upiCardSelected: {
    borderWidth: 2,
    borderColor: "#2563eb",
  },
  upiIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  upiAppName: { fontSize: 15, fontWeight: "800", color: "#0f172a" },
  upiAppSub: { fontSize: 11, color: "#64748b" },
  selectedCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  customUpiBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    gap: 8,
  },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#475569" },
  upiInputRow: { flexDirection: "row", gap: 8 },
  upiTextInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0f172a",
  },
  verifyUpiBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyUpiBtnText: { fontSize: 12, fontWeight: "700", color: "#ffffff" },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 8,
  },
  confirmBtnText: { fontSize: 15, fontWeight: "800", color: "#ffffff" },
});

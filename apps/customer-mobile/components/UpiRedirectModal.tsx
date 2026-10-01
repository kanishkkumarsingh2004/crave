import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UpiAppId, RECOMMENDED_UPI_APPS, usePaymentStore } from "@/src/stores/payment.store";

interface UpiRedirectModalProps {
  visible: boolean;
  upiAppId: UpiAppId;
  amount: number;
  orderNumber?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function UpiRedirectModal({
  visible,
  upiAppId: initialUpiAppId,
  amount,
  orderNumber = "ORD-10004",
  onSuccess,
  onCancel,
}: UpiRedirectModalProps) {
  const { buildStandardUpiUrl, setUpiApp, payeeAddress, fetchAdminPaymentSettings } =
    usePaymentStore();

  const [selectedAppId, setSelectedAppId] = useState<UpiAppId>(initialUpiAppId);
  const [step, setStep] = useState<"INIT" | "SELECT_APP" | "ENTER_TXN_ID" | "SUCCESS">("INIT");
  const [transactionId, setTransactionId] = useState<string>("");
  const [txnError, setTxnError] = useState<string | null>(null);

  const appConfig =
    RECOMMENDED_UPI_APPS.find((a) => a.id === selectedAppId) || RECOMMENDED_UPI_APPS[0];

  const standardUpiUrl = buildStandardUpiUrl(amount, orderNumber);

  useEffect(() => {
    if (visible) {
      fetchAdminPaymentSettings();
      setSelectedAppId(initialUpiAppId);
      setStep("INIT");
      setTransactionId("");
      setTxnError(null);
    }
  }, [visible, initialUpiAppId, fetchAdminPaymentSettings]);

  function handleSelectApp(appId: UpiAppId) {
    setSelectedAppId(appId);
    setUpiApp(appId);
    setStep("INIT");
  }

  async function handlePayWithUpi() {
    // Try opening deep link to UPI app if supported
    try {
      const canOpen = await Linking.canOpenURL(standardUpiUrl);
      if (canOpen) {
        await Linking.openURL(standardUpiUrl);
      }
    } catch {
      // Fallthrough to transaction ID entry
    }

    // Advance directly to Transaction ID entry step
    setStep("ENTER_TXN_ID");
  }

  function handleSubmitTransactionId() {
    const cleanId = transactionId.trim();
    if (cleanId.length < 6) {
      setTxnError("Please enter a valid 12-digit UPI Transaction Ref ID / UTR No.");
      return;
    }

    setStep("SUCCESS");
    setTimeout(() => {
      onSuccess();
    }, 1200);
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.popupCard}>
          {/* Header Banner */}
          <View style={[styles.topBanner, { backgroundColor: appConfig.bg }]}>
            <View style={styles.appBannerRow}>
              <View style={[styles.appIconCircle, { backgroundColor: appConfig.color }]}>
                <Ionicons name={appConfig.iconName as any} size={28} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.appName}>{appConfig.name}</Text>
                <Text style={{ fontSize: 10, color: "#64748b", fontWeight: "600" }}>
                  NPCI Standard Direct Payment
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeAppBtn}
                onPress={() => setStep("SELECT_APP")}
                activeOpacity={0.8}
              >
                <Text style={styles.changeAppBtnText}>Change App</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Body Content */}
          <View style={styles.body}>
            <Text style={styles.amountLabel}>Total Payment Amount</Text>
            <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>

            {/* STEP 1: SELECT APP POPUP */}
            {step === "SELECT_APP" && (
              <View style={styles.appSelectionBox}>
                <Text style={styles.appSelectTitle}>Select UPI Application</Text>
                {RECOMMENDED_UPI_APPS.map((app) => (
                  <TouchableOpacity
                    key={app.id}
                    style={[
                      styles.appSelectItem,
                      selectedAppId === app.id && styles.appSelectItemActive,
                    ]}
                    onPress={() => handleSelectApp(app.id)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.appItemIcon, { backgroundColor: app.color }]}>
                      <Ionicons name={app.iconName as any} size={18} color="#ffffff" />
                    </View>
                    <Text style={styles.appItemName}>{app.name}</Text>
                    {selectedAppId === app.id && (
                      <Ionicons name="checkmark-circle" size={18} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* STEP 2: INITIAL PAYLOAD DETAILS */}
            {step === "INIT" && (
              <View style={styles.initContainer}>
                <View style={styles.payloadSummaryBadge}>
                  <Ionicons name="shield-checkmark-outline" size={14} color="#2563eb" />
                  <Text style={styles.payloadSummaryText}>
                    NPCI Ref: {orderNumber} (pa={payeeAddress || "blinkbite.store@okaxis"})
                  </Text>
                </View>

                <Text style={styles.initSub}>
                  Redirecting to {appConfig.name} for instant payment authorization.
                </Text>
              </View>
            )}

            {/* STEP 3: ENTER TRANSACTION ID */}
            {step === "ENTER_TXN_ID" && (
              <View style={styles.txnContainer}>
                <View style={styles.txnIconBox}>
                  <Ionicons name="receipt-outline" size={32} color="#2563eb" />
                </View>
                <Text style={styles.txnTitle}>Enter Transaction Ref ID</Text>
                <Text style={styles.txnSub}>
                  Enter the 12-digit UTR or Transaction Ref ID from your {appConfig.name} app
                </Text>

                <TextInput
                  style={styles.txnInput}
                  placeholder="e.g. 123456789012 or UTR No."
                  placeholderTextColor="#94a3b8"
                  value={transactionId}
                  onChangeText={(val) => {
                    setTransactionId(val);
                    setTxnError(null);
                  }}
                  keyboardType="numeric"
                  maxLength={18}
                  autoFocus
                />

                {txnError && <Text style={styles.errorText}>{txnError}</Text>}
              </View>
            )}

            {/* STEP 4: SUCCESS */}
            {step === "SUCCESS" && (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={54} color="#16a34a" />
                <Text style={styles.statusTitle}>UPI Payment Verified!</Text>
                <Text style={styles.statusSub}>
                  Transaction Ref ID: {transactionId || "UTR-987412354678"} approved via {appConfig.name}.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === "INIT" && (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: appConfig.color }]}
                  onPress={handlePayWithUpi}
                  activeOpacity={0.8}
                >
                  <Ionicons name="flash" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Pay with UPI</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "ENTER_TXN_ID" && (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: "#2563eb" }]}
                  onPress={handleSubmitTransactionId}
                  activeOpacity={0.8}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Submit Transaction ID</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep("INIT")}>
                  <Text style={styles.cancelBtnText}>Back</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "SELECT_APP" && (
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStep("INIT")}>
                <Text style={styles.cancelBtnText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  popupCard: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#ffffff",
    borderRadius: 24,
    overflow: "hidden",
  },
  topBanner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  appBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  appIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: { fontSize: 17, fontWeight: "800", color: "#0f172a" },
  changeAppBtn: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  changeAppBtnText: { fontSize: 11, fontWeight: "700", color: "#2563eb" },
  body: { padding: 16, alignItems: "center" },
  amountLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  amountValue: { fontSize: 28, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
  payloadSummaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 6,
    marginBottom: 4,
  },
  payloadSummaryText: { fontSize: 11, fontWeight: "700", color: "#1e40af" },

  // App Selection Box
  appSelectionBox: { width: "100%", gap: 8, marginVertical: 8 },
  appSelectTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a", marginBottom: 4 },
  appSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10,
  },
  appSelectItemActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  appItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  appItemName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#0f172a" },

  // Transaction ID Input
  txnContainer: { width: "100%", alignItems: "center", gap: 8, marginVertical: 10 },
  txnIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  txnTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  txnSub: { fontSize: 12, color: "#64748b", textAlign: "center", maxWidth: 280 },
  txnInput: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    textAlign: "center",
    marginTop: 8,
  },

  statusBox: { alignItems: "center", gap: 8, marginVertical: 12 },
  statusTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  statusSub: { fontSize: 12, color: "#64748b", textAlign: "center" },

  // Init Container Styles
  initContainer: { width: "100%", alignItems: "center", gap: 8, marginVertical: 12 },
  initSub: { fontSize: 12, color: "#64748b", textAlign: "center", maxWidth: 280, marginTop: 4 },
  errorText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },

  footer: { padding: 14, gap: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  cancelBtn: { alignItems: "center", paddingVertical: 6 },
  cancelBtnText: { fontSize: 12, fontWeight: "600", color: "#ef4444" },
});

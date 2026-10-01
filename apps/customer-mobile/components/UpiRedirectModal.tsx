import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
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
  upiAppId,
  amount,
  orderNumber = "ORD-10004",
  onSuccess,
  onCancel,
}: UpiRedirectModalProps) {
  const { buildStandardUpiUrl, getSelectedMethod } = usePaymentStore();
  const currentMethod = getSelectedMethod();

  const appConfig = RECOMMENDED_UPI_APPS.find((a) => a.id === upiAppId) || RECOMMENDED_UPI_APPS[0];

  const [step, setStep] = useState<"REDIRECTING" | "ENTER_PIN" | "SUCCESS">("REDIRECTING");
  const [upiPin, setUpiPin] = useState<string>("");
  const [pinError, setPinError] = useState<string | null>(null);

  const standardUpiUrl = buildStandardUpiUrl(amount, orderNumber);

  useEffect(() => {
    if (visible) {
      setStep("REDIRECTING");
      setUpiPin("");
      setPinError(null);
      const timer = setTimeout(() => setStep("ENTER_PIN"), 1200);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  async function handleOpenUpiApp() {
    try {
      const canOpen = await Linking.canOpenURL(standardUpiUrl);
      if (canOpen) {
        await Linking.openURL(standardUpiUrl);
      } else {
        setStep("ENTER_PIN");
      }
    } catch {
      setStep("ENTER_PIN");
    }
  }

  function handleKeyPress(num: string) {
    if (upiPin.length < 6) {
      setUpiPin((prev) => prev + num);
      setPinError(null);
    }
  }

  function handleBackspace() {
    setUpiPin((prev) => prev.slice(0, -1));
    setPinError(null);
  }

  function handleAuthorizePin() {
    if (upiPin.length < 4) {
      setPinError("Please enter your 4-digit or 6-digit UPI PIN");
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
            <View style={[styles.appIconCircle, { backgroundColor: appConfig.color }]}>
              <Ionicons name={appConfig.iconName as any} size={28} color="#ffffff" />
            </View>
            <Text style={styles.appName}>{appConfig.name}</Text>
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>NPCI Standard UPI</Text>
            </View>
          </View>

          {/* Amount & Standard UPI Specs */}
          <View style={styles.body}>
            <Text style={styles.amountLabel}>Total Payment Amount</Text>
            <Text style={styles.amountValue}>₹{amount.toFixed(2)}</Text>

            {/* Standard NPCI URL Details Tag */}
            <View style={styles.upiParamsCard}>
              <View style={styles.paramRow}>
                <Text style={styles.paramKey}>pa (Payee VPA):</Text>
                <Text style={styles.paramVal}>{currentMethod.payeeAddress}</Text>
              </View>
              <View style={styles.paramRow}>
                <Text style={styles.paramKey}>pn (Payee Name):</Text>
                <Text style={styles.paramVal}>{currentMethod.payeeName}</Text>
              </View>
              <View style={styles.paramRow}>
                <Text style={styles.paramKey}>mc (MCC Code):</Text>
                <Text style={styles.paramVal}>{currentMethod.mccCode} (Grocery)</Text>
              </View>
            </View>

            {step === "REDIRECTING" && (
              <View style={styles.statusBox}>
                <ActivityIndicator size="large" color={appConfig.color} />
                <Text style={styles.statusTitle}>Opening {appConfig.name}...</Text>
                <Text style={styles.statusSub}>Building standard NPCI payload</Text>
              </View>
            )}

            {step === "ENTER_PIN" && (
              <View style={styles.pinContainer}>
                <Text style={styles.pinTitle}>Enter {appConfig.name} UPI PIN</Text>
                <Text style={styles.pinSub}>
                  Enter 4 or 6 digit PIN to authorize ₹{amount.toFixed(2)}
                </Text>

                {/* PIN Mask Dots */}
                <View style={styles.pinDotsRow}>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <View
                      key={index}
                      style={[styles.pinDot, upiPin.length > index && styles.pinDotFilled]}
                    />
                  ))}
                </View>

                {pinError && <Text style={styles.errorText}>{pinError}</Text>}

                {/* Custom Numeric Keypad */}
                <View style={styles.keypadGrid}>
                  {[
                    ["1", "2", "3"],
                    ["4", "5", "6"],
                    ["7", "8", "9"],
                    ["C", "0", "⌫"],
                  ].map((row, rIdx) => (
                    <View key={rIdx} style={styles.keypadRow}>
                      {row.map((btn) => (
                        <TouchableOpacity
                          key={btn}
                          style={styles.keypadBtn}
                          onPress={() => {
                            if (btn === "C") setUpiPin("");
                            else if (btn === "⌫") handleBackspace();
                            else handleKeyPress(btn);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.keypadBtnText}>{btn}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
              </View>
            )}

            {step === "SUCCESS" && (
              <View style={styles.statusBox}>
                <Ionicons name="checkmark-circle" size={54} color="#16a34a" />
                <Text style={styles.statusTitle}>UPI Payment Verified!</Text>
                <Text style={styles.statusSub}>
                  Transaction approved via {appConfig.name} NPCI Gateway.
                </Text>
              </View>
            )}
          </View>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === "ENTER_PIN" && (
              <>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: appConfig.color }]}
                  onPress={handleAuthorizePin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="lock-closed" size={18} color="#ffffff" />
                  <Text style={styles.primaryBtnText}>Confirm UPI Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}

            {step === "REDIRECTING" && (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
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
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 16,
    gap: 6,
  },
  appIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  appName: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  recommendedBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  recommendedBadgeText: { fontSize: 9, fontWeight: "800", color: "#475569" },
  body: { padding: 16, alignItems: "center" },
  amountLabel: { fontSize: 11, fontWeight: "600", color: "#64748b" },
  amountValue: { fontSize: 28, fontWeight: "900", color: "#0f172a" },
  upiParamsCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    marginVertical: 10,
    gap: 4,
  },
  paramRow: { flexDirection: "row", justifyContent: "space-between" },
  paramKey: { fontSize: 10, fontWeight: "700", color: "#64748b" },
  paramVal: { fontSize: 10, fontWeight: "700", color: "#0f172a" },
  statusBox: { alignItems: "center", gap: 8, marginVertical: 12 },
  statusTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  statusSub: { fontSize: 12, color: "#64748b", textAlign: "center" },

  // Keypad & PIN Styles
  pinContainer: { width: "100%", alignItems: "center", gap: 8 },
  pinTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  pinSub: { fontSize: 11, color: "#64748b" },
  pinDotsRow: { flexDirection: "row", gap: 12, marginVertical: 8 },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  pinDotFilled: { backgroundColor: "#0f172a", borderColor: "#0f172a" },
  errorText: { fontSize: 11, color: "#ef4444", fontWeight: "600" },
  keypadGrid: { width: "100%", gap: 6, marginTop: 4 },
  keypadRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  keypadBtn: {
    flex: 1,
    height: 40,
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  keypadBtnText: { fontSize: 16, fontWeight: "800", color: "#0f172a" },

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

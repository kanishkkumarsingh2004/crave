import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverAuthStore } from "@/stores/auth.store";

export default function DriverPendingScreen() {
  const signOut = useDriverAuthStore((s) => s.signOut);

  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>⏳</Text>
        </View>
        <Text style={styles.heading}>Application Under Review</Text>
        <Text style={styles.body}>
          Your driver application has been submitted. Our team will review your documents and notify
          you once you are approved to start deliveries.
        </Text>
        <Text style={styles.hint}>This usually takes 1–2 business days.</Text>
        <TouchableOpacity style={styles.button} onPress={signOut}>
          <Text style={styles.buttonText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  iconBox: { marginBottom: 24 },
  icon: { fontSize: 56 },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 12,
  },
  body: { fontSize: 14, color: "#6b7280", textAlign: "center", lineHeight: 22, marginBottom: 8 },
  hint: { fontSize: 12, color: "#9ca3af", textAlign: "center", marginBottom: 32 },
  button: {
    height: 44,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 14, color: "#374151", fontWeight: "500" },
});

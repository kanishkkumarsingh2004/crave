import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { useState } from "react";
import { useVendorAuthStore } from "@/stores/auth.store";

export default function VendorSignUpScreen() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { signUp, loading } = useVendorAuthStore();

  async function handleSignUp() {
    setError("");
    if (!name.trim() || !businessName.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (password.length < 12) {
      setError("Password must be at least 12 characters.");
      return;
    }

    try {
      await signUp({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        businessName: businessName.trim(),
        businessPhone: phone.trim(),
        businessAddress: address.trim(),
      });
      router.replace("/onboarding/pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Vendor Application</Text>
        <Text style={styles.subheading}>Fill in your details to apply as a vendor</Text>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {[
          { label: "Your Name *", value: name, setter: setName, placeholder: "Full name" },
          {
            label: "Business Name *",
            value: businessName,
            setter: setBusinessName,
            placeholder: "Store / Restaurant name",
          },
          { label: "Email *", value: email, setter: setEmail, placeholder: "business@example.com" },
          { label: "Phone", value: phone, setter: setPhone, placeholder: "+91XXXXXXXXXX" },
          {
            label: "Business Address",
            value: address,
            setter: setAddress,
            placeholder: "Street, City",
          },
          {
            label: "Password *",
            value: password,
            setter: setPassword,
            placeholder: "Min. 12 characters",
            secure: true,
          },
        ].map(({ label, value, setter, placeholder, secure }) => (
          <View key={label} style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              secureTextEntry={secure}
              autoCapitalize={label.includes("Email") ? "none" : "sentences"}
              value={value}
              onChangeText={setter}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Submit Application</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already a vendor? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 40 },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 4,
  },
  subheading: { fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 28 },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: "#dc2626", fontSize: 13 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: "500", color: "#374151", marginBottom: 6 },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    fontSize: 14,
    color: "#111827",
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 13, color: "#6b7280" },
  footerLink: { fontSize: 13, color: "#7c3aed", fontWeight: "600" },
});

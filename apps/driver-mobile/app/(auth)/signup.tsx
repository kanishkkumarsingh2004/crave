import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

export default function DriverSignUpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="shield-checkmark" size={32} color="#ea580c" />
      </View>

      <Text style={styles.heading}>Admin Registration Required</Text>
      <Text style={styles.subheading}>
        Driver accounts cannot be self-registered from the app. All driver credentials, vehicle assignments, and dispatch profiles are created directly by System Administrators.
      </Text>

      <View style={styles.card}>
        <View style={styles.stepItem}>
          <Ionicons name="person-add-outline" size={20} color="#ea580c" style={styles.stepIcon} />
          <Text style={styles.stepText}>Contact your delivery operations administrator.</Text>
        </View>
        <View style={styles.stepItem}>
          <Ionicons name="key-outline" size={20} color="#ea580c" style={styles.stepIcon} />
          <Text style={styles.stepText}>Admin will register your driver profile and password.</Text>
        </View>
        <View style={styles.stepItem}>
          <Ionicons name="bicycle-outline" size={20} color="#ea580c" style={styles.stepIcon} />
          <Text style={styles.stepText}>Log in with your assigned credentials to begin delivery shifts.</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.replace("/(auth)/login")}
        activeOpacity={0.8}
      >
        <Text style={styles.buttonText}>Return to Driver Login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: "#f8f9fa",
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 28,
    gap: 16,
  },
  stepItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepIcon: {
    marginRight: 12,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    fontWeight: "500",
  },
  button: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#ea580c",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
});

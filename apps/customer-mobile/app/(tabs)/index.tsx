import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.flex}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Home</Text>
        <Text style={styles.sub}>Browse products and vendors</Text>
        {/* Implemented in Phase 5 */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { padding: 20 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280" },
});

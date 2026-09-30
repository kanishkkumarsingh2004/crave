import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function VendorProductsScreen() {
  return (
    <SafeAreaView style={styles.flex}>
      <View style={styles.container}>
        <Text style={styles.heading}>Products</Text>
        <Text style={styles.sub}>Vendor Products — implemented in Phase 6</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f8f9fa" },
  container: { flex: 1, padding: 20 },
  heading: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 4 },
  sub: { fontSize: 14, color: "#6b7280" },
});

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface AppSplashScreenProps {
  appName?: string;
  subtitle?: string;
  statusText?: string;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  appName = "CRAVE",
  subtitle = "Fast & Fresh Food Delivery",
  statusText = "Initializing secure session...",
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Pulse animation loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    return () => pulseLoop.stop();
  }, [fadeAnim, pulseAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Glow Ring Behind Logo */}
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.pulseGlow,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <View style={styles.logoCard}>
            <Image
              source={require("../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Brand Text */}
        <View style={styles.textContainer}>
          <Text style={styles.brandTitle}>{appName}</Text>
          <Text style={styles.brandSubtitle}>{subtitle}</Text>
        </View>

        {/* Loading Spinner & Status */}
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </Animated.View>

      {/* Footer Security Badge */}
      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ 256-Bit Encrypted Platform</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 24,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    width: 140,
    height: 140,
  },
  pulseGlow: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  logoCard: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#eff6ff",
    padding: 12,
  },
  logoImage: {
    width: 86,
    height: 86,
  },
  textContainer: {
    alignItems: "center",
    gap: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: 0.3,
  },
  loadingBox: {
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#3b82f6",
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#166534",
  },
});

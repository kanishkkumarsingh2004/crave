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
  appName = "CRAVE Driver",
  subtitle = "Rider & Logistics Management",
  statusText = "Authenticating driver session...",
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

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
        <View style={styles.logoWrapper}>
          <Animated.View
            style={[
              styles.pulseGlow,
              { transform: [{ scale: pulseAnim }] },
            ]}
          />
          <View style={styles.logoCard}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.brandTitle}>{appName}</Text>
          <Text style={styles.brandSubtitle}>{subtitle}</Text>
        </View>

        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#ea580c" />
          <Text style={styles.statusText}>{statusText}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>⚡ Driver Operations Portal</Text>
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
    backgroundColor: "rgba(234, 88, 12, 0.15)",
  },
  logoCard: {
    width: 110,
    height: 110,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
    borderWidth: 1,
    borderColor: "#fff7ed",
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
    fontSize: 30,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1.2,
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
    color: "#c2410c",
    letterSpacing: 0.2,
  },
  footer: {
    alignItems: "center",
  },
  badge: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#ffedd5",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#c2410c",
  },
});

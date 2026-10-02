import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function PrivacyPolicyScreen() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: "collection",
      title: "1. Information We Collect",
      icon: "file-tray-full-outline",
      content:
        "We collect personal and device information necessary to process orders, provide real-time delivery tracking, and personalize your experience on Crave.",
      bullets: [
        "Account Data: Name, email address, phone number, and delivery address profiles.",
        "Location Data: Precise GPS coordinates (when active) for live delivery tracking and store search.",
        "Transaction Data: Order history, payment preferences (tokenized, no raw card numbers stored), and invoices.",
        "Technical Data: Device IP, OS version, app analytics, and unique device identifiers.",
      ],
    },
    {
      id: "usage",
      title: "2. How We Use Your Data",
      icon: "cog-outline",
      content:
        "Your data is used strictly to fulfill food delivery services, maintain account security, and improve platform performance.",
      bullets: [
        "Order Fulfillment: Routing your order to nearest vendors and dispatching delivery drivers.",
        "Communication: Sending order status SMS, push notifications, and electronic receipts.",
        "Customer Support: Resolving delivery issues, refunds, and inquiry tickets.",
        "Fraud Prevention: Detecting unauthorized transactions, promo abuse, and suspicious logins.",
      ],
    },
    {
      id: "sharing",
      title: "3. Sharing & Third-Party Disclosure",
      icon: "share-social-outline",
      content:
        "We never sell your personal data to third-party advertisers. We share information only with operational partners required to complete your delivery.",
      bullets: [
        "Delivery Drivers: Name, contact phone, and delivery address (active during order fulfillment only).",
        "Partner Vendors: Store order details and item instructions (excluding full billing address).",
        "Payment Processors: Encrypted billing data passed to PCI-DSS compliant gateways (e.g. Razorpay, Stripe).",
        "Legal Requirements: When mandatory by law enforcement, court orders, or government regulations.",
      ],
    },
    {
      id: "location",
      title: "4. Location Permissions & GPS",
      icon: "location-outline",
      content:
        "Precise location permissions allow us to show nearby restaurants, calculate accurate delivery fees, and show live driver tracking map views.",
      bullets: [
        "You can modify or revoke location permissions at any time via your device settings.",
        "If location is disabled, you can manually enter delivery addresses for order placement.",
      ],
    },
    {
      id: "security",
      title: "5. Security & Data Retention",
      icon: "lock-closed-outline",
      content:
        "We employ industry-standard AES-256 encryption, SSL/TLS transport security, and role-based database access controls to safeguard your personal data.",
      bullets: [
        "Data Retention: We retain user account data as long as your account remains active.",
        "Payment Security: Crave does not store raw credit card numbers or banking PINs.",
        "Security Audits: Regular vulnerability testing and automated security scanning.",
      ],
    },
    {
      id: "rights",
      title: "6. Your Data Rights & Controls",
      icon: "shield-checkmark-outline",
      content:
        "You have full ownership and control over your personal data on the Crave platform.",
      bullets: [
        "Access & Export: Request a copy of your personal data and order history.",
        "Correction: Update inaccurate profile, address, or contact details directly in app settings.",
        "Account Deletion: Submit an account closure request to purge personal data permanently.",
        "Opt-Out: Unsubscribe from promotional emails or push marketing alerts at any time.",
      ],
    },
    {
      id: "cookies",
      title: "7. Analytics & Tracking Technologies",
      icon: "analytics-outline",
      content:
        "We use privacy-focused mobile analytics tools to monitor app performance, crash reports, and navigation flows to enhance user experience.",
      bullets: [
        "Crash Reporting: Anonymous stack traces collected via Sentry / Expo Crash Insights.",
        "App Usage: Aggregated feature usage metrics to optimize app speed and UI layouts.",
      ],
    },
    {
      id: "contact",
      title: "8. Data Protection Officer (DPO)",
      icon: "mail-outline",
      content:
        "If you have inquiries regarding privacy practices or wish to exercise your data protection rights, contact our Data Protection Officer.",
      bullets: [
        "Email: privacy@craveapp.com",
        "Postal Address: Crave Legal & Privacy Dept, Tech Park, New Delhi, India.",
        "Response Time: Privacy requests are responded to within 30 days.",
      ],
    },
  ];

  function handleRequestDataExport() {
    Alert.alert(
      "Data Export Request",
      "Would you like to request a copy of your personal data & order history sent to your registered email?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Request Export",
          onPress: () =>
            Alert.alert(
              "Request Submitted",
              "Your data archive is being generated and will be sent to your registered email address within 24 hours."
            ),
        },
      ]
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <Text style={styles.headerSubtitle}>Data Protection & Security</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRightAction}
          onPress={() => router.push("/terms")}
          activeOpacity={0.7}
        >
          <Ionicons name="document-text-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="shield-checkmark" size={28} color="#16a34a" />
          </View>
          <View style={styles.bannerTextContent}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>Version 2.4 • Updated Oct 2026</Text>
            </View>
            <Text style={styles.bannerTitle}>Privacy & Data Protection</Text>
            <Text style={styles.bannerDesc}>
              Learn how Crave collects, uses, and protects your personal information and delivery data.
            </Text>
          </View>
        </View>

        {/* Quick Nav Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {sections.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={[
                styles.chip,
                activeSection === sec.id && styles.chipActive,
              ]}
              onPress={() => setActiveSection(activeSection === sec.id ? null : sec.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, activeSection === sec.id && styles.chipTextActive]}>
                {sec.title.split(" ")[1] || sec.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* User Privacy Shield Notice */}
        <View style={styles.alertNotice}>
          <Ionicons name="lock-closed" size={20} color="#15803d" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.alertNoticeTitle}>Your Privacy Matters</Text>
            <Text style={styles.alertNoticeText}>
              We encrypt all personal communication and never sell your data to third parties. You have complete control over your permissions.
            </Text>
          </View>
        </View>

        {/* Section Cards */}
        {sections.map((sec) => {
          const isHighlighted = activeSection === sec.id;
          return (
            <View
              key={sec.id}
              style={[
                styles.sectionCard,
                isHighlighted && styles.sectionCardHighlighted,
              ]}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconCircle}>
                  <Ionicons name={sec.icon as any} size={18} color="#16a34a" />
                </View>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
              </View>

              <Text style={styles.sectionBodyText}>{sec.content}</Text>

              {sec.bullets && sec.bullets.length > 0 && (
                <View style={styles.bulletList}>
                  {sec.bullets.map((b, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <Ionicons name="ellipse" size={6} color="#22c55e" style={{ marginTop: 6 }} />
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Privacy Action Card */}
        <View style={styles.actionCard}>
          <View style={styles.actionCardHeader}>
            <Ionicons name="download-outline" size={20} color="#2563eb" />
            <Text style={styles.actionCardTitle}>Download Your Data Archive</Text>
          </View>
          <Text style={styles.actionCardDesc}>
            You can request a complete archive of your personal profile, delivery history, and saved address logs at any time.
          </Text>
          <TouchableOpacity
            style={styles.actionCardBtn}
            onPress={handleRequestDataExport}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-unread-outline" size={16} color="#ffffff" />
            <Text style={styles.actionCardBtnText}>Request Data Export</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Legal & Policy Links</Text>
          <Text style={styles.footerSubText}>
            Review associated platform policies or return to your account profile.
          </Text>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity
              style={styles.contactButtonPrimary}
              onPress={() => router.push("/terms")}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={16} color="#ffffff" />
              <Text style={styles.contactButtonPrimaryText}>Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButtonSecondary}
              onPress={() => router.push("/(tabs)/profile")}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={16} color="#334155" />
              <Text style={styles.contactButtonSecondaryText}>Profile Settings</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.copyrightText}>
            © 2026 Crave Platform Technologies Inc. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },
  headerRightAction: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  bannerCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 14,
    alignItems: "flex-start",
  },
  bannerIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTextContent: {
    flex: 1,
    gap: 4,
  },
  versionBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0f172a",
  },
  bannerDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 17,
  },
  chipScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  chipActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  alertNotice: {
    flexDirection: "row",
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  alertNoticeTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#14532d",
    marginBottom: 2,
  },
  alertNoticeText: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 10,
  },
  sectionCardHighlighted: {
    borderColor: "#16a34a",
    borderWidth: 1.5,
    backgroundColor: "#fafafa",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  sectionBodyText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 19,
  },
  bulletList: {
    gap: 8,
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  actionCard: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    padding: 16,
    gap: 8,
  },
  actionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
  },
  actionCardDesc: {
    fontSize: 12,
    color: "#1e3a8a",
    lineHeight: 17,
  },
  actionCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  actionCardBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  footerSection: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  footerHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a",
  },
  footerSubText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 17,
  },
  contactButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    width: "100%",
  },
  contactButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  contactButtonPrimaryText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  contactButtonSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  contactButtonSecondaryText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 13,
  },
  copyrightText: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 8,
  },
});

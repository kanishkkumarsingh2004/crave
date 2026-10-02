import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function TermsAndConditionsScreen() {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const sections = [
    {
      id: "acceptance",
      title: "1. Acceptance of Terms",
      icon: "checkmark-circle-outline",
      content:
        "By downloading, accessing, or using the Crave mobile application and services, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to all of these terms, you may not use our platform or services.",
      bullets: [
        "These terms apply to all visitors, registered customers, and service users.",
        "We reserve the right to modify these terms at any time with prior notification.",
        "Continued use of Crave after changes constitutes acceptance of modified terms.",
      ],
    },
    {
      id: "account",
      title: "2. Customer Account & Security",
      icon: "person-outline",
      content:
        "To place orders on Crave, you must register an account with a valid email address and secure password. You are responsible for keeping your login credentials confidential and for all activities under your account.",
      bullets: [
        "You must be at least 18 years of age (or legal age in your jurisdiction) to create an account.",
        "You agree to provide accurate, current, and complete personal & delivery details.",
        "Promptly notify Crave Support if you suspect unauthorized access to your account.",
      ],
    },
    {
      id: "orders",
      title: "3. Ordering & Fulfillment Process",
      icon: "fast-food-outline",
      content:
        "When you place an order through Crave, you are submitting an offer to purchase products directly from partner vendors. Crave acts as an intermediary marketplace and delivery logistics coordinator.",
      bullets: [
        "Orders are subject to vendor acceptance, product availability, and delivery area coverage.",
        "Estimated delivery times displayed in the app are approximations based on traffic and prep times.",
        "Vendors reserve the right to replace out-of-stock items upon customer approval.",
      ],
    },
    {
      id: "pricing",
      title: "4. Pricing, Taxes & Payment Methods",
      icon: "card-outline",
      content:
        "All prices displayed in the Crave app are set by partner vendors and include applicable goods & services taxes (GST). Delivery fees, platform service charges, and small order fees are itemized at checkout before payment.",
      bullets: [
        "Payments can be processed via credit/debit card, UPI, digital wallets, or Cash on Delivery (where available).",
        "Promo codes and discounts must be applied before order confirmation.",
        "Crave reserves the right to adjust delivery fees during peak demand hours or adverse weather conditions.",
      ],
    },
    {
      id: "cancellation",
      title: "5. Cancellation & Refund Policy",
      icon: "refresh-circle-outline",
      content:
        "Orders can be cancelled free of charge within 60 seconds of placement, or before the vendor accepts the order. Once food preparation begins, full or partial cancellation fees may apply.",
      bullets: [
        "If an order is cancelled by the vendor or Crave due to stock issues, a 100% refund is processed immediately.",
        "Refunds for damaged or missing items are evaluated upon photo evidence submitted via Help Center within 2 hours.",
        "Approved refunds are credited to the original payment method within 3 to 7 business days.",
      ],
    },
    {
      id: "conduct",
      title: "6. User Conduct & Fair Usage",
      icon: "shield-checkmark-outline",
      content:
        "You agree to interact respectfully with delivery drivers, vendor staff, and Crave support representatives. Abusive language, fraudulent order claims, or harassment will result in immediate account suspension.",
      bullets: [
        "Provide clear, safe delivery instructions and accessible delivery locations.",
        "Do not engage in fraudulent referral abuse, multiple account creation for promo abuse, or fake order creation.",
        "Violation of conduct rules may lead to permanent ban and legal recourse if necessary.",
      ],
    },
    {
      id: "liability",
      title: "7. Limitation of Liability",
      icon: "alert-circle-outline",
      content:
        "Crave provides the platform on an 'AS IS' and 'AS AVAILABLE' basis. While we partner with verified vendors, Crave is not directly liable for food quality, allergen cross-contamination, or vendor preparation delays.",
      bullets: [
        "Please specify food allergies in order notes and verify allergen warnings directly with vendors.",
        "Crave's total aggregate liability for any claims shall not exceed the total value of the disputed order.",
      ],
    },
    {
      id: "governing",
      title: "8. Governing Law & Dispute Resolution",
      icon: "scale-outline",
      content:
        "These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of these terms shall be subject to arbitration in New Delhi, India.",
      bullets: [
        "Customers agree to attempt informal dispute resolution through Crave Support before initiating formal legal proceedings.",
      ],
    },
  ];

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
          <Text style={styles.headerTitle}>Terms & Conditions</Text>
          <Text style={styles.headerSubtitle}>Crave Customer Agreement</Text>
        </View>
        <TouchableOpacity
          style={styles.headerRightAction}
          onPress={() => router.push("/privacy")}
          activeOpacity={0.7}
        >
          <Ionicons name="shield-outline" size={20} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Banner Card */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconBox}>
            <Ionicons name="document-text" size={28} color="#2563eb" />
          </View>
          <View style={styles.bannerTextContent}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>Version 2.4 • Effective Oct 2026</Text>
            </View>
            <Text style={styles.bannerTitle}>Terms of Service</Text>
            <Text style={styles.bannerDesc}>
              Please review the terms governing your use of the Crave delivery platform and ordering services.
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

        {/* Important Alert Notice */}
        <View style={styles.alertNotice}>
          <Ionicons name="information-circle" size={20} color="#0284c7" style={{ marginTop: 2 }} />
          <Text style={styles.alertNoticeText}>
            By creating an account or placing an order on Crave, you acknowledge that you have read, understood, and agreed to these terms.
          </Text>
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
                  <Ionicons name={sec.icon as any} size={18} color="#2563eb" />
                </View>
                <Text style={styles.sectionTitle}>{sec.title}</Text>
              </View>

              <Text style={styles.sectionBodyText}>{sec.content}</Text>

              {sec.bullets && sec.bullets.length > 0 && (
                <View style={styles.bulletList}>
                  {sec.bullets.map((b, idx) => (
                    <View key={idx} style={styles.bulletItem}>
                      <Ionicons name="ellipse" size={6} color="#3b82f6" style={{ marginTop: 6 }} />
                      <Text style={styles.bulletText}>{b}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Contact & Footer Section */}
        <View style={styles.footerSection}>
          <Text style={styles.footerHeading}>Questions about our Terms?</Text>
          <Text style={styles.footerSubText}>
            If you have questions regarding legal agreements, rights, or account policies, contact our legal compliance team.
          </Text>

          <View style={styles.contactButtonsRow}>
            <TouchableOpacity
              style={styles.contactButtonPrimary}
              onPress={() => router.push("/privacy")}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
              <Text style={styles.contactButtonPrimaryText}>Privacy Policy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButtonSecondary}
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/(auth)/login"))}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back-outline" size={16} color="#334155" />
              <Text style={styles.contactButtonSecondaryText}>Go Back</Text>
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
    backgroundColor: "#eff6ff",
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
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
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
    backgroundColor: "#f0f9ff",
    borderWidth: 1,
    borderColor: "#bae6fd",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    alignItems: "flex-start",
  },
  alertNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#0369a1",
    lineHeight: 17,
    fontWeight: "500",
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
    borderColor: "#2563eb",
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
    backgroundColor: "#eff6ff",
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

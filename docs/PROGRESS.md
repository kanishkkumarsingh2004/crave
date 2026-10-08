# Development Progress & Feature Roadmap

# Crave / Blinkbite — Food & 10-Minute Grocery Delivery System

**Version:** 2.0  
**Last Updated:** October 2026

---

## 1. Feature Completion Status Summary

| Category / Domain     | Feature                  |   Status    | Details                                                                                                                                |
| :-------------------- | :----------------------- | :---------: | :------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**    | JWT Login & Signup       | ✅ Complete | Multi-role user creation, secure token hashing, role redirection.                                                                      |
| **Authentication**    | Role Access Control      | ✅ Complete | Route guards for Customer, Vendor, CraveXP Vendor, Driver, Admin.                                                                      |
| **UI & Styling**      | Tailwind Design System   | ✅ Complete | Custom palette (`#18201c`, `#d9f447`, `#849e16`), micro-animations.                                                                    |
| **UI & Styling**      | Comprehensive Dark Theme | ✅ Complete | 100% dark mode coverage across all dashboards, modals, popups, and invoices.                                                           |
| **UI & Styling**      | Theme Switcher           | ✅ Complete | Light/Dark/System theme options in settings, synced across user profiles.                                                              |
| **Checkout & Cart**   | Cart Management          | ✅ Complete | Add/remove items, quantity adjustments, persistent local storage cart.                                                                 |
| **Checkout & Cart**   | Address Book             | ✅ Complete | Saved address list, label management, default address selection modal.                                                                 |
| **Checkout & Cart**   | Coupon Engine            | ✅ Complete | Promo code validation, flat/percentage discounts, minimum subtotal checks.                                                             |
| **Checkout & Cart**   | Pricing Engine           | ✅ Complete | Dynamic road distance calculation, base/per-km fees, demand/rain/night surge fees.                                                     |
| **Payments**          | UPI Gateway Integration  | ✅ Complete | Deep-links for GPay, PhonePe, Paytm, BHIM, VPA copy, 12-digit UTR validation.                                                          |
| **Telemetry & Maps**  | Admin Telemetry Map      | ✅ Complete | Live Leaflet map pins, rider telemetry telemetry stream (`/api/admin/map-live-analytics`).                                             |
| **Telemetry & Maps**  | Customer Live Track      | ✅ Complete | Real-time delivery route tracking, visual status steppers, rider contact.                                                              |
| **Invoicing**         | Official Tax Invoice     | ✅ Complete | Printable FSSAI tax invoice popup, DB record metadata, itemized breakdown.                                                             |
| **Vendor Consoles**   | Kitchen & Dark Store     | ✅ Complete | Order acceptance/rejection, menu toggles, stock status management.                                                                     |
| **Pricing Engine**    | Commercial Calculator    | ✅ Complete | Dynamic delivery fee calculations, surge multipliers, delivery tier caps & commission splits (`/api/calculator`, `lib/calculator.ts`). |
| **Driver Fleet**      | Cockpit & Duty Radar     | ✅ Complete | Online/Offline duty toggle, H3 geofenced dispatch radar, OTP drop-off confirmation (`app/driver/*`).                                   |
| **Quality Assurance** | Automated Test Suite     | ✅ Complete | 100% Pass Rate across 48 Test Suites (263/263 Green Tests passing).                                                                    |

---

## 2. Recent Key Milestones & Enhancements

### Milestone 1: Dark Mode Theme Polish across All Workflows

- Added dark mode classes (`dark:bg-[#121815]`, `dark:bg-[#18201c]`, `dark:border-[#27342d]`, `dark:text-white`) across:
  - Admin & Customer Dashboards.
  - Mobile Bottom Bar & Mobile Side Navigation Drawer.
  - Cart page coupons & saved address modals.
  - Printable Official Tax Invoice modal (`components/InvoiceModal.tsx`).
  - CraveLogo text and period dot contrast across top navigation bars.

### Milestone 2: Dynamic Distance Pricing Integration

- Created `lib/distance-pricing.ts` supporting Haversine calculation, road distance multiplier ($1.30\times$), base distance inclusion, per-km rates, packaging fees, platform service fees, and surge rules.

### Milestone 3: Live Map Telemetry Endpoint

- Built `/api/admin/map-live-analytics` for live driver location feeds, active order telemetry pins, and live map rendering.

### Milestone 4: Commercial Engine & Database Synchronization

- Separated **Commission Rate (%)** (e.g. 15% cut from vendor) and **Platform Markup Rate (%)** (e.g. 10% markup added on top of base price for customers) across `prisma/schema.prisma`, `lib/commercial-engine.ts`, DAL, REST APIs, Vendor Settings, Onboarding, and Commercial Contracts governance.
- Generated full audit report: [`docs/COMMERCIAL_ENGINE_DATABASE_SYNC_REPORT.md`](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/COMMERCIAL_ENGINE_DATABASE_SYNC_REPORT.md).

### Milestone 5: Payment, Delivery & Surge Charge Playground Update

- Configured default parameter matrix (₹450 order, 3.5km, ₹20 packaging, ₹30 tip, 15% commission, 80% driver share, ₹6 platform fee, ₹5 handling fee, ₹30 base delivery, ₹10/km rate, ₹500 free threshold).
- Added quick simulation presets: Standard Meal, Heavy Rain (+₹25), Late Night Surge (+₹20), High-Value Order, and Reset System Defaults.
- Generated full audit report: [`docs/PAYMENT_DELIVERY_SURGE_PLAYGROUND_REPORT.md`](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/PAYMENT_DELIVERY_SURGE_PLAYGROUND_REPORT.md).

### Milestone 6: Commercial & Delivery Calculator REST API (`/api/calculator`)

- Engineered dedicated `app/api/calculator/route.ts` REST endpoint backed by `lib/calculator.ts` for evaluating real-time order pricing breakdown.
- Computes base fees, per-km dynamic rates, rain & late night surge multipliers, platform commission splits, vendor payouts, and driver delivery earnings.
- Generated full specification guide: [`docs/COMMERCIAL_PRICING_AND_CALCULATIONS_GUIDE.md`](file:///home/kanishk/Desktop/kk-code/New%20Folder/docs/COMMERCIAL_PRICING_AND_CALCULATIONS_GUIDE.md).
- Added comprehensive unit test coverage (`test/api/calculator.test.ts`).

### Milestone 7: Admin Dashboard Dark Mode Contrast & Sub-Header Styling

- Fixed dark mode visual contrast bug on sub-header navigation bar (`components/dashboards/AdminDashboard.tsx`).
- Applied explicit `dark:text-white` to "Platform Accounts & Stores" sub-header, `dark:text-[#9eb3a4]` for secondary text, and `dark:border-[#25332a]` border styling.

---

## 3. Future Roadmap & Upcoming Features

- [ ] **WhatsApp & SMS OTP Delivery Verification**: Integration with Twilio / Gupshup for automated delivery confirmation OTPs.
- [ ] **Advanced Vendor Sales Analytics**: Interactive revenue charts (Recharts / Chart.js) for kitchen vendors and CraveXP dark store managers.
- [ ] **Multi-City Geofencing Boundaries**: Polygon-based city boundaries and store service radius management in Admin settings.
- [ ] **Rider Earnings & Payout Cockpit**: Detailed daily/weekly rider earnings reports, tip breakdowns, and automated bank payouts.

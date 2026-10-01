/**
 * Prisma Seed — Multi-Role Delivery Platform
 *
 * Configures the database with:
 * 1. Platform settings & metrics
 * 2. Product categories
 * 3. Exactly ONE test user per role:
 *    - Admin: admin@delivery.com
 *    - Customer: customer@delivery.com
 *    - Vendor: vendor@delivery.com (with 1 test store profile, 0 mock products)
 *    - Driver / Rider: driver@delivery.com (with 1 test rider profile)
 * 4. Cleans all mock orders, mock products/items, mock inventory, mock deliveries, etc.
 *
 * Password for all test users: Password123
 */

import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = "Password123";

async function createOrUpdateUserPassword(userId: string, password = DEFAULT_PASSWORD) {
  const hashedPassword = await hashPassword(password);
  const existingAccount = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
  });

  if (!existingAccount) {
    await prisma.account.create({
      data: {
        userId,
        accountId: userId,
        providerId: "credential",
        password: hashedPassword,
      },
    });
  } else {
    await prisma.account.update({
      where: { id: existingAccount.id },
      data: { password: hashedPassword },
    });
  }
}

async function main() {
  console.log("🧹 Clearing mock data (orders, deliveries, products, inventory, mock stores)...");

  // 1. Delete dependent transactional & operational data in proper foreign-key order
  await prisma.auditLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.driverLocation.deleteMany({});
  await prisma.deliveryStatusHistory.deleteMany({});
  await prisma.deliveryVerification.deleteMany({});
  await prisma.driverAssignment.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.refund.deleteMany({});
  await prisma.paymentStatusHistory.deleteMany({});
  await prisma.paymentEvent.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderStatusHistory.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.inventoryReservation.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.driverDocument.deleteMany({});
  await prisma.vendorDocument.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.address.deleteMany({});
  await prisma.session.deleteMany({});
  await prisma.verification.deleteMany({});
  await prisma.account.deleteMany({});
  await prisma.customerProfile.deleteMany({});
  await prisma.driver.deleteMany({});
  await prisma.vendor.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("✅ All mock data cleared.");

  // ============================================================
  // 1. PLATFORM SETTINGS & METRICS
  // ============================================================
  console.log("⚙️  Ensuring platform settings...");

  const platformSettings = [
    { key: "delivery_fee", value: "49.00", description: "Flat delivery fee in INR" },
    { key: "tax_rate", value: "0.18", description: "GST rate (18%)" },
    {
      key: "free_delivery_threshold",
      value: "500.00",
      description: "Free delivery above this amount (INR)",
    },
    {
      key: "order_cancel_window_minutes",
      value: "5",
      description: "Minutes after placement customer can cancel",
    },
    {
      key: "driver_search_radius_km",
      value: "10",
      description: "Radius to search for drivers (km)",
    },
    {
      key: "driver_assignment_expiry_seconds",
      value: "60",
      description: "Seconds driver has to respond to assignment",
    },
    {
      key: "max_driver_assignment_retries",
      value: "3",
      description: "Max auto-assignment retry attempts",
    },
    {
      key: "review_window_hours",
      value: "72",
      description: "Hours after delivery to submit review",
    },
  ];

  for (const setting of platformSettings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`✅ ${platformSettings.length} platform settings verified`);

  // ============================================================
  // 2. PRODUCT CATEGORIES (Platform Functionality)
  // ============================================================
  console.log("📦 Ensuring product categories...");

  const categories = [
    {
      name: "Food & Groceries",
      slug: "food-groceries",
      description: "Fresh produce, dairy, packaged foods",
      sortOrder: 1,
    },
    {
      name: "Restaurants",
      slug: "restaurants",
      description: "Hot meals & snacks from local restaurants",
      sortOrder: 2,
    },
    {
      name: "Electronics",
      slug: "electronics",
      description: "Phones, accessories, gadgets",
      sortOrder: 3,
    },
    {
      name: "Health & Beauty",
      slug: "health-beauty",
      description: "Medicines, skincare, wellness",
      sortOrder: 4,
    },
    { name: "Fashion", slug: "fashion", description: "Clothing, shoes, accessories", sortOrder: 5 },
    {
      name: "Home & Kitchen",
      slug: "home-kitchen",
      description: "Furniture, appliances, decor",
      sortOrder: 6,
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} product categories verified`);

  // ============================================================
  // 3. ADMIN USER (Admin Web)
  // ============================================================
  console.log("👤 Creating 1 test Admin user...");
  const adminEmail = "admin@delivery.com";
  const adminUser = await prisma.user.create({
    data: {
      name: "Platform Admin",
      email: adminEmail,
      emailVerified: true,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  await createOrUpdateUserPassword(adminUser.id, DEFAULT_PASSWORD);
  console.log(`✅ Admin: ${adminEmail} (password: ${DEFAULT_PASSWORD})`);

  // ============================================================
  // 4. VENDOR USER (Vendor Mobile / Store Management)
  // ============================================================
  console.log("🏪 Creating 1 test Vendor user & store...");
  const vendorEmail = "vendor@delivery.com";
  const vendorUser = await prisma.user.create({
    data: {
      name: "Test Vendor",
      email: vendorEmail,
      emailVerified: true,
      role: "VENDOR",
      status: "ACTIVE",
    },
  });
  await createOrUpdateUserPassword(vendorUser.id, DEFAULT_PASSWORD);

  await prisma.vendor.create({
    data: {
      userId: vendorUser.id,
      storeName: "Test Restaurant",
      description: "Test vendor store ready for menu items and orders",
      address: "104 Market Street, Koramangala 4th Block",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560034",
      country: "IN",
      latitude: 12.93524,
      longitude: 77.6245,
      status: "ACTIVE",
      isOpen: true,
    },
  });
  console.log(`✅ Vendor: ${vendorEmail} (password: ${DEFAULT_PASSWORD}) with clean store (0 items)`);

  // ============================================================
  // 5. DRIVER / RIDER USER (Driver Mobile)
  // ============================================================
  console.log("🚴 Creating 1 test Rider / Driver user...");
  const driverEmail = "driver@delivery.com";
  const driverUser = await prisma.user.create({
    data: {
      name: "Test Rider",
      email: driverEmail,
      emailVerified: true,
      role: "DRIVER",
      status: "ACTIVE",
    },
  });
  await createOrUpdateUserPassword(driverUser.id, DEFAULT_PASSWORD);

  await prisma.driver.create({
    data: {
      userId: driverUser.id,
      status: "ACTIVE",
      availability: "AVAILABLE",
      vehicleType: "Motorcycle",
      vehicleNumber: "KA01AB1234",
      licenseNumber: "DL-0420110012345",
    },
  });
  console.log(`✅ Rider: ${driverEmail} (password: ${DEFAULT_PASSWORD})`);

  // ============================================================
  // 6. CUSTOMER USER (Customer Mobile)
  // ============================================================
  console.log("🛒 Creating 1 test Customer user...");
  const customerEmail = "customer@delivery.com";
  const customerUser = await prisma.user.create({
    data: {
      name: "Test Customer",
      email: customerEmail,
      emailVerified: true,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });
  await createOrUpdateUserPassword(customerUser.id, DEFAULT_PASSWORD);

  const customerProfile = await prisma.customerProfile.create({
    data: { userId: customerUser.id },
  });

  await prisma.cart.create({
    data: { customerId: customerProfile.id },
  });

  await prisma.address.create({
    data: {
      userId: customerUser.id,
      recipientName: "Test Customer",
      phone: "+919876543210",
      addressLine1: "123 Indiranagar 100ft Road",
      city: "Bengaluru",
      state: "Karnataka",
      postalCode: "560038",
      country: "IN",
      latitude: 12.9716,
      longitude: 77.6412,
      isDefault: true,
    },
  });
  console.log(`✅ Customer: ${customerEmail} (password: ${DEFAULT_PASSWORD})`);

  console.log("\n============================================================");
  console.log("🎉 Database Cleaned & Reset to Pure Test State!");
  console.log("============================================================");
  console.log("• Admin:    admin@delivery.com    / Password123");
  console.log("• Customer: customer@delivery.com / Password123");
  console.log("• Vendor:   vendor@delivery.com   / Password123 (1 Store, 0 Items)");
  console.log("• Rider:    driver@delivery.com   / Password123");
  console.log("• Categories & Platform Settings Preserved");
  console.log("• All mock products, orders, deliveries, and reviews cleared");
  console.log("============================================================\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

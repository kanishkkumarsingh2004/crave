/**
 * Prisma Seed — Multi-Role Delivery Platform
 *
 * Creates initial data:
 * 1. Platform admin user (admin@delivery.com / Password123)
 * 2. Product categories
 * 3. Platform settings
 * 4. Seed Vendor, Driver, and Customer accounts (Password123)
 *
 * Run: pnpm prisma:seed
 * spec: database-spec.md Seed section
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
  console.log("🌱 Starting database seed...");

  // ============================================================
  // 1. PLATFORM SETTINGS
  // ============================================================
  console.log("⚙️  Creating platform settings...");

  const platformSettings = [
    { key: "delivery_fee", value: "49.00", description: "Flat delivery fee in INR" },
    { key: "tax_rate", value: "0.18", description: "GST rate (18%)" },
    { key: "free_delivery_threshold", value: "500.00", description: "Free delivery above this amount (INR)" },
    { key: "order_cancel_window_minutes", value: "5", description: "Minutes after placement customer can cancel" },
    { key: "driver_search_radius_km", value: "10", description: "Radius to search for drivers (km)" },
    { key: "driver_assignment_expiry_seconds", value: "60", description: "Seconds driver has to respond to assignment" },
    { key: "max_driver_assignment_retries", value: "3", description: "Max auto-assignment retry attempts" },
    { key: "review_window_hours", value: "72", description: "Hours after delivery to submit review" },
  ];

  for (const setting of platformSettings) {
    await prisma.platformSetting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }

  console.log(`✅ Created ${platformSettings.length} platform settings`);

  // ============================================================
  // 2. PRODUCT CATEGORIES
  // ============================================================
  console.log("📦 Creating product categories...");

  const categories = [
    { name: "Food & Groceries", slug: "food-groceries", description: "Fresh produce, dairy, packaged foods", sortOrder: 1 },
    { name: "Restaurants", slug: "restaurants", description: "Meals from local restaurants", sortOrder: 2 },
    { name: "Electronics", slug: "electronics", description: "Phones, accessories, gadgets", sortOrder: 3 },
    { name: "Health & Beauty", slug: "health-beauty", description: "Medicines, skincare, wellness", sortOrder: 4 },
    { name: "Fashion", slug: "fashion", description: "Clothing, shoes, accessories", sortOrder: 5 },
    { name: "Home & Kitchen", slug: "home-kitchen", description: "Furniture, appliances, decor", sortOrder: 6 },
    { name: "Sports & Outdoors", slug: "sports-outdoors", description: "Fitness equipment, sportswear", sortOrder: 7 },
    { name: "Books & Stationery", slug: "books-stationery", description: "Books, notebooks, office supplies", sortOrder: 8 },
    { name: "Toys & Games", slug: "toys-games", description: "Children toys, board games", sortOrder: 9 },
    { name: "Pet Supplies", slug: "pet-supplies", description: "Food and accessories for pets", sortOrder: 10 },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  console.log(`✅ Created ${categories.length} categories`);

  // ============================================================
  // 3. ADMIN USER (seed-only — not via public signup)
  // ============================================================
  console.log("👤 Creating admin user...");

  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@delivery.com";

  let adminUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        name: "Platform Admin",
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
        status: "ACTIVE",
      },
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
  }

  await createOrUpdateUserPassword(adminUser.id, DEFAULT_PASSWORD);
  console.log(`🔑 Admin password set to '${DEFAULT_PASSWORD}'`);

  // ============================================================
  // 4. SEED VENDORS, DRIVERS, CUSTOMERS (development & demo)
  // ============================================================
  if (process.env.NODE_ENV === "development" || true) {
    console.log("🏪 Creating seed vendor...");

    const vendorEmail = "vendor@delivery.com";
    let vendorUser = await prisma.user.findUnique({
      where: { email: vendorEmail },
      select: { id: true },
    });

    if (!vendorUser) {
      vendorUser = await prisma.user.create({
        data: {
          name: "Test Vendor",
          email: vendorEmail,
          emailVerified: true,
          role: "VENDOR",
          status: "ACTIVE",
        },
      });
    }

    await createOrUpdateUserPassword(vendorUser.id, DEFAULT_PASSWORD);

    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: vendorUser.id },
      select: { id: true },
    });

    if (!existingVendor) {
      const vendor = await prisma.vendor.create({
        data: {
          userId: vendorUser.id,
          storeName: "Test Store",
          description: "A test vendor store for development",
          status: "ACTIVE",
          isOpen: true,
          city: "Mumbai",
          state: "Maharashtra",
          country: "IN",
        },
      });

      // Get first category
      const category = await prisma.category.findFirst({ select: { id: true } });
      if (category) {
        const product = await prisma.product.create({
          data: {
            vendorId: vendor.id,
            categoryId: category.id,
            name: "Test Product",
            sku: "TEST-001",
            price: 99.00,
            status: "ACTIVE",
            description: "A sample product for testing",
          },
        });

        await prisma.inventory.create({
          data: {
            productId: product.id,
            onHand: 100,
            lowStockThreshold: 10,
          },
        });
      }

      console.log(`✅ Seed vendor created: ${vendorEmail} (password: ${DEFAULT_PASSWORD})`);
    }

    // Seed driver
    console.log("🚴 Creating seed driver...");
    const driverEmail = "driver@delivery.com";
    let driverUser = await prisma.user.findUnique({
      where: { email: driverEmail },
      select: { id: true },
    });

    if (!driverUser) {
      driverUser = await prisma.user.create({
        data: {
          name: "Test Driver",
          email: driverEmail,
          emailVerified: true,
          role: "DRIVER",
          status: "ACTIVE",
        },
      });
    }

    await createOrUpdateUserPassword(driverUser.id, DEFAULT_PASSWORD);

    const existingDriver = await prisma.driver.findUnique({
      where: { userId: driverUser.id },
      select: { id: true },
    });

    if (!existingDriver) {
      await prisma.driver.create({
        data: {
          userId: driverUser.id,
          status: "ACTIVE",
          availability: "AVAILABLE",
          vehicleType: "Motorcycle",
          vehicleNumber: "MH01AB1234",
          licenseNumber: "DL-0420110012345",
        },
      });
      console.log(`✅ Seed driver created: ${driverEmail} (password: ${DEFAULT_PASSWORD})`);
    }

    // Seed customer
    console.log("🛒 Creating seed customer...");
    const customerEmail = "customer@delivery.com";
    let customerUser = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });

    if (!customerUser) {
      customerUser = await prisma.user.create({
        data: {
          name: "Test Customer",
          email: customerEmail,
          emailVerified: true,
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });
    }

    await createOrUpdateUserPassword(customerUser.id, DEFAULT_PASSWORD);

    const existingCustomerProfile = await prisma.customerProfile.findUnique({
      where: { userId: customerUser.id },
      select: { id: true },
    });

    if (!existingCustomerProfile) {
      const profile = await prisma.customerProfile.create({
        data: { userId: customerUser.id },
      });

      await prisma.cart.create({
        data: {
          customerId: profile.id,
        },
      });

      console.log(`✅ Seed customer created: ${customerEmail} (password: ${DEFAULT_PASSWORD})`);
    }

    // Seed sample orders & payments for live sync between admin and vendor app
    const testVendor = await prisma.vendor.findFirst({
      where: { storeName: "Test Store" },
      select: { id: true },
    });
    const testCustomer = await prisma.user.findFirst({
      where: { email: "customer@delivery.com" },
      select: { id: true },
    });
    const testProduct = await prisma.product.findFirst({
      where: { sku: "TEST-001" },
      select: { id: true, name: true, price: true },
    });

    if (testVendor && testCustomer && testProduct) {
      const orderCount = await prisma.order.count({ where: { vendorId: testVendor.id } });
      if (orderCount === 0) {
        console.log("🧾 Creating seed orders and payments...");

        const sampleOrders = [
          {
            orderNumber: "ORD-10001",
            status: "DELIVERED" as const,
            paymentStatus: "PAID" as const,
            subtotal: 495.00,
            deliveryFee: 49.00,
            tax: 89.10,
            total: 633.10,
            recipient: "Alice Smith",
          },
          {
            orderNumber: "ORD-10002",
            status: "DELIVERED" as const,
            paymentStatus: "PAID" as const,
            subtotal: 990.00,
            deliveryFee: 49.00,
            tax: 178.20,
            total: 1217.20,
            recipient: "Bob Johnson",
          },
          {
            orderNumber: "ORD-10003",
            status: "PREPARING" as const,
            paymentStatus: "PAID" as const,
            subtotal: 297.00,
            deliveryFee: 49.00,
            tax: 53.46,
            total: 399.46,
            recipient: "Charlie Brown",
          },
        ];

        for (const o of sampleOrders) {
          await prisma.order.create({
            data: {
              orderNumber: o.orderNumber,
              customerId: testCustomer.id,
              vendorId: testVendor.id,
              status: o.status,
              paymentStatus: o.paymentStatus,
              subtotal: o.subtotal,
              deliveryFee: o.deliveryFee,
              tax: o.tax,
              total: o.total,
              currency: "INR",
              deliveryRecipientName: o.recipient,
              deliveryPhone: "+919876543210",
              deliveryAddressLine1: "123 Main Street, Apt 4B",
              deliveryCity: "Mumbai",
              deliveryState: "Maharashtra",
              deliveryPostalCode: "400001",
              deliveredAt: o.status === "DELIVERED" ? new Date() : undefined,
              items: {
                create: [
                  {
                    productId: testProduct.id,
                    productName: testProduct.name,
                    sku: testProduct.sku || "SKU-TEST-001",
                    quantity: Math.round(o.subtotal / Number(testProduct.price)),
                    unitPrice: testProduct.price,
                    lineTotal: o.subtotal,
                  },
                ],
              },
              payment: {
                create: {
                  customerId: testCustomer.id,
                  provider: "stripe",
                  amount: o.total,
                  currency: "INR",
                  status: o.paymentStatus,
                },
              },
            },
          });
        }
        console.log(`✅ Created ${sampleOrders.length} seed orders with payments`);
      }
    }
  }

  console.log("\n✨ Seed complete! Default password for all seeded accounts: Password123");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

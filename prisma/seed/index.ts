/**
 * Prisma Seed — Multi-Role Delivery Platform
 *
 * Creates initial real database data for:
 * 1. Platform admin user (admin@delivery.com / Password123)
 * 2. Product categories
 * 3. Platform settings
 * 4. Seed Vendors, Drivers, Customers, Products, Inventory, Orders, & Deliveries
 *
 * Run: pnpm prisma:seed
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

  console.log(`✅ Created ${platformSettings.length} platform settings`);

  // ============================================================
  // 2. PRODUCT CATEGORIES
  // ============================================================
  console.log("📦 Creating product categories...");

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

  console.log(`✅ Created ${categories.length} categories`);

  // ============================================================
  // 3. ADMIN USER
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
  // 4. SEED VENDORS, PRODUCTS & INVENTORY
  // ============================================================
  console.log("🏪 Creating seed vendors and real products...");

  const vendorEmail = "vendor@delivery.com";
  let vendorUser = await prisma.user.findUnique({
    where: { email: vendorEmail },
    select: { id: true },
  });

  if (!vendorUser) {
    vendorUser = await prisma.user.create({
      data: {
        name: "Crave Organics Store",
        email: vendorEmail,
        emailVerified: true,
        role: "VENDOR",
        status: "ACTIVE",
      },
    });
  }

  await createOrUpdateUserPassword(vendorUser.id, DEFAULT_PASSWORD);

  let vendor = await prisma.vendor.findUnique({
    where: { userId: vendorUser.id },
  });

  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        userId: vendorUser.id,
        storeName: "Crave Organics",
        description: "Fresh organic food, farm produce, & groceries store",
        address: "104 Market Street, Station Area, Koramangala 4th Block",
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
  }

  // Seed Products
  const foodCategory = await prisma.category.findUnique({ where: { slug: "food-groceries" } });

  const sampleProducts = [
    {
      name: "Fresh Organic Milk 1L",
      sku: "MILK-001",
      price: 65.0,
      description: "100% Pure, pasteurized organic cow milk directly from dairy farms.",
    },
    {
      name: "Artisanal Whole Wheat Bread",
      sku: "BREAD-001",
      price: 45.0,
      description: "Freshly baked whole wheat artisanal sandwich bread.",
    },
    {
      name: "Farm Eggs (Pack of 12)",
      sku: "EGGS-012",
      price: 95.0,
      description: "Fresh brown farm-raised cage-free eggs packed with nutrients.",
    },
    {
      name: "Organic Shimla Apples 1kg",
      sku: "APPLES-1KG",
      price: 180.0,
      description: "Sweet, juicy, premium quality Shimla red apples.",
    },
  ];

  if (foodCategory && vendor) {
    for (const prod of sampleProducts) {
      const existingProd = await prisma.product.findFirst({
        where: { sku: prod.sku, vendorId: vendor.id },
      });

      if (!existingProd) {
        const createdProd = await prisma.product.create({
          data: {
            vendorId: vendor.id,
            categoryId: foodCategory.id,
            name: prod.name,
            sku: prod.sku,
            price: prod.price,
            status: "ACTIVE",
            description: prod.description,
          },
        });

        await prisma.inventory.create({
          data: {
            productId: createdProd.id,
            onHand: 150,
            lowStockThreshold: 15,
          },
        });
      }
    }
    console.log(`✅ Seeded ${sampleProducts.length} real products & inventory`);
  }

  // ============================================================
  // 5. SEED DRIVER
  // ============================================================
  console.log("🚴 Creating seed driver...");
  const driverEmail = "driver@delivery.com";
  let driverUser = await prisma.user.findUnique({
    where: { email: driverEmail },
    select: { id: true },
  });

  if (!driverUser) {
    driverUser = await prisma.user.create({
      data: {
        name: "Rahul Sharma Driver",
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

  // ============================================================
  // 6. SEED CUSTOMER & CUSTOMER ADDRESSES
  // ============================================================
  console.log("🛒 Creating seed customer profile & addresses...");
  const customerEmail = "customer@delivery.com";
  let customerUser = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true },
  });

  if (!customerUser) {
    customerUser = await prisma.user.create({
      data: {
        name: "Alice Smith Customer",
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

    // Add default customer address
    await prisma.customerAddress.create({
      data: {
        customerId: profile.id,
        recipientName: "Alice Smith",
        phone: "+919876543210",
        addressLine1: "123 Main Street, Apt 4B",
        city: "Bengaluru",
        state: "Karnataka",
        postalCode: "560034",
        country: "IN",
        latitude: 12.9425,
        longitude: 77.6165,
        isDefault: true,
      },
    });

    console.log(`✅ Seed customer created with default address: ${customerEmail}`);
  }

  // ============================================================
  // 7. SEED LIVE ORDERS WITH VERIFICATION OTP & PAYMENTS
  // ============================================================
  if (vendor && customerUser) {
    const orderCount = await prisma.order.count({ where: { vendorId: vendor.id } });
    if (orderCount === 0) {
      console.log("🧾 Creating seed orders and live delivery tracking data...");

      const firstProduct = await prisma.product.findFirst({
        where: { sku: "MILK-001" },
        select: { id: true, name: true, price: true, sku: true },
      });

      const sampleOrders = [
        {
          orderNumber: "ORD-10004",
          status: "PREPARING" as const,
          paymentStatus: "PAID" as const,
          subtotal: 585.0,
          deliveryFee: 49.0,
          tax: 105.3,
          total: 739.3,
          recipient: "Alice Smith",
        },
        {
          orderNumber: "ORD-10001",
          status: "DELIVERED" as const,
          paymentStatus: "PAID" as const,
          subtotal: 495.0,
          deliveryFee: 49.0,
          tax: 89.1,
          total: 633.1,
          recipient: "Alice Smith",
        },
        {
          orderNumber: "ORD-10002",
          status: "DELIVERED" as const,
          paymentStatus: "PAID" as const,
          subtotal: 990.0,
          deliveryFee: 49.0,
          tax: 178.2,
          total: 1217.2,
          recipient: "Bob Johnson",
        },
      ];

      for (const o of sampleOrders) {
        await prisma.order.create({
          data: {
            orderNumber: o.orderNumber,
            customerId: customerUser.id,
            vendorId: vendor.id,
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
            deliveryCity: "Bengaluru",
            deliveryState: "Karnataka",
            deliveryPostalCode: "560034",
            deliveredAt: o.status === "DELIVERED" ? new Date() : undefined,
            items: firstProduct
              ? {
                  create: [
                    {
                      productId: firstProduct.id,
                      productName: firstProduct.name,
                      sku: firstProduct.sku || "MILK-001",
                      quantity: 2,
                      unitPrice: firstProduct.price,
                      lineTotal: Number(firstProduct.price) * 2,
                    },
                  ],
                }
              : undefined,
            payment: {
              create: {
                customerId: customerUser.id,
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

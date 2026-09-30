/**
 * Vendor Module Service
 *
 * Handles vendor onboarding, profile management, store controls, order processing workflow,
 * earnings calculations, and store analytics per Phase 6 specification.
 */

import { prisma, OrderStatus, VendorStatus, ProductStatus } from "@delivery/database";
import type { UpdateVendorInput, OrderListQuery } from "@delivery/validation";

// Helper to resolve vendor ID from authenticated userId
async function getVendorByUserId(userId: string) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId },
  });
  if (!vendor) {
    throw new Error("Vendor account not found for current user");
  }
  return vendor;
}

// ============================================================
// PROFILE & STORE CONTROLS
// ============================================================

export async function getVendorProfile(userId: string) {
  const vendor = await getVendorByUserId(userId);
  const productsCount = await prisma.product.count({ where: { vendorId: vendor.id } });
  const ordersCount = await prisma.order.count({ where: { vendorId: vendor.id } });

  return {
    ...vendor,
    _count: {
      products: productsCount,
      orders: ordersCount,
    },
  };
}

export async function updateVendorProfile(userId: string, input: UpdateVendorInput) {
  const vendor = await getVendorByUserId(userId);

  return prisma.vendor.update({
    where: { id: vendor.id },
    data: input,
  });
}

export async function toggleStoreOpen(userId: string, isOpen: boolean) {
  const vendor = await getVendorByUserId(userId);

  if (vendor.status !== VendorStatus.APPROVED) {
    throw new Error("Store cannot be opened until application is APPROVED by Admin");
  }

  return prisma.vendor.update({
    where: { id: vendor.id },
    data: { isOpen },
    select: { id: true, storeName: true, isOpen: true, status: true },
  });
}

// ============================================================
// VENDOR DASHBOARD & EARNINGS
// ============================================================

export async function getVendorDashboard(userId: string) {
  const vendor = await getVendorByUserId(userId);

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [todayOrders, productsCount, lowStockCount] = await Promise.all([
    prisma.order.findMany({
      where: {
        vendorId: vendor.id,
        createdAt: { gte: startOfDay },
      },
      select: { id: true, status: true, total: true },
    }),
    prisma.product.count({
      where: { vendorId: vendor.id, status: ProductStatus.ACTIVE },
    }),
    prisma.inventory.count({
      where: {
        product: { vendorId: vendor.id },
        onHand: { lte: 5 },
      },
    }),
  ]);

  const pendingCount = todayOrders.filter((o) => o.status === OrderStatus.PENDING).length;
  const preparingCount = todayOrders.filter(
    (o) => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.PREPARING,
  ).length;
  const readyCount = todayOrders.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP).length;
  const completedCount = todayOrders.filter((o) => o.status === OrderStatus.DELIVERED).length;

  const todayRevenue = todayOrders
    .filter((o) => o.status === OrderStatus.DELIVERED)
    .reduce((sum, o) => sum + Number(o.total), 0);

  return {
    storeName: vendor.storeName,
    isOpen: vendor.isOpen,
    status: vendor.status,
    metrics: {
      todayRevenue: Math.round(todayRevenue * 100) / 100,
      todayTotalOrders: todayOrders.length,
      pendingOrders: pendingCount,
      preparingOrders: preparingCount,
      readyOrders: readyCount,
      completedOrders: completedCount,
      activeProducts: productsCount,
      lowStockAlerts: lowStockCount,
    },
  };
}

export async function getVendorEarnings(userId: string) {
  const vendor = await getVendorByUserId(userId);

  const completedOrders = await prisma.order.findMany({
    where: {
      vendorId: vendor.id,
      status: OrderStatus.DELIVERED,
    },
    select: {
      id: true,
      subtotal: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const grossSales = completedOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const platformFeeRate = 0.15; // 15% platform commission fee
  const platformFees = Math.round(grossSales * platformFeeRate * 100) / 100;
  const netEarnings = Math.round((grossSales - platformFees) * 100) / 100;

  return {
    grossSales: Math.round(grossSales * 100) / 100,
    platformCommissionRate: "15%",
    platformFees,
    netEarnings,
    fulfilledOrdersCount: completedOrders.length,
    recentTransactions: completedOrders.slice(0, 10).map((o) => ({
      orderId: o.id,
      grossSubtotal: Number(o.subtotal),
      netEarned: Math.round(Number(o.subtotal) * 0.85 * 100) / 100,
      date: o.createdAt,
    })),
  };
}

export async function getVendorAnalytics(userId: string) {
  const vendor = await getVendorByUserId(userId);

  const [totalOrders, cancelledOrders, topProducts] = await Promise.all([
    prisma.order.count({ where: { vendorId: vendor.id } }),
    prisma.order.count({ where: { vendorId: vendor.id, status: OrderStatus.CANCELLED } }),
    prisma.orderItem.groupBy({
      by: ["productId", "productName"],
      where: { order: { vendorId: vendor.id, status: OrderStatus.DELIVERED } },
      _sum: { quantity: true, lineTotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
  ]);

  const cancellationRate =
    totalOrders > 0 ? Math.round((cancelledOrders / totalOrders) * 10000) / 100 : 0;

  return {
    totalOrders,
    cancelledOrders,
    cancellationRate: `${cancellationRate}%`,
    topSellingProducts: topProducts.map((p) => ({
      productId: p.productId,
      name: p.productName,
      totalUnitsSold: p._sum.quantity ?? 0,
      totalRevenue: Number(p._sum.lineTotal ?? 0),
    })),
  };
}

// ============================================================
// ORDER PROCESSING WORKFLOW STATE MACHINE
// ============================================================

export async function getVendorOrders(userId: string, query: OrderListQuery) {
  const vendor = await getVendorByUserId(userId);

  const page = query.page ?? 1;
  const limit = query.limit ?? 20;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    vendorId: vendor.id,
  };

  if (query.status) where.status = query.status;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        delivery: {
          select: {
            id: true,
            status: true,
            driverId: true,
            driver: { select: { user: { select: { name: true, phone: true } } } },
          },
        },
        payment: { select: { id: true, status: true, amount: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    orders,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export async function getVendorOrderById(userId: string, orderId: string) {
  const vendor = await getVendorByUserId(userId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      delivery: {
        include: {
          driver: {
            include: {
              user: { select: { name: true, phone: true } },
            },
          },
        },
      },
      payment: true,
    },
  });

  if (!order || order.vendorId !== vendor.id) {
    throw new Error("Order not found or not owned by vendor");
  }

  return order;
}

/**
 * Action 1: Accept incoming order (PENDING -> CONFIRMED)
 */
export async function acceptVendorOrder(userId: string, orderId: string) {
  const vendor = await getVendorByUserId(userId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { vendorId: true, status: true },
  });

  if (!order || order.vendorId !== vendor.id) {
    throw new Error("Order not found or not owned by vendor");
  }

  if (order.status !== OrderStatus.PENDING) {
    throw new Error(`Cannot accept order in status "${order.status}". Must be in PENDING status.`);
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
    include: { items: true },
  });
}

/**
 * Action 2: Start order preparation (CONFIRMED -> PREPARING)
 */
export async function startVendorOrderPreparation(userId: string, orderId: string) {
  const vendor = await getVendorByUserId(userId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { vendorId: true, status: true },
  });

  if (!order || order.vendorId !== vendor.id) {
    throw new Error("Order not found or not owned by vendor");
  }

  if (order.status !== OrderStatus.CONFIRMED) {
    throw new Error(
      `Cannot start preparation for order in status "${order.status}". Must be CONFIRMED first.`,
    );
  }

  return prisma.order.update({
    where: { id: orderId },
    data: {
      status: OrderStatus.PREPARING,
      preparingAt: new Date(),
    },
    include: { items: true },
  });
}

/**
 * Action 3: Mark order ready for pickup (PREPARING -> READY_FOR_PICKUP)
 */
export async function markVendorOrderReady(userId: string, orderId: string) {
  const vendor = await getVendorByUserId(userId);

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { vendorId: true, status: true },
  });

  if (!order || order.vendorId !== vendor.id) {
    throw new Error("Order not found or not owned by vendor");
  }

  if (order.status !== OrderStatus.PREPARING) {
    throw new Error(
      `Cannot mark ready for pickup in status "${order.status}". Must be PREPARING first.`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: OrderStatus.READY_FOR_PICKUP,
        readyAt: new Date(),
      },
      include: { items: true },
    });

    // Update Delivery record status to ASSIGNING (ready for driver dispatch)
    await tx.delivery.updateMany({
      where: { orderId },
      data: { status: "ASSIGNING" },
    });

    return updatedOrder;
  });

  // Trigger dispatch engine to auto-assign driver
  try {
    const { dispatchDelivery } = await import("../deliveries");
    await dispatchDelivery(orderId);
  } catch (err) {
    console.error(`[Dispatch] Auto-dispatch failed for order ${orderId}:`, err);
  }

  return result;
}

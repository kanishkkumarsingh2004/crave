/**
 * GET /api/v1/admin/dashboard
 *
 * Returns platform-wide metrics for the admin dashboard.
 * Requires: ADMIN role
 *
 * spec: api-spec.md Admin Dashboard section
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import {
  UserStatus,
  VendorStatus,
  DriverStatus,
  OrderStatus,
  PaymentStatus,
  DeliveryStatus,
} from "@delivery/database";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const [
      totalCustomers,
      activeCustomers,
      totalVendors,
      activeVendors,
      pendingVendors,
      totalDrivers,
      activeDrivers,
      pendingDrivers,
      orderCounts,
      revenueData,
      activeDeliveries,
    ] = await Promise.all([
      // Customers
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "CUSTOMER", status: UserStatus.ACTIVE } }),

      // Vendors
      prisma.vendor.count(),
      prisma.vendor.count({ where: { status: VendorStatus.ACTIVE } }),
      prisma.vendor.count({ where: { status: VendorStatus.PENDING } }),

      // Drivers
      prisma.driver.count(),
      prisma.driver.count({ where: { status: DriverStatus.ACTIVE } }),
      prisma.driver.count({ where: { status: DriverStatus.PENDING } }),

      // Orders
      prisma.order.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),

      // Revenue (from PAID payments)
      prisma.payment.aggregate({
        where: { status: PaymentStatus.PAID },
        _sum: { amount: true },
      }),

      // Active deliveries
      prisma.delivery.count({
        where: {
          status: {
            in: [
              DeliveryStatus.ASSIGNED,
              DeliveryStatus.DRIVER_ACCEPTED,
              DeliveryStatus.PICKED_UP,
              DeliveryStatus.IN_TRANSIT,
              DeliveryStatus.ARRIVING,
            ],
          },
        },
      }),
    ]);

    // Process order counts
    const orderByStatus = Object.fromEntries(
      orderCounts.map((g) => [g.status, g._count._all]),
    ) as Record<string, number>;

    const totalOrders = Object.values(orderByStatus).reduce((sum, c) => sum + c, 0);

    const data = {
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
      vendors: {
        total: totalVendors,
        active: activeVendors,
        pending: pendingVendors,
      },
      drivers: {
        total: totalDrivers,
        active: activeDrivers,
        pending: pendingDrivers,
      },
      orders: {
        total: totalOrders,
        pending: orderByStatus[OrderStatus.PENDING] ?? 0,
        active:
          (orderByStatus[OrderStatus.CONFIRMED] ?? 0) +
          (orderByStatus[OrderStatus.PREPARING] ?? 0) +
          (orderByStatus[OrderStatus.READY_FOR_PICKUP] ?? 0) +
          (orderByStatus[OrderStatus.PICKED_UP] ?? 0) +
          (orderByStatus[OrderStatus.OUT_FOR_DELIVERY] ?? 0),
        completed: orderByStatus[OrderStatus.DELIVERED] ?? 0,
        cancelled: orderByStatus[OrderStatus.CANCELLED] ?? 0,
      },
      revenue: {
        total: revenueData._sum.amount?.toString() ?? "0",
        vendorRevenue: "0", // Calculated in Phase 6 with payment split logic
        driverPayments: "0",
        platformRevenue: "0",
      },
      deliveries: {
        active: activeDeliveries,
      },
    };

    return apiSuccess(data);
  } catch (err) {
    return apiInternalError(err);
  }
}

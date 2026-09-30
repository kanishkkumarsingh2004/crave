/**
 * GET /api/v1/admin/analytics/overview
 *
 * Returns daily order counts and revenue for the last N days.
 * Used by the Dashboard charts component.
 *
 * Query params:
 *   - days: number (default 30, max 90)
 *
 * Requires: ADMIN role
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { PaymentStatus } from "@delivery/database";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = Math.min(90, Math.max(1, parseInt(daysParam ?? "30", 10) || 30));

    const points: { date: string; orders: number; revenue: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const from = startOfDay(day);
      const to = endOfDay(day);
      const label = format(day, "MMM d");

      const [ordersCount, revenueAgg] = await Promise.all([
        prisma.order.count({
          where: { createdAt: { gte: from, lte: to } },
        }),
        prisma.payment.aggregate({
          where: {
            status: PaymentStatus.PAID,
            paidAt: { gte: from, lte: to },
          },
          _sum: { amount: true },
        }),
      ]);

      points.push({
        date: label,
        orders: ordersCount,
        revenue: parseFloat(revenueAgg._sum.amount?.toString() ?? "0"),
      });
    }

    return apiSuccess(points);
  } catch (err) {
    return apiInternalError(err);
  }
}

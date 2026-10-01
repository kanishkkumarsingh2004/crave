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

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = Math.min(90, Math.max(1, parseInt(daysParam ?? "30", 10) || 30));

    const fromDate = startOfDay(subDays(new Date(), days - 1));

    const [orders, payments] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: fromDate } },
        select: { createdAt: true },
      }),
      prisma.payment.findMany({
        where: {
          status: PaymentStatus.PAID,
          paidAt: { gte: fromDate },
        },
        select: { paidAt: true, amount: true },
      }),
    ]);

    const orderCountByDay = new Map<string, number>();
    for (const o of orders) {
      const dayKey = format(o.createdAt, "yyyy-MM-dd");
      orderCountByDay.set(dayKey, (orderCountByDay.get(dayKey) ?? 0) + 1);
    }

    const revenueByDay = new Map<string, number>();
    for (const p of payments) {
      if (p.paidAt) {
        const dayKey = format(p.paidAt, "yyyy-MM-dd");
        const val = parseFloat(p.amount?.toString() ?? "0");
        revenueByDay.set(dayKey, (revenueByDay.get(dayKey) ?? 0) + val);
      }
    }

    const points: { date: string; orders: number; revenue: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(new Date(), i);
      const dayKey = format(day, "yyyy-MM-dd");
      const label = format(day, "MMM d");
      points.push({
        date: label,
        orders: orderCountByDay.get(dayKey) ?? 0,
        revenue: Math.round((revenueByDay.get(dayKey) ?? 0) * 100) / 100,
      });
    }

    return apiSuccess(points);
  } catch (err) {
    return apiInternalError(err);
  }
}

/**
 * GET /api/v1/vendor/orders — List vendor incoming orders (filterable by status)
 *
 * Requires: VENDOR role
 * spec: Task 6.5
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { OrderStatus } from "@delivery/types";
import { getVendorOrders } from "@/../../../../server/modules/vendors";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const statusParam = searchParams.get("status");
    const status = statusParam ? (statusParam as OrderStatus) : undefined;

    const result = await getVendorOrders(ctx.userId, { page, limit, status });
    return apiSuccess(result.orders, 200, result.meta);
  } catch (err) {
    return apiInternalError(err);
  }
}

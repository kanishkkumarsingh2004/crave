/**
 * GET /api/v1/customer/orders — Customer order history list
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import type { OrderStatus } from "@delivery/types";
import { getCustomerOrders } from "@/../../../../server/modules/orders";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const statusParam = searchParams.get("status");
    const status = statusParam ? (statusParam as OrderStatus) : undefined;

    const result = await getCustomerOrders(ctx.userId, { page, limit, status });
    return apiSuccess(result.orders, 200, result.meta);
  } catch (err) {
    return apiInternalError(err);
  }
}

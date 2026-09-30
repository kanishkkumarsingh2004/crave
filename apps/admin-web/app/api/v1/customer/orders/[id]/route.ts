/**
 * GET /api/v1/customer/orders/[id] — Customer order detail & tracking info
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getCustomerOrderById } from "@/../../../../server/modules/orders";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id } = await params;
    const order = await getCustomerOrderById(ctx.userId, id);
    if (!order) return apiNotFound("Order");
    return apiSuccess(order);
  } catch (err) {
    if (err instanceof Error) {
      return Response.json(
        { success: false, error: { code: "NOT_FOUND", message: err.message } },
        { status: 404 },
      );
    }
    return apiInternalError(err);
  }
}

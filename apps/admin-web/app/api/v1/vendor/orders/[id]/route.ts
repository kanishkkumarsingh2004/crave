/**
 * GET /api/v1/vendor/orders/[id] — Get order detail for vendor
 *
 * Requires: VENDOR role
 * spec: Task 6.5
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getVendorOrderById } from "@/../../../../server/modules/vendors";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const order = await getVendorOrderById(ctx.userId, id);
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

/**
 * POST /api/v1/vendor/orders/[id]/accept — Accept order (PENDING -> CONFIRMED)
 *
 * Requires: VENDOR role
 * spec: Task 6.5
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { acceptVendorOrder } from "@/../../../../server/modules/vendors";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const order = await acceptVendorOrder(ctx.userId, id);
    return apiSuccess(order);
  } catch (err) {
    if (err instanceof Error) {
      return apiError("BAD_REQUEST", err.message, 400);
    }
    return apiInternalError(err);
  }
}

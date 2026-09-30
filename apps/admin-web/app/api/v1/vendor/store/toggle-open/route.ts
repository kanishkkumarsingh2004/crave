/**
 * POST /api/v1/vendor/store/toggle-open — Toggle store open/closed status
 *
 * Requires: VENDOR role (and APPROVED vendor status)
 * spec: Task 6.7
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { toggleStoreOpen } from "@/../../../../server/modules/vendors";

export async function POST(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const body = (await request.json()) as { isOpen?: boolean };
    if (typeof body.isOpen !== "boolean") {
      return apiError("BAD_REQUEST", "Boolean 'isOpen' field is required", 400);
    }

    const updated = await toggleStoreOpen(ctx.userId, body.isOpen);
    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof Error) {
      return apiError("BAD_REQUEST", err.message, 400);
    }
    return apiInternalError(err);
  }
}

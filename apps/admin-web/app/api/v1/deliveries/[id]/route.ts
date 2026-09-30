/**
 * GET /api/v1/deliveries/[id] — Fetch single delivery details
 *
 * Requires: Authenticated User
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getDeliveryById } from "@/../../../../server/modules/deliveries";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await withAuth(request);
  if (error) return error;

  try {
    const { id } = await params;
    const delivery = await getDeliveryById(id);
    if (!delivery) {
      return apiNotFound("Delivery not found");
    }
    return apiSuccess(delivery);
  } catch (err) {
    return apiInternalError(err);
  }
}

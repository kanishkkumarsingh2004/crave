/**
 * POST /api/v1/deliveries/[id]/complete — Driver completes delivery via OTP verification
 *
 * Requires: DRIVER role
 */

import { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiBadRequest,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { completeDelivery } from "@/../../../../server/modules/deliveries";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id } = await params;
    const body = (await request.json()) as { otp?: string };

    if (!body.otp) {
      return apiBadRequest("OTP code is required to complete delivery");
    }

    const delivery = await completeDelivery(ctx.userId, id, body.otp);
    return apiSuccess(delivery);
  } catch (err: any) {
    if (err.message && (err.message.includes("OTP") || err.message.includes("not assigned"))) {
      return apiBadRequest(err.message);
    }
    return apiInternalError(err);
  }
}

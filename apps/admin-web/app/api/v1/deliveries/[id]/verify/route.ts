/**
 * POST /api/v1/deliveries/[id]/verify
 *
 * Driver delivery handoff verification API endpoint.
 * Supports QR scan or 6-digit code entry verification.
 *
 * Requires: DRIVER role
 */

import type { NextRequest } from "next/server";
import { withDriver } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { verifyDeliveryHandover } from "@/../../../../server/modules/deliveries/verification.service";
import { z } from "zod";

const zVerifyPayload = z.object({
  method: z.enum(["QR", "CODE"]),
  token: z.string().optional(),
  code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await withDriver(request);
  if (error) return error;

  try {
    const { id: deliveryId } = await params;
    const body = (await request.json()) as unknown;
    const input = zVerifyPayload.parse(body);

    const driverId = ctx.userId;

    const result = await verifyDeliveryHandover({
      deliveryId,
      driverId,
      method: input.method,
      token: input.token,
      code: input.code,
      latitude: input.latitude,
      longitude: input.longitude,
      accuracy: input.accuracy,
    });

    return apiSuccess(result);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return apiValidationError(err);
    }
    return apiError("VERIFICATION_FAILED", err.message || "Delivery verification failed", 400);
  }
}

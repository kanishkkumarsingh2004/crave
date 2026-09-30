/**
 * GET   /api/v1/vendor/profile — Get vendor profile & store details
 * PATCH /api/v1/vendor/profile — Update vendor store profile
 *
 * Requires: VENDOR role
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zUpdateVendor, ZodError } from "@delivery/validation";
import { getVendorProfile, updateVendorProfile } from "@/../../../../server/modules/vendors";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const profile = await getVendorProfile(ctx.userId);
    return apiSuccess(profile);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zUpdateVendor.parse(body);

    const updated = await updateVendorProfile(ctx.userId, input);
    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

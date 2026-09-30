/**
 * GET   /api/v1/customer/profile — Get profile info & default address
 * PATCH /api/v1/customer/profile — Update customer name, phone, default address
 *
 * Requires: CUSTOMER role
 */

import { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zUpdateCustomerProfile, ZodError } from "@delivery/validation";
import { getCustomerProfile, updateCustomerProfile } from "@/../../../../server/modules/customers";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const profile = await getCustomerProfile(ctx.userId);
    if (!profile) return apiNotFound("Customer profile");
    return apiSuccess(profile);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zUpdateCustomerProfile.parse(body);

    const updated = await updateCustomerProfile(ctx.userId, input);
    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

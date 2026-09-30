/**
 * GET  /api/v1/customer/addresses — List all saved addresses
 * POST /api/v1/customer/addresses — Create new address
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiCreated,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zCreateAddress, ZodError } from "@delivery/validation";
import {
  getCustomerAddresses,
  createCustomerAddress,
} from "@/../../../../server/modules/customers";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const addresses = await getCustomerAddresses(ctx.userId);
    return apiSuccess(addresses);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zCreateAddress.parse(body);

    const address = await createCustomerAddress(ctx.userId, input);
    return apiCreated(address);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

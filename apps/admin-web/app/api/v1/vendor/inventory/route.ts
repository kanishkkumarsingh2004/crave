/**
 * GET /api/v1/vendor/inventory — Vendor list inventory for all products
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { getVendorInventory } from "@/../../../../server/modules/inventory";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const inventory = await getVendorInventory(vendor.id);
    return apiSuccess(inventory);
  } catch (err) {
    return apiInternalError(err);
  }
}

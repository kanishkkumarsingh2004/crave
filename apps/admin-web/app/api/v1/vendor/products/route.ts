/**
 * GET  /api/v1/vendor/products — Vendor list own products
 * POST /api/v1/vendor/products — Vendor create product
 */

import type { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiCreated,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { zCreateProduct } from "@delivery/validation";
import { createVendorProduct } from "@/../../../../server/modules/catalog";
import { ZodError } from "@delivery/validation";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!vendor) throw new Error("Vendor profile not found");

    const products = await prisma.product.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: "desc" },
      include: {
        category: { select: { id: true, name: true } },
        inventory: { select: { onHand: true, reserved: true, lowStockThreshold: true } },
      },
    });

    return apiSuccess(products);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });

    if (!vendor) throw new Error("Vendor profile not found");

    const body = (await request.json()) as unknown;
    const input = zCreateProduct.parse(body);

    const product = await createVendorProduct(vendor.id, input);
    return apiCreated(product);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    if (err instanceof Error) {
      return Response.json(
        { success: false, error: { code: "BAD_REQUEST", message: err.message } },
        { status: 400 },
      );
    }
    return apiInternalError(err);
  }
}

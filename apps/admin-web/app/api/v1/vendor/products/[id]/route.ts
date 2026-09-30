/**
 * GET    /api/v1/vendor/products/[id] — Get own product
 * PATCH  /api/v1/vendor/products/[id] — Update own product
 * DELETE /api/v1/vendor/products/[id] — Delete own product
 */

import { NextRequest } from "next/server";
import { withVendor } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { zUpdateProduct } from "@delivery/validation";
import { updateVendorProduct } from "@/../../../../server/modules/catalog";
import { ZodError } from "@delivery/validation";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        inventory: true,
      },
    });

    if (!product || product.vendorId !== vendor.id) return apiNotFound("Product");
    return apiSuccess(product);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const body = (await request.json()) as unknown;
    const input = zUpdateProduct.parse(body);

    const updated = await updateVendorProduct(id, vendor.id, input);
    return apiSuccess(updated);
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

export async function DELETE(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withVendor(request);
  if (error) return error;

  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { userId: ctx.userId },
      select: { id: true },
    });
    if (!vendor) return apiNotFound("Vendor");

    const product = await prisma.product.findUnique({
      where: { id },
      select: { vendorId: true },
    });
    if (!product || product.vendorId !== vendor.id) return apiNotFound("Product");

    await prisma.product.delete({ where: { id } });
    return apiSuccess({ deleted: true });
  } catch (err) {
    return apiInternalError(err);
  }
}

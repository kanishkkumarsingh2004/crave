/**
 * GET /api/v1/products — Public API to browse products
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/lib/server/response";
import { prisma, ProductStatus } from "@/lib/db";
import { buildPaginationMeta } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const vendorId = searchParams.get("vendorId") ?? undefined;
    const categoryId = searchParams.get("categoryId") ?? undefined;
    const search = searchParams.get("search") ?? undefined;

    const where: any = { status: ProductStatus.ACTIVE };
    if (vendorId) where.vendorId = vendorId;
    if (categoryId) where.categoryId = categoryId;
    if (search) where.name = { contains: search, mode: "insensitive" };

    const total = await prisma.product.count({ where });
    const products = await prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { vendor: true, category: true },
    });

    return apiSuccess(products, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    return apiInternalError(err);
  }
}

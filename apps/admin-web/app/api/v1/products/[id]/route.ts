/**
 * GET /api/v1/products/[id] — Public API for product details
 */

import type { NextRequest } from "next/server";
import {
  apiSuccess,
  apiNotFound,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getProductById } from "@/../../../../server/modules/catalog";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await getProductById(id);
    if (!product) return apiNotFound("Product");
    return apiSuccess(product);
  } catch (err) {
    return apiInternalError(err);
  }
}

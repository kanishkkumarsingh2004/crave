/**
 * GET /api/v1/vendors — Public API to list approved vendors
 */

import type { NextRequest } from "next/server";
import { prisma, VendorStatus } from "@delivery/database";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";

export async function GET(_request: NextRequest) {
  try {
    const vendors = await prisma.vendor.findMany({
      where: {
        status: VendorStatus.APPROVED,
      },
      select: {
        id: true,
        storeName: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        isOpen: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return apiSuccess(vendors);
  } catch (err) {
    return apiInternalError(err);
  }
}

/**
 * GET /api/v1/public/settings
 *
 * Public endpoint for fetching live platform payee UPI settings, delivery fees, and tax rates.
 * Used by Customer Mobile App and Vendor App for checkout & payment generation.
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/lib/server/response";
import { prisma } from "@/lib/db";

export async function GET(_request: NextRequest) {
  try {
    const settings = await prisma.platformSetting.findMany({
      where: {
        key: {
          in: [
            "upi.payee_address",
            "upi.payee_name",
            "upi.mcc_code",
            "delivery.base_fee",
            "platform.commission_rate",
          ],
        },
      },
    });

    const settingsMap = Object.fromEntries(settings.map((s) => [s.key, s.value]));

    const data = {
      upiPayeeAddress: settingsMap["upi.payee_address"] || "blinkbite.store@okaxis",
      upiPayeeName: settingsMap["upi.payee_name"] || "Blinkbite QuickCommerce",
      upiMccCode: settingsMap["upi.mcc_code"] || "5411",
      baseDeliveryFee: parseFloat(settingsMap["delivery.base_fee"] || "49.00"),
      commissionRatePercent: parseFloat(settingsMap["platform.commission_rate"] || "15.0"),
    };

    return apiSuccess(data);
  } catch (err) {
    return apiInternalError(err);
  }
}

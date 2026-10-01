/**
 * GET /api/v1/customer/orders/[id]/verification
 *
 * Fetches or generates the active delivery verification QR code & 6-digit code for a customer order.
 *
 * Requires: CUSTOMER role
 */

import type { NextRequest } from "next/server";
import { withCustomer } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { getOrCreateDeliveryCredential } from "@/../../../../server/modules/deliveries/verification.service";
import { prisma } from "@delivery/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { ctx, error } = await withCustomer(request);
  if (error) return error;

  try {
    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { delivery: true },
    });

    if (!order || order.customerId !== ctx.userId) {
      return apiError("NOT_FOUND", "Order not found or unauthorized", 404);
    }

    let deliveryId = order.delivery?.id;

    if (!deliveryId) {
      // Find or create active delivery for order
      const delivery = await prisma.delivery.findUnique({
        where: { orderId: order.id },
      });
      deliveryId = delivery?.id;
    }

    if (!deliveryId) {
      return apiError("INVALID_STATE", "Order is not yet assigned for delivery", 400);
    }

    const credential = await getOrCreateDeliveryCredential(deliveryId);

    return apiSuccess({
      orderId: order.id,
      orderNumber: order.orderNumber,
      sixDigitCode: credential.sixDigitCode,
      qrPayload: credential.qrPayload,
      expiresAt: credential.expiresAt,
      status: credential.status,
    });
  } catch (err: any) {
    return apiInternalError(err);
  }
}

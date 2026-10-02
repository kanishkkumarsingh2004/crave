/**
 * POST /api/v1/payments/webhook — Payment Gateway Webhook Ingestion
 *
 * Unauthenticated (validates webhook signatures and enforces idempotency via PaymentEvent table)
 */

import type { NextRequest } from "next/server";
import { apiSuccess, apiInternalError } from "@/../../../../server/infrastructure/response";
import { processPaymentWebhook } from "@/../../../../server/modules/payments";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const provider = request.nextUrl.searchParams.get("provider") || "stripe";
    const signature = request.headers.get("stripe-signature") || "";

    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      payload = {};
    }

    const result = await processPaymentWebhook(provider, payload, rawBody, signature);
    return apiSuccess(result);
  } catch (err) {
    return apiInternalError(err);
  }
}

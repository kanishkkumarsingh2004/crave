/**
 * GET /api/v1/admin/payments  — List all payments (admin view)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Admin Payment Management
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../server/infrastructure/response";
import { prisma } from "@delivery/database";
import { normalizePagination, buildPaginationMeta } from "@delivery/utils";
import { zPaginationQuery } from "@delivery/validation";
import { z, ZodError } from "zod";
import { PaymentStatus } from "@delivery/database";
import type { Prisma } from "@delivery/database";

const zPaymentListQuery = zPaginationQuery.extend({
  status: z.nativeEnum(PaymentStatus).optional(),
  provider: z.string().optional(),
  customerId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const raw = Object.fromEntries(request.nextUrl.searchParams);
    const query = zPaymentListQuery.parse(raw);
    const { page, limit, skip } = normalizePagination(query);

    const where: Prisma.PaymentWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.provider) where.provider = query.provider;
    if (query.customerId) where.customerId = query.customerId;

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderId: true,
          customerId: true,
          provider: true,
          providerPaymentId: true,
          amount: true,
          currency: true,
          status: true,
          paidAt: true,
          failedAt: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              orderNumber: true,
              vendor: { select: { id: true, storeName: true } },
            },
          },
          refunds: {
            select: { id: true, amount: true, status: true, createdAt: true },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return apiSuccess(payments, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

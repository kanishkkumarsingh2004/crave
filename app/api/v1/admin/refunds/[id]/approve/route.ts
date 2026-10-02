/**
 * POST /api/v1/admin/refunds/[id]/approve
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth";
import { apiSuccess } from "@/lib/server/response";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  const { id } = await params;
  return apiSuccess({ id, status: "APPROVED" });
}

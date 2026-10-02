/**
 * GET   /api/v1/admin/settings      — List all platform settings
 * POST  /api/v1/admin/settings      — Create a setting (upsert by key)
 *
 * Requires: ADMIN role
 * spec: api-spec.md Platform Settings
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth";
import {
  apiSuccess,
  apiCreated,
  apiInternalError,
  apiValidationError,
} from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { z, ZodError } from "zod";

const zCreateSetting = z.object({
  key: z.string().trim().min(1).max(200),
  value: z.string(),
  type: z.enum(["string", "number", "boolean", "json"]).default("string"),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const { ctx: _ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const settings = await prisma.platformSetting.findMany({
      orderBy: { key: "asc" },
    });
    return apiSuccess(settings);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function POST(request: NextRequest) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zCreateSetting.parse(body);

    const setting = await prisma.platformSetting.upsert({
      where: { key: input.key },
      update: {
        value: input.value,
        type: input.type,
        description: input.description,
        updatedBy: ctx.userId,
      },
      create: {
        key: input.key,
        value: input.value,
        type: input.type,
        description: input.description,
        updatedBy: ctx.userId,
      },
    });

    return apiCreated(setting);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

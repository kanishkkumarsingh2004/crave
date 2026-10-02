/**
 * GET   /api/v1/admin/settings/[key]    — Get a specific setting
 * PATCH /api/v1/admin/settings/[key]    — Update a specific setting
 * DELETE /api/v1/admin/settings/[key]   — Delete a setting
 *
 * Requires: ADMIN role
 */

import type { NextRequest } from "next/server";
import { withAdmin } from "@/lib/server/auth";
import {
  apiSuccess,
  apiNotFound,
  apiNoContent,
  apiInternalError,
  apiValidationError,
} from "@/lib/server/response";
import { prisma } from "@/lib/db";
import { z, ZodError } from "zod";

type Params = { params: Promise<{ key: string }> };

const zUpdateSetting = z.object({
  value: z.string(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { key } = await params;
    const setting = await prisma.platformSetting.findUnique({ where: { key } });
    if (!setting) return apiNotFound("Setting");
    return apiSuccess(setting);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { ctx, error } = await withAdmin(request);
  if (error) return error;

  try {
    const { key } = await params;
    const body = (await request.json()) as unknown;
    const input = zUpdateSetting.parse(body);

    const setting = await prisma.platformSetting.findUnique({
      where: { key },
      select: { key: true },
    });
    if (!setting) return apiNotFound("Setting");

    const updated = await prisma.platformSetting.update({
      where: { key },
      data: { value: input.value, description: input.description, updatedBy: ctx.userId },
    });

    return apiSuccess(updated);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { error } = await withAdmin(request);
  if (error) return error;

  try {
    const { key } = await params;
    const setting = await prisma.platformSetting.findUnique({
      where: { key },
      select: { key: true },
    });
    if (!setting) return apiNotFound("Setting");

    await prisma.platformSetting.delete({ where: { key } });
    return apiNoContent();
  } catch (err) {
    return apiInternalError(err);
  }
}

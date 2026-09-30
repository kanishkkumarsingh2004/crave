/**
 * GET /api/v1/notifications — Get authenticated user's notifications
 * PATCH /api/v1/notifications — Mark notifications as read
 *
 * Requires: Authenticated User
 */

import { NextRequest } from "next/server";
import { withAuth } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiInternalError,
  apiValidationError,
} from "@/../../../../server/infrastructure/response";
import { zMarkNotificationRead, ZodError } from "@delivery/validation";
import {
  getUserNotifications,
  markNotificationsAsRead,
} from "@/../../../../server/modules/notifications";

export async function GET(request: NextRequest) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getUserNotifications(ctx.userId, page, limit);
    return apiSuccess(result.data, 200, result.pagination);
  } catch (err) {
    return apiInternalError(err);
  }
}

export async function PATCH(request: NextRequest) {
  const { ctx, error } = await withAuth(request);
  if (error) return error;

  try {
    const body = (await request.json()) as unknown;
    const input = zMarkNotificationRead.parse(body);

    const result = await markNotificationsAsRead(ctx.userId, input.notificationIds);
    return apiSuccess(result);
  } catch (err) {
    if (err instanceof ZodError) return apiValidationError(err);
    return apiInternalError(err);
  }
}

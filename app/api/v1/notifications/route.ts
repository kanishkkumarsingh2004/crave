/**
 * GET /api/v1/notifications — Get authenticated user's notifications
 * PATCH /api/v1/notifications — Mark notifications as read
 */

import type { NextRequest } from "next/server";
import { apiSuccess } from "@/lib/server/response";

export async function GET(_request: NextRequest) {
  return apiSuccess([
    {
      id: "notif_1",
      title: "System Update",
      body: "Platform running standalone on port 3000.",
      read: false,
      createdAt: new Date().toISOString(),
    },
  ]);
}

export async function PATCH(_request: NextRequest) {
  return apiSuccess({ success: true });
}

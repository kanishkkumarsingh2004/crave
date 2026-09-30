/**
 * POST /api/v1/upload — File upload API (supports product images, documents, profile photos)
 *
 * Requires: Authenticated User
 * spec: Task 4.5 File Storage Integration
 */

import type { NextRequest } from "next/server";
import { withAuth } from "@/../../../../server/middleware/auth";
import {
  apiSuccess,
  apiError,
  apiInternalError,
} from "@/../../../../server/infrastructure/response";
import { saveLocalFile } from "@/../../../../server/infrastructure/storage";

export async function POST(request: NextRequest) {
  const { error } = await withAuth(request);
  if (error) return error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return apiError("BAD_REQUEST", "No file uploaded. Form data field must be 'file'.", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await saveLocalFile(buffer, file.name, file.type);

    return apiSuccess(result, 201);
  } catch (err) {
    if (err instanceof Error) {
      return apiError("BAD_REQUEST", err.message, 400);
    }
    return apiInternalError(err);
  }
}

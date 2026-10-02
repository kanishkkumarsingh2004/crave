/**
 * File Storage Infrastructure Service
 *
 * Provides file upload validation, MIME type checking, and storage provider abstractions
 * for product images, vendor documents, driver documents, and user avatars.
 */

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadResult {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

/**
 * Saves file to local public upload directory in dev/fallback mode
 */
export async function saveLocalFile(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string,
): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error(
      `File type ${mimeType} is not allowed. Allowed types: JPEG, PNG, WEBP, GIF, PDF.`,
    );
  }

  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File size exceeds maximum allowed limit of 10MB.`);
  }

  const ext = path.extname(originalFilename) || ".bin";
  const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
  const uploadDir = path.join(process.cwd(), "data", "uploads");

  await fs.mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, uniqueName);
  await fs.writeFile(filePath, fileBuffer);

  return {
    url: `/data/uploads/${uniqueName}`,
    filename: uniqueName,
    mimeType,
    size: fileBuffer.length,
  };
}

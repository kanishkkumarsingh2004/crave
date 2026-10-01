/**
 * GET /api/v1/downloads/[app] — Download Android APK & iOS IPA files for mobile apps
 *
 * Supported params: "customer" | "vendor" | "driver"
 * Query param: ?platform=android | ios
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: Promise<{ app: string }> }) {
  try {
    const { app } = await params;
    const platform = request.nextUrl.searchParams.get("platform") === "ios" ? "ios" : "android";

    const isIos = platform === "ios";
    const ext = isIos ? "ipa" : "apk";
    const fileName = `${app}-v1.0.0.${ext}`;

    const publicApkDir = path.join(process.cwd(), "public", "apk");
    const filePath = path.join(publicApkDir, fileName);

    // Verify binary exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json(
        { error: `${ext.toUpperCase()} build package not found for ${app}.` },
        { status: 404 },
      );
    }

    const fileBuffer = await fs.readFile(filePath);
    const contentType = isIos
      ? "application/octet-stream"
      : "application/vnd.android.package-archive";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Transfer-Encoding": "binary",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Download failed", details: String(err) }, { status: 500 });
  }
}

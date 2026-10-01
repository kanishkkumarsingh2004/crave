/**
 * GET /api/v1/health — Production System Health & Monitoring Endpoint
 *
 * Designed for Render, UptimeRobot, and Cron jobs to monitor server uptime,
 * verify PostgreSQL database connectivity, track memory metrics, and prevent
 * free-tier web services from sleeping.
 */

import { NextResponse } from "next/server";
import { prisma } from "@delivery/database";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  let dbStatus: "healthy" | "unhealthy" = "unhealthy";
  let dbLatencyMs = 0;
  let dbError: string | null = null;

  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = "healthy";
  } catch (err) {
    dbStatus = "unhealthy";
    dbError = err instanceof Error ? err.message : String(err);
  }

  const memory = process.memoryUsage();
  const uptimeSeconds = Math.floor(process.uptime());
  const isHealthy = dbStatus === "healthy";

  const payload = {
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    environment: process.env.NODE_ENV || "development",
    services: {
      api: {
        status: "healthy",
        latencyMs: Date.now() - startTime,
      },
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        ...(dbError ? { error: dbError } : {}),
      },
    },
    system: {
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapTotalMb: Math.round((memory.heapTotal / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
      nodeVersion: process.version,
    },
  };

  return NextResponse.json(payload, {
    status: isHealthy ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "X-Health-Status": isHealthy ? "OK" : "DEGRADED",
    },
  });
}

export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 503 });
  }
}

import { PrismaClient } from "@prisma/client";

declare const process: any;

declare global {
  // Allow a single PrismaClient instance to be reused across hot reloads in dev.

  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.DEBUG_PRISMA ? ["query", "error", "warn"] : ["error"],
  });
}

/**
 * Singleton Prisma client.
 * In production: one instance per process.
 * In development: reuse the global instance across module hot-reloads.
 */
export const prisma: PrismaClient = globalThis.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

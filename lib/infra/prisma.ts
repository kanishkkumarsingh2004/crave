import { PrismaClient } from '@prisma/client'

type PrismaClientType = InstanceType<typeof PrismaClient>
type GlobalWithPrisma = typeof globalThis & {
  __prisma: PrismaClientType | undefined
}

const g = globalThis as unknown as GlobalWithPrisma

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function createPrismaClient(): PrismaClientType {
  if (typeof window !== 'undefined') {
    // Never instantiate on the client side.
    return null as any
  }
  if (!process.env.DATABASE_URL) {
    throw new Error(
      'FATAL: DATABASE_URL is missing. Configure local PostgreSQL before using database features.'
    )
  }
  try {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/crave?schema=public'
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({
      connectionString: dbUrl,
      // Neon computes may need several seconds to wake after scaling to zero.
      // Keep this application pool deliberately small because DATABASE_URL is
      // already routed through Neon's pooled endpoint.
      max: positiveInteger(process.env.DB_POOL_MAX, 10),
      idleTimeoutMillis: positiveInteger(process.env.DB_IDLE_TIMEOUT_MS, 30000),
      connectionTimeoutMillis: positiveInteger(process.env.DB_CONNECT_TIMEOUT_MS, 15000),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    })
    return new PrismaClient({ adapter, log: [] })
  } catch (e) {
    // P2 FIX: Throw instead of returning null so callers get a meaningful error
    // rather than cryptic "Cannot read property X of null" messages.
    throw new Error(
      `Failed to initialize Prisma client: ${e instanceof Error ? e.message : String(e)}`
    )
  }
}

// Always reuse the global singleton when it already exists.
// This prevents exhausting DB connections during Next.js HMR in development
// and also avoids redundant connection pools in production serverless invocations.
export const prisma: PrismaClientType = g.__prisma ?? createPrismaClient()

// Store for subsequent module evaluations (HMR in dev, warm lambdas in prod).
if (prisma !== null) {
  g.__prisma = prisma
}

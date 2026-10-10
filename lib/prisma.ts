import { PrismaClient } from '@prisma/client'

type PrismaClientType = InstanceType<typeof PrismaClient>
type GlobalWithPrisma = typeof globalThis & {
  __prisma: PrismaClientType | undefined
}

const g = globalThis as unknown as GlobalWithPrisma

function createPrismaClient(): PrismaClientType {
  if (typeof window !== 'undefined') {
    // Never instantiate on the client side.
    return null as any
  }
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is missing. Configure local PostgreSQL before using database features.'
    )
    return null as any
  }
  try {
    const dbUrl =
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/crave?schema=public'
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({
      connectionString: dbUrl,
      max: Number(process.env.DB_POOL_MAX || 20),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    return new PrismaClient({ adapter, log: [] })
  } catch (e) {
    console.warn('Prisma client unavailable:', e)
    return null as any
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

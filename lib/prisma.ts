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
  try {
    // Lazy-load the adapter so it is never bundled for the browser.
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || '' })
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

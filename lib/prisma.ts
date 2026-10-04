import { PrismaClient } from '@prisma/client'

type PrismaClientType = InstanceType<typeof PrismaClient>
type GlobalWithPrisma = typeof globalThis & {
  __prisma: PrismaClientType | undefined
}

const global = globalThis as unknown as GlobalWithPrisma

function createPrismaClient() {
  if (typeof window !== 'undefined') {
    return null as any
  }
  try {
    // Lazy-load the adapter to avoid bundling pg on the client
    const { PrismaPg } = require('@prisma/adapter-pg')
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL || '' })
    return new PrismaClient({ adapter, log: [] })
  } catch (e) {
    console.warn('Prisma client unavailable:', e)
    return null as any
  }
}

export const prisma =
  global.__prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production' && typeof prisma !== 'undefined' && prisma !== null) {
  ;(globalThis as any).__prisma = prisma
}

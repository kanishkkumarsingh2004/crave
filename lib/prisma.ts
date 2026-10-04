import { PrismaClient } from '@prisma/client'

// Prevent hot-reload from spawning multiple Prisma Client instances in dev
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

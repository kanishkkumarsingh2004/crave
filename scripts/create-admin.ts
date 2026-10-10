import { seedAdminOnly } from './seed-local-db'
import { prisma } from '../lib/prisma'

async function main() {
  await seedAdminOnly()
  await prisma?.$disconnect()
}

main().catch((err) => {
  console.error('❌ Failed to provision admin account:', err)
  process.exit(1)
})

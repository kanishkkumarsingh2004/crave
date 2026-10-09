import { seedSingleIdPerRole } from './seed-local-db'
import { prisma } from '../lib/prisma'

async function main() {
  await seedSingleIdPerRole()
  await prisma?.$disconnect()
}

main().catch((err) => {
  console.error('❌ Failed to provision local role accounts:', err)
  process.exit(1)
})

import 'dotenv/config'
import { prisma } from '../lib/prisma'
import crypto from 'crypto'

function hashPassword(password: string, email: string): string {
  return crypto.scryptSync(password, email.trim().toLowerCase(), 64).toString('hex')
}

export async function seedAdminOnly() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  const defaultPassword = process.env.ADMIN_PASSWORD || '1234567890'

  const admin = {
    id: 'usr_admin_01',
    name: 'System Administrator',
    email: 'admin@crave.com',
    role: 'admin' as const,
    password: defaultPassword,
  }

  console.log('🌱 Seeding admin user into database...')

  const password_hash = hashPassword(admin.password, admin.email)
  const existing = await prisma.user.findUnique({ where: { email: admin.email } })

  if (existing) {
    await prisma.user.update({
      where: { email: admin.email },
      data: {
        name: admin.name,
        role: admin.role,
        password_hash,
      },
    })
    console.log(`  ✓ Updated admin: ID = ${existing.id} (${admin.email})`)
  } else {
    const created = await prisma.user.create({
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        password_hash,
        locale: 'en',
      },
    })
    console.log(`  ✓ Created admin: ID = ${created.id} (${admin.email})`)
  }

  console.log('✅ Admin Seeding Complete!\n')
}

if (require.main === module) {
  seedAdminOnly()
    .catch((err) => {
      console.error('❌ Seeding failed:', err)
      process.exit(1)
    })
    .finally(async () => {
      await prisma?.$disconnect()
    })
}

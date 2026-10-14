import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { prisma } from '../lib/prisma'
import { hashPassword, validatePassword } from '../lib/password'

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} must be set explicitly`)
  return value
}

export async function seedAdminOnly() {
  if (!prisma) {
    console.error('❌ Database connection not initialized.')
    process.exit(1)
  }

  const adminEmail = requiredEnvironmentValue('ADMIN_EMAIL').toLowerCase()
  const adminPassword = validatePassword(requiredEnvironmentValue('ADMIN_PASSWORD'))

  const admin = {
    id: process.env.ADMIN_USER_ID?.trim() || randomUUID(),
    name: process.env.ADMIN_NAME?.trim() || 'System Administrator',
    email: adminEmail,
    role: 'admin' as const,
    password: adminPassword,
  }

  console.log('🌱 Seeding admin user into database...')

  const password_hash = hashPassword(admin.password)
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

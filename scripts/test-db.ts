import 'dotenv/config'
import { prisma } from '../lib/prisma'

async function check() {
  console.log('🔍 Testing Database Connection...\n')
  try {
    if (!prisma) {
      console.log('⚠️ Prisma is null (DATABASE_URL not configured in environment).')
      return
    }
    const count = await prisma.user.count()
    console.log('✅ Connection Successful! TOTAL USERS:', count)
    const users = await prisma.user.findMany({
      select: { id: true, email: true, role: true }
    })
    console.log('USERS FOUND:', JSON.stringify(users, null, 2))
  } catch (err: any) {
    console.log('⚠️ Database Connection Note:')
    if (err?.code === 'ECONNREFUSED') {
      console.log('Local PostgreSQL server on localhost:5432 is not currently running.')
      console.log('To start local database: Run "pnpm dc:up" with Docker Desktop active,')
      console.log('or update DATABASE_URL in .env to point to your cloud PostgreSQL (Neon).')
    } else {
      console.log('DB Error:', err?.message || err)
    }
  } finally {
    try {
      await prisma?.$disconnect()
    } catch {}
  }
}

check()

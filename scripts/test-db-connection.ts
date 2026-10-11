import 'dotenv/config'
import { prisma } from '../lib/prisma'

function maskDatabaseUrl(url: string | undefined): string {
  if (!url) return 'NOT CONFIGURED'
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//${parsed.username}:****@${parsed.host}${parsed.pathname}`
  } catch {
    return 'CONFIGURED (non-standard format)'
  }
}

async function testDatabase() {
  console.log('========================================================')
  console.log('🔍 CRAVE Database Connection & Health Diagnostic')
  console.log('========================================================\n')

  const dbUrl = process.env.DATABASE_URL
  console.log(`📡 DATABASE_URL: ${maskDatabaseUrl(dbUrl)}`)

  if (!dbUrl) {
    console.error('\n❌ DATABASE_URL is not set in environment or .env file!')
    console.log('\n💡 To configure a database:')
    console.log(
      '  1. Create a free PostgreSQL instance on Neon (https://console.neon.tech) or start local Postgres.'
    )
    console.log('  2. Copy .env.example to .env:')
    console.log('     cp .env.example .env')
    console.log(
      '  3. Put your connection string in .env: DATABASE_URL="postgresql://user:pass@host/dbname?sslmode=require"'
    )
    console.log('  4. Push the schema: pnpm db:push\n')
    process.exit(1)
  }

  if (!prisma) {
    console.error('\n❌ Prisma client could not be initialized from lib/prisma.ts')
    process.exit(1)
  }

  const startTime = Date.now()
  try {
    console.log('⏳ Connecting to PostgreSQL...')
    await prisma.$connect()
    const connectTime = Date.now() - startTime
    console.log(`✅ Connected successfully in ${connectTime}ms\n`)

    // Query server version
    const versionResult: any = await prisma.$queryRaw`SELECT version();`
    const versionStr = versionResult?.[0]?.version || 'Unknown'
    console.log(`🐘 PostgreSQL Engine: ${versionStr.split(',')[0]}`)

    // Check tables and record counts
    console.log('\n📊 Schema Table Verification:')
    const [userCount, restaurantCount, menuItemCount, orderCount, addressCount] = await Promise.all(
      [
        prisma.user.count().catch(() => -1),
        prisma.restaurant.count().catch(() => -1),
        prisma.menuItem.count().catch(() => -1),
        prisma.order.count().catch(() => -1),
        prisma.customerAddress.count().catch(() => -1),
      ]
    )

    const formatCount = (count: number) =>
      count === -1 ? '❌ Table missing (run `pnpm db:push`)' : `✅ ${count} record(s)`

    console.log(`  • users:              ${formatCount(userCount)}`)
    console.log(`  • restaurants:        ${formatCount(restaurantCount)}`)
    console.log(`  • menu_items:         ${formatCount(menuItemCount)}`)
    console.log(`  • orders:             ${formatCount(orderCount)}`)
    console.log(`  • customer_addresses: ${formatCount(addressCount)}`)

    if (userCount === -1 || restaurantCount === -1) {
      console.log('\n⚠️ Some tables do not exist yet in the database.')
      console.log('👉 Run `pnpm db:push` to sync the Prisma schema to your database.')
    } else if (userCount === 0 && restaurantCount === 0) {
      console.log('\nℹ️ Tables are present but currently empty.')
      console.log(
        '👉 Run `pnpm db:seed` to populate sample data or `pnpm db:admin` to create the admin user.'
      )
    } else {
      console.log('\n🎉 Database is healthy, schema is synced, and records are populated!')
    }

    console.log('\n========================================================')
  } catch (error: any) {
    console.error('\n❌ Database Connection Failed:')
    console.error(`   ${error?.message || error}`)
    console.log('\n💡 Troubleshooting Tips:')
    console.log('  • Verify that PostgreSQL is running and reachable.')
    console.log('  • Check whether username, password, host, and port are correct.')
    console.log(
      '  • If using Neon or cloud Postgres, make sure sslmode=require is in the query string.'
    )
    console.log('========================================================\n')
    process.exit(1)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

testDatabase()

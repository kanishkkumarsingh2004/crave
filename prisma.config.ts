import 'dotenv/config'
import { defineConfig } from 'prisma/config'

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Copy .env.example to .env and configure PostgreSQL.')
}

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: databaseUrl,
  },
})

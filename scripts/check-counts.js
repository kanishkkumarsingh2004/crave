require('dotenv').config()
const { Client } = require('pg')

async function main() {
  const c = new Client({ connectionString: process.env.DATABASE_URL })
  await c.connect()
  const res = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")
  const tableData = []
  for (const row of res.rows) {
    const r = await c.query('SELECT count(*) FROM "' + row.table_name + '"')
    tableData.push({ Table: row.table_name, Rows: Number(r.rows[0].count) })
  }
  console.table(tableData.filter(d => d.Rows > 0))

  const users = await c.query('SELECT id, name, email, role FROM "users"')
  console.log('\nRemaining Users:')
  console.table(users.rows)

  const rests = await c.query('SELECT id, name, is_dark_store, owner_id FROM "restaurants"')
  console.log('\nRemaining Restaurants / Stores:')
  console.table(rests.rows)

  await c.end()
}

main().catch(console.error)

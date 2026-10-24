require('dotenv').config()
const crypto = require('crypto')
const { Client } = require('pg')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const defaultPassword = 'Password123!'
  const passwordHash = hashPassword(defaultPassword)

  // 1. Update existing admin & customer & test accounts
  await client.query(
    `
    UPDATE "users" 
    SET password_hash = $1 
    WHERE email IN ('admin@crave.com', 'user@crave.com', 'test@1.com', 'q@a.com', 'test_vendor_1791838717615@example.com', 'test_driver_1791838717731@example.com')
  `,
    [passwordHash]
  )

  // 2. Ensure clear, easy-to-remember demo accounts exist for every role:
  await client.query(
    `
    INSERT INTO "users" (id, name, email, role, password_hash, restaurant_name, cuisine, phone)
    VALUES ('usr_demo_vendor_01', 'Demo Chef Marco', 'vendor@crave.com', 'restaurant_vendor', $1, 'Spice Garden Gourmet', 'North Indian & Mughlai', '+919876543212')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `,
    [passwordHash]
  )

  // Link restaurant to vendor@crave.com if needed
  const restCheck = await client.query(
    `SELECT id FROM "restaurants" WHERE owner_id = 'usr_demo_vendor_01'`
  )
  if (restCheck.rows.length === 0) {
    await client.query(`
      INSERT INTO "restaurants" (id, name, cuisine, address, latitude, longitude, is_open, owner_id)
      VALUES ('vnd_spice_garden_demo', 'Spice Garden Gourmet', 'North Indian & Mughlai', '12 Brigade Road, Bengaluru', 12.9716, 77.5946, true, 'usr_demo_vendor_01')
      ON CONFLICT (id) DO UPDATE SET owner_id = 'usr_demo_vendor_01'
    `)
  }

  await client.query(
    `
    INSERT INTO "users" (id, name, email, role, password_hash, vehicle_type, license_plate, phone)
    VALUES ('usr_demo_driver_01', 'Demo Rider Rahul', 'driver@crave.com', 'rider', $1, 'Electric Scooter', 'KA-01-EQ-9988', '+919876543214')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `,
    [passwordHash]
  )

  await client.query(
    `
    INSERT INTO "users" (id, name, email, role, password_hash, restaurant_name, cuisine, phone)
    VALUES ('usr_demo_store_01', 'Demo Dark Store Operator', 'store@crave.com', 'cravexp_store_vendor', $1, 'craveXP 10 Store Hub', 'Instant Groceries & Daily Needs', '+919876543213')
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
  `,
    [passwordHash]
  )

  console.log('SUCCESS: All accounts updated with password:', defaultPassword)
  await client.end()
}

main().catch((err) => {
  console.error('ERROR:', err)
  process.exit(1)
})

require('dotenv').config()
const crypto = require('crypto')
const { Client } = require('pg')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function scrubDatabase() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const defaultPassword = 'Password123!'
  const passwordHash = hashPassword(defaultPassword)

  console.log('🧹 Starting Database Scrub...')

  try {
    await client.query('BEGIN')

    // 1. Clear all transactional order dependencies & calculations
    console.log('1. Clearing order dependencies and financial calculations...')
    await client.query('DELETE FROM "order_outbox"')
    await client.query('DELETE FROM "payment_reviews"')
    await client.query('DELETE FROM "refunds"')
    await client.query('DELETE FROM "payment_transactions"')
    await client.query('DELETE FROM "vendor_settlements"')
    await client.query('DELETE FROM "ledger_entries"')
    await client.query('DELETE FROM "picker_metrics"')
    await client.query('DELETE FROM "admin_override_logs"')
    await client.query('DELETE FROM "orders"')

    // 2. Clear driver and customer ephemeral data
    console.log('2. Clearing rider and customer ephemeral records...')
    await client.query('DELETE FROM "idempotency_records"')
    await client.query('DELETE FROM "driver_location_history"')
    await client.query('DELETE FROM "driver_payouts"')
    await client.query('DELETE FROM "driver_incentives"')
    await client.query('DELETE FROM "driver_current_locations"')
    await client.query('DELETE FROM "driver_push_tokens"')
    await client.query('DELETE FROM "driver_upi_accounts"')
    await client.query('DELETE FROM "customer_addresses"')
    await client.query('DELETE FROM "web_push_subscriptions"')

    // 3. Clear coupons & commercial contracts & menu item variants
    console.log('3. Clearing coupons, contracts, and menu items...')
    await client.query('DELETE FROM "coupon_restaurants"')
    await client.query('DELETE FROM "coupons"')
    await client.query('DELETE FROM "commercial_contracts"')
    await client.query('DELETE FROM "menu_item_variants"')

    // 4. Ensure Crave Store Vendor user exists and Crave Dark Store exists
    console.log('4. Preserving 1 Admin and 1 Crave Store...')
    const ADMIN_ID = 'usr_admin_01'
    const ADMIN_EMAIL = 'admin@crave.com'
    const STORE_USER_ID = 'usr_demo_store_01'
    const STORE_USER_EMAIL = 'store@crave.com'
    const CRAVE_STORE_ID = 'cravexp_dark_store_01'

    // Upsert Admin
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, phone, locale)
      VALUES ($1, 'System Administrator', $2, 'admin', $3, '+919876543210', 'en')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
    `,
      [ADMIN_ID, ADMIN_EMAIL, passwordHash]
    )

    // Upsert Crave Store Vendor User
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, restaurant_name, cuisine, phone, locale)
      VALUES ($1, 'CraveXP Store Operator', $2, 'cravexp_store_vendor', $3, 'craveXP 10 Store Hub', 'Instant Groceries & Daily Needs', '+919876543213', 'en')
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'cravexp_store_vendor'
    `,
      [STORE_USER_ID, STORE_USER_EMAIL, passwordHash]
    )

    // Get actual user IDs for admin and store operator
    const adminUserRes = await client.query('SELECT id FROM "users" WHERE email = $1', [
      ADMIN_EMAIL,
    ])
    const storeUserRes = await client.query('SELECT id FROM "users" WHERE email = $1', [
      STORE_USER_EMAIL,
    ])
    const finalAdminId = adminUserRes.rows[0].id
    const finalStoreUserId = storeUserRes.rows[0].id

    // Upsert Crave Dark Store Restaurant
    await client.query(
      `
      INSERT INTO "restaurants" (id, name, cuisine, address, latitude, longitude, is_open, is_dark_store, owner_id)
      VALUES ($1, 'craveXP 10 Store Hub', 'Instant Groceries & Daily Needs', 'Dark Store Hub 01, Indiranagar, Bengaluru', 12.9716, 77.6412, true, true, $2)
      ON CONFLICT (id) DO UPDATE SET owner_id = $2, is_dark_store = true, is_open = true
    `,
      [CRAVE_STORE_ID, finalStoreUserId]
    )

    // 5. Delete all other menu items and restaurants
    console.log('5. Deleting all other restaurants and menu items...')
    await client.query('DELETE FROM "menu_items" WHERE restaurant_id != $1', [CRAVE_STORE_ID])
    await client.query('DELETE FROM "restaurants" WHERE id != $1', [CRAVE_STORE_ID])

    // 6. Delete all other users
    console.log('6. Deleting all other user accounts...')
    await client.query('DELETE FROM "users" WHERE id NOT IN ($1, $2)', [
      finalAdminId,
      finalStoreUserId,
    ])

    await client.query('COMMIT')
    console.log('✅ Scrub completed successfully!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Scrub failed, transaction rolled back:', err)
    throw err
  } finally {
    await client.end()
  }
}

scrubDatabase().catch((err) => {
  console.error(err)
  process.exit(1)
})

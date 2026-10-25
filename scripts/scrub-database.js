require('dotenv').config()
const crypto = require('crypto')
const { Client } = require('pg')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function scrubDatabase() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment or .env file')
  }

  const client = new Client({ connectionString: dbUrl })
  await client.connect()

  const defaultPassword = 'Password123!'
  const passwordHash = hashPassword(defaultPassword)

  console.log('🧹 Starting Comprehensive Database Scrub...')

  try {
    await client.query('BEGIN')

    // 1. Wipe all order transactions & financial audit records
    console.log('1. Clearing all transactional orders, ledger journals, and settlements...')
    await client.query('DELETE FROM "order_outbox"')
    await client.query('DELETE FROM "payment_reviews"')
    await client.query('DELETE FROM "refunds"')
    await client.query('DELETE FROM "payment_transactions"')
    await client.query('DELETE FROM "vendor_settlements"')
    await client.query('DELETE FROM "ledger_entries"')
    await client.query('DELETE FROM "picker_metrics"')
    await client.query('DELETE FROM "admin_override_logs"')
    await client.query('DELETE FROM "orders"')

    // 2. Clear ephemeral rider, tracking, and customer records
    console.log('2. Clearing rider tracking, payouts, and customer ephemeral records...')
    await client.query('DELETE FROM "idempotency_records"')
    await client.query('DELETE FROM "driver_location_history"')
    await client.query('DELETE FROM "driver_payouts"')
    await client.query('DELETE FROM "driver_incentives"')
    await client.query('DELETE FROM "driver_current_locations"')
    await client.query('DELETE FROM "driver_push_tokens"')
    await client.query('DELETE FROM "driver_upi_accounts"')
    await client.query('DELETE FROM "customer_addresses"')
    await client.query('DELETE FROM "web_push_subscriptions"')

    // 3. Clear coupons, contracts, and variants
    console.log('3. Clearing coupons, contracts, and variants...')
    await client.query('DELETE FROM "coupon_restaurants"')
    await client.query('DELETE FROM "coupons"')
    await client.query('DELETE FROM "commercial_contracts"')
    await client.query('DELETE FROM "menu_item_variants"')

    // 4. Define the 5 canonical single-role accounts
    console.log('4. Seeding and preserving exactly 1 account per role...')

    const ADMIN_ID = 'usr_admin_01'
    const ADMIN_EMAIL = 'admin@crave.com'

    const CUSTOMER_ID = 'usr_customer_01'
    const CUSTOMER_EMAIL = 'customer@crave.com'

    const VENDOR_ID = 'usr_vendor_01'
    const VENDOR_EMAIL = 'vendor@crave.com'
    const RESTAURANT_ID = 'rest_demo_01'

    const STORE_USER_ID = 'usr_demo_store_01'
    const STORE_USER_EMAIL = 'store@crave.com'
    const CRAVE_STORE_ID = 'cravexp_dark_store_01'

    const DRIVER_ID = 'usr_driver_01'
    const DRIVER_EMAIL = 'driver@crave.com'

    // 4a. Upsert 1 Admin
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, phone, locale)
      VALUES ($1, 'Master Administrator', $2, 'admin', $3, '+919625694673', 'en')
      ON CONFLICT (email) DO UPDATE SET 
        id = $1, password_hash = EXCLUDED.password_hash, role = 'admin', name = EXCLUDED.name, phone = EXCLUDED.phone
    `,
      [ADMIN_ID, ADMIN_EMAIL, passwordHash]
    )

    // 4b. Upsert 1 Customer
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, phone, address, locale)
      VALUES ($1, 'Aarav Sharma (Customer)', $2, 'user', $3, '+919876543211', '124, 5th Cross, Indiranagar, Bengaluru', 'en')
      ON CONFLICT (email) DO UPDATE SET 
        id = $1, password_hash = EXCLUDED.password_hash, role = 'user', name = EXCLUDED.name, address = EXCLUDED.address
    `,
      [CUSTOMER_ID, CUSTOMER_EMAIL, passwordHash]
    )

    // 4c. Upsert 1 Restaurant Vendor
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, restaurant_name, cuisine, phone, locale)
      VALUES ($1, 'Rajesh Kumar (Vendor)', $2, 'restaurant_vendor', $3, 'Crave Kitchen & Gourmet Grills', 'North Indian, Continental & Biryani', '+919876543212', 'en')
      ON CONFLICT (email) DO UPDATE SET 
        id = $1, password_hash = EXCLUDED.password_hash, role = 'restaurant_vendor', name = EXCLUDED.name, restaurant_name = EXCLUDED.restaurant_name
    `,
      [VENDOR_ID, VENDOR_EMAIL, passwordHash]
    )

    // 4d. Upsert 1 CraveXP Dark Store Vendor
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, restaurant_name, cuisine, phone, locale)
      VALUES ($1, 'CraveXP Store Operator', $2, 'cravexp_store_vendor', $3, 'craveXP 10 Store Hub', 'Instant Groceries & Daily Needs', '+919876543213', 'en')
      ON CONFLICT (email) DO UPDATE SET 
        id = $1, password_hash = EXCLUDED.password_hash, role = 'cravexp_store_vendor', name = EXCLUDED.name
    `,
      [STORE_USER_ID, STORE_USER_EMAIL, passwordHash]
    )

    // 4e. Upsert 1 Driver / Rider
    await client.query(
      `
      INSERT INTO "users" (id, name, email, role, password_hash, phone, vehicle_type, license_plate, locale)
      VALUES ($1, 'Vikram Singh (Rider)', $2, 'rider', $3, '+919876543214', 'Electric Scooter', 'KA-01-EQ-9876', 'en')
      ON CONFLICT (email) DO UPDATE SET 
        id = $1, password_hash = EXCLUDED.password_hash, role = 'rider', name = EXCLUDED.name, vehicle_type = EXCLUDED.vehicle_type
    `,
      [DRIVER_ID, DRIVER_EMAIL, passwordHash]
    )

    // Fetch actual database IDs
    const [adminRow] = (await client.query('SELECT id FROM "users" WHERE email = $1', [ADMIN_EMAIL])).rows
    const [customerRow] = (await client.query('SELECT id FROM "users" WHERE email = $1', [CUSTOMER_EMAIL])).rows
    const [vendorRow] = (await client.query('SELECT id FROM "users" WHERE email = $1', [VENDOR_EMAIL])).rows
    const [storeRow] = (await client.query('SELECT id FROM "users" WHERE email = $1', [STORE_USER_EMAIL])).rows
    const [driverRow] = (await client.query('SELECT id FROM "users" WHERE email = $1', [DRIVER_EMAIL])).rows

    const keptUserIds = [adminRow.id, customerRow.id, vendorRow.id, storeRow.id, driverRow.id]

    // 5. Upsert the 2 canonical stores (1 restaurant + 1 dark store)
    console.log('5. Preserving 1 Partner Restaurant and 1 CraveXP Dark Store...')

    await client.query(
      `
      INSERT INTO "restaurants" (id, name, cuisine, address, latitude, longitude, is_open, is_dark_store, owner_id, rating, cost_for_two, delivery_minutes)
      VALUES ($1, 'Crave Kitchen & Gourmet Grills', 'North Indian, Continental & Biryani', '100ft Road, Indiranagar, Bengaluru', 12.9716, 77.6412, true, false, $2, 4.8, 450, 25)
      ON CONFLICT (id) DO UPDATE SET owner_id = $2, is_open = true, is_dark_store = false
    `,
      [RESTAURANT_ID, vendorRow.id]
    )

    await client.query(
      `
      INSERT INTO "restaurants" (id, name, cuisine, address, latitude, longitude, is_open, is_dark_store, owner_id, rating, cost_for_two, delivery_minutes)
      VALUES ($1, 'craveXP 10 Store Hub', 'Instant Groceries & Daily Needs', 'Dark Store Hub 01, Indiranagar, Bengaluru', 12.9716, 77.6412, true, true, $2, 4.9, 200, 10)
      ON CONFLICT (id) DO UPDATE SET owner_id = $2, is_open = true, is_dark_store = true
    `,
      [CRAVE_STORE_ID, storeRow.id]
    )

    // 6. Seed canonical dishes for the partner restaurant
    console.log('6. Seeding dishes for Partner Restaurant...')
    await client.query('DELETE FROM "menu_items" WHERE restaurant_id NOT IN ($1, $2)', [RESTAURANT_ID, CRAVE_STORE_ID])
    await client.query('DELETE FROM "restaurants" WHERE id NOT IN ($1, $2)', [RESTAURANT_ID, CRAVE_STORE_ID])

    const dishes = [
      ['dish_demo_01', RESTAURANT_ID, 'Dum Hyderabadi Chicken Biryani', 'Dum Biryani', 349, 299, 'Authentic fragrant basmati rice layered with tender marinated chicken and rich spices.', true, false, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500'],
      ['dish_demo_02', RESTAURANT_ID, 'Paneer Butter Masala Gourmet Box', 'North Indian', 289, 249, 'Slow-simmered rich creamy tomato makhani with artisanal paneer cubes.', true, true, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500'],
      ['dish_demo_03', RESTAURANT_ID, 'Tandoori Garlic Naan (2 Pcs)', 'Breads', 89, 69, 'Fluffy clay-oven baked flatbread brushed with garlic infused butter.', true, true, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500'],
      ['dish_demo_04', RESTAURANT_ID, 'Smoked BBQ Chicken Wings', 'Starters', 279, 239, 'Crispy glazed wings tossed in house smoky barbecue glaze.', true, false, 'https://images.unsplash.com/photo-1567620832903-9fc6debc209f?w=500'],
      ['dish_demo_05', RESTAURANT_ID, 'Gulab Jamun with Rabdi', 'Desserts', 149, 119, 'Golden fried dumplings soaked in cardamom saffron syrup.', true, true, 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=500'],
    ]

    for (const d of dishes) {
      await client.query(
        `
        INSERT INTO "menu_items" (id, restaurant_id, name, category, price, restaurant_price, description, in_stock, is_veg, image)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price, restaurant_price = EXCLUDED.restaurant_price, in_stock = true
      `,
        d
      )
    }

    // 7. Delete all other users except the 5 preserved single-role IDs
    console.log('7. Erasing all other user accounts...')
    await client.query('DELETE FROM "users" WHERE id NOT IN ($1, $2, $3, $4, $5)', keptUserIds)

    await client.query('COMMIT')
    console.log('✅ Database scrub completed successfully!')
    console.log('----------------------------------------------------')
    console.log('Preserved Accounts (1 ID per role, Password: Password123!):')
    console.log('  1. ADMIN:                 admin@crave.com    (usr_admin_01)')
    console.log('  2. CUSTOMER:              customer@crave.com (usr_customer_01)')
    console.log('  3. RESTAURANT VENDOR:     vendor@crave.com   (usr_vendor_01)')
    console.log('  4. CRAVEXP STORE VENDOR:  store@crave.com    (usr_demo_store_01)')
    console.log('  5. DRIVER / RIDER:        driver@crave.com   (usr_driver_01)')
    console.log('----------------------------------------------------')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Scrub failed, rolled back:', err)
    throw err
  } finally {
    await client.end()
  }
}

scrubDatabase().catch((err) => {
  console.error(err)
  process.exit(1)
})

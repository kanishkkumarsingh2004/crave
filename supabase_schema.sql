-- Idempotent Supabase schema setup. This file creates structure only; it never
-- drops tables or inserts sample/demo business records.
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer', 'vendor', 'driver', 'admin')),
  phone TEXT,
  address TEXT,
  avatar TEXT,
  restaurant_name TEXT,
  cuisine TEXT,
  vehicle_type TEXT,
  license_plate TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cuisine TEXT NOT NULL,
  rating NUMERIC(2,1) DEFAULT 4.8,
  commission_rate INT DEFAULT 15,
  payment_model TEXT DEFAULT 'commission',
  address TEXT,
  owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price INT NOT NULL,
  description TEXT,
  in_stock BOOLEAN DEFAULT TRUE,
  image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_address TEXT,
  restaurant_id TEXT REFERENCES restaurants(id) ON DELETE SET NULL,
  restaurant_name TEXT NOT NULL,
  items JSONB NOT NULL,
  subtotal INT NOT NULL,
  packaging_fee INT DEFAULT 20,
  gst INT DEFAULT 18,
  total_amount INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('new', 'preparing', 'ready', 'completed', 'cancelled')),
  driver_name TEXT,
  driver_phone TEXT,
  payment_method TEXT DEFAULT 'UPI Online',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value INT NOT NULL,
  min_order_amount INT NOT NULL,
  max_discount INT,
  usage_limit INT,
  used_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expiry_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_settlements (
  id TEXT PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  gross_sales INT NOT NULL,
  commission_rate INT NOT NULL,
  commission_amount INT NOT NULL,
  net_payout INT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  payout_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS payment_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  utr_ref TEXT NOT NULL,
  customer_vpa TEXT NOT NULL,
  amount INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE restaurants
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS is_pure_veg BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_dark_store BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER,
  ADD COLUMN IF NOT EXISTS cost_for_two INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS offer TEXT,
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
  ADD COLUMN IF NOT EXISTS bank_ifsc TEXT,
  ADD COLUMN IF NOT EXISTS payout_vpa TEXT,
  ADD COLUMN IF NOT EXISTS fssai_license TEXT;

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS is_veg BOOLEAN,
  ADD COLUMN IF NOT EXISTS unit TEXT,
  ADD COLUMN IF NOT EXISTS mrp INTEGER,
  ADD COLUMN IF NOT EXISTS stock_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sku_code TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_otp TEXT,
  ADD COLUMN IF NOT EXISTS picker_name TEXT,
  ADD COLUMN IF NOT EXISTS tip INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS coupon_code TEXT,
  ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('new', 'preparing', 'packing', 'ready', 'picked_up', 'completed', 'cancelled'));

ALTER TABLE coupons
  ADD COLUMN IF NOT EXISTS restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE;

ALTER TABLE vendor_settlements
  ADD COLUMN IF NOT EXISTS restaurant_id TEXT REFERENCES restaurants(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

CREATE TABLE IF NOT EXISTS customer_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  merchant_vpa TEXT NOT NULL,
  merchant_name TEXT NOT NULL,
  merchant_category_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_addresses
  ADD COLUMN IF NOT EXISTS latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS longitude NUMERIC;

ALTER TABLE payment_configs
  ADD COLUMN IF NOT EXISTS delivery_fee INTEGER,
  ADD COLUMN IF NOT EXISTS handling_fee INTEGER,
  ADD COLUMN IF NOT EXISTS free_delivery_threshold INTEGER,
  ADD COLUMN IF NOT EXISTS gst_rate NUMERIC;

CREATE TABLE IF NOT EXISTS driver_upi_accounts (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vpa TEXT NOT NULL,
  bank_name TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_payouts (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_incentives (
  id TEXT PRIMARY KEY,
  driver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS cold_chain_sensors (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  temperature_c NUMERIC NOT NULL,
  target_temperature_c NUMERIC,
  status TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS picker_metrics (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  picker_name TEXT NOT NULL,
  bay TEXT,
  orders_packed INTEGER NOT NULL DEFAULT 0,
  average_pick_seconds INTEGER,
  accuracy_rate NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


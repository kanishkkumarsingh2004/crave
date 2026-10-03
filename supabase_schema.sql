-- Supabase Schema Initialization & Test Accounts Seed Script for crave.
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/yjzlpqzegqxznmmfovjt/sql)

-- 1. Reset existing tables (Clears old database contents)
DROP TABLE IF EXISTS payment_reviews CASCADE;
DROP TABLE IF EXISTS vendor_settlements CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS restaurants CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create Core Tables
CREATE TABLE users (
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

CREATE TABLE restaurants (
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

CREATE TABLE menu_items (
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

CREATE TABLE orders (
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

CREATE TABLE coupons (
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

CREATE TABLE vendor_settlements (
  id TEXT PRIMARY KEY,
  restaurant_name TEXT NOT NULL,
  gross_sales INT NOT NULL,
  commission_rate INT NOT NULL,
  commission_amount INT NOT NULL,
  net_payout INT NOT NULL,
  status TEXT DEFAULT 'scheduled',
  payout_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE payment_reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  utr_ref TEXT NOT NULL,
  customer_vpa TEXT NOT NULL,
  amount INT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Seed ONLY Test Accounts (Customer, Vendor, Rider/Driver, Admin)
INSERT INTO users (id, name, email, role, phone, address, avatar, restaurant_name, cuisine, vehicle_type, license_plate) VALUES
  ('usr_cust_1', 'Alex Rivera', 'alex@example.com', 'customer', '+91 98765 43210', 'Indiranagar 100ft Rd, Bengaluru', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80', NULL, NULL, NULL, NULL),
  ('usr_vend_1', 'Maya Lin (Owner)', 'green@table.com', 'vendor', '+91 98111 22334', 'Koramangala 5th Block, Bengaluru', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80', 'The Green Table', 'Healthy Bowls & Salads', NULL, NULL),
  ('usr_driv_1', 'Rajesh Kumar', 'rajesh@express.com', 'driver', '+91 97444 55667', 'HSR Layout, Bengaluru', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80', NULL, NULL, 'Electric Scooter (Ather 450X)', 'KA 01 EV 9821'),
  ('usr_admin_1', 'Sara Vance (Admin)', 'admin@crave.com', 'admin', '+91 99000 00001', 'CRAVE HQ, Indiranagar', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80', NULL, NULL, NULL, NULL);

-- 4. Seed Essential Initial Test Data
INSERT INTO restaurants (id, name, cuisine, rating, commission_rate, payment_model, address, owner_id) VALUES
  ('rest_1', 'The Green Table', 'Healthy Bowls & Salads', 4.9, 15, 'commission', 'Koramangala 5th Block, Bengaluru', 'usr_vend_1');

INSERT INTO menu_items (id, restaurant_id, name, category, price, description, in_stock, image) VALUES
  ('menu_1', 'rest_1', 'Avocado Quinoa Harvest Bowl', 'Bowls', 289, 'Organic quinoa topped with wild basil pesto, roasted cherry tomatoes & pine nuts', TRUE, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=300&q=80'),
  ('menu_2', 'rest_1', 'Smoky Paneer Tikka Wrap', 'Wraps', 249, 'Char-grilled cottage cheese wrapped in whole wheat tortilla with mint yogurt', TRUE, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=300&q=80'),
  ('menu_3', 'rest_1', 'Steamed Truffle Edamame Momos', 'Starters', 320, 'Delicate dumplings stuffed with smashed edamame and black truffle oil', TRUE, 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?auto=format&fit=crop&w=300&q=80');

INSERT INTO orders (id, customer_id, customer_name, customer_phone, customer_address, restaurant_id, restaurant_name, items, subtotal, packaging_fee, gst, total_amount, status, driver_name, driver_phone, payment_method) VALUES
  ('DRP-9021', 'usr_cust_1', 'Alex Rivera', '+91 98765 43210', 'Flat 402, Sunshine Heights, Indiranagar', 'rest_1', 'The Green Table', '[{"name": "Avocado Quinoa Harvest Bowl", "qty": 2, "price": 289}, {"name": "Smoky Paneer Tikka Wrap", "qty": 1, "price": 249}]', 827, 30, 41, 898, 'new', NULL, NULL, 'UPI Online'),
  ('DRP-8840', 'usr_cust_1', 'Priya Sharma', '+91 98450 11223', 'Villa 12, Palm Meadows, Whitefield', 'rest_1', 'The Green Table', '[{"name": "Steamed Truffle Edamame Momos", "qty": 3, "price": 320}]', 960, 20, 48, 1028, 'preparing', 'Rajesh Kumar', '+91 97444 55667', 'UPI Online'),
  ('DRP-8712', 'usr_cust_1', 'Karan Patel', '+91 99100 55443', 'Block C, Koramangala 5th Block', 'rest_1', 'The Green Table', '[{"name": "Avocado Quinoa Harvest Bowl", "qty": 1, "price": 289}]', 289, 15, 14, 318, 'ready', 'Rajesh Kumar', '+91 97444 55667', 'UPI Online');

INSERT INTO coupons (id, code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, used_count, is_active, expiry_date) VALUES
  ('c_1', 'CRAVE50', '50% OFF up to ₹100 on first 3 orders', 'percentage', 50, 199, 100, 1000, 142, TRUE, '2026-12-31'),
  ('c_2', 'FREEDEL', 'Flat ₹40 OFF Delivery Fee on orders above ₹299', 'flat', 40, 299, 40, 500, 89, TRUE, '2026-11-30');

INSERT INTO vendor_settlements (id, restaurant_name, gross_sales, commission_rate, commission_amount, net_payout, status) VALUES
  ('set_1', 'The Green Table', 148200, 15, 22230, 125970, 'settled');

INSERT INTO payment_reviews (id, order_id, utr_ref, customer_vpa, amount, status) VALUES
  ('pay_1', '#CRV-9021', '428190021389', 'alex@upi', 867, 'pending');


-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."CommercialModel" AS ENUM ('commission', 'markup', 'hybrid');

-- CreateEnum
CREATE TYPE "public"."CommissionModel" AS ENUM ('commission', 'markup', 'fixed');

-- CreateEnum
CREATE TYPE "public"."ContractStatus" AS ENUM ('ACTIVE', 'PENDING_APPROVAL', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "public"."DiscountType" AS ENUM ('percentage', 'flat');

-- CreateEnum
CREATE TYPE "public"."DriverPayoutStatus" AS ENUM ('pending', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "public"."GstStatus" AS ENUM ('REGISTERED', 'UNREGISTERED', 'COMPOSITION');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('payment_pending', 'payment_submitted', 'payment_verified', 'sent_to_vendor', 'preparing', 'packing', 'ready_for_pickup', 'rider_assigned', 'picked_up', 'out_for_delivery', 'delivered', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "public"."PaymentTxStatus" AS ENUM ('pending', 'processing', 'verified', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "public"."PriceTaxMode" AS ENUM ('TAX_INCLUSIVE', 'TAX_EXCLUSIVE');

-- CreateEnum
CREATE TYPE "public"."RefundStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "public"."TaxMode" AS ENUM ('CGST_SGST', 'IGST');

-- CreateEnum
CREATE TYPE "public"."UserRole" AS ENUM ('user', 'restaurant_vendor', 'cravexp_store_vendor', 'rider', 'admin');

-- CreateEnum
CREATE TYPE "public"."VendorSettlementStatus" AS ENUM ('scheduled', 'paid', 'failed', 'cancelled');

-- CreateTable
CREATE TABLE "public"."admin_override_logs" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "actor_ip" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_override_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."commercial_contracts" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "contract_number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."ContractStatus" NOT NULL DEFAULT 'ACTIVE',
    "commercial_model" "public"."CommercialModel" NOT NULL DEFAULT 'commission',
    "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "markup_rate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    "fixed_commission" INTEGER NOT NULL DEFAULT 0,
    "fixed_markup" INTEGER NOT NULL DEFAULT 0,
    "commission_basis" TEXT NOT NULL DEFAULT 'ORDER_SUBTOTAL',
    "price_tax_mode" "public"."PriceTaxMode" NOT NULL DEFAULT 'TAX_INCLUSIVE',
    "effective_from" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."coupon_restaurants" (
    "coupon_id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,

    CONSTRAINT "coupon_restaurants_pkey" PRIMARY KEY ("coupon_id","restaurant_id")
);

-- CreateTable
CREATE TABLE "public"."coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "discount_type" "public"."DiscountType" NOT NULL,
    "discount_value" INTEGER NOT NULL,
    "min_order_amount" INTEGER NOT NULL,
    "max_discount" INTEGER,
    "usage_limit" INTEGER,
    "used_count" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "funding_source" TEXT DEFAULT 'SHARED',
    "restaurant_share" INTEGER DEFAULT 50,
    "expiry_date" DATE,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "restaurant_id" TEXT,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customer_addresses" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL,
    "longitude" DECIMAL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_incentives" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward_amount" INTEGER NOT NULL,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "driver_incentives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_location_history" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_location_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_payouts" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "public"."DriverPayoutStatus" NOT NULL DEFAULT 'pending',
    "transaction_ref" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."driver_upi_accounts" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "vpa" TEXT NOT NULL,
    "bank_name" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_upi_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."idempotency_records" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "request_hash" TEXT,
    "response_code" INTEGER,
    "response_body" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ledger_entries" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "reference_id" TEXT,
    "account_code" TEXT NOT NULL,
    "debit_paise" INTEGER NOT NULL,
    "credit_paise" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."menu_items" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "description" TEXT,
    "in_stock" BOOLEAN DEFAULT true,
    "image" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_veg" BOOLEAN DEFAULT true,
    "unit" TEXT,
    "mrp" INTEGER,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "sku_code" TEXT,
    "hsn_sac_code" TEXT DEFAULT '996331',
    "price_tax_mode" "public"."PriceTaxMode" NOT NULL DEFAULT 'TAX_INCLUSIVE',
    "custom_commission_rate" DECIMAL(5,2),
    "custom_markup_rate" DECIMAL(5,2),
    "expiry_date" DATE,

    CONSTRAINT "menu_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."order_outbox" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),

    CONSTRAINT "order_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."orders" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_phone" TEXT,
    "customer_address" TEXT,
    "restaurant_id" TEXT,
    "restaurant_name" TEXT NOT NULL,
    "order_type" TEXT NOT NULL DEFAULT 'restaurant_food',
    "destination_vendor_id" TEXT,
    "payment_status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "payment_reviewed_by" TEXT,
    "payment_reviewed_at" TIMESTAMPTZ(6),
    "rider_id" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "packaging_fee" INTEGER DEFAULT 20,
    "delivery_fee" INTEGER DEFAULT 30,
    "platform_fee" INTEGER DEFAULT 6,
    "handling_fee" INTEGER DEFAULT 5,
    "gst" INTEGER DEFAULT 18,
    "total_amount" INTEGER NOT NULL,
    "status" "public"."OrderStatus" NOT NULL,
    "driver_name" TEXT,
    "driver_phone" TEXT,
    "payment_method" TEXT DEFAULT 'UPI Online',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "delivery_otp" TEXT,
    "picker_name" TEXT,
    "tip" INTEGER NOT NULL DEFAULT 0,
    "discount_amount" INTEGER NOT NULL DEFAULT 0,
    "coupon_code" TEXT,
    "commission_amount" INTEGER DEFAULT 0,
    "markup_amount" INTEGER DEFAULT 0,
    "restaurant_payout" INTEGER DEFAULT 0,
    "platform_revenue" INTEGER DEFAULT 0,
    "financial_snapshot" JSONB,
    "utr_ref" TEXT,
    "delivery_latitude" DECIMAL,
    "delivery_longitude" DECIMAL,
    "delivered_at" TIMESTAMPTZ(6),
    "otp_consumed_at" TIMESTAMPTZ(6),
    "idempotency_key" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_configs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "merchant_vpa" TEXT NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "merchant_category_code" TEXT,
    "thank_you_message" TEXT,
    "ifsc_code" TEXT,
    "account_number" TEXT,
    "platform_fee" INTEGER,
    "handling_fee" INTEGER,
    "vendor_commission" INTEGER,
    "packaging_cap" INTEGER,
    "delivery_fee" INTEGER,
    "base_distance_km" INTEGER,
    "per_km_rate" INTEGER,
    "free_delivery_threshold" INTEGER,
    "driver_payout_share" INTEGER,
    "surge_multiplier" DECIMAL,
    "rain_fee" INTEGER,
    "night_surge_fee" INTEGER,
    "is_rain_mode_active" BOOLEAN DEFAULT false,
    "is_night_surge_active" BOOLEAN DEFAULT false,
    "enable_cash_on_delivery" BOOLEAN DEFAULT false,
    "enable_upi_deep_link" BOOLEAN DEFAULT true,
    "require_utr_number" BOOLEAN DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gst_rate" DECIMAL(5,2),
    "gst_rate_percent" DECIMAL(5,2),

    CONSTRAINT "payment_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_reviews" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "utr_ref" TEXT NOT NULL,
    "customer_vpa" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_transactions" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_payment_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "public"."PaymentTxStatus" NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "raw_payload" JSONB,
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."picker_metrics" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "picker_name" TEXT NOT NULL,
    "bay" TEXT,
    "orders_packed" INTEGER NOT NULL DEFAULT 0,
    "average_pick_seconds" INTEGER,
    "accuracy_rate" DECIMAL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "picker_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."refunds" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."RefundStatus" NOT NULL DEFAULT 'pending',
    "gateway_refund_id" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cuisine" TEXT NOT NULL,
    "rating" DECIMAL(2,1) DEFAULT 4.8,
    "commercial_model" "public"."CommercialModel" NOT NULL DEFAULT 'commission',
    "commission_rate" DECIMAL(5,2) DEFAULT 15.00,
    "markup_rate" DECIMAL(5,2) DEFAULT 0.00,
    "fixed_commission" INTEGER DEFAULT 0,
    "fixed_markup" INTEGER DEFAULT 0,
    "payment_model" "public"."CommissionModel" NOT NULL DEFAULT 'commission',
    "address" TEXT,
    "owner_id" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "image" TEXT,
    "is_pure_veg" BOOLEAN DEFAULT false,
    "is_dark_store" BOOLEAN NOT NULL DEFAULT false,
    "is_open" BOOLEAN NOT NULL DEFAULT true,
    "rating_count" INTEGER DEFAULT 50,
    "cost_for_two" INTEGER DEFAULT 300,
    "delivery_minutes" INTEGER DEFAULT 25,
    "offer" TEXT,
    "latitude" DECIMAL,
    "longitude" DECIMAL,
    "phone" TEXT,
    "bank_account_name" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "bank_ifsc" TEXT,
    "payout_vpa" TEXT,
    "fssai_license" TEXT,
    "gstin" TEXT,
    "gst_status" "public"."GstStatus" NOT NULL DEFAULT 'REGISTERED',
    "supplier_state" TEXT DEFAULT 'Karnataka',
    "price_tax_mode" "public"."PriceTaxMode" NOT NULL DEFAULT 'TAX_INCLUSIVE',
    "contract_number" TEXT,
    "gst_rate_percent" DECIMAL(5,2),

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."UserRole" NOT NULL,
    "password_hash" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "avatar" TEXT,
    "restaurant_name" TEXT,
    "cuisine" TEXT,
    "vehicle_type" TEXT,
    "license_plate" TEXT,
    "locale" TEXT DEFAULT 'en',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."vendor_settlements" (
    "id" TEXT NOT NULL,
    "restaurant_name" TEXT NOT NULL,
    "gross_sales" INTEGER NOT NULL,
    "commercial_model" "public"."CommercialModel" NOT NULL DEFAULT 'commission',
    "commission_rate" INTEGER NOT NULL,
    "commission_amount" INTEGER NOT NULL,
    "markup_amount" INTEGER DEFAULT 0,
    "net_payout" INTEGER NOT NULL,
    "status" "public"."VendorSettlementStatus" NOT NULL DEFAULT 'scheduled',
    "payout_date" DATE,
    "restaurant_id" TEXT,
    "period_start" DATE,
    "period_end" DATE,
    "transaction_ref" TEXT,

    CONSTRAINT "vendor_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_override_logs_admin_id_idx" ON "public"."admin_override_logs"("admin_id" ASC);

-- CreateIndex
CREATE INDEX "admin_override_logs_created_at_idx" ON "public"."admin_override_logs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "admin_override_logs_order_id_idx" ON "public"."admin_override_logs"("order_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "commercial_contracts_contract_number_key" ON "public"."commercial_contracts"("contract_number" ASC);

-- CreateIndex
CREATE INDEX "commercial_contracts_restaurant_id_idx" ON "public"."commercial_contracts"("restaurant_id" ASC);

-- CreateIndex
CREATE INDEX "coupon_restaurants_restaurant_id_idx" ON "public"."coupon_restaurants"("restaurant_id" ASC);

-- CreateIndex
CREATE INDEX "coupons_code_idx" ON "public"."coupons"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "public"."coupons"("code" ASC);

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "public"."customer_addresses"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "driver_incentives_driver_id_idx" ON "public"."driver_incentives"("driver_id" ASC);

-- CreateIndex
CREATE INDEX "driver_location_history_driver_id_timestamp_idx" ON "public"."driver_location_history"("driver_id" ASC, "timestamp" ASC);

-- CreateIndex
CREATE INDEX "driver_location_history_h3_cell_idx" ON "public"."driver_location_history"("h3_cell" ASC);

-- CreateIndex
CREATE INDEX "driver_payouts_driver_id_idx" ON "public"."driver_payouts"("driver_id" ASC);

-- CreateIndex
CREATE INDEX "driver_payouts_driver_id_status_created_at_idx" ON "public"."driver_payouts"("driver_id" ASC, "status" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "driver_upi_accounts_driver_id_idx" ON "public"."driver_upi_accounts"("driver_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_key_key" ON "public"."idempotency_records"("key" ASC);

-- CreateIndex
CREATE INDEX "idempotency_records_key_scope_idx" ON "public"."idempotency_records"("key" ASC, "scope" ASC);

-- CreateIndex
CREATE INDEX "idempotency_records_scope_status_idx" ON "public"."idempotency_records"("scope" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ledger_entries_account_code_created_at_idx" ON "public"."ledger_entries"("account_code" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "ledger_entries_event_type_created_at_idx" ON "public"."ledger_entries"("event_type" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_idempotency_key_key" ON "public"."ledger_entries"("idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "ledger_entries_order_id_idx" ON "public"."ledger_entries"("order_id" ASC);

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_category_idx" ON "public"."menu_items"("restaurant_id" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "menu_items_restaurant_id_in_stock_category_idx" ON "public"."menu_items"("restaurant_id" ASC, "in_stock" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "order_outbox_order_id_created_at_idx" ON "public"."order_outbox"("order_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "order_outbox_status_created_at_idx" ON "public"."order_outbox"("status" ASC, "created_at" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "orders_customer_id_idempotency_key_key" ON "public"."orders"("customer_id" ASC, "idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "orders_customer_id_idx" ON "public"."orders"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "orders_customer_id_status_created_at_idx" ON "public"."orders"("customer_id" ASC, "status" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "orders_restaurant_id_idx" ON "public"."orders"("restaurant_id" ASC);

-- CreateIndex
CREATE INDEX "orders_restaurant_id_status_created_at_idx" ON "public"."orders"("restaurant_id" ASC, "status" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "orders_rider_id_status_idx" ON "public"."orders"("rider_id" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "public"."orders"("status" ASC);

-- CreateIndex
CREATE INDEX "payment_reviews_order_id_idx" ON "public"."payment_reviews"("order_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_reviews_utr_ref_key" ON "public"."payment_reviews"("utr_ref" ASC);

-- CreateIndex
CREATE INDEX "payment_transactions_gateway_payment_id_idx" ON "public"."payment_transactions"("gateway_payment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_idempotency_key_key" ON "public"."payment_transactions"("idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "payment_transactions_order_id_idx" ON "public"."payment_transactions"("order_id" ASC);

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "public"."payment_transactions"("status" ASC);

-- CreateIndex
CREATE INDEX "picker_metrics_restaurant_id_idx" ON "public"."picker_metrics"("restaurant_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_gateway_refund_id_key" ON "public"."refunds"("gateway_refund_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "refunds_idempotency_key_key" ON "public"."refunds"("idempotency_key" ASC);

-- CreateIndex
CREATE INDEX "refunds_order_id_idx" ON "public"."refunds"("order_id" ASC);

-- CreateIndex
CREATE INDEX "restaurants_is_open_is_dark_store_created_at_idx" ON "public"."restaurants"("is_open" ASC, "is_dark_store" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "restaurants_is_open_is_dark_store_idx" ON "public"."restaurants"("is_open" ASC, "is_dark_store" ASC);

-- CreateIndex
CREATE INDEX "restaurants_owner_id_idx" ON "public"."restaurants"("owner_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE INDEX "users_role_created_at_idx" ON "public"."users"("role" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "vendor_settlements_restaurant_id_idx" ON "public"."vendor_settlements"("restaurant_id" ASC);

-- CreateIndex
CREATE INDEX "vendor_settlements_restaurant_id_status_period_start_idx" ON "public"."vendor_settlements"("restaurant_id" ASC, "status" ASC, "period_start" ASC);

-- AddForeignKey
ALTER TABLE "public"."commercial_contracts" ADD CONSTRAINT "commercial_contracts_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_restaurants" ADD CONSTRAINT "coupon_restaurants_coupon_id_fkey" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupon_restaurants" ADD CONSTRAINT "coupon_restaurants_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."coupons" ADD CONSTRAINT "coupons_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_incentives" ADD CONSTRAINT "driver_incentives_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_payouts" ADD CONSTRAINT "driver_payouts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."driver_upi_accounts" ADD CONSTRAINT "driver_upi_accounts_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ledger_entries" ADD CONSTRAINT "ledger_entries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."menu_items" ADD CONSTRAINT "menu_items_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."orders" ADD CONSTRAINT "orders_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payment_transactions" ADD CONSTRAINT "payment_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."picker_metrics" ADD CONSTRAINT "picker_metrics_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."refunds" ADD CONSTRAINT "refunds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."restaurants" ADD CONSTRAINT "restaurants_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."vendor_settlements" ADD CONSTRAINT "vendor_settlements_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "public"."restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

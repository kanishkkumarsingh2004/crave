-- Add Razorpay gateway + Route split settlement models and paise fields
-- Migration: razorpay_route_split_payments

-- 1. Order: canonical paise amount (100 = ₹1)
ALTER TABLE "orders" ADD COLUMN "total_amount_paise" INTEGER;

-- 2. PaymentTransaction: exact paise amount + Razorpay order id
ALTER TABLE "payment_transactions" ADD COLUMN "amount_paise" INTEGER;
ALTER TABLE "payment_transactions" ADD COLUMN "razorpay_order_id" TEXT;
CREATE UNIQUE INDEX "payment_transactions_razorpay_order_id_key" ON "payment_transactions"("razorpay_order_id");

-- 3. Refund: exact paise amount
ALTER TABLE "refunds" ADD COLUMN "amount_paise" INTEGER;

-- 4. PaymentConfig: Razorpay admin controls
ALTER TABLE "payment_configs" ADD COLUMN "razorpay_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payment_configs" ADD COLUMN "razorpay_route_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "payment_configs" ADD COLUMN "razorpay_transfer_release" TEXT NOT NULL DEFAULT 'DELIVERY_COMPLETE';

-- 5. RazorpayLinkedAccount: server-controlled entity -> linked account mapping
CREATE TABLE "razorpay_linked_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "razorpay_account_id" TEXT NOT NULL UNIQUE,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verified_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX "razorpay_linked_accounts_entity_type_entity_id_key" ON "razorpay_linked_accounts"("entity_type", "entity_id");
CREATE INDEX "razorpay_linked_accounts_status_entity_type_idx" ON "razorpay_linked_accounts"("status", "entity_type");

-- 6. RazorpayTransfer: durable transfer intent + provider-confirmed state
CREATE TABLE "razorpay_transfers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "order_id" TEXT NOT NULL,
    "recipient_type" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "linked_account_id" TEXT NOT NULL,
    "razorpay_payment_id" TEXT NOT NULL,
    "razorpay_transfer_id" TEXT UNIQUE,
    "idempotency_key" TEXT NOT NULL UNIQUE,
    "amount_paise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "processed_at" TIMESTAMPTZ(6)
);
CREATE INDEX "razorpay_transfers_order_id_status_idx" ON "razorpay_transfers"("order_id", "status");
CREATE INDEX "razorpay_transfers_razorpay_payment_id_idx" ON "razorpay_transfers"("razorpay_payment_id");
CREATE INDEX "razorpay_transfers_recipient_type_recipient_id_status_idx" ON "razorpay_transfers"("recipient_type", "recipient_id", "status");

-- 7. WebhookEvent: durable webhook receipts for replay protection
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "payload" JSON,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "last_error" TEXT,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
    "processed_at" TIMESTAMPTZ(6)
);
CREATE UNIQUE INDEX "webhook_events_provider_provider_event_id_key" ON "webhook_events"("provider", "provider_event_id");
CREATE INDEX "webhook_events_provider_status_received_at_idx" ON "webhook_events"("provider", "status", "received_at");
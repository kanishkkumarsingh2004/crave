ALTER TABLE "public"."razorpay_transfers"
  ADD COLUMN "provider_status" TEXT,
  ADD COLUMN "settlement_status" TEXT,
  ADD COLUMN "amount_reversed_paise" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "razorpay_settlement_id" TEXT,
  ADD COLUMN "last_reconciled_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_webhook_at" TIMESTAMPTZ(6);

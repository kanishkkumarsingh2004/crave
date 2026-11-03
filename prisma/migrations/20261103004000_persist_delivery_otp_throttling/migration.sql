ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "delivery_otp_failed_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "delivery_otp_locked_until" TIMESTAMPTZ(6);

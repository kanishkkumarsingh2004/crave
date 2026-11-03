-- Separate provider confirmation from refund requests.
ALTER TABLE "public"."refunds"
  ADD COLUMN "provider_confirmed_at" TIMESTAMPTZ(6);

-- Durable dispatch authorization. Redis offer locks remain coordination-only;
-- an unexpired row in this table is required before a driver can claim an order.
CREATE TABLE "public"."dispatch_offers" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "driver_id" TEXT NOT NULL,
  "dispatch_attempt_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "dispatch_offers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "dispatch_offers_order_id_fkey" FOREIGN KEY ("order_id")
    REFERENCES "public"."orders"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "dispatch_offers_driver_id_fkey" FOREIGN KEY ("driver_id")
    REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "dispatch_offers_dispatch_attempt_id_driver_id_key"
  ON "public"."dispatch_offers"("dispatch_attempt_id", "driver_id");
CREATE INDEX "dispatch_offers_driver_id_status_expires_at_idx"
  ON "public"."dispatch_offers"("driver_id", "status", "expires_at");
CREATE INDEX "dispatch_offers_order_id_status_expires_at_idx"
  ON "public"."dispatch_offers"("order_id", "status", "expires_at");

-- Settlement attempt ownership distinguishes a safely reclaimable worker crash
-- before submission from an ambiguous crash after provider submission began.
ALTER TABLE "public"."razorpay_transfers"
  ADD COLUMN "claim_token" TEXT,
  ADD COLUMN "claimed_at" TIMESTAMPTZ(6),
  ADD COLUMN "provider_request_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "last_attempt_at" TIMESTAMPTZ(6),
  ADD COLUMN "attempt_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "reconciliation_status" TEXT;

CREATE INDEX "razorpay_transfers_reconciliation_status_updated_at_idx"
  ON "public"."razorpay_transfers"("reconciliation_status", "updated_at");

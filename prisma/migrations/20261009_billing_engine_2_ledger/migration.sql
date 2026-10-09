-- ===========================================================================================
-- Migration: billing_engine_2_ledger
-- Date: 2026-10-09
-- Purpose: Implements CRAVE Billing Engine 2.0 Phase 1 & 2 schema changes
--
-- Changes:
--   1. orders.financial_snapshot  (JSONB) — immutable canonical price snapshot in paise
--   2. orders.utr_ref             (TEXT)  — UTR reference from payment submission
--   3. ledger_entries             (TABLE) — double-entry financial subledger
--   4. payment_reviews.utr_ref    (UNIQUE) — anti-replay protection for UTR claims
--   5. payment_configs.gst_rate_percent — alias field
--
-- ROLLBACK: See end of this file for rollback statements.
-- NOTE: All monetary columns use INTEGER (paise). Never use FLOAT for money.
-- ===========================================================================================

-- ─── Step 1: Add financial_snapshot to orders ─────────────────────────────────
-- Nullable — existing orders will have NULL (legacy calculation)
-- New orders must persist CanonicalPriceResult here before payment is confirmed.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "financial_snapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "utr_ref"            TEXT;

-- ─── Step 2: Add gst_rate_percent alias to payment_configs ───────────────────
ALTER TABLE "payment_configs"
  ADD COLUMN IF NOT EXISTS "gst_rate_percent" DECIMAL(5,2);

-- ─── Step 3: Add UTR uniqueness constraint to payment_reviews ─────────────────
-- Prevents the same UTR from being claimed for multiple orders.
-- IMPORTANT: Before running this in production, clean any pre-existing duplicate UTRs.
-- Run: SELECT utr_ref, COUNT(*) FROM payment_reviews GROUP BY utr_ref HAVING COUNT(*) > 1;
-- and resolve duplicates first.
CREATE UNIQUE INDEX IF NOT EXISTS "payment_reviews_utr_ref_key"
  ON "payment_reviews"("utr_ref")
  WHERE "utr_ref" IS NOT NULL;

-- ─── Step 4: Create ledger_entries table ─────────────────────────────────────
-- Double-entry financial subledger. Every row is an immutable debit or credit entry.
-- sum(debit_paise WHERE order_id = X) MUST equal sum(credit_paise WHERE order_id = X)
-- for every complete journal transaction (enforced in application layer).
CREATE TABLE IF NOT EXISTS "ledger_entries" (
    "id"               TEXT         NOT NULL,
    "idempotency_key"  TEXT         NOT NULL,
    "event_type"       TEXT         NOT NULL,  -- ORDER_CONFIRMED | VENDOR_SETTLEMENT | RIDER_SETTLEMENT | REFUND_INITIATED | REVERSAL
    "order_id"         TEXT         NOT NULL,
    "reference_id"     TEXT,                   -- Settlement ID, Payout ID, UTR reference
    "account_code"     TEXT         NOT NULL,  -- AccountCode enum value
    "debit_paise"      INTEGER      NOT NULL,  -- Amount in paise (0 if this is a credit line)
    "credit_paise"     INTEGER      NOT NULL,  -- Amount in paise (0 if this is a debit line)
    "description"      TEXT         NOT NULL,
    "notes"            TEXT,
    "created_at"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT "ledger_entries_pkey"             PRIMARY KEY ("id"),
    CONSTRAINT "ledger_debit_non_negative"       CHECK ("debit_paise" >= 0),
    CONSTRAINT "ledger_credit_non_negative"      CHECK ("credit_paise" >= 0),
    CONSTRAINT "ledger_not_both_debit_credit"    CHECK (NOT ("debit_paise" > 0 AND "credit_paise" > 0)),
    CONSTRAINT "ledger_entries_order_id_fkey"    FOREIGN KEY ("order_id")
        REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Indexes on ledger_entries
CREATE UNIQUE INDEX IF NOT EXISTS "ledger_entries_idempotency_key_key"
  ON "ledger_entries"("idempotency_key");

CREATE INDEX IF NOT EXISTS "ledger_entries_order_id_idx"
  ON "ledger_entries"("order_id");

CREATE INDEX IF NOT EXISTS "ledger_entries_event_type_created_at_idx"
  ON "ledger_entries"("event_type", "created_at");

CREATE INDEX IF NOT EXISTS "ledger_entries_account_code_created_at_idx"
  ON "ledger_entries"("account_code", "created_at");

-- ===========================================================================================
-- ROLLBACK STATEMENTS (run ONLY to undo this migration — do NOT run in production casually):
-- ===========================================================================================
-- DROP TABLE IF EXISTS "ledger_entries";
-- DROP INDEX IF EXISTS "payment_reviews_utr_ref_key";
-- ALTER TABLE "orders" DROP COLUMN IF EXISTS "financial_snapshot";
-- ALTER TABLE "orders" DROP COLUMN IF EXISTS "utr_ref";
-- ALTER TABLE "payment_configs" DROP COLUMN IF EXISTS "gst_rate_percent";
-- ===========================================================================================

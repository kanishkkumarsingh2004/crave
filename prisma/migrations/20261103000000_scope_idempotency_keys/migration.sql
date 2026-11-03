-- Idempotency keys are namespaced by operation scope. Abort before changing
-- constraints if dirty legacy data would violate the intended invariant.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "public"."idempotency_records"
    GROUP BY "scope", "key"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate idempotency_records rows exist for the same (scope, key)';
  END IF;
END $$;

-- The Prisma model already relied on this lease-owner token, but the legacy
-- migration chain never created its backing column.
ALTER TABLE "public"."idempotency_records"
  ADD COLUMN IF NOT EXISTS "fencing_token" TEXT;

-- Legacy rows have no trustworthy payload hash. Quarantine completed rows for
-- one replay-retention window and expire abandoned leases immediately. Runtime
-- acquisition deletes an unverifiable row only after this expiry has elapsed.
UPDATE "public"."idempotency_records"
SET
  "status" = CASE
    WHEN "status" IN ('processing', 'failed') THEN 'failed'
    ELSE "status"
  END,
  "expires_at" = CASE
    WHEN "status" = 'completed' THEN GREATEST("expires_at", NOW() + INTERVAL '24 hours')
    ELSE LEAST("expires_at", NOW())
  END
WHERE "request_hash" IS NULL;

DROP INDEX IF EXISTS "public"."idempotency_records_key_key";
DROP INDEX IF EXISTS "public"."idempotency_records_key_scope_idx";

CREATE UNIQUE INDEX "idempotency_records_scope_key_key"
  ON "public"."idempotency_records"("scope", "key");

ALTER TABLE "public"."webhook_events"
  ADD COLUMN "lease_token" TEXT;

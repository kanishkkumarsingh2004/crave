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

DROP INDEX IF EXISTS "public"."idempotency_records_key_key";
DROP INDEX IF EXISTS "public"."idempotency_records_key_scope_idx";

CREATE UNIQUE INDEX "idempotency_records_scope_key_key"
  ON "public"."idempotency_records"("scope", "key");

ALTER TABLE "public"."webhook_events"
  ADD COLUMN "lease_token" TEXT;

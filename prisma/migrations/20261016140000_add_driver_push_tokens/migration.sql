CREATE TABLE IF NOT EXISTS "driver_push_tokens" (
    "id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "device_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "driver_push_tokens_token_key"
    ON "driver_push_tokens"("token");

CREATE INDEX IF NOT EXISTS "driver_push_tokens_driver_id_is_active_idx"
    ON "driver_push_tokens"("driver_id", "is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'driver_push_tokens_driver_id_fkey'
    ) THEN
        ALTER TABLE "driver_push_tokens"
            ADD CONSTRAINT "driver_push_tokens_driver_id_fkey"
            FOREIGN KEY ("driver_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

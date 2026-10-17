CREATE TABLE IF NOT EXISTS "web_push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "web_push_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "web_push_subscriptions_endpoint_key"
    ON "web_push_subscriptions"("endpoint");

CREATE INDEX IF NOT EXISTS "web_push_subscriptions_user_id_is_active_idx"
    ON "web_push_subscriptions"("user_id", "is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'web_push_subscriptions_user_id_fkey'
    ) THEN
        ALTER TABLE "web_push_subscriptions"
            ADD CONSTRAINT "web_push_subscriptions_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

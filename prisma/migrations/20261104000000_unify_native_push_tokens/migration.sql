-- Unified native push registrations for customer, restaurant, driver and admin apps.
CREATE TABLE IF NOT EXISTS "device_push_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "app_role" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "device_push_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "device_push_tokens_token_key"
    ON "device_push_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "device_push_tokens_user_device_role_provider_key"
    ON "device_push_tokens"("user_id", "device_id", "app_role", "provider");
CREATE INDEX IF NOT EXISTS "device_push_tokens_user_id_app_role_is_active_idx"
    ON "device_push_tokens"("user_id", "app_role", "is_active");
CREATE INDEX IF NOT EXISTS "device_push_tokens_app_role_platform_is_active_idx"
    ON "device_push_tokens"("app_role", "platform", "is_active");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'device_push_tokens_user_id_fkey'
    ) THEN
        ALTER TABLE "device_push_tokens"
            ADD CONSTRAINT "device_push_tokens_user_id_fkey"
            FOREIGN KEY ("user_id") REFERENCES "users"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Preserve existing driver registrations during the migration. Legacy rows without
-- a device identifier receive a stable synthetic identifier and can be replaced by
-- the driver's next registration.
INSERT INTO "device_push_tokens" (
    "id", "user_id", "device_id", "app_role", "platform", "provider", "token",
    "is_active", "last_seen_at", "created_at", "updated_at"
)
SELECT
    'legacy_' || d."id",
    d."driver_id",
    COALESCE(NULLIF(d."device_id", ''), 'legacy:' || d."id"),
    'driver',
    d."platform",
    CASE WHEN lower(d."platform") = 'ios' THEN 'apns' ELSE 'fcm' END,
    d."token",
    d."is_active",
    d."last_seen_at",
    d."created_at",
    CURRENT_TIMESTAMP
FROM "driver_push_tokens" d
WHERE NOT EXISTS (
    SELECT 1 FROM "device_push_tokens" n WHERE n."token" = d."token"
)
ON CONFLICT DO NOTHING;

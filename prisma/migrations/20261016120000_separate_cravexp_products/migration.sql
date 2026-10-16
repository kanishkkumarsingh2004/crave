CREATE TABLE IF NOT EXISTS "cravexp_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '1 Pack',
    "price" INTEGER NOT NULL,
    "mrp" INTEGER,
    "description" TEXT,
    "image" TEXT,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "stock_count" INTEGER NOT NULL DEFAULT 0,
    "sku_code" TEXT,
    "is_veg" BOOLEAN NOT NULL DEFAULT true,
    "hsn_sac_code" TEXT DEFAULT '996331',
    "price_tax_mode" TEXT NOT NULL DEFAULT 'TAX_INCLUSIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cravexp_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "cravexp_products_in_stock_category_idx"
    ON "cravexp_products"("in_stock", "category");

CREATE INDEX IF NOT EXISTS "cravexp_products_sku_code_idx"
    ON "cravexp_products"("sku_code");

-- Preserve the current customer catalog while moving it out of restaurant menus.
DO $$
BEGIN
IF to_regclass('public.menu_items') IS NOT NULL THEN
INSERT INTO "cravexp_products" (
    "id", "name", "category", "unit", "price", "mrp", "description", "image",
    "in_stock", "stock_count", "sku_code", "is_veg", "hsn_sac_code",
    "price_tax_mode", "created_at", "updated_at"
)
SELECT
    "id", "name", "category", COALESCE("unit", '1 Pack'), "price", "mrp",
    "description", "image", COALESCE("in_stock", true), "stock_count", "sku_code",
    COALESCE("is_veg", true), "hsn_sac_code", "price_tax_mode"::text,
    COALESCE("created_at", CURRENT_TIMESTAMP), CURRENT_TIMESTAMP
FROM "menu_items"
WHERE "restaurant_id" = 'cravexp_dark_store_01'
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "category" = EXCLUDED."category",
    "unit" = EXCLUDED."unit",
    "price" = EXCLUDED."price",
    "mrp" = EXCLUDED."mrp",
    "description" = EXCLUDED."description",
    "image" = EXCLUDED."image",
    "in_stock" = EXCLUDED."in_stock",
    "stock_count" = EXCLUDED."stock_count",
    "sku_code" = EXCLUDED."sku_code",
    "is_veg" = EXCLUDED."is_veg",
    "hsn_sac_code" = EXCLUDED."hsn_sac_code",
    "price_tax_mode" = EXCLUDED."price_tax_mode",
    "updated_at" = CURRENT_TIMESTAMP;

DELETE FROM "menu_items"
WHERE "restaurant_id" = 'cravexp_dark_store_01';
END IF;
END $$;

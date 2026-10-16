ALTER TABLE "cravexp_products"
ADD COLUMN IF NOT EXISTS "barcode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "cravexp_products_barcode_key"
ON "cravexp_products"("barcode");

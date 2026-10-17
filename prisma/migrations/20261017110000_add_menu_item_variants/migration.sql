ALTER TABLE "menu_items"
ADD COLUMN "restaurant_price" INTEGER;

CREATE TABLE "menu_item_variants" (
    "id" TEXT NOT NULL,
    "menu_item_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurant_price" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "in_stock" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "menu_item_variants_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "menu_item_variants_menu_item_id_fkey"
      FOREIGN KEY ("menu_item_id") REFERENCES "menu_items"("id")
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "menu_item_variants_price_check"
      CHECK ("price" >= "restaurant_price" AND "restaurant_price" >= 0)
);

CREATE UNIQUE INDEX "menu_item_variants_menu_item_id_name_key"
ON "menu_item_variants"("menu_item_id", "name");

CREATE INDEX "menu_item_variants_menu_item_id_sort_order_idx"
ON "menu_item_variants"("menu_item_id", "sort_order");

ALTER TABLE "menu_items"
ADD CONSTRAINT "menu_items_dual_price_check"
CHECK ("restaurant_price" IS NULL OR ("restaurant_price" >= 0 AND "price" >= "restaurant_price"));

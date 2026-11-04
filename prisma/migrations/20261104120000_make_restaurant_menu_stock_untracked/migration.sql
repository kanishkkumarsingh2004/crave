-- Restaurant food is made to order. A NULL count represents untracked inventory;
-- availability continues to be controlled by the restaurant's in_stock toggle.
ALTER TABLE "menu_items"
ALTER COLUMN "stock_count" DROP DEFAULT,
ALTER COLUMN "stock_count" DROP NOT NULL;

UPDATE "menu_items"
SET "stock_count" = NULL;

-- The customer cart and order pipeline use this stable virtual fulfillment hub.
-- Operational XP stores remain separate records managed by administrators.
INSERT INTO "restaurants" (
    "id",
    "name",
    "cuisine",
    "rating",
    "address",
    "is_dark_store",
    "is_open",
    "rating_count",
    "delivery_minutes",
    "latitude",
    "longitude"
)
VALUES (
    'cravexp_dark_store_01',
    'craveXP 10 Store Hub',
    'craveXP Instamart 10-Min Store',
    4.9,
    'Kanakapura Road Central Warehouse, Bengaluru',
    true,
    true,
    5200,
    10,
    12.8913,
    77.4760
)
ON CONFLICT ("id") DO UPDATE SET
    "name" = EXCLUDED."name",
    "cuisine" = EXCLUDED."cuisine",
    "address" = EXCLUDED."address",
    "is_dark_store" = true,
    "is_open" = true,
    "delivery_minutes" = EXCLUDED."delivery_minutes",
    "latitude" = COALESCE("restaurants"."latitude", EXCLUDED."latitude"),
    "longitude" = COALESCE("restaurants"."longitude", EXCLUDED."longitude");

DROP INDEX IF EXISTS "orders_one_active_order_per_driver_idx";

CREATE UNIQUE INDEX "orders_one_active_order_per_driver_idx"
ON "orders"("rider_id")
WHERE "rider_id" IS NOT NULL
  AND "status" IN (
    'sent_to_vendor',
    'preparing',
    'packing',
    'ready_for_pickup',
    'rider_assigned',
    'picked_up',
    'out_for_delivery'
  );

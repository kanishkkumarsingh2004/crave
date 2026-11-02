-- Enforce one active order per driver at the database level.
--
-- A partial unique index on rider_id where the order is in an active
-- fulfillment state prevents two concurrent claims from assigning the
-- same driver to two different orders. The application-level check in
-- claimOrderForDriverAtomic (lib/dal/orders.ts) remains in place to
-- return a clear, user-facing error message, but this PostgreSQL
-- constraint is the authoritative serialization mechanism: even if the
-- application check races or is bypassed, the DB rejects a second
-- active assignment for the same driver.
--
-- Prisma does not support partial indexes via @@index, so this is a
-- raw SQL migration. It complements (does not replace) the existing
-- @@index([rider_id, status]) on the Order model.

CREATE UNIQUE INDEX IF NOT EXISTS "orders_one_active_order_per_driver_idx"
ON "orders"("rider_id")
WHERE "rider_id" IS NOT NULL
  AND "status" IN (
    'sent_to_vendor',
    'preparing',
    'packing',
    'ready_for_pickup',
    'rider_assigned',
    'out_for_delivery'
  );

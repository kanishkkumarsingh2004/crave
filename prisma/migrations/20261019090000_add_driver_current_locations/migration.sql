CREATE TABLE "driver_current_locations" (
    "driver_id" TEXT NOT NULL,
    "latitude" DECIMAL(10, 8) NOT NULL,
    "longitude" DECIMAL(11, 8) NOT NULL,
    "h3_cell" TEXT NOT NULL,
    "resolution" INTEGER NOT NULL DEFAULT 8,
    "status" TEXT NOT NULL DEFAULT 'ONLINE',
    "available" BOOLEAN NOT NULL DEFAULT true,
    "vehicle_type" TEXT,
    "reported_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_current_locations_pkey" PRIMARY KEY ("driver_id"),
    CONSTRAINT "driver_current_locations_driver_id_fkey"
      FOREIGN KEY ("driver_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "driver_current_locations_status_updated_at_idx"
ON "driver_current_locations"("status", "updated_at");

CREATE INDEX "driver_current_locations_h3_cell_idx"
ON "driver_current_locations"("h3_cell");

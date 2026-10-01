import { prisma } from "../packages/database/src";

async function main() {
  console.log("Applying vendor columns migration...");
  await prisma.$executeRawUnsafe('ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "bannerUrl" TEXT;');
  await prisma.$executeRawUnsafe('ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "commissionType" TEXT DEFAULT \'COMMISSION\';');
  await prisma.$executeRawUnsafe('ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "commissionRate" DECIMAL(5,2) DEFAULT 15.00;');
  await prisma.$executeRawUnsafe('ALTER TABLE "vendors" ADD COLUMN IF NOT EXISTS "isPricingLocked" BOOLEAN DEFAULT true;');
  console.log("✅ Vendor columns added successfully.");

  const cols = await prisma.$queryRawUnsafe<any[]>(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vendors'"
  );
  console.log("Updated columns:", cols.map((c) => c.column_name));
  process.exit(0);
}

main().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

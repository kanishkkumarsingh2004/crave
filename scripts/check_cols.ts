import { prisma } from "../packages/database/src";

async function main() {
  const cols = await prisma.$queryRawUnsafe<any[]>(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vendors'"
  );
  console.log("VENDORS_COLUMNS:", cols.map((c) => `${c.column_name} (${c.data_type})`));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

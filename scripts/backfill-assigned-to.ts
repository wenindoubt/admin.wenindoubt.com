import { isNull } from "drizzle-orm";
import { db } from "../src/db";
import { deals } from "../src/db/schema";

const CLERK_USER_ID = process.argv[2];
if (!CLERK_USER_ID) {
  console.error(
    "Usage: npx tsx scripts/backfill-assigned-to.ts <clerk-user-id>",
  );
  process.exit(1);
}

async function main() {
  const result = await db
    .update(deals)
    .set({ assignedTo: CLERK_USER_ID })
    .where(isNull(deals.assignedTo))
    .returning({ id: deals.id, title: deals.title });

  console.log(`Updated ${result.length} deals:`);
  for (const deal of result) {
    console.log(`  - ${deal.title} (${deal.id})`);
  }
  process.exit(0);
}

main();

/**
 * Delete an API key by ID.
 *
 * Usage:
 *   mise run api:list              # find the key ID first
 *   mise run api:delete <id>
 *   npx tsx scripts/delete-api-key.ts <id>
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { apiKeys } from "../src/db/schema";

const id = process.argv[2];
if (!id?.trim()) {
  console.error("Usage: npx tsx scripts/delete-api-key.ts <key-id>");
  console.error("Run `mise run api:list` to see all key IDs.");
  process.exit(1);
}

async function main() {
  const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conn);

  const [deleted] = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, id.trim()))
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      keyPrefix: apiKeys.keyPrefix,
    });

  if (!deleted) {
    console.error(`No key found with ID: ${id}`);
    await conn.end();
    process.exit(1);
  }

  console.log(
    `Deleted: [${deleted.keyPrefix}...] "${deleted.name}" (${deleted.id})`,
  );
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

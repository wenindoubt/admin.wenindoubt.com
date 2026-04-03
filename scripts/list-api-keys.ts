/**
 * List all API keys.
 *
 * Usage:
 *   mise run api:list
 *   npx tsx scripts/list-api-keys.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { apiKeys } from "../src/db/schema";

async function main() {
  const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conn);

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.keyPrefix,
      createdAt: apiKeys.createdAt,
      lastUsedAt: apiKeys.lastUsedAt,
      revokedAt: apiKeys.revokedAt,
    })
    .from(apiKeys)
    .orderBy(apiKeys.createdAt);

  if (rows.length === 0) {
    console.log("No API keys found.");
  } else {
    console.table(rows);
  }

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Generate a new API key + HMAC secret for the /api/v1/ingest endpoint.
 *
 * Usage:
 *   mise run api:keygen "My Integration Name"
 *   npx tsx scripts/generate-api-key.ts "My Integration Name"
 *
 * Output: prints plaintext API key and HMAC secret once — store securely.
 */
import { createHash, randomBytes } from "node:crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { apiKeys } from "../src/db/schema";

const name = process.argv[2];
if (!name?.trim()) {
  console.error("Usage: npx tsx scripts/generate-api-key.ts <name>");
  console.error('Example: npx tsx scripts/generate-api-key.ts "OpenClaw Skill"');
  process.exit(1);
}

async function main() {
  const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conn);

  const apiKey = `wid_${randomBytes(32).toString("hex")}`;
  const hmacSecret = randomBytes(32).toString("hex");
  const keyHash = createHash("sha256").update(apiKey).digest("hex");
  const keyPrefix = apiKey.slice(0, 12); // "wid_" + 8 hex chars

  const [row] = await db
    .insert(apiKeys)
    .values({
      name: name!.trim(),
      keyPrefix,
      keyHash,
      hmacSecret,
      scopes: ["ingest"],
    })
    .returning({ id: apiKeys.id });

  console.log("\n=== New API Key Generated ===");
  console.log(`Name:        ${name!.trim()}`);
  console.log(`Key ID:      ${row.id}`);
  console.log(`API Key:     ${apiKey}`);
  console.log(`HMAC Secret: ${hmacSecret}`);
  console.log("\n!! Store these values securely. They cannot be recovered. !!\n");

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * E2E test data cleanup — called from global setup (stale data) and teardown.
 */
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export async function cleanupE2EData() {
  const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conn);

  try {
    // Deals must be deleted before contacts (restrict FK).
    // Group 1: independent tables
    const [deals, notes, tags] = await Promise.all([
      db.execute(sql`DELETE FROM deals WHERE title LIKE 'E2E%'`),
      db.execute(sql`DELETE FROM notes WHERE title LIKE 'E2E%'`),
      db.execute(sql`DELETE FROM tags WHERE name LIKE 'E2E%'`),
    ]);

    // Group 2: depends on deals being gone
    const [contacts, companies] = await Promise.all([
      db.execute(sql`DELETE FROM contacts WHERE first_name LIKE 'E2E%'`),
      db.execute(sql`DELETE FROM companies WHERE name LIKE 'E2E%'`),
    ]);

    const total =
      deals.count + notes.count + contacts.count + companies.count + tags.count;

    if (total > 0) {
      console.log(
        `[e2e cleanup] removed ${deals.count} deals, ${contacts.count} contacts, ${companies.count} companies, ${notes.count} notes, ${tags.count} tags`,
      );
    }
  } finally {
    await conn.end();
  }
}

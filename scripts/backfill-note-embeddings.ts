/**
 * Backfill embeddings and token counts for notes missing them.
 *
 * Run: npx tsx scripts/backfill-note-embeddings.ts
 */
const BATCH_SIZE = 5;
const DELAY_MS = 100;

async function main() {
  const { eq, isNull, or } = await import("drizzle-orm");
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const postgres = (await import("postgres")).default;
  const { notes } = await import("../src/db/schema");
  const { generateEmbedding } = await import("../src/lib/ai/embeddings");
  const { default: Anthropic } = await import("@anthropic-ai/sdk");

  const conn = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(conn);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL!;

  async function countTokens(text: string): Promise<number> {
    const result = await anthropic.messages.countTokens({
      model,
      messages: [{ role: "user", content: text }],
    });
    return result.input_tokens;
  }

  async function processNote(note: { id: string; content: string }) {
    const [embedding, tokenCount] = await Promise.all([
      generateEmbedding(note.content),
      countTokens(note.content),
    ]);
    await db
      .update(notes)
      .set({ embedding, tokenCount })
      .where(eq(notes.id, note.id));
  }

  const pending = await db
    .select({ id: notes.id, content: notes.content })
    .from(notes)
    .where(or(isNull(notes.embedding), isNull(notes.tokenCount)));

  console.log(
    `Found ${pending.length} notes to process (batch size: ${BATCH_SIZE})\n`,
  );

  let success = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    const batch = pending.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(processNote));

    for (const r of results) {
      if (r.status === "fulfilled") success++;
      else {
        failed++;
        console.error(`\n  Failed:`, r.reason);
      }
    }

    process.stdout.write(`\r  Progress: ${success + failed}/${pending.length}`);

    if (i + BATCH_SIZE < pending.length && DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  console.log(`\n\nDone! ${success} processed, ${failed} failed`);
  await conn.end();
}

main().catch(console.error);

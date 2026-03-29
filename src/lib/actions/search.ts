"use server";

import { auth } from "@clerk/nextjs/server";
import { and, cosineDistance, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";

export async function findRelevantNotes(
  query: string,
  entityFilter: {
    dealId?: string;
    contactId?: string;
    companyId?: string;
  },
  options?: { limit?: number; minSimilarity?: number },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const limit = options?.limit ?? 20;
  const minSimilarity = options?.minSimilarity ?? 0.7;

  const conditions = [];
  if (entityFilter.dealId)
    conditions.push(eq(notes.dealId, entityFilter.dealId));
  if (entityFilter.contactId)
    conditions.push(eq(notes.contactId, entityFilter.contactId));
  if (entityFilter.companyId)
    conditions.push(eq(notes.companyId, entityFilter.companyId));

  if (conditions.length === 0) return [];

  const entityWhere = or(...conditions);

  const queryEmbedding = await generateEmbedding(query, "RETRIEVAL_QUERY");
  const similarity = sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`;

  const [semanticResults, recentResults] = await Promise.all([
    db
      .select({ note: notes, similarity })
      .from(notes)
      .where(and(entityWhere, sql`${notes.embedding} IS NOT NULL`))
      .orderBy(desc(similarity))
      .limit(limit),
    db
      .select()
      .from(notes)
      .where(entityWhere)
      .orderBy(desc(notes.createdAt))
      .limit(5),
  ]);

  // Merge: semantic above threshold + recent, deduplicated
  const seen = new Set<string>();
  const merged = [];

  for (const r of semanticResults) {
    if (r.similarity >= minSimilarity && !seen.has(r.note.id)) {
      seen.add(r.note.id);
      merged.push(r.note);
    }
  }

  for (const n of recentResults) {
    if (!seen.has(n.id)) {
      seen.add(n.id);
      merged.push(n);
    }
  }

  return merged;
}

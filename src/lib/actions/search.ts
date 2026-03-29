"use server";

import { auth } from "@clerk/nextjs/server";
import { and, cosineDistance, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, dealInsights, deals, notes } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";

export async function semanticSearch(query: string, limit = 10) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const queryEmbedding = await generateEmbedding(query, "RETRIEVAL_QUERY");

  const similarity = sql<number>`1 - (${cosineDistance(dealInsights.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      insight: dealInsights,
      deal: deals,
      company: companies,
      similarity,
    })
    .from(dealInsights)
    .innerJoin(deals, eq(dealInsights.dealId, deals.id))
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(sql`${dealInsights.embedding} IS NOT NULL`)
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map((r) => ({
    dealId: r.deal.id,
    dealTitle: r.deal.title,
    companyName: r.company.name,
    summary: r.insight.summary,
    similarity: r.similarity,
  }));
}

export async function findSimilarDeals(dealId: string, limit = 5) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the embedding for the source deal
  const [sourceInsight] = await db
    .select()
    .from(dealInsights)
    .where(eq(dealInsights.dealId, dealId))
    .orderBy(desc(dealInsights.generatedAt))
    .limit(1);

  if (!sourceInsight?.embedding) {
    return [];
  }

  const similarity = sql<number>`1 - (${cosineDistance(dealInsights.embedding, sourceInsight.embedding)})`;

  const results = await db
    .select({
      insight: dealInsights,
      deal: deals,
      company: companies,
      similarity,
    })
    .from(dealInsights)
    .innerJoin(deals, eq(dealInsights.dealId, deals.id))
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(
      sql`${dealInsights.dealId} != ${dealId} AND ${dealInsights.embedding} IS NOT NULL`,
    )
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map((r) => ({
    dealId: r.deal.id,
    dealTitle: r.deal.title,
    companyName: r.company.name,
    summary: r.insight.summary,
    similarity: r.similarity,
  }));
}

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

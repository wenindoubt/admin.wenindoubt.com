"use server";

import { auth } from "@clerk/nextjs/server";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, dealInsights, deals } from "@/db/schema";
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

"use server";

import { auth } from "@clerk/nextjs/server";
import { cosineDistance, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { leadInsights, leads } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";

export async function semanticSearch(query: string, limit = 10) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const queryEmbedding = await generateEmbedding(query, "RETRIEVAL_QUERY");

  const similarity = sql<number>`1 - (${cosineDistance(leadInsights.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      insight: leadInsights,
      lead: leads,
      similarity,
    })
    .from(leadInsights)
    .innerJoin(leads, eq(leadInsights.leadId, leads.id))
    .where(sql`${leadInsights.embedding} IS NOT NULL`)
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map((r) => ({
    leadId: r.lead.id,
    leadName: `${r.lead.firstName} ${r.lead.lastName}`,
    companyName: r.lead.companyName,
    summary: r.insight.summary,
    similarity: r.similarity,
  }));
}

export async function findSimilarLeads(leadId: string, limit = 5) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Get the embedding for the source lead
  const [sourceInsight] = await db
    .select()
    .from(leadInsights)
    .where(eq(leadInsights.leadId, leadId))
    .orderBy(desc(leadInsights.generatedAt))
    .limit(1);

  if (!sourceInsight?.embedding) {
    return [];
  }

  const similarity = sql<number>`1 - (${cosineDistance(leadInsights.embedding, sourceInsight.embedding)})`;

  const results = await db
    .select({
      insight: leadInsights,
      lead: leads,
      similarity,
    })
    .from(leadInsights)
    .innerJoin(leads, eq(leadInsights.leadId, leads.id))
    .where(
      sql`${leadInsights.leadId} != ${leadId} AND ${leadInsights.embedding} IS NOT NULL`,
    )
    .orderBy(desc(similarity))
    .limit(limit);

  return results.map((r) => ({
    leadId: r.lead.id,
    leadName: `${r.lead.firstName} ${r.lead.lastName}`,
    companyName: r.lead.companyName,
    summary: r.insight.summary,
    similarity: r.similarity,
  }));
}

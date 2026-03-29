"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  companies,
  contacts,
  dealActivities,
  dealInsights,
  deals,
} from "@/db/schema";
import { claude, getClaudeModel } from "@/lib/ai/claude";
import { buildDealContext } from "@/lib/ai/context";
import {
  COMPANY_RESEARCH_SYSTEM,
  DEAL_SCORING_SYSTEM,
  NEXT_STEPS_SYSTEM,
  OUTREACH_DRAFT_SYSTEM,
} from "@/lib/ai/prompts";

async function fetchDealWithRelations(dealId: string) {
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) throw new Error("Deal not found");

  const [companyRows, contactRows, activities] = await Promise.all([
    db.select().from(companies).where(eq(companies.id, deal.companyId)),
    deal.primaryContactId
      ? db.select().from(contacts).where(eq(contacts.id, deal.primaryContactId))
      : Promise.resolve([]),
    db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(dealActivities.createdAt),
  ]);

  const company = companyRows[0];
  if (!company) throw new Error("Company not found");

  return { deal, company, contact: contactRows[0] ?? null, activities };
}

async function callClaude(
  system: string,
  userContent: string,
): Promise<string> {
  const response = await claude.messages.create({
    model: getClaudeModel(),
    max_tokens: 2048,
    system,
    messages: [{ role: "user", content: userContent }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block?.text ?? "";
}

function parseJson(text: string): unknown {
  const match =
    text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Invalid JSON response");
  return JSON.parse(match[1] ?? match[0]);
}

export async function scoreDeal(dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { deal, company, contact, activities } =
    await fetchDealWithRelations(dealId);
  const context = buildDealContext(deal, company, contact, activities);

  const text = await callClaude(
    DEAL_SCORING_SYSTEM,
    `Score this deal:\n\n${context}`,
  );
  return parseJson(text);
}

export async function researchCompany(companyId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId));
  if (!company) throw new Error("Company not found");

  const prompt = [
    `Company: ${company.name}`,
    company.website && `Website: ${company.website}`,
    company.industry && `Industry: ${company.industry}`,
  ]
    .filter(Boolean)
    .join("\n");

  return callClaude(
    COMPANY_RESEARCH_SYSTEM,
    `Research this company:\n\n${prompt}`,
  );
}

export async function draftOutreach(dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { deal, company, contact, activities } =
    await fetchDealWithRelations(dealId);
  const context = buildDealContext(deal, company, contact, activities);

  return callClaude(
    OUTREACH_DRAFT_SYSTEM,
    `Draft an outreach email for this deal:\n\n${context}`,
  );
}

export async function suggestNextSteps(dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { deal, company, contact, activities } =
    await fetchDealWithRelations(dealId);
  const context = buildDealContext(deal, company, contact, activities);

  const text = await callClaude(
    NEXT_STEPS_SYSTEM,
    `Suggest next steps for this deal:\n\n${context}`,
  );
  return parseJson(text);
}

export async function deleteInsight(insightId: string, dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(dealInsights)
    .where(
      and(eq(dealInsights.id, insightId), eq(dealInsights.dealId, dealId)),
    );

  revalidatePath(`/deals/${dealId}`);
}

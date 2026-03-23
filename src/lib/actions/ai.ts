"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { leadInsights, leads } from "@/db/schema";
import { claude } from "@/lib/ai/claude";
import { GEMINI_MODEL, gemini } from "@/lib/ai/gemini";
import {
  COMPANY_RESEARCH_SYSTEM,
  LEAD_SCORING_SYSTEM,
  NEXT_STEPS_SYSTEM,
  OUTREACH_DRAFT_SYSTEM,
} from "@/lib/ai/prompts";

function buildLeadContext(lead: typeof leads.$inferSelect): string {
  return [
    `Name: ${lead.firstName} ${lead.lastName}`,
    lead.email && `Email: ${lead.email}`,
    lead.companyName && `Company: ${lead.companyName}`,
    lead.companyWebsite && `Website: ${lead.companyWebsite}`,
    lead.jobTitle && `Title: ${lead.jobTitle}`,
    lead.industry && `Industry: ${lead.industry}`,
    lead.companySize && `Company Size: ${lead.companySize}`,
    lead.sourceDetail && `Source Detail: ${lead.sourceDetail}`,
    lead.estimatedValue && `Estimated Value: $${lead.estimatedValue}`,
    `Status: ${lead.status}`,
    `Source: ${lead.source}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function scoreLead(leadId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const context = buildLeadContext(lead);

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${LEAD_SCORING_SYSTEM}\n\nLead data:\n${context}`,
  });

  const text = response.text ?? "";
  // Extract JSON from potential markdown code block
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid scoring response");

  return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
}

export async function researchCompany(leadId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const prompt = [
    lead.companyName && `Company: ${lead.companyName}`,
    lead.companyWebsite && `Website: ${lead.companyWebsite}`,
    lead.industry && `Industry: ${lead.industry}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${COMPANY_RESEARCH_SYSTEM}\n\n${prompt}`,
  });

  return response.text ?? "";
}

export async function draftOutreach(leadId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const context = buildLeadContext(lead);

  const response = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: OUTREACH_DRAFT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Draft an outreach email for this lead:\n\n${context}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text ?? "";
}

export async function suggestNextSteps(leadId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) throw new Error("Lead not found");

  const context = buildLeadContext(lead);

  const response = await gemini.models.generateContent({
    model: GEMINI_MODEL,
    contents: `${NEXT_STEPS_SYSTEM}\n\nLead data:\n${context}`,
  });

  const text = response.text ?? "";
  const jsonMatch =
    text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Invalid response");

  return JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
}

export async function deleteInsight(insightId: string, leadId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(leadInsights)
    .where(
      and(eq(leadInsights.id, insightId), eq(leadInsights.leadId, leadId)),
    );

  revalidatePath(`/leads/${leadId}`);
}

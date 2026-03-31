import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { companies, contacts, dealActivities, deals, notes } from "@/db/schema";
import { claude, getClaudeModel } from "@/lib/ai/claude";
import { buildDealContext, estimateContextTokens } from "@/lib/ai/context";
import {
  OUTREACH_DRAFT_SYSTEM,
  OUTREACH_PARTIAL_REGENERATE_SYSTEM,
  OUTREACH_REGENERATE_SYSTEM,
} from "@/lib/ai/prompts";
import { buildDealNoteConditions } from "@/lib/note-utils";

const MAX_INSTRUCTIONS_LENGTH = 500;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { dealId, mode, currentBody, selectedText, instructions } =
    await req.json();

  if (!dealId) {
    return new Response("Missing dealId", { status: 400 });
  }

  if (
    typeof instructions === "string" &&
    instructions.trim().length > MAX_INSTRUCTIONS_LENGTH
  ) {
    return new Response(
      `Instructions too long (max ${MAX_INSTRUCTIONS_LENGTH} characters)`,
      { status: 400 },
    );
  }

  const [deal] = await db
    .select({
      id: deals.id,
      title: deals.title,
      sourceDetail: deals.sourceDetail,
      estimatedValue: deals.estimatedValue,
      stage: deals.stage,
      source: deals.source,
      followUpAt: deals.followUpAt,
      companyId: deals.companyId,
      primaryContactId: deals.primaryContactId,
    })
    .from(deals)
    .where(eq(deals.id, dealId));
  if (!deal) {
    return new Response("Deal not found", { status: 404 });
  }

  const [companyRows, contactRows, activities, contextNotes] =
    await Promise.all([
      db
        .select({
          name: companies.name,
          website: companies.website,
          industry: companies.industry,
          size: companies.size,
        })
        .from(companies)
        .where(eq(companies.id, deal.companyId)),
      deal.primaryContactId
        ? db
            .select({
              firstName: contacts.firstName,
              lastName: contacts.lastName,
              email: contacts.email,
              phone: contacts.phone,
              jobTitle: contacts.jobTitle,
            })
            .from(contacts)
            .where(eq(contacts.id, deal.primaryContactId))
        : Promise.resolve([]),
      db
        .select({
          createdAt: dealActivities.createdAt,
          type: dealActivities.type,
          description: dealActivities.description,
        })
        .from(dealActivities)
        .where(eq(dealActivities.dealId, dealId))
        .orderBy(dealActivities.createdAt)
        .limit(50),
      db
        .select({
          title: notes.title,
          content: notes.content,
          type: notes.type,
          createdAt: notes.createdAt,
        })
        .from(notes)
        .where(
          buildDealNoteConditions(
            dealId,
            deal.primaryContactId ? [deal.primaryContactId] : [],
            deal.companyId,
          ),
        ),
    ]);
  const company = companyRows[0];
  if (!company) {
    return new Response("Company not found", { status: 404 });
  }
  const contact = contactRows[0] ?? null;
  const context = buildDealContext(
    deal,
    company,
    contact ? [contact] : [],
    activities,
    contextNotes,
  );

  const { warning: tokenWarning } = estimateContextTokens(context);

  let systemPrompt: string;
  let userMessage: string;

  const wrappedContext = `<deal_context>\n${context}\n</deal_context>`;
  const wrappedInstructions = instructions
    ? `\n<user_instructions>\n${instructions.trim()}\n</user_instructions>`
    : "";

  switch (mode) {
    case "regenerate_full":
      systemPrompt = OUTREACH_REGENERATE_SYSTEM;
      userMessage = `<original_email>\n${currentBody}\n</original_email>\n\n${wrappedContext}${wrappedInstructions}`;
      break;
    case "regenerate_partial":
      systemPrompt = OUTREACH_PARTIAL_REGENERATE_SYSTEM;
      userMessage = `<full_email>\n${currentBody}\n</full_email>\n\n<selected_text>\n${selectedText}\n</selected_text>\n\n${wrappedContext}${wrappedInstructions}`;
      break;
    default:
      systemPrompt = OUTREACH_DRAFT_SYSTEM;
      userMessage = `Draft an outreach email for this deal:\n\n${wrappedContext}`;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = claude.messages.stream({
          model: getClaudeModel(),
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const headers: Record<string, string> = {
    "Content-Type": "text/plain; charset=utf-8",
    "Transfer-Encoding": "chunked",
  };
  if (tokenWarning) {
    headers["X-Token-Warning"] = tokenWarning;
  }

  return new Response(stream, { headers });
}

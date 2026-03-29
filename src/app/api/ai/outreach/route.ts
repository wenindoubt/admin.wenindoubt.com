import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { companies, contacts, dealActivities, deals } from "@/db/schema";
import { claude } from "@/lib/ai/claude";
import { buildDealContext } from "@/lib/ai/context";
import {
  OUTREACH_DRAFT_SYSTEM,
  OUTREACH_PARTIAL_REGENERATE_SYSTEM,
  OUTREACH_REGENERATE_SYSTEM,
} from "@/lib/ai/prompts";

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

  // Fetch deal context
  const [deal] = await db.select().from(deals).where(eq(deals.id, dealId));
  if (!deal) {
    return new Response("Deal not found", { status: 404 });
  }

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, deal.companyId));
  if (!company) {
    return new Response("Company not found", { status: 404 });
  }

  const [contactRows, activities] = await Promise.all([
    deal.primaryContactId
      ? db.select().from(contacts).where(eq(contacts.id, deal.primaryContactId))
      : Promise.resolve([]),
    db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(dealActivities.createdAt),
  ]);
  const contact = contactRows[0] ?? null;
  const context = buildDealContext(deal, company, contact, activities);

  // Select prompt and build user message based on mode
  let systemPrompt: string;
  let userMessage: string;

  switch (mode) {
    case "regenerate_full":
      systemPrompt = OUTREACH_REGENERATE_SYSTEM;
      userMessage = [
        `Original email:\n${currentBody}`,
        `\nDeal context:\n${context}`,
        instructions ? `\nInstructions: ${instructions}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "regenerate_partial":
      systemPrompt = OUTREACH_PARTIAL_REGENERATE_SYSTEM;
      userMessage = [
        `Full email:\n${currentBody}`,
        `\nSelected text to rewrite:\n${selectedText}`,
        `\nDeal context:\n${context}`,
        instructions ? `\nInstructions: ${instructions}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      break;
    default:
      systemPrompt = OUTREACH_DRAFT_SYSTEM;
      userMessage = `Draft an outreach email for this deal:\n\n${context}`;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = claude.messages.stream({
          model: "claude-sonnet-4-6",
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

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}

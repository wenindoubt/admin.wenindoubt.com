import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import {
  companies,
  contacts,
  dealActivities,
  dealInsights,
  deals,
} from "@/db/schema";
import { claude } from "@/lib/ai/claude";
import { buildDealContext } from "@/lib/ai/context";
import { generateEmbedding } from "@/lib/ai/embeddings";
import {
  DEAL_ANALYSIS_SYSTEM,
  DEAL_CUSTOM_ANALYSIS_SYSTEM,
} from "@/lib/ai/prompts";

const MAX_PROMPT_LENGTH = 500;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { dealId, prompt } = await req.json();
  if (!dealId) {
    return new Response("Missing dealId", { status: 400 });
  }

  const isCustom = typeof prompt === "string" && prompt.trim().length > 0;

  if (isCustom && prompt.trim().length > MAX_PROMPT_LENGTH) {
    return new Response(
      `Prompt too long (max ${MAX_PROMPT_LENGTH} characters)`,
      { status: 400 },
    );
  }

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

  const dealFields = buildDealContext(deal, company, contact, activities);
  const context = `<deal_data>\n${dealFields}\n</deal_data>`;

  const systemPrompt = isCustom
    ? DEAL_CUSTOM_ANALYSIS_SYSTEM
    : DEAL_ANALYSIS_SYSTEM;

  const userMessage = isCustom
    ? `${context}\n\n<question>\n${prompt.trim()}\n</question>`
    : `Analyze this deal:\n\n${context}`;

  // Stream Claude response
  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = claude.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            fullText += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Save insight to DB
        const summary = fullText.substring(0, 200).split("\n")[0];
        const embedding = await generateEmbedding(fullText);

        await db.insert(dealInsights).values({
          dealId,
          prompt: isCustom ? prompt.trim() : null,
          rawInput: dealFields,
          analysisText: fullText,
          summary,
          embedding,
          analysisModel: "claude-sonnet-4-6",
        });

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

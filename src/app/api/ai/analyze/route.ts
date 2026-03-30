import { auth } from "@clerk/nextjs/server";
import { eq, inArray } from "drizzle-orm";
import { after, type NextRequest } from "next/server";
import { db } from "@/db";
import {
  companies,
  contacts,
  dealActivities,
  dealContacts,
  dealInsights,
  deals,
  notes,
} from "@/db/schema";
import { findRelevantNotes } from "@/lib/actions/search";
import { claude, getClaudeModel } from "@/lib/ai/claude";
import { buildDealContext } from "@/lib/ai/context";
import { generateEmbedding } from "@/lib/ai/embeddings";
import {
  DEAL_ANALYSIS_SYSTEM,
  DEAL_CUSTOM_ANALYSIS_SYSTEM,
} from "@/lib/ai/prompts";
import { buildDealNoteConditions } from "@/lib/note-utils";

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

  // Fetch all associated contacts from junction table
  const dealContactRows = await db
    .select({ contactId: dealContacts.contactId })
    .from(dealContacts)
    .where(eq(dealContacts.dealId, dealId));
  const contactIds = dealContactRows.map((r) => r.contactId);

  const entityFilter = {
    dealId,
    contactIds: contactIds.length > 0 ? contactIds : undefined,
    companyId: deal.companyId,
  };

  // Custom query: semantic retrieval. Full analysis: all notes.
  const [contactRows, activities, contextNotes] = await Promise.all([
    contactIds.length > 0
      ? db.select().from(contacts).where(inArray(contacts.id, contactIds))
      : Promise.resolve([]),
    db
      .select()
      .from(dealActivities)
      .where(eq(dealActivities.dealId, dealId))
      .orderBy(dealActivities.createdAt),
    isCustom
      ? findRelevantNotes(prompt.trim(), entityFilter)
      : db
          .select()
          .from(notes)
          .where(buildDealNoteConditions(dealId, contactIds, deal.companyId)),
  ]);

  // Sort so primary contact is first
  const sortedContacts = contactRows.sort((a, b) =>
    a.id === deal.primaryContactId
      ? -1
      : b.id === deal.primaryContactId
        ? 1
        : 0,
  );

  const dealFields = buildDealContext(
    deal,
    company,
    sortedContacts,
    activities,
    contextNotes,
  );
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
          model: getClaudeModel(),
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

        const capturedText = fullText;
        after(async () => {
          try {
            const summary = capturedText.substring(0, 200).split("\n")[0];
            const embedding = await generateEmbedding(capturedText);
            await db.insert(dealInsights).values({
              dealId,
              prompt: isCustom ? prompt.trim() : null,
              rawInput: dealFields,
              analysisText: capturedText,
              summary,
              embedding,
              analysisModel: getClaudeModel(),
            });
          } catch (error) {
            console.error("Failed to persist insight for deal", dealId, error);
          }
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

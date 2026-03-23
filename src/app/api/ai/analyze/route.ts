import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { leadInsights, leads } from "@/db/schema";
import { claude } from "@/lib/ai/claude";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { LEAD_ANALYSIS_SYSTEM } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { leadId } = await req.json();
  if (!leadId) {
    return new Response("Missing leadId", { status: 400 });
  }

  const [lead] = await db.select().from(leads).where(eq(leads.id, leadId));
  if (!lead) {
    return new Response("Lead not found", { status: 404 });
  }

  // Build context from lead data
  const context = [
    `Name: ${lead.firstName} ${lead.lastName}`,
    lead.email && `Email: ${lead.email}`,
    lead.phone && `Phone: ${lead.phone}`,
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

  // Stream Claude response
  const encoder = new TextEncoder();
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await claude.messages.stream({
          model: "claude-sonnet-4-6-20250514",
          max_tokens: 1024,
          system: LEAD_ANALYSIS_SYSTEM,
          messages: [
            {
              role: "user",
              content: `Analyze this lead:\n\n${context}`,
            },
          ],
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

        await db.insert(leadInsights).values({
          leadId,
          rawInput: context,
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

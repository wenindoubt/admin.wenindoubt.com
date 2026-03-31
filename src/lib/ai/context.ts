import type { Company, Contact, Deal, DealActivity, Note } from "@/db/schema";
import { formatPhoneDisplay } from "@/lib/phone";

type DealContext = Pick<
  Deal,
  | "title"
  | "sourceDetail"
  | "estimatedValue"
  | "stage"
  | "source"
  | "followUpAt"
>;

type CompanyContext = Pick<Company, "name" | "website" | "industry" | "size">;

type ContactContext = Pick<
  Contact,
  "firstName" | "lastName" | "email" | "phone" | "jobTitle"
>;

type ActivityContext = Pick<DealActivity, "createdAt" | "type" | "description">;

type NoteContext = Pick<Note, "title" | "content" | "type" | "createdAt">;

/** Build a text summary of deal + company + contact fields for AI context and staleness detection */
export function buildDealContext(
  deal: DealContext,
  company: CompanyContext,
  contacts: ContactContext[],
  activities?: ActivityContext[],
  notes?: NoteContext[],
): string {
  const contactFields = contacts.flatMap((c, i) => {
    const label = i === 0 ? "Primary Contact" : "Additional Contact";
    return [
      `${label}: ${c.firstName} ${c.lastName}`,
      c.email && `  Email: ${c.email}`,
      c.phone && `  Phone: ${formatPhoneDisplay(c.phone)}`,
      c.jobTitle && `  Title: ${c.jobTitle}`,
    ];
  });
  const fields = [
    `Deal: ${deal.title}`,
    ...contactFields,
    `Company: ${company.name}`,
    company.website && `Website: ${company.website}`,
    company.industry && `Industry: ${company.industry}`,
    company.size && `Company Size: ${company.size}`,
    deal.sourceDetail && `Source Detail: ${deal.sourceDetail}`,
    deal.estimatedValue && `Estimated Value: $${deal.estimatedValue}`,
    `Stage: ${deal.stage}`,
    `Source: ${deal.source}`,
    deal.followUpAt &&
      `Follow-Up Date: ${new Date(deal.followUpAt).toLocaleDateString()}`,
  ]
    .filter(Boolean)
    .join("\n");

  let result = fields;

  if (activities && activities.length > 0) {
    const recent = activities.slice(0, 10);
    const activityLog = recent
      .map(
        (a) =>
          `- [${new Date(a.createdAt).toLocaleDateString()}] ${a.type}: ${a.description}`,
      )
      .join("\n");
    result += `\n\nRecent Activity (newest first):\n${activityLog}`;
  }

  if (notes && notes.length > 0) {
    // Sort chronologically oldest→newest so the AI reads them in narrative order
    // and naturally treats the last note as the most current state
    const sorted = [...notes].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    const noteLog = sorted
      .map((n) => {
        const ts = new Date(n.createdAt).toISOString();
        const title = n.title ? ` ${n.title}:` : ":";
        return `- [${ts}] (${n.type})${title} ${n.content}`;
      })
      .join("\n");
    result += `\n\nRelated Notes (${sorted.length} total, chronological):\n${noteLog}`;
  }

  return result;
}

const TOKEN_WARN_THRESHOLD = 800_000;

/** Rough token estimate: ~4 chars/token for English text */
export function estimateContextTokens(
  contextText: string,
  notes?: { tokenCount: number | null }[],
): { estimatedTokens: number; warning: string | null } {
  // Use stored token counts for notes when available, fall back to char estimate
  const noteTokens =
    notes?.reduce((sum, n) => sum + (n.tokenCount ?? 0), 0) ?? 0;
  const charEstimate = Math.ceil(contextText.length / 4);
  const estimatedTokens = Math.max(charEstimate, noteTokens + charEstimate);

  const warning =
    estimatedTokens > TOKEN_WARN_THRESHOLD
      ? `Context is ~${Math.round(estimatedTokens / 1000)}K tokens — approaching 1M limit`
      : null;

  return { estimatedTokens, warning };
}

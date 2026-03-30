import type { Company, Contact, Deal, DealActivity, Note } from "@/db/schema";
import { formatPhoneDisplay } from "@/lib/phone";

type ContactContext = Pick<
  Contact,
  "firstName" | "lastName" | "email" | "phone" | "jobTitle"
>;

type NoteContext = Pick<Note, "title" | "content" | "type" | "createdAt">;

/** Build a text summary of deal + company + contact fields for AI context and staleness detection */
export function buildDealContext(
  deal: Deal,
  company: Company,
  contacts: ContactContext[],
  activities?: DealActivity[],
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

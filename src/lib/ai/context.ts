import type { Company, Contact, Deal, DealActivity, Note } from "@/db/schema";

type ContactContext = Pick<
  Contact,
  "firstName" | "lastName" | "email" | "phone" | "jobTitle"
>;

type NoteContext = Pick<Note, "title" | "content" | "type" | "createdAt">;

/** Build a text summary of deal + company + contact fields for AI context and staleness detection */
export function buildDealContext(
  deal: Deal,
  company: Company,
  contact: ContactContext | null,
  activities?: DealActivity[],
  notes?: NoteContext[],
): string {
  const fields = [
    `Deal: ${deal.title}`,
    contact && `Contact: ${contact.firstName} ${contact.lastName}`,
    contact?.email && `Email: ${contact.email}`,
    contact?.phone && `Phone: ${contact.phone}`,
    contact?.jobTitle && `Title: ${contact.jobTitle}`,
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

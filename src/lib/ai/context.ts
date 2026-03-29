import type { Company, Contact, Deal, DealActivity } from "@/db/schema";

type ContactContext = Pick<
  Contact,
  "firstName" | "lastName" | "email" | "phone" | "jobTitle"
>;

/** Build a text summary of deal + company + contact fields for AI context and staleness detection */
export function buildDealContext(
  deal: Deal,
  company: Company,
  contact: ContactContext | null,
  activities?: DealActivity[],
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

  if (!activities || activities.length === 0) return fields;

  const recent = activities.slice(0, 10);
  const activityLog = recent
    .map(
      (a) =>
        `- [${new Date(a.createdAt).toLocaleDateString()}] ${a.type}: ${a.description}`,
    )
    .join("\n");

  return `${fields}\n\nRecent Activity (newest first):\n${activityLog}`;
}

import { eq, or } from "drizzle-orm";
import { notes } from "@/db/schema";

/** Build OR conditions for auto-surfacing notes across deal + contact + company */
export function buildDealNoteConditions(
  dealId: string,
  primaryContactId: string | null,
  companyId: string,
) {
  const conditions = [eq(notes.dealId, dealId)];
  if (primaryContactId) conditions.push(eq(notes.contactId, primaryContactId));
  conditions.push(eq(notes.companyId, companyId));
  return or(...conditions)!;
}

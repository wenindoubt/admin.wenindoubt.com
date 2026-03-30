import { eq, inArray, or } from "drizzle-orm";
import { notes } from "@/db/schema";

/** Build OR conditions for auto-surfacing notes across deal + contacts + company */
export function buildDealNoteConditions(
  dealId: string,
  contactIds: string[],
  companyId: string,
) {
  const conditions = [eq(notes.dealId, dealId)];
  if (contactIds.length === 1) {
    conditions.push(eq(notes.contactId, contactIds[0]));
  } else if (contactIds.length > 1) {
    conditions.push(inArray(notes.contactId, contactIds));
  }
  conditions.push(eq(notes.companyId, companyId));
  return or(...conditions)!;
}

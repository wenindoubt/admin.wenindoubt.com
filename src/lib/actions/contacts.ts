"use server";

import { auth } from "@clerk/nextjs/server";
import { asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import {
  type CreateContactInput,
  createContactSchema,
  type UpdateContactInput,
  updateContactSchema,
} from "@/lib/validations";

export async function getContactsForCompany(companyId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select()
    .from(contacts)
    .where(eq(contacts.companyId, companyId))
    .orderBy(asc(contacts.firstName));
}

export async function createContact(data: CreateContactInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createContactSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const [contact] = await db.insert(contacts).values(parsed.data).returning();

  revalidatePath(`/companies/${parsed.data.companyId}`);
  return contact;
}

export async function updateContact(id: string, data: UpdateContactInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateContactSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(contacts)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(contacts.id, id))
    .returning();

  if (updated) {
    revalidatePath(`/companies/${updated.companyId}`);
  }
  return updated;
}

export async function deleteContact(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Look up companyId before deleting for revalidation
  const [contact] = await db
    .select({ companyId: contacts.companyId })
    .from(contacts)
    .where(eq(contacts.id, id));

  await db.delete(contacts).where(eq(contacts.id, id));

  if (contact) {
    revalidatePath(`/companies/${contact.companyId}`);
  }
}

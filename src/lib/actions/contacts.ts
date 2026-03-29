"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { companies, contacts, deals } from "@/db/schema";
import { buildTsquery } from "@/lib/utils";
import {
  type CreateContactInput,
  createContactSchema,
  type UpdateContactInput,
  updateContactSchema,
} from "@/lib/validations";

export type ContactFilters = {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
};

export async function getContacts(filters?: ContactFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];

  if (filters?.search) {
    const q = buildTsquery(filters.search);
    if (q) {
      conditions.push(
        sql`${contacts.searchVector} @@ to_tsquery('english', ${q})`,
      );
    }
  }

  const dbSortable = {
    name: contacts.firstName,
    email: contacts.email,
    company: companies.name,
    created: contacts.createdAt,
  } as const;
  type SortKey = keyof typeof dbSortable;
  const sortKey = filters?.sortBy as SortKey | undefined;
  const sortCol = sortKey && sortKey in dbSortable ? dbSortable[sortKey] : null;
  const sortFn = filters?.sortOrder === "asc" ? asc : desc;

  let query = db
    .select({
      contact: contacts,
      companyName: companies.name,
    })
    .from(contacts)
    .innerJoin(companies, eq(contacts.companyId, companies.id))
    .orderBy(sortCol ? sortFn(sortCol) : asc(contacts.firstName));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query;

  return rows.map((r) => ({
    ...r.contact,
    company: { id: r.contact.companyId, name: r.companyName },
  }));
}

export async function getContact(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [contactRows, contactDeals] = await Promise.all([
    db
      .select({
        contact: contacts,
        companyName: companies.name,
        companyWebsite: companies.website,
        companyIndustry: companies.industry,
      })
      .from(contacts)
      .innerJoin(companies, eq(contacts.companyId, companies.id))
      .where(eq(contacts.id, id)),
    db
      .select({
        deal: deals,
        companyName: companies.name,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(eq(deals.primaryContactId, id))
      .orderBy(desc(deals.createdAt)),
  ]);

  const row = contactRows[0];
  if (!row) return null;

  return {
    ...row.contact,
    company: {
      id: row.contact.companyId,
      name: row.companyName,
      website: row.companyWebsite,
      industry: row.companyIndustry,
    },
    deals: contactDeals.map((r) => ({
      ...r.deal,
      company: { name: r.companyName },
    })),
  };
}

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
  revalidatePath("/contacts");
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
    revalidatePath("/contacts");
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
    revalidatePath("/contacts");
  }
}

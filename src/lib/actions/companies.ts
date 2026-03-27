"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  companies,
  companyTags,
  contacts,
  dealActivities,
  deals,
  tags,
} from "@/db/schema";
import { computeLifecycle } from "@/lib/constants";
import {
  type CreateCompanyInput,
  createCompanySchema,
  type UpdateCompanyInput,
  updateCompanySchema,
} from "@/lib/validations";

export type CompanyFilters = {
  search?: string;
};

export async function getCompanies(filters?: CompanyFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];

  if (filters?.search) {
    conditions.push(ilike(companies.name, `%${filters.search}%`));
  }

  let query = db.select().from(companies).orderBy(asc(companies.name));
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const rows = await query;
  if (rows.length === 0) return [];

  const companyIds = rows.map((r) => r.id);

  // Fetch deal stage + value for lifecycle/pipeline computation
  const companyDeals = await db
    .select({
      companyId: deals.companyId,
      stage: deals.stage,
      estimatedValue: deals.estimatedValue,
    })
    .from(deals)
    .where(inArray(deals.companyId, companyIds));

  const dealsByCompany = new Map<
    string,
    { stage: string; estimatedValue: string | null }[]
  >();
  for (const d of companyDeals) {
    const existing = dealsByCompany.get(d.companyId) ?? [];
    existing.push(d);
    dealsByCompany.set(d.companyId, existing);
  }

  return rows.map((company) => {
    const cDeals = dealsByCompany.get(company.id) ?? [];
    const pipelineValue = cDeals.reduce(
      (sum, d) => sum + Number(d.estimatedValue ?? 0),
      0,
    );
    return {
      ...company,
      lifecycle: computeLifecycle(cDeals),
      dealCount: cDeals.length,
      pipelineValue,
    };
  });
}

export async function getCompany(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, id));
  if (!company) return null;

  const [companyContacts, companyDeals, recentActivities] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(eq(contacts.companyId, id))
      .orderBy(asc(contacts.firstName)),
    db
      .select({
        deal: deals,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.companyId, id))
      .orderBy(desc(deals.createdAt)),
    db
      .select({ activity: dealActivities })
      .from(dealActivities)
      .innerJoin(deals, eq(dealActivities.dealId, deals.id))
      .where(eq(deals.companyId, id))
      .orderBy(desc(dealActivities.createdAt))
      .limit(30),
  ]);

  return {
    ...company,
    contacts: companyContacts,
    deals: companyDeals.map((r) => ({
      ...r.deal,
      primaryContact: r.contactFirstName
        ? { firstName: r.contactFirstName, lastName: r.contactLastName }
        : null,
    })),
    activities: recentActivities.map((r) => r.activity),
  };
}

export async function createCompany(data: CreateCompanyInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createCompanySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const [company] = await db.insert(companies).values(parsed.data).returning();

  revalidatePath("/companies");
  return company;
}

export async function updateCompany(id: string, data: UpdateCompanyInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateCompanySchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const [updated] = await db
    .update(companies)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(companies.id, id))
    .returning();

  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  return updated;
}

export async function deleteCompany(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(companies).where(eq(companies.id, id));
  revalidatePath("/companies");
}

export async function setCompanyTags(companyId: string, tagIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(companyTags).where(eq(companyTags.companyId, companyId));

  if (tagIds.length > 0) {
    await db
      .insert(companyTags)
      .values(tagIds.map((tagId) => ({ companyId, tagId })));
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

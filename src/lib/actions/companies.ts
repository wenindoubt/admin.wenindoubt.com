"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, totalCount } from "@/db";
import {
  companies,
  companyTags,
  contacts,
  dealActivities,
  deals,
} from "@/db/schema";
import { buildTsquery } from "@/lib/utils";

/** Company columns for reads — excludes searchVector */
const { searchVector: _, ...companyColumns } = getTableColumns(companies);

import {
  type CreateCompanyInput,
  createCompanySchema,
  type UpdateCompanyInput,
  updateCompanySchema,
} from "@/lib/validations";

type CompanyFilters = {
  search?: string;
  size?: string;
  lifecycle?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function getCompanies(filters?: CompanyFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // SQL subqueries for computed fields — replaces JS-side pagination
  const lifecycle = sql<string>`CASE
    WHEN EXISTS (SELECT 1 FROM ${deals} d WHERE d.company_id = ${companies.id}
      AND d.stage IN ('new','contacted','qualifying','proposal_sent','negotiating','nurture'))
      THEN 'active_client'
    WHEN EXISTS (SELECT 1 FROM ${deals} d WHERE d.company_id = ${companies.id} AND d.stage = 'won')
      THEN 'former_client'
    ELSE 'prospect'
  END`;
  const dealCount = sql<number>`(SELECT count(*)::int FROM ${deals} d WHERE d.company_id = ${companies.id})`;
  const pipelineValue = sql<number>`COALESCE((SELECT sum(d.estimated_value)::float8 FROM ${deals} d WHERE d.company_id = ${companies.id}), 0)`;

  const conditions = [];

  if (filters?.search) {
    const q = buildTsquery(filters.search);
    if (q) {
      conditions.push(
        sql`${companies.searchVector} @@ to_tsquery('english', ${q})`,
      );
    }
  }
  if (filters?.size) {
    conditions.push(eq(companies.size, filters.size));
  }
  if (filters?.lifecycle) {
    conditions.push(sql`${lifecycle} = ${filters.lifecycle}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // All sort keys now work at DB level
  const sortFn = filters?.sortOrder === "asc" ? asc : desc;
  const orderBy =
    {
      name: sortFn(companies.name),
      industry: sortFn(companies.industry),
      created: sortFn(companies.createdAt),
      dealCount: sortFn(dealCount),
      pipelineValue: sortFn(pipelineValue),
    }[filters?.sortBy ?? "name"] ?? asc(companies.name);

  let query = db
    .select({
      ...companyColumns,
      lifecycle,
      dealCount,
      pipelineValue,
    })
    .from(companies)
    .orderBy(orderBy);

  if (where) {
    query = query.where(where) as typeof query;
  }
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  const [rows, [{ count: total }]] = await Promise.all([
    query,
    db.select({ count: count() }).from(companies).where(where),
  ]);

  return { data: rows, total };
}

/** Lightweight list for dropdowns — no deals query, just id + name */
export async function getCompanyList() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));
}

export async function getCompanyForEdit(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [company] = await db
    .select(companyColumns)
    .from(companies)
    .where(eq(companies.id, id));
  return company ?? null;
}

export async function getCompany(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [company] = await db
    .select(companyColumns)
    .from(companies)
    .where(eq(companies.id, id));
  if (!company) return null;

  const [contactRows, dealRows, activityRows] = await Promise.all([
    db
      .select({
        contact: contacts,
        totalCount,
      })
      .from(contacts)
      .where(eq(contacts.companyId, id))
      .orderBy(asc(contacts.firstName))
      .limit(50),
    db
      .select({
        deal: deals,
        contactFirstName: contacts.firstName,
        contactLastName: contacts.lastName,
        totalCount,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.primaryContactId, contacts.id))
      .where(eq(deals.companyId, id))
      .orderBy(desc(deals.createdAt))
      .limit(50),
    db
      .select({
        activity: dealActivities,
        totalCount,
      })
      .from(dealActivities)
      .innerJoin(deals, eq(dealActivities.dealId, deals.id))
      .where(eq(deals.companyId, id))
      .orderBy(desc(dealActivities.createdAt))
      .limit(30),
  ]);

  return {
    ...company,
    contacts: contactRows.map((r) => r.contact),
    contactsTotal: contactRows[0]?.totalCount ?? 0,
    deals: dealRows.map((r) => ({
      ...r.deal,
      primaryContact: r.contactFirstName
        ? { firstName: r.contactFirstName, lastName: r.contactLastName }
        : null,
    })),
    dealsTotal: dealRows[0]?.totalCount ?? 0,
    activities: activityRows.map((r) => r.activity),
    activitiesTotal: activityRows[0]?.totalCount ?? 0,
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

  if (tagIds.length === 0) {
    await db.delete(companyTags).where(eq(companyTags.companyId, companyId));
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(companyTags).where(eq(companyTags.companyId, companyId));
      await tx
        .insert(companyTags)
        .values(tagIds.map((tagId) => ({ companyId, tagId })));
    });
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
}

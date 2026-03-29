"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  companies,
  companyTags,
  contacts,
  dealActivities,
  deals,
} from "@/db/schema";
import { computeLifecycle } from "@/lib/constants";
import { buildTsquery } from "@/lib/utils";
import {
  type CreateCompanyInput,
  createCompanySchema,
  type UpdateCompanyInput,
  updateCompanySchema,
} from "@/lib/validations";

export type CompanyFilters = {
  search?: string;
  industry?: string;
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

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort (computed fields sorted in JS after query)
  const dbSortable = {
    name: companies.name,
    industry: companies.industry,
    created: companies.createdAt,
  } as const;
  type SortKey = keyof typeof dbSortable;
  const sortKey = filters?.sortBy as SortKey | undefined;
  const sortCol = sortKey && sortKey in dbSortable ? dbSortable[sortKey] : null;
  const sortFn = filters?.sortOrder === "asc" ? asc : desc;

  // When lifecycle filter or computed sort is active, we must fetch all rows
  // and paginate in JS (these fields are derived from deals, not in the DB)
  const needsJsPagination =
    !!filters?.lifecycle ||
    filters?.sortBy === "dealCount" ||
    filters?.sortBy === "pipelineValue";

  let query = db
    .select()
    .from(companies)
    .orderBy(sortCol ? sortFn(sortCol) : asc(companies.name));
  if (where) {
    query = query.where(where) as typeof query;
  }
  if (!needsJsPagination) {
    if (filters?.limit) {
      query = query.limit(filters.limit) as typeof query;
    }
    if (filters?.offset) {
      query = query.offset(filters.offset) as typeof query;
    }
  }

  const [rows, countRows] = await Promise.all([
    query,
    needsJsPagination
      ? Promise.resolve(null)
      : db.select({ count: count() }).from(companies).where(where),
  ]);

  if (rows.length === 0) {
    return { data: [], total: countRows?.[0]?.count ?? 0 };
  }

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

  let result = rows.map((company) => {
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

  // Post-filter by lifecycle (computed field)
  if (filters?.lifecycle) {
    result = result.filter((c) => c.lifecycle === filters.lifecycle);
  }

  // Sort by computed fields in JS
  const computedSortBy = filters?.sortBy;
  if (computedSortBy === "dealCount" || computedSortBy === "pipelineValue") {
    const dir = filters?.sortOrder === "asc" ? 1 : -1;
    result.sort((a, b) => (a[computedSortBy] - b[computedSortBy]) * dir);
  }

  if (needsJsPagination) {
    const total = result.length;
    const start = filters?.offset ?? 0;
    const end = start + (filters?.limit ?? total);
    return { data: result.slice(start, end), total };
  }

  return { data: result, total: countRows![0].count };
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

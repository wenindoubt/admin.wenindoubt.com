"use server";

import { auth } from "@clerk/nextjs/server";
import { and, asc, count, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, totalCount } from "@/db";
import {
  companies,
  contacts,
  dealActivities,
  dealInsights,
  deals,
  dealTags,
  tags,
} from "@/db/schema";
import { stageLabel } from "@/lib/constants";
import { buildTsquery } from "@/lib/utils";
import {
  addDealActivitySchema,
  type CreateDealInput,
  createDealSchema,
  type UpdateDealInput,
  updateDealSchema,
} from "@/lib/validations";

export type DealFilters = {
  stage?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
  tagIds?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function getDeals(filters?: DealFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];

  if (filters?.stage) {
    conditions.push(
      eq(deals.stage, filters.stage as (typeof deals.stage.enumValues)[number]),
    );
  }
  if (filters?.source) {
    conditions.push(
      eq(
        deals.source,
        filters.source as (typeof deals.source.enumValues)[number],
      ),
    );
  }
  if (filters?.assignedTo) {
    conditions.push(eq(deals.assignedTo, filters.assignedTo));
  }
  if (filters?.search) {
    const q = buildTsquery(filters.search);
    if (q) {
      conditions.push(
        sql`${deals.searchVector} @@ to_tsquery('english', ${q})`,
      );
    }
  }
  if (filters?.tagIds && filters.tagIds.length > 0) {
    const dealsWithTags = db
      .selectDistinct({ dealId: dealTags.dealId })
      .from(dealTags)
      .where(inArray(dealTags.tagId, filters.tagIds));
    conditions.push(inArray(deals.id, dealsWithTags));
  }

  const sortDir = filters?.sortOrder === "asc" ? asc : desc;
  const sortKey = filters?.sortBy ?? "created";
  const orderBy =
    {
      title: sortDir(deals.title),
      company: sortDir(companies.name),
      stage: sortDir(deals.stage),
      source: sortDir(deals.source),
      value: sortDir(deals.estimatedValue),
      created: sortDir(deals.createdAt),
    }[sortKey] ?? sortDir(deals.createdAt);

  let query = db
    .select({
      deal: deals,
      companyName: companies.name,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .orderBy(orderBy);

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  if (where) {
    query = query.where(where) as typeof query;
  }
  if (filters?.limit) {
    query = query.limit(filters.limit) as typeof query;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as typeof query;
  }

  const needsCount = !!filters?.limit;
  const [rows, countResult] = await Promise.all([
    query,
    needsCount
      ? db.select({ count: count() }).from(deals).where(where)
      : Promise.resolve(null),
  ]);
  const total = countResult ? countResult[0].count : rows.length;

  if (rows.length === 0) return { data: [], total };

  const dealIds = rows.map((r) => r.deal.id);
  const allDealTags = await db
    .select({ dealId: dealTags.dealId, tag: tags })
    .from(dealTags)
    .innerJoin(tags, eq(dealTags.tagId, tags.id))
    .where(inArray(dealTags.dealId, dealIds));

  const tagsByDealId = new Map<string, (typeof tags.$inferSelect)[]>();
  for (const row of allDealTags) {
    const existing = tagsByDealId.get(row.dealId) ?? [];
    existing.push(row.tag);
    tagsByDealId.set(row.dealId, existing);
  }

  return {
    data: rows.map((r) => ({
      ...r.deal,
      company: { name: r.companyName },
      contact: r.contactFirstName
        ? { name: `${r.contactFirstName} ${r.contactLastName}` }
        : null,
      tags: tagsByDealId.get(r.deal.id) ?? [],
    })),
    total,
  };
}

export async function getDeal(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [row] = await db
    .select({
      deal: deals,
      company: companies,
      contactFirstName: contacts.firstName,
      contactLastName: contacts.lastName,
      contactEmail: contacts.email,
      contactPhone: contacts.phone,
      contactJobTitle: contacts.jobTitle,
      contactId: contacts.id,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .innerJoin(contacts, eq(deals.primaryContactId, contacts.id))
    .where(eq(deals.id, id));

  if (!row) return null;

  const [activityRows, insightRows, dealTagRows] = await Promise.all([
    db
      .select({
        activity: dealActivities,
        totalCount,
      })
      .from(dealActivities)
      .where(eq(dealActivities.dealId, id))
      .orderBy(desc(dealActivities.createdAt))
      .limit(50),
    db
      .select({
        id: dealInsights.id,
        dealId: dealInsights.dealId,
        prompt: dealInsights.prompt,
        rawInput: dealInsights.rawInput,
        analysisText: dealInsights.analysisText,
        summary: dealInsights.summary,
        analysisModel: dealInsights.analysisModel,
        embeddingModel: dealInsights.embeddingModel,
        generatedAt: dealInsights.generatedAt,
        totalCount,
      })
      .from(dealInsights)
      .where(eq(dealInsights.dealId, id))
      .orderBy(desc(dealInsights.generatedAt))
      .limit(20),
    db
      .select({ tag: tags })
      .from(dealTags)
      .innerJoin(tags, eq(dealTags.tagId, tags.id))
      .where(eq(dealTags.dealId, id)),
  ]);

  return {
    ...row.deal,
    company: row.company,
    primaryContact: row.contactId
      ? {
          id: row.contactId,
          firstName: row.contactFirstName,
          lastName: row.contactLastName,
          email: row.contactEmail,
          phone: row.contactPhone,
          jobTitle: row.contactJobTitle,
        }
      : null,
    activities: activityRows.map((r) => r.activity),
    activitiesTotal: activityRows[0]?.totalCount ?? 0,
    insights: insightRows.map(({ totalCount: _, ...rest }) => rest),
    insightsTotal: insightRows[0]?.totalCount ?? 0,
    tags: dealTagRows.map((r) => r.tag),
  };
}

export async function getDealForEdit(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [row] = await db
    .select({
      deal: deals,
      companyId: companies.id,
      companyName: companies.name,
    })
    .from(deals)
    .innerJoin(companies, eq(deals.companyId, companies.id))
    .where(eq(deals.id, id));

  if (!row) return null;
  return {
    ...row.deal,
    company: { id: row.companyId, name: row.companyName },
  };
}

export async function createDeal(data: CreateDealInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createDealSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { followUpAt: followUpStr, ...rest } = parsed.data;
  const values = {
    ...rest,
    assignedTo: rest.assignedTo || userId,
    followUpAt: followUpStr ? new Date(followUpStr) : null,
    convertedAt: parsed.data.stage === "won" ? new Date() : null,
    closedAt:
      parsed.data.stage === "won" || parsed.data.stage === "lost"
        ? new Date()
        : null,
  };

  const deal = await db.transaction(async (tx) => {
    const [row] = await tx.insert(deals).values(values).returning();
    await tx.insert(dealActivities).values({
      dealId: row.id,
      type: "status_change",
      description: `Deal created with stage "${row.stage}"`,
      createdBy: userId,
      metadata: { to_stage: row.stage },
    });
    return row;
  });

  revalidatePath("/deals");
  return deal;
}

export async function updateDeal(id: string, data: UpdateDealInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateDealSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  const { followUpAt: followUpStr, ...rest } = parsed.data;

  const updated = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(deals).where(eq(deals.id, id));
    if (!existing) throw new Error("Deal not found");

    let followUpAt: Date | null | undefined;
    if (
      data.stage &&
      data.stage !== "nurture" &&
      existing.stage === "nurture"
    ) {
      followUpAt = null;
    } else if (followUpStr !== undefined) {
      followUpAt = followUpStr ? new Date(followUpStr) : null;
    }

    const extraFields: Record<string, Date | null> = {};
    if (data.stage === "won" && !existing.convertedAt) {
      extraFields.convertedAt = new Date();
    }
    if ((data.stage === "won" || data.stage === "lost") && !existing.closedAt) {
      extraFields.closedAt = new Date();
    }

    const [row] = await tx
      .update(deals)
      .set({ ...rest, followUpAt, ...extraFields, updatedAt: new Date() })
      .where(eq(deals.id, id))
      .returning();

    if (data.stage && data.stage !== existing.stage) {
      await tx.insert(dealActivities).values({
        dealId: id,
        type: "status_change",
        description: `Stage changed from "${stageLabel(existing.stage)}" to "${stageLabel(data.stage)}"`,
        createdBy: userId,
        metadata: { from_stage: existing.stage, to_stage: data.stage },
      });
    }

    return row;
  });

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  return updated;
}

export async function deleteDeal(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(deals).where(eq(deals.id, id));
  revalidatePath("/deals");
}

export async function addDealActivity(
  dealId: string,
  type: string,
  description: string,
  metadata?: Record<string, unknown>,
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = addDealActivitySchema.safeParse({ dealId, type, description });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0].message);
  }

  if (["email", "call", "meeting"].includes(type)) {
    const activity = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(dealActivities)
        .values({ dealId, type, description, createdBy: userId, metadata })
        .returning();
      await tx
        .update(deals)
        .set({ lastContactedAt: new Date(), updatedAt: new Date() })
        .where(eq(deals.id, dealId));
      return row;
    });
    revalidatePath(`/deals/${dealId}`);
    return activity;
  }

  const [activity] = await db
    .insert(dealActivities)
    .values({ dealId, type, description, createdBy: userId, metadata })
    .returning();
  revalidatePath(`/deals/${dealId}`);
  return activity;
}

export async function getDealStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [stageStats, sourceCounts] = await Promise.all([
    db
      .select({
        stage: deals.stage,
        count: count(),
        total: sql<string>`COALESCE(SUM(${deals.estimatedValue}), 0)`,
      })
      .from(deals)
      .groupBy(deals.stage),
    db
      .select({ source: deals.source, count: count() })
      .from(deals)
      .groupBy(deals.source),
  ]);

  const totalDeals = stageStats.reduce((sum, s) => sum + s.count, 0);

  return {
    stageCounts: stageStats.map(({ stage, count }) => ({ stage, count })),
    sourceCounts,
    pipelineValues: stageStats.map(({ stage, total }) => ({ stage, total })),
    totalDeals,
  };
}

export async function getRecentActivities(filters?: {
  limit?: number;
  offset?: number;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select({
        activity: dealActivities,
        dealTitle: deals.title,
        companyName: companies.name,
      })
      .from(dealActivities)
      .innerJoin(deals, eq(dealActivities.dealId, deals.id))
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .orderBy(desc(dealActivities.createdAt))
      .limit(filters?.limit ?? 5)
      .offset(filters?.offset ?? 0),
    db.select({ count: count() }).from(dealActivities),
  ]);

  return { data: rows, total };
}

// Tags
export async function getTags() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db.select().from(tags).orderBy(tags.name);
}

export async function createTag(name: string, color?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [tag] = await db.insert(tags).values({ name, color }).returning();
  return tag;
}

// Stage transition hooks — extensible for future transitions
type StageTransitionRequirement = {
  type: "email_draft";
  dealId: string;
  fromStage: string;
  toStage: string;
  contactEmail: string;
  contactName: string;
};

export async function checkStageTransition(
  dealId: string,
  toStage: string,
): Promise<StageTransitionRequirement | null> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [deal] = await db
    .select({
      id: deals.id,
      stage: deals.stage,
      assignedTo: deals.assignedTo,
      primaryContactId: deals.primaryContactId,
    })
    .from(deals)
    .where(eq(deals.id, dealId));

  if (!deal) throw new Error("Deal not found");

  // new → contacted requires email draft
  if (deal.stage === "new" && toStage === "contacted") {
    if (!deal.primaryContactId) {
      throw new Error(
        "Deal must have a primary contact before moving to Contacted",
      );
    }

    const [contact] = await db
      .select({
        email: contacts.email,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
      })
      .from(contacts)
      .where(eq(contacts.id, deal.primaryContactId));

    if (!contact?.email) {
      throw new Error("Primary contact must have an email address");
    }

    return {
      type: "email_draft",
      dealId: deal.id,
      fromStage: deal.stage,
      toStage,
      contactEmail: contact.email,
      contactName: `${contact.firstName} ${contact.lastName}`,
    };
  }

  // Future: add more transitions here
  // if (deal.stage === "qualifying" && toStage === "proposal_sent") { ... }

  return null;
}

export async function setDealTags(dealId: string, tagIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  if (tagIds.length === 0) {
    await db.delete(dealTags).where(eq(dealTags.dealId, dealId));
  } else {
    await db.transaction(async (tx) => {
      await tx.delete(dealTags).where(eq(dealTags.dealId, dealId));
      await tx
        .insert(dealTags)
        .values(tagIds.map((tagId) => ({ dealId, tagId })));
    });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
}

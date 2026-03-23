"use server";

import { db } from "@/db";
import {
  leads,
  leadActivities,
  leadTags,
  tags,
  leadInsights,
  type NewLead,
} from "@/db/schema";
import { auth } from "@clerk/nextjs/server";
import { eq, desc, ilike, or, sql, and, count } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type LeadFilters = {
  status?: string;
  source?: string;
  assignedTo?: string;
  search?: string;
  tagIds?: string[];
};

export async function getLeads(filters?: LeadFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(leads.status, filters.status as typeof leads.status.enumValues[number]));
  }
  if (filters?.source) {
    conditions.push(eq(leads.source, filters.source as typeof leads.source.enumValues[number]));
  }
  if (filters?.assignedTo) {
    conditions.push(eq(leads.assignedTo, filters.assignedTo));
  }
  if (filters?.search) {
    const term = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(leads.firstName, term),
        ilike(leads.lastName, term),
        ilike(leads.companyName, term),
        ilike(leads.email, term)
      )!
    );
  }

  let query = db
    .select()
    .from(leads)
    .orderBy(desc(leads.createdAt));

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  return query;
}

export async function getLead(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.select().from(leads).where(eq(leads.id, id));
  if (!lead) return null;

  const activities = await db
    .select()
    .from(leadActivities)
    .where(eq(leadActivities.leadId, id))
    .orderBy(desc(leadActivities.createdAt));

  const insights = await db
    .select()
    .from(leadInsights)
    .where(eq(leadInsights.leadId, id))
    .orderBy(desc(leadInsights.generatedAt));

  const leadTagRows = await db
    .select({ tag: tags })
    .from(leadTags)
    .innerJoin(tags, eq(leadTags.tagId, tags.id))
    .where(eq(leadTags.leadId, id));

  return {
    ...lead,
    activities,
    insights,
    tags: leadTagRows.map((r) => r.tag),
  };
}

export async function createLead(data: NewLead) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [lead] = await db.insert(leads).values(data).returning();

  await db.insert(leadActivities).values({
    leadId: lead.id,
    type: "status_change",
    description: `Lead created with status "new"`,
    createdBy: userId,
    metadata: { to_status: "new" },
  });

  revalidatePath("/leads");
  return lead;
}

export async function updateLead(id: string, data: Partial<NewLead>) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [existing] = await db.select().from(leads).where(eq(leads.id, id));
  if (!existing) throw new Error("Lead not found");

  const [updated] = await db
    .update(leads)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(leads.id, id))
    .returning();

  // Log status change
  if (data.status && data.status !== existing.status) {
    await db.insert(leadActivities).values({
      leadId: id,
      type: "status_change",
      description: `Status changed from "${existing.status}" to "${data.status}"`,
      createdBy: userId,
      metadata: { from_status: existing.status, to_status: data.status },
    });

    // Set convertedAt when status moves to 'won'
    if (data.status === "won" && !existing.convertedAt) {
      await db
        .update(leads)
        .set({ convertedAt: new Date() })
        .where(eq(leads.id, id));
    }
  }

  revalidatePath("/leads");
  revalidatePath(`/leads/${id}`);
  return updated;
}

export async function deleteLead(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(leads).where(eq(leads.id, id));
  revalidatePath("/leads");
}

export async function addActivity(
  leadId: string,
  type: string,
  description: string,
  metadata?: Record<string, unknown>
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [activity] = await db
    .insert(leadActivities)
    .values({ leadId, type, description, createdBy: userId, metadata })
    .returning();

  // Update last_contacted_at for contact-type activities
  if (["email", "call", "meeting"].includes(type)) {
    await db
      .update(leads)
      .set({ lastContactedAt: new Date(), updatedAt: new Date() })
      .where(eq(leads.id, leadId));
  }

  revalidatePath(`/leads/${leadId}`);
  return activity;
}

// Tags
export async function getTags() {
  return db.select().from(tags).orderBy(tags.name);
}

export async function createTag(name: string, color?: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [tag] = await db.insert(tags).values({ name, color }).returning();
  return tag;
}

export async function setLeadTags(leadId: string, tagIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(leadTags).where(eq(leadTags.leadId, leadId));

  if (tagIds.length > 0) {
    await db
      .insert(leadTags)
      .values(tagIds.map((tagId) => ({ leadId, tagId })));
  }

  revalidatePath(`/leads/${leadId}`);
}

// Dashboard stats
export async function getLeadStats() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const statusCounts = await db
    .select({
      status: leads.status,
      count: count(),
    })
    .from(leads)
    .groupBy(leads.status);

  const sourceCounts = await db
    .select({
      source: leads.source,
      count: count(),
    })
    .from(leads)
    .groupBy(leads.source);

  const pipelineValues = await db
    .select({
      status: leads.status,
      total: sql<string>`COALESCE(SUM(${leads.estimatedValue}), 0)`,
    })
    .from(leads)
    .groupBy(leads.status);

  const recentActivities = await db
    .select({
      activity: leadActivities,
      leadFirstName: leads.firstName,
      leadLastName: leads.lastName,
    })
    .from(leadActivities)
    .innerJoin(leads, eq(leadActivities.leadId, leads.id))
    .orderBy(desc(leadActivities.createdAt))
    .limit(20);

  const totalLeads = await db.select({ count: count() }).from(leads);

  return {
    statusCounts,
    sourceCounts,
    pipelineValues,
    recentActivities,
    totalLeads: totalLeads[0].count,
  };
}

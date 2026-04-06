"use server";

import { auth } from "@clerk/nextjs/server";
import {
  and,
  asc,
  cosineDistance,
  desc,
  eq,
  getTableColumns,
  gt,
  inArray,
  isNotNull,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  deals,
  notes,
  type TalentRow,
  tags,
  talent,
  talentDeals,
  talentTags,
} from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { buildTsquery } from "@/lib/utils";
import {
  type CreateTalentInput,
  createTalentSchema,
  type UpdateTalentInput,
  updateTalentSchema,
} from "@/lib/validations";

/** Talent columns for reads — excludes searchVector */
const { searchVector: _, ...talentColumns } = getTableColumns(talent);

/** Tier sort expression: S=1, A=2, B=3, C=4, D=5 */
const tierOrder = sql<number>`CASE ${talent.tier} WHEN 'S' THEN 1 WHEN 'A' THEN 2 WHEN 'B' THEN 3 WHEN 'C' THEN 4 WHEN 'D' THEN 5 END`;

const SIMILARITY_THRESHOLD = 0.45;

const DEFAULT_TALENT_STATUSES = ["active", "inactive"] as const;

type MatchEntry = {
  similarity: number;
  noteContent: string;
  noteTitle: string | null;
};

function groupTopMatches<T extends MatchEntry>(
  results: T[],
  getKey: (r: T) => string | null | undefined,
): Map<string, MatchEntry> {
  const map = new Map<string, MatchEntry>();
  for (const r of results) {
    const key = getKey(r);
    if (!key || r.similarity < SIMILARITY_THRESHOLD) continue;
    if (!map.has(key)) {
      map.set(key, {
        similarity: r.similarity,
        noteContent: r.noteContent,
        noteTitle: r.noteTitle,
      });
    }
  }
  return map;
}

type TalentFilters = {
  search?: string;
  tier?: string[];
  status?: string[];
  sortBy?: "name" | "tier" | "created";
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export async function getTalent(filters?: TalentFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];

  if (filters?.search) {
    const q = buildTsquery(filters.search);
    if (q) {
      conditions.push(
        sql`${talent.searchVector} @@ to_tsquery('english', ${q})`,
      );
    }
  }

  if (filters?.tier && filters.tier.length > 0) {
    conditions.push(
      inArray(
        talent.tier,
        filters.tier as (typeof talent.tier.enumValues)[number][],
      ),
    );
  }

  const statuses = filters?.status ?? [...DEFAULT_TALENT_STATUSES];
  if (statuses.length > 0) {
    conditions.push(
      inArray(
        talent.status,
        statuses as (typeof talent.status.enumValues)[number][],
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const sortDir = filters?.sortOrder === "asc" ? asc : desc;
  const orderBy =
    filters?.sortBy === "name"
      ? ([sortDir(talent.firstName), asc(talent.lastName)] as const)
      : filters?.sortBy === "created"
        ? ([sortDir(talent.createdAt)] as const)
        : ([asc(tierOrder), asc(talent.firstName)] as const); // default: tier asc (S first), then name

  const limit = filters?.limit ?? 25;
  const offset = filters?.offset ?? 0;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select(talentColumns)
      .from(talent)
      .where(where)
      .orderBy(...orderBy)
      .limit(limit)
      .offset(offset),
    db.select({ total: sql<number>`count(*)::int` }).from(talent).where(where),
  ]);

  if (rows.length === 0) return { data: [], total };

  // Batch-fetch tags for all returned talent
  const talentIds = rows.map((r) => r.id);
  const tagRows = await db
    .select({ talentId: talentTags.talentId, tag: tags })
    .from(talentTags)
    .innerJoin(tags, eq(talentTags.tagId, tags.id))
    .where(inArray(talentTags.talentId, talentIds));

  const tagsByTalentId = new Map<string, (typeof tags.$inferSelect)[]>();
  for (const row of tagRows) {
    const existing = tagsByTalentId.get(row.talentId) ?? [];
    existing.push(row.tag);
    tagsByTalentId.set(row.talentId, existing);
  }

  return {
    data: rows.map((t) => ({ ...t, tags: tagsByTalentId.get(t.id) ?? [] })),
    total,
  };
}

export async function getTalentById(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [row] = await db
    .select(talentColumns)
    .from(talent)
    .where(eq(talent.id, id));

  if (!row) return null;

  const { searchVector: _dsv, ...dealColumns } = getTableColumns(deals);

  const [tagRows, assignedDealRows] = await Promise.all([
    db
      .select({ tag: tags })
      .from(talentTags)
      .innerJoin(tags, eq(talentTags.tagId, tags.id))
      .where(eq(talentTags.talentId, id)),
    db
      .select({ deal: dealColumns, assignedAt: talentDeals.assignedAt })
      .from(talentDeals)
      .innerJoin(deals, eq(talentDeals.dealId, deals.id))
      .where(eq(talentDeals.talentId, id))
      .orderBy(desc(talentDeals.assignedAt)),
  ]);

  return {
    ...row,
    tags: tagRows.map((r) => r.tag),
    assignedDeals: assignedDealRows.map((r) => ({
      ...r.deal,
      assignedAt: r.assignedAt,
    })),
  };
}

export async function createTalent(data: CreateTalentInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createTalentSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { tagIds, ...talentData } = parsed.data;

  const [row] = await db
    .insert(talent)
    .values({ ...talentData, linkedinUrl: talentData.linkedinUrl || null })
    .returning();

  if (tagIds && tagIds.length > 0) {
    await db
      .insert(talentTags)
      .values(tagIds.map((tagId) => ({ talentId: row.id, tagId })));
  }

  revalidatePath("/talent");
  return row;
}

export async function updateTalent(id: string, data: UpdateTalentInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateTalentSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const { tagIds, ...talentData } = parsed.data;

  const [updated] = await db
    .update(talent)
    .set({ ...talentData, updatedAt: new Date() })
    .where(eq(talent.id, id))
    .returning();

  if (!updated) throw new Error("Talent not found");

  if (tagIds !== undefined) {
    await db.transaction(async (tx) => {
      await tx.delete(talentTags).where(eq(talentTags.talentId, id));
      if (tagIds.length > 0) {
        await tx
          .insert(talentTags)
          .values(tagIds.map((tagId) => ({ talentId: id, tagId })));
      }
    });
  }

  revalidatePath("/talent");
  revalidatePath(`/talent/${id}`);
  return updated;
}

export async function deleteTalent(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db.delete(talent).where(eq(talent.id, id));
  revalidatePath("/talent");
}

// ── Assignment ──

export async function assignTalentToDeal(talentId: string, dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .insert(talentDeals)
    .values({ talentId, dealId })
    .onConflictDoNothing();

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/talent/${talentId}`);
}

export async function unassignTalentFromDeal(talentId: string, dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  await db
    .delete(talentDeals)
    .where(
      and(eq(talentDeals.talentId, talentId), eq(talentDeals.dealId, dealId)),
    );

  revalidatePath(`/deals/${dealId}`);
  revalidatePath(`/talent/${talentId}`);
}

export async function getTalentForDeals(dealIds: string[]) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  if (dealIds.length === 0) return {} as Record<string, TalentRow[]>;

  const rows = await db
    .select({ talent: talentColumns, dealId: talentDeals.dealId })
    .from(talentDeals)
    .innerJoin(talent, eq(talentDeals.talentId, talent.id))
    .where(inArray(talentDeals.dealId, dealIds))
    .orderBy(asc(tierOrder), asc(talent.firstName));

  const result: Record<string, TalentRow[]> = {};
  for (const row of rows) {
    if (!result[row.dealId]) result[row.dealId] = [];
    result[row.dealId].push(row.talent);
  }
  return result;
}

export async function getTalentForDeal(dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const rows = await db
    .select({ talent: talentColumns, assignedAt: talentDeals.assignedAt })
    .from(talentDeals)
    .innerJoin(talent, eq(talentDeals.talentId, talent.id))
    .where(eq(talentDeals.dealId, dealId))
    .orderBy(asc(tierOrder), asc(talent.firstName));

  return rows.map((r) => ({ ...r.talent, assignedAt: r.assignedAt }));
}

export async function getDealsForTalent(talentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { searchVector: _dsv, ...dealColumns } = getTableColumns(deals);

  return db
    .select({ deal: dealColumns, assignedAt: talentDeals.assignedAt })
    .from(talentDeals)
    .innerJoin(deals, eq(talentDeals.dealId, deals.id))
    .where(eq(talentDeals.talentId, talentId))
    .orderBy(desc(talentDeals.assignedAt));
}

// ── Semantic Search ──

export async function findTalentForDeal(dealId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [[deal], dealNoteRows] = await Promise.all([
    db.select({ title: deals.title }).from(deals).where(eq(deals.id, dealId)),
    db
      .select({ content: notes.content })
      .from(notes)
      .where(and(eq(notes.dealId, dealId), isNotNull(notes.content))),
  ]);

  if (!deal) throw new Error("Deal not found");

  const notesText = dealNoteRows.map((n) => n.content).join("\n\n");
  const context = notesText ? `${deal.title}: ${notesText}` : deal.title;

  const queryEmbedding = await generateEmbedding(context, "RETRIEVAL_QUERY");
  const similarity = sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`;

  const results = await db
    .select({
      talentId: notes.talentId,
      similarity,
      noteContent: notes.content,
      noteTitle: notes.title,
    })
    .from(notes)
    .where(
      and(
        isNotNull(notes.talentId),
        isNotNull(notes.embedding),
        gt(
          sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`,
          SIMILARITY_THRESHOLD,
        ),
      ),
    )
    .orderBy(desc(similarity))
    .limit(50);

  const topByTalent = groupTopMatches(results, (r) => r.talentId);

  if (topByTalent.size === 0) return [];

  const matchedTalentIds = [...topByTalent.keys()];

  const [assignedRows, talentRows] = await Promise.all([
    db
      .select({ talentId: talentDeals.talentId })
      .from(talentDeals)
      .where(
        and(
          eq(talentDeals.dealId, dealId),
          inArray(talentDeals.talentId, matchedTalentIds),
        ),
      ),
    db
      .select(talentColumns)
      .from(talent)
      .where(inArray(talent.id, matchedTalentIds)),
  ]);

  const assignedSet = new Set(assignedRows.map((r) => r.talentId));

  return talentRows
    .map((t) => {
      const match = topByTalent.get(t.id)!;
      return {
        talent: t,
        similarityScore: match.similarity,
        topMatchedNote: { content: match.noteContent, title: match.noteTitle },
        isAssigned: assignedSet.has(t.id),
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

export async function findDealsForTalent(talentId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const talentNoteRows = await db
    .select({ content: notes.content })
    .from(notes)
    .where(and(eq(notes.talentId, talentId), isNotNull(notes.content)));

  if (talentNoteRows.length === 0) return [];

  const context = talentNoteRows.map((n) => n.content).join("\n\n");
  const queryEmbedding = await generateEmbedding(context, "RETRIEVAL_QUERY");
  const similarity = sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`;

  const { searchVector: _dsv, ...dealColumns } = getTableColumns(deals);

  const results = await db
    .select({
      dealId: notes.dealId,
      similarity,
      noteContent: notes.content,
      noteTitle: notes.title,
    })
    .from(notes)
    .where(
      and(
        isNotNull(notes.dealId),
        isNotNull(notes.embedding),
        gt(
          sql<number>`1 - (${cosineDistance(notes.embedding, queryEmbedding)})`,
          SIMILARITY_THRESHOLD,
        ),
      ),
    )
    .orderBy(desc(similarity))
    .limit(50);

  const topByDeal = groupTopMatches(results, (r) => r.dealId);

  if (topByDeal.size === 0) return [];

  const matchedDealIds = [...topByDeal.keys()];
  const dealRows = await db
    .select(dealColumns)
    .from(deals)
    .where(inArray(deals.id, matchedDealIds));

  return dealRows
    .map((d) => {
      const match = topByDeal.get(d.id)!;
      return {
        deal: d,
        similarityScore: match.similarity,
        topMatchedNote: { content: match.noteContent, title: match.noteTitle },
      };
    })
    .sort((a, b) => b.similarityScore - a.similarityScore);
}

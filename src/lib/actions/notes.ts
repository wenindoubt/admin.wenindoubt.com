"use server";

import { auth } from "@clerk/nextjs/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import { deals, notes } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { countTokens } from "@/lib/ai/tokens";
import { buildDealNoteConditions } from "@/lib/note-utils";
import type { NoteEntityType } from "@/lib/types";
import { buildTsquery } from "@/lib/utils";
import {
  type CreateNoteInput,
  createNoteSchema,
  type UpdateNoteInput,
  updateNoteSchema,
} from "@/lib/validations";

export type NoteFilters = {
  dealId?: string;
  contactId?: string;
  companyId?: string;
  limit?: number;
  offset?: number;
};

export async function getNotes(filters?: NoteFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const conditions = [];
  if (filters?.dealId) conditions.push(eq(notes.dealId, filters.dealId));
  if (filters?.contactId)
    conditions.push(eq(notes.contactId, filters.contactId));
  if (filters?.companyId)
    conditions.push(eq(notes.companyId, filters.companyId));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(where)
      .orderBy(desc(notes.createdAt))
      .limit(filters?.limit ?? 10)
      .offset(filters?.offset ?? 0),
    db.select({ count: count() }).from(notes).where(where),
  ]);

  return { data: rows, total };
}

/** Auto-surface notes from a deal + its primary contact + its company */
export async function getNotesForDeal(
  dealId: string,
  filters?: {
    limit?: number;
    offset?: number;
    /** Pass to skip redundant deals query when caller already has these */
    primaryContactId?: string | null;
    companyId?: string;
  },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const deal = filters?.companyId
    ? {
        primaryContactId: filters.primaryContactId ?? null,
        companyId: filters.companyId,
      }
    : await resolveDealEntities(dealId);
  if (!deal) throw new Error("Deal not found");

  const where = buildDealNoteConditions(
    dealId,
    deal.primaryContactId,
    deal.companyId,
  );

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(where)
      .orderBy(desc(notes.createdAt))
      .limit(filters?.limit ?? 10)
      .offset(filters?.offset ?? 0),
    db.select({ count: count() }).from(notes).where(where),
  ]);

  return { data: rows, total };
}

export async function createNote(data: CreateNoteInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = createNoteSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const [note] = await db
    .insert(notes)
    .values({
      type: parsed.data.type,
      title: parsed.data.title ?? null,
      content: parsed.data.content,
      dealId: parsed.data.dealId ?? null,
      contactId: parsed.data.contactId ?? null,
      companyId: parsed.data.companyId ?? null,
      createdBy: userId,
    })
    .returning();

  revalidateNotePaths(parsed.data);
  enrichNoteAfterResponse(note.id, note.content);

  return note;
}

export async function updateNote(id: string, data: UpdateNoteInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateNoteSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const [updated] = await db
    .update(notes)
    .set(parsed.data)
    .where(eq(notes.id, id))
    .returning();

  if (!updated) throw new Error("Note not found");

  revalidateNotePaths(updated);

  if (parsed.data.content) {
    enrichNoteAfterResponse(id, updated.content);
  }

  return updated;
}

export async function deleteNote(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const [deleted] = await db.delete(notes).where(eq(notes.id, id)).returning();

  if (deleted) revalidateNotePaths(deleted);
}

/** Full-text search on notes, scoped to entity */
export async function searchNotes(query: string, filters?: NoteFilters) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const tsquery = buildTsquery(query);
  if (!tsquery) return getNotes(filters);

  const conditions = [
    sql`${notes.searchVector} @@ to_tsquery('english', ${tsquery})`,
  ];
  if (filters?.dealId) conditions.push(eq(notes.dealId, filters.dealId));
  if (filters?.contactId)
    conditions.push(eq(notes.contactId, filters.contactId));
  if (filters?.companyId)
    conditions.push(eq(notes.companyId, filters.companyId));

  const where = and(...conditions);

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select()
      .from(notes)
      .where(where)
      .orderBy(desc(notes.createdAt))
      .limit(filters?.limit ?? 10)
      .offset(filters?.offset ?? 0),
    db.select({ count: count() }).from(notes).where(where),
  ]);

  return { data: rows, total };
}

export type NoteTokenStats = {
  noteCount: number;
  totalTokens: number;
};

export async function getNoteTokenStats(
  entityType: NoteEntityType,
  entityId: string,
  /** Pass to skip redundant deals query when caller already has these */
  resolvedDeal?: { primaryContactId: string | null; companyId: string },
): Promise<NoteTokenStats> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  let where:
    | ReturnType<typeof eq>
    | ReturnType<typeof buildDealNoteConditions>
    | undefined;

  if (entityType === "deal") {
    const deal = resolvedDeal ?? (await resolveDealEntities(entityId));
    if (!deal) return { noteCount: 0, totalTokens: 0 };

    where = buildDealNoteConditions(
      entityId,
      deal.primaryContactId,
      deal.companyId,
    );
  } else {
    where = eq(
      entityType === "contact" ? notes.contactId : notes.companyId,
      entityId,
    );
  }

  const [result] = await db
    .select({
      noteCount: count(),
      totalTokens: sql<number>`coalesce(sum(${notes.tokenCount}), 0)`,
    })
    .from(notes)
    .where(where);

  return {
    noteCount: result?.noteCount ?? 0,
    totalTokens: result?.totalTokens ?? 0,
  };
}

// ── Internal helpers ──

/** Resolve deal's contact/company IDs (shared by getNotesForDeal + getNoteTokenStats) */
async function resolveDealEntities(dealId: string) {
  const [deal] = await db
    .select({
      primaryContactId: deals.primaryContactId,
      companyId: deals.companyId,
    })
    .from(deals)
    .where(eq(deals.id, dealId));
  return deal ?? null;
}

/** Generate embedding + count tokens after the response is sent */
function enrichNoteAfterResponse(noteId: string, content: string) {
  after(async () => {
    try {
      const [embedding, tokenCount] = await Promise.all([
        generateEmbedding(content),
        countTokens(content),
      ]);
      await db
        .update(notes)
        .set({ embedding, tokenCount })
        .where(eq(notes.id, noteId));
    } catch (error) {
      console.error(`Failed to enrich note ${noteId}:`, error);
    }
  });
}

function revalidateNotePaths(note: {
  dealId?: string | null;
  contactId?: string | null;
  companyId?: string | null;
}) {
  if (note.dealId) revalidatePath(`/deals/${note.dealId}`);
  if (note.contactId) revalidatePath(`/contacts/${note.contactId}`);
  if (note.companyId) revalidatePath(`/companies/${note.companyId}`);
}

"use server";

import { auth } from "@clerk/nextjs/server";
import {
  and,
  count,
  desc,
  eq,
  getTableColumns,
  inArray,
  sql,
} from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { db } from "@/db";
import type { NoteAttachment } from "@/db/schema";
import { dealContacts, deals, noteAttachments, notes } from "@/db/schema";
import { generateEmbedding } from "@/lib/ai/embeddings";
import { countTokens } from "@/lib/ai/tokens";
import { buildDealNoteConditions } from "@/lib/note-utils";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { NoteEntityType } from "@/lib/types";
import { buildTsquery } from "@/lib/utils";
import {
  type CreateNoteInput,
  createNoteSchema,
  type UpdateNoteInput,
  updateNoteSchema,
} from "@/lib/validations";

/** Columns for note reads — excludes embedding (~3KB) and searchVector */
const {
  embedding: _,
  searchVector: _sv,
  ...noteColumns
} = getTableColumns(notes);

type NoteFilters = {
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
      .select(noteColumns)
      .from(notes)
      .where(where)
      .orderBy(desc(notes.createdAt))
      .limit(filters?.limit ?? 10)
      .offset(filters?.offset ?? 0),
    db.select({ count: count() }).from(notes).where(where),
  ]);

  return { data: rows, total };
}

/** Auto-surface notes from a deal + its contacts + its company */
export async function getNotesForDeal(
  dealId: string,
  filters?: {
    limit?: number;
    offset?: number;
    /** Pass to skip redundant deals query when caller already has these */
    contactIds?: string[];
    companyId?: string;
  },
) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const deal = filters?.companyId
    ? {
        contactIds: filters.contactIds ?? [],
        companyId: filters.companyId,
      }
    : await resolveDealEntities(dealId);
  if (!deal) throw new Error("Deal not found");

  const where = buildDealNoteConditions(
    dealId,
    deal.contactIds,
    deal.companyId,
  );

  const [rows, [{ count: total }]] = await Promise.all([
    db
      .select(noteColumns)
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

  const { attachments: attachmentMetas, ...noteData } = parsed.data;

  const [note] = await db
    .insert(notes)
    .values({
      type: "note",
      title: noteData.title ?? null,
      content: noteData.content || "",
      dealId: noteData.dealId ?? null,
      contactId: noteData.contactId ?? null,
      companyId: noteData.companyId ?? null,
      createdBy: userId,
    })
    .returning();

  if (attachmentMetas && attachmentMetas.length > 0) {
    await db.insert(noteAttachments).values(
      attachmentMetas.map((a) => ({
        noteId: note.id,
        fileName: a.fileName,
        storagePath: a.storagePath,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        createdBy: userId,
      })),
    );
  }

  if (note.content.trim()) {
    const tokenCount = await countTokens(note.content);
    await db.update(notes).set({ tokenCount }).where(eq(notes.id, note.id));
    note.tokenCount = tokenCount;
    generateEmbeddingAfterResponse(note.id, note.content);
  }

  revalidateNotePaths(noteData);

  return note;
}

export async function updateNote(id: string, data: UpdateNoteInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const parsed = updateNoteSchema.safeParse(data);
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  let tokenCount: number | undefined;
  if (parsed.data.content) {
    tokenCount = await countTokens(parsed.data.content);
  }

  const [updated] = await db
    .update(notes)
    .set({ ...parsed.data, ...(tokenCount !== undefined && { tokenCount }) })
    .where(eq(notes.id, id))
    .returning();

  if (!updated) throw new Error("Note not found");

  if (parsed.data.content) {
    generateEmbeddingAfterResponse(id, updated.content);
  }

  revalidateNotePaths(updated);

  return updated;
}

export async function deleteNote(id: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Fetch attachment paths before cascade delete removes them
  const attachments = await db
    .select({ storagePath: noteAttachments.storagePath })
    .from(noteAttachments)
    .where(eq(noteAttachments.noteId, id));

  const [deleted] = await db.delete(notes).where(eq(notes.id, id)).returning();

  if (deleted) {
    revalidateNotePaths(deleted);
    // Clean up storage files after response
    if (attachments.length > 0) {
      after(async () => {
        await getSupabaseAdmin()
          .storage.from("note-attachments")
          .remove(attachments.map((a) => a.storagePath));
      });
    }
  }
}

/** Get attachments for a list of note IDs */
export async function getAttachmentsForNotes(
  noteIds: string[],
): Promise<NoteAttachment[]> {
  if (noteIds.length === 0) return [];

  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  return db
    .select()
    .from(noteAttachments)
    .where(inArray(noteAttachments.noteId, noteIds));
}

/** Generate a signed download URL for an attachment */
export async function getAttachmentUrl(storagePath: string): Promise<string> {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data, error } = await getSupabaseAdmin()
    .storage.from("note-attachments")
    .createSignedUrl(storagePath, 60 * 60); // 1 hour

  if (error || !data?.signedUrl) throw new Error("Failed to generate URL");
  return data.signedUrl;
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
      .select(noteColumns)
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
  resolvedDeal?: { contactIds: string[]; companyId: string },
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

    where = buildDealNoteConditions(entityId, deal.contactIds, deal.companyId);
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
  const [[deal], contactRows] = await Promise.all([
    db
      .select({ companyId: deals.companyId })
      .from(deals)
      .where(eq(deals.id, dealId)),
    db
      .select({ contactId: dealContacts.contactId })
      .from(dealContacts)
      .where(eq(dealContacts.dealId, dealId)),
  ]);
  if (!deal) return null;
  return {
    contactIds: contactRows.map((r) => r.contactId),
    companyId: deal.companyId,
  };
}

/** Generate embedding after the response is sent */
function generateEmbeddingAfterResponse(noteId: string, content: string) {
  after(async () => {
    try {
      const embedding = await generateEmbedding(content);
      await db.update(notes).set({ embedding }).where(eq(notes.id, noteId));
    } catch (error) {
      console.error("Failed to generate embedding", noteId, error);
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

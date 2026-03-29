"use client";

import { File, FileText, Mic, Pencil, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  LazyMarkdownRenderer as MarkdownRenderer,
  LazyTiptapEditor as TiptapEditor,
} from "@/components/lazy";
import { PaginationBar } from "@/components/pagination";

import { Button } from "@/components/ui/button";
import type { Note } from "@/db/schema";
import { deleteNote, updateNote } from "@/lib/actions/notes";
import { NOTE_TYPES } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

type Props = {
  notes: Note[];
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  currentDealId?: string;
};

const TYPE_ICONS = {
  note: FileText,
  transcript: Mic,
  document: File,
} as const;

const TYPE_COLORS = {
  note: "bg-neon-400/10 text-neon-500 ring-neon-400/20",
  transcript: "bg-violet-500/10 text-violet-500 ring-violet-500/20",
  document: "bg-amber-500/10 text-amber-500 ring-amber-500/20",
} as const;

function getAttribution(note: Note, currentDealId?: string) {
  if (!currentDealId) return null;
  if (note.dealId === currentDealId) return null;
  if (note.contactId) return "via Contact";
  if (note.companyId) return "via Company";
  return null;
}

export function NoteList({
  notes,
  total,
  pageSize,
  currentPage,
  onPageChange,
  currentDealId,
}: Props) {
  if (notes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground/50">
        No notes yet
      </p>
    );
  }

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          attribution={getAttribution(note, currentDealId)}
        />
      ))}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={onPageChange}
      />
    </div>
  );
}

function NoteCard({
  note,
  attribution,
}: {
  note: Note;
  attribution: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

  const typeKey = note.type as keyof typeof TYPE_ICONS;
  const Icon = TYPE_ICONS[typeKey] ?? FileText;
  const colors = TYPE_COLORS[typeKey] ?? TYPE_COLORS.note;
  const label =
    NOTE_TYPES.find((t) => t.value === note.type)?.label ?? note.type;

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
      return;
    }
    startTransition(async () => {
      try {
        await deleteNote(note.id);
        toast.success("Note deleted");
        router.refresh();
      } catch {
        toast.error("Failed to delete note");
      }
    });
  }

  function handleEdit() {
    setEditContent(note.content);
    setIsEditing(true);
  }

  function handleCancelEdit() {
    setIsEditing(false);
    setEditContent(note.content);
  }

  function handleSaveEdit() {
    if (!editContent.trim()) return;
    startTransition(async () => {
      try {
        await updateNote(note.id, { content: editContent });
        toast.success("Note updated");
        setIsEditing(false);
        router.refresh();
      } catch {
        toast.error("Failed to update note");
      }
    });
  }

  return (
    <div className="rounded-lg border border-border/30 bg-card p-4 transition-all hover:border-border/50">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <div
            className={`flex size-6 items-center justify-center rounded-md ring-1 ${colors}`}
          >
            <Icon className="size-3" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground/70">
              {label}
            </span>
            {attribution && (
              <span className="text-[11px] rounded-full bg-muted/60 px-2 py-0.5 text-muted-foreground/50">
                {attribution}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Pencil className="size-3" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-all ${
              confirmDelete
                ? "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                : "text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/5"
            }`}
          >
            <Trash2 className="size-3" />
            {isPending ? "..." : confirmDelete ? "Confirm?" : ""}
          </button>
        </div>
      </div>

      {note.title && (
        <h4 className="text-sm font-semibold text-foreground mb-1.5">
          {note.title}
        </h4>
      )}

      {isEditing ? (
        <div className="space-y-2">
          <TiptapEditor
            content={editContent}
            onChange={setEditContent}
            placeholder="Edit note..."
          />
          <div className="flex items-center gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              disabled={isPending}
              className="h-7 text-xs"
            >
              <X className="size-3" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveEdit}
              disabled={isPending || !editContent.trim()}
              className="h-7 text-xs bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0"
            >
              {isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          <MarkdownRenderer content={note.content} />
        </div>
      )}

      <p className="mt-2 text-xs text-muted-foreground/50">
        {formatDateTime(note.createdAt)}
      </p>
    </div>
  );
}

"use client";

import {
  ChevronRight,
  Download,
  File,
  FileText,
  Image as ImageIcon,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  LazyMarkdownRenderer as MarkdownRenderer,
  LazyTiptapEditor as TiptapEditor,
} from "@/components/lazy";
import { PaginationBar } from "@/components/pagination";

import { Button } from "@/components/ui/button";
import type { NoteAttachment, NoteRow } from "@/db/schema";
import { deleteNote, getAttachmentUrl, updateNote } from "@/lib/actions/notes";
import { formatDateTime, formatFileSize } from "@/lib/utils";

type Props = {
  notes: NoteRow[];
  attachments: NoteAttachment[];
  total: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  currentDealId?: string;
};

function getFileIcon(mime: string) {
  if (mime.startsWith("image/")) return ImageIcon;
  if (mime === "application/pdf") return FileText;
  return File;
}

function getAttribution(note: NoteRow, currentDealId?: string) {
  if (!currentDealId) return null;
  if (note.dealId === currentDealId) return null;
  if (note.contactId) return "via Contact";
  if (note.companyId) return "via Company";
  return null;
}

function getPreviewText(content: string, maxLength = 80): string {
  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!firstLine) return "";
  const plain = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/[_~]/g, "");
  return plain.length > maxLength
    ? `${plain.slice(0, maxLength).trimEnd()}…`
    : plain;
}

export function NoteList({
  notes,
  attachments,
  total,
  pageSize,
  currentPage,
  onPageChange,
  currentDealId,
}: Props) {
  const prevNotesRef = useRef(notes);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(notes.length > 0 ? [notes[0].id] : []),
  );

  // Reset expanded state synchronously when notes change (avoids two-render flash)
  if (prevNotesRef.current !== notes) {
    prevNotesRef.current = notes;
    setExpandedIds(new Set(notes.length > 0 ? [notes[0].id] : []));
  }

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const attachmentsByNote = useMemo(() => {
    const map = new Map<string, NoteAttachment[]>();
    for (const a of attachments) {
      const existing = map.get(a.noteId) ?? [];
      existing.push(a);
      map.set(a.noteId, existing);
    }
    return map;
  }, [attachments]);

  if (notes.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground/50">
        No notes yet
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          attachments={attachmentsByNote.get(note.id) ?? []}
          attribution={getAttribution(note, currentDealId)}
          isExpanded={expandedIds.has(note.id)}
          onToggle={() => toggleExpanded(note.id)}
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
  attachments,
  attribution,
  isExpanded,
  onToggle,
}: {
  note: NoteRow;
  attachments: NoteAttachment[];
  attribution: string | null;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);

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
    if (!isExpanded) onToggle();
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

  async function handleDownload(attachment: NoteAttachment) {
    try {
      const url = await getAttachmentUrl(attachment.storagePath);
      window.open(url, "_blank");
    } catch {
      toast.error("Failed to download file");
    }
  }

  const hasContent = note.content.trim().length > 0;
  const preview = note.title || getPreviewText(note.content) || "Untitled";

  return (
    <div className="rounded-lg border border-border/30 bg-card transition-colors hover:border-border/50">
      {/* Collapsed header row */}
      <div className="group flex items-center gap-0.5 pr-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-center gap-2.5 px-3.5 py-2.5 text-left"
        >
          <ChevronRight
            className={`size-3.5 shrink-0 text-muted-foreground/30 transition-transform duration-200 ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {attribution && (
              <span className="shrink-0 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground/50">
                {attribution}
              </span>
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {preview}
            </span>
            {!isExpanded && note.title && hasContent && (
              <span className="truncate text-sm text-muted-foreground/35">
                — {getPreviewText(note.content, 50)}
              </span>
            )}
          </div>
          {attachments.length > 0 && (
            <span className="shrink-0 text-xs text-muted-foreground/60">
              {attachments.length} file{attachments.length !== 1 ? "s" : ""}
            </span>
          )}
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground/60">
            {formatDateTime(note.createdAt)}
          </span>
        </button>
        {/* Hover actions — outside the toggle button to avoid nested buttons */}
        <div className="flex shrink-0 items-center gap-0.5">
          {!isEditing && (
            <button
              type="button"
              onClick={handleEdit}
              className="flex items-center rounded-md p-1.5 text-muted-foreground/40 transition-all hover:bg-muted/60 hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDelete}
            className={`flex items-center rounded-md p-1.5 transition-all ${
              confirmDelete
                ? "bg-red-500/10 text-red-600"
                : "text-muted-foreground/40 hover:bg-red-500/5 hover:text-red-500"
            }`}
          >
            <Trash2 className="size-3" />
            {isPending ? (
              <span className="ml-1 text-xs">...</span>
            ) : confirmDelete ? (
              <span className="ml-1 text-xs">Confirm?</span>
            ) : null}
          </button>
        </div>
      </div>

      {/* Expandable body */}
      <div
        className={`grid transition-[grid-template-rows] duration-200 ease-out ${
          isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-3.5 pb-3.5 pt-0">
            {isEditing ? (
              <div className="space-y-2">
                <TiptapEditor
                  content={editContent}
                  onChange={setEditContent}
                  placeholder="Edit note..."
                />
                <div className="flex items-center justify-end gap-2">
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
                    className="h-7 border-0 bg-neon-400 text-xs text-primary-foreground hover:bg-neon-500"
                  >
                    {isPending ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              hasContent && (
                <div className="text-sm">
                  <MarkdownRenderer content={note.content} />
                </div>
              )
            )}

            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachments.map((a) => {
                  const Icon = getFileIcon(a.mimeType);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleDownload(a)}
                      className="group/file flex items-center gap-1.5 rounded-md bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    >
                      <Icon className="size-3 shrink-0" />
                      <span className="max-w-40 truncate">{a.fileName}</span>
                      <span className="text-muted-foreground/40">
                        {formatFileSize(a.fileSize)}
                      </span>
                      <Download className="size-3 shrink-0 opacity-0 transition-opacity group-hover/file:opacity-100" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

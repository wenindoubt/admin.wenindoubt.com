"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { NoteForm } from "@/components/note-form";
import { NoteList } from "@/components/note-list";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { Note } from "@/db/schema";
import { getNotes, getNotesForDeal, searchNotes } from "@/lib/actions/notes";
import type { LinkedEntity, NoteEntityType } from "@/lib/types";
import { PAGE_SIZE_NOTES } from "@/lib/types";
import { FORM_INPUT_CLASSES } from "@/lib/utils";

type Props = {
  entityType: NoteEntityType;
  entityId: string;
  initialNotes: Note[];
  initialTotal: number;
  linkedContact?: LinkedEntity;
  linkedCompany?: LinkedEntity;
};

export function NotesSection({
  entityType,
  entityId,
  initialNotes,
  initialTotal,
  linkedContact,
  linkedCompany,
}: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const fetchPage = useCallback(
    async (p: number, query?: string) => {
      const offset = (p - 1) * PAGE_SIZE_NOTES;

      if (query) {
        const result = await searchNotes(query, {
          [`${entityType}Id`]: entityId,
          limit: PAGE_SIZE_NOTES,
          offset,
        });
        setNotes(result.data);
        setTotal(result.total);
        return;
      }

      const result =
        entityType === "deal"
          ? await getNotesForDeal(entityId, {
              limit: PAGE_SIZE_NOTES,
              offset,
            })
          : await getNotes({
              [`${entityType}Id`]: entityId,
              limit: PAGE_SIZE_NOTES,
              offset,
            });
      setNotes(result.data);
      setTotal(result.total);
    },
    [entityType, entityId],
  );

  // Re-sync when server data changes (create/delete triggers revalidation)
  useEffect(() => {
    setNotes(initialNotes);
    setTotal(initialTotal);
    setPage(1);
    setSearch("");
  }, [initialNotes, initialTotal]);

  // Cleanup debounce on unmount
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      fetchPage(newPage, search);
    },
    [fetchPage, search],
  );

  const handleSearch = useCallback(
    (query: string) => {
      setSearch(query);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        setPage(1);
        fetchPage(1, query);
      }, 300);
    },
    [fetchPage],
  );

  return (
    <div className="space-y-4">
      <NoteForm
        entityType={entityType}
        entityId={entityId}
        linkedContact={linkedContact}
        linkedCompany={linkedCompany}
      />
      <Separator className="bg-border/30" />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground/40" />
        <Input
          placeholder="Search notes..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={`pl-9 h-8 text-sm ${FORM_INPUT_CLASSES}`}
        />
      </div>
      <NoteList
        notes={notes}
        total={total}
        pageSize={PAGE_SIZE_NOTES}
        currentPage={page}
        onPageChange={handlePageChange}
        currentDealId={entityType === "deal" ? entityId : undefined}
      />
    </div>
  );
}

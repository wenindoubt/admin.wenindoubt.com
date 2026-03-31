"use client";

import { DragDropContext, type DropResult } from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { DealRow } from "@/db/schema";
import { checkStageTransition, updateDeal } from "@/lib/actions/deals";
import { ACTIVE_STAGES, DEAL_STAGES } from "@/lib/constants";
import { ColumnVisibilityFilter } from "./column-visibility-filter";
import { KanbanColumn } from "./kanban-column";
import type {
  DealWithRelations,
  KanbanColumn as KanbanColumnType,
} from "./types";
import { useKanbanRealtime } from "./use-kanban-realtime";
import { useKanbanScroll } from "./use-kanban-scroll";

const EmailDraftModal = dynamic(
  () => import("../email-draft-modal").then((m) => m.EmailDraftModal),
  { ssr: false },
);

const STORAGE_KEY = "kanban-visible-columns";

function buildColumns(deals: DealWithRelations[]): KanbanColumnType[] {
  return DEAL_STAGES.map((s) => ({
    status: s.value,
    label: s.label,
    description: s.description,
    color: s.color,
    deals: deals.filter((d) => d.stage === s.value),
  }));
}

function getInitialVisible(): Set<string> {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        /* fall through */
      }
    }
  }
  return new Set(ACTIVE_STAGES);
}

export function KanbanBoard({
  initialDeals,
}: {
  initialDeals: DealWithRelations[];
}) {
  const [columns, setColumns] = useState(() => buildColumns(initialDeals));
  const [visible, setVisible] = useState<Set<string>>(getInitialVisible);

  // Email draft modal state (new->contacted transition)
  const [draftModal, setDraftModal] = useState<{
    dealId: string;
    dealTitle: string;
    toStage: string;
    contactEmail: string;
    contactName: string;
    previousColumns: KanbanColumnType[];
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
  }, [visible]);

  // Realtime subscription
  useKanbanRealtime(setColumns);

  // Scroll/pan
  const {
    scrollRef,
    canScrollLeft,
    canScrollRight,
    scrollBy,
    didDrag,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useKanbanScroll();

  const toggleVisible = useCallback((status: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => {
    setVisible(new Set(DEAL_STAGES.map((s) => s.value)));
  }, []);

  const showActive = useCallback(() => {
    setVisible(new Set(ACTIVE_STAGES));
  }, []);

  const visibleColumns = useMemo(
    () => columns.filter((c) => visible.has(c.status)),
    [columns, visible],
  );

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      const { draggableId, destination, source } = result;

      if (!destination) return;
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const newStage = destination.droppableId;

      // Save previous state for rollback
      const previousColumns = columns;

      // Optimistic UI update
      setColumns((prev) => {
        const updated = prev.map((col) => ({
          ...col,
          deals: col.deals.filter((d) => d.id !== draggableId),
        }));

        const targetCol = updated.find((c) => c.status === newStage);
        const deal = prev
          .flatMap((c) => c.deals)
          .find((d) => d.id === draggableId);

        if (targetCol && deal) {
          const movedDeal = { ...deal, stage: newStage as DealRow["stage"] };
          targetCol.deals.splice(destination.index, 0, movedDeal);
        }

        return updated;
      });

      // Check if this transition requires an email draft
      try {
        const requirement = await checkStageTransition(draggableId, newStage);
        if (requirement?.type === "email_draft") {
          const deal = previousColumns
            .flatMap((c) => c.deals)
            .find((d) => d.id === draggableId);
          setDraftModal({
            dealId: draggableId,
            dealTitle: deal?.title ?? "Untitled",
            toStage: newStage,
            contactEmail: requirement.contactEmail,
            contactName: requirement.contactName,
            previousColumns,
          });
          return; // Modal handles updateDeal
        }
      } catch (error) {
        setColumns(buildColumns(previousColumns.flatMap((c) => c.deals)));
        toast.error(
          error instanceof Error ? error.message : "Cannot move deal",
        );
        return;
      }

      // Normal stage change (no intervention)
      try {
        await updateDeal(draggableId, {
          stage: newStage as DealRow["stage"],
        });
      } catch {
        setColumns(buildColumns(previousColumns.flatMap((c) => c.deals)));
        toast.error("Failed to update stage");
      }
    },
    [columns],
  );

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <ColumnVisibilityFilter
        columns={columns}
        visible={visible}
        onToggle={toggleVisible}
        onShowAll={showAll}
        onShowActive={showActive}
      />

      {/* Board with scroll controls */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="relative">
          {/* Left fade + arrow */}
          {canScrollLeft && (
            <div className="absolute left-0 top-0 bottom-0 z-10 flex items-start pt-10 pointer-events-none">
              <div className="h-full w-16 bg-gradient-to-r from-background to-transparent" />
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                className="pointer-events-auto absolute left-1 top-1/3 flex size-9 items-center justify-center rounded-full bg-card/90 border border-border/60 shadow-md shadow-black/10 text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                <ChevronLeft className="size-5" />
              </button>
            </div>
          )}

          {/* Right fade + arrow */}
          {canScrollRight && (
            <div className="absolute right-0 top-0 bottom-0 z-10 flex items-start pt-10 pointer-events-none">
              <div className="h-full w-16 bg-gradient-to-l from-background to-transparent" />
              <button
                type="button"
                onClick={() => scrollBy(1)}
                className="pointer-events-auto absolute right-1 top-1/3 flex size-9 items-center justify-center rounded-full bg-card/90 border border-border/60 shadow-md shadow-black/10 text-muted-foreground hover:text-foreground hover:border-border transition-all"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}

          {/* Scrollable board */}
          <div
            ref={scrollRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="flex gap-3 overflow-x-auto pb-4 scroll-smooth [scrollbar-width:thin] [scrollbar-color:oklch(0_0_0/12%)_transparent]"
          >
            {visibleColumns.map((column) => (
              <KanbanColumn
                key={column.status}
                column={column}
                didDrag={didDrag}
              />
            ))}

            {visibleColumns.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center w-full">
                <p className="text-sm text-muted-foreground/60">
                  No columns selected
                </p>
                <button
                  type="button"
                  onClick={showActive}
                  className="mt-2 text-xs text-neon-500 hover:text-neon-400 transition-colors"
                >
                  Show active pipeline
                </button>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Email draft modal for new->contacted transition */}
      {draftModal && (
        <EmailDraftModal
          dealId={draftModal.dealId}
          dealTitle={draftModal.dealTitle}
          toStage={draftModal.toStage}
          contactEmail={draftModal.contactEmail}
          contactName={draftModal.contactName}
          onConfirmAction={() => setDraftModal(null)}
          onCancelAction={() => {
            // Rollback optimistic update
            setColumns(
              buildColumns(draftModal.previousColumns.flatMap((c) => c.deals)),
            );
            setDraftModal(null);
          }}
        />
      )}
    </div>
  );
}

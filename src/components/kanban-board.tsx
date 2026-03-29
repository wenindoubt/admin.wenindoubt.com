"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Deal } from "@/db/schema";
import { checkStageTransition, updateDeal } from "@/lib/actions/deals";
import { ACTIVE_STAGES, DEAL_STAGES } from "@/lib/constants";
import { useSupabase } from "@/lib/supabase/realtime";
import { cn, formatCurrency } from "@/lib/utils";
import { EmailDraftModal } from "./email-draft-modal";

const STORAGE_KEY = "kanban-visible-columns";

type DealWithRelations = Deal & {
  company: { name: string };
  contact: { name: string } | null;
};

type KanbanColumn = {
  status: string;
  label: string;
  description: string;
  color: string;
  deals: DealWithRelations[];
};

// Supabase Realtime sends raw DB column names (snake_case).
// Map them to Drizzle's camelCase Deal type — relations not available from realtime.
function mapRealtimePayload(row: Record<string, unknown>): DealWithRelations {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    primaryContactId: (row.primary_contact_id as string) ?? null,
    title: row.title as string,
    stage: row.stage as Deal["stage"],
    source: row.source as Deal["source"],
    sourceDetail: (row.source_detail as string) ?? null,
    estimatedValue: (row.estimated_value as string) ?? null,
    assignedTo: (row.assigned_to as string) ?? null,
    followUpAt: row.follow_up_at ? new Date(row.follow_up_at as string) : null,
    convertedAt: row.converted_at ? new Date(row.converted_at as string) : null,
    closedAt: row.closed_at ? new Date(row.closed_at as string) : null,
    lastContactedAt: row.last_contacted_at
      ? new Date(row.last_contacted_at as string)
      : null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    // Relations unavailable from realtime — preserve existing or use empty
    company: { name: "" },
    contact: null,
  };
}

function buildColumns(deals: DealWithRelations[]): KanbanColumn[] {
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

/** Extract the solid color from a status color class for the dot indicator */
function extractDotColor(colorClass: string): string {
  const match = colorClass.match(/text-(\w+-\d+)/);
  return match ? `bg-${match[1]}` : "bg-muted-foreground";
}

export function KanbanBoard({
  initialDeals,
}: {
  initialDeals: DealWithRelations[];
}) {
  const supabase = useSupabase();
  const [columns, setColumns] = useState(() => buildColumns(initialDeals));
  const [visible, setVisible] = useState<Set<string>>(getInitialVisible);

  // Email draft modal state (new→contacted transition)
  const [draftModal, setDraftModal] = useState<{
    dealId: string;
    dealTitle: string;
    toStage: string;
    contactEmail: string;
    contactName: string;
    previousColumns: KanbanColumn[];
  } | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...visible]));
  }, [visible]);

  useEffect(() => {
    const channel = supabase
      .channel("deals-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "deals" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = mapRealtimePayload(payload.new);
            setColumns((prev) =>
              prev.map((col) => {
                // Try to preserve company/contact from existing card
                const existing = col.deals.find((d) => d.id === updated.id);
                const merged = existing
                  ? {
                      ...updated,
                      company: existing.company,
                      contact: existing.contact,
                    }
                  : updated;
                return {
                  ...col,
                  deals:
                    col.status === merged.stage
                      ? [...col.deals.filter((d) => d.id !== merged.id), merged]
                      : col.deals.filter((d) => d.id !== merged.id),
                };
              }),
            );
          } else if (payload.eventType === "INSERT") {
            const newDeal = mapRealtimePayload(payload.new);
            setColumns((prev) =>
              prev.map((col) =>
                col.status === newDeal.stage
                  ? { ...col, deals: [...col.deals, newDeal] }
                  : col,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                deals: col.deals.filter((d) => d.id !== deleted.id),
              })),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
          const movedDeal = { ...deal, stage: newStage as Deal["stage"] };
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
          stage: newStage as Deal["stage"],
        });
      } catch {
        setColumns(buildColumns(previousColumns.flatMap((c) => c.deals)));
        toast.error("Failed to update stage");
      }
    },
    [columns],
  );

  const allVisible = visible.size === DEAL_STAGES.length;
  const activeOnly =
    visible.size === ACTIVE_STAGES.size &&
    [...ACTIVE_STAGES].every((s) => visible.has(s));

  // ─── Horizontal scroll helpers ───
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragScrollLeft = useRef(0);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  const scrollBy = useCallback((dir: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  }, []);

  // Click-and-drag to pan
  const DRAG_THRESHOLD = 5;
  const didDrag = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el || e.button !== 0) return;
    // Don't capture when clicking inside a card — let links and DnD work
    if ((e.target as HTMLElement).closest("[data-rfd-draggable-id]")) return;
    isDragging.current = true;
    didDrag.current = false;
    dragStartX.current = e.clientX;
    dragScrollLeft.current = el.scrollLeft;
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - dragStartX.current;
    if (Math.abs(dx) > DRAG_THRESHOLD) {
      didDrag.current = true;
      el.style.cursor = "grabbing";
    }
    if (didDrag.current) {
      el.scrollLeft = dragScrollLeft.current - dx;
    }
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    isDragging.current = false;
    const el = scrollRef.current;
    if (el) {
      el.style.cursor = "";
      el.releasePointerCapture(e.pointerId);
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Filter pills */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Presets */}
        <div className="flex items-center gap-1 mr-1">
          <button
            type="button"
            onClick={showActive}
            className={cn(
              "px-2.5 py-1 rounded-md text-[16px] font-medium tracking-wide uppercase transition-all",
              activeOnly && !allVisible
                ? "bg-gold-400/15 text-gold-600 ring-1 ring-gold-400/25"
                : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
            )}
          >
            Active
          </button>
          <button
            type="button"
            onClick={showAll}
            className={cn(
              "px-2.5 py-1 rounded-md text-[16px] font-medium tracking-wide uppercase transition-all",
              allVisible
                ? "bg-gold-400/15 text-gold-600 ring-1 ring-gold-400/25"
                : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
            )}
          >
            All
          </button>
        </div>

        <div className="w-px h-5 bg-border/40" />

        {/* Stage pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {columns.map((col) => {
            const isVisible = visible.has(col.status);
            const dotColor = extractDotColor(col.color);

            return (
              <button
                key={col.status}
                type="button"
                onClick={() => toggleVisible(col.status)}
                className={cn(
                  "group flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all",
                  isVisible
                    ? "bg-card ring-1 ring-border/50 text-foreground/80 shadow-sm shadow-black/[0.03]"
                    : "text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-muted/30",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full transition-colors",
                    isVisible
                      ? dotColor
                      : "bg-muted-foreground/20 group-hover:bg-muted-foreground/40",
                  )}
                />
                {col.label}
                <span
                  className={cn(
                    "tabular-nums transition-colors",
                    isVisible
                      ? "text-muted-foreground/50"
                      : "text-muted-foreground/25",
                  )}
                >
                  {col.deals.length}
                </span>
              </button>
            );
          })}
        </div>
      </div>

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
              <div key={column.status} className="w-72 shrink-0">
                <div className="mb-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={column.color}>
                      {column.label}
                    </Badge>
                    <span className="flex size-7 items-center justify-center rounded-full bg-muted/60 text-sm font-medium tabular-nums text-muted-foreground/70">
                      {column.deals.length}
                    </span>
                  </div>
                  <p
                    className="truncate text-xs text-muted-foreground/50 px-0.5"
                    title={column.description}
                  >
                    {column.description}
                  </p>
                </div>
                <Droppable droppableId={column.status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={cn(
                        "min-h-[200px] space-y-2 rounded-lg border p-2 transition-colors",
                        snapshot.isDraggingOver
                          ? "border-gold-400/30 bg-gold-400/[0.03]"
                          : "border-border/30 bg-card/30",
                      )}
                    >
                      {column.deals.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={cn(
                                "group cursor-grab border-border/40 transition-all",
                                snapshot.isDragging
                                  ? "shadow-lg shadow-black/30 ring-1 ring-gold-400/20"
                                  : "hover:border-border/60",
                              )}
                            >
                              <Link
                                href={`/deals/${deal.id}`}
                                onClick={(e) => {
                                  if (didDrag.current) e.preventDefault();
                                }}
                                className="block"
                                draggable={false}
                              >
                                <CardContent className="p-3">
                                  <p className="font-medium text-sm group-hover:text-gold-400 transition-colors">
                                    {deal.title}
                                  </p>
                                  {deal.company.name && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {deal.company.name}
                                    </p>
                                  )}
                                  {deal.estimatedValue && (
                                    <p className="mt-1.5 text-base font-semibold text-emerald-600 tabular-nums">
                                      {formatCurrency(deal.estimatedValue)}
                                    </p>
                                  )}
                                  {deal.stage === "nurture" &&
                                    deal.followUpAt && (
                                      <p className="mt-1 text-xs text-teal-600 flex items-center gap-1">
                                        <Clock className="size-3" />
                                        Follow up{" "}
                                        {new Date(
                                          deal.followUpAt,
                                        ).toLocaleDateString()}
                                      </p>
                                    )}
                                </CardContent>
                              </Link>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

            {visibleColumns.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center w-full">
                <p className="text-sm text-muted-foreground/60">
                  No columns selected
                </p>
                <button
                  type="button"
                  onClick={showActive}
                  className="mt-2 text-xs text-gold-500 hover:text-gold-400 transition-colors"
                >
                  Show active pipeline
                </button>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Email draft modal for new→contacted transition */}
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

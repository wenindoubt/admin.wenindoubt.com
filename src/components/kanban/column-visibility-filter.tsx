"use client";

import { ACTIVE_STAGES, DEAL_STAGES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { KanbanColumn } from "./types";

/** Extract the solid color from a status color class for the dot indicator */
function extractDotColor(colorClass: string): string {
  const match = colorClass.match(/text-(\w+-\d+)/);
  return match ? `bg-${match[1]}` : "bg-muted-foreground";
}

export function ColumnVisibilityFilter({
  columns,
  visible,
  onToggle,
  onShowAll,
  onShowActive,
}: {
  columns: KanbanColumn[];
  visible: Set<string>;
  onToggle: (status: string) => void;
  onShowAll: () => void;
  onShowActive: () => void;
}) {
  const allVisible = visible.size === DEAL_STAGES.length;
  const activeOnly =
    visible.size === ACTIVE_STAGES.size &&
    [...ACTIVE_STAGES].every((s) => visible.has(s));

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Presets */}
      <div className="flex items-center gap-1 mr-1">
        <button
          type="button"
          onClick={onShowActive}
          className={cn(
            "px-2.5 py-1 rounded-md text-[16px] font-medium tracking-wide uppercase transition-all",
            activeOnly && !allVisible
              ? "bg-neon-400/15 text-neon-600 ring-1 ring-neon-400/25"
              : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
          )}
        >
          Active
        </button>
        <button
          type="button"
          onClick={onShowAll}
          className={cn(
            "px-2.5 py-1 rounded-md text-[16px] font-medium tracking-wide uppercase transition-all",
            allVisible
              ? "bg-neon-400/15 text-neon-600 ring-1 ring-neon-400/25"
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
              onClick={() => onToggle(col.status)}
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
  );
}

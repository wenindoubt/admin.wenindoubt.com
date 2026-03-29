"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import type { RefObject } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { KanbanDealCard } from "./kanban-deal-card";
import type { KanbanColumn as KanbanColumnType } from "./types";

export function KanbanColumn({
  column,
  didDrag,
}: {
  column: KanbanColumnType;
  didDrag: RefObject<boolean>;
}) {
  return (
    <div className="w-72 shrink-0">
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
                ? "border-neon-400/30 bg-neon-400/[0.03]"
                : "border-border/30 bg-card/30",
            )}
          >
            {column.deals.map((deal, index) => (
              <Draggable key={deal.id} draggableId={deal.id} index={index}>
                {(provided, snapshot) => (
                  <KanbanDealCard
                    deal={deal}
                    didDrag={didDrag}
                    isDragging={snapshot.isDragging}
                    provided={provided}
                  />
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

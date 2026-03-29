"use client";

import type { DraggableProvided } from "@hello-pangea/dnd";
import { Clock } from "lucide-react";
import Link from "next/link";
import type { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { DealWithRelations } from "./types";

export function KanbanDealCard({
  deal,
  didDrag,
  isDragging,
  provided,
}: {
  deal: DealWithRelations;
  didDrag: RefObject<boolean>;
  isDragging: boolean;
  provided: DraggableProvided;
}) {
  return (
    <Card
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={
        isDragging
          ? "group cursor-grab border-border/40 transition-all shadow-lg shadow-black/30 ring-1 ring-neon-400/20"
          : "group cursor-grab border-border/40 transition-all hover:border-border/60"
      }
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
          <p className="font-medium text-sm group-hover:text-neon-400 transition-colors">
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
          {deal.stage === "nurture" && deal.followUpAt && (
            <p className="mt-1 text-xs text-teal-600 flex items-center gap-1">
              <Clock className="size-3" />
              Follow up {formatDate(deal.followUpAt)}
            </p>
          )}
        </CardContent>
      </Link>
    </Card>
  );
}

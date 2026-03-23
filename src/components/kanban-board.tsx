"use client";

import { useEffect, useState, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LEAD_STATUSES } from "@/lib/constants";
import { updateLead } from "@/lib/actions/leads";
import { supabase } from "@/lib/supabase/realtime";
import type { Lead } from "@/db/schema";
import { toast } from "sonner";
import Link from "next/link";

type KanbanColumn = {
  status: string;
  label: string;
  color: string;
  leads: Lead[];
};

function buildColumns(leads: Lead[]): KanbanColumn[] {
  return LEAD_STATUSES.map((s) => ({
    status: s.value,
    label: s.label,
    color: s.color,
    leads: leads.filter((l) => l.status === s.value),
  }));
}

export function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [columns, setColumns] = useState(() => buildColumns(initialLeads));

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as Lead;
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                leads:
                  col.status === updated.status
                    ? [
                        ...col.leads.filter((l) => l.id !== updated.id),
                        updated,
                      ]
                    : col.leads.filter((l) => l.id !== updated.id),
              }))
            );
          } else if (payload.eventType === "INSERT") {
            const newLead = payload.new as Lead;
            setColumns((prev) =>
              prev.map((col) =>
                col.status === newLead.status
                  ? { ...col, leads: [...col.leads, newLead] }
                  : col
              )
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                leads: col.leads.filter((l) => l.id !== deleted.id),
              }))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDragEnd = useCallback(async (result: DropResult) => {
    const { draggableId, destination, source } = result;

    if (!destination) return;
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    )
      return;

    const newStatus = destination.droppableId;

    // Optimistic update
    setColumns((prev) => {
      const updated = prev.map((col) => ({
        ...col,
        leads: col.leads.filter((l) => l.id !== draggableId),
      }));

      const targetCol = updated.find((c) => c.status === newStatus);
      const lead = prev
        .flatMap((c) => c.leads)
        .find((l) => l.id === draggableId);

      if (targetCol && lead) {
        const movedLead = { ...lead, status: newStatus as Lead["status"] };
        targetCol.leads.splice(destination.index, 0, movedLead);
      }

      return updated;
    });

    try {
      await updateLead(draggableId, {
        status: newStatus as Lead["status"],
      });
    } catch {
      // Revert on failure
      setColumns((prev) => buildColumns(prev.flatMap((c) => c.leads)));
      toast.error("Failed to update status");
    }
  }, []);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.status} className="w-72 shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <Badge variant="outline" className={column.color}>
                {column.label}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {column.leads.length}
              </span>
            </div>
            <Droppable droppableId={column.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[200px] space-y-2 rounded-lg border p-2 transition-colors ${
                    snapshot.isDraggingOver ? "bg-muted/50" : "bg-muted/20"
                  }`}
                >
                  {column.leads.map((lead, index) => (
                    <Draggable
                      key={lead.id}
                      draggableId={lead.id}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <Card
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`cursor-grab transition-shadow ${
                            snapshot.isDragging ? "shadow-lg" : ""
                          }`}
                        >
                          <CardContent className="p-3">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-medium hover:underline"
                            >
                              {lead.firstName} {lead.lastName}
                            </Link>
                            {lead.companyName && (
                              <p className="text-sm text-muted-foreground">
                                {lead.companyName}
                              </p>
                            )}
                            {lead.estimatedValue && (
                              <p className="mt-1 text-sm font-medium">
                                ${Number(lead.estimatedValue).toLocaleString()}
                              </p>
                            )}
                          </CardContent>
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
      </div>
    </DragDropContext>
  );
}

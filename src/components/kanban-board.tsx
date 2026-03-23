"use client";

import {
  DragDropContext,
  Draggable,
  Droppable,
  type DropResult,
} from "@hello-pangea/dnd";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Lead } from "@/db/schema";
import { updateLead } from "@/lib/actions/leads";
import { LEAD_STATUSES } from "@/lib/constants";
import { supabase } from "@/lib/supabase/realtime";

type KanbanColumn = {
  status: string;
  label: string;
  description: string;
  color: string;
  leads: Lead[];
};

// Supabase Realtime sends raw DB column names (snake_case).
// Map them to Drizzle's camelCase Lead type.
function mapRealtimePayload(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    linkedinUrl: (row.linkedin_url as string) ?? null,
    companyName: (row.company_name as string) ?? null,
    companyWebsite: (row.company_website as string) ?? null,
    jobTitle: (row.job_title as string) ?? null,
    industry: (row.industry as string) ?? null,
    companySize: (row.company_size as string) ?? null,
    status: row.status as Lead["status"],
    source: row.source as Lead["source"],
    sourceDetail: (row.source_detail as string) ?? null,
    estimatedValue: (row.estimated_value as string) ?? null,
    assignedTo: (row.assigned_to as string) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
    convertedAt: row.converted_at ? new Date(row.converted_at as string) : null,
    lastContactedAt: row.last_contacted_at
      ? new Date(row.last_contacted_at as string)
      : null,
  };
}

function buildColumns(leads: Lead[]): KanbanColumn[] {
  return LEAD_STATUSES.map((s) => ({
    status: s.value,
    label: s.label,
    description: s.description,
    color: s.color,
    leads: leads.filter((l) => l.status === s.value),
  }));
}

export function KanbanBoard({ initialLeads }: { initialLeads: Lead[] }) {
  const [columns, setColumns] = useState(() => buildColumns(initialLeads));

  useEffect(() => {
    const channel = supabase
      .channel("leads-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = mapRealtimePayload(payload.new);
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                leads:
                  col.status === updated.status
                    ? [...col.leads.filter((l) => l.id !== updated.id), updated]
                    : col.leads.filter((l) => l.id !== updated.id),
              })),
            );
          } else if (payload.eventType === "INSERT") {
            const newLead = mapRealtimePayload(payload.new);
            setColumns((prev) =>
              prev.map((col) =>
                col.status === newLead.status
                  ? { ...col, leads: [...col.leads, newLead] }
                  : col,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const deleted = payload.old as { id: string };
            setColumns((prev) =>
              prev.map((col) => ({
                ...col,
                leads: col.leads.filter((l) => l.id !== deleted.id),
              })),
            );
          }
        },
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
      setColumns((prev) => buildColumns(prev.flatMap((c) => c.leads)));
      toast.error("Failed to update status");
    }
  }, []);

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column.status} className="w-72 shrink-0">
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={column.color}>
                  {column.label}
                </Badge>
                <span className="text-xs text-muted-foreground/60 tabular-nums">
                  {column.leads.length}
                </span>
              </div>
              <p className="text-xs leading-snug text-muted-foreground/50 px-0.5">
                {column.description}
              </p>
            </div>
            <Droppable droppableId={column.status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[200px] space-y-2 rounded-lg border p-2 transition-colors ${
                    snapshot.isDraggingOver
                      ? "border-gold-400/30 bg-gold-400/[0.03]"
                      : "border-border/30 bg-card/30"
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
                          className={`cursor-grab border-border/40 transition-all ${
                            snapshot.isDragging
                              ? "shadow-lg shadow-black/30 ring-1 ring-gold-400/20"
                              : "hover:border-border/60"
                          }`}
                        >
                          <CardContent className="p-3">
                            <Link
                              href={`/leads/${lead.id}`}
                              className="font-medium text-sm hover:text-gold-400 transition-colors"
                            >
                              {lead.firstName} {lead.lastName}
                            </Link>
                            {lead.companyName && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {lead.companyName}
                              </p>
                            )}
                            {lead.estimatedValue && (
                              <p className="mt-1.5 text-base font-heading font-semibold text-emerald-600 tabular-nums">
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

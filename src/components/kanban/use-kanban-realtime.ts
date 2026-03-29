"use client";

import type { Dispatch, SetStateAction } from "react";
import { useEffect } from "react";
import type { Deal } from "@/db/schema";
import { useSupabase } from "@/lib/supabase/realtime";
import type { DealWithRelations, KanbanColumn } from "./types";

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
    searchVector: (row.search_vector as string) ?? null,
    company: { name: "" },
    contact: null,
  };
}

export function useKanbanRealtime(
  setColumns: Dispatch<SetStateAction<KanbanColumn[]>>,
) {
  const supabase = useSupabase();

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
  }, [supabase, setColumns]);
}

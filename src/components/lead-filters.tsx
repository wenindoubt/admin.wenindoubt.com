"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/lib/constants";
import { useCallback } from "react";

export function LeadFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`/leads?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder="Search leads..."
        defaultValue={searchParams.get("search") ?? undefined}
        onChange={(e) => {
          // Debounce search
          const timeout = setTimeout(
            () => updateFilter("search", e.target.value),
            300
          );
          return () => clearTimeout(timeout);
        }}
        className="w-64"
      />
      <Select
        defaultValue={searchParams.get("status") || "all"}
        onValueChange={(v) => updateFilter("status", v ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {LEAD_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        defaultValue={searchParams.get("source") || "all"}
        onValueChange={(v) => updateFilter("source", v ?? "all")}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sources</SelectItem>
          {LEAD_SOURCES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

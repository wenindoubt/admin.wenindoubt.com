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
import { Search } from "lucide-react";

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
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
        <Input
          placeholder="Search leads..."
          defaultValue={searchParams.get("search") ?? undefined}
          onChange={(e) => {
            const timeout = setTimeout(
              () => updateFilter("search", e.target.value),
              300
            );
            return () => clearTimeout(timeout);
          }}
          className="w-64 pl-9 bg-card/50 border-border/50 placeholder:text-muted-foreground/50 focus:border-gold-400/50 focus:ring-gold-400/20"
        />
      </div>
      <Select
        defaultValue={searchParams.get("status") || "all"}
        onValueChange={(v) => updateFilter("status", v ?? "all")}
      >
        <SelectTrigger className="w-40 bg-card/50 border-border/50">
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
        <SelectTrigger className="w-40 bg-card/50 border-border/50">
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
